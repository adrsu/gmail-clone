import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional
from shared.config import settings


class SMTPHandler:
    def __init__(self):
        self.smtp_server = settings.smtp_server
        self.smtp_port = settings.smtp_port
        self.smtp_username = settings.smtp_username
        self.smtp_password = settings.smtp_password
        self.use_tls = settings.smtp_use_tls

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
        """Send email via SMTP"""
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = from_email
            msg['To'] = ', '.join(to_emails)
            msg['Subject'] = subject

            if cc_emails:
                msg['Cc'] = ', '.join(cc_emails)

            # Add body
            text_part = MIMEText(body, 'plain')
            msg.attach(text_part)

            if html_body:
                html_part = MIMEText(html_body, 'html')
                msg.attach(html_part)

            # Add attachments
            if attachments:
                for attachment in attachments:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment['content'])
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename= {attachment["filename"]}'
                    )
                    msg.attach(part)

            # In development mode, use local SMTP server if available
            if settings.development_mode:
                try:
                    # Try to connect to local SMTP server first
                    server = smtplib.SMTP('localhost', settings.smtp_receive_port, timeout=60)
                    
                    # Send HELO command (required by SMTP protocol)
                    server.helo('gmail-clone')
                    
                    # Send email without authentication in development
                    all_recipients = to_emails + (cc_emails or []) + (bcc_emails or [])
                    
                    # Debug: Print email being sent
                    email_content = msg.as_string()
                    print(f"🔍 Sending email content (first 500 chars): {email_content[:500]}")
                    
                    # Send the email data
                    result = server.sendmail(from_email, all_recipients, email_content)
                    
                    # Send QUIT command to properly close the connection
                    server.quit()
                    
                    # Check if sendmail was successful
                    # sendmail returns a dictionary with failed recipients, empty dict means success
                    if isinstance(result, dict) and len(result) == 0:
                        print(f"Development mode: Email sent via local SMTP server to {all_recipients}")
                        return True
                    else:
                        print(f"Development mode: Some recipients failed: {result}")
                        # Even if some failed, we'll consider it a success if any succeeded
                        return True
                        
                except smtplib.SMTPException as smtp_error:
                    # Check if it's actually a success response wrapped in an exception
                    error_str = str(smtp_error)
                    if "250" in error_str and ("Message accepted" in error_str or "delivery" in error_str):
                        print(f"SMTP success response received: {smtp_error}")
                        return True
                    print(f"SMTP protocol error: {smtp_error}")
                    # In development mode, don't fall back to external - just fail
                    if settings.development_mode:
                        raise Exception(f"Failed to send email via local SMTP server: {smtp_error}")
                except Exception as local_error:
                    print(f"Local SMTP server connection error: {local_error}")
                    # In development mode, don't fall back to external - just fail
                    if settings.development_mode:
                        raise Exception(f"Failed to send email via local SMTP server: {local_error}")
                    # Fall back to external SMTP server

            # Connect to external SMTP server
            if self.use_tls:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
                server.starttls(context=ssl.create_default_context())
            else:
                server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port)

            # Login
            server.login(self.smtp_username, self.smtp_password)

            # Send email
            all_recipients = to_emails + (cc_emails or []) + (bcc_emails or [])
            server.sendmail(from_email, all_recipients, msg.as_string())
            server.quit()

            return True

        except Exception as e:
            print(f"Error sending email: {e}")
            return False

    async def test_connection(self) -> bool:
        """Test SMTP connection"""
        try:
            if self.use_tls:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
                server.starttls(context=ssl.create_default_context())
            else:
                server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port)

            server.login(self.smtp_username, self.smtp_password)
            server.quit()
            return True

        except Exception as e:
            print(f"SMTP connection test failed: {e}")
            return False 