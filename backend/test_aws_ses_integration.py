#!/usr/bin/env python3
"""
Test script for AWS SES integration
Run this script to test your AWS SES configuration
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from shared.config import settings
from email_service.aws_ses_handler import AWSSESHandler, AWSSESSMTPHandler


async def test_aws_configuration():
    """Test AWS SES configuration"""
    print("🔧 Testing AWS SES Configuration...")
    print(f"   Region: {settings.AWS_REGION}")
    print(f"   Domain: {settings.AWS_SES_VERIFIED_DOMAIN}")
    print(f"   Production Mode: {settings.PRODUCTION_MODE}")
    print(f"   AWS SES Enabled: {settings.ENABLE_AWS_SES}")
    print()
    
    # Test basic configuration
    config_status = settings.verify_ses_configuration()
    
    if config_status['status'] == 'success':
        print("✅ AWS SES Configuration Valid")
        print(f"   Domain Verified: {config_status['domain_verified']}")
        print(f"   Daily Quota: {config_status['daily_quota']}")
        print(f"   Daily Sent: {config_status['daily_sent']}")
        print(f"   Send Rate: {config_status['send_rate']} emails/second")
        print(f"   Production Ready: {settings.is_production_ready()}")
    else:
        print("❌ AWS SES Configuration Error")
        print(f"   Error: {config_status.get('error', 'Unknown error')}")
        return False
    
    print()
    return True


async def test_aws_ses_api():
    """Test AWS SES API handler"""
    print("🧪 Testing AWS SES API Handler...")
    
    try:
        handler = AWSSESHandler()
        
        # Test connection
        test_results = await handler.test_connection()
        
        if test_results['api_test']:
            print("✅ AWS SES API Connection: Success")
            print(f"   Domain Verified: {test_results['domain_verified']}")
            print(f"   Daily Quota: {test_results['quota_info'].get('daily_quota', 0)}")
        else:
            print("❌ AWS SES API Connection: Failed")
            
        if test_results['smtp_test']:
            print("✅ AWS SES SMTP Connection: Success")
        else:
            print("❌ AWS SES SMTP Connection: Failed")
        
        if test_results['errors']:
            print("⚠️  Errors:")
            for error in test_results['errors']:
                print(f"   - {error}")
        
        print()
        return test_results['api_test'] or test_results['smtp_test']
        
    except Exception as e:
        print(f"❌ AWS SES API Handler Error: {e}")
        return False


async def test_aws_ses_smtp():
    """Test AWS SES SMTP handler"""
    print("🧪 Testing AWS SES SMTP Handler...")
    
    try:
        handler = AWSSESSMTPHandler()
        
        # Test connection
        connection_test = await handler.test_connection()
        
        if connection_test:
            print("✅ AWS SES SMTP Handler: Success")
        else:
            print("❌ AWS SES SMTP Handler: Failed")
            
        print()
        return connection_test
        
    except Exception as e:
        print(f"❌ AWS SES SMTP Handler Error: {e}")
        return False


async def send_test_email():
    """Send a test email"""
    test_email = input("Enter your email address to send a test email (or press Enter to skip): ").strip()
    
    if not test_email:
        print("⏭️  Skipping test email")
        return True
    
    print(f"📧 Sending test email to {test_email}...")
    
    try:
        # Use the appropriate handler
        if settings.PRODUCTION_MODE:
            handler = AWSSESHandler()
            handler_name = "AWS SES API"
        else:
            handler = AWSSESSMTPHandler()
            handler_name = "AWS SES SMTP"
        
        # Test email content
        subject = f"Test Email from 27send - {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"
        body = f"""
        This is a test email from your 27send application.
        
        Handler: {handler_name}
        Domain: {settings.AWS_SES_VERIFIED_DOMAIN}
        Region: {settings.AWS_REGION}
        Sent At: {datetime.utcnow().isoformat()}
        
        If you receive this email, your AWS SES integration is working correctly!
        
        Next steps:
        1. Request production access in AWS SES console (if not already done)
        2. Update your environment variables for production
        3. Deploy your application
        """
        
        # Send test email
        success = await handler.send_email(
            from_email=f"test@{settings.AWS_SES_VERIFIED_DOMAIN}",
            to_emails=[test_email],
            subject=subject,
            body=body
        )
        
        if success:
            print(f"✅ Test email sent successfully to {test_email}")
            print(f"   Check your inbox (and spam folder) for the test email")
        else:
            print(f"❌ Test email failed to send to {test_email}")
            
        print()
        return success
        
    except Exception as e:
        print(f"❌ Test email error: {e}")
        return False


async def main():
    """Main test function"""
    print("=" * 60)
    print("🎯 AWS SES Integration Test")
    print("=" * 60)
    print()
    
    # Check if AWS SES is enabled
    if not settings.ENABLE_AWS_SES:
        print("⚠️  AWS SES is not enabled!")
        print("   Set ENABLE_AWS_SES=true in your .env file to enable AWS SES")
        print()
        return
    
    # Test configuration
    config_ok = await test_aws_configuration()
    if not config_ok:
        print("⚠️  Configuration test failed. Please check your AWS credentials and SES setup.")
        return
    
    # Test handlers
    api_ok = await test_aws_ses_api()
    smtp_ok = await test_aws_ses_smtp()
    
    if not (api_ok or smtp_ok):
        print("⚠️  Both API and SMTP tests failed. Please check your AWS SES configuration.")
        return
    
    # Send test email
    await send_test_email()
    
    # Summary
    print("=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    print(f"✅ Configuration: {'OK' if config_ok else 'FAILED'}")
    print(f"✅ API Handler: {'OK' if api_ok else 'FAILED'}")
    print(f"✅ SMTP Handler: {'OK' if smtp_ok else 'FAILED'}")
    print(f"✅ Production Ready: {'YES' if settings.is_production_ready() else 'NO'}")
    print()
    
    if settings.is_production_ready():
        print("🎉 Your AWS SES integration is ready for production!")
        print("   You can now send emails to any external email address.")
    else:
        print("⚠️  AWS SES is in sandbox mode.")
        print("   You can only send emails to verified email addresses.")
        print("   Request production access in the AWS SES console to send to any email.")
    
    print()
    print("🚀 Next steps:")
    print("   1. Start your email service: python -m email_service.main")
    print("   2. Test endpoints: http://localhost:8001/aws-ses/status")
    print("   3. Send emails through your 27send interface")


if __name__ == "__main__":
    asyncio.run(main())
