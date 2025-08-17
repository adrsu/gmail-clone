import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Paper,
  Divider,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Send as SendIcon,
  Close as CloseIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  FormatBold as FormatBoldIcon,
  FormatItalic as FormatItalicIcon,
  FormatUnderlined as FormatUnderlineIcon,
  FormatColorText as FormatColorTextIcon,
  FormatAlignLeft as FormatAlignLeftIcon,
  FormatAlignCenter as FormatAlignCenterIcon,
  FormatAlignRight as FormatAlignRightIcon,
  FormatListNumbered as FormatListNumberedIcon,
  FormatListBulleted as FormatListBulletedIcon,
  FormatIndentDecrease as FormatIndentDecreaseIcon,
  FormatIndentIncrease as FormatIndentIncreaseIcon,
  FormatQuote as FormatQuoteIcon,
  StrikethroughS as StrikethroughSIcon,
  Clear as ClearFormattingIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Link as LinkIcon,
  EmojiEmotions as EmojiEmotionsIcon,
  DriveFolderUpload as DriveFolderUploadIcon,
  Image as ImageIcon,
  Lock as LockIcon,
  Create as CreateIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';

interface ComposeEmailProps {
  open: boolean;
  onClose: () => void;
  onSend: (emailData: EmailData) => void;
  onSaveDraft: (emailData: EmailData) => void;
  onDeleteDraft?: (draftId: string) => Promise<void>;
  initialData?: Partial<EmailData>;
  userId: string;
}

import { attachmentService, Attachment, UploadResponse } from '../../services/attachmentService';
import AttachmentList from './AttachmentList';

interface EmailData {
  id?: string;
  subject: string;
  body: string;
  to_addresses: string[];
  cc_addresses: string[];
  bcc_addresses: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  attachments: File[];
  uploadedAttachments: Attachment[];
}

const ComposeEmail: React.FC<ComposeEmailProps> = ({
  open,
  onClose,
  onSend,
  onSaveDraft,
  onDeleteDraft,
  initialData,
  userId,
}) => {
  const [emailData, setEmailData] = useState<EmailData>({
    subject: initialData?.subject || '',
    body: initialData?.body || '',
    to_addresses: initialData?.to_addresses || [],
    cc_addresses: initialData?.cc_addresses || [],
    bcc_addresses: initialData?.bcc_addresses || [],
    priority: initialData?.priority || 'normal',
    attachments: initialData?.attachments || [],
    uploadedAttachments: initialData?.uploadedAttachments || [],
  });

  const [currentTo, setCurrentTo] = useState('');
  const [currentCc, setCurrentCc] = useState('');
  const [currentBcc, setCurrentBcc] = useState('');
  const [sending, setSending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showToField, setShowToField] = useState(false);
  const [showCcField, setShowCcField] = useState(false);
  const [showBccField, setShowBccField] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Reset form when initialData changes (when editing an email)
  useEffect(() => {
    if (initialData) {
      setEmailData({
        subject: initialData.subject || '',
        body: initialData.body || '',
        to_addresses: initialData.to_addresses || [],
        cc_addresses: initialData.cc_addresses || [],
        bcc_addresses: initialData.bcc_addresses || [],
        priority: initialData.priority || 'normal',
        attachments: initialData.attachments || [],
        uploadedAttachments: initialData.uploadedAttachments || [],
      });
      setCurrentTo('');
      setCurrentCc('');
      setCurrentBcc('');
    } else if (open) {
      // Reset form for new composition
             setEmailData({
         subject: '',
         body: '',
         to_addresses: [],
         cc_addresses: [],
         bcc_addresses: [],
         priority: 'normal',
         attachments: [],
         uploadedAttachments: [],
       });
      setCurrentTo('');
      setCurrentCc('');
      setCurrentBcc('');
      setIsExpanded(false);
      setShowToField(false);
      setShowCcField(false);
      setShowBccField(false);
    }
  }, [initialData, open]);

  const handleAddEmail = (field: 'to_addresses' | 'cc_addresses' | 'bcc_addresses', email: string) => {
    if (email.trim() && isValidEmail(email.trim())) {
      setEmailData(prev => ({
        ...prev,
        [field]: [...prev[field], email.trim()]
      }));
      return '';
    }
    return email;
  };

  const handleRemoveEmail = (field: 'to_addresses' | 'cc_addresses' | 'bcc_addresses', index: number) => {
    setEmailData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleAttachmentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploadError(null);
    const uploadingFiles = files.map(file => file.name);
    setUploadingAttachments(uploadingFiles);

    try {
      // Validate files first
      for (const file of files) {
        const validation = attachmentService.validateFile(file);
        if (!validation.isValid) {
          throw new Error(validation.error);
        }
      }

             // Upload files to server
       const uploadPromises = files.map(file => 
         attachmentService.uploadAttachment(file, userId)
       );
      
      const uploadResults = await Promise.all(uploadPromises);
      
      // Add uploaded attachments to email data
      setEmailData(prev => ({
        ...prev,
        uploadedAttachments: [...prev.uploadedAttachments, ...uploadResults]
      }));

    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload attachments');
      console.error('Error uploading attachments:', error);
    } finally {
      setUploadingAttachments([]);
      // Clear the input
      event.target.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setEmailData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

     const handleRemoveUploadedAttachment = async (attachmentId: string) => {
     // Prevent double deletion - check if attachment is already being deleted
     if (uploadingAttachments.includes(attachmentId)) {
       console.log(`⚠️ Attachment ${attachmentId} is already being deleted, skipping...`);
       return;
     }

     // Check if attachment still exists in the list
     const attachmentExists = emailData.uploadedAttachments.some(att => att.id === attachmentId);
     if (!attachmentExists) {
       console.log(`⚠️ Attachment ${attachmentId} no longer exists in UI, skipping deletion...`);
       return;
     }

     try {
       // Mark attachment as being deleted to prevent double calls
       setUploadingAttachments(prev => [...prev, attachmentId]);
       console.log(`🗑️ Starting deletion of attachment: ${attachmentId}`);

       await attachmentService.deleteAttachment(attachmentId, userId);
       
       // Remove from UI state
       setEmailData(prev => ({
         ...prev,
         uploadedAttachments: prev.uploadedAttachments.filter(att => att.id !== attachmentId)
       }));
       
       console.log(`✅ Successfully removed attachment: ${attachmentId}`);
       setUploadError(null); // Clear any previous errors
     } catch (error) {
       console.error('Error removing attachment:', error);
       const errorMessage = error instanceof Error ? error.message : 'Failed to remove attachment';
       
       // Check if it's a "not found" error (attachment already deleted)
       if (errorMessage.includes('not found') || errorMessage.includes('404')) {
         console.log(`ℹ️ Attachment was already deleted, removing from UI: ${attachmentId}`);
         // Remove from UI anyway since it's already gone from server
         setEmailData(prev => ({
           ...prev,
           uploadedAttachments: prev.uploadedAttachments.filter(att => att.id !== attachmentId)
         }));
         setUploadError(null);
       } else {
         setUploadError(errorMessage);
       }
     } finally {
       // Always remove from "being deleted" list
       setUploadingAttachments(prev => prev.filter(id => id !== attachmentId));
     }
   };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSend = async () => {
    if (!emailData.subject.trim() || emailData.to_addresses.length === 0) {
      return;
    }

    setSending(true);
    try {
      await onSend(emailData);
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = async () => {
    setSending(true);
    try {
      await onSaveDraft(emailData);
      onClose();
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setSending(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleClose = async () => {
    // Check if there's any content to save as draft
    const hasContent = emailData.subject.trim() || 
                      emailData.body.trim() || 
                      emailData.to_addresses.length > 0 || 
                      emailData.cc_addresses.length > 0 || 
                      emailData.bcc_addresses.length > 0 ||
                      emailData.uploadedAttachments.length > 0 ||
                      currentTo.trim() || 
                      currentCc.trim() || 
                      currentBcc.trim();

    if (hasContent) {
      // Add any pending email addresses before saving
      const finalEmailData = { ...emailData };
      
      if (currentTo.trim()) {
        const newTo = handleAddEmail('to_addresses', currentTo);
        if (newTo === '') {
          finalEmailData.to_addresses = [...emailData.to_addresses, currentTo.trim()];
        }
      }
      
      if (currentCc.trim()) {
        const newCc = handleAddEmail('cc_addresses', currentCc);
        if (newCc === '') {
          finalEmailData.cc_addresses = [...emailData.cc_addresses, currentCc.trim()];
        }
      }
      
      if (currentBcc.trim()) {
        const newBcc = handleAddEmail('bcc_addresses', currentBcc);
        if (newBcc === '') {
          finalEmailData.bcc_addresses = [...emailData.bcc_addresses, currentBcc.trim()];
        }
      }

      try {
        await onSaveDraft(finalEmailData);
      } catch (error) {
        console.error('Error saving draft:', error);
      }
    }
    
    onClose();
  };

  const handleDiscard = async () => {
    // If we're editing an existing draft (initialData exists), delete it
    if (initialData && initialData.id) {
      try {
        // Call the delete draft function (you'll need to add this to props)
        if (onDeleteDraft) {
          await onDeleteDraft(initialData.id);
        }
      } catch (error) {
        console.error('Error deleting draft:', error);
      }
    }
    
    // Close without saving anything
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: isExpanded ? 600 : 500,
          height: isExpanded ? 500 : 400,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1300,
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            color: '#ffffff',
            p: 1.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'move',
            minHeight: '48px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '14px' }}>
            New Message
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              size="small"
              sx={{ 
                color: 'rgba(255, 255, 255, 0.8)', 
                p: 0.5,
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
              }}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
            </IconButton>
            <IconButton
              size="small"
              sx={{ 
                color: 'rgba(255, 255, 255, 0.8)', 
                p: 0.5,
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
              }}
              onClick={handleClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
          {/* Recipients */}
          <Box sx={{ p: 2, pb: 0 }}>
            {!showToField ? (
              // Initial state - just "Recipients" placeholder
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  minHeight: '32px', 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'text',
                }}
                onClick={() => setShowToField(true)}
              >
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', flex: 1 }}>
                  Recipients
                </Typography>
              </Box>
            ) : (
              // Show To field with Cc/Bcc options
              <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '32px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', minWidth: 60, fontSize: '13px' }}>
                  To:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, flex: 1, alignItems: 'center' }}>
                  {emailData.to_addresses.map((email, index) => (
                    <Chip
                      key={index}
                      label={email}
                      onDelete={() => handleRemoveEmail('to_addresses', index)}
                      size="small"
                      sx={{ 
                        height: 24, 
                        fontSize: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
                        '& .MuiChip-deleteIcon': {
                          fontSize: '16px',
                          color: 'rgba(255, 255, 255, 0.8)'
                        }
                      }}
                    />
                  ))}
                  <TextField
                    size="small"
                    value={currentTo}
                    onChange={(e) => setCurrentTo(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const newTo = handleAddEmail('to_addresses', currentTo);
                        setCurrentTo(newTo);
                      }
                    }}
                    onBlur={() => {
                      const newTo = handleAddEmail('to_addresses', currentTo);
                      setCurrentTo(newTo);
                    }}
                    sx={{
                      flex: 1,
                      '& .MuiOutlinedInput-root': {
                        border: 'none',
                        '& fieldset': { border: 'none' },
                        '&:hover fieldset': { border: 'none' },
                        '&.Mui-focused fieldset': { border: 'none' },
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '13px',
                        padding: '4px 0',
                        color: '#ffffff',
                      },
                    }}
                  />
                </Box>
                {/* Cc/Bcc options on the right */}
                <Box sx={{ display: 'flex', gap: 2, ml: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: showCcField ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.6)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      '&:hover': { color: 'rgba(255, 255, 255, 0.8)' },
                    }}
                    onClick={() => setShowCcField(!showCcField)}
                  >
                    Cc
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: showBccField ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.6)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      '&:hover': { color: 'rgba(255, 255, 255, 0.8)' },
                    }}
                    onClick={() => setShowBccField(!showBccField)}
                  >
                    Bcc
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Cc Field - only show if clicked */}
            {showCcField && (
              <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '32px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', minWidth: 60, fontSize: '13px' }}>
                  Cc:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, flex: 1, alignItems: 'center' }}>
                  {emailData.cc_addresses.map((email, index) => (
                    <Chip
                      key={index}
                      label={email}
                      onDelete={() => handleRemoveEmail('cc_addresses', index)}
                      size="small"
                      sx={{ 
                        height: 24, 
                        fontSize: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
                        '& .MuiChip-deleteIcon': {
                          fontSize: '16px',
                          color: 'rgba(255, 255, 255, 0.8)'
                        }
                      }}
                    />
                  ))}
                  <TextField
                    size="small"
                    // placeholder="Enter CC email addresses"
                    value={currentCc}
                    onChange={(e) => setCurrentCc(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const newCc = handleAddEmail('cc_addresses', currentCc);
                        setCurrentCc(newCc);
                      }
                    }}
                    onBlur={() => {
                      const newCc = handleAddEmail('cc_addresses', currentCc);
                      setCurrentCc(newCc);
                    }}
                    sx={{
                      flex: 1,
                      '& .MuiOutlinedInput-root': {
                        border: 'none',
                        '& fieldset': { border: 'none' },
                        '&:hover fieldset': { border: 'none' },
                        '&.Mui-focused fieldset': { border: 'none' },
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '13px',
                        padding: '4px 0',
                        color: '#ffffff',
                      },
                    }}
                  />
                </Box>
              </Box>
            )}

            {/* Bcc Field - only show if clicked */}
            {showBccField && (
              <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '32px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', minWidth: 60, fontSize: '13px' }}>
                  Bcc:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, flex: 1, alignItems: 'center' }}>
                  {emailData.bcc_addresses.map((email, index) => (
                    <Chip
                      key={index}
                      label={email}
                      onDelete={() => handleRemoveEmail('bcc_addresses', index)}
                      size="small"
                      sx={{ 
                        height: 24, 
                        fontSize: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
                        '& .MuiChip-deleteIcon': {
                          fontSize: '16px',
                          color: 'rgba(255, 255, 255, 0.8)'
                        }
                      }}
                    />
                  ))}
                  <TextField
                    size="small"
                    // placeholder="Enter BCC email addresses"
                    value={currentBcc}
                    onChange={(e) => setCurrentBcc(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const newBcc = handleAddEmail('bcc_addresses', currentBcc);
                        setCurrentBcc(newBcc);
                      }
                    }}
                    onBlur={() => {
                      const newBcc = handleAddEmail('bcc_addresses', currentBcc);
                      setCurrentBcc(newBcc);
                    }}
                    sx={{
                      flex: 1,
                      '& .MuiOutlinedInput-root': {
                        border: 'none',
                        '& fieldset': { border: 'none' },
                        '&:hover fieldset': { border: 'none' },
                        '&.Mui-focused fieldset': { border: 'none' },
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '13px',
                        padding: '4px 0',
                        color: '#ffffff',
                      },
                    }}
                  />
                </Box>
              </Box>
            )}

            {/* Subject */}
            <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '32px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Subject"
                value={emailData.subject}
                onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    border: 'none',
                    '& fieldset': { border: 'none' },
                    '&:hover fieldset': { border: 'none' },
                    '&.Mui-focused fieldset': { border: 'none' },
                  },
                  '& .MuiInputBase-input': {
                    fontSize: '13px',
                    padding: '4px 0',
                    color: '#ffffff',
                    '&::placeholder': {
                      color: 'rgba(255, 255, 255, 0.6)',
                      opacity: 1,
                    },
                  },
                }}
              />

            </Box>
          </Box>

          {/* Body */}
          <Box sx={{ flex: 1, p: 2, pt: 1 }}>
            <TextField
              fullWidth
              multiline
              // placeholder="Write your message here..."
              value={emailData.body}
              onChange={(e) => setEmailData(prev => ({ ...prev, body: e.target.value }))}
              sx={{
                height: '100%',
                '& .MuiOutlinedInput-root': {
                  border: 'none',
                  '& fieldset': { border: 'none' },
                  '&:hover fieldset': { border: 'none' },
                  '&.Mui-focused fieldset': { border: 'none' },
                  height: '100%',
                  padding: '0px 0px',
                },
                '& .MuiInputBase-input': {
                  fontSize: '13px',
                  lineHeight: 1.5,
                  height: '100% !important',
                  color: '#ffffff',
                  // padding: '15px 0px',
                },
              }}
            />
          </Box>

          {/* Upload Error */}
          {uploadError && (
            <Box sx={{ px: 2, pb: 1 }}>
              <Alert severity="error" sx={{ fontSize: '11px', py: 0.5 }} onClose={() => setUploadError(null)}>
                {uploadError}
              </Alert>
            </Box>
          )}

          {/* Uploading Attachments */}
          {uploadingAttachments.length > 0 && (
            <Box sx={{ px: 2, pb: 1 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 0.5, fontSize: '12px' }}>
                Uploading...
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {uploadingAttachments.map((filename, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 0.5,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 1,
                      fontSize: '12px',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      color: '#ffffff',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontSize: '12px', flex: 1 }}>
                      {filename}
                    </Typography>
                    <LinearProgress sx={{ width: 60, height: 4 }} />
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Uploaded Attachments */}
          {emailData.uploadedAttachments.length > 0 && (
            <Box sx={{ px: 2, pb: 1 }}>
              <AttachmentList
                attachments={emailData.uploadedAttachments}
                userId={userId}
                onDelete={handleRemoveUploadedAttachment}
                showActions={true}
                compact={true}
                showPreviews={false}
              />
            </Box>
          )}
        </Box>

        {/* Bottom Toolbar */}
        <Box
          sx={{
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            p: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            minHeight: '48px',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Left side - Send button and formatting tools */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              disabled={sending || !emailData.subject.trim() || emailData.to_addresses.length === 0}
              startIcon={<SendIcon />}
              onClick={handleSend}
              sx={{
                backgroundColor: '#64b5f6',
                color: 'white',
                textTransform: 'none',
                fontSize: '13px',
                px: 2,
                py: 0.5,
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: '#42a5f5',
                },
                '&:disabled': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.6)',
                },
              }}
            >
              Send
            </Button>

            {/* Formatting toolbar */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Formatting options">
                <IconButton size="small" sx={{ p: 0.5, color: 'rgba(255, 255, 255, 0.8)', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}>
                  <FormatBoldIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Attach files">
                <IconButton size="small" sx={{ p: 0.5, color: 'rgba(255, 255, 255, 0.8)', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}>
                  <input
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    id="attachment-input"
                    onChange={handleAttachmentChange}
                  />
                  <label htmlFor="attachment-input">
                    <AttachFileIcon fontSize="small" />
                  </label>
                </IconButton>
              </Tooltip>
              <Tooltip title="Insert photo">
                <IconButton size="small" sx={{ p: 0.5, color: 'rgba(255, 255, 255, 0.8)', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}>
                  <ImageIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Right side - Discard button */}
          <Tooltip title="Discard draft">
            <IconButton size="small" onClick={handleDiscard} sx={{ p: 0.5, color: 'rgba(255, 255, 255, 0.8)', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
    </>
  );
};

export default ComposeEmail; 