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
  Pagination,
  Checkbox,
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
  KeyboardArrowDown as ArrowDownIcon,
  Report as SpamIcon,
  KeyboardArrowLeft as ArrowLeftIcon,
  KeyboardArrowRight as ArrowRightIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import EmailList from './EmailList';
import ComposeEmail from './ComposeEmail';
import EmailView from './EmailView';
import { RootState } from '../../store';
import { config, API_ENDPOINTS } from '../../config/config';
import { useSidebar } from '../layout/Layout';
import { useSearch } from '../layout/Layout';
import { Email, Folder } from '../../types/email';


const EmailInterface: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { sidebarCollapsed } = useSidebar();
  const { searchQuery } = useSearch();
  
  // State
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [viewEmail, setViewEmail] = useState<Email | null>(null);
  const [error, setError] = useState<string | null>(null);

  // State for folders
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEmails, setTotalEmails] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [limit] = useState(50);

  // Reset page to 1 when folder or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentFolder, searchQuery]);

  // Load emails when component mounts, folder changes, or page changes
  useEffect(() => {
    if (user?.id && currentFolder) {
      setViewEmail(null); // Close email view when folder changes
      loadEmails();
    }
  }, [currentFolder, searchQuery, user?.id, currentPage]);

  // Load folders when component mounts or user changes
  useEffect(() => {
    loadFolders();
  }, [user?.id]);

  const loadFolders = async () => {
    // Don't load folders if user is not authenticated
    if (!user?.id) {
      setFolders([]);
      return;
    }
    
    setFoldersLoading(true);
    
    try {
      const response = await fetch(`${config.MAILBOX_SERVICE_URL}${API_ENDPOINTS.MAILBOX.FOLDERS}?user_id=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        const foldersData = data.folders || [];
        
        // Sort folders by folder_order, then by name for custom folders
        const sortedFolders = foldersData.sort((a: any, b: any) => {
          if (a.folder_order && b.folder_order) {
            return a.folder_order - b.folder_order;
          }
          if (a.folder_order && !b.folder_order) return -1;
          if (!a.folder_order && b.folder_order) return 1;
          return a.name.localeCompare(b.name);
        });
        
        setFolders(sortedFolders);
        
        // Set the first folder as current if no folder is selected
        if (!currentFolder && sortedFolders.length > 0) {
          setCurrentFolder(sortedFolders[0].id);
        }
      } else {
        throw new Error('Failed to load folders');
      }
    } catch (err) {
      console.error('Error loading folders:', err);
      // Fallback to default folders if API fails
      const fallbackFolders = [
        { id: 'inbox', name: 'Inbox', email_count: 0, unread_count: 0, icon: 'inbox', color: '#4285f4', folder_order: 1 },
        { id: 'starred', name: 'Starred', email_count: 0, unread_count: 0, icon: 'star', color: '#ffd700', folder_order: 2 },
        { id: 'sent', name: 'Sent', email_count: 0, unread_count: 0, icon: 'send', color: '#34a853', folder_order: 3 },
        { id: 'drafts', name: 'Drafts', email_count: 0, unread_count: 0, icon: 'drafts', color: '#fbbc04', folder_order: 4 },
        { id: 'spam', name: 'Spam', email_count: 0, unread_count: 0, icon: 'report', color: '#ff6b6b', folder_order: 5 },
        { id: 'trash', name: 'Trash', email_count: 0, unread_count: 0, icon: 'delete', color: '#ea4335', folder_order: 6 },
      ];
      setFolders(fallbackFolders);
      if (!currentFolder) {
        setCurrentFolder('inbox');
      }
    } finally {
      setFoldersLoading(false);
    }
  };

  const loadEmails = async () => {
    // Don't load emails if user is not authenticated or no folder is selected
    if (!user?.id || !currentFolder) {
      setEmails([]);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Find the folder name from the current folder ID
      const currentFolderData = folders.find(f => f.id === currentFolder);
      const folderName = currentFolderData?.name?.toLowerCase() || 'inbox';
      
      const response = await fetch(`${config.EMAIL_SERVICE_URL}${API_ENDPOINTS.EMAILS.LIST}?folder=${folderName}&search=${searchQuery}&user_id=${user.id}&page=${currentPage}&limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        setEmails(data.emails || []);
        setTotalEmails(data.total || 0);
        setHasMore(data.has_more || false);
      } else {
        throw new Error('Failed to load emails');
      }
    } catch (err) {
      console.error('Error loading emails:', err);
      setError('Failed to load emails');
      setEmails([]);
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

  const handleEmailClick = async (email: Email) => {
    // If it's a draft email, open compose dialog for editing
    if (email.status === 'draft') {
      setSelectedEmail(email);
      setComposeOpen(true);
    } else {
      // For non-draft emails, open the email view
      setViewEmail(email);
      
      // Automatically mark as read if not already read
      if (!email.is_read) {
        // Update viewed email immediately for responsive UI
        setViewEmail(prev => prev ? { ...prev, is_read: true } : { ...email, is_read: true });
        
        // Then call the API in the background
        handleMarkAsRead(email.id, true).catch(err => {
          console.error('Failed to mark as read:', err);
          // Revert on error
          setViewEmail(prev => prev ? { ...prev, is_read: false } : null);
        });
      }
    }
  };

  const handleReplyToEmail = (email: Email) => {
    // Create a reply email with the original sender as recipient
    const replyEmail = {
      ...email,
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      to_addresses: [email.from_address], // Reply to the original sender
      body: `\n\n--- Original Message ---\nFrom: ${email.from_address.name || email.from_address.email}\nDate: ${new Date(email.created_at).toLocaleString()}\nSubject: ${email.subject}\n\n${email.body}`,
    };
    setSelectedEmail(replyEmail);
    setComposeOpen(true);
  };

  const handleForwardEmail = (email: Email) => {
    // Create a forward email
    const forwardEmail = {
      ...email,
      subject: email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`,
      to_addresses: [], // Empty for forwarding
      body: `\n\n--- Forwarded Message ---\nFrom: ${email.from_address.name || email.from_address.email}\nDate: ${new Date(email.created_at).toLocaleString()}\nSubject: ${email.subject}\n\n${email.body}`,
    };
    setSelectedEmail(forwardEmail);
    setComposeOpen(true);
  };

  const handleStarToggle = async (emailId: string) => {
    try {
      const response = await fetch(`${config.EMAIL_SERVICE_URL}${API_ENDPOINTS.EMAILS.MARK_STAR.replace('{id}', emailId)}?user_id=${user?.id}`, {
        method: 'PUT',
      });
      
      if (response.ok) {
        setEmails(prev => prev.map(email => 
          email.id === emailId 
            ? { ...email, is_starred: !email.is_starred }
            : email
        ));
        await loadFolders(); // Refresh folder counts
      }
    } catch (err) {
      console.error('Error toggling star:', err);
    }
  };

  const handleDeleteEmail = async (emailId: string) => {
    try {
      const response = await fetch(`${config.EMAIL_SERVICE_URL}${API_ENDPOINTS.EMAILS.DELETE.replace('{id}', emailId)}?user_id=${user?.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setEmails(prev => prev.filter(email => email.id !== emailId));
        setSelectedEmails(prev => prev.filter(id => id !== emailId));
        await loadFolders(); // Refresh folder counts
      }
    } catch (err) {
      console.error('Error deleting email:', err);
    }
  };

  const handleMarkAsRead = async (emailId: string, isRead: boolean) => {
    try {
      const response = await fetch(`${config.EMAIL_SERVICE_URL}${API_ENDPOINTS.EMAILS.MARK_READ.replace('{id}', emailId)}?is_read=${isRead}&user_id=${user?.id}`, {
        method: 'PUT',
      });
      
      if (response.ok) {
        setEmails(prev => prev.map(email => 
          email.id === emailId 
            ? { ...email, is_read: isRead }
            : email
        ));
        await loadFolders(); // Refresh folder counts to update unread count
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleSendEmail = async (emailData: any) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    try {
      const endpoint = selectedEmail 
        ? `${config.EMAIL_SERVICE_URL}${API_ENDPOINTS.EMAILS.UPDATE.replace('{id}', selectedEmail.id)}?user_id=${user.id}`
        : `${config.EMAIL_SERVICE_URL}${API_ENDPOINTS.EMAILS.COMPOSE}?user_id=${user.id}`;
      
      const method = selectedEmail ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
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
        await loadFolders(); // Refresh folder counts
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to send email');
      }
    } catch (err) {
      console.error('Error sending email:', err);
      throw err;
    }
  };

  const handleSaveDraft = async (emailData: any) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    try {
      const endpoint = selectedEmail 
        ? `${config.EMAIL_SERVICE_URL}${API_ENDPOINTS.EMAILS.UPDATE.replace('{id}', selectedEmail.id)}?user_id=${user.id}`
        : `${config.EMAIL_SERVICE_URL}${API_ENDPOINTS.EMAILS.COMPOSE}?user_id=${user.id}`;
      
      const method = selectedEmail ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
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
        await loadFolders(); // Refresh folder counts
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to save draft');
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
      case 'snoozed':
        return <ScheduleIcon />;
      case 'send':
        return <SendIcon />;
      case 'drafts':
        return <DraftsIcon />;
      case 'spam':
        return <SpamIcon />;
      case 'delete':
        return <DeleteIcon />;
      default:
        return <InboxIcon />;
    }
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };

  const totalPages = Math.ceil(totalEmails / limit);

  // Don't render if user is not authenticated
  if (!user?.id) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Please log in to access your emails
        </Typography>
      </Box>
    );
  }



  return (
    <Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* Gmail-style Sidebar */}
      <Box
        sx={{
          width: sidebarCollapsed ? 72 : 256,
          backgroundColor: '#f6f8fa',
          borderRight: '1px solid #e8eaed',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          transition: 'width 0.2s ease-in-out',
        }}
      >
        {/* Compose Button */}
        <Box sx={{ p: sidebarCollapsed ? 1 : 2, pt: sidebarCollapsed ? 1 : 2 }}>
          <Button
            variant="contained"
            // fullWidth
            startIcon={!sidebarCollapsed && <AddIcon />}
            onClick={() => setComposeOpen(true)}
            sx={{
              backgroundColor: '#c2e7ff',
              color: '#001d35',
              textTransform: 'none',
              borderRadius: '16px',
              height: 48,
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
              '&:hover': {
                backgroundColor: '#a8dadc',
                boxShadow: '0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)',
              },
              minWidth: sidebarCollapsed ? 48 : 'auto',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            }}
          >
            {sidebarCollapsed ? <AddIcon /> : 'Compose'}
          </Button>
        </Box>

        {/* Folder List */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', mt: 1 }}>
          <List sx={{ py: 0 }}>
            {folders.map((folder) => (
              <ListItem key={folder.id} disablePadding>
                <ListItemButton
                  selected={currentFolder === folder.id}
                  onClick={() => {
                    setCurrentFolder(folder.id);
                    setViewEmail(null); // Close email view when switching folders
                  }}
                  sx={{
                    mx: sidebarCollapsed ? 1 : 1,
                    borderRadius: sidebarCollapsed ? '100%' : '0 16px 16px 0',
                    height: 32,
                    minWidth: sidebarCollapsed ? 48 : 'auto',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    '&.Mui-selected': {
                      backgroundColor: '#d3e3fd',
                      '&:hover': {
                        backgroundColor: '#c2d7f5',
                      },
                    },
                    '&:hover': {
                      backgroundColor: '#f1f3f4',
                    },
                  }}
                >
                                     <ListItemIcon sx={{ 
                     minWidth: sidebarCollapsed ? 24 : 40, 
                     color: currentFolder === folder.id ? '#202124' : '#5f6368',
                     justifyContent: 'center',
                     fontSize: sidebarCollapsed ? '18px' : '18px'
                   }}>
                    {getFolderIcon(folder.icon)}
                  </ListItemIcon>
                  {!sidebarCollapsed && (
                    <>
                      <ListItemText 
                        primary={folder.name}
                                                 primaryTypographyProps={{
                           fontSize: '14px',
                           fontWeight: currentFolder === folder.id ? 600 : 400,
                           color: currentFolder === folder.id ? '#202124' : '#202124',
                         }}
                      />
                                             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                         {/* Total email count - only show if > 0 */}
                         {folder.email_count > 0 && (
                           <Typography
                             variant="body2"
                             sx={{
                               fontSize: '12px',
                               color: currentFolder === folder.id ? '#202124' : '#5f6368',
                               fontWeight: currentFolder === folder.id ? 600 : 400,
                             }}
                           >
                             {folder.email_count.toLocaleString()}
                           </Typography>
                         )}
                         {/* Unread count badge */}
                         {folder.unread_count > 0 && (
                           <Badge 
                             badgeContent={folder.unread_count} 
                             color="primary"
                             sx={{
                               '& .MuiBadge-badge': {
                                 backgroundColor: '#1a73e8',
                                 fontSize: '12px',
                                 fontWeight: 500,
                               }
                             }}
                           />
                         )}
                       </Box>
                    </>
                  )}
                </ListItemButton>
              </ListItem>
            ))}
            
            {/* More option */}
            <ListItem disablePadding>
              <ListItemButton
                sx={{
                  mx: sidebarCollapsed ? 0.5 : 1,
                  borderRadius: sidebarCollapsed ? '50%' : '0 16px 16px 0',
                  height: 32,
                  minWidth: sidebarCollapsed ? 48 : 'auto',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  '&:hover': {
                    backgroundColor: '#f1f3f4',
                  },
                }}
              >
                <ListItemIcon sx={{ 
                  minWidth: sidebarCollapsed ? 24 : 40, 
                  color: '#5f6368',
                  justifyContent: 'center',
                  fontSize: sidebarCollapsed ? '20px' : '18px'
                }}>
                  <ArrowDownIcon />
                </ListItemIcon>
                {!sidebarCollapsed && (
                  <ListItemText 
                    primary="More"
                    primaryTypographyProps={{
                      fontSize: '14px',
                      fontWeight: 400,
                      color: '#202124',
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Box>

             {/* Main Content Area */}
       <Box sx={{ 
         flexGrow: 1, 
         display: 'flex', 
         flexDirection: 'column',
         minWidth: 0, // Prevents flex item from overflowing
         height: '100%',
       }}>
         {viewEmail ? (
           // Email View Mode
           <EmailView
             email={viewEmail}
             onClose={() => setViewEmail(null)}
             onReply={handleReplyToEmail}
             onForward={handleForwardEmail}
             onStarToggle={handleStarToggle}
             onDelete={handleDeleteEmail}
             onMarkAsRead={handleMarkAsRead}
             currentIndex={emails.findIndex(e => e.id === viewEmail.id)}
             totalEmails={totalEmails}
             onPrevious={() => {
               const currentIndex = emails.findIndex(e => e.id === viewEmail.id);
               if (currentIndex > 0) {
                 setViewEmail(emails[currentIndex - 1]);
               }
             }}
             onNext={() => {
               const currentIndex = emails.findIndex(e => e.id === viewEmail.id);
               if (currentIndex < emails.length - 1) {
                 setViewEmail(emails[currentIndex + 1]);
               }
             }}
           />
         ) : (
           // Email List Mode
           <>
             {/* Email List Toolbar - Gmail Style */}
             <Box sx={{ 
               borderBottom: '1px solid #e8eaed',
               backgroundColor: '#fff',
               px: 2,
               py: 1,
               display: 'flex',
               alignItems: 'center',
               gap: 1,
               minHeight: 48,
               flexShrink: 0, // Prevents toolbar from shrinking
             }}>
               {/* Checkbox with dropdown - Gmail positioning */}
               <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                 <Checkbox
                   checked={selectedEmails.length === emails.length && emails.length > 0}
                   indeterminate={selectedEmails.length > 0 && selectedEmails.length < emails.length}
                   onChange={(e) => {
                     if (e.target.checked) {
                       setSelectedEmails(emails.map(email => email.id));
                     } else {
                       setSelectedEmails([]);
                     }
                   }}
                   sx={{ 
                     color: '#5f6368',
                     padding: '8px',
                     '&.Mui-checked': {
                       color: '#1a73e8',
                     }
                   }}
                 />
                 <IconButton 
                   size="small" 
                   sx={{ 
                     color: '#5f6368', 
                     padding: '4px',
                     marginLeft: '-4px',
                     marginRight: '4px'
                   }}
                 >
                   <ArrowDownIcon sx={{ fontSize: 16 }} />
                 </IconButton>
               </Box>

               {/* Refresh button */}
               <IconButton 
                 onClick={loadEmails} 
                 disabled={loading} 
                 size="small" 
                 sx={{ 
                   color: '#5f6368',
                   padding: '8px'
                 }}
               >
                 <RefreshIcon />
               </IconButton>

               {/* More options */}
               <IconButton 
                 size="small" 
                 sx={{ 
                   color: '#5f6368',
                   padding: '8px'
                 }}
               >
                 <MoreIcon />
               </IconButton>
               
               <Box sx={{ flexGrow: 1 }} />
               
               {/* Pagination text */}
               <Typography variant="body2" color="text.secondary" sx={{ mr: 1, fontSize: '13px', fontWeight: 500 }}>
                 {totalEmails > 0 ? `${(currentPage - 1) * limit + 1}-${Math.min(currentPage * limit, totalEmails)} of ${totalEmails.toLocaleString()}` : '0 of 0'}
               </Typography>
               
               {/* Navigation arrows */}
               <IconButton size="small" disabled={currentPage === 1} sx={{ color: '#5f6368' }}>
                 <ArrowLeftIcon />
               </IconButton>
               <IconButton size="small" disabled={currentPage >= totalPages} sx={{ color: '#5f6368' }}>
                 <ArrowRightIcon />
               </IconButton>
             </Box>

             {/* Email List Container */}
             <Box sx={{ 
               flexGrow: 1, 
               overflow: 'hidden', // Changed from 'auto' to 'hidden'
               backgroundColor: '#fff',
               display: 'flex',
               flexDirection: 'column',
             }}>
               {error && (
                 <Alert severity="error" sx={{ m: 2, flexShrink: 0 }}>
                   {error}
                 </Alert>
               )}
               
               {/* Email List - Takes remaining space */}
               <Box sx={{ 
                 flexGrow: 1, 
                 overflow: 'auto',
                 minHeight: 0, // Important for flex child to shrink properly
               }}>
                 <EmailList
                   emails={emails}
                   selectedEmails={selectedEmails}
                   onEmailSelect={handleEmailSelect}
                   onEmailClick={handleEmailClick}
                   onReplyToEmail={handleReplyToEmail}
                   onStarToggle={handleStarToggle}
                   onDeleteEmail={handleDeleteEmail}
                   onMarkAsRead={handleMarkAsRead}
                   loading={loading}
                 />
               </Box>
             </Box>
           </>
         )}
       </Box>

      {/* Compose Dialog */}
             <ComposeEmail
         open={composeOpen}
         onClose={() => {
           setComposeOpen(false);
           setSelectedEmail(null); // Clear selected email when closing
           setViewEmail(null); // Also clear view email when closing compose
         }}
        onSend={handleSendEmail}
        onSaveDraft={handleSaveDraft}
        initialData={selectedEmail ? {
          subject: selectedEmail.subject,
          body: selectedEmail.body,
          to_addresses: selectedEmail.to_addresses.map(addr => addr.email),
          cc_addresses: [], // You might want to add cc/bcc fields to your Email type
          bcc_addresses: [],
          priority: selectedEmail.priority as any,
          attachments: [], // You might want to handle existing attachments
        } : undefined}
      />
    </Box>
  );
};

export default EmailInterface; 