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
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  MarkEmailRead as MarkReadIcon,
  MarkEmailUnread as MarkUnreadIcon,
  AttachFile as AttachmentIcon,
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
    <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
      {emails.map((email, index) => (
        <React.Fragment key={email.id}>
          <ListItem
            sx={{
              backgroundColor: email.is_read ? 'background.paper' : 'action.hover',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
              cursor: 'pointer',
            }}
            onClick={() => onEmailClick(email)}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Checkbox
                checked={selectedEmails.includes(email.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  onEmailSelect(email.id, e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </ListItemIcon>

            <ListItemIcon sx={{ minWidth: 40 }}>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onStarToggle(email.id);
                }}
                size="small"
              >
                {email.is_starred ? (
                  <StarIcon sx={{ color: 'warning.main' }} />
                ) : (
                  <StarBorderIcon />
                )}
              </IconButton>
            </ListItemIcon>

            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: email.is_read ? 'normal' : 'bold',
                      flex: 1,
                    }}
                  >
                    {formatEmailAddress(email.from_address)}
                  </Typography>
                  {email.priority !== 'normal' && (
                    <Chip
                      label={getPriorityLabel(email.priority)}
                      size="small"
                      color={getPriorityColor(email.priority) as any}
                      variant="outlined"
                    />
                  )}
                  {email.attachments.length > 0 && (
                    <AttachmentIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  )}
                </Box>
              }
              secondary={
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: email.is_read ? 'normal' : 'bold',
                      color: 'text.primary',
                    }}
                  >
                    {email.subject}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    {truncateText(email.body)}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 0.5, display: 'block' }}
                  >
                    {format(new Date(email.created_at), 'MMM d, yyyy h:mm a')}
                  </Typography>
                </Box>
              }
            />

            <ListItemSecondaryAction>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title={email.is_read ? 'Mark as unread' : 'Mark as read'}>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsRead(email.id, !email.is_read);
                    }}
                    size="small"
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
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </ListItemSecondaryAction>
          </ListItem>
          {index < emails.length - 1 && <Divider />}
        </React.Fragment>
      ))}
    </List>
  );
};

export default EmailList; 