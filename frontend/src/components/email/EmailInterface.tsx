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
  Menu,
  MenuItem,
  Tooltip,
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
  MarkEmailRead as MarkEmailReadIcon,
  MarkEmailUnread as MarkEmailUnreadIcon,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import EmailList from './EmailList';
import ComposeEmail from './ComposeEmail';
import EmailView from './EmailView';
import { RootState } from '../../store';
import { config, API_ENDPOINTS } from '../../config/config';
import { useSidebar } from '../layout/Layout';
import { useSearch } from '../layout/Layout';
import { Email, Folder } from '../../types/email';
import { 
  cacheEmails, 
  setLoading as setEmailLoading, 
  updateEmailInCache, 
  removeEmailFromCache,
  clearFolderCache,
  setError as setEmailError 
} from '../../store/slices/emailSlice';


const EmailInterface: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { cache, loading: emailLoading } = useSelector((state: RootState) => state.email);
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
  const [limit] = useState(20);

  // State for selection dropdown
  const [selectionMenuAnchor, setSelectionMenuAnchor] = useState<null | HTMLElement>(null);

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

  // Periodic refresh for frequently updated folders
  useEffect(() => {
    if (!user?.id || !currentFolder) return;

    // Only set up periodic refresh for sent and drafts folders
    if (currentFolder === 'sent' || currentFolder === 'drafts') {
      const interval = setInterval(() => {
        // Only refresh if we're not currently loading and no search is active
        if (!loading && !searchQuery) {
          loadEmails(true);
        }
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [currentFolder, user?.id, loading, searchQuery]);

  // Preload adjacent folders when current folder changes
  useEffect(() => {
    if (currentFolder && folders.length > 0 && user?.id) {
      const currentIndex = folders.findIndex(f => f.id === currentFolder);
      if (currentIndex !== -1) {
        // Preload next folder
        if (currentIndex + 1 < folders.length) {
          preloadFolder(folders[currentIndex + 1].id);
        }
        // Preload previous folder
        if (currentIndex - 1 >= 0) {
          preloadFolder(folders[currentIndex - 1].id);
        }
      }
    }
  }, [currentFolder, folders, user?.id]);

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
        
        // Sort folders in desired order: Inbox, Starred, Sent, Drafts, Spam, Trash, then custom folders
        const systemFolderOrder = ['Inbox', 'Starred', 'Sent', 'Drafts', 'Spam', 'Trash'];
        const sortedFolders = foldersData.sort((a: any, b: any) => {
          // System folders first, in the defined order
          if (a.type === 'system' && b.type === 'system') {
            const aOrder = systemFolderOrder.indexOf(a.name);
            const bOrder = systemFolderOrder.indexOf(b.name);
            if (aOrder !== -1 && bOrder !== -1) {
              return aOrder - bOrder;
            }
            if (aOrder !== -1) return -1;
            if (bOrder !== -1) return 1;
          }
          // System folders before custom folders
          if (a.type === 'system' && b.type !== 'system') return -1;
          if (a.type !== 'system' && b.type === 'system') return 1;
          // Custom folders sorted alphabetically
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
        { id: 'inbox', name: 'Inbox', email_count: 0, unread_count: 0, icon: 'inbox', color: '#4285f4', type: 'system' },
        { id: 'starred', name: 'Starred', email_count: 0, unread_count: 0, icon: 'star', color: '#ffd700', type: 'system' },
        { id: 'sent', name: 'Sent', email_count: 0, unread_count: 0, icon: 'send', color: '#34a853', type: 'system' },
        { id: 'drafts', name: 'Drafts', email_count: 0, unread_count: 0, icon: 'drafts', color: '#fbbc04', type: 'system' },
        { id: 'spam', name: 'Spam', email_count: 0, unread_count: 0, icon: 'report', color: '#ff6b6b', type: 'system' },
        { id: 'trash', name: 'Trash', email_count: 0, unread_count: 0, icon: 'delete', color: '#ea4335', type: 'system' },
      ];
      setFolders(fallbackFolders);
      if (!currentFolder) {
        setCurrentFolder('inbox');
      }
    } finally {
      setFoldersLoading(false);
    }
  };

  const preloadFolder = async (folderId: string) => {
    // Only preload if not already cached or cache is stale (older than 5 minutes)
    const cached = cache[folderId];
    if (!cached || Date.now() - cached.lastFetched > 5 * 60 * 1000) {
      try {
        const folderData = folders.find(f => f.id === folderId);
        const folderName = folderData?.name?.toLowerCase() || 'inbox';
        
        const response = await fetch(
          `${config.EMAIL_SERVICE_URL}${API_ENDPOINTS.EMAILS.LIST}?folder=${folderName}&user_id=${user?.id}&page=1&limit=${limit}`
        );
        
        if (response.ok) {
          const data = await response.json();
          dispatch(cacheEmails({
            folderId,
            emails: data.emails || [],
            total: data.total || 0,
            hasMore: data.has_more || false,
            page: 1,
          }));
        }
      } catch (error) {
        console.error('Preload failed for folder:', folderId, error);
      }
    }
  };

  const loadEmails = async (forceRefresh = false) => {
    // Don't load emails if user is not authenticated or no folder is selected
    if (!user?.id || !currentFolder) {
      setEmails([]);
      return;
    }

    // Check if we have cached data and it's fresh (less than 5 minutes old)
    const cached = cache[currentFolder];
    if (!forceRefresh && cached && Date.now() - cached.lastFetched < 5 * 60 * 1000 && !searchQuery && currentPage === 1) {
      // Use cached data immediately for instant switching
      setEmails(cached.emails);
      setTotalEmails(cached.total);
      setHasMore(cached.hasMore);
      return;
    }

    // Load fresh data
    dispatch(setEmailLoading(true));
    setLoading(true);
    setError(null);

    try {
      const currentFolderData = folders.find(f => f.id === currentFolder);
      const folderName = currentFolderData?.name?.toLowerCase() || 'inbox';
      
      const response = await fetch(
        `${config.EMAIL_SERVICE_URL}${API_ENDPOINTS.EMAILS.LIST}?folder=${folderName}&search=${searchQuery}&user_id=${user.id}&page=${currentPage}&limit=${limit}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const emailsData = data.emails || [];
        
        // Debug: Check for emails with attachments
        const emailsWithAttachments = emailsData.filter((email: any) => email.attachments && email.attachments.length > 0);
        if (emailsWithAttachments.length > 0) {
          console.log('📎 Found emails with attachments:', emailsWithAttachments.length);
          emailsWithAttachments.forEach((email: any) => {
            console.log(`  - Email: ${email.subject}, Attachments: ${email.attachments.length}`);
            email.attachments.forEach((att: any) => {
              console.log(`    - ${att.filename} (${att.id}) - URL: ${att.url}`);
            });
          });
        } else {
          console.log('📎 No emails with attachments found');
        }
        
        setEmails(emailsData);
        setTotalEmails(data.total || 0);
        setHasMore(data.has_more || false);
        
        // Cache the results (only cache first page without search)
        if (currentPage === 1 && !searchQuery) {
          dispatch(cacheEmails({
            folderId: currentFolder,
            emails: emailsData,
            total: data.total || 0,
            hasMore: data.has_more || false,
            page: currentPage,
          }));
        }
      } else {
        throw new Error('Failed to load emails');
      }
    } catch (err) {
      console.error('Error loading emails:', err);
      setError('Failed to load emails');
      dispatch(setEmailError('Failed to load emails'));
      setEmails([]);
    } finally {
      setLoading(false);
      dispatch(setEmailLoading(false));
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
    // Debug: Log email data when clicked
    console.log('📧 Email clicked:', {
      id: email.id,
      subject: email.subject,
      attachments: email.attachments,
      attachmentCount: email.attachments?.length || 0
    });
    
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

  const handleFolderChange = (folderId: string) => {
    setCurrentFolder(folderId);
    setViewEmail(null);
    
    // Show cached content immediately if available and fresh
    const cached = cache[folderId];
    if (cached && Date.now() - cached.lastFetched < 5 * 60 * 1000) {
      setEmails(cached.emails);
      setTotalEmails(cached.total);
      setHasMore(cached.hasMore);
    } else {
      // Show loading state only if no cache
      setEmails([]);
    }
    
    // Force refresh for frequently updated folders (sent, drafts)
    if (shouldRefreshFolder(folderId)) {
      // Clear cache to force fresh load
      dispatch(clearFolderCache(folderId));
    }
    
    // Load fresh data in background will be handled by useEffect
  };

  // Function to invalidate cache for specific folders
  const invalidateFolderCache = (folderIds: string[]) => {
    folderIds.forEach(folderId => {
      dispatch(clearFolderCache(folderId));
    });
  };

  // Function to check if folder cache needs refresh based on folder type
  const shouldRefreshFolder = (folderId: string) => {
    // Always refresh sent and drafts folders when switching to them
    // as they are frequently updated
    if (folderId === 'sent' || folderId === 'drafts') {
      return true;
    }
    
    // For other folders, check if cache is stale (older than 2 minutes)
    const cached = cache[folderId];
    if (!cached) return true;
    
    return Date.now() - cached.lastFetched > 2 * 60 * 1000; // 2 minutes
  };

  const handleStarToggle = async (emailId: string) => {
    // Optimistically update UI first
    const email = emails.find(e => e.id === emailId);
    if (email) {
      const newStarredState = !email.is_starred;
      
      setEmails(prev => prev.map(email => 
        email.id === emailId 
          ? { ...email, is_starred: newStarredState }
          : email
      ));
      
      // Update viewEmail if it's the currently viewed email
      setViewEmail(prev => 
        prev && prev.id === emailId 
          ? { ...prev, is_starred: newStarredState }
          : prev
      );

      // Update cache
      dispatch(updateEmailInCache({
        emailId,
        updates: { is_starred: newStarredState }
      }));
    }

    try {
      const response = await fetch(`${config.EMAIL_SERVICE_URL}${API_ENDPOINTS.EMAILS.MARK_STAR.replace('{id}', emailId)}?user_id=${user?.id}`, {
        method: 'PUT',
      });
      
      if (response.ok) {
        await loadFolders(); // Refresh folder counts
      } else {
        // Revert optimistic update on error
        if (email) {
          setEmails(prev => prev.map(e => 
            e.id === emailId 
              ? { ...e, is_starred: email.is_starred }
              : e
          ));
          
          setViewEmail(prev => 
            prev && prev.id === emailId 
              ? { ...prev, is_starred: email.is_starred }
              : prev
          );

          dispatch(updateEmailInCache({
            emailId,
            updates: { is_starred: email.is_starred }
          }));
        }
      }
    } catch (err) {
      console.error('Error toggling star:', err);
      // Revert optimistic update on error
      if (email) {
        setEmails(prev => prev.map(e => 
          e.id === emailId 
            ? { ...e, is_starred: email.is_starred }
            : e
        ));
        
        setViewEmail(prev => 
          prev && prev.id === emailId 
            ? { ...prev, is_starred: email.is_starred }
            : prev
        );

        dispatch(updateEmailInCache({
          emailId,
          updates: { is_starred: email.is_starred }
        }));
      }
    }
  };

  const handleDeleteEmail = async (emailId: string) => {
    // Optimistically remove from UI first
    const emailToDelete = emails.find(e => e.id === emailId);
    setEmails(prev => prev.filter(email => email.id !== emailId));
    setSelectedEmails(prev => prev.filter(id => id !== emailId));
    
    // Remove from cache
    dispatch(removeEmailFromCache(emailId));

    try {
      const response = await fetch(`${config.EMAIL_SERVICE_URL}${API_ENDPOINTS.EMAILS.DELETE.replace('{id}', emailId)}?user_id=${user?.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await loadFolders(); // Refresh folder counts
      } else {
        // Revert optimistic update on error
        if (emailToDelete) {
          setEmails(prev => [...prev, emailToDelete].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ));
        }
      }
    } catch (err) {
      console.error('Error deleting email:', err);
      // Revert optimistic update on error
      if (emailToDelete) {
        setEmails(prev => [...prev, emailToDelete].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
      }
    }
  };

  const handleMarkAsRead = async (emailId: string, isRead: boolean) => {
    // Optimistically update UI first
    const email = emails.find(e => e.id === emailId);
    setEmails(prev => prev.map(email => 
      email.id === emailId 
        ? { ...email, is_read: isRead }
        : email
    ));

    // Update cache
    dispatch(updateEmailInCache({
      emailId,
      updates: { is_read: isRead }
    }));

    try {
      const response = await fetch(`${config.EMAIL_SERVICE_URL}${API_ENDPOINTS.EMAILS.MARK_READ.replace('{id}', emailId)}?is_read=${isRead}&user_id=${user?.id}`, {
        method: 'PUT',
      });
      
      if (response.ok) {
        await loadFolders(); // Refresh folder counts to update unread count
      } else {
        // Revert optimistic update on error
        if (email) {
          setEmails(prev => prev.map(e => 
            e.id === emailId 
              ? { ...e, is_read: email.is_read }
              : e
          ));
          
          dispatch(updateEmailInCache({
            emailId,
            updates: { is_read: email.is_read }
          }));
        }
      }
    } catch (err) {
      console.error('Error marking as read:', err);
      // Revert optimistic update on error
      if (email) {
        setEmails(prev => prev.map(e => 
          e.id === emailId 
            ? { ...e, is_read: email.is_read }
            : e
        ));
        
        dispatch(updateEmailInCache({
          emailId,
          updates: { is_read: email.is_read }
        }));
      }
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
      
      // Transform emailData to include attachment_ids instead of uploadedAttachments
      const transformedEmailData = {
        ...emailData,
        attachment_ids: emailData.uploadedAttachments?.map((att: any) => att.id) || [],
        save_as_draft: false,
      };
      
      // Remove uploadedAttachments from the request body as backend doesn't expect it
      delete transformedEmailData.uploadedAttachments;
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformedEmailData),
      });
      
      if (response.ok) {
        // Invalidate cache for sent folder and current folder
        const foldersToInvalidate = ['sent'];
        if (currentFolder !== 'sent') {
          foldersToInvalidate.push(currentFolder);
        }
        invalidateFolderCache(foldersToInvalidate);
        
        // Refresh emails and folders with force refresh
        await loadEmails(true);
        await loadFolders();
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
      
      // Transform emailData to include attachment_ids instead of uploadedAttachments
      const transformedEmailData = {
        ...emailData,
        attachment_ids: emailData.uploadedAttachments?.map((att: any) => att.id) || [],
        save_as_draft: true,
      };
      
      // Remove uploadedAttachments from the request body as backend doesn't expect it
      delete transformedEmailData.uploadedAttachments;
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformedEmailData),
      });
      
      if (response.ok) {
        // Invalidate cache for drafts folder and current folder
        const foldersToInvalidate = ['drafts'];
        if (currentFolder !== 'drafts') {
          foldersToInvalidate.push(currentFolder);
        }
        invalidateFolderCache(foldersToInvalidate);
        
        await loadEmails(true);
        await loadFolders();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to save draft');
      }
    } catch (err) {
      console.error('Error saving draft:', err);
      throw err;
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    try {
      const response = await fetch(`${config.EMAIL_SERVICE_URL}${API_ENDPOINTS.EMAILS.DELETE.replace('{id}', draftId)}?user_id=${user.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Invalidate cache for drafts folder and current folder
        const foldersToInvalidate = ['drafts'];
        if (currentFolder !== 'drafts') {
          foldersToInvalidate.push(currentFolder);
        }
        invalidateFolderCache(foldersToInvalidate);
        
        await loadEmails(true);
        await loadFolders();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to delete draft');
      }
    } catch (err) {
      console.error('Error deleting draft:', err);
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

  // Selection dropdown handlers
  const handleSelectionMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSelectionMenuAnchor(event.currentTarget);
  };

  const handleSelectionMenuClose = () => {
    setSelectionMenuAnchor(null);
  };

  const handleSelectAll = () => {
    setSelectedEmails(emails.map(email => email.id));
    handleSelectionMenuClose();
  };

  const handleSelectNone = () => {
    setSelectedEmails([]);
    handleSelectionMenuClose();
  };

  const handleSelectRead = () => {
    const readEmails = emails.filter(email => email.is_read).map(email => email.id);
    setSelectedEmails(readEmails);
    handleSelectionMenuClose();
  };

  const handleSelectUnread = () => {
    const unreadEmails = emails.filter(email => !email.is_read).map(email => email.id);
    setSelectedEmails(unreadEmails);
    handleSelectionMenuClose();
  };

  const handleSelectStarred = () => {
    const starredEmails = emails.filter(email => email.is_starred).map(email => email.id);
    setSelectedEmails(starredEmails);
    handleSelectionMenuClose();
  };

  const handleSelectUnstarred = () => {
    const unstarredEmails = emails.filter(email => !email.is_starred).map(email => email.id);
    setSelectedEmails(unstarredEmails);
    handleSelectionMenuClose();
  };

  // Bulk action handlers
  const handleBulkDelete = async () => {
    for (const emailId of selectedEmails) {
      await handleDeleteEmail(emailId);
    }
    setSelectedEmails([]);
  };

  const handleBulkMarkAsRead = async (isRead: boolean) => {
    for (const emailId of selectedEmails) {
      await handleMarkAsRead(emailId, isRead);
    }
    setSelectedEmails([]);
  };

  const handleBulkStarToggle = async () => {
    for (const emailId of selectedEmails) {
      await handleStarToggle(emailId);
    }
    setSelectedEmails([]);
  };

  const handleBulkReportSpam = async () => {
    // TODO: Implement bulk report spam functionality
    // This would typically move emails to spam folder
    console.log('Bulk report spam for emails:', selectedEmails);
    setSelectedEmails([]);
  };

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
                  onClick={() => handleFolderChange(folder.id)}
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
             userId={user?.id || ''}
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
                    onClick={handleSelectionMenuOpen}
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

                {/* Selection dropdown menu */}
                <Menu
                  anchorEl={selectionMenuAnchor}
                  open={Boolean(selectionMenuAnchor)}
                  onClose={handleSelectionMenuClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                >
                  <MenuItem onClick={handleSelectAll}>All</MenuItem>
                  <MenuItem onClick={handleSelectNone}>None</MenuItem>
                  <MenuItem onClick={handleSelectRead}>Read</MenuItem>
                  <MenuItem onClick={handleSelectUnread}>Unread</MenuItem>
                  <MenuItem onClick={handleSelectStarred}>Starred</MenuItem>
                  <MenuItem onClick={handleSelectUnstarred}>Unstarred</MenuItem>
                                </Menu>

                                 {/* Bulk action buttons - only show when emails are selected */}
                 {selectedEmails.length > 0 && (
                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                     <Tooltip title="Report spam">
                       <IconButton 
                         onClick={() => handleBulkReportSpam()}
                         size="small" 
                         sx={{ color: '#5f6368' }}
                       >
                         <SpamIcon />
                       </IconButton>
                     </Tooltip>
                     {(() => {
                       // Check if all selected emails are read or all are unread
                       const selectedEmailObjects = emails.filter(email => selectedEmails.includes(email.id));
                       const allRead = selectedEmailObjects.every(email => email.is_read);
                       const allUnread = selectedEmailObjects.every(email => !email.is_read);
                       
                       // Show "Mark as read" only when there are unread emails (mixed or all unread)
                       // Show "Mark as unread" only when there are read emails (mixed or all read)
                       if (allRead) {
                         // Only read emails - show "Mark as unread"
                         return (
                           <Tooltip title="Mark as unread">
                             <IconButton 
                               onClick={() => handleBulkMarkAsRead(false)}
                               size="small" 
                               sx={{ color: '#5f6368' }}
                             >
                               <MarkEmailUnreadIcon />
                             </IconButton>
                           </Tooltip>
                         );
                       } else if (allUnread) {
                         // Only unread emails - show "Mark as read"
                         return (
                           <Tooltip title="Mark as read">
                             <IconButton 
                               onClick={() => handleBulkMarkAsRead(true)}
                               size="small" 
                               sx={{ color: '#5f6368' }}
                             >
                               <MarkEmailReadIcon />
                             </IconButton>
                           </Tooltip>
                         );
                       } else {
                         // Mixed selection (both read and unread) - show both options
                         return (
                           <>
                             <Tooltip title="Mark as read">
                               <IconButton 
                                 onClick={() => handleBulkMarkAsRead(true)}
                                 size="small" 
                                 sx={{ color: '#5f6368' }}
                               >
                                 <MarkEmailReadIcon />
                               </IconButton>
                             </Tooltip>
                             <Tooltip title="Mark as unread">
                               <IconButton 
                                 onClick={() => handleBulkMarkAsRead(false)}
                                 size="small" 
                                 sx={{ color: '#5f6368' }}
                               >
                                 <MarkEmailUnreadIcon />
                               </IconButton>
                             </Tooltip>
                           </>
                         );
                       }
                     })()}
                     <Tooltip title="Delete">
                       <IconButton 
                         onClick={handleBulkDelete}
                         size="small" 
                         sx={{ color: '#5f6368' }}
                       >
                         <DeleteIcon />
                       </IconButton>
                     </Tooltip>
                   </Box>
                 )}

                                   {/* Refresh button - only show when no emails are selected */}
                  {selectedEmails.length === 0 && (
                    <IconButton 
                      onClick={() => loadEmails(true)} 
                      disabled={loading} 
                      size="small" 
                      sx={{ 
                        color: '#5f6368',
                        padding: '8px'
                      }}
                    >
                      <RefreshIcon />
                    </IconButton>
                  )}

                {/* More options - only show when no emails are selected */}
                {selectedEmails.length === 0 && (
                  <IconButton 
                    size="small" 
                    sx={{ 
                      color: '#5f6368',
                      padding: '8px'
                    }}
                  >
                    <MoreIcon />
                  </IconButton>
                )}
               
               <Box sx={{ flexGrow: 1 }} />
               
               {/* Pagination text */}
               <Typography variant="body2" color="text.secondary" sx={{ mr: 1, fontSize: '13px', fontWeight: 500 }}>
                 {totalEmails > 0 ? `${(currentPage - 1) * limit + 1}-${Math.min(currentPage * limit, totalEmails)} of ${totalEmails.toLocaleString()}` : '0 of 0'}
               </Typography>
               
               {/* Navigation arrows */}
               <IconButton 
                 size="small" 
                 disabled={currentPage === 1} 
                 onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                 sx={{ color: '#5f6368' }}
               >
                 <ArrowLeftIcon />
               </IconButton>
               <IconButton 
                 size="small" 
                 disabled={currentPage >= totalPages} 
                 onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                 sx={{ color: '#5f6368' }}
               >
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
        onDeleteDraft={handleDeleteDraft}
        userId={user?.id || ''}
        initialData={selectedEmail ? {
          id: selectedEmail.id,
          subject: selectedEmail.subject,
          body: selectedEmail.body,
          to_addresses: selectedEmail.to_addresses.map(addr => addr.email),
          cc_addresses: selectedEmail.cc_addresses?.map(addr => addr.email) || [],
          bcc_addresses: selectedEmail.bcc_addresses?.map(addr => addr.email) || [],
          priority: selectedEmail.priority as 'low' | 'normal' | 'high' | 'urgent',
          attachments: [], // File objects for new attachments
          uploadedAttachments: selectedEmail.attachments.map(att => ({
            id: att.id,
            filename: att.filename,
            content_type: att.content_type || 'application/octet-stream',
            size: att.size,
            url: att.url
          })), // Convert existing attachments to Attachment format
        } : undefined}
      />
    </Box>
  );
};

export default EmailInterface; 