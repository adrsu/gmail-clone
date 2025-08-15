import React from 'react';
import {
  Box,
  Chip,
  IconButton,
  Typography,
  Tooltip,
  Alert,
  LinearProgress,
  Card,
  CardMedia,
  CardContent,
  Grid,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Error as ErrorIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { attachmentService, Attachment } from '../../services/attachmentService';

interface AttachmentListProps {
  attachments: Array<{
    id: string;
    filename: string;
    content_type?: string;
    size: number;
    url?: string;
  }>;
  userId: string;
  onDelete?: (attachmentId: string) => void;
  showActions?: boolean;
  compact?: boolean;
  showPreviews?: boolean;
}

const AttachmentList: React.FC<AttachmentListProps> = ({
  attachments,
  userId,
  onDelete,
  showActions = true,
  compact = false,
  showPreviews = true,
}) => {
  // Debug: Log attachment data
  console.log('📎 AttachmentList received:', {
    attachmentCount: attachments?.length || 0,
    attachments: attachments,
    userId: userId
  });
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Helper function to check if attachment is an image
  const isImageFile = (attachment: any) => {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    return imageTypes.includes(attachment.content_type || '') || 
           /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(attachment.filename);
  };

  // Helper function to get preview URL - use presigned URL if available, otherwise backend endpoint
  const getPreviewUrl = (attachment: any) => {
    // If we have a presigned URL from the backend, use it for better performance
    if (attachment.url && attachment.url.includes('AWSAccessKeyId=')) {
      return attachment.url;
    }
    // Fallback to backend download endpoint for security
    return `${attachmentService.baseUrl}/attachments/${attachment.id}/download?user_id=${userId}`;
  };

  // Helper function to handle image load errors
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
    // Show fallback icon instead
    const parent = target.parentElement;
    if (parent) {
      const fallback = document.createElement('div');
      fallback.style.cssText = `
        height: 140px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #f8f9fa;
        border-bottom: 1px solid #e8eaed;
        font-size: 48px;
        color: #666;
      `;
      fallback.textContent = '🖼️';
      parent.appendChild(fallback);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    setDownloading(attachment.id);
    setError(null);
    
    try {
      await attachmentService.downloadAttachment(
        attachment.id,
        userId,
        attachment.filename
      );
    } catch (err) {
      setError(`Failed to download ${attachment.filename}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    setDeleting(attachmentId);
    setError(null);
    
    try {
      await attachmentService.deleteAttachment(attachmentId, userId);
      onDelete?.(attachmentId);
    } catch (err) {
      setError(`Failed to delete attachment: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeleting(null);
    }
  };

  if (attachments.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 1 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Typography variant="body2" sx={{ color: '#666', mb: 1, fontSize: '12px' }}>
        Attachments ({attachments.length}):
      </Typography>
      
      {showPreviews ? (
        // Grid layout for attachments with previews
        <Grid container spacing={2}>
          {attachments.map((attachment) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={attachment.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid #e8eaed',
                  '&:hover': {
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }
                }}
              >
                {/* Image Preview */}
                {isImageFile(attachment) && (
                  <CardMedia
                    component="img"
                    height="140"
                    image={getPreviewUrl(attachment)}
                    alt={attachment.filename}
                    sx={{
                      objectFit: 'cover',
                      backgroundColor: '#f5f5f5',
                    }}
                    onError={handleImageError}
                  />
                )}
                
                {/* File Icon for non-images */}
                {!isImageFile(attachment) && (
                  <Box sx={{ 
                    height: 140, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: '#f8f9fa',
                    borderBottom: '1px solid #e8eaed',
                  }}>
                    <Typography variant="h3" sx={{ color: '#666' }}>
                      {attachmentService.getFileIcon(attachment.filename)}
                    </Typography>
                  </Box>
                )}

                <CardContent sx={{ flexGrow: 1, p: 1.5 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '12px',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      mb: 0.5,
                    }}
                    title={attachment.filename}
                  >
                    {attachment.filename}
                  </Typography>
                  
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '11px',
                      color: '#666',
                      mb: 1,
                    }}
                  >
                    {attachmentService.formatFileSize(attachment.size)}
                    {attachment.content_type && ` • ${attachment.content_type.split('/')[1]?.toUpperCase()}`}
                  </Typography>

                  {/* Actions */}
                  {showActions && (
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      {/* View/Preview Icon - Show for ALL file types, not just images */}
                      <Tooltip title="Preview">
                        <IconButton
                          size="small"
                          onClick={() => window.open(getPreviewUrl(attachment), '_blank')}
                          sx={{
                            p: 0.5,
                            color: '#666',
                            '&:hover': { backgroundColor: '#e8eaed' },
                          }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Download">
                        <IconButton
                          size="small"
                          onClick={() => handleDownload(attachment)}
                          disabled={downloading === attachment.id}
                          sx={{
                            p: 0.5,
                            color: '#666',
                            '&:hover': { backgroundColor: '#e8eaed' },
                          }}
                        >
                          {downloading === attachment.id ? (
                            <LinearProgress sx={{ width: 16, height: 16 }} />
                          ) : (
                            <DownloadIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                      
                      {onDelete && (
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(attachment.id)}
                            disabled={deleting === attachment.id}
                            sx={{
                              p: 0.5,
                              color: '#666',
                              '&:hover': { backgroundColor: '#e8eaed' },
                            }}
                          >
                            {deleting === attachment.id ? (
                              <LinearProgress sx={{ width: 16, height: 16 }} />
                            ) : (
                              <DeleteIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        // Compact list layout for attachments without previews
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {attachments.map((attachment) => (
            <Box
              key={attachment.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: compact ? 0.5 : 1,
                border: '1px solid #e8eaed',
                borderRadius: 1,
                backgroundColor: '#f8f9fa',
                fontSize: '12px',
                position: 'relative',
              }}
            >
              {/* File info */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '16px' }}>
                  {attachmentService.getFileIcon(attachment.filename)}
                </Typography>
                
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '12px',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {attachment.filename}
                  </Typography>
                  
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '11px',
                      color: '#666',
                    }}
                  >
                    {attachmentService.formatFileSize(attachment.size)}
                    {attachment.content_type && ` • ${attachment.content_type}`}
                  </Typography>
                </Box>
              </Box>

              {/* Actions */}
              {showActions && (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {/* Preview Icon - Show for ALL file types */}
                  <Tooltip title="Preview">
                    <IconButton
                      size="small"
                      onClick={() => window.open(getPreviewUrl(attachment), '_blank')}
                      sx={{
                        p: 0.5,
                        color: '#666',
                        '&:hover': { backgroundColor: '#e8eaed' },
                      }}
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Download">
                    <IconButton
                      size="small"
                      onClick={() => handleDownload(attachment)}
                      disabled={downloading === attachment.id}
                      sx={{
                        p: 0.5,
                        color: '#666',
                        '&:hover': { backgroundColor: '#e8eaed' },
                      }}
                    >
                      {downloading === attachment.id ? (
                        <LinearProgress sx={{ width: 16, height: 16 }} />
                      ) : (
                        <DownloadIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                  
                  {onDelete && (
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(attachment.id)}
                        disabled={deleting === attachment.id}
                        sx={{
                          p: 0.5,
                          color: '#666',
                          '&:hover': { backgroundColor: '#e8eaed' },
                        }}
                      >
                        {deleting === attachment.id ? (
                          <LinearProgress sx={{ width: 16, height: 16 }} />
                        ) : (
                          <DeleteIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default AttachmentList;
