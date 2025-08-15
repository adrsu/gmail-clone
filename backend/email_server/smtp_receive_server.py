import asyncio
import ssl
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from email.parser import BytesParser
from email import policy
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import re

from .models import SMTPCommand, SMTPResponse, EmailEnvelope, ConnectionInfo, ServerState
from shared.config import settings
from email_service.database import EmailDatabase
from email_service.models import EmailMessage, EmailAddress, EmailStatus, EmailPriority


class SMTPReceiveServer:
    def __init__(self):
        self.connections: Dict[str, ConnectionInfo] = {}
        self.parser = BytesParser(policy=policy.default)
        # Use existing user ID from database
        self.default_user_id = "d75bbc95-08d7-4805-880c-24a6b6078636"
        
    async def handle_connection(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        """Handle a new SMTP connection"""
        client_id = str(uuid.uuid4())
        client_addr = writer.get_extra_info('peername')
        
        # Initialize connection info
        self.connections[client_id] = ConnectionInfo(
            client_id=client_id,
            created_at=datetime.utcnow(),
            last_activity=datetime.utcnow()
        )
        
        current_envelope = None
        
        try:
            # Send greeting
            await self._send_response(writer, 220, f"SMTP Service Ready")
            
            while True:
                # Read command
                print(f"🔍 Waiting for command...")
                line = await reader.readline()
                if not line:
                    print("❌ No data received from client")
                    break
                    
                line_str = line.decode('utf-8', errors='ignore').strip()
                # print(f"🔍 Received line: '{line_str}'")
                if not line_str:
                    print("❌ Empty line received")
                    continue
                
                # Update last activity
                self.connections[client_id].last_activity = datetime.utcnow()
                
                # Parse command (minimal logging for performance)
                command = self._parse_command(line_str)
                if not command:
                    # Check if we're getting Base64 data - disconnect silently to reduce noise
                    if len(line_str) > 50 and line_str.replace('+', '').replace('/', '').replace('=', '').isalnum():
                        print("❌ Base64 data detected - disconnecting client")
                        break
                    await self._send_response(writer, 500, "Invalid command")
                    continue
                
                # Process command (minimal logging)
                response = await self._process_command(client_id, command, current_envelope)
                # Only log errors and important commands
                if response.code >= 400 or command.command in ['DATA', 'QUIT']:
                    print(f"📧 {command.command}: {response.code} {response.message}")
                
                # Update envelope if needed
                if command.command == "MAIL" and response.code == 250:
                    current_envelope = EmailEnvelope(
                        sender=command.arguments[0] if command.arguments else "",
                        recipients=[],
                        data=b"",
                        received_at=datetime.utcnow()
                    )
                elif command.command == "RCPT" and response.code == 250 and current_envelope:
                    recipient = command.arguments[0] if command.arguments else ""
                    # Clean up recipient address
                    clean_recipient = self._clean_email_address(recipient)
                    if clean_recipient:
                        current_envelope.recipients.append(clean_recipient)
                # Handle QUIT command specially
                if command.command == "QUIT":
                    await self._send_response(writer, response.code, response.message)
                    print("🔍 Client sent QUIT - closing connection")
                    break
                    
                # Handle DATA command specially
                elif command.command == "DATA" and response.code == 354:
                    # Send 354 response first
                    await self._send_response(writer, response.code, response.message)
                    print("🔍 About to read email data after sending 354 response...")
                    try:
                        # Read email data with better error handling
                        email_data = await self._read_email_data(reader)
                        print(f"🔍 Email data reading completed, got {len(email_data)} bytes")
                        if current_envelope:
                            current_envelope.data = email_data
                            # Process and store the email with timeout
                            try:
                                import asyncio
                                await asyncio.wait_for(self._process_email(current_envelope), timeout=30.0)
                                current_envelope = None
                                # Send success response after processing
                                print("🔍 Sending 250 success response...")
                                await self._send_response(writer, 250, "Message accepted for delivery")
                                
                                # After successful email processing, expect either QUIT or new MAIL command
                                print("🔍 Email transaction completed successfully")
                                
                                # Small delay to allow client to send QUIT command
                                await asyncio.sleep(0.1)
                                
                            except asyncio.TimeoutError:
                                print("❌ Timeout processing email")
                                await self._send_response(writer, 500, "Internal server error - timeout")
                                current_envelope = None
                        else:
                            print("❌ No current envelope for DATA command")
                            await self._send_response(writer, 500, "Internal server error - no envelope")
                    except Exception as data_error:
                        print(f"❌ Error reading email data: {data_error}")
                        await self._send_response(writer, 500, "Error reading email data")
                        current_envelope = None
                    continue  # Skip normal response sending for DATA command
                else:
                    # Send normal response for all other commands
                    await self._send_response(writer, response.code, response.message)
                
        except Exception as e:
            print(f"❌ SMTP connection error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            # Clean up connection
            if client_id in self.connections:
                del self.connections[client_id]
            writer.close()
            await writer.wait_closed()
    
    def _clean_email_address(self, address: str) -> str:
        """Clean up email address from SMTP command format"""
        if not address:
            return ""
        
        # Remove SMTP command prefixes like "TO:", "FROM:"
        if ':' in address:
            address = address.split(':', 1)[1]
        
        # Extract email from angle brackets
        match = re.search(r'<(.+?)>', address)
        if match:
            return match.group(1).strip()
        
        return address.strip()
    
    def _parse_command(self, line: str) -> Optional[SMTPCommand]:
        """Parse SMTP command line"""
        try:
            # Check if this looks like Base64 data (skip verbose logging)
            if len(line) > 50 and line.replace('+', '').replace('/', '').replace('=', '').isalnum():
                return None
            
            # Check if line contains mostly non-ASCII or garbled data
            if not line.replace(' ', '').replace('\t', '').isprintable():
                print(f"❌ Received non-printable data as command: {repr(line)}")
                return None
            
            parts = line.split(' ', 1)
            command = parts[0].upper()
            arguments = parts[1].split(' ') if len(parts) > 1 else []
            
            # Validate that command looks like a real SMTP command
            valid_smtp_commands = {
                'HELO', 'EHLO', 'MAIL', 'RCPT', 'DATA', 'QUIT', 'RSET', 
                'VRFY', 'EXPN', 'HELP', 'NOOP', 'AUTH', 'STARTTLS'
            }
            
            if command not in valid_smtp_commands:
                print(f"❌ Unknown SMTP command: {command}")
                # Still return it so we can send proper error response
            
            return SMTPCommand(command=command, arguments=arguments)
        except Exception as e:
            print(f"❌ Error parsing command: {e}")
            return None
    
    async def _process_command(self, client_id: str, command: SMTPCommand, current_envelope: Optional[EmailEnvelope]) -> SMTPResponse:
        """Process SMTP command"""
        conn_info = self.connections[client_id]
        
        if command.command == "HELO" or command.command == "EHLO":
            return SMTPResponse(code=250, message=f"localhost Hello {command.arguments[0] if command.arguments else 'unknown'}")
        elif command.command == "MAIL":
            return await self._handle_mail(command, current_envelope)
        elif command.command == "RCPT":
            return await self._handle_rcpt(command, current_envelope)
        elif command.command == "DATA":
            return await self._handle_data(command, current_envelope)
        elif command.command == "RSET":
            return SMTPResponse(code=250, message="Reset OK")
        elif command.command == "NOOP":
            return SMTPResponse(code=250, message="OK")
        elif command.command == "QUIT":
            return SMTPResponse(code=221, message="Bye")
        elif command.command == "VRFY":
            return SMTPResponse(code=252, message="User not verified")
        elif command.command == "EXPN":
            return SMTPResponse(code=252, message="List not expanded")
        elif command.command == "HELP":
            return SMTPResponse(code=214, message="Help message")
        else:
            return SMTPResponse(code=500, message="Unknown command")
    
    async def _handle_mail(self, command: SMTPCommand, current_envelope: Optional[EmailEnvelope]) -> SMTPResponse:
        """Handle MAIL command"""
        if current_envelope:
            return SMTPResponse(code=503, message="Sender already specified")
        
        if not command.arguments:
            return SMTPResponse(code=501, message="Sender address required")
        
        sender = command.arguments[0]
        # Extract email from "MAIL FROM:<email@domain.com>"
        match = re.search(r'<(.+?)>', sender)
        if match:
            sender = match.group(1)
        
        return SMTPResponse(code=250, message="Sender OK")
    
    async def _handle_rcpt(self, command: SMTPCommand, current_envelope: Optional[EmailEnvelope]) -> SMTPResponse:
        """Handle RCPT command"""
        if not current_envelope:
            return SMTPResponse(code=503, message="Need MAIL command")
        
        if not command.arguments:
            return SMTPResponse(code=501, message="Recipient address required")
        
        recipient = command.arguments[0]
        # Extract email from "RCPT TO:<email@domain.com>"
        match = re.search(r'<(.+?)>', recipient)
        if match:
            recipient = match.group(1)
        
        return SMTPResponse(code=250, message="Recipient OK")
    
    async def _handle_data(self, command: SMTPCommand, current_envelope: Optional[EmailEnvelope]) -> SMTPResponse:
        """Handle DATA command"""
        print(f"🔍 Handling DATA command...")
        
        if not current_envelope:
            print("❌ No current envelope")
            return SMTPResponse(code=503, message="Need MAIL command")
        
        if not current_envelope.recipients:
            print("❌ No recipients")
            return SMTPResponse(code=503, message="Need RCPT command")
        
        print(f"✅ DATA command valid, returning 354 response")
        return SMTPResponse(code=354, message="End data with <CR><LF>.<CR><LF>")
    
    async def _read_email_data(self, reader: asyncio.StreamReader) -> bytes:
        """Read email data until end marker"""
        data = b""
        line_count = 0
        try:
            import asyncio
            print("🔍 Starting to read email data...")
            while True:
                # Read line with timeout (minimal logging for performance)
                line = await asyncio.wait_for(reader.readline(), timeout=10.0)
                line_count += 1
                
                if not line:
                    if line_count > 100:  # Only log for substantial emails
                        print(f"🔍 Finished reading email data: {line_count} lines")
                    break
                
                # Only log progress for very large emails (reduce I/O overhead)
                # if line_count > 0 and line_count % 1000 == 0:
                #     print(f"🔍 Reading large email: {line_count} lines processed...")
                
                # Check for end marker (SMTP DATA termination: single dot on its own line)
                if line.strip() == b".":
                    print("🔍 Found end marker '.' - email data complete")
                    break
                
                # Remove leading dot if present (dot stuffing per RFC 5321)
                if line.startswith(b".."):
                    line = b"." + line[2:]  # Convert ".." back to "."
                
                data += line
                
                # Safety check to prevent runaway emails (increase limit significantly)
                if line_count > 50000:  # Allow much larger emails with attachments
                    print(f"❌ Email too large ({line_count} lines), breaking")
                    break
                    
        except asyncio.TimeoutError:
            print(f"❌ Timeout reading email data after {line_count} lines")
            return data
        except Exception as e:
            print(f"❌ Error reading email data: {e}")
            return data
        
        print(f"🔍 Email data reading completed: {len(data)} bytes total from {line_count} lines")
        
        # Ensure we've consumed all the email data properly
        try:
            # Check if there's any immediate data available that might cause protocol issues
            if reader.at_eof():
                print("🔍 Reader is at EOF - no more data")
            else:
                # Peek at buffer without consuming to see if there's unexpected data
                buffered = len(reader._buffer) if hasattr(reader, '_buffer') else 0
                if buffered > 0:
                    print(f"⚠️ Warning: {buffered} bytes still in buffer after email data")
        except:
            pass  # Ignore errors in buffer inspection
            
        return data
    
    async def _process_email(self, envelope: EmailEnvelope):
        """Process and store received email"""
        try:
            # Debug: Print raw email data
            print(f"🔍 Raw email data length: {len(envelope.data)} bytes")
            print(f"🔍 Raw email data (first 500 chars): {envelope.data[:500]}")
            
            # Parse email
            email_message = self.parser.parsebytes(envelope.data)
            
            # Debug: Print all headers
            print(f"🔍 Email headers: {dict(email_message.items())}")
            
            # Extract email components
            subject = email_message.get('Subject', 'No Subject')
            from_header = email_message.get('From', '')
            to_header = email_message.get('To', '')
            cc_header = email_message.get('Cc', '')
            date_header = email_message.get('Date', '')
            
            print(f"🔍 Parsed subject: '{subject}'")
            print(f"🔍 Parsed from: '{from_header}'")
            print(f"🔍 Parsed to: '{to_header}'")
            
            # Parse addresses with error handling
            try:
                from_address = self._parse_email_address(from_header)
            except Exception as e:
                print(f"Error parsing From address '{from_header}': {e}")
                from_address = EmailAddress(email="unknown@example.com", name="Unknown")
            
            try:
                to_addresses = self._parse_email_addresses(to_header)
            except Exception as e:
                print(f"Error parsing To addresses '{to_header}': {e}")
                to_addresses = []
            
            try:
                cc_addresses = self._parse_email_addresses(cc_header)
            except Exception as e:
                print(f"Error parsing Cc addresses '{cc_header}': {e}")
                cc_addresses = []
            
            # Get email body and attachments
            body = ""
            html_body = None
            attachments = []
            
            if email_message.is_multipart():
                for part in email_message.walk():
                    if part.get_content_maintype() == 'multipart':
                        continue
                    if part.get_content_maintype() == 'text':
                        if part.get_content_subtype() == 'plain':
                            body = part.get_content()
                        elif part.get_content_subtype() == 'html':
                            html_body = part.get_content()
                    elif part.get_content_maintype() in ['image', 'application', 'audio', 'video']:
                        # This is an attachment
                        filename = part.get_filename()
                        if filename:
                            # Generate a unique ID for the attachment
                            attachment_id = str(uuid.uuid4())
                            
                            # Get content type and size
                            content_type = part.get_content_type()
                            content = part.get_payload(decode=True)
                            size = len(content) if content else 0
                            
                            # Save attachment to S3 or local storage
                            try:
                                from email_service.attachment_handler import attachment_handler
                                
                                # Create a mock UploadFile object
                                class MockUploadFile:
                                    def __init__(self, content, filename, content_type):
                                        self.content = content
                                        self.filename = filename
                                        self.content_type = content_type
                                        self.size = len(content)
                                    
                                    async def read(self):
                                        return self.content
                                
                                mock_file = MockUploadFile(content, filename, content_type)
                                
                                # Save attachment using a temporary user ID (we'll process this per recipient later)
                                temp_attachment_data = {
                                    'content': content,
                                    'filename': filename,
                                    'content_type': content_type,
                                    'size': size
                                }
                                attachments.append(temp_attachment_data)
                                print(f"📎 Found attachment: {filename} ({size} bytes)")
                                    
                            except Exception as e:
                                print(f"❌ Error processing attachment {filename}: {e}")
            else:
                body = email_message.get_content()
            
            # Parse date
            try:
                received_date = datetime.fromisoformat(date_header.replace('Z', '+00:00')) if date_header else envelope.received_at
            except:
                received_date = envelope.received_at
            
            # Convert datetime to ISO string for JSON serialization
            received_date_str = received_date.isoformat() if isinstance(received_date, datetime) else received_date
            
            # Store email for each recipient
            for recipient in envelope.recipients:
                print(f"🔍 Processing email for recipient: {recipient}")
                
                # Look up the recipient's user ID by email address
                user_id = await self._get_user_id_by_email(recipient)
                
                if not user_id:
                    print(f"❌ Recipient {recipient} not found in database, skipping...")
                    continue
                
                print(f"✅ Found user_id {user_id} for recipient {recipient}")
                
                # Process attachments for this specific recipient
                recipient_attachments = []
                if attachments:
                    print(f"📎 Processing {len(attachments)} attachments for recipient {recipient}")
                    from email_service.attachment_handler import attachment_handler
                    
                    for attachment in attachments:
                        try:
                            # Create a mock UploadFile object for each attachment
                            class MockUploadFile:
                                def __init__(self, content, filename, content_type):
                                    self.content = content
                                    self.filename = filename
                                    self.content_type = content_type
                                    self.size = len(content)
                                
                                async def read(self):
                                    return self.content
                            
                            mock_file = MockUploadFile(
                                attachment['content'], 
                                attachment['filename'], 
                                attachment['content_type']
                            )
                            
                            # Save attachment for this specific user
                            attachment_data = await attachment_handler.save_attachment(mock_file, user_id)
                            
                            if attachment_data:
                                recipient_attachments.append(attachment_data)
                                print(f"✅ Saved attachment for {recipient}: {attachment['filename']} (ID: {attachment_data['id']})")
                            else:
                                print(f"❌ Failed to save attachment for {recipient}: {attachment['filename']}")
                                
                        except Exception as e:
                            print(f"❌ Error saving attachment {attachment['filename']} for {recipient}: {e}")
                
                email_data = {
                    "subject": subject,
                    "body": body,
                    "html_body": html_body,
                    "from_address": from_address,
                    "to_addresses": to_addresses,
                    "cc_addresses": cc_addresses,
                    "bcc_addresses": [],
                    "attachments": recipient_attachments,
                    "status": EmailStatus.RECEIVED,
                    "priority": EmailPriority.NORMAL,
                    "received_at": received_date_str
                }
                
                # Store in database
                print(f"💾 Storing email in database for user_id: {user_id} with {len(recipient_attachments)} attachments")
                await EmailDatabase.create_email(email_data, user_id)
                
                print(f"✅ Email stored successfully for {recipient}: {subject}")
                
        except Exception as e:
            print(f"❌ Error processing email: {e}")
            import traceback
            traceback.print_exc()
            # Re-raise the exception to prevent hanging
            raise
    
    def _parse_email_address(self, address_string: str) -> EmailAddress:
        """Parse email address from string"""
        # Handle empty or invalid addresses
        if not address_string or not address_string.strip():
            return EmailAddress(email="unknown@example.com", name="Unknown")
        
        # Simple parsing - in production, use email.utils.parseaddr
        if '<' in address_string and '>' in address_string:
            # Format: "Name <email@domain.com>"
            match = re.search(r'<(.+?)>', address_string)
            email = match.group(1) if match else address_string.strip()
            name = address_string.split('<')[0].strip().strip('"')
        else:
            email = address_string.strip()
            name = email.split('@')[0] if '@' in email else email
        
        # Validate email format
        if not email or '@' not in email:
            email = "unknown@example.com"
            name = "Unknown"
        
        # Try to enrich the name with user data from database
        try:
            from shared.database import get_supabase
            supabase = get_supabase()
            clean_email = self._clean_email_address(email)
            
            # Look up user by email
            response = supabase.table('users').select('first_name,last_name,email').eq('email', clean_email).execute()
            
            if response.data:
                user_data = response.data[0]
                first_name = user_data.get("first_name", "")
                last_name = user_data.get("last_name", "")
                full_name = f"{first_name} {last_name}".strip()
                if full_name:
                    name = full_name
                else:
                    name = user_data.get("email", name)
        except Exception as e:
            print(f"Warning: Could not enrich email address {email}: {e}")
        
        return EmailAddress(email=email, name=name)
    
    def _parse_email_addresses(self, addresses_string: str) -> List[EmailAddress]:
        """Parse multiple email addresses from string"""
        if not addresses_string or not addresses_string.strip():
            return []
        
        addresses = []
        # Split by comma and parse each address
        for addr in addresses_string.split(','):
            addr = addr.strip()
            if addr:  # Only process non-empty addresses
                try:
                    addresses.append(self._parse_email_address(addr))
                except Exception:
                    # Skip invalid addresses
                    continue
        
        return addresses
    
    async def _get_user_id_by_email(self, email: str) -> Optional[str]:
        """Get user ID by email address"""
        try:
            import asyncio
            from shared.database import get_supabase
            supabase = get_supabase()
            
            # Clean the email address
            clean_email = self._clean_email_address(email)
            print(f"🔍 Looking up user for email: '{email}' -> cleaned: '{clean_email}'")
            
            # Look up user by email with timeout
            try:
                # Run the database query with a timeout
                loop = asyncio.get_event_loop()
                response = await asyncio.wait_for(
                    loop.run_in_executor(None, lambda: supabase.table('users').select('id').eq('email', clean_email).execute()),
                    timeout=5.0
                )
                
                if response.data:
                    user_id = response.data[0]['id']
                    print(f"✅ Found user_id: {user_id} for email: {clean_email}")
                    return user_id
                else:
                    print(f"❌ No user found for email: {clean_email}")
                    return None
            except asyncio.TimeoutError:
                print(f"❌ Timeout looking up user for email: {clean_email}")
                return None
                
        except Exception as e:
            print(f"❌ Error looking up user by email {email}: {e}")
            return None

    async def _send_response(self, writer: asyncio.StreamWriter, code: int, message: str):
        """Send SMTP response to client"""
        response = f"{code} {message}\r\n"
        writer.write(response.encode('utf-8'))
        await writer.drain()
    
    async def start_server(self):
        """Start the SMTP receive server"""
        host = settings.smtp_receive_host
        port = settings.smtp_receive_ssl_port if settings.smtp_receive_use_ssl else settings.smtp_receive_port
        
        if settings.smtp_receive_use_ssl:
            ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
            # In production, you'd load proper certificates
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
        
        async def handle_client(reader, writer):
            await self.handle_connection(reader, writer)
        
        if settings.smtp_receive_use_ssl:
            server = await asyncio.start_server(
                handle_client, host, port, ssl=ssl_context
            )
        else:
            server = await asyncio.start_server(handle_client, host, port)
        
        print(f"SMTP receive server running on {host}:{port}")
        
        async with server:
            await server.serve_forever()
