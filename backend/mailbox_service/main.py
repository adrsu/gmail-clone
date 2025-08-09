from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from .models import EmailFolder, CreateFolderRequest, UpdateFolderRequest, FolderListResponse
from .database import MailboxDatabase
from shared.config import settings

app = FastAPI(title="Mailbox Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "mailbox-service"}


@app.post("/folders/initialize", response_model=List[EmailFolder])
async def initialize_folders(user_id: str = Query(..., description="User ID")):
    """Initialize system folders for a new user"""
    try:
        folders = await MailboxDatabase.create_system_folders(user_id)
        return folders
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/folders", response_model=FolderListResponse)
async def get_folders(user_id: str = Query(..., description="User ID")):
    """Get all folders for a user"""
    try:
        folders = await MailboxDatabase.get_folders(user_id)
        return FolderListResponse(folders=folders, total=len(folders))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/folders", response_model=EmailFolder)
async def create_folder(
    request: CreateFolderRequest,
    user_id: str = Query(..., description="User ID")
):
    """Create a custom folder"""
    try:
        folder = await MailboxDatabase.create_custom_folder(
            user_id=user_id,
            name=request.name,
            parent_id=request.parent_id,
            color=request.color,
            icon=request.icon
        )
        return folder
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/folders/{folder_id}", response_model=EmailFolder)
async def get_folder(
    folder_id: str,
    user_id: str = Query(..., description="User ID")
):
    """Get a specific folder by ID"""
    try:
        folder = await MailboxDatabase.get_folder_by_id(folder_id, user_id)
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")
        return folder
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/folders/{folder_id}", response_model=EmailFolder)
async def update_folder(
    folder_id: str,
    request: UpdateFolderRequest,
    user_id: str = Query(..., description="User ID")
):
    """Update folder details"""
    try:
        success = await MailboxDatabase.update_folder(
            folder_id=folder_id,
            user_id=user_id,
            name=request.name,
            parent_id=request.parent_id,
            color=request.color,
            icon=request.icon
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Folder not found")
        
        # Return updated folder
        folder = await MailboxDatabase.get_folder_by_id(folder_id, user_id)
        return folder
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/folders/{folder_id}")
async def delete_folder(
    folder_id: str,
    user_id: str = Query(..., description="User ID")
):
    """Delete a custom folder"""
    try:
        success = await MailboxDatabase.delete_folder(folder_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Folder not found or cannot delete system folder")
        
        return {"message": "Folder deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/folders/{folder_id}/refresh-counts")
async def refresh_folder_counts(
    folder_id: str,
    user_id: str = Query(..., description="User ID")
):
    """Refresh email and unread counts for a folder"""
    try:
        success = await MailboxDatabase.update_folder_counts(folder_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Folder not found")
        
        return {"message": "Folder counts updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002) 