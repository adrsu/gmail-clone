from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from enum import Enum


class FolderType(str, Enum):
    SYSTEM = "system"
    CUSTOM = "custom"


class EmailFolder(BaseModel):
    id: str
    name: str
    type: FolderType
    user_id: str
    parent_id: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    email_count: int = 0
    unread_count: int = 0
    created_at: datetime
    updated_at: datetime


class CreateFolderRequest(BaseModel):
    name: str
    parent_id: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class UpdateFolderRequest(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class FolderListResponse(BaseModel):
    folders: List[EmailFolder]
    total: int 