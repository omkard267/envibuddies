import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Box, 
  Typography, 
  Alert,
  Divider,
  Chip,
  Paper
} from '@mui/material';
import { 
  Warning as WarningIcon, 
  Refresh as RefreshIcon, 
  Star as StarIcon,
  Cancel as CancelIcon,
  AccessTime as TimeIcon,
  Block as BlockIcon
} from '@mui/icons-material';
import { formatDate } from '../../utils/dateUtils';

const RecentlyDeletedAccountModal = ({ 
  isOpen, 
  onClose, 
  deletedAccount, 
  onProceedWithNewAccount,
  email,
  remainingDays,
  recoveryDeadline
}) => {
  const navigate = useNavigate();

  const handleRecoverAccount = () => {
    onClose();
    navigate('/recover-account');
  };

  const handleProceedWithNew = () => {
    onClose();
    onProceedWithNewAccount();
  };

  if (!deletedAccount) return null;

  // Calculate remaining time
  const now = new Date();
  const deletedDate = new Date(deletedAccount.deletedAt);
  const deadline = new Date(deletedDate.getTime() + (7 * 24 * 60 * 60 * 1000));
  const daysRemaining = Math.ceil((deadline - now) / (24 * 60 * 60 * 1000));
  const hoursRemaining = Math.ceil((deadline - now) / (60 * 60 * 1000));

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '500px'
        }
      }}
    >
      <DialogTitle sx={{ 
        textAlign: 'center', 
        pb: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1
      }}>
        <WarningIcon sx={{ color: 'warning.main', fontSize: 28 }} />
        <Typography variant="h5" component="span" sx={{ fontWeight: 'bold' }}>
          Account Recently Deleted
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pb: 2 }}>
        {/* Critical Warning */}
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
            🚫 You cannot use this email address for 7 days!
          </Typography>
          <Typography variant="body2">
            This email is temporarily blocked from creating new accounts until the recovery period expires.
          </Typography>
        </Alert>

        {/* Account Details */}
        <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'text.primary', fontWeight: 'bold' }}>
            📋 Deleted Account Information
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                <strong>Email:</strong>
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium', color: 'error.main' }}>
                {email}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                <strong>Username:</strong>
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {deletedAccount.username}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                <strong>Name:</strong>
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {deletedAccount.name}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                <strong>Role:</strong>
              </Typography>
              <Chip 
                label={deletedAccount.role} 
                color="primary" 
                size="small" 
                sx={{ textTransform: 'capitalize' }}
              />
            </Box>
          </Box>
          
          {deletedAccount.deletionSequence > 1 && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'grey.300' }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Deletion #:</strong> {deletedAccount.deletionSequence}
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Time Restrictions */}
        <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TimeIcon sx={{ color: 'warning.main' }} />
            <Typography variant="h6" sx={{ color: 'warning.dark', fontWeight: 'bold' }}>
              ⏰ Recovery Time Restrictions
            </Typography>
          </Box>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                <strong>Account Deleted:</strong>
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {formatDate(deletedDate)}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                <strong>Recovery Deadline:</strong>
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium', color: 'error.main' }}>
                {formatDate(deadline)}
              </Typography>
            </Box>
          </Box>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              <strong>⏳ Time Remaining:</strong> {daysRemaining > 0 ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}` : `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`}
            </Typography>
          </Alert>
          
          <Typography variant="body2" color="text.secondary">
            <strong>📅 Important:</strong> After {formatDate(deadline)}, you will no longer be able to recover this account, 
            but you can use this email to create a new account.
          </Typography>
        </Paper>

        {/* What You Can Do */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ fontWeight: 'medium', mb: 1 }}>
            🤔 What would you like to do?
          </Typography>
          <Typography variant="body2">
            You have two options during this 7-day recovery period:
          </Typography>
        </Alert>

        {/* Options Explanation */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
          <Paper elevation={1} sx={{ p: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.dark', mb: 1 }}>
              ✅ Option 1: Recover Deleted Account
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
              Get back all your data, events, and history. This is recommended if you want to keep your previous information.
            </Typography>
          </Paper>
          
          <Paper elevation={1} sx={{ p: 2, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'info.dark', mb: 1 }}>
              ⏳ Option 2: Wait for Recovery Period
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
              Wait until {formatDate(deadline)} when you can use this email to create a completely new account.
            </Typography>
          </Paper>
        </Box>

        {/* Final Warning */}
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>🚫 Blocked:</strong> You cannot create a new account with email <strong>{email}</strong> until {formatDate(deadline)}.
          </Typography>
        </Alert>
      </DialogContent>

      <Divider sx={{ mx: 2 }} />
      
      <DialogActions sx={{ 
        p: 3, 
        gap: 2, 
        flexDirection: 'column',
        alignItems: 'stretch'
      }}>
        {deletedAccount.canRecover && (
          <Button
            onClick={handleRecoverAccount}
            variant="contained"
            color="success"
            size="large"
            startIcon={<RefreshIcon />}
            fullWidth
            sx={{ 
              py: 1.5, 
              fontSize: '1.1rem',
              fontWeight: 'bold',
              textTransform: 'none'
            }}
          >
            🔄 Recover My Deleted Account ({daysRemaining > 0 ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left` : `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''} left`})
          </Button>
        )}
        
        <Button
          onClick={onClose}
          variant="outlined"
          color="primary"
          size="large"
          startIcon={<TimeIcon />}
          fullWidth
          sx={{ 
            py: 1.5, 
            fontSize: '1rem',
            textTransform: 'none',
            borderColor: 'primary.main',
            color: 'primary.main'
          }}
        >
          ⏳ Wait Until {formatDate(deadline)} (Use Different Email)
        </Button>
        
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
          size="large"
          startIcon={<CancelIcon />}
          fullWidth
          sx={{ 
            py: 1.5, 
            fontSize: '1rem',
            textTransform: 'none',
            borderColor: 'grey.400',
            color: 'grey.700'
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RecentlyDeletedAccountModal;
