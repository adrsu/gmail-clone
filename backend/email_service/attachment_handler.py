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
        if hasattr(settings, 'AWS_ACCESS_KEY_ID') and settings.AWS_ACCESS_KEY_ID:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
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
            if self.s3_client and hasattr(settings, 'S3_BUCKET') and settings.S3_BUCKET:
                # Save to S3
                s3_key = f"attachments/{user_id}/{safe_filename}"
                try:
                    self.s3_client.put_object(
                        Bucket=settings.S3_BUCKET,
                        Key=s3_key,
                        Body=content,
                        ContentType=content_type,
                        Metadata={
                            'original_filename': file.filename or '',
                            'user_id': user_id,
                            'uploaded_at': datetime.utcnow().isoformat()
                        }
                    )
                    # Generate presigned URL for secure access (expires in 1 hour)
                    try:
                        # Determine content disposition based on file type
                        if content_type.startswith('image/'):
                            # Images: inline display
                            content_disposition = f'inline; filename="{file.filename or "attachment"}"'
                        elif content_type.startswith('text/'):
                            # Text files: inline display for preview
                            content_disposition = f'inline; filename="{file.filename or "attachment"}"'
                        elif content_type in ['application/pdf', 'application/json', 'application/xml']:
                            # PDF and structured documents: inline for browser preview
                            content_disposition = f'inline; filename="{file.filename or "attachment"}"'
                        else:
                            # Other files: attachment (download)
                            content_disposition = f'attachment; filename="{file.filename or "attachment"}"'
                        
                        file_url = self.s3_client.generate_presigned_url(
                            'get_object',
                            Params={
                                'Bucket': settings.S3_BUCKET, 
                                'Key': s3_key,
                                'ResponseContentType': content_type,  # Ensure proper MIME type
                                'ResponseContentDisposition': content_disposition  # Appropriate display method
                            },
                            ExpiresIn=300  # 5 minutes
                        )
                    except Exception as e:
                        logger.error(f"Failed to generate presigned URL: {e}")
                        # Fallback to direct URL (but this may not work due to permissions)
                        if settings.AWS_REGION == 'us-east-1':
                            file_url = f"https://{settings.S3_BUCKET}.s3.amazonaws.com/{s3_key}"
                        else:
                            file_url = f"https://{settings.S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"
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
            if self.s3_client and hasattr(settings, 'S3_BUCKET') and settings.S3_BUCKET:
                # Look up in S3 - we need to list objects to find the one with the attachment_id
                try:
                    # List objects in the user's attachment folder to find the one with the attachment_id
                    response = self.s3_client.list_objects_v2(
                        Bucket=settings.S3_BUCKET,
                        Prefix=f"attachments/{user_id}/{attachment_id}"
                    )
                    
                    if 'Contents' in response and len(response['Contents']) > 0:
                        # Found the object, get its metadata
                        s3_key = response['Contents'][0]['Key']
                        head_response = self.s3_client.head_object(
                            Bucket=settings.S3_BUCKET,
                            Key=s3_key
                        )
                        
                        # Generate presigned URL for secure access
                        try:
                            content_type = head_response.get('ContentType', 'application/octet-stream')
                            original_filename = head_response.get('Metadata', {}).get('original_filename', 'attachment')
                            
                            # Determine content disposition based on file type
                            if content_type.startswith('image/'):
                                # Images: inline display
                                content_disposition = f'inline; filename="{original_filename}"'
                            elif content_type.startswith('text/'):
                                # Text files: inline display for preview
                                content_disposition = f'inline; filename="{original_filename}"'
                            elif content_type in ['application/pdf', 'application/json', 'application/xml']:
                                # PDF and structured documents: inline for browser preview
                                content_disposition = f'inline; filename="{original_filename}"'
                            else:
                                # Other files: attachment (download)
                                content_disposition = f'attachment; filename="{original_filename}"'
                            
                            presigned_url = self.s3_client.generate_presigned_url(
                                'get_object',
                                Params={
                                    'Bucket': settings.S3_BUCKET, 
                                    'Key': s3_key,
                                    'ResponseContentType': content_type,  # Ensure proper MIME type
                                    'ResponseContentDisposition': content_disposition  # Appropriate display method
                                },
                                ExpiresIn=3600  # 1 hour
                            )
                        except Exception as e:
                            logger.error(f"Failed to generate presigned URL: {e}")
                            # Fallback to direct URL
                            presigned_url = f"https://{settings.S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}" if settings.AWS_REGION != 'us-east-1' else f"https://{settings.S3_BUCKET}.s3.amazonaws.com/{s3_key}"
                        
                        return {
                            "id": attachment_id,
                            "filename": head_response.get('Metadata', {}).get('original_filename', 'unknown'),
                            "content_type": head_response.get('ContentType', 'application/octet-stream'),
                            "size": head_response.get('ContentLength', 0),
                            "url": presigned_url
                        }
                    return None
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
            if self.s3_client and hasattr(settings, 'S3_BUCKET') and settings.S3_BUCKET:
                # Delete from S3 - we need to list objects to find the one with the attachment_id
                try:
                    # List objects in the user's attachment folder to find the one with the attachment_id
                    response = self.s3_client.list_objects_v2(
                        Bucket=settings.S3_BUCKET,
                        Prefix=f"attachments/{user_id}/{attachment_id}"
                    )
                    
                    if 'Contents' in response and len(response['Contents']) > 0:
                        # Found the object, delete it
                        s3_key = response['Contents'][0]['Key']
                        self.s3_client.delete_object(
                            Bucket=settings.S3_BUCKET,
                            Key=s3_key
                        )
                        return True
                    return False
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
            if self.s3_client and hasattr(settings, 'S3_BUCKET') and settings.S3_BUCKET:
                # Get from S3 - we need to list objects to find the one with the attachment_id
                try:
                    # List objects in the user's attachment folder to find the one with the attachment_id
                    response = self.s3_client.list_objects_v2(
                        Bucket=settings.S3_BUCKET,
                        Prefix=f"attachments/{user_id}/{attachment_id}"
                    )
                    
                    if 'Contents' in response and len(response['Contents']) > 0:
                        # Found the object, get its content
                        s3_key = response['Contents'][0]['Key']
                        get_response = self.s3_client.get_object(
                            Bucket=settings.S3_BUCKET,
                            Key=s3_key
                        )
                        return get_response['Body'].read()
                    return None
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
