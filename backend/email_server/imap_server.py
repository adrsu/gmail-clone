import asyncio
import ssl
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from email.parser import BytesParser
from email import policy
import re

from .models import (
    IMAPCommand, IMAPResponse, IMAPMailbox, IMAPMessage, 
    ServerState, ConnectionInfo
)
from shared.config import settings
from email_service.database import EmailDatabase
from email_service.models import EmailStatus


class IMAPServer:
    def __init__(self):
        self.connections: Dict[str, ConnectionInfo] = {}
        self.capabilities = [
            "IMAP4rev1",
            "STARTTLS",
            "AUTH=PLAIN",
            "AUTH=LOGIN",
            "IDLE",
            "NAMESPACE",
            "QUOTA",
            "ID",
            "ENABLE",
            "CONDSTORE",
            "QRESYNC"
        ]
        
    async def handle_connection(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        """Handle a new IMAP connection"""
        client_id = str(uuid.uuid4())
        client_addr = writer.get_extra_info('peername')
        
        # Initialize connection info
        self.connections[client_id] = ConnectionInfo(
            client_id=client_id,
            capabilities=self.capabilities.copy(),
            created_at=datetime.utcnow(),
            last_activity=datetime.utcnow()
        )
        
        try:
            # Send greeting
            await self._send_response(writer, None, "OK", f"IMAP4rev1 Service Ready")
            
            while True:
                # Read command
                line = await reader.readline()
                if not line:
                    break
                    
                line_str = line.decode('utf-8', errors='ignore').strip()
                if not line_str:
                    continue
                    
                # Parse command
                command = self._parse_command(line_str)
                if not command:
                    await self._send_response(writer, None, "BAD", "Invalid command format")
                    continue
                
                # Update last activity
                self.connections[client_id].last_activity = datetime.utcnow()
                
                # Process command
                response = await self._process_command(client_id, command)
                
                # Handle untagged responses (like CAPABILITY)
                if response.response_type == "CAPABILITY":
                    await self._send_response(writer, "*", "CAPABILITY", response.message)
                    # Send OK response for the command
                    await self._send_response(writer, command.tag, "OK", f"{command.command} completed")
                elif response.response_type == "LIST_MULTIPLE":
                    # Send multiple LIST responses
                    for mailbox in response.data.get("mailboxes", []):
                        await self._send_response(writer, "*", "LIST", f'(\\HasNoChildren) "/" "{mailbox}"')
                    # Send OK response for the command
                    await self._send_response(writer, command.tag, "OK", f"{command.command} completed")
                elif response.response_type == "untagged":
                    await self._send_response(writer, "*", response.response_type, response.message)
                    # Send OK response for the command
                    await self._send_response(writer, command.tag, "OK", f"{command.command} completed")
                else:
                    await self._send_response(writer, response.tag, response.response_type, response.message)
                
        except Exception as e:
            print(f"IMAP connection error: {e}")
        finally:
            # Clean up connection
            if client_id in self.connections:
                del self.connections[client_id]
            writer.close()
            await writer.wait_closed()
    
    def _parse_command(self, line: str) -> Optional[IMAPCommand]:
        """Parse IMAP command line"""
        try:
            # Basic IMAP command parsing
            parts = line.split(' ', 2)
            if len(parts) < 2:
                return None
                
            tag = parts[0]
            command = parts[1].upper()
            arguments = parts[2].split(' ') if len(parts) > 2 else []
            
            return IMAPCommand(tag=tag, command=command, arguments=arguments)
        except Exception:
            return None
    
    async def _process_command(self, client_id: str, command: IMAPCommand) -> IMAPResponse:
        """Process IMAP command"""
        conn_info = self.connections[client_id]
        
        # Handle commands based on state
        if command.command == "CAPABILITY":
            return await self._handle_capability(conn_info)
        elif command.command == "NOOP":
            return IMAPResponse(tag=command.tag, response_type="OK", message="NOOP completed")
        elif command.command == "LOGOUT":
            conn_info.state = ServerState.LOGOUT
            return IMAPResponse(tag=command.tag, response_type="OK", message="LOGOUT completed")
        elif command.command == "STARTTLS":
            return await self._handle_starttls(conn_info, command)
        elif command.command == "AUTHENTICATE":
            return await self._handle_authenticate(conn_info, command)
        elif command.command == "LOGIN":
            return await self._handle_login(conn_info, command)
        elif command.command == "SELECT":
            return await self._handle_select(conn_info, command)
        elif command.command == "LIST":
            return await self._handle_list(conn_info, command)
        elif command.command == "FETCH":
            return await self._handle_fetch(conn_info, command)
        elif command.command == "SEARCH":
            return await self._handle_search(conn_info, command)
        elif command.command == "STORE":
            return await self._handle_store(conn_info, command)
        elif command.command == "EXPUNGE":
            return await self._handle_expunge(conn_info, command)
        else:
            return IMAPResponse(tag=command.tag, response_type="BAD", message="Unknown command")
    
    async def _handle_capability(self, conn_info: ConnectionInfo) -> IMAPResponse:
        """Handle CAPABILITY command"""
        caps = " ".join(conn_info.capabilities)
        response = IMAPResponse(
            tag=None,  # No tag for untagged response
            response_type="CAPABILITY", 
            message=caps,
            data={"capabilities": conn_info.capabilities}
        )
        return response
    
    async def _handle_starttls(self, conn_info: ConnectionInfo, command: IMAPCommand) -> IMAPResponse:
        """Handle STARTTLS command"""
        if conn_info.state != ServerState.NOT_AUTHENTICATED:
            return IMAPResponse(tag=command.tag, response_type="BAD", message="STARTTLS not allowed in current state")
        
        return IMAPResponse(tag=command.tag, response_type="OK", message="Begin TLS negotiation now")
    
    async def _handle_authenticate(self, conn_info: ConnectionInfo, command: IMAPCommand) -> IMAPResponse:
        """Handle AUTHENTICATE command"""
        if conn_info.state != ServerState.NOT_AUTHENTICATED:
            return IMAPResponse(tag=command.tag, response_type="BAD", message="Already authenticated")
        
        if not command.arguments or command.arguments[0].upper() not in ["PLAIN", "LOGIN"]:
            return IMAPResponse(tag=command.tag, response_type="BAD", message="Unsupported authentication method")
        
        # For now, accept any authentication in development mode
        if settings.development_mode:
            conn_info.state = ServerState.AUTHENTICATED
            conn_info.user_id = "dev_user"
            return IMAPResponse(tag=command.tag, response_type="OK", message="Authentication successful")
        else:
            # TODO: Implement proper authentication
            return IMAPResponse(tag=command.tag, response_type="NO", message="Authentication failed")
    
    async def _handle_login(self, conn_info: ConnectionInfo, command: IMAPCommand) -> IMAPResponse:
        """Handle LOGIN command"""
        if conn_info.state != ServerState.NOT_AUTHENTICATED:
            return IMAPResponse(tag=command.tag, response_type="BAD", message="Already authenticated")
        
        if len(command.arguments) < 2:
            return IMAPResponse(tag=command.tag, response_type="BAD", message="LOGIN requires username and password")
        
        username = command.arguments[0]
        password = command.arguments[1]
        
        # For development mode, accept any login
        if settings.development_mode:
            conn_info.state = ServerState.AUTHENTICATED
            conn_info.user_id = username
            return IMAPResponse(tag=command.tag, response_type="OK", message="LOGIN completed")
        else:
            # TODO: Implement proper authentication
            return IMAPResponse(tag=command.tag, response_type="NO", message="Login failed")
    
    async def _handle_select(self, conn_info: ConnectionInfo, command: IMAPCommand) -> IMAPResponse:
        """Handle SELECT command"""
        if conn_info.state != ServerState.AUTHENTICATED:
            return IMAPResponse(tag=command.tag, response_type="BAD", message="Not authenticated")
        
        if not command.arguments:
            return IMAPResponse(tag=command.tag, response_type="BAD", message="SELECT requires mailbox name")
        
        mailbox_name = command.arguments[0].strip('"')
        conn_info.selected_mailbox = mailbox_name
        conn_info.state = ServerState.SELECTED
        
        # Get mailbox info
        try:
            emails = await EmailDatabase.get_emails(
                user_id=conn_info.user_id,
                folder=mailbox_name,
                page=1,
                limit=1000
            )
            
            exists = len(emails)
            unseen = len([e for e in emails if not e.is_read])
            
            return IMAPResponse(
                tag=command.tag,
                response_type="OK",
                message=f"[READ-WRITE] {mailbox_name} selected",
                data={
                    "exists": exists,
                    "unseen": unseen,
                    "recent": 0,
                    "uidvalidity": 1,
                    "uidnext": exists + 1
                }
            )
        except Exception as e:
            return IMAPResponse(tag=command.tag, response_type="NO", message=f"SELECT failed: {str(e)}")
    
    async def _handle_list(self, conn_info: ConnectionInfo, command: IMAPCommand) -> IMAPResponse:
        """Handle LIST command"""
        if conn_info.state != ServerState.AUTHENTICATED:
            return IMAPResponse(tag=command.tag, response_type="BAD", message="Not authenticated")
        
        # Return standard mailboxes
        mailboxes = ["INBOX", "Sent", "Drafts", "Trash", "Spam"]
        
        # Return a special response type to indicate multiple responses
        return IMAPResponse(
            tag=command.tag,
            response_type="LIST_MULTIPLE",
            message="LIST command",
            data={"mailboxes": mailboxes}
        )
    
    async def _handle_fetch(self, conn_info: ConnectionInfo, command: IMAPCommand) -> IMAPResponse:
        """Handle FETCH command"""
        if conn_info.state != ServerState.SELECTED:
            return IMAPResponse(tag=command.tag, response_type="BAD", message="No mailbox selected")
        
        if not command.arguments or len(command.arguments) < 2:
            return IMAPResponse(tag=command.tag, response_type="BAD", message="FETCH requires message set and data items")
        
        message_set = command.arguments[0]
        data_items = command.arguments[1]
        
        try:
            # Get emails from selected mailbox
            emails = await EmailDatabase.get_emails(
                user_id=conn_info.user_id,
                folder=conn_info.selected_mailbox,
                page=1,
                limit=1000
            )
            
            # For now, return basic message info
            return IMAPResponse(
                response_type="untagged",
                message=f"{message_set} FETCH (FLAGS (\\Seen) UID {message_set} RFC822.SIZE {len(emails[0].body) if emails else 0})",
                data={"message_set": message_set, "data_items": data_items}
            )
        except Exception as e:
            return IMAPResponse(tag=command.tag, response_type="NO", message=f"FETCH failed: {str(e)}")
    
    async def _handle_search(self, conn_info: ConnectionInfo, command: IMAPCommand) -> IMAPResponse:
        """Handle SEARCH command"""
        if conn_info.state != ServerState.SELECTED:
            return IMAPResponse(tag=command.tag, response_type="BAD", message="No mailbox selected")
        
        # For now, return all messages
        return IMAPResponse(
            response_type="untagged",
            message="SEARCH 1 2 3 4 5",
            data={"search_results": [1, 2, 3, 4, 5]}
        )
    
    async def _handle_store(self, conn_info: ConnectionInfo, command: IMAPCommand) -> IMAPResponse:
        """Handle STORE command"""
        if conn_info.state != ServerState.SELECTED:
            return IMAPResponse(tag=command.tag, response_type="BAD", message="No mailbox selected")
        
        return IMAPResponse(tag=command.tag, response_type="OK", message="STORE completed")
    
    async def _handle_expunge(self, conn_info: ConnectionInfo, command: IMAPCommand) -> IMAPResponse:
        """Handle EXPUNGE command"""
        if conn_info.state != ServerState.SELECTED:
            return IMAPResponse(tag=command.tag, response_type="BAD", message="No mailbox selected")
        
        return IMAPResponse(tag=command.tag, response_type="OK", message="EXPUNGE completed")
    
    async def _send_response(self, writer: asyncio.StreamWriter, tag: Optional[str], response_type: str, message: str):
        """Send IMAP response to client"""
        if tag:
            response = f"{tag} {response_type} {message}\r\n"
        else:
            response = f"* {response_type} {message}\r\n"
        
        # print(f"DEBUG: Sending response: {response.strip()}")
        writer.write(response.encode('utf-8'))
        await writer.drain()
    
    async def start_server(self):
        """Start the IMAP server"""
        host = settings.imap_host
        port = settings.imap_ssl_port if settings.imap_use_ssl else settings.imap_port
        
        if settings.imap_use_ssl:
            ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
            # In production, you'd load proper certificates
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
        
        async def handle_client(reader, writer):
            await self.handle_connection(reader, writer)
        
        if settings.imap_use_ssl:
            server = await asyncio.start_server(
                handle_client, host, port, ssl=ssl_context
            )
        else:
            server = await asyncio.start_server(handle_client, host, port)
        
        print(f"IMAP server running on {host}:{port}")
        
        async with server:
            await server.serve_forever()
