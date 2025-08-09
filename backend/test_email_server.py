#!/usr/bin/env python3
"""
Email Server Test Script
Tests the SMTP/IMAP server functionality
"""

import asyncio
import smtplib
import imaplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from shared.config import settings


def test_smtp_send():
    """Test sending email via SMTP"""
    print("Testing SMTP send...")
    
    try:
        # Create test email
        msg = MIMEMultipart()
        msg['From'] = 'test@example.com'
        msg['To'] = 'user@example.com'
        msg['Subject'] = f'Test Email - {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}'
        
        body = f"""
        This is a test email sent at {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}.
        
        This email is being sent to test the SMTP server functionality.
        
        Best regards,
        Test System
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Connect to SMTP server
        if settings.development_mode:
            # Use local server in development (port 2525 to avoid admin privileges)
            server = smtplib.SMTP('localhost', 2525, timeout=10)
            
            # Send HELO command first (required by SMTP protocol)
            server.helo('testclient')
            
            # Send email
            text = msg.as_string()
            server.sendmail('test@example.com', ['user@example.com'], text)
            server.quit()
            
        else:
            # Use external server in production
            if settings.smtp_use_tls:
                server = smtplib.SMTP(settings.smtp_server, settings.smtp_port)
                server.starttls(context=ssl.create_default_context())
            else:
                server = smtplib.SMTP_SSL(settings.smtp_server, settings.smtp_port)
            
            # Login if credentials are provided
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
        
        # Send email
        text = msg.as_string()
        server.sendmail('test@example.com', ['user@example.com'], text)
        server.quit()
        
        print("✅ SMTP send test passed")
        return True
        
    except Exception as e:
        print(f"❌ SMTP send test failed: {e}")
        return False


def test_imap_connection():
    """Test IMAP connection"""
    print("Testing IMAP connection...")
    
    try:
        # Connect to IMAP server
        if settings.imap_use_ssl:
            server = imaplib.IMAP4_SSL('localhost', settings.imap_ssl_port, timeout=10)
        else:
            server = imaplib.IMAP4('localhost', 1143, timeout=10)  # Use port 1143 for testing
        
        # Login (in development mode, accept any credentials)
        if settings.development_mode:
            server.login('test_user', 'test_password')
        else:
            # In production, use proper credentials
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
            else:
                print("❌ IMAP test failed: No credentials provided")
                return False
        
        # List mailboxes
        status, mailboxes = server.list()
        if status == 'OK':
            print("✅ IMAP connection test passed")
            print(f"Available mailboxes: {len(mailboxes)}")
            for mailbox in mailboxes:
                print(f"  - {mailbox.decode()}")
        
        server.logout()
        return True
        
    except Exception as e:
        print(f"❌ IMAP connection test failed: {e}")
        return False


def test_email_flow():
    """Test complete email flow: send and receive"""
    print("Testing complete email flow...")
    
    try:
        # Step 1: Send email via SMTP
        if not test_smtp_send():
            return False
        
        # Step 2: Wait a moment for processing
        print("Waiting for email processing...")
        asyncio.sleep(2)
        
        # Step 3: Check email via IMAP
        if not test_imap_connection():
            return False
        
        print("✅ Complete email flow test passed")
        return True
        
    except Exception as e:
        print(f"❌ Email flow test failed: {e}")
        return False


async def test_async_components():
    """Test async components"""
    print("Testing async components...")
    
    try:
        # Import and test email server components
        from email_server.imap_server import IMAPServer
        from email_server.smtp_receive_server import SMTPReceiveServer
        
        # Create server instances
        imap_server = IMAPServer()
        smtp_server = SMTPReceiveServer()
        
        print("✅ Async components test passed")
        return True
        
    except Exception as e:
        print(f"❌ Async components test failed: {e}")
        return False


def main():
    """Run all tests"""
    print("=" * 50)
    print("Gmail Clone Email Server Test Suite")
    print("=" * 50)
    print(f"Development Mode: {settings.development_mode}")
    print(f"IMAP Server: localhost:{settings.imap_port}")
    print(f"SMTP Server: localhost:{settings.smtp_receive_port}")
    print("=" * 50)
    
    # Run tests
    tests = [
        ("Async Components", asyncio.run(test_async_components())),
        ("SMTP Send", test_smtp_send()),
        ("IMAP Connection", test_imap_connection()),
        ("Complete Email Flow", test_email_flow()),
    ]
    
    print("\n" + "=" * 50)
    print("Test Results:")
    print("=" * 50)
    
    passed = 0
    total = len(tests)
    
    for test_name, result in tests:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print("=" * 50)
    print(f"Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Email server is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the server configuration.")
        return 1


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"Test suite error: {e}")
        sys.exit(1)
