import React from 'react';
import {
  Box,
  Chip,
  IconButton,
  Typography,
  Tooltip,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Error as ErrorIcon,
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
}

const AttachmentList: React.FC<AttachmentListProps> = ({
  attachments,
  userId,
  onDelete,
  showActions = true,
  compact = false,
}) => {
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

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
    </Box>
  );
};

export default AttachmentList;
