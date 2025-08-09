import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Avatar,
  Button,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Report as ReportIcon,
  Delete as DeleteIcon,
  Mail as MailIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  SentimentSatisfied as EmojiIcon,
  Reply as ReplyIcon,
  Forward as ForwardIcon,
  KeyboardArrowLeft as ChevronLeftIcon,
  KeyboardArrowRight as ChevronRightIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from '@mui/icons-material';
import { Email } from '../../types/email';

interface EmailViewProps {
  email: Email;
  onClose: () => void;
  onReply: (email: Email) => void;
  onForward: (email: Email) => void;
  onStarToggle: (emailId: string) => void;
  onDelete: (emailId: string) => void;
  onMarkAsRead: (emailId: string, isRead: boolean) => void;
  currentIndex?: number;
  totalEmails?: number;
  onPrevious?: () => void;
  onNext?: () => void;
}

const EmailView: React.FC<EmailViewProps> = ({
  email,
  onClose,
  onReply,
  onForward,
  onStarToggle,
  onDelete,
  onMarkAsRead,
  currentIndex,
  totalEmails,
  onPrevious,
  onNext,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })} (${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago)`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      '#f28b82', '#fb8c00', '#fdd663', '#ccff90', '#a7ffeb',
      '#aecbfa', '#cbb0fb', '#fbb2d6', '#e8c5a0', '#e6c9a8'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getRecipientFirstName = () => {
    if (email.to_addresses && email.to_addresses.length > 0) {
      const firstRecipient = email.to_addresses[0];
      if (firstRecipient.name) {
        // Extract first name from full name
        return firstRecipient.name.split(' ')[0];
      } else {
        // Use email if no name available
        return firstRecipient.email.split('@')[0];
      }
    }
    return 'me';
  };

  const getSenderDisplayName = () => {
    const name = email.from_address.name;
    const email_addr = email.from_address.email;
    
    if (name) {
      return `${name} <${email_addr}>`;
    } else {
      return email_addr;
    }
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#fff',
    }}>
      {/* Top Navigation Bar */}
      <Box sx={{ 
        borderBottom: '1px solid #e8eaed',
        px: 2,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minHeight: 48,
        flexShrink: 0,
      }}>
        {/* Left side actions */}
        <Tooltip title="Back to inbox">
          <IconButton onClick={onClose} size="small" sx={{ color: '#5f6368' }}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Report spam">
          <IconButton size="small" sx={{ color: '#5f6368' }}>
            <ReportIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton 
            onClick={() => {
              onDelete(email.id);
              onClose(); // Return to email list after deleting
            }}
            size="small" 
            sx={{ color: '#5f6368' }}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={email.is_read ? "Mark as unread" : "Mark as read"}>
          <IconButton 
            onClick={() => {
              const markAsUnread = email.is_read; // If email is read, we're marking as unread
              onMarkAsRead(email.id, !email.is_read);
              
              // If marking as unread, return to email list
              if (markAsUnread) {
                onClose();
              }
            }}
            size="small" 
            sx={{ color: '#5f6368' }}
          >
            <MailIcon />
          </IconButton>
        </Tooltip>

        <Box sx={{ flexGrow: 1 }} />

        {/* Right side navigation */}
        {currentIndex !== undefined && totalEmails !== undefined && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '13px' }}>
              {currentIndex + 1} of {totalEmails.toLocaleString()}
            </Typography>
            <IconButton 
              onClick={onPrevious} 
              disabled={currentIndex === 0}
              size="small" 
              sx={{ color: '#5f6368' }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton 
              onClick={onNext} 
              disabled={currentIndex === totalEmails - 1}
              size="small" 
              sx={{ color: '#5f6368' }}
            >
              <ChevronRightIcon />
            </IconButton>
          </>
        )}
      </Box>

      {/* Email Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', px: 3, py: 2 }}>
        {/* Subject and Folder */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#202124' }}>
            {email.subject}
          </Typography>
          <Chip 
            label="Inbox" 
            size="small" 
            sx={{ 
              backgroundColor: '#f1f3f4',
              color: '#5f6368',
              fontSize: '12px',
              height: 24,
            }}
          />
        </Box>

        {/* Sender Info and Actions */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
          <Avatar 
            sx={{ 
              bgcolor: getAvatarColor(email.from_address.name || email.from_address.email),
              width: 40,
              height: 40,
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {getInitials(email.from_address.name || email.from_address.email)}
          </Avatar>
          
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#202124' }}>
                {getSenderDisplayName()}
              </Typography>
              <IconButton size="small" sx={{ color: '#5f6368', p: 0.5 }}>
                <ArrowDownIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '13px' }}>
              to {getRecipientFirstName()}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '13px' }}>
              {formatDate(email.created_at)}
            </Typography>
            <IconButton 
              onClick={() => onStarToggle(email.id)}
              size="small" 
              sx={{ color: '#5f6368' }}
            >
              {email.is_starred ? <StarIcon sx={{ color: '#fbbc04' }} /> : <StarBorderIcon />}
            </IconButton>
            <IconButton size="small" sx={{ color: '#5f6368' }}>
              <EmojiIcon />
            </IconButton>
            <IconButton 
              onClick={() => onReply(email)}
              size="small" 
              sx={{ color: '#5f6368' }}
            >
              <ReplyIcon />
            </IconButton>

          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Email Body */}
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#202124',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {email.body}
          </Typography>
        </Box>

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#202124' }}>
              Attachments ({email.attachments.length})
            </Typography>
            {email.attachments.map((attachment) => (
              <Box 
                key={attachment.id}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2, 
                  p: 2, 
                  border: '1px solid #e8eaed',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {attachment.filename}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ({(attachment.size / 1024).toFixed(1)} KB)
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Bottom Action Buttons */}
      <Box sx={{ 
        borderTop: '1px solid #e8eaed',
        px: 3,
        py: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexShrink: 0,
      }}>
        <Button
          variant="outlined"
          startIcon={<ReplyIcon />}
          onClick={() => onReply(email)}
          sx={{
            textTransform: 'none',
            borderRadius: '20px',
            px: 3,
            py: 1,
            borderColor: '#dadce0',
            color: '#5f6368',
            '&:hover': {
              borderColor: '#5f6368',
              backgroundColor: '#f8f9fa',
            },
          }}
        >
          Reply
        </Button>
        <Button
          variant="outlined"
          startIcon={<ForwardIcon />}
          onClick={() => onForward(email)}
          sx={{
            textTransform: 'none',
            borderRadius: '20px',
            px: 3,
            py: 1,
            borderColor: '#dadce0',
            color: '#5f6368',
            '&:hover': {
              borderColor: '#5f6368',
              backgroundColor: '#f8f9fa',
            },
          }}
        >
          Forward
        </Button>
        <IconButton sx={{ color: '#5f6368' }}>
          <EmojiIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default EmailView;
