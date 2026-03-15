import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Box, Button, Typography, CircularProgress, Alert } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { showAlert } from '../../utils/notifications';

const GoogleOAuthButton = ({ onSuccess, onError, disabled = false }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSuccess = async (credentialResponse) => {
    setIsProcessing(true);
    showAlert.info('🔄 Processing Google authentication...');
    
    try {
      await onSuccess(credentialResponse.credential);
    } catch (error) {
      console.error('Google OAuth Error:', error);
      onError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleError = (error) => {
    console.error('Google OAuth Error:', error);
    
    if (error.error === 'popup_closed_by_user') {
      showAlert.warning('⚠️ Google sign-in was cancelled. Please try again.');
    } else if (error.error === 'access_denied') {
      showAlert.error('❌ Access denied. Please allow Google sign-in permissions.');
    } else if (error.error === 'network_error') {
      showAlert.error('🌐 Network error. Please check your internet connection.');
    } else {
      showAlert.error('❌ Google sign-in failed. Please try again.');
    }
    
    onError(error);
  };

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      {isProcessing && (
        <Alert severity="info" sx={{ mb: 2 }}>
          🔄 Processing Google authentication...
        </Alert>
      )}
      
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        disabled={disabled || isProcessing}
        useOneTap={false}
        theme="outline"
        size="large"
        text="continue_with"
        shape="rectangular"
        locale="en"
        style={{
          width: '100%',
          height: '48px',
          borderRadius: '8px',
          border: '1px solid #ddd',
          backgroundColor: '#fff',
          color: '#333',
          fontSize: '16px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: (disabled || isProcessing) ? 'not-allowed' : 'pointer',
          opacity: (disabled || isProcessing) ? 0.6 : 1,
        }}
      />
      
      {isProcessing && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={20} sx={{ mr: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Authenticating with Google...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default GoogleOAuthButton;
