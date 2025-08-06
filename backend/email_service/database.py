import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from supabase import create_client, Client
from .models import EmailMessage, EmailStatus, EmailPriority, EmailAddress, EmailAttachment
from shared.config import settings

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


class EmailDatabase:
    @staticmethod
    async def create_email(email_data: Dict[str, Any], user_id: str) -> EmailMessage:
        """Create a new email in the database"""
        email_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        email_record = {
            "id": email_id,
            "user_id": user_id,
            "subject": email_data["subject"],
            "body": email_data["body"],
            "html_body": email_data.get("html_body"),
            "from_address": email_data["from_address"],
            "to_addresses": email_data["to_addresses"],
            "cc_addresses": email_data.get("cc_addresses", []),
            "bcc_addresses": email_data.get("bcc_addresses", []),
            "attachments": email_data.get("attachments", []),
            "status": email_data["status"],
            "priority": email_data.get("priority", EmailPriority.NORMAL),
            "is_read": email_data.get("is_read", False),
            "is_starred": email_data.get("is_starred", False),
            "thread_id": email_data.get("thread_id"),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "sent_at": email_data.get("sent_at"),
            "received_at": email_data.get("received_at")
        }
        
        result = supabase.table("emails").insert(email_record).execute()
        
        if result.data:
            return EmailMessage(**result.data[0])
        else:
            raise Exception("Failed to create email")

    @staticmethod
    async def get_emails(
        user_id: str,
        folder: str = "inbox",
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        status: Optional[EmailStatus] = None,
        is_read: Optional[bool] = None,
        is_starred: Optional[bool] = None
    ) -> List[EmailMessage]:
        """Get emails for a user with filtering and pagination"""
        query = supabase.table("emails").select("*").eq("user_id", user_id)
        
        # Apply folder filter
        if folder == "inbox":
            query = query.eq("status", EmailStatus.RECEIVED)
        elif folder == "sent":
            query = query.eq("status", EmailStatus.SENT)
        elif folder == "drafts":
            query = query.eq("status", EmailStatus.DRAFT)
        elif folder == "trash":
            query = query.eq("status", EmailStatus.TRASH)
        elif folder == "starred":
            query = query.eq("is_starred", True)
        
        # Apply additional filters
        if status:
            query = query.eq("status", status)
        if is_read is not None:
            query = query.eq("is_read", is_read)
        if is_starred is not None:
            query = query.eq("is_starred", is_starred)
        
        # Apply search
        if search:
            query = query.or_(f"subject.ilike.%{search}%,body.ilike.%{search}%")
        
        # Apply pagination
        offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)
        
        # Order by date
        query = query.order("created_at", desc=True)
        
        result = query.execute()
        
        emails = []
        for record in result.data:
            emails.append(EmailMessage(**record))
        
        return emails

    @staticmethod
    async def get_email_by_id(email_id: str, user_id: str) -> Optional[EmailMessage]:
        """Get a specific email by ID"""
        result = supabase.table("emails").select("*").eq("id", email_id).eq("user_id", user_id).execute()
        
        if result.data:
            return EmailMessage(**result.data[0])
        return None

    @staticmethod
    async def update_email_status(email_id: str, user_id: str, status: EmailStatus) -> bool:
        """Update email status"""
        result = supabase.table("emails").update({
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", email_id).eq("user_id", user_id).execute()
        
        return len(result.data) > 0

    @staticmethod
    async def mark_as_read(email_id: str, user_id: str, is_read: bool = True) -> bool:
        """Mark email as read/unread"""
        result = supabase.table("emails").update({
            "is_read": is_read,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", email_id).eq("user_id", user_id).execute()
        
        return len(result.data) > 0

    @staticmethod
    async def toggle_star(email_id: str, user_id: str) -> bool:
        """Toggle email star status"""
        # First get current star status
        email = await EmailDatabase.get_email_by_id(email_id, user_id)
        if not email:
            return False
        
        new_star_status = not email.is_starred
        
        result = supabase.table("emails").update({
            "is_starred": new_star_status,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", email_id).eq("user_id", user_id).execute()
        
        return len(result.data) > 0

    @staticmethod
    async def delete_email(email_id: str, user_id: str) -> bool:
        """Delete email (move to trash)"""
        result = supabase.table("emails").update({
            "status": EmailStatus.TRASH,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", email_id).eq("user_id", user_id).execute()
        
        return len(result.data) > 0

    @staticmethod
    async def get_email_count(user_id: str, folder: str = "inbox") -> int:
        """Get email count for a folder"""
        query = supabase.table("emails").select("id", count="exact").eq("user_id", user_id)
        
        if folder == "inbox":
            query = query.eq("status", EmailStatus.RECEIVED)
        elif folder == "sent":
            query = query.eq("status", EmailStatus.SENT)
        elif folder == "drafts":
            query = query.eq("status", EmailStatus.DRAFT)
        elif folder == "trash":
            query = query.eq("status", EmailStatus.TRASH)
        elif folder == "starred":
            query = query.eq("is_starred", True)
        
        result = query.execute()
        return result.count or 0 