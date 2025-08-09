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
                line = await reader.readline()
                if not line:
                    break
                    
                line_str = line.decode('utf-8', errors='ignore').strip()
                if not line_str:
                    continue
                
                # Update last activity
                self.connections[client_id].last_activity = datetime.utcnow()
                
                # Parse command
                command = self._parse_command(line_str)
                if not command:
                    await self._send_response(writer, 500, "Invalid command")
                    continue
                
                # Process command
                response = await self._process_command(client_id, command, current_envelope)
                
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
                elif command.command == "DATA" and response.code == 354:
                    # Read email data
                    email_data = await self._read_email_data(reader)
                    if current_envelope:
                        current_envelope.data = email_data
                        # Process and store the email
                        await self._process_email(current_envelope)
                        current_envelope = None
                        # Send success response after processing
                        await self._send_response(writer, 250, "Message accepted for delivery")
                        continue  # Skip the normal response sending below
                
                await self._send_response(writer, response.code, response.message)
                
        except Exception as e:
            print(f"SMTP connection error: {e}")
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
            parts = line.split(' ', 1)
            command = parts[0].upper()
            arguments = parts[1].split(' ') if len(parts) > 1 else []
            
            return SMTPCommand(command=command, arguments=arguments)
        except Exception:
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
        if not current_envelope:
            return SMTPResponse(code=503, message="Need MAIL command")
        
        if not current_envelope.recipients:
            return SMTPResponse(code=503, message="Need RCPT command")
        
        return SMTPResponse(code=354, message="End data with <CR><LF>.<CR><LF>")
    
    async def _read_email_data(self, reader: asyncio.StreamReader) -> bytes:
        """Read email data until end marker"""
        data = b""
        while True:
            line = await reader.readline()
            if not line:
                break
            
            # Check for end marker
            if line.strip() == b".":
                break
            
            # Remove leading dot if present
            if line.startswith(b"."):
                line = line[1:]
            
            data += line
        
        return data
    
    async def _process_email(self, envelope: EmailEnvelope):
        """Process and store received email"""
        try:
            # Parse email
            email_message = self.parser.parsebytes(envelope.data)
            
            # Extract email components
            subject = email_message.get('Subject', 'No Subject')
            from_header = email_message.get('From', '')
            to_header = email_message.get('To', '')
            cc_header = email_message.get('Cc', '')
            date_header = email_message.get('Date', '')
            
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
            
            # Get email body
            body = ""
            html_body = None
            
            if email_message.is_multipart():
                for part in email_message.walk():
                    if part.get_content_maintype() == 'multipart':
                        continue
                    if part.get_content_maintype() == 'text':
                        if part.get_content_subtype() == 'plain':
                            body = part.get_content()
                        elif part.get_content_subtype() == 'html':
                            html_body = part.get_content()
                        break
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
                # Use the existing user ID from database
                # In a real implementation, you'd look up the user by email address
                user_id = self.default_user_id
                
                email_data = {
                    "subject": subject,
                    "body": body,
                    "html_body": html_body,
                    "from_address": from_address,
                    "to_addresses": to_addresses,
                    "cc_addresses": cc_addresses,
                    "bcc_addresses": [],
                    "status": EmailStatus.RECEIVED,
                    "priority": EmailPriority.NORMAL,
                    "received_at": received_date_str
                }
                
                # Store in database
                await EmailDatabase.create_email(email_data, user_id)
                
                print(f"Email received for {recipient}: {subject}")
                
        except Exception as e:
            print(f"Error processing email: {e}")
            import traceback
            traceback.print_exc()
    
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
