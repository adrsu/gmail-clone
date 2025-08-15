from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from enum import Enum


class EmailStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    RECEIVED = "received"
    ARCHIVED = "archived"
    TRASH = "trash"


class EmailPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class EmailAttachment(BaseModel):
    id: str
    filename: str
    content_type: str
    size: int
    url: Optional[str] = None


class EmailAddress(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class EmailMessage(BaseModel):
    id: str
    subject: str
    body: str
    html_body: Optional[str] = None
    from_address: EmailAddress
    to_addresses: List[EmailAddress]
    cc_addresses: List[EmailAddress] = []
    bcc_addresses: List[EmailAddress] = []
    attachments: List[EmailAttachment] = []
    status: EmailStatus
    priority: EmailPriority = EmailPriority.NORMAL
    is_read: bool = False
    is_starred: bool = False
    thread_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    sent_at: Optional[datetime] = None
    received_at: Optional[datetime] = None


class ComposeEmailRequest(BaseModel):
    subject: str
    body: str
    html_body: Optional[str] = None
    to_addresses: List[str]
    cc_addresses: List[str] = []
    bcc_addresses: List[str] = []
    priority: EmailPriority = EmailPriority.NORMAL
    save_as_draft: bool = False
    attachment_ids: List[str] = []  # IDs of uploaded attachments


class EmailListRequest(BaseModel):
    folder: str = "inbox"
    page: int = 1
    limit: int = 20
    search: Optional[str] = None
    status: Optional[EmailStatus] = None
    is_read: Optional[bool] = None
    is_starred: Optional[bool] = None


class EmailListResponse(BaseModel):
    emails: List[EmailMessage]
    total: int
    page: int
    limit: int
    has_more: bool 