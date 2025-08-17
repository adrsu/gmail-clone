from pydantic_settings import BaseSettings
from typing import Optional, Dict, Any
from dotenv import load_dotenv
import os
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import logging

load_dotenv()

class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: Optional[str] = os.getenv('SUPABASE_URL')
    SUPABASE_KEY: Optional[str] = os.getenv('SUPABASE_KEY')
    SUPABASE_SERVICE_KEY: Optional[str] = os.getenv('SUPABASE_SERVICE_KEY')
    
    # Redis
    REDIS_URL: Optional[str] = os.getenv('REDIS_URL', 'redis://localhost:6379')
    
    # JWT
    SECRET_KEY: Optional[str] = os.getenv('SECRET_KEY')
    ALGORITHM: str = os.getenv('ALGORITHM', 'HS256')
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Email
    smtp_server: Optional[str] = os.getenv('SMTP_HOST', 'localhost')
    smtp_port: Optional[int] = int(os.getenv('SMTP_PORT', '587'))
    smtp_username: Optional[str] = os.getenv('SMTP_USERNAME')
    smtp_password: Optional[str] = os.getenv('SMTP_PASSWORD')
    smtp_use_tls: bool = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
    development_mode: bool = os.getenv('DEVELOPMENT_MODE', 'true').lower() == 'true'

    # IMAP Server
    imap_host: str = os.getenv('IMAP_HOST', '0.0.0.0')
    imap_port: int = int(os.getenv('IMAP_PORT', '1143'))
    imap_use_ssl: bool = os.getenv('IMAP_USE_SSL', 'false').lower() == 'true'
    imap_ssl_port: int = int(os.getenv('IMAP_SSL_PORT', '993'))

    # SMTP Server (for receiving emails)
    smtp_receive_host: str = os.getenv('SMTP_RECEIVE_HOST', '0.0.0.0')
    smtp_receive_port: int = int(os.getenv('SMTP_RECEIVE_PORT', '2525'))
    smtp_receive_use_ssl: bool = os.getenv('SMTP_RECEIVE_USE_SSL', 'false').lower() == 'true'
    smtp_receive_ssl_port: int = int(os.getenv('SMTP_RECEIVE_SSL_PORT', '465'))
    
    # AWS Configuration
    AWS_ACCESS_KEY_ID: Optional[str] = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY: Optional[str] = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_REGION: Optional[str] = os.getenv('AWS_REGION')
    
    # AWS S3
    S3_BUCKET: Optional[str] = os.getenv('S3_BUCKET')
    
    # AWS SES Configuration
    AWS_SES_VERIFIED_DOMAIN: Optional[str] = os.getenv('AWS_SES_VERIFIED_DOMAIN')
    AWS_SES_SMTP_SERVER: Optional[str] = os.getenv('AWS_SES_SMTP_SERVER')
    AWS_SES_SMTP_PORT: int = int(os.getenv('AWS_SES_SMTP_PORT'))
    AWS_SES_SMTP_USERNAME: Optional[str] = os.getenv('AWS_SES_SMTP_USERNAME')
    AWS_SES_SMTP_PASSWORD: Optional[str] = os.getenv('AWS_SES_SMTP_PASSWORD')
    
    # Production settings
    PRODUCTION_MODE: bool = os.getenv('PRODUCTION_MODE', 'false').lower() == 'true'
    ENABLE_AWS_SES: bool = os.getenv('ENABLE_AWS_SES', 'false').lower() == 'true'
    
    # Rate limiting
    MAX_EMAILS_PER_HOUR: int = int(os.getenv('MAX_EMAILS_PER_HOUR'))
    MAX_EMAILS_PER_DAY: int = int(os.getenv('MAX_EMAILS_PER_DAY'))
    
    # Monitoring
    ENABLE_EMAIL_METRICS: bool = os.getenv('ENABLE_EMAIL_METRICS', 'false').lower() == 'true'
    BOUNCE_NOTIFICATION_EMAIL: Optional[str] = os.getenv('BOUNCE_NOTIFICATION_EMAIL')
    AWS_SNS_TOPIC_ARN: Optional[str] = os.getenv('AWS_SNS_TOPIC_ARN')
    
    # Elasticsearch
    ELASTICSEARCH_URL: Optional[str] = os.getenv('ELASTICSEARCH_URL', 'http://localhost:9200')
    
    # RabbitMQ
    RABBITMQ_URL: Optional[str] = os.getenv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672/')
    
    class Config:
        env_file = ".env"
        extra = "ignore"
    
    def get_ses_client(self) -> boto3.client:
        """Get configured SES client"""
        logger = logging.getLogger(__name__)
        try:
            if self.AWS_ACCESS_KEY_ID and self.AWS_SECRET_ACCESS_KEY:
                return boto3.client(
                    'ses',
                    region_name=self.AWS_REGION,
                    aws_access_key_id=self.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=self.AWS_SECRET_ACCESS_KEY
                )
            else:
                # Use default credentials (IAM role, environment, etc.)
                return boto3.client('ses', region_name=self.AWS_REGION)
        except NoCredentialsError:
            logger.error("AWS credentials not found. Please configure AWS credentials.")
            raise
        except Exception as e:
            logger.error(f"Failed to create SES client: {e}")
            raise
    
    def verify_ses_configuration(self) -> Dict[str, Any]:
        """Verify SES configuration and return status"""
        logger = logging.getLogger(__name__)
        try:
            ses_client = self.get_ses_client()
            
            # Check sending quota
            quota_response = ses_client.get_send_quota()
            
            # Check domain verification status
            domain_response = ses_client.get_identity_verification_attributes(
                Identities=[self.AWS_SES_VERIFIED_DOMAIN]
            )
            
            domain_status = domain_response.get('VerificationAttributes', {}).get(
                self.AWS_SES_VERIFIED_DOMAIN, {}
            ).get('VerificationStatus', 'NotStarted')
            
            return {
                'status': 'success',
                'domain': self.AWS_SES_VERIFIED_DOMAIN,
                'domain_verified': domain_status == 'Success',
                'daily_quota': quota_response.get('Max24HourSend', 0),
                'daily_sent': quota_response.get('SentLast24Hours', 0),
                'send_rate': quota_response.get('MaxSendRate', 0),
                'region': self.AWS_REGION
            }
            
        except ClientError as e:
            logger.error(f"AWS SES configuration error: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'error_code': e.response['Error']['Code']
            }
        except Exception as e:
            logger.error(f"Failed to verify SES configuration: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def is_production_ready(self) -> bool:
        """Check if SES is ready for production use"""
        config_status = self.verify_ses_configuration()
        
        if config_status['status'] != 'success':
            return False
            
        return (
            config_status.get('domain_verified', False) and
            config_status.get('daily_quota', 0) >= 200  # Production access typically has higher quota
        )
    
    def get_smtp_config(self) -> Dict[str, Any]:
        """Get SMTP configuration for AWS SES"""
        return {
            'smtp_server': self.AWS_SES_SMTP_SERVER,
            'smtp_port': self.AWS_SES_SMTP_PORT,
            'username': self.AWS_SES_SMTP_USERNAME,
            'password': self.AWS_SES_SMTP_PASSWORD,
            'use_tls': True,
            'timeout': 30
        }

settings = Settings() 