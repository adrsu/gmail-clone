from pydantic_settings import BaseSettings
from typing import Optional
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str = os.getenv('SUPABASE_URL')
    SUPABASE_KEY: str = os.getenv('SUPABASE_KEY')
    SUPABASE_SERVICE_KEY: str = os.getenv('SUPABASE_SERVICE_KEY')
    
    # Redis
    REDIS_URL: str = os.getenv('REDIS_URL')
    
    # JWT
    SECRET_KEY: str = os.getenv('SECRET_KEY')
    ALGORITHM: str = os.getenv('ALGORITHM')
    ACCESS_TOKEN_EXPIRE_MINUTES=30
    
    # Email
    SMTP_HOST: str = os.getenv('SMTP_HOST')
    SMTP_PORT: int = os.getenv('SMTP_PORT')
    SMTP_USERNAME: str = os.getenv('SMTP_USERNAME')
    SMTP_PASSWORD: str = os.getenv('SMTP_PASSWORD')
    
    # AWS S3
    AWS_ACCESS_KEY_ID: Optional[str] = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY: Optional[str] = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_REGION: str = os.getenv('AWS_REGION')
    S3_BUCKET: str = os.getenv('S3_BUCKET')
    
    # Elasticsearch
    ELASTICSEARCH_URL: str = os.getenv('ELASTICSEARCH_URL')
    
    # RabbitMQ
    RABBITMQ_URL: str = os.getenv('RABBITMQ_URL')
    
    class Config:
        env_file = ".env"

settings = Settings() 