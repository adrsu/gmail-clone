from pydantic_settings import BaseSettings
from typing import Optional
from dotenv import load_dotenv
import os

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
    
    # AWS S3
    AWS_ACCESS_KEY_ID: Optional[str] = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY: Optional[str] = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_REGION: Optional[str] = os.getenv('AWS_REGION', 'us-east-1')
    S3_BUCKET: Optional[str] = os.getenv('S3_BUCKET', 'gmail-clone-attachments')
    
    # Elasticsearch
    ELASTICSEARCH_URL: Optional[str] = os.getenv('ELASTICSEARCH_URL', 'http://localhost:9200')
    
    # RabbitMQ
    RABBITMQ_URL: Optional[str] = os.getenv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672/')
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings() 