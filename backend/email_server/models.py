from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class IMAPCommand(BaseModel):
    """IMAP command model"""
    tag: str
    command: str
    arguments: List[str] = []


class IMAPResponse(BaseModel):
    """IMAP response model"""
    tag: Optional[str] = None
    response_type: str  # OK, NO, BAD, untagged
    message: str
    data: Optional[Dict[str, Any]] = None


class SMTPCommand(BaseModel):
    """SMTP command model"""
    command: str
    arguments: List[str] = []


class SMTPResponse(BaseModel):
    """SMTP response model"""
    code: int
    message: str


class EmailEnvelope(BaseModel):
    """Email envelope for SMTP processing"""
    sender: str
    recipients: List[str]
    data: bytes
    received_at: datetime


class IMAPMailbox(BaseModel):
    """IMAP mailbox model"""
    name: str
    flags: List[str] = []
    permanent_flags: List[str] = []
    unseen: int = 0
    exists: int = 0
    recent: int = 0
    uidvalidity: int = 1
    uidnext: int = 1


class IMAPMessage(BaseModel):
    """IMAP message model"""
    uid: int
    flags: List[str] = []
    internal_date: datetime
    size: int
    envelope: Dict[str, Any]
    body_structure: Dict[str, Any]
    body: str


class ServerState(str, Enum):
    """Server state enumeration"""
    NOT_AUTHENTICATED = "NOT_AUTHENTICATED"
    AUTHENTICATED = "AUTHENTICATED"
    SELECTED = "SELECTED"
    LOGOUT = "LOGOUT"


class ConnectionInfo(BaseModel):
    """Connection information for clients"""
    client_id: str
    state: ServerState = ServerState.NOT_AUTHENTICATED
    user_id: Optional[str] = None
    selected_mailbox: Optional[str] = None
    capabilities: List[str] = []
    created_at: datetime
    last_activity: datetime
