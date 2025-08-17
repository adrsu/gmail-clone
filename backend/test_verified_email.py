#!/usr/bin/env python3
"""
Quick test script for sending to verified emails in sandbox mode
"""

import asyncio
import sys
import os

# Add the backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from email_service.aws_ses_handler import AWSSESHandler
from shared.aws_config import aws_config

async def test_verified_email():
    """Test sending to verified email"""
    
    # Get email address to test
    test_email = input("Enter a verified email address to test: ").strip()
    if not test_email:
        print("No email provided, exiting...")
        return
    
    print(f"Testing email send to: {test_email}")
    print(f"From domain: {aws_config.verified_domain}")
    print()
    
    try:
        # Create handler
        handler = AWSSESHandler()
        
        # Send test email
        success = await handler.send_email(
            from_email=f"test@{aws_config.verified_domain}",
            to_emails=[test_email],
            subject="Test Email from Gmail Clone (Sandbox Mode)",
            body=f"""
Hello!

This is a test email from your Gmail Clone application running in AWS SES Sandbox mode.

Details:
- From: test@{aws_config.verified_domain}
- To: {test_email}
- Region: {aws_config.region_name}
- Sent via: AWS SES API

If you receive this email, your AWS SES integration is working correctly!

Note: This email was sent in sandbox mode, which means it can only be sent to verified email addresses.

Next steps:
1. Request production access in AWS SES console
2. Once approved, you can send to any email address
3. Your Gmail clone will be fully functional for external emails

Best regards,
Your Gmail Clone Application
            """,
            html_body=f"""
<html>
<body>
    <h2>🎉 Test Email from Gmail Clone</h2>
    <p>This is a test email from your Gmail Clone application running in <strong>AWS SES Sandbox mode</strong>.</p>
    
    <h3>📧 Email Details:</h3>
    <ul>
        <li><strong>From:</strong> test@{aws_config.verified_domain}</li>
        <li><strong>To:</strong> {test_email}</li>
        <li><strong>Region:</strong> {aws_config.region_name}</li>
        <li><strong>Sent via:</strong> AWS SES API</li>
    </ul>
    
    <h3>✅ Success!</h3>
    <p>If you receive this email, your AWS SES integration is working correctly!</p>
    
    <h3>📝 Note:</h3>
    <p>This email was sent in <em>sandbox mode</em>, which means it can only be sent to verified email addresses.</p>
    
    <h3>🚀 Next Steps:</h3>
    <ol>
        <li>Request production access in AWS SES console</li>
        <li>Once approved, you can send to any email address</li>
        <li>Your Gmail clone will be fully functional for external emails</li>
    </ol>
    
    <p>Best regards,<br>
    <strong>Your Gmail Clone Application</strong></p>
</body>
</html>
            """
        )
        
        if success:
            print(f"✅ Test email sent successfully to {test_email}")
            print("📬 Check your inbox (and spam folder) for the test email")
            print()
            print("If you received the email, your AWS SES integration is working!")
        else:
            print(f"❌ Failed to send test email to {test_email}")
            print("Check the error logs above for details")
            
    except Exception as e:
        print(f"❌ Error sending test email: {e}")
        print()
        print("Common issues in sandbox mode:")
        print("1. Email address not verified in AWS SES console")
        print("2. AWS credentials not configured correctly")
        print("3. Domain not verified in AWS SES")

if __name__ == "__main__":
    asyncio.run(test_verified_email())
