import os
import uuid
import aiofiles
from typing import List, Optional, Dict, Any
from fastapi import UploadFile, HTTPException
from datetime import datetime
import mimetypes
from pathlib import Path
import shutil
from shared.config import settings
import boto3
from botocore.exceptions import ClientError
import logging

logger = logging.getLogger(__name__)

class AttachmentHandler:
    def __init__(self):
        self.upload_dir = Path("uploads/attachments")
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize S3 client if configured
        self.s3_client = None
        if hasattr(settings, 'aws_access_key_id') and settings.aws_access_key_id:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                region_name=settings.aws_region
            )
    
    async def save_attachment(self, file: UploadFile, user_id: str) -> Dict[str, Any]:
        """Save an uploaded file and return attachment metadata"""
        try:
            # Generate unique filename
            file_id = str(uuid.uuid4())
            file_extension = Path(file.filename).suffix if file.filename else ''
            safe_filename = f"{file_id}{file_extension}"
            
            # Determine content type
            content_type = file.content_type or mimetypes.guess_type(file.filename or '')[0] or 'application/octet-stream'
            
            # Read file content
            content = await file.read()
            file_size = len(content)
            
            # Check file size limit (25MB default)
            max_size = getattr(settings, 'max_attachment_size', 25 * 1024 * 1024)  # 25MB
            if file_size > max_size:
                raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {max_size // (1024*1024)}MB")
            
            # Save to local storage or S3
            if self.s3_client and hasattr(settings, 's3_bucket_name'):
                # Save to S3
                s3_key = f"attachments/{user_id}/{safe_filename}"
                try:
                    self.s3_client.put_object(
                        Bucket=settings.s3_bucket_name,
                        Key=s3_key,
                        Body=content,
                        ContentType=content_type,
                        Metadata={
                            'original_filename': file.filename or '',
                            'user_id': user_id,
                            'uploaded_at': datetime.utcnow().isoformat()
                        }
                    )
                    file_url = f"https://{settings.s3_bucket_name}.s3.amazonaws.com/{s3_key}"
                except ClientError as e:
                    logger.error(f"Failed to upload to S3: {e}")
                    raise HTTPException(status_code=500, detail="Failed to upload file to cloud storage")
            else:
                # Save to local storage
                user_upload_dir = self.upload_dir / user_id
                user_upload_dir.mkdir(parents=True, exist_ok=True)
                
                file_path = user_upload_dir / safe_filename
                async with aiofiles.open(file_path, 'wb') as f:
                    await f.write(content)
                
                file_url = f"/attachments/{user_id}/{safe_filename}"
            
            return {
                "id": file_id,
                "filename": file.filename or "unknown",
                "content_type": content_type,
                "size": file_size,
                "url": file_url,
                "uploaded_at": datetime.utcnow().isoformat()
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error saving attachment: {e}")
            raise HTTPException(status_code=500, detail="Failed to save attachment")
    
    async def save_multiple_attachments(self, files: List[UploadFile], user_id: str) -> List[Dict[str, Any]]:
        """Save multiple uploaded files"""
        attachments = []
        for file in files:
            attachment = await self.save_attachment(file, user_id)
            attachments.append(attachment)
        return attachments
    
    async def get_attachment(self, attachment_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get attachment metadata by ID"""
        # This would typically query a database
        # For now, we'll implement a simple file-based lookup
        try:
            if self.s3_client and hasattr(settings, 's3_bucket_name'):
                # Look up in S3
                try:
                    response = self.s3_client.head_object(
                        Bucket=settings.s3_bucket_name,
                        Key=f"attachments/{user_id}/{attachment_id}"
                    )
                    return {
                        "id": attachment_id,
                        "filename": response.get('Metadata', {}).get('original_filename', 'unknown'),
                        "content_type": response.get('ContentType', 'application/octet-stream'),
                        "size": response.get('ContentLength', 0),
                        "url": f"https://{settings.s3_bucket_name}.s3.amazonaws.com/attachments/{user_id}/{attachment_id}"
                    }
                except ClientError:
                    return None
            else:
                # Look up in local storage
                user_upload_dir = self.upload_dir / user_id
                for file_path in user_upload_dir.glob(f"{attachment_id}*"):
                    if file_path.exists():
                        return {
                            "id": attachment_id,
                            "filename": file_path.name,
                            "content_type": mimetypes.guess_type(file_path.name)[0] or 'application/octet-stream',
                            "size": file_path.stat().st_size,
                            "url": f"/attachments/{user_id}/{file_path.name}"
                        }
            return None
        except Exception as e:
            logger.error(f"Error getting attachment: {e}")
            return None
    
    async def delete_attachment(self, attachment_id: str, user_id: str) -> bool:
        """Delete an attachment"""
        try:
            if self.s3_client and hasattr(settings, 's3_bucket_name'):
                # Delete from S3
                try:
                    self.s3_client.delete_object(
                        Bucket=settings.s3_bucket_name,
                        Key=f"attachments/{user_id}/{attachment_id}"
                    )
                    return True
                except ClientError:
                    return False
            else:
                # Delete from local storage
                user_upload_dir = self.upload_dir / user_id
                for file_path in user_upload_dir.glob(f"{attachment_id}*"):
                    if file_path.exists():
                        file_path.unlink()
                        return True
            return False
        except Exception as e:
            logger.error(f"Error deleting attachment: {e}")
            return False
    
    async def get_attachment_content(self, attachment_id: str, user_id: str) -> Optional[bytes]:
        """Get the actual file content of an attachment"""
        try:
            if self.s3_client and hasattr(settings, 's3_bucket_name'):
                # Get from S3
                try:
                    response = self.s3_client.get_object(
                        Bucket=settings.s3_bucket_name,
                        Key=f"attachments/{user_id}/{attachment_id}"
                    )
                    return response['Body'].read()
                except ClientError:
                    return None
            else:
                # Get from local storage
                user_upload_dir = self.upload_dir / user_id
                for file_path in user_upload_dir.glob(f"{attachment_id}*"):
                    if file_path.exists():
                        async with aiofiles.open(file_path, 'rb') as f:
                            return await f.read()
            return None
        except Exception as e:
            logger.error(f"Error getting attachment content: {e}")
            return None

# Global instance
attachment_handler = AttachmentHandler()
