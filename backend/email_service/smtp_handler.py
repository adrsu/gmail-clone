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
                    if self.use_tls:
                        server = smtplib.SMTP('localhost', settings.smtp_receive_port)
                        server.starttls(context=ssl.create_default_context())
                    else:
                        server = smtplib.SMTP('localhost', settings.smtp_receive_port)
                    
                    # Send email without authentication in development
                    all_recipients = to_emails + (cc_emails or []) + (bcc_emails or [])
                    server.sendmail(from_email, all_recipients, msg.as_string())
                    server.quit()
                    print(f"Development mode: Email sent via local SMTP server to {all_recipients}")
                    return True
                except Exception as local_error:
                    print(f"Local SMTP server not available, falling back to external: {local_error}")
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