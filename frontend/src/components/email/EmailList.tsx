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

interface Email {
  id: string;
  subject: string;
  body: string;
  from_address: {
    email: string;
    name?: string;
  };
  to_addresses: Array<{
    email: string;
    name?: string;
  }>;
  is_read: boolean;
  is_starred: boolean;
  status: string;
  priority: string;
  created_at: string;
  attachments: Array<{
    id: string;
    filename: string;
    size: number;
  }>;
}

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
    <List sx={{ width: '100%', bgcolor: 'background.paper', py: 0 }}>
      {emails.map((email, index) => (
        <React.Fragment key={email.id}>
          <Tooltip title={`Click to ${email.status === 'draft' ? 'edit' : 'view'} email`}>
            <ListItem
              sx={{
                backgroundColor: email.is_read ? 'background.paper' : '#f2f6fc',
                '&:hover': {
                  backgroundColor: '#f8f9fa',
                  boxShadow: 'inset 1px 0 0 #dadce0, inset -1px 0 0 #dadce0, 0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
                },
                cursor: 'pointer',
                px: 0,
                py: 0,
                minHeight: 40,
                borderBottom: '1px solid #f1f3f4',
              }}
              onClick={() => onEmailClick(email)}
            >
            {/* Checkbox */}
            <Box sx={{ px: 1, display: 'flex', alignItems: 'center' }}>
              <Checkbox
                checked={selectedEmails.includes(email.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  onEmailSelect(email.id, e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
                sx={{ 
                  color: '#5f6368',
                  '&.Mui-checked': {
                    color: '#1a73e8',
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
                  color: email.is_starred ? '#f4b400' : '#5f6368',
                  '&:hover': {
                    color: email.is_starred ? '#f4b400' : '#1a73e8',
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
                        color: email.is_read ? '#5f6368' : '#202124',
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
                         color: email.is_read ? '#5f6368' : '#202124',
                         fontSize: '14px',
                         overflow: 'hidden',
                         textOverflow: 'ellipsis',
                         whiteSpace: 'nowrap',
                         flexGrow: 1,
                       }}
                     >
                       {email.status === 'draft' && (
                         <span style={{ 
                           color: '	#FA8072', 
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
                         color: '#5f6368' 
                       }}>
                         {truncateText(email.body, 50)}
                       </span>
                       {email.attachments.length > 0 && (
                         <AttachmentIcon sx={{ fontSize: 16, color: '#5f6368', ml: 0.5, verticalAlign: 'middle' }} />
                       )}
                     </Typography>
                  </Box>
                  
                  <Typography
                    variant="body2"
                    sx={{
                      color: email.is_read ? '#5f6368' : '#202124',
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
                    sx={{ color: '#5f6368' }}
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
                  sx={{ color: '#5f6368' }}
                >
                  {email.is_read ? <MarkUnreadIcon /> : <MarkReadIcon />}
                </IconButton>
              </Tooltip>

              <Tooltip title="Archive">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement archive functionality
                  }}
                  size="small"
                  sx={{ color: '#5f6368' }}
                >
                  <ArchiveIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Delete">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteEmail(email.id);
                  }}
                  size="small"
                  sx={{ color: '#5f6368' }}
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