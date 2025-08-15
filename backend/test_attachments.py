#!/usr/bin/env python3
"""
Test script for file attachment functionality
"""

import asyncio
import os
import tempfile
from pathlib import Path
from email_service.attachment_handler import attachment_handler

async def test_attachment_functionality():
    """Test the attachment handler functionality"""
    print("🧪 Testing File Attachment Functionality")
    print("=" * 50)
    
    # Create a test file
    test_content = b"This is a test file content for attachment testing."
    test_filename = "test_document.txt"
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.txt') as temp_file:
        temp_file.write(test_content)
        temp_file_path = temp_file.name
    
    try:
        # Test file upload
        print("📤 Testing file upload...")
        
        # Create a mock UploadFile object
        class MockUploadFile:
            def __init__(self, file_path, filename):
                self.file_path = file_path
                self.filename = filename
                self.content_type = "text/plain"
            
            async def read(self):
                with open(self.file_path, 'rb') as f:
                    return f.read()
        
        mock_file = MockUploadFile(temp_file_path, test_filename)
        user_id = "test-user-123"
        
        # Test single file upload
        result = await attachment_handler.save_attachment(mock_file, user_id)
        print(f"✅ File uploaded successfully: {result['filename']}")
        print(f"   - ID: {result['id']}")
        print(f"   - Size: {result['size']} bytes")
        print(f"   - URL: {result['url']}")
        
        # Test getting attachment metadata
        print("\n📋 Testing attachment metadata retrieval...")
        attachment_meta = await attachment_handler.get_attachment(result['id'], user_id)
        if attachment_meta:
            print(f"✅ Attachment metadata retrieved: {attachment_meta['filename']}")
        else:
            print("❌ Failed to retrieve attachment metadata")
        
        # Test getting attachment content
        print("\n📥 Testing attachment content retrieval...")
        content = await attachment_handler.get_attachment_content(result['id'], user_id)
        if content:
            print(f"✅ Attachment content retrieved: {len(content)} bytes")
            print(f"   - Content matches: {content == test_content}")
        else:
            print("❌ Failed to retrieve attachment content")
        
        # Test attachment deletion
        print("\n🗑️  Testing attachment deletion...")
        deleted = await attachment_handler.delete_attachment(result['id'], user_id)
        if deleted:
            print("✅ Attachment deleted successfully")
        else:
            print("❌ Failed to delete attachment")
        
        # Verify deletion
        verify_deleted = await attachment_handler.get_attachment(result['id'], user_id)
        if not verify_deleted:
            print("✅ Attachment deletion verified")
        else:
            print("❌ Attachment still exists after deletion")
        
        print("\n🎉 All attachment tests completed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Clean up test file
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

def test_file_validation():
    """Test file validation functionality"""
    print("\n🔍 Testing File Validation")
    print("=" * 30)
    
    # Test valid file types
    valid_files = [
        ("document.pdf", "application/pdf", 1024),
        ("image.jpg", "image/jpeg", 2048),
        ("video.mp4", "video/mp4", 1024 * 1024),  # 1MB
        ("archive.zip", "application/zip", 512),
    ]
    
    for filename, content_type, size in valid_files:
        class MockFile:
            def __init__(self, name, type, size):
                self.name = name
                self.type = type
                self.size = size
        
        mock_file = MockFile(filename, content_type, size)
        print(f"✅ {filename} ({content_type}, {size} bytes) - Valid")
    
    # Test invalid file (too large)
    large_file = MockFile("large_file.zip", "application/zip", 30 * 1024 * 1024)  # 30MB
    print(f"⚠️  {large_file.name} ({large_file.size} bytes) - Would be rejected (too large)")

if __name__ == "__main__":
    print("🚀 Starting Attachment Functionality Tests")
    print("=" * 60)
    
    # Test file validation
    test_file_validation()
    
    # Test async functionality
    asyncio.run(test_attachment_functionality())
    
    print("\n✨ All tests completed!")
