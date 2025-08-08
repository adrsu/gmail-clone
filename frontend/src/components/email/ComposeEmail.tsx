import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Send as SendIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface ComposeEmailProps {
  open: boolean;
  onClose: () => void;
  onSend: (emailData: EmailData) => void;
  onSaveDraft: (emailData: EmailData) => void;
  initialData?: Partial<EmailData>;
}

interface EmailData {
  subject: string;
  body: string;
  to_addresses: string[];
  cc_addresses: string[];
  bcc_addresses: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  attachments: File[];
}

const ComposeEmail: React.FC<ComposeEmailProps> = ({
  open,
  onClose,
  onSend,
  onSaveDraft,
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
  });

  const [currentTo, setCurrentTo] = useState('');
  const [currentCc, setCurrentCc] = useState('');
  const [currentBcc, setCurrentBcc] = useState('');
  const [sending, setSending] = useState(false);

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
      });
      setCurrentTo('');
      setCurrentCc('');
      setCurrentBcc('');
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

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setEmailData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
  };

  const handleRemoveAttachment = (index: number) => {
    setEmailData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {initialData ? 'Edit Email' : 'Compose Email'}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* To Field */}
          <Box>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              To:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              {emailData.to_addresses.map((email, index) => (
                <Chip
                  key={index}
                  label={email}
                  onDelete={() => handleRemoveEmail('to_addresses', index)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
            <TextField
              fullWidth
              size="small"
              placeholder="Enter email addresses"
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
            />
          </Box>

          {/* CC Field */}
          <Box>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              CC:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              {emailData.cc_addresses.map((email, index) => (
                <Chip
                  key={index}
                  label={email}
                  onDelete={() => handleRemoveEmail('cc_addresses', index)}
                  variant="outlined"
                />
              ))}
            </Box>
            <TextField
              fullWidth
              size="small"
              placeholder="Enter CC email addresses"
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
            />
          </Box>

          {/* BCC Field */}
          <Box>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              BCC:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              {emailData.bcc_addresses.map((email, index) => (
                <Chip
                  key={index}
                  label={email}
                  onDelete={() => handleRemoveEmail('bcc_addresses', index)}
                  variant="outlined"
                />
              ))}
            </Box>
            <TextField
              fullWidth
              size="small"
              placeholder="Enter BCC email addresses"
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
            />
          </Box>

          <Divider />

          {/* Subject Field */}
          <TextField
            fullWidth
            label="Subject"
            value={emailData.subject}
            onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
          />

          {/* Priority Field */}
          <FormControl fullWidth size="small">
            <InputLabel>Priority</InputLabel>
            <Select
              value={emailData.priority}
              label="Priority"
              onChange={(e) => setEmailData(prev => ({ ...prev, priority: e.target.value as any }))}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </Select>
          </FormControl>

          {/* Body Field */}
          <TextField
            fullWidth
            label="Message"
            multiline
            rows={8}
            value={emailData.body}
            onChange={(e) => setEmailData(prev => ({ ...prev, body: e.target.value }))}
          />

          {/* Attachments */}
          {emailData.attachments.length > 0 && (
            <Box>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Attachments:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {emailData.attachments.map((file, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="body2">
                      {file.name} ({formatFileSize(file.size)})
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveAttachment(index)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, flex: 1 }}>
          <input
            type="file"
            multiple
            style={{ display: 'none' }}
            id="attachment-input"
            onChange={handleAttachmentChange}
          />
          <label htmlFor="attachment-input">
            <Tooltip title="Attach files">
              <IconButton component="span">
                <AttachFileIcon />
              </IconButton>
            </Tooltip>
          </label>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            onClick={handleSaveDraft}
            disabled={sending}
            startIcon={<SaveIcon />}
          >
            Save Draft
          </Button>
          <Button
            onClick={handleSend}
            variant="contained"
            disabled={sending || !emailData.subject.trim() || emailData.to_addresses.length === 0}
            startIcon={<SendIcon />}
          >
            {sending ? 'Sending...' : (initialData ? 'Update' : 'Send')}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ComposeEmail; 