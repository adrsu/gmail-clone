#!/usr/bin/env python3
"""
Check existing emails in database to see attachment data
"""

import asyncio
from supabase import create_client, Client
from shared.config import settings

async def check_existing_emails():
    """Check existing emails in database"""
    print("🔍 Checking Existing Emails in Database")
    print("=" * 50)
    
    # Initialize Supabase client
    supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    
    user_id = "d75bbc95-08d7-4805-880c-24a6b6078636"  # Use the same user ID from debug info
    
    try:
        # Get all emails for this user
        result = supabase.table("emails").select("*").eq("user_id", user_id).execute()
        
        print(f"📧 Found {len(result.data)} emails for user {user_id}")
        
        for i, email in enumerate(result.data):
            print(f"\n📧 Email {i+1}:")
            print(f"   ID: {email.get('id')}")
            print(f"   Subject: {email.get('subject')}")
            print(f"   Status: {email.get('status')}")
            print(f"   Raw attachments data: {email.get('attachments')}")
            print(f"   Attachments type: {type(email.get('attachments'))}")
            
            if email.get('attachments'):
                print(f"   Attachments length: {len(email.get('attachments'))}")
                for j, att in enumerate(email.get('attachments')):
                    print(f"     Attachment {j+1}: {att}")
            else:
                print("   No attachments")
        
        # Check if there are any emails with non-empty attachments
        emails_with_attachments = [email for email in result.data if email.get('attachments')]
        print(f"\n📎 Emails with attachments: {len(emails_with_attachments)}")
        
        if emails_with_attachments:
            print("These emails have attachment data:")
            for email in emails_with_attachments:
                print(f"  - {email.get('subject')}: {email.get('attachments')}")
        else:
            print("No emails with attachments found in database")
            
    except Exception as e:
        print(f"❌ Error checking emails: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_existing_emails())
