import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Toolbar,
  Chip,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Badge,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Inbox as InboxIcon,
  Send as SendIcon,
  Drafts as DraftsIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  Archive as ArchiveIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import EmailList from './EmailList';
import ComposeEmail from './ComposeEmail';
import { RootState } from '../../store';

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

interface Folder {
  id: string;
  name: string;
  email_count: number;
  unread_count: number;
  icon: string;
  color: string;
}

const EmailInterface: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  
  // State
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [currentFolder, setCurrentFolder] = useState('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mock folders - in real app, these would come from the mailbox service
  const folders: Folder[] = [
    { id: 'inbox', name: 'Inbox', email_count: 0, unread_count: 0, icon: 'inbox', color: '#4285f4' },
    { id: 'starred', name: 'Starred', email_count: 0, unread_count: 0, icon: 'star', color: '#ffd700' },
    { id: 'sent', name: 'Sent', email_count: 0, unread_count: 0, icon: 'send', color: '#34a853' },
    { id: 'drafts', name: 'Drafts', email_count: 0, unread_count: 0, icon: 'drafts', color: '#fbbc04' },
    { id: 'trash', name: 'Trash', email_count: 0, unread_count: 0, icon: 'delete', color: '#ea4335' },
  ];

  // Load emails when component mounts or folder changes
  useEffect(() => {
    loadEmails();
  }, [currentFolder, searchQuery]);

  const loadEmails = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Mock API call - replace with actual API
      const response = await fetch(`/api/emails?folder=${currentFolder}&search=${searchQuery}&user_id=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setEmails(data.emails || []);
      } else {
        throw new Error('Failed to load emails');
      }
    } catch (err) {
      console.error('Error loading emails:', err);
      setError('Failed to load emails');
      // For demo purposes, show mock data
      setEmails([
        {
          id: '1',
          subject: 'Welcome to Gmail Clone',
          body: 'This is a welcome email to test the email interface.',
          from_address: { email: 'admin@example.com', name: 'Admin' },
          to_addresses: [{ email: user?.email || '' }],
          is_read: false,
          is_starred: false,
          status: 'received',
          priority: 'normal',
          created_at: new Date().toISOString(),
          attachments: [],
        },
        {
          id: '2',
          subject: 'Test Email with High Priority',
          body: 'This is a test email with high priority to demonstrate the priority system.',
          from_address: { email: 'test@example.com', name: 'Test User' },
          to_addresses: [{ email: user?.email || '' }],
          is_read: true,
          is_starred: true,
          status: 'received',
          priority: 'high',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          attachments: [{ id: '1', filename: 'document.pdf', size: 1024000 }],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSelect = (emailId: string, selected: boolean) => {
    if (selected) {
      setSelectedEmails(prev => [...prev, emailId]);
    } else {
      setSelectedEmails(prev => prev.filter(id => id !== emailId));
    }
  };

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
  };

  const handleStarToggle = async (emailId: string) => {
    try {
      // Mock API call
      const response = await fetch(`/api/emails/${emailId}/star?user_id=${user?.id}`, {
        method: 'PUT',
      });
      
      if (response.ok) {
        setEmails(prev => prev.map(email => 
          email.id === emailId 
            ? { ...email, is_starred: !email.is_starred }
            : email
        ));
      }
    } catch (err) {
      console.error('Error toggling star:', err);
    }
  };

  const handleDeleteEmail = async (emailId: string) => {
    try {
      // Mock API call
      const response = await fetch(`/api/emails/${emailId}?user_id=${user?.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setEmails(prev => prev.filter(email => email.id !== emailId));
        setSelectedEmails(prev => prev.filter(id => id !== emailId));
      }
    } catch (err) {
      console.error('Error deleting email:', err);
    }
  };

  const handleMarkAsRead = async (emailId: string, isRead: boolean) => {
    try {
      // Mock API call
      const response = await fetch(`/api/emails/${emailId}/read?is_read=${isRead}&user_id=${user?.id}`, {
        method: 'PUT',
      });
      
      if (response.ok) {
        setEmails(prev => prev.map(email => 
          email.id === emailId 
            ? { ...email, is_read: isRead }
            : email
        ));
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleSendEmail = async (emailData: any) => {
    try {
      // Mock API call
      const response = await fetch(`/api/emails/compose?user_id=${user?.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...emailData,
          save_as_draft: false,
        }),
      });
      
      if (response.ok) {
        await loadEmails();
      } else {
        throw new Error('Failed to send email');
      }
    } catch (err) {
      console.error('Error sending email:', err);
      throw err;
    }
  };

  const handleSaveDraft = async (emailData: any) => {
    try {
      // Mock API call
      const response = await fetch(`/api/emails/compose?user_id=${user?.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...emailData,
          save_as_draft: true,
        }),
      });
      
      if (response.ok) {
        await loadEmails();
      } else {
        throw new Error('Failed to save draft');
      }
    } catch (err) {
      console.error('Error saving draft:', err);
      throw err;
    }
  };

  const getFolderIcon = (iconName: string) => {
    switch (iconName) {
      case 'inbox':
        return <InboxIcon />;
      case 'star':
        return <StarIcon />;
      case 'send':
        return <SendIcon />;
      case 'drafts':
        return <DraftsIcon />;
      case 'delete':
        return <DeleteIcon />;
      default:
        return <InboxIcon />;
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<AddIcon />}
            onClick={() => setComposeOpen(true)}
          >
            Compose
          </Button>
        </Box>
        
        <Divider />
        
        <List>
          {folders.map((folder) => (
            <ListItem key={folder.id} disablePadding>
              <ListItemButton
                selected={currentFolder === folder.id}
                onClick={() => setCurrentFolder(folder.id)}
              >
                <ListItemIcon>
                  <Badge badgeContent={folder.unread_count} color="error">
                    {getFolderIcon(folder.icon)}
                  </Badge>
                </ListItemIcon>
                <ListItemText 
                  primary={folder.name}
                  secondary={`${folder.email_count} emails`}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {folders.find(f => f.id === currentFolder)?.name || 'Inbox'}
            </Typography>
            
            <IconButton onClick={loadEmails} disabled={loading}>
              <RefreshIcon />
            </IconButton>
            
            <IconButton>
              <MoreIcon />
            </IconButton>
          </Box>

          <TextField
            fullWidth
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Paper>

        {/* Email List */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          )}
          
          <EmailList
            emails={emails}
            selectedEmails={selectedEmails}
            onEmailSelect={handleEmailSelect}
            onEmailClick={handleEmailClick}
            onStarToggle={handleStarToggle}
            onDeleteEmail={handleDeleteEmail}
            onMarkAsRead={handleMarkAsRead}
            loading={loading}
          />
        </Box>
      </Box>

      {/* Compose Dialog */}
      <ComposeEmail
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSend={handleSendEmail}
        onSaveDraft={handleSaveDraft}
      />
    </Box>
  );
};

export default EmailInterface; 