#!/usr/bin/env python3
"""
Direct test of SMTP server to verify attachment processing
"""

import smtplib
import tempfile
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import time
import requests

def test_smtp_direct():
    """Test SMTP server directly by sending an email with attachment"""
    print("📧 Testing SMTP Server Directly")
    print("=" * 50)
    
    # Create a test attachment file
    test_content = b"This is a direct SMTP test attachment content."
    test_filename = "direct_smtp_test.txt"
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.txt') as temp_file:
        temp_file.write(test_content)
        temp_file_path = temp_file.name
    
    try:
        # Create email message
        msg = MIMEMultipart()
        msg['From'] = "adarshsahu1077@gmail.com"
        msg['To'] = "adarshtests247@gmail.com"
        msg['Subject'] = "Direct SMTP Test with Attachment"
        
        # Add body
        body = "This is a direct test of the SMTP server with attachment processing."
        msg.attach(MIMEText(body, 'plain'))
        
        # Add attachment
        with open(temp_file_path, "rb") as attachment:
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(attachment.read())
        
        encoders.encode_base64(part)
        part.add_header(
            'Content-Disposition',
            f'attachment; filename= {test_filename}',
        )
        msg.attach(part)
        
        # Connect to SMTP server and send email
        print("\n📤 Connecting to SMTP server...")
        server = smtplib.SMTP('localhost', 2525)  # Using port 2525 as configured
        
        print("📤 Sending email with attachment...")
        text = msg.as_string()
        server.sendmail("adarshsahu1077@gmail.com", ["adarshtests247@gmail.com"], text)
        server.quit()
        
        print("✅ Email sent successfully!")
        
        # Wait a moment for processing
        print("\n⏳ Waiting for email processing...")
        time.sleep(5)
        
        # Check if the email was received and processed
        print("\n📧 Checking received emails...")
        
        # Check for the receiving user (adarshtests247@gmail.com maps to user_id 6e094b1d-3629-4bdc-8187-dac45bc54650)
        response = requests.get(
            "http://localhost:8001/emails?user_id=6e094b1d-3629-4bdc-8187-dac45bc54650&folder=inbox&page=1&limit=5"
        )
        
        if response.status_code == 200:
            emails = response.json().get('emails', [])
            print(f"✅ Found {len(emails)} emails in inbox")
            
            # Look for our test email
            test_email = None
            for email in emails:
                if email['subject'] == "Direct SMTP Test with Attachment":
                    test_email = email
                    break
            
            if test_email:
                print(f"✅ Test email found!")
                print(f"   - Subject: {test_email['subject']}")
                print(f"   - From: {test_email['from_address']}")
                print(f"   - Attachments: {len(test_email.get('attachments', []))}")
                
                if test_email.get('attachments'):
                    for i, att in enumerate(test_email['attachments']):
                        print(f"     {i+1}. {att['filename']} ({att['size']} bytes)")
                        print(f"        - Content Type: {att['content_type']}")
                        print(f"        - ID: {att['id']}")
                    print("\n🎉 SUCCESS: Attachments are being processed correctly!")
                else:
                    print("\n❌ ISSUE: No attachments found in the received email")
            else:
                print("\n❌ Test email not found in received emails")
                print("Recent emails:")
                for email in emails[:3]:
                    print(f"   - {email['subject']} (attachments: {len(email.get('attachments', []))})")
        else:
            print(f"❌ Failed to check emails: {response.status_code}")
        
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
    test_smtp_direct()
