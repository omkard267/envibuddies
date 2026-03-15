import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Avatar,
} from '@mui/material';
import { checkOAuthUsername } from '../../api/oauth';

const OAuthRegistrationForm = ({ open, onClose, oauthData, role, onSubmit, onBack }) => {
  const [formData, setFormData] = useState({
    phone: '',
    username: '',
  });

  const [usernameStatus, setUsernameStatus] = useState({
    checking: false,
    available: null,
    message: ''
  });

  const [usernameError, setUsernameError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');



  // Generate initial username from name
  useEffect(() => {
    if (oauthData?.name && !formData.username) {
      const base = oauthData.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const random = Math.floor(Math.random() * 1000);
      const generatedUsername = `${base}${random}`;
      setFormData(prev => ({ ...prev, username: generatedUsername }));
    }
  }, [oauthData?.name]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Check username availability when username field changes
    if (name === 'username') {
      validateUsername(value);
    }
  };

  const validateUsername = async (username) => {
    // Clear previous status
    setUsernameStatus({ checking: false, available: null, message: '' });
    setUsernameError('');

    // Basic validation
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (username.length > 0 && !usernameRegex.test(username)) {
      setUsernameError('Username can only contain letters, numbers, and underscores');
      return;
    }
    if (username.length > 0 && username.length < 3) {
      setUsernameError('Username must be at least 3 characters long');
      return;
    }
    if (username.length > 30) {
      setUsernameError('Username must be 30 characters or less');
      return;
    }

    // Check availability if username is valid
    if (username.length >= 3) {
      setUsernameStatus({ checking: true, available: null, message: '' });
      try {
        const response = await checkOAuthUsername(username);
        setUsernameStatus({
          checking: false,
          available: response.available,
          message: response.message
        });
      } catch (error) {
        setUsernameStatus({
          checking: false,
          available: false,
          message: 'Error checking username availability'
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    console.log('📝 OAuth registration form submitted');

    // Validate required fields
    if (!formData.phone) {
      setError('Phone number is required');
      return;
    }

    if (usernameError || usernameStatus.available === false) {
      setError('Please fix the username errors before submitting.');
      return;
    }

    if (!formData.username || formData.username.length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }

    setLoading(true);
    console.log('⏳ Setting loading to true in form');

    // Add a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('⚠️ Form loading timeout reached, resetting loading state');
      setLoading(false);
      setError('Request timed out. Please try again.');
    }, 30000); // 30 seconds timeout

    try {
      const userData = {
        ...oauthData,
        role,
        ...formData,
        username: formData.username.toLowerCase(),
      };

      console.log('📤 Calling onSubmit with userData:', userData);

      // Call onSubmit - the parent component will handle the API call and loading state
      await onSubmit(userData);
      
      // Clear the timeout since we got a response
      clearTimeout(loadingTimeout);
      
      console.log('✅ onSubmit completed successfully');
      
      // If we reach here, registration was successful
      // The parent component will handle closing the modal and navigation
      
    } catch (error) {
      console.error('❌ Error in form submission:', error);
      
      // Clear the timeout since we got an error
      clearTimeout(loadingTimeout);
      
      setError(error.message || 'Registration failed');
      setLoading(false); // Reset loading on error
    }
  };

  const handleClose = () => {
    setFormData({
      phone: '',
      username: '',
    });
    setUsernameStatus({ checking: false, available: null, message: '' });
    setUsernameError('');
    setError('');
    setLoading(false);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      sx={{ zIndex: 9999 }}
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
          bgcolor: '#f8f9fa',
          zIndex: 9999
        }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="center" gap={3} mb={2}>
          <Avatar 
            src={oauthData?.picture || null} 
            alt={oauthData?.name}
            sx={{ width: 70, height: 70 }}
          >
            {oauthData?.name?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold" color="primary">
              Complete Your Profile
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Welcome, {oauthData?.name}! Just a few more details to get you started.
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          {/* Required Fields Section */}
          <Typography variant="h6" fontWeight="bold" mb={2} color="primary">
            Required Information
          </Typography>

          <TextField 
            fullWidth 
            margin="normal" 
            label="Phone Number" 
            name="phone" 
            value={formData.phone} 
            onChange={handleChange} 
            required 
            type="tel"
            placeholder="Enter your phone number"
            helperText="We'll use this to contact you about events"
          />

          <TextField 
            fullWidth 
            margin="normal" 
            label="Username" 
            name="username" 
            value={formData.username} 
            onChange={handleChange} 
            required 
            helperText={
              usernameError 
                ? usernameError
                : usernameStatus.checking 
                ? 'Checking availability...' 
                : usernameStatus.available === true 
                ? '✅ Username available' 
                : usernameStatus.available === false 
                ? '❌ Username not available' 
                : 'Choose a unique username (3-30 characters)'
            }
            error={usernameError || usernameStatus.available === false}
            placeholder="Choose a username"
          />

          {/* Info Text */}
          <Typography variant="body2" color="text.secondary" textAlign="center" mt={2}>
            You can always update your profile later with more details.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onBack} color="inherit" disabled={loading}>
          Back
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading || usernameStatus.checking}
          sx={{ minWidth: 120, py: 1 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Complete Registration'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OAuthRegistrationForm;
