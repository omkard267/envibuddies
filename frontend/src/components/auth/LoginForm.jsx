import React, { useState, useEffect } from "react";
import axios from 'axios';
import { Link, useNavigate } from "react-router-dom";
import { showAlert } from "../../utils/notifications";
import {
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  Divider,
  CircularProgress,
  Snackbar,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon, CheckCircle as CheckCircleIcon, Error as ErrorIcon } from '@mui/icons-material';
import GoogleOAuthButton from './GoogleOAuthButton';
import RoleSelectionModal from './RoleSelectionModal';
import OAuthRegistrationForm from './OAuthRegistrationForm';
import AccountLinkingModal from './AccountLinkingModal';
import { googleOAuthCallback, completeOAuthRegistration, linkOAuthAccount } from '../../api/oauth';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  
  // OAuth states
  const [oauthData, setOauthData] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [showLinkingModal, setShowLinkingModal] = useState(false);
  const [existingUser, setExistingUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');

  const navigate = useNavigate();

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();
    
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/login`, {
        email,
        password,
      });

      // Handle new token structure
      const token = res.data.accessToken || res.data.token;
      localStorage.setItem('token', token);
      if (res.data.refreshToken) {
        localStorage.setItem('refreshToken', res.data.refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(res.data.user));

      setSuccess('🎉 Login successful! Redirecting...');
      setLoginAttempts(0);

      // Dispatch custom event to notify other components about user data update
      window.dispatchEvent(new CustomEvent('userDataUpdated', {
        detail: { user: res.data.user }
      }));

      // Small delay to ensure event is processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Redirect after showing success message
      setTimeout(() => {
        if (res.data.user.role === 'organizer') {
          navigate('/organizer/dashboard');
        } else {
          navigate('/volunteer/dashboard');
        }
      }, 1500);

    } catch (err) {
      // Check if it's a deleted account error
      if (err.response?.data?.code === 'ACCOUNT_DELETED') {
        setError(
          <div>
            <p className="text-red-600 mb-2">{err.response.data.message}</p>
            <Link 
              to="/recover-account" 
              className="text-blue-600 hover:text-blue-500 underline text-sm"
            >
              Click here to recover your account
            </Link>
          </div>
        );
      } else if (err.response?.status === 423) {
        // Account locked
        setError(
          <div>
            <p className="text-red-600 mb-2">🔒 {err.response.data.message}</p>
            <p className="text-sm text-gray-600">
              Please wait before trying again or contact support if this persists.
            </p>
          </div>
        );
      } else if (err.response?.data?.isOAuthUser) {
        // OAuth user trying to login with password
        setError(
          <div>
            <p className="text-red-600 mb-2">🔐 {err.response.data.message}</p>
            <p className="text-sm text-gray-600">
              Use the "Sign in with Google" button below instead.
            </p>
          </div>
        );
      } else {
        setLoginAttempts(prev => prev + 1);
        const remainingAttempts = 5 - loginAttempts - 1;
        
        // Handle specific error codes for better user experience
        const errorCode = err.response?.data?.errorCode;
        let errorMessage = 'Login failed';
        let errorDetails = '';
        
        if (errorCode === 'EMAIL_NOT_FOUND') {
          errorMessage = '📧 Email not found';
          errorDetails = (
            <div>
              <p>No account exists with this email address. Please check your email or</p>
              <Link 
                to="/signup" 
                className="text-blue-600 hover:text-blue-500 underline text-sm"
              >
                create a new account
              </Link>
            </div>
          );
        } else if (errorCode === 'INVALID_PASSWORD') {
          errorMessage = '🔐 Incorrect password';
          errorDetails = (
            <div>
              <p>The password you entered is incorrect. Please try again or</p>
              <Link 
                to="/forgot-password" 
                className="text-blue-600 hover:text-blue-500 underline text-sm"
              >
                click here to reset your password
              </Link>
            </div>
          );
        } else if (errorCode === 'OAUTH_ACCOUNT') {
          errorMessage = '🔐 OAuth account detected';
          errorDetails = 'This account was created with Google. Please use "Sign in with Google" instead.';
        } else {
          // Fallback to generic message
          errorMessage = `❌ ${err.response?.data?.message || 'Login failed'}`;
        }
        
        if (remainingAttempts > 0) {
          setError(
            <div>
              <p className="text-red-600 mb-2">{errorMessage}</p>
              {errorDetails && (
                <p className="text-sm text-gray-600 mb-2">{errorDetails}</p>
              )}
              <p className="text-sm text-gray-600">
                {remainingAttempts} login attempt{remainingAttempts !== 1 ? 's' : ''} remaining before account lockout.
              </p>
            </div>
          );
        } else {
          setError(
            <div>
              <p className="text-red-600 mb-2">🔒 Account locked due to too many failed attempts</p>
              <p className="text-sm text-gray-600">
                Please wait 30 minutes before trying again or contact support.
              </p>
            </div>
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuth = async (token) => {
    setLoading(true);
    clearMessages();
    
    try {
      const response = await googleOAuthCallback(token);
      
      if (response.action === 'login') {
        // User exists with OAuth - login directly
        const token = response.accessToken || response.token;
        localStorage.setItem('token', token);
        if (response.refreshToken) {
          localStorage.setItem('refreshToken', response.refreshToken);
        }
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Dispatch custom event to notify other components about user data update
        window.dispatchEvent(new CustomEvent('userDataUpdated', {
          detail: { user: response.user }
        }));
        
        setSuccess('🎉 OAuth login successful! Redirecting...');
        setLoginAttempts(0);

        // Redirect after showing success message
        setTimeout(() => {
          if (response.user.role === 'organizer') {
            navigate('/organizer/dashboard');
          } else {
            navigate('/volunteer/dashboard');
          }
        }, 1500);
      } else if (response.action === 'link_account') {
        // User exists with email but no OAuth - show linking modal
        setOauthData(response.oauthData);
        setExistingUser(response.existingUser);
        setShowLinkingModal(true);
      } else if (response.action === 'register') {
        // New user - show role selection
        setOauthData(response.oauthData);
        setShowRoleModal(true);
      }
    } catch (error) {
      // Check if it's a deleted account error
      if (error.response?.data?.code === 'ACCOUNT_DELETED') {
        setError(
          <div>
            <p className="text-red-600 mb-2">{error.response.data.message}</p>
            <Link 
              to="/recover-account" 
              className="text-blue-600 hover:text-blue-500 underline text-sm"
            >
              Click here to recover your account
            </Link>
          </div>
        );
      } else if (error.response?.data?.errorType === 'RECENTLY_DELETED_ACCOUNT') {
        // Handle recently deleted account error from OAuth callback
        const deletedAccount = error.response.data.deletedAccount;
        const remainingDays = error.response.data.remainingDays;
        
        setError(
          <div>
            <p className="text-red-600 mb-2">{error.response.data.message}</p>
            <p className="text-sm text-gray-600 mb-2">
              Account: {deletedAccount.username} ({deletedAccount.role})
            </p>
            <p className="text-sm text-gray-600 mb-2">
              {error.response.data.suggestion}
            </p>
            <div className="space-y-2">
              <Link 
                to="/recover-account" 
                className="block text-blue-600 hover:text-blue-500 underline text-sm"
              >
                🔄 Recover your deleted account
              </Link>
              <p className="text-xs text-gray-500">
                You cannot create a new account with this email until the recovery period expires
              </p>
            </div>
          </div>
        );
      } else {
        setError(error.message || 'OAuth authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setShowRoleModal(false);
    setShowRegistrationForm(true);
  };

  const handleRegistrationComplete = async (userData) => {
    setLoading(true);
    clearMessages();
    
    // Add a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('⚠️ Loading timeout reached, resetting loading state');
      setLoading(false);
      setError('Request timed out. Please check your internet connection and try again.');
    }, 30000); // 30 seconds timeout
    
    try {
      console.log('🚀 Starting OAuth registration with data:', userData);
      const response = await completeOAuthRegistration(userData);
      console.log('✅ OAuth registration response:', response);
      
      // Clear the timeout since we got a response
      clearTimeout(loadingTimeout);
      
      if (response.success) {
        // Store user data and tokens in localStorage
        localStorage.setItem('token', response.token); // Changed from 'accessToken' to 'token'
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.user));

        console.log('💾 Stored user data in localStorage');

        // Show success message
        showAlert.success('🎉 Account created successfully! Welcome to EnviBuddies.');

        // Close the registration modal
        setShowRegistrationForm(false);
        setOauthData(null);

        console.log('🔒 Closed registration modal');

        // Dispatch custom event to notify other components about user data update
        window.dispatchEvent(new CustomEvent('userDataUpdated', {
          detail: { user: response.user }
        }));

        // Navigate to appropriate dashboard based on role
        setTimeout(() => {
          console.log('🧭 Navigating to dashboard for role:', response.user.role);
          if (response.user.role === 'organizer') {
            navigate('/organizer/dashboard');
          } else {
            navigate('/volunteer/dashboard');
          }
        }, 1500);
      } else {
        console.error('❌ Registration response indicates failure:', response);
        setError('Registration failed. Please try again.');
      }

    } catch (error) {
      console.error('❌ OAuth registration error:', error);
      
      // Clear the timeout since we got an error
      clearTimeout(loadingTimeout);
      
      // Handle different types of errors
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        setError('Request timed out. Please check your internet connection and try again.');
      } else if (error.code === 'ERR_NETWORK') {
        setError('Network error. Please check your internet connection and try again.');
      } else if (error.response?.data?.errorType === 'RECENTLY_DELETED_ACCOUNT') {
        setError(
          <div>
            <p className="text-red-600 mb-2">{error.response.data.message}</p>
            <p className="text-sm text-gray-600 mb-2">
              Account: {error.response.data.deletedAccount.username} ({error.response.data.deletedAccount.role})
            </p>
            <div className="space-y-2">
              <Link 
                to="/recover-account" 
                className="block text-blue-600 hover:text-blue-500 underline text-sm"
              >
                🔄 Recover your deleted account
              </Link>
              <p className="text-xs text-gray-500">
                Or use a different email address for a new account
              </p>
            </div>
          </div>
        );
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError(error.message || 'Registration failed. Please try again.');
      }
    } finally {
      console.log('🏁 Setting loading to false');
      setLoading(false);
    }
  };

  const handleBackToRoleSelection = () => {
    setShowRegistrationForm(false);
    setShowRoleModal(true);
  };

  const handleLinkAccount = async () => {
    try {
        showAlert.info('🔄 Linking account...');
      
      console.log('Linking account with data:', {
        userId: existingUser._id,
        oauthId: oauthData.oauthId,
        oauthProvider: oauthData.oauthProvider,
        oauthPicture: oauthData.picture
      });

      const response = await linkOAuthAccount({
        userId: existingUser._id,
        oauthId: oauthData.oauthId,
        oauthProvider: oauthData.oauthProvider,
        oauthPicture: oauthData.picture
      });
      
      console.log('Account linking response:', response);
      
              // Show success message
        showAlert.success('🎉 Account linked successfully! Please login to continue.');
      
      // Clear any previous errors
      setError('');
      
      // Close the modal
      setShowLinkingModal(false);
      
      // Clear OAuth data
      setOauthData(null);
      setExistingUser(null);
      
      // Redirect to login page instead of auto-login
      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (error) {
      console.error('Account linking error:', error);
      
      let errorMessage = 'Account linking failed';
      
      if (error.response?.status === 400) {
        errorMessage = error.response.data.message || 'Invalid request data';
      } else if (error.response?.status === 404) {
        errorMessage = 'User not found';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error during account linking';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error - please check your connection';
      } else if (error.code === 'ERR_BAD_REQUEST') {
        errorMessage = 'Bad request - please try again';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
        showAlert.error(`❌ ${errorMessage}`);
      
      // Set error in state for the modal to display
      setError(`❌ ${errorMessage}`);
    }
  };

  const handleCreateNewAccount = () => {
    setShowLinkingModal(false);
    setShowRoleModal(true);
  };

  return (
    <>
      <Box
        component="form"
        onSubmit={handleLogin}
        maxWidth={400}
        mx="auto"
        mt={5}
        p={3}
        boxShadow={3}
        borderRadius={2}
        bgcolor="white"
      >
        <Typography variant="h5" mb={2} fontWeight="bold" color="primary">
          Login
        </Typography>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => clearMessages()}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => clearMessages()}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            {success}
          </Alert>
        )}

        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          required
          margin="normal"
          disabled={loading}
        />

        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          required
          margin="normal"
          disabled={loading}
        />

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          disabled={loading}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'Login'
          )}
        </Button>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Divider sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">OR</Typography>
          </Divider>
          
          <GoogleOAuthButton
            onSuccess={handleGoogleOAuth}
            onError={(error) => setError(error.message || 'Google OAuth failed')}
            disabled={loading}
          />
          
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              New user?{' '}
              <Button 
                variant="text" 
                size="small" 
                onClick={() => navigate('/signup')}
                sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
              >
                Create an account
              </Button>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              <Button 
                variant="text" 
                size="small" 
                onClick={() => navigate('/forgot-password')}
                sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
              >
                Forgot your password?
              </Button>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              <Button 
                variant="text" 
                size="small" 
                onClick={() => navigate('/recover-account')}
                sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
              >
                Recover deleted account?
              </Button>
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Role Selection Modal */}
      <RoleSelectionModal
        open={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        onRoleSelect={handleRoleSelect}
        oauthData={oauthData}
      />

      {/* OAuth Registration Form */}
      <OAuthRegistrationForm
        open={showRegistrationForm}
        onClose={() => setShowRegistrationForm(false)}
        oauthData={oauthData}
        role={selectedRole}
        onSubmit={handleRegistrationComplete}
        onBack={handleBackToRoleSelection}
      />

      {/* Account Linking Modal */}
      <AccountLinkingModal
        open={showLinkingModal}
        onClose={() => {
          setShowLinkingModal(false);
          setError(''); // Clear error when modal closes
        }}
        existingUser={existingUser}
        oauthData={oauthData}
        onLinkAccount={handleLinkAccount}
        onCreateNewAccount={handleCreateNewAccount}
        error={error}
      />
    </>
  );
}
