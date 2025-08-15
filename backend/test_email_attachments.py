#!/usr/bin/env python3
"""
Test script to check if emails with attachments are being returned correctly
"""

import asyncio
import os
import tempfile
from pathlib import Path
from email_service.attachment_handler import attachment_handler
from email_service.database import EmailDatabase
from email_service.models import EmailStatus, EmailPriority, EmailAddress
from shared.config import settings

async def test_email_with_attachments():
    """Test creating and retrieving an email with attachments"""
    print("🧪 Testing Email with Attachments")
    print("=" * 50)
    
    # Create a test file
    test_content = b"This is a test file content for email attachment testing."
    test_filename = "test_email_attachment.txt"
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.txt') as temp_file:
        temp_file.write(test_content)
        temp_file_path = temp_file.name
    
    try:
        # Test file upload
        print("📤 Testing file upload...")
        
        # Create a dummy user ID for testing (must be a valid UUID)
        user_id = "123e4567-e89b-12d3-a456-426614174000"
        
        # Create a mock UploadFile
        class MockUploadFile:
            def __init__(self, file_path, filename):
                self.file_path = file_path
                self.filename = filename
                self.content_type = "text/plain"
            
            async def read(self):
                with open(self.file_path, 'rb') as f:
                    return f.read()
        
        mock_file = MockUploadFile(temp_file_path, test_filename)
        
        # Upload attachment
        attachment = await attachment_handler.save_attachment(mock_file, user_id)
        print(f"✅ File uploaded successfully: {attachment['filename']}")
        print(f"   - ID: {attachment['id']}")
        print(f"   - URL: {attachment['url']}")
        
        # Create an email with the attachment
        print("\n📧 Creating email with attachment...")
        
        email_data = {
            "subject": "Test Email with Attachment",
            "body": "This is a test email with an attachment.",
            "from_address": EmailAddress(email=f"{user_id}@example.com", name=user_id),
            "to_addresses": [EmailAddress(email="recipient@example.com", name="Recipient")],
            "cc_addresses": [],
            "bcc_addresses": [],
            "attachments": [attachment],  # Include the attachment
            "status": EmailStatus.SENT,
            "priority": EmailPriority.NORMAL,
            "sent_at": None
        }
        
        # Create the email
        email = await EmailDatabase.create_email(email_data, user_id)
        print(f"✅ Email created successfully: {email.id}")
        print(f"   - Subject: {email.subject}")
        print(f"   - Attachments: {len(email.attachments)}")
        
        # Retrieve the email
        print("\n📥 Retrieving email...")
        retrieved_email = await EmailDatabase.get_email_by_id(email.id, user_id)
        
        if retrieved_email:
            print(f"✅ Email retrieved successfully: {retrieved_email.id}")
            print(f"   - Subject: {retrieved_email.subject}")
            print(f"   - Attachments: {len(retrieved_email.attachments)}")
            
            if retrieved_email.attachments:
                for i, att in enumerate(retrieved_email.attachments):
                    print(f"   - Attachment {i+1}: {att.get('filename', 'Unknown')}")
                    print(f"     ID: {att.get('id', 'Unknown')}")
                    print(f"     URL: {att.get('url', 'Unknown')}")
                    print(f"     Size: {att.get('size', 'Unknown')} bytes")
            else:
                print("❌ No attachments found in retrieved email")
        else:
            print("❌ Failed to retrieve email")
        
        # Clean up
        print("\n🗑️  Cleaning up...")
        await attachment_handler.delete_attachment(attachment['id'], user_id)
        print("✅ Test completed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Clean up test file
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

if __name__ == "__main__":
    print("🚀 Starting Email with Attachments Test")
    print("=" * 60)
    
    # Test email with attachments
    asyncio.run(test_email_with_attachments())
    
    print("\n✨ All tests completed!")
