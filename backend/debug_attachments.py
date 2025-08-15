#!/usr/bin/env python3
"""
Debug script to check attachment data in emails
"""

import asyncio
import os
import tempfile
from pathlib import Path
from email_service.attachment_handler import attachment_handler
from email_service.database import EmailDatabase
from email_service.models import EmailStatus, EmailPriority, EmailAddress
from shared.config import settings

async def debug_attachment_issue():
    """Debug the attachment issue"""
    print("🔍 Debugging Attachment Issue")
    print("=" * 50)
    
    # Check S3 configuration
    print(f"🔧 S3 Configuration:")
    print(f"   AWS_ACCESS_KEY_ID: {'✅ Set' if settings.AWS_ACCESS_KEY_ID else '❌ Not set'}")
    print(f"   AWS_SECRET_ACCESS_KEY: {'✅ Set' if settings.AWS_SECRET_ACCESS_KEY else '❌ Not set'}")
    print(f"   AWS_REGION: {settings.AWS_REGION}")
    print(f"   S3_BUCKET: {settings.S3_BUCKET}")
    print(f"   S3 Client: {'✅ Initialized' if attachment_handler.s3_client else '❌ Not Initialized'}")
    
    if not attachment_handler.s3_client:
        print("❌ S3 client not initialized. Cannot proceed with S3 tests.")
        return

    # Create a test file and upload it
    print("\n📤 Creating and uploading test attachment...")
    test_content = b"This is a test file content for debugging."
    test_filename = "debug_test.txt"
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.txt') as temp_file:
        temp_file.write(test_content)
        temp_file_path = temp_file.name
    
    try:
        user_id = "d75bbc95-08d7-4805-880c-24a6b6078636"  # Use the same user ID from the debug info
        
        # Mock UploadFile for save_attachment
        class MockUploadFile:
            def __init__(self, file_path, filename):
                self.file_path = file_path
                self.filename = filename
                self.content_type = "text/plain"
                self.size = os.path.getsize(file_path)
            
            async def read(self):
                with open(self.file_path, 'rb') as f:
                    return f.read()
        
        mock_file = MockUploadFile(temp_file_path, test_filename)
        
        # Upload attachment
        uploaded_attachment = await attachment_handler.save_attachment(mock_file, user_id)
        if not uploaded_attachment:
            print("❌ Failed to upload attachment")
            return
        
        print(f"✅ Attachment uploaded: {uploaded_attachment['id']}")
        
        # Check if attachment metadata can be retrieved
        print("\n📋 Testing attachment metadata retrieval...")
        attachment_meta = await attachment_handler.get_attachment(uploaded_attachment['id'], user_id)
        if attachment_meta:
            print(f"✅ Attachment metadata retrieved: {attachment_meta}")
        else:
            print("❌ Failed to retrieve attachment metadata")
            return
        
        # Now create an email with this attachment
        print("\n📧 Creating email with attachment...")
        from_address = EmailAddress(email=f"{user_id}@example.com", name="Test User")
        to_addresses = [EmailAddress(email="recipient@example.com", name="Recipient")]
        
        email_data = {
            "subject": "Test Email with Attachment",
            "body": "This is a test email with an attachment.",
            "from_address": from_address,
            "to_addresses": to_addresses,
            "attachments": [uploaded_attachment],  # Include the attachment
            "status": EmailStatus.SENT,
            "priority": EmailPriority.NORMAL,
        }
        
        # Create email in database
        email = await EmailDatabase.create_email(email_data, user_id)
        if email:
            print(f"✅ Email created: {email.id}")
            print(f"   - Attachments in created email: {len(email.attachments)}")
            for i, att in enumerate(email.attachments):
                print(f"     {i+1}. {att.filename} (ID: {att.id})")
        else:
            print("❌ Failed to create email")
            return
        
        # Now retrieve the email and check attachments
        print("\n📥 Retrieving email and checking attachments...")
        retrieved_email = await EmailDatabase.get_email_by_id(email.id, user_id)
        if retrieved_email:
            print(f"✅ Email retrieved: {retrieved_email.id}")
            print(f"   - Attachments in retrieved email: {len(retrieved_email.attachments)}")
            if retrieved_email.attachments:
                for i, att in enumerate(retrieved_email.attachments):
                    print(f"     {i+1}. {att.filename} (ID: {att.id})")
                    print(f"        URL: {getattr(att, 'url', 'No URL')}")
                    print(f"        Content Type: {getattr(att, 'content_type', 'No content type')}")
                    print(f"        Size: {getattr(att, 'size', 'No size')}")
            else:
                print("❌ No attachments found in retrieved email")
        else:
            print("❌ Failed to retrieve email")
        
        # Clean up
        print("\n🧹 Cleaning up...")
        await attachment_handler.delete_attachment(uploaded_attachment['id'], user_id)
        print("✅ Test completed")
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Clean up test file
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

if __name__ == "__main__":
    asyncio.run(debug_attachment_issue())
