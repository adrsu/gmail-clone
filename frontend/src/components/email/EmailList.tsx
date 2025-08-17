import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Chip,
  Box,
  Checkbox,
  Tooltip,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  MarkEmailRead as MarkReadIcon,
  MarkEmailUnread as MarkUnreadIcon,
  AttachFile as AttachmentIcon,
  Reply as ReplyIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { Email } from '../../types/email';

interface EmailListProps {
  emails: Email[];
  selectedEmails: string[];
  onEmailSelect: (emailId: string, selected: boolean) => void;
  onEmailClick: (email: Email) => void;
  onReplyToEmail?: (email: Email) => void;
  onStarToggle: (emailId: string) => void;
  onDeleteEmail: (emailId: string) => void;
  onMarkAsRead: (emailId: string, isRead: boolean) => void;
  loading?: boolean;
}

const EmailList: React.FC<EmailListProps> = ({
  emails,
  selectedEmails,
  onEmailSelect,
  onEmailClick,
  onReplyToEmail,
  onStarToggle,
  onDeleteEmail,
  onMarkAsRead,
  loading = false,
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'urgent':
        return 'error';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'High';
      case 'urgent':
        return 'Urgent';
      case 'low':
        return 'Low';
      default:
        return 'Normal';
    }
  };

  const formatEmailAddress = (address: { email: string; name?: string }) => {
    return address.name || address.email;
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return format(date, 'h:mm');
    } else if (diffInHours < 24 * 7) {
      return format(date, 'd MMM');
    } else {
      return format(date, 'd MMM');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading emails...</Typography>
      </Box>
    );
  }

  if (emails.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="textSecondary">
          No emails found
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ width: '100%', bgcolor: 'transparent', py: 0 }}>
      {emails.map((email, index) => (
        <React.Fragment key={email.id}>
          <Tooltip title={`Click to ${email.status === 'draft' ? 'edit' : 'view'} email`}>
            <ListItem
              sx={{
                backgroundColor: email.is_read ? 'rgba(0, 0, 0, 0.2)' : 'rgba(100, 181, 246, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  boxShadow: 'inset 1px 0 0 rgba(255, 255, 255, 0.1), inset -1px 0 0 rgba(255, 255, 255, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15)',
                },
                cursor: 'pointer',
                px: 0,
                py: 0,
                minHeight: 40,
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              }}
              onClick={() => onEmailClick(email)}
            >
            {/* Checkbox */}
            <Box sx={{ px: 1.9, display: 'flex', alignItems: 'center' }}>
              <Checkbox
                checked={selectedEmails.includes(email.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  onEmailSelect(email.id, e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.6)',
                  '&.Mui-checked': {
                    color: '#64b5f6',
                  }
                }}
              />
            </Box>

            {/* Star */}
            <Box sx={{ px: 1, display: 'flex', alignItems: 'center' }}>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onStarToggle(email.id);
                }}
                size="small"
                sx={{ 
                  color: email.is_starred ? '#f4b400' : 'rgba(255, 255, 255, 0.6)',
                  '&:hover': {
                    color: email.is_starred ? '#f4b400' : '#64b5f6',
                  }
                }}
              >
                {email.is_starred ? <StarIcon /> : <StarBorderIcon />}
              </IconButton>
            </Box>

            {/* Email Content - Gmail Style Layout */}
            <Box sx={{ flexGrow: 1, py: 1, px: 1, display: 'flex', alignItems: 'center' }}>
              {/* Email Details - Single Line Format */}
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                {/* Single Line: Sender - Subject - Body */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: email.is_read ? 400 : 600,
                        color: email.is_read ? 'rgba(255, 255, 255, 0.7)' : '#ffffff',
                        fontSize: '14px',
                        mr: 2,
                        flexShrink: 0,
                      }}
                    >
                      {formatEmailAddress(email.from_address)}
                    </Typography>
                    
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: email.is_read ? 400 : 600,
                        color: email.is_read ? 'rgba(255, 255, 255, 0.7)' : '#ffffff',
                        fontSize: '14px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flexGrow: 1,
                      }}
                    >
                      {email.status === 'draft' && (
                        <span style={{ 
                          color: '#FA8072', 
                          fontWeight: 600,
                          marginRight: '4px'
                        }}>
                          Draft 
                        </span>
                      )}
                      {/* {email.status === 'sent' && (
                        <span style={{ 
                          color: '#34a853', 
                          fontWeight: 600,
                          marginRight: '4px'
                        }}>
                          [Sent] 
                        </span>
                      )} */}
                      {email.subject} -{' '}
                      <span style={{ 
                        fontWeight: 400, 
                        color: 'rgba(255, 255, 255, 0.6)' 
                      }}>
                        {truncateText(email.body, 50)}
                      </span>
                      {email.attachments.length > 0 && (
                        <AttachmentIcon sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.6)', ml: 0.5, verticalAlign: 'middle' }} />
                      )}
                    </Typography>
                  </Box>
                  
                  <Typography
                    variant="body2"
                    sx={{
                      color: email.is_read ? 'rgba(255, 255, 255, 0.6)' : '#ffffff',
                      fontSize: '14px',
                      fontWeight: email.is_read ? 400 : 600,
                      minWidth: 'fit-content',
                      ml: 2,
                    }}
                  >
                    {formatDate(email.created_at)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Action Buttons - Hidden by default, shown on hover */}
            <Box sx={{ 
              display: 'flex', 
              gap: 0.5, 
              opacity: 0, 
              '&:hover': { opacity: 1 },
              transition: 'opacity 0.2s ease-in-out',
              px: 1
            }}>
              {onReplyToEmail && (
                <Tooltip title="Reply">
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      onReplyToEmail(email);
                    }}
                    size="small"
                    sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
                  >
                    <ReplyIcon />
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title={email.is_read ? 'Mark as unread' : 'Mark as read'}>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(email.id, !email.is_read);
                  }}
                  size="small"
                  sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
                >
                  {email.is_read ? <MarkUnreadIcon /> : <MarkReadIcon />}
                </IconButton>
              </Tooltip>

              {/* <Tooltip title="Archive">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement archive functionality
                  }}
                  size="small"
                  sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
                >
                  <ArchiveIcon />
                </IconButton>
              </Tooltip> */}

              <Tooltip title="Delete">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteEmail(email.id);
                  }}
                  size="small"
                  sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </ListItem>
          </Tooltip>
        </React.Fragment>
      ))}
    </List>
  );
};

export default EmailList; 