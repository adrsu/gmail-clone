#!/usr/bin/env python3
"""
Test script to verify SMTP server fixes for received emails
"""

import asyncio
import os
import tempfile
import requests
import json
from pathlib import Path

async def test_smtp_fixes():
    """Test that received emails have proper names and attachments"""
    print("📧 Testing SMTP Server Fixes")
    print("=" * 50)
    
    # Use the same user ID from the debug info
    user_id = "d75bbc95-08d7-4805-880c-24a6b6078636"
    
    # Create a test file for attachment
    test_content = b"This is a test attachment content for SMTP testing."
    test_filename = "smtp_test_attachment.txt"
    
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
        
        # Step 2: Create an email with attachment (simulating received email)
        print("\n📧 Step 2: Creating email with attachment...")
        email_data = {
            "subject": "Test SMTP Email with Attachment",
            "body": "This is a test email with an attachment to verify SMTP fixes.",
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
            print(f"✅ Email created: {email_response['id']}")
            print(f"   - Subject: {email_response['subject']}")
            print(f"   - From: {email_response['from_address']['name']} <{email_response['from_address']['email']}>")
            print(f"   - To: {email_response['to_addresses'][0]['name']} <{email_response['to_addresses'][0]['email']}>")
            print(f"   - Attachments: {len(email_response['attachments'])}")
            
            if email_response['attachments']:
                for i, att in enumerate(email_response['attachments']):
                    print(f"     {i+1}. {att['filename']} (ID: {att['id']})")
                    print(f"        URL: {att['url']}")
                    print(f"        Content Type: {att['content_type']}")
                    print(f"        Size: {att['size']}")
                    
                    # Test the presigned URL
                    print(f"        Testing presigned URL access...")
                    try:
                        url_response = requests.head(att['url'], timeout=5)
                        if url_response.status_code == 200:
                            print(f"        ✅ Presigned URL accessible")
                            print(f"        - Content-Type: {url_response.headers.get('content-type')}")
                            print(f"        - Content-Length: {url_response.headers.get('content-length')}")
                        else:
                            print(f"        ⚠️ Presigned URL returned status: {url_response.status_code}")
                    except Exception as e:
                        print(f"        ❌ Presigned URL access failed: {e}")
        else:
            print(f"❌ Failed to create email: {response.status_code}")
            print(f"   Response: {response.text}")
            return
        
        # Step 3: Retrieve the email to verify it's properly stored
        print("\n📧 Step 3: Retrieving email to verify storage...")
        response = requests.get(
            f"http://localhost:8001/emails?user_id={user_id}&folder=sent&page=1&limit=10"
        )
        
        if response.status_code == 200:
            emails_data = response.json()
            emails = emails_data.get('emails', [])
            
            # Find our test email
            test_email = None
            for email in emails:
                if email['subject'] == "Test SMTP Email with Attachment":
                    test_email = email
                    break
            
            if test_email:
                print(f"✅ Email retrieved: {test_email['id']}")
                print(f"   - From: {test_email['from_address']['name']} <{test_email['from_address']['email']}>")
                print(f"   - To: {test_email['to_addresses'][0]['name']} <{test_email['to_addresses'][0]['email']}>")
                print(f"   - Attachments: {len(test_email['attachments'])}")
                
                if test_email['attachments']:
                    for i, att in enumerate(test_email['attachments']):
                        print(f"     {i+1}. {att['filename']} (ID: {att['id']})")
                        print(f"        URL: {att['url']}")
                        print(f"        Content Type: {att['content_type']}")
                        print(f"        Size: {att['size']}")
                else:
                    print("   ❌ No attachments found in retrieved email")
            else:
                print("❌ Test email not found in retrieved emails")
        else:
            print(f"❌ Failed to retrieve emails: {response.status_code}")
        
        print("\n🎉 Test completed!")
        
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
    asyncio.run(test_smtp_fixes())
