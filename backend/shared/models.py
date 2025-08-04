from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
import uuid

class User(BaseModel):
    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    created_at: datetime
    last_login: Optional[datetime] = None
    is_active: bool = True

class UserSetting(BaseModel):
    id: str
    user_id: str
    setting_key: str
    setting_value: Optional[str] = None

class Email(BaseModel):
    id: str
    user_id: str
    sender: str
    recipients: List[str]
    subject: str
    sent_at: datetime
    message_id: Optional[str] = None
    thread_id: Optional[str] = None
    folder: str = "inbox"
    labels: List[str] = []
    is_read: bool = False
    is_starred: bool = False
    is_deleted: bool = False 