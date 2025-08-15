import { config } from '../config/config';

export interface Attachment {
  id: string;
  filename: string;
  content_type?: string;
  size: number;
  url?: string;
  uploaded_at?: string;
}

export interface UploadResponse {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  url: string;
  uploaded_at: string;
}

class AttachmentService {
  private _baseUrl = config.EMAIL_SERVICE_URL;
  
  get baseUrl() {
    return this._baseUrl;
  }

  async uploadAttachment(file: File, userId: string): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this._baseUrl}/attachments/upload?user_id=${userId}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload attachment');
    }

    return response.json();
  }

  async uploadMultipleAttachments(files: File[], userId: string): Promise<{ attachments: UploadResponse[] }> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(`${this._baseUrl}/attachments/upload-multiple?user_id=${userId}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload attachments');
    }

    return response.json();
  }

  async getAttachment(attachmentId: string, userId: string): Promise<Attachment> {
    const response = await fetch(`${this._baseUrl}/attachments/${attachmentId}?user_id=${userId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get attachment');
    }

    return response.json();
  }

  async downloadAttachment(attachmentId: string, userId: string, filename: string): Promise<void> {
    const response = await fetch(`${this._baseUrl}/attachments/${attachmentId}/download?user_id=${userId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to download attachment');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    const response = await fetch(`${this._baseUrl}/attachments/${attachmentId}?user_id=${userId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete attachment');
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'ppt':
      case 'pptx':
        return '📈';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
        return '🖼️';
      case 'mp4':
      case 'avi':
      case 'mov':
        return '🎥';
      case 'mp3':
      case 'wav':
      case 'flac':
        return '🎵';
      case 'zip':
      case 'rar':
      case '7z':
        return '📦';
      case 'txt':
        return '📄';
      default:
        return '📎';
    }
  }

  validateFile(file: File): { isValid: boolean; error?: string } {
    // Check file size (25MB limit)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size exceeds 25MB limit. Current size: ${this.formatFileSize(file.size)}`
      };
    }

    // Check file type (optional - you can customize this)
    const allowedTypes = [
      'image/',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed',
      'video/',
      'audio/'
    ];

    const isAllowed = allowedTypes.some(type => 
      file.type.startsWith(type) || file.type === type
    );

    if (!isAllowed) {
      return {
        isValid: false,
        error: `File type not allowed: ${file.type}`
      };
    }

    return { isValid: true };
  }
}

export const attachmentService = new AttachmentService();
