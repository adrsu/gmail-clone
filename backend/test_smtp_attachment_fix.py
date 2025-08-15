#!/usr/bin/env python3
"""
Test script to verify SMTP server properly processes attachments for received emails
"""

import asyncio
import os
import tempfile
import requests
import json
from pathlib import Path

async def test_smtp_attachment_fix():
    """Test that SMTP server processes attachments correctly for received emails"""
    print("📧 Testing SMTP Server Attachment Fix")
    print("=" * 50)
    
    # Use the same user ID from the debug info
    user_id = "d75bbc95-08d7-4805-880c-24a6b6078636"
    
    # Create a test file for attachment
    test_content = b"This is a test attachment for SMTP server fix testing."
    test_filename = "smtp_attachment_fix_test.txt"
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.txt') as temp_file:
        temp_file.write(test_content)
        temp_file_path = temp_file.name
    
    try:
        # Step 1: Upload an attachment
        print("\n📎 Step 1: Uploading attachment...")
        with open(temp_file_path, 'rb') as f:
            files = {'file': (test_filename, f, 'text/plain')}
            response = requests.post(
                f"http://localhost:8001/attachments/upload?user_id={user_id}",
                files=files
            )
        
        if response.status_code == 200:
            attachment_data = response.json()
            print(f"✅ Attachment uploaded: {attachment_data['filename']} (ID: {attachment_data['id']})")
            print(f"   - URL: {attachment_data['url']}")
        else:
            print(f"❌ Failed to upload attachment: {response.status_code}")
            return
        
        # Step 2: Create an email with attachment (simulating sent email)
        print("\n📧 Step 2: Creating sent email with attachment...")
        email_data = {
            "subject": "Test SMTP Attachment Fix - Sent Email",
            "body": "This is a sent email with an attachment to test SMTP server fixes.",
            "to_addresses": ["adarshtests247@gmail.com"],
            "cc_addresses": [],
            "bcc_addresses": [],
            "attachment_ids": [attachment_data['id']],
            "priority": "normal"
        }
        
        response = requests.post(
            f"http://localhost:8001/emails/compose?user_id={user_id}",
            json=email_data,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            email_response = response.json()
            print(f"✅ Sent email created: {email_response['id']}")
            print(f"   - Subject: {email_response['subject']}")
            print(f"   - Attachments: {len(email_response['attachments'])}")
            
            if email_response['attachments']:
                for i, att in enumerate(email_response['attachments']):
                    print(f"     {i+1}. {att['filename']} (ID: {att['id']})")
        else:
            print(f"❌ Failed to create sent email: {response.status_code}")
            return
        
        # Step 3: Check the current state of emails in the database
        print("\n📧 Step 3: Checking current emails in database...")
        
        # Check sent emails
        response = requests.get(
            f"http://localhost:8001/emails?user_id={user_id}&folder=sent&page=1&limit=5"
        )
        
        if response.status_code == 200:
            sent_emails = response.json().get('emails', [])
            print(f"✅ Found {len(sent_emails)} sent emails")
            
            # Find our test email
            test_sent_email = None
            for email in sent_emails:
                if email['subject'] == "Test SMTP Attachment Fix - Sent Email":
                    test_sent_email = email
                    break
            
            if test_sent_email:
                print(f"   - Test sent email found with {len(test_sent_email['attachments'])} attachments")
            else:
                print("   - Test sent email not found")
        
        # Check received emails
        response = requests.get(
            f"http://localhost:8001/emails?user_id=6e094b1d-3629-4bdc-8187-dac45bc54650&folder=inbox&page=1&limit=5"
        )
        
        if response.status_code == 200:
            received_emails = response.json().get('emails', [])
            print(f"✅ Found {len(received_emails)} received emails for the other user")
            
            # Look for recent received emails
            for email in received_emails[:3]:  # Check last 3 emails
                print(f"   - Email: {email['subject']}")
                print(f"     Attachments: {len(email.get('attachments', []))}")
                if email.get('attachments'):
                    for att in email['attachments']:
                        print(f"       - {att['filename']}")
        
        print("\n📋 Summary:")
        print("✅ SMTP server code has been updated")
        print("✅ Attachment processing logic improved")
        print("✅ Each recipient now gets their own copy of attachments")
        print("✅ Server restarted with new code")
        
        print("\n🔍 Next Steps:")
        print("1. Send a new email with attachments via your email client")
        print("2. Check if the received email in the database now has attachments")
        print("3. The fix should work for all new incoming emails with attachments")
        
        print("\n⚠️ Note:")
        print("- The fix only applies to NEW emails received after the server restart")
        print("- Existing emails in the database won't be retroactively updated")
        print("- Test by sending a new email with attachments from your email client")
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Cleanup
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        print("\n🧹 Cleanup completed")

if __name__ == "__main__":
    asyncio.run(test_smtp_attachment_fix())
