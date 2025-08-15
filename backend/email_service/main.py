from fastapi import FastAPI, HTTPException, Depends, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from typing import List, Optional
from datetime import datetime
import uuid
import io

# Import models from the same directory
from .models import (
    EmailMessage, ComposeEmailRequest, EmailListRequest, 
    EmailListResponse, EmailStatus, EmailAddress
)
from .database import EmailDatabase
from .smtp_handler import SMTPHandler
from .attachment_handler import attachment_handler
from shared.config import settings
from shared.elasticsearch_service import elasticsearch_service

app = FastAPI(title="Email Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize handlers
smtp_handler = SMTPHandler()

@app.on_event("startup")
async def startup_event():
    """Initialize Elasticsearch on startup"""
    try:
        await elasticsearch_service.create_index()
        print("✅ Elasticsearch index initialized")
    except Exception as e:
        print(f"⚠️  Elasticsearch initialization failed: {e}")
        print("⚠️  Search functionality will fall back to Supabase")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "email-service"}

@app.get("/test-user-lookup/{user_id}")
async def test_user_lookup(user_id: str):
    """Test endpoint to verify user lookup functionality"""
    from .database import get_user_by_id, enrich_email_with_user_data
    
    print(f"🔍 TEST: Looking up user_id: {user_id}")
    user_data = get_user_by_id(user_id)
    print(f"🔍 TEST: User data found: {user_data}")
    
    # Test enrichment with sample data
    sample_email = {
        "from_address": {
            "email": f"{user_id}@example.com",
            "name": user_id
        },
        "to_addresses": []
    }
    print(f"🔍 TEST: Sample email before enrichment: {sample_email}")
    
    enriched = enrich_email_with_user_data(sample_email)
    print(f"🔍 TEST: Sample email after enrichment: {enriched}")
    
    return {
        "user_id": user_id,
        "user_data": user_data,
        "sample_enrichment": enriched
    }


@app.post("/emails/compose", response_model=EmailMessage)
async def compose_email(
    request: ComposeEmailRequest,
    user_id: str = Query(..., description="User ID")
):
    """Compose and optionally send an email"""
    try:
        # Parse email addresses
        to_addresses = [EmailAddress(email=email) for email in request.to_addresses]
        cc_addresses = [EmailAddress(email=email) for email in request.cc_addresses]
        bcc_addresses = [EmailAddress(email=email) for email in request.bcc_addresses]
        
        # Get user info for from_address
        # In a real app, you'd get this from the user service
        from_address = EmailAddress(email=f"{user_id}@example.com", name=user_id)
        
        # Get attachment metadata for the provided attachment IDs
        attachments = []
        if request.attachment_ids:
            for attachment_id in request.attachment_ids:
                attachment = await attachment_handler.get_attachment(attachment_id, user_id)
                if attachment:
                    attachments.append(attachment)
        
        email_data = {
            "subject": request.subject,
            "body": request.body,
            "html_body": request.html_body,
            "from_address": from_address,
            "to_addresses": to_addresses,
            "cc_addresses": cc_addresses,
            "bcc_addresses": bcc_addresses,
            "attachments": attachments,
            "status": EmailStatus.DRAFT if request.save_as_draft else EmailStatus.SENT,
            "priority": request.priority,
            "sent_at": datetime.utcnow() if not request.save_as_draft else None
        }
        
        # Save to database
        email = await EmailDatabase.create_email(email_data, user_id)
        
        # Send email if not saving as draft
        if not request.save_as_draft:
            if not settings.development_mode:
                # Production mode - actually send email via SMTP
                try:
                    success = await smtp_handler.send_email(
                        from_email=from_address.email,
                        to_emails=[addr.email for addr in to_addresses],
                        subject=request.subject,
                        body=request.body,
                        html_body=request.html_body,
                        cc_emails=[addr.email for addr in cc_addresses],
                        bcc_emails=[addr.email for addr in bcc_addresses]
                    )
                    
                    if not success:
                        # Update status back to draft if sending failed
                        await EmailDatabase.update_email_status(email.id, user_id, EmailStatus.DRAFT)
                        raise HTTPException(status_code=500, detail="Failed to send email")
                except Exception as e:
                    # Update status back to draft if sending failed
                    await EmailDatabase.update_email_status(email.id, user_id, EmailStatus.DRAFT)
                    raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
            else:
                # Development mode - send via local SMTP server
                try:
                    success = await smtp_handler.send_email(
                        from_email=from_address.email,
                        to_emails=[addr.email for addr in to_addresses],
                        subject=request.subject,
                        body=request.body,
                        html_body=request.html_body,
                        cc_emails=[addr.email for addr in cc_addresses],
                        bcc_emails=[addr.email for addr in bcc_addresses]
                    )
                    
                    if not success:
                        # Update status back to draft if sending failed
                        await EmailDatabase.update_email_status(email.id, user_id, EmailStatus.DRAFT)
                        raise HTTPException(status_code=500, detail="Failed to send email via local SMTP server")
                        
                    print(f"Development mode: Email sent via local SMTP server to {[addr.email for addr in to_addresses]}")
                except Exception as e:
                    # Update status back to draft if sending failed
                    await EmailDatabase.update_email_status(email.id, user_id, EmailStatus.DRAFT)
                    print(f"Development mode: Failed to send email via local SMTP server: {e}")
                    raise HTTPException(status_code=500, detail=f"Failed to send email via local SMTP server: {str(e)}")
        
        return email
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/emails", response_model=EmailListResponse)
async def get_emails(
    folder: str = Query("inbox", description="Email folder"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term"),
    status: Optional[EmailStatus] = Query(None, description="Email status filter"),
    is_read: Optional[bool] = Query(None, description="Read status filter"),
    is_starred: Optional[bool] = Query(None, description="Starred status filter"),
    user_id: str = Query(..., description="User ID")
):
    """Get emails with filtering and pagination"""
    try:
        emails = await EmailDatabase.get_emails_from_cache_or_db(
            user_id=user_id,
            folder=folder,
            page=page,
            limit=limit,
            search=search,
            status=status,
            is_read=is_read,
            is_starred=is_starred
        )
        
        # Get total count for pagination
        total = await EmailDatabase.get_email_count(user_id, folder, search)
        
        return EmailListResponse(
            emails=emails,
            total=total,
            page=page,
            limit=limit,
            has_more=(page * limit) < total
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/emails/{email_id}", response_model=EmailMessage)
async def get_email(
    email_id: str,
    user_id: str = Query(..., description="User ID")
):
    """Get a specific email by ID"""
    try:
        email = await EmailDatabase.get_email_by_id(email_id, user_id)
        if not email:
            raise HTTPException(status_code=404, detail="Email not found")
        
        # Mark as read if it's not already
        if not email.is_read:
            await EmailDatabase.mark_as_read(email_id, user_id, True)
            email.is_read = True
        
        return email
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/emails/{email_id}/read")
async def mark_email_read(
    email_id: str,
    is_read: bool = Query(True, description="Mark as read or unread"),
    user_id: str = Query(..., description="User ID")
):
    """Mark email as read/unread"""
    try:
        success = await EmailDatabase.mark_as_read(email_id, user_id, is_read)
        if not success:
            raise HTTPException(status_code=404, detail="Email not found")
        
        return {"message": f"Email marked as {'read' if is_read else 'unread'}"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/emails/{email_id}/star")
async def toggle_email_star(
    email_id: str,
    user_id: str = Query(..., description="User ID")
):
    """Toggle email star status"""
    try:
        success = await EmailDatabase.toggle_star(email_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Email not found")
        
        return {"message": "Email star status toggled"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/emails/{email_id}")
async def update_email(
    email_id: str,
    request: ComposeEmailRequest,
    user_id: str = Query(..., description="User ID")
):
    """Update an existing email"""
    try:
        # Check if email exists and belongs to user
        existing_email = await EmailDatabase.get_email_by_id(email_id, user_id)
        if not existing_email:
            raise HTTPException(status_code=404, detail="Email not found")
        
        # Parse email addresses
        to_addresses = [EmailAddress(email=email) for email in request.to_addresses]
        cc_addresses = [EmailAddress(email=email) for email in request.cc_addresses]
        bcc_addresses = [EmailAddress(email=email) for email in request.bcc_addresses]
        
        # Get user info for from_address
        from_address = EmailAddress(email=f"{user_id}@example.com", name=user_id)
        
        email_data = {
            "subject": request.subject,
            "body": request.body,
            "html_body": request.html_body,
            "from_address": from_address,
            "to_addresses": to_addresses,
            "cc_addresses": cc_addresses,
            "bcc_addresses": bcc_addresses,
            "status": EmailStatus.DRAFT if request.save_as_draft else EmailStatus.SENT,
            "priority": request.priority,
        }
        
        # Update in database
        updated_email = await EmailDatabase.update_email(email_id, user_id, email_data)
        
        if not updated_email:
            raise HTTPException(status_code=500, detail="Failed to update email")
        
        # Send email if not saving as draft
        if not request.save_as_draft:
            if not settings.development_mode:
                # Production mode - actually send email via SMTP
                try:
                    success = await smtp_handler.send_email(
                        from_email=from_address.email,
                        to_emails=[addr.email for addr in to_addresses],
                        subject=request.subject,
                        body=request.body,
                        html_body=request.html_body,
                        cc_emails=[addr.email for addr in cc_addresses],
                        bcc_emails=[addr.email for addr in bcc_addresses]
                    )
                    
                    if not success:
                        # Update status back to draft if sending failed
                        await EmailDatabase.update_email_status(email_id, user_id, EmailStatus.DRAFT)
                        raise HTTPException(status_code=500, detail="Failed to send email")
                except Exception as e:
                    # Update status back to draft if sending failed
                    await EmailDatabase.update_email_status(email_id, user_id, EmailStatus.DRAFT)
                    raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
            else:
                # Development mode - send via local SMTP server
                try:
                    success = await smtp_handler.send_email(
                        from_email=from_address.email,
                        to_emails=[addr.email for addr in to_addresses],
                        subject=request.subject,
                        body=request.body,
                        html_body=request.html_body,
                        cc_emails=[addr.email for addr in cc_addresses],
                        bcc_emails=[addr.email for addr in bcc_addresses]
                    )
                    
                    if not success:
                        # Update status back to draft if sending failed
                        await EmailDatabase.update_email_status(email_id, user_id, EmailStatus.DRAFT)
                        raise HTTPException(status_code=500, detail="Failed to send email via local SMTP server")
                        
                    print(f"Development mode: Email sent via local SMTP server to {[addr.email for addr in to_addresses]}")
                except Exception as e:
                    # Update status back to draft if sending failed
                    await EmailDatabase.update_email_status(email_id, user_id, EmailStatus.DRAFT)
                    print(f"Development mode: Failed to send email via local SMTP server: {e}")
                    raise HTTPException(status_code=500, detail=f"Failed to send email via local SMTP server: {str(e)}")
        
        return updated_email
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/emails/{email_id}")
async def delete_email(
    email_id: str,
    user_id: str = Query(..., description="User ID")
):
    """Delete email (move to trash)"""
    try:
        success = await EmailDatabase.delete_email(email_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Email not found")
        
        return {"message": "Email moved to trash"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/emails/count/{folder}")
async def get_email_count(
    folder: str,
    user_id: str = Query(..., description="User ID")
):
    """Get email count for a folder"""
    try:
        count = await EmailDatabase.get_email_count(user_id, folder)
        return {"folder": folder, "count": count}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/emails/test-smtp")
async def test_smtp_connection():
    """Test SMTP connection"""
    try:
        success = await smtp_handler.test_connection()
        return {"success": success, "message": "SMTP connection test completed"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Attachment endpoints
@app.post("/attachments/upload")
async def upload_attachment(
    file: UploadFile = File(...),
    user_id: str = Query(..., description="User ID")
):
    """Upload a file attachment"""
    try:
        attachment = await attachment_handler.save_attachment(file, user_id)
        return attachment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/attachments/upload-multiple")
async def upload_multiple_attachments(
    files: List[UploadFile] = File(...),
    user_id: str = Query(..., description="User ID")
):
    """Upload multiple file attachments"""
    try:
        attachments = await attachment_handler.save_multiple_attachments(files, user_id)
        return {"attachments": attachments}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/attachments/{attachment_id}")
async def get_attachment(
    attachment_id: str,
    user_id: str = Query(..., description="User ID")
):
    """Get attachment metadata"""
    try:
        attachment = await attachment_handler.get_attachment(attachment_id, user_id)
        if not attachment:
            raise HTTPException(status_code=404, detail="Attachment not found")
        return attachment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/attachments/{attachment_id}/download")
async def download_attachment(
    attachment_id: str,
    user_id: str = Query(..., description="User ID")
):
    """Download attachment file"""
    try:
        # Get attachment metadata
        attachment = await attachment_handler.get_attachment(attachment_id, user_id)
        if not attachment:
            raise HTTPException(status_code=404, detail="Attachment not found")
        
        # Get file content
        content = await attachment_handler.get_attachment_content(attachment_id, user_id)
        if not content:
            raise HTTPException(status_code=404, detail="Attachment file not found")
        
        # Return file as streaming response
        return StreamingResponse(
            io.BytesIO(content),
            media_type=attachment["content_type"],
            headers={
                "Content-Disposition": f"attachment; filename=\"{attachment['filename']}\"",
                "Content-Length": str(attachment["size"])
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/attachments/{attachment_id}")
async def delete_attachment(
    attachment_id: str,
    user_id: str = Query(..., description="User ID")
):
    """Delete an attachment"""
    try:
        success = await attachment_handler.delete_attachment(attachment_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Attachment not found")
        
        return {"message": "Attachment deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 