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
}

import { attachmentService, Attachment, UploadResponse } from '../../services/attachmentService';

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
        attachmentService.uploadAttachment(file, 'current-user-id') // TODO: Get actual user ID
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
    try {
      await attachmentService.deleteAttachment(attachmentId, 'current-user-id'); // TODO: Get actual user ID
      setEmailData(prev => ({
        ...prev,
        uploadedAttachments: prev.uploadedAttachments.filter(att => att.id !== attachmentId)
      }));
    } catch (error) {
      console.error('Error removing attachment:', error);
      setUploadError('Failed to remove attachment');
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
          border: '1px solid #e8eaed',
          boxShadow: '0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12), 0 5px 5px -3px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            backgroundColor: '#f8f9fa',
            color: '#202124',
            p: 1.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'move',
            minHeight: '48px',
            borderBottom: '1px solid #e8eaed',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '14px' }}>
            New Message
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              size="small"
              sx={{ 
                color: '#666', 
                p: 0.5,
                '&:hover': { backgroundColor: '#e8eaed' }
              }}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
            </IconButton>
            <IconButton
              size="small"
              sx={{ 
                color: '#666', 
                p: 0.5,
                '&:hover': { backgroundColor: '#e8eaed' }
              }}
              onClick={handleClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
          {/* Recipients */}
          <Box sx={{ p: 2, pb: 0 }}>
            {!showToField ? (
              // Initial state - just "Recipients" placeholder
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  minHeight: '32px', 
                  borderBottom: '1px solid #e8eaed',
                  cursor: 'text',
                }}
                onClick={() => setShowToField(true)}
              >
                <Typography variant="body2" sx={{ color: '#999', fontSize: '13px', flex: 1 }}>
                  Recipients
                </Typography>
              </Box>
            ) : (
              // Show To field with Cc/Bcc options
              <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '32px', borderBottom: '1px solid #e8eaed' }}>
                <Typography variant="body2" sx={{ color: '#666', minWidth: 60, fontSize: '13px' }}>
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
                        backgroundColor: '#e8eaed',
                        '& .MuiChip-deleteIcon': {
                          fontSize: '16px',
                          color: '#666'
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
                      },
                    }}
                  />
                </Box>
                {/* Cc/Bcc options on the right */}
                <Box sx={{ display: 'flex', gap: 2, ml: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: showCcField ? '#666' : '#999',
                      cursor: 'pointer',
                      fontSize: '12px',
                      '&:hover': { color: '#666' },
                    }}
                    onClick={() => setShowCcField(!showCcField)}
                  >
                    Cc
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: showBccField ? '#666' : '#999',
                      cursor: 'pointer',
                      fontSize: '12px',
                      '&:hover': { color: '#666' },
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
              <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '32px', borderBottom: '1px solid #e8eaed' }}>
                <Typography variant="body2" sx={{ color: '#666', minWidth: 60, fontSize: '13px' }}>
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
                        backgroundColor: '#e8eaed',
                        '& .MuiChip-deleteIcon': {
                          fontSize: '16px',
                          color: '#666'
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
                      },
                    }}
                  />
                </Box>
              </Box>
            )}

            {/* Bcc Field - only show if clicked */}
            {showBccField && (
              <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '32px', borderBottom: '1px solid #e8eaed' }}>
                <Typography variant="body2" sx={{ color: '#666', minWidth: 60, fontSize: '13px' }}>
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
                        backgroundColor: '#e8eaed',
                        '& .MuiChip-deleteIcon': {
                          fontSize: '16px',
                          color: '#666'
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
                      },
                    }}
                  />
                </Box>
              </Box>
            )}

            {/* Subject */}
            <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '32px', borderBottom: '1px solid #e8eaed' }}>
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
              <Typography variant="body2" sx={{ color: '#666', mb: 0.5, fontSize: '12px' }}>
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
                      border: '1px solid #e8eaed',
                      borderRadius: 1,
                      fontSize: '12px',
                      backgroundColor: '#f8f9fa',
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
              <Typography variant="body2" sx={{ color: '#666', mb: 0.5, fontSize: '12px' }}>
                Attachments ({emailData.uploadedAttachments.length}):
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {emailData.uploadedAttachments.map((attachment) => (
                  <Box
                    key={attachment.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 0.5,
                      border: '1px solid #e8eaed',
                      borderRadius: 1,
                      fontSize: '12px',
                      backgroundColor: '#f8f9fa',
                    }}
                  >
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
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveUploadedAttachment(attachment.id)}
                      sx={{ p: 0.5 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>

        {/* Bottom Toolbar */}
        <Box
          sx={{
            borderTop: '1px solid #e8eaed',
            p: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8f9fa',
            minHeight: '48px',
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
                backgroundColor: '#1a73e8',
                color: 'white',
                textTransform: 'none',
                fontSize: '13px',
                px: 2,
                py: 0.5,
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: '#1557b0',
                },
                '&:disabled': {
                  backgroundColor: '#e8eaed',
                  color: '#666',
                },
              }}
            >
              Send
            </Button>

            {/* Formatting toolbar */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Formatting options">
                <IconButton size="small" sx={{ p: 0.5, color: '#666', '&:hover': { backgroundColor: '#e8eaed' } }}>
                  <FormatBoldIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Attach files">
                <IconButton size="small" sx={{ p: 0.5, color: '#666', '&:hover': { backgroundColor: '#e8eaed' } }}>
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
                <IconButton size="small" sx={{ p: 0.5, color: '#666', '&:hover': { backgroundColor: '#e8eaed' } }}>
                  <ImageIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Right side - Discard button */}
          <Tooltip title="Discard draft">
            <IconButton size="small" onClick={handleDiscard} sx={{ p: 0.5, color: '#666', '&:hover': { backgroundColor: '#e8eaed' } }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
    </>
  );
};

export default ComposeEmail; 