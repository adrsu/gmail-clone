"""AWS SES Handler for email sending"""
import asyncio
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional, Dict, Any
import logging

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

from shared.config import settings

logger = logging.getLogger(__name__)


class AWSSESHandler:
    """AWS SES handler with both API and SMTP interface support"""
    
    def __init__(self):
        self.settings = settings
        self.ses_client = None
        self.use_api = True  # Default to API, fallback to SMTP if needed
        
        # Initialize SES client
        try:
            self.ses_client = self.settings.get_ses_client()
            logger.info("AWS SES client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize AWS SES client: {e}")
            self.ses_client = None
    
    async def send_email(
        self,
        from_email: str,
        to_emails: List[str],
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        cc_emails: List[str] = None,
        bcc_emails: List[str] = None,
        attachments: List[dict] = None
    ) -> bool:
        """Send email via AWS SES (API or SMTP)"""
        
        # Validate domain
        if not self._validate_sender_domain(from_email):
            logger.error(f"Sender domain not verified: {from_email}")
            return False
        
        # Check if we have attachments - use SMTP for complex emails
        if attachments and len(attachments) > 0:
            logger.info(f"Email has {len(attachments)} attachments, using SMTP interface")
            return await self._send_via_smtp(
                from_email, to_emails, subject, body, html_body, 
                cc_emails, bcc_emails, attachments
            )
        
        # For simple emails, try API first
        if self.use_api and self.ses_client:
            try:
                return await self._send_via_api(
                    from_email, to_emails, subject, body, html_body, 
                    cc_emails, bcc_emails
                )
            except Exception as e:
                logger.warning(f"API sending failed, falling back to SMTP: {e}")
        
        # Fallback to SMTP
        return await self._send_via_smtp(
            from_email, to_emails, subject, body, html_body, 
            cc_emails, bcc_emails, attachments
        )
    
    async def _send_via_api(
        self,
        from_email: str,
        to_emails: List[str],
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        cc_emails: List[str] = None,
        bcc_emails: List[str] = None
    ) -> bool:
        """Send email via AWS SES API"""
        try:
            # Prepare destination
            destination = {'ToAddresses': to_emails}
            if cc_emails:
                destination['CcAddresses'] = cc_emails
            if bcc_emails:
                destination['BccAddresses'] = bcc_emails
            
            # Prepare message body
            message_body = {}
            if body:
                message_body['Text'] = {'Data': body, 'Charset': 'UTF-8'}
            if html_body:
                message_body['Html'] = {'Data': html_body, 'Charset': 'UTF-8'}
            
            # Send email
            response = self.ses_client.send_email(
                Source=from_email,
                Destination=destination,
                Message={
                    'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                    'Body': message_body
                }
            )
            
            message_id = response.get('MessageId')
            logger.info(f"✅ Email sent successfully via AWS SES API. MessageId: {message_id}")
            
            # Log metrics
            all_recipients = to_emails + (cc_emails or []) + (bcc_emails or [])
            logger.info(f"📊 Email sent to {len(all_recipients)} recipients via AWS SES API")
            
            return True
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            logger.error(f"AWS SES API error [{error_code}]: {error_message}")
            
            # Check for quota exceeded
            if error_code in ['Throttling', 'SendingPausedException']:
                logger.warning("AWS SES sending quota exceeded or paused")
            
            return False
            
        except Exception as e:
            logger.error(f"Unexpected error in AWS SES API: {e}")
            return False
    
    async def _send_via_smtp(
        self,
        from_email: str,
        to_emails: List[str],
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        cc_emails: List[str] = None,
        bcc_emails: List[str] = None,
        attachments: List[dict] = None
    ) -> bool:
        """Send email via AWS SES SMTP interface"""
        try:
            smtp_config = self.settings.get_smtp_config()
            
            # Validate SMTP credentials
            if not smtp_config['username'] or not smtp_config['password']:
                logger.error("AWS SES SMTP credentials not configured")
                return False
            
            # Create message with proper MIME structure
            if attachments and len(attachments) > 0:
                msg = MIMEMultipart('mixed')
            else:
                msg = MIMEMultipart('alternative')
            
            msg['From'] = from_email
            msg['To'] = ', '.join(to_emails)
            msg['Subject'] = subject
            
            if cc_emails:
                msg['Cc'] = ', '.join(cc_emails)
            
            # Create body container for text/html content
            if html_body:
                body_container = MIMEMultipart('alternative')
                body_container.attach(MIMEText(body, 'plain'))
                body_container.attach(MIMEText(html_body, 'html'))
                msg.attach(body_container)
            else:
                msg.attach(MIMEText(body, 'plain'))
            
            # Add attachments
            if attachments:
                total_attachment_size = sum(len(att.get('content', b'')) for att in attachments)
                logger.info(f"📎 Adding {len(attachments)} attachments ({total_attachment_size // 1024}KB total)")
                
                for attachment in attachments:
                    try:
                        content_type = attachment.get('content_type', 'application/octet-stream')
                        main_type, sub_type = content_type.split('/', 1) if '/' in content_type else ('application', 'octet-stream')
                        
                        part = MIMEBase(main_type, sub_type)
                        part.set_payload(attachment['content'])
                        encoders.encode_base64(part)
                        
                        part.add_header(
                            'Content-Disposition',
                            f'attachment; filename="{attachment["filename"]}"'
                        )
                        
                        msg.attach(part)
                        
                    except Exception as e:
                        logger.error(f"❌ Error attaching {attachment.get('filename', 'unknown')}: {e}")
                        continue
            
            # Connect to AWS SES SMTP server
            server = smtplib.SMTP(smtp_config['smtp_server'], smtp_config['smtp_port'])
            server.starttls(context=ssl.create_default_context())
            
            # Login with SES SMTP credentials
            server.login(smtp_config['username'], smtp_config['password'])
            
            # Send email
            all_recipients = to_emails + (cc_emails or []) + (bcc_emails or [])
            email_content = msg.as_string()
            
            logger.info(f"📧 Sending email to {len(all_recipients)} recipients via AWS SES SMTP ({len(email_content)} bytes)")
            
            result = server.sendmail(from_email, all_recipients, email_content)
            server.quit()
            
            # Check result
            if isinstance(result, dict) and len(result) == 0:
                logger.info(f"✅ Email sent successfully via AWS SES SMTP to {all_recipients}")
                return True
            else:
                logger.warning(f"Some recipients failed via AWS SES SMTP: {result}")
                return len(result) < len(all_recipients)  # Partial success
                
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"AWS SES SMTP authentication failed: {e}")
            return False
            
        except smtplib.SMTPException as e:
            logger.error(f"AWS SES SMTP error: {e}")
            return False
            
        except Exception as e:
            logger.error(f"Unexpected error in AWS SES SMTP: {e}")
            return False
    
    def _validate_sender_domain(self, from_email: str) -> bool:
        """Validate that sender domain is verified in SES"""
        try:
            domain = from_email.split('@')[1]
            return domain == self.settings.AWS_SES_VERIFIED_DOMAIN
        except Exception:
            return False
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test AWS SES connection and configuration"""
        results = {
            'api_test': False,
            'smtp_test': False,
            'domain_verified': False,
            'quota_info': {},
            'errors': []
        }
        
        # Test API connection
        if self.ses_client:
            try:
                quota_response = self.ses_client.get_send_quota()
                results['api_test'] = True
                results['quota_info'] = {
                    'daily_quota': quota_response.get('Max24HourSend', 0),
                    'daily_sent': quota_response.get('SentLast24Hours', 0),
                    'send_rate': quota_response.get('MaxSendRate', 0)
                }
                
                # Check domain verification
                domain_response = self.ses_client.get_identity_verification_attributes(
                    Identities=[self.settings.AWS_SES_VERIFIED_DOMAIN]
                )
                
                domain_status = domain_response.get('VerificationAttributes', {}).get(
                    self.settings.AWS_SES_VERIFIED_DOMAIN, {}
                ).get('VerificationStatus', 'NotStarted')
                
                results['domain_verified'] = domain_status == 'Success'
                
            except Exception as e:
                results['errors'].append(f"API test failed: {e}")
        
        # Test SMTP connection
        try:
            smtp_config = self.settings.get_smtp_config()
            if smtp_config['username'] and smtp_config['password']:
                server = smtplib.SMTP(smtp_config['smtp_server'], smtp_config['smtp_port'])
                server.starttls(context=ssl.create_default_context())
                server.login(smtp_config['username'], smtp_config['password'])
                server.quit()
                results['smtp_test'] = True
            else:
                results['errors'].append("SMTP credentials not configured")
                
        except Exception as e:
            results['errors'].append(f"SMTP test failed: {e} {smtp_config}")
        
        return results
    
    async def get_sending_statistics(self) -> Dict[str, Any]:
        """Get AWS SES sending statistics"""
        if not self.ses_client:
            return {'error': 'SES client not initialized'}
        
        try:
            # Get quota
            quota = self.ses_client.get_send_quota()
            
            # Get statistics
            stats = self.ses_client.get_send_statistics()
            
            return {
                'quota': quota,
                'statistics': stats.get('SendDataPoints', []),
                'timestamp': stats.get('ResponseMetadata', {}).get('HTTPHeaders', {}).get('date')
            }
            
        except Exception as e:
            logger.error(f"Failed to get SES statistics: {e}")
            return {'error': str(e)}


# Alternative SMTP-only handler for compatibility
class AWSSESSMTPHandler:
    """AWS SES SMTP-only handler for drop-in replacement"""
    
    def __init__(self):
        self.settings = settings
        smtp_config = self.settings.get_smtp_config()
        
        self.smtp_server = smtp_config['smtp_server']
        self.smtp_port = smtp_config['smtp_port']
        self.smtp_username = smtp_config['username']
        self.smtp_password = smtp_config['password']
        self.use_tls = smtp_config['use_tls']
    
    async def send_email(
        self,
        from_email: str,
        to_emails: List[str],
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        cc_emails: List[str] = None,
        bcc_emails: List[str] = None,
        attachments: List[dict] = None
    ) -> bool:
        """Send email via AWS SES SMTP (compatible with existing SMTPHandler interface)"""
        aws_handler = AWSSESHandler()
        return await aws_handler._send_via_smtp(
            from_email, to_emails, subject, body, html_body,
            cc_emails, bcc_emails, attachments
        )
    
    async def test_connection(self) -> bool:
        """Test AWS SES SMTP connection"""
        aws_handler = AWSSESHandler()
        results = await aws_handler.test_connection()
        return results.get('smtp_test', False)
