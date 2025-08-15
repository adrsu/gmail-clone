#!/usr/bin/env python3
"""
Create a test email with attachment for frontend testing
"""

import asyncio
import os
import tempfile
import requests
import json
from pathlib import Path

async def create_test_email_with_attachment():
    """Create a test email with attachment"""
    print("📧 Creating Test Email with Attachment")
    print("=" * 50)
    
    # Use the same user ID from the debug info
    user_id = "d75bbc95-08d7-4805-880c-24a6b6078636"
    
    # Create a test file
    test_content = b"This is a test file content for frontend testing."
    test_filename = "test_frontend_attachment.txt"
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.txt') as temp_file:
        temp_file.write(test_content)
        temp_file_path = temp_file.name
    
    try:
        # Step 1: Upload attachment
        print("📤 Step 1: Uploading attachment...")
        with open(temp_file_path, 'rb') as f:
            files = {'file': (test_filename, f, 'text/plain')}
            response = requests.post(
                f"http://localhost:8001/attachments/upload?user_id={user_id}",
                files=files
            )
        
        if response.status_code != 200:
            print(f"❌ Failed to upload attachment: {response.status_code}")
            print(f"Response: {response.text}")
            return
        
        attachment_data = response.json()
        print(f"✅ Attachment uploaded: {attachment_data['id']}")
        
        # Step 2: Create email with attachment
        print("\n📧 Step 2: Creating email with attachment...")
        email_data = {
            "subject": "Test Email with Attachment - Frontend Test",
            "body": "This is a test email with an attachment to verify frontend display.",
            "to_addresses": ["test@example.com"],
            "cc_addresses": [],
            "bcc_addresses": [],
            "attachment_ids": [attachment_data['id']],
            "priority": "normal",
            "save_as_draft": False
        }
        
        response = requests.post(
            f"http://localhost:8001/emails/compose?user_id={user_id}",
            json=email_data,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code != 200:
            print(f"❌ Failed to create email: {response.status_code}")
            print(f"Response: {response.text}")
            return
        
        email_response = response.json()
        print(f"✅ Email created: {email_response['id']}")
        print(f"   - Subject: {email_response['subject']}")
        print(f"   - Attachments: {len(email_response.get('attachments', []))}")
        
        # Step 3: Verify email can be retrieved
        print("\n📥 Step 3: Verifying email retrieval...")
        response = requests.get(
            f"http://localhost:8001/emails?user_id={user_id}&folder=sent&page=1&limit=10"
        )
        
        if response.status_code == 200:
            emails_data = response.json()
            print(f"✅ Retrieved {len(emails_data.get('emails', []))} emails from sent folder")
            
            # Look for our test email
            test_email = None
            for email in emails_data.get('emails', []):
                if email.get('subject') == "Test Email with Attachment - Frontend Test":
                    test_email = email
                    break
            
            if test_email:
                print(f"✅ Found test email: {test_email['id']}")
                print(f"   - Attachments: {len(test_email.get('attachments', []))}")
                if test_email.get('attachments'):
                    for i, att in enumerate(test_email['attachments']):
                        print(f"     {i+1}. {att.get('filename')} (ID: {att.get('id')})")
                        print(f"        URL: {att.get('url')}")
                else:
                    print("   ❌ No attachments found in retrieved email")
            else:
                print("❌ Test email not found in sent folder")
        else:
            print(f"❌ Failed to retrieve emails: {response.status_code}")
            print(f"Response: {response.text}")
        
        print("\n🎉 Test completed! Check the frontend to see if the attachment appears.")
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Clean up test file
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

if __name__ == "__main__":
    asyncio.run(create_test_email_with_attachment())
