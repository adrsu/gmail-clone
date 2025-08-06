import uuid
from datetime import datetime
from typing import List, Optional
from supabase import create_client, Client
from .models import EmailFolder, FolderType
from shared.config import settings

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


class MailboxDatabase:
    @staticmethod
    async def create_system_folders(user_id: str) -> List[EmailFolder]:
        """Create default system folders for a new user"""
        system_folders = [
            {"name": "Inbox", "icon": "inbox", "color": "#4285f4"},
            {"name": "Sent", "icon": "send", "color": "#34a853"},
            {"name": "Drafts", "icon": "drafts", "color": "#fbbc04"},
            {"name": "Trash", "icon": "delete", "color": "#ea4335"},
            {"name": "Spam", "icon": "report", "color": "#ff6b6b"},
            {"name": "Starred", "icon": "star", "color": "#ffd700"},
        ]
        
        folders = []
        now = datetime.utcnow()
        
        for folder_data in system_folders:
            folder_record = {
                "id": str(uuid.uuid4()),
                "name": folder_data["name"],
                "type": FolderType.SYSTEM,
                "user_id": user_id,
                "icon": folder_data["icon"],
                "color": folder_data["color"],
                "email_count": 0,
                "unread_count": 0,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            }
            
            result = supabase.table("email_folders").insert(folder_record).execute()
            if result.data:
                folders.append(EmailFolder(**result.data[0]))
        
        return folders

    @staticmethod
    async def create_custom_folder(
        user_id: str,
        name: str,
        parent_id: Optional[str] = None,
        color: Optional[str] = None,
        icon: Optional[str] = None
    ) -> EmailFolder:
        """Create a custom folder"""
        folder_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        folder_record = {
            "id": folder_id,
            "name": name,
            "type": FolderType.CUSTOM,
            "user_id": user_id,
            "parent_id": parent_id,
            "color": color,
            "icon": icon,
            "email_count": 0,
            "unread_count": 0,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        result = supabase.table("email_folders").insert(folder_record).execute()
        
        if result.data:
            return EmailFolder(**result.data[0])
        else:
            raise Exception("Failed to create folder")

    @staticmethod
    async def get_folders(user_id: str) -> List[EmailFolder]:
        """Get all folders for a user"""
        result = supabase.table("email_folders").select("*").eq("user_id", user_id).order("name").execute()
        
        folders = []
        for record in result.data:
            folders.append(EmailFolder(**record))
        
        return folders

    @staticmethod
    async def get_folder_by_id(folder_id: str, user_id: str) -> Optional[EmailFolder]:
        """Get a specific folder by ID"""
        result = supabase.table("email_folders").select("*").eq("id", folder_id).eq("user_id", user_id).execute()
        
        if result.data:
            return EmailFolder(**result.data[0])
        return None

    @staticmethod
    async def update_folder(
        folder_id: str,
        user_id: str,
        name: Optional[str] = None,
        parent_id: Optional[str] = None,
        color: Optional[str] = None,
        icon: Optional[str] = None
    ) -> bool:
        """Update folder details"""
        update_data = {"updated_at": datetime.utcnow().isoformat()}
        
        if name is not None:
            update_data["name"] = name
        if parent_id is not None:
            update_data["parent_id"] = parent_id
        if color is not None:
            update_data["color"] = color
        if icon is not None:
            update_data["icon"] = icon
        
        result = supabase.table("email_folders").update(update_data).eq("id", folder_id).eq("user_id", user_id).execute()
        
        return len(result.data) > 0

    @staticmethod
    async def delete_folder(folder_id: str, user_id: str) -> bool:
        """Delete a custom folder"""
        # First check if it's a system folder
        folder = await MailboxDatabase.get_folder_by_id(folder_id, user_id)
        if not folder or folder.type == FolderType.SYSTEM:
            return False
        
        result = supabase.table("email_folders").delete().eq("id", folder_id).eq("user_id", user_id).execute()
        
        return len(result.data) > 0

    @staticmethod
    async def update_folder_counts(folder_id: str, user_id: str) -> bool:
        """Update email and unread counts for a folder"""
        # Get email count
        email_count_result = supabase.table("emails").select("id", count="exact").eq("folder_id", folder_id).eq("user_id", user_id).execute()
        email_count = email_count_result.count or 0
        
        # Get unread count
        unread_count_result = supabase.table("emails").select("id", count="exact").eq("folder_id", folder_id).eq("user_id", user_id).eq("is_read", False).execute()
        unread_count = unread_count_result.count or 0
        
        # Update folder
        result = supabase.table("email_folders").update({
            "email_count": email_count,
            "unread_count": unread_count,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", folder_id).eq("user_id", user_id).execute()
        
        return len(result.data) > 0 