import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from supabase import create_client, Client
from .models import EmailMessage, EmailStatus, EmailPriority, EmailAddress, EmailAttachment
from shared.config import settings
from shared.elasticsearch_service import elasticsearch_service

# Helper function for user data enrichment

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def get_user_by_id(user_id: str) -> Optional[Dict]:
    """Get user information by user ID"""
    try:
        result = supabase.table("users").select("*").eq("id", user_id).execute()
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        print(f"Error getting user by id {user_id}: {e}")
        return None

def get_user_by_email(email: str) -> Optional[Dict]:
    """Get user information by email address"""
    try:
        result = supabase.table("users").select("*").eq("email", email).execute()
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        print(f"Error getting user by email {email}: {e}")
        return None

def enrich_email_with_user_data(email_data: Dict) -> Dict:
    """Enrich email data with proper user information"""
    try:
        # Check if from_address contains a user_id instead of email
        from_address = email_data.get("from_address", {})
        to_addresses = email_data.get("to_addresses", [])
        
        if isinstance(from_address, dict):
            from_email = from_address.get("email", "") or ""
            from_name = from_address.get("name", "") or ""
            
            # Check if the email field contains a UUID (user_id) or if name is a UUID
            is_email_uuid = len(from_email) == 36 and from_email.count('-') == 4
            is_name_uuid = len(from_name) == 36 and from_name.count('-') == 4
            
            # Also check if email ends with @example.com (common pattern for test emails with UUIDs)
            is_example_email = from_email.endswith("@example.com") and len(from_email.split("@")[0]) == 36
            
            user_id_to_lookup = None
            if is_email_uuid:
                user_id_to_lookup = from_email
            elif is_name_uuid:
                user_id_to_lookup = from_name
            elif is_example_email:
                user_id_to_lookup = from_email.split("@")[0]
            
            if user_id_to_lookup:
                user_data = get_user_by_id(user_id_to_lookup)
                
                if user_data:
                    # Create full name
                    first_name = user_data.get("first_name", "")
                    last_name = user_data.get("last_name", "")
                    full_name = f"{first_name} {last_name}".strip()
                    if not full_name:
                        full_name = user_data.get("email", user_id_to_lookup)
                    
                    # Update from_address with proper data
                    email_data["from_address"] = {
                        "email": user_data.get("email", user_id_to_lookup),
                        "name": full_name
                    }
        
        # Also handle to_addresses, cc_addresses, bcc_addresses if needed
        for address_field in ["to_addresses", "cc_addresses", "bcc_addresses"]:
            if address_field in email_data and isinstance(email_data[address_field], list):
                enriched_addresses = []
                for addr in email_data[address_field]:
                    if isinstance(addr, dict):
                        addr_email = addr.get("email", "") or ""
                        addr_name = addr.get("name", "") or ""
                        
                        # Check if the email field contains a UUID (user_id) or if name is a UUID
                        is_addr_email_uuid = len(addr_email) == 36 and addr_email.count('-') == 4
                        is_addr_name_uuid = len(addr_name) == 36 and addr_name.count('-') == 4
                        is_addr_example_email = addr_email.endswith("@example.com") and len(addr_email.split("@")[0]) == 36
                        
                        user_id_to_lookup = None
                        if is_addr_email_uuid:
                            user_id_to_lookup = addr_email
                        elif is_addr_name_uuid:
                            user_id_to_lookup = addr_name
                        elif is_addr_example_email:
                            user_id_to_lookup = addr_email.split("@")[0]
                        
                        if user_id_to_lookup:
                            # Look up by user_id
                            user_data = get_user_by_id(user_id_to_lookup)
                            if user_data:
                                first_name = user_data.get("first_name", "")
                                last_name = user_data.get("last_name", "")
                                full_name = f"{first_name} {last_name}".strip()
                                if not full_name:
                                    full_name = user_data.get("email", user_id_to_lookup)
                                
                                enriched_addresses.append({
                                    "email": user_data.get("email", user_id_to_lookup),
                                    "name": full_name
                                })
                            else:
                                enriched_addresses.append(addr)
                        else:
                            # Not a user_id, check if it's a real email in our users table
                            user_data = get_user_by_email(addr_email)
                            if user_data:
                                first_name = user_data.get("first_name", "")
                                last_name = user_data.get("last_name", "")
                                full_name = f"{first_name} {last_name}".strip()
                                if not full_name:
                                    full_name = user_data.get("email", addr_email)
                                
                                enriched_addresses.append({
                                    "email": addr_email,
                                    "name": full_name
                                })
                            else:
                                # Not in our users table, keep original
                                enriched_addresses.append(addr)
                    else:
                        enriched_addresses.append(addr)
                email_data[address_field] = enriched_addresses
        
        return email_data
    except Exception as e:
        print(f"Error enriching email data: {e}")
        import traceback
        traceback.print_exc()
        return email_data

class EmailDatabase:
    @staticmethod
    async def create_email(email_data: Dict[str, Any], user_id: str) -> EmailMessage:
        """Create a new email in the database"""
        email_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Convert EmailAddress objects to dictionaries for storage
        from_address_dict = email_data["from_address"].dict() if hasattr(email_data["from_address"], 'dict') else email_data["from_address"]
        to_addresses_dict = [addr.dict() if hasattr(addr, 'dict') else addr for addr in email_data["to_addresses"]]
        cc_addresses_dict = [addr.dict() if hasattr(addr, 'dict') else addr for addr in email_data.get("cc_addresses", [])]
        bcc_addresses_dict = [addr.dict() if hasattr(addr, 'dict') else addr for addr in email_data.get("bcc_addresses", [])]
        
        email_record = {
            "id": email_id,
            "user_id": user_id,
            "subject": email_data["subject"],
            "body": email_data["body"],
            "html_body": email_data.get("html_body"),
            "from_address": from_address_dict,
            "to_addresses": to_addresses_dict,
            "cc_addresses": cc_addresses_dict,
            "bcc_addresses": bcc_addresses_dict,
            "attachments": email_data.get("attachments", []),
            "status": email_data["status"],
            "priority": email_data.get("priority", EmailPriority.NORMAL),
            "is_read": email_data.get("is_read", False),
            "is_starred": email_data.get("is_starred", False),
            "thread_id": email_data.get("thread_id"),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "sent_at": email_data.get("sent_at").isoformat() if email_data.get("sent_at") else None,
            "received_at": email_data.get("received_at")
        }
        
        result = supabase.table("emails").insert(email_record).execute()
        
        if result.data:
            # Index the email in Elasticsearch
            try:
                await elasticsearch_service.index_email(result.data[0])
            except Exception as e:
                print(f"Failed to index email in Elasticsearch: {e}")
            
            # Update folder counts after creating email
            await EmailDatabase.update_folder_counts(user_id)
            return EmailMessage(**result.data[0])
        else:
            raise Exception("Failed to create email")

    @staticmethod
    async def get_emails(
        user_id: str,
        folder: str = "inbox",
        page: int = 1,
        limit: int = 5,
        search: Optional[str] = None,
        status: Optional[EmailStatus] = None,
        is_read: Optional[bool] = None,
        is_starred: Optional[bool] = None
    ) -> List[EmailMessage]:
        """Get emails for a user with filtering and pagination"""
        
        # If search is provided, use Elasticsearch
        if search:
            try:
                # Search using Elasticsearch
                search_result = await elasticsearch_service.search_emails(
                    user_id=user_id,
                    search_query=search,
                    folder=folder,
                    page=page,
                    limit=limit,
                    status=status.value if status else None,
                    is_read=is_read,
                    is_starred=is_starred
                )
                
                # If no results from Elasticsearch, return empty list
                if not search_result["email_ids"]:
                    return []
                
                # Fetch the actual email data from Supabase using the IDs from Elasticsearch
                email_ids = search_result["email_ids"]
                result = supabase.table("emails").select("*").in_("id", email_ids).execute()
                
                # Sort the results to match the order from Elasticsearch
                email_map = {email["id"]: email for email in result.data}
                emails = []
                for email_id in email_ids:
                    if email_id in email_map:
                        enriched_record = enrich_email_with_user_data(email_map[email_id])
                        emails.append(EmailMessage(**enriched_record))
                
                return emails
                
            except Exception as e:
                print(f"❌ [FALLBACK] Elasticsearch search failed, falling back to Supabase: {e}")
                # Fall back to Supabase search if Elasticsearch fails
        
        # Use Supabase for non-search queries or as fallback
        query = supabase.table("emails").select("*").eq("user_id", user_id)
        
        # Apply folder filter
        if folder == "inbox":
            query = query.eq("status", EmailStatus.RECEIVED.value)
        elif folder == "sent":
            query = query.eq("status", EmailStatus.SENT.value)
        elif folder == "drafts":
            query = query.eq("status", EmailStatus.DRAFT.value)
        elif folder == "trash":
            query = query.eq("status", EmailStatus.TRASH.value)
        elif folder == "starred":
            query = query.eq("is_starred", True)
        
        # Apply additional filters
        if status:
            query = query.eq("status", status)
        if is_read is not None:
            query = query.eq("is_read", is_read)
        if is_starred is not None:
            query = query.eq("is_starred", is_starred)
        
        # Apply search (fallback to Supabase ilike)
        if search:
            print(f"🔍 [SUPABASE] Using ilike search for: '{search}'")
            query = query.or_(f"subject.ilike.%{search}%,body.ilike.%{search}%")
        
        # Apply pagination
        offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)
        
        # Order by date
        query = query.order("created_at", desc=True)
        
        result = query.execute()
        
        emails = []
        for record in result.data:
            # Enrich email data with proper user information
            enriched_record = enrich_email_with_user_data(record)
            emails.append(EmailMessage(**enriched_record))
        
        return emails

    @staticmethod
    async def get_email_by_id(email_id: str, user_id: str) -> Optional[EmailMessage]:
        """Get a specific email by ID"""
        result = supabase.table("emails").select("*").eq("id", email_id).eq("user_id", user_id).execute()
        
        if result.data:
            # Enrich email data with proper user information
            enriched_record = enrich_email_with_user_data(result.data[0])
            return EmailMessage(**enriched_record)
        return None

    @staticmethod
    async def update_email_status(email_id: str, user_id: str, status: EmailStatus) -> bool:
        """Update email status"""
        result = supabase.table("emails").update({
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", email_id).eq("user_id", user_id).execute()
        
        if len(result.data) > 0:
            # Update folder counts after status change
            await EmailDatabase.update_folder_counts(user_id)
            return True
        return False

    @staticmethod
    async def update_email(email_id: str, user_id: str, email_data: Dict[str, Any]) -> Optional[EmailMessage]:
        """Update an existing email"""
        now = datetime.utcnow()
        
        # Convert EmailAddress objects to dictionaries for storage
        from_address_dict = email_data["from_address"].dict() if hasattr(email_data["from_address"], 'dict') else email_data["from_address"]
        to_addresses_dict = [addr.dict() if hasattr(addr, 'dict') else addr for addr in email_data["to_addresses"]]
        cc_addresses_dict = [addr.dict() if hasattr(addr, 'dict') else addr for addr in email_data.get("cc_addresses", [])]
        bcc_addresses_dict = [addr.dict() if hasattr(addr, 'dict') else addr for addr in email_data.get("bcc_addresses", [])]
        
        update_data = {
            "subject": email_data["subject"],
            "body": email_data["body"],
            "html_body": email_data.get("html_body"),
            "from_address": from_address_dict,
            "to_addresses": to_addresses_dict,
            "cc_addresses": cc_addresses_dict,
            "bcc_addresses": bcc_addresses_dict,
            "attachments": email_data.get("attachments", []),
            "status": email_data["status"],
            "priority": email_data.get("priority", EmailPriority.NORMAL),
            "updated_at": now.isoformat(),
        }
        
        # Only update sent_at if the email is being sent
        if email_data["status"] == EmailStatus.SENT:
            update_data["sent_at"] = now.isoformat()
        
        result = supabase.table("emails").update(update_data).eq("id", email_id).eq("user_id", user_id).execute()
        
        if result.data:
            # Update the email in Elasticsearch
            try:
                await elasticsearch_service.update_email(email_id, result.data[0])
            except Exception as e:
                print(f"Failed to update email in Elasticsearch: {e}")
            
            # Update folder counts after updating email
            await EmailDatabase.update_folder_counts(user_id)
            return EmailMessage(**result.data[0])
        return None

    @staticmethod
    async def mark_as_read(email_id: str, user_id: str, is_read: bool = True) -> bool:
        """Mark email as read/unread"""
        result = supabase.table("emails").update({
            "is_read": is_read,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", email_id).eq("user_id", user_id).execute()
        
        if len(result.data) > 0:
            # Update the email in Elasticsearch
            try:
                await elasticsearch_service.update_email(email_id, result.data[0])
            except Exception as e:
                print(f"Failed to update email in Elasticsearch: {e}")
            return True
        return False

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
        
        if len(result.data) > 0:
            # Update the email in Elasticsearch
            try:
                await elasticsearch_service.update_email(email_id, result.data[0])
            except Exception as e:
                print(f"Failed to update email in Elasticsearch: {e}")
            
            # Update folder counts after star toggle
            await EmailDatabase.update_folder_counts(user_id)
            return True
        return False

    @staticmethod
    async def delete_email(email_id: str, user_id: str) -> bool:
        """Delete email (move to trash)"""
        result = supabase.table("emails").update({
            "status": EmailStatus.TRASH.value,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", email_id).eq("user_id", user_id).execute()
        
        if len(result.data) > 0:
            # Update the email in Elasticsearch
            try:
                await elasticsearch_service.update_email(email_id, result.data[0])
            except Exception as e:
                print(f"Failed to update email in Elasticsearch: {e}")
            
            # Update folder counts after moving to trash
            await EmailDatabase.update_folder_counts(user_id)
            return True
        return False

    @staticmethod
    async def get_email_count(user_id: str, folder: str = "inbox", search: Optional[str] = None) -> int:
        """Get email count for a folder"""
        # If search is provided, use Elasticsearch to get count
        if search:
            try:
                search_result = await elasticsearch_service.search_emails(
                    user_id=user_id,
                    search_query=search,
                    folder=folder,
                    page=1,
                    limit=1  # We only need the count, not the actual results
                )
                return search_result["total"]
            except Exception as e:
                print(f"Elasticsearch count failed, falling back to Supabase: {e}")
                # Fall back to Supabase count if Elasticsearch fails
        
        # Use Supabase for non-search queries or as fallback
        query = supabase.table("emails").select("id", count="exact").eq("user_id", user_id)
        
        if folder == "inbox":
            query = query.eq("status", EmailStatus.RECEIVED.value)
        elif folder == "sent":
            query = query.eq("status", EmailStatus.SENT.value)
        elif folder == "drafts":
            query = query.eq("status", EmailStatus.DRAFT.value)
        elif folder == "trash":
            query = query.eq("status", EmailStatus.TRASH.value)
        elif folder == "starred":
            query = query.eq("is_starred", True)
        
        result = query.execute()
        return result.count or 0

    @staticmethod
    async def update_folder_counts(user_id: str) -> bool:
        """Update email counts for all folders"""
        try:
            # Get counts for each folder
            inbox_count = await EmailDatabase.get_email_count(user_id, "inbox")
            sent_count = await EmailDatabase.get_email_count(user_id, "sent")
            drafts_count = await EmailDatabase.get_email_count(user_id, "drafts")
            trash_count = await EmailDatabase.get_email_count(user_id, "trash")
            starred_count = await EmailDatabase.get_email_count(user_id, "starred")
            
            # Update email_folders table
            # First, get the folder IDs for this user
            folders_result = supabase.table("email_folders").select("id, name").eq("user_id", user_id).execute()
            
            if folders_result.data:
                for folder in folders_result.data:
                    folder_name = folder["name"].lower()
                    count = 0
                    
                    if folder_name == "inbox":
                        count = inbox_count
                    elif folder_name == "sent":
                        count = sent_count
                    elif folder_name == "drafts":
                        count = drafts_count
                    elif folder_name == "trash":
                        count = trash_count
                    elif folder_name == "starred":
                        count = starred_count
                    
                    # Update the folder count
                    supabase.table("email_folders").update({
                        "email_count": count,
                        "updated_at": datetime.utcnow().isoformat()
                    }).eq("id", folder["id"]).execute()
            
            return True
        except Exception as e:
            print(f"Error updating folder counts: {e}")
            return False 