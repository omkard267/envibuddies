import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  Container,
  Paper,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import LockIcon from '@mui/icons-material/Lock';
import SecurityIcon from '@mui/icons-material/Security';
import { formatDate } from '../../utils/dateUtils';

const AccountLinkingModal = ({ 
  open, 
  onClose, 
  existingUser, 
  oauthData, 
  onLinkAccount,
  // Keep the prop for backward compatibility but don't use it
  onCreateNewAccount,
  error
}) => {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState(''); // 'link' or 'create'
  const [localError, setLocalError] = useState('');

  const handleLinkAccount = async () => {
    setLoading(true);
    setAction('link');
    setLocalError('');
    
    try {
      await onLinkAccount();
      // If we get here, linking was successful
      // The modal will be closed by the parent component
      // No need to do anything here
    } catch (error) {
      console.error('Account linking failed:', error);
      // The parent component will handle errors and set the error state
      // We don't need to do anything here
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLoading(false);
    setAction('');
    setLocalError('');
    onClose();
  };

  // Use error from parent component if available, otherwise use local error
  const displayError = error || localError;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      sx={{ zIndex: 9999 }}
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
          zIndex: 9999
        }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1, pt: 3 }}>
        <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
          <SecurityIcon color="primary" sx={{ fontSize: 50, mb: 2 }} />
          <Typography variant="h5" fontWeight="bold" color="primary" gutterBottom>
            Account Found
          </Typography>
          <Typography variant="body1" textAlign="center" color="text.secondary" maxWidth="80%" mb={1}>
            We found an existing account with the email:
          </Typography>
          <Typography variant="body1" fontWeight="bold" color="primary" mb={2}>
            {oauthData?.email}
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth="90%">
            For security, please link your {oauthData?.provider || 'social'} account to your existing account.
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            mb: 3, 
            backgroundColor: 'rgba(25, 118, 210, 0.05)',
            border: '1px solid rgba(25, 118, 210, 0.2)',
            borderRadius: 2
          }}
        >
          <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems="center" gap={3}>
            <Avatar 
              src={existingUser?.profileImage} 
              alt={existingUser?.name}
              sx={{ width: 80, height: 80, border: '2px solid #1976d2' }}
            />
            <Box textAlign={{ xs: 'center', sm: 'left' }}>
              <Typography variant="h6" fontWeight="bold" mb={0.5}>
                {existingUser?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {existingUser?.email}
              </Typography>
              <Box display="flex" alignItems="center" justifyContent={{ xs: 'center', sm: 'flex-start' }} gap={1} mb={1}>
                <Typography variant="body2" color="primary" fontWeight="bold">
                  {existingUser?.role}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Account created on: {formatDate(existingUser?.createdAt)}
              </Typography>
            </Box>
          </Box>
        </Paper>
        
        <Box textAlign="center" mt={3} mb={2}>
          <LockIcon color="action" fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
          <Typography variant="body2" color="text.secondary" display="inline">
            Your information is secure and will not be shared
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>What happens when you link accounts?</strong><br />
            • You can login with either your password or Google account<br />
            • Your profile information will be updated with Google data<br />
            • All your existing data and activities will be preserved
          </Typography>
        </Alert>

        {displayError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="body2">
              {displayError}
            </Typography>
          </Alert>
        )}

      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'center' }}>
        <Button 
          variant="outlined" 
          onClick={handleClose} 
          disabled={loading}
          sx={{ mr: 2 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleLinkAccount}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LinkIcon />}
          size="large"
        >
          {loading ? 'Linking...' : 'Link Accounts'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccountLinkingModal;
