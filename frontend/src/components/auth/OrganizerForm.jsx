import React, { useState, useEffect, useCallback } from 'react';
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import RecentlyDeletedAccountModal from './RecentlyDeletedAccountModal';
import GoogleOAuthButton from './GoogleOAuthButton';
import RoleSelectionModal from './RoleSelectionModal';
import OAuthRegistrationForm from './OAuthRegistrationForm';
import AccountLinkingModal from './AccountLinkingModal';
import { googleOAuthCallback, linkOAuthAccount, completeOAuthRegistration } from '../../api/oauth';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Typography,
  Box,
  Divider,
  Alert,
  Snackbar,
  IconButton,
  InputAdornment
} from "@mui/material";
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { showAlert } from '../../utils/notifications';
import ProfileImageUpload from '../common/ProfileImageUpload';
import DocumentUpload from '../common/DocumentUpload';
import { FullScreenLoader } from '../common/LoaderComponents';

export default function OrganizerForm() {
  const initialFormState = {
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    dateOfBirth: "",
    city: "",
    gender: "",
    organization: "",
    profileImage: null,
    govtIdProof: null,
  };

  const resetForm = () => {
    const initialState = {
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      dateOfBirth: "",
      gender: "",
      city: "",
      organization: "",
      govtIdProof: null,
      profileImage: null,
    };
    setFormData(initialState);
    setError(null);
    setUsernameStatus({
      checking: false,
      available: null,
      message: ''
    });
    // Reset password validation states
    setPasswordErrors([]);
    setConfirmPasswordError('');
    setPasswordStrength(0);
    return initialState;
  };

  const [formData, setFormData] = useState(initialFormState);

  const [usernameStatus, setUsernameStatus] = useState({
    checking: false,
    available: null,
    message: ''
  });

  const [usernameError, setUsernameError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameLastTyped, setUsernameLastTyped] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' // 'success', 'error', 'warning', 'info'
  });

  // Password validation states
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Common weak passwords
  const weakPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein', 'welcome', 'password123', 'admin123'];

  const [recentlyDeletedAccount, setRecentlyDeletedAccount] = useState(null);
  const [showRecentlyDeletedModal, setShowRecentlyDeletedModal] = useState(false);
  
  // OAuth states
  const [oauthData, setOauthData] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [showLinkingModal, setShowLinkingModal] = useState(false);
  const [existingUser, setExistingUser] = useState(null);

  // Date validation helper
  const validateDateOfBirth = (dateString) => {
    if (!dateString) return null;
    const selectedDate = new Date(dateString);
    const today = new Date();
    if (selectedDate > today) {
      return 'Date of birth cannot be in the future';
    }
    return null;
  };
  const [selectedRole, setSelectedRole] = useState('');

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  // Password validation function
  const validatePassword = (password) => {
    const errors = [];
    let strength = 0;

    // Check minimum length
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    } else {
      strength += 1;
    }

    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Include at least one uppercase letter');
    } else {
      strength += 1;
    }

    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Include at least one lowercase letter');
    } else {
      strength += 1;
    }

    // Check for number
    if (!/\d/.test(password)) {
      errors.push('Include at least one number');
    } else {
      strength += 1;
    }

    // Check for special character
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Include at least one special character (!@#$%^&*(),.?":{}|<>)');
    } else {
      strength += 1;
    }

    // Check for common weak passwords
    if (weakPasswords.includes(password.toLowerCase())) {
      errors.push('This is a commonly used password. Please choose a stronger one.');
    }

    setPasswordErrors(errors);
    setPasswordStrength(strength);
    return errors.length === 0;
  };

  // Confirm password validation
  const validateConfirmPassword = (confirmPass) => {
    if (confirmPass !== formData.password) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  // Get password strength color and text
  const getPasswordStrengthInfo = () => {
    if (passwordStrength === 0) return { color: 'text-gray-400', text: 'Very Weak' };
    if (passwordStrength === 1) return { color: 'text-red-500', text: 'Weak' };
    if (passwordStrength === 2) return { color: 'text-orange-500', text: 'Fair' };
    if (passwordStrength === 3) return { color: 'text-yellow-500', text: 'Good' };
    if (passwordStrength === 4) return { color: 'text-blue-500', text: 'Strong' };
    if (passwordStrength === 5) return { color: 'text-green-500', text: 'Very Strong' };
    if (passwordStrength === 6) return { color: 'text-green-600', text: 'Excellent' };
    return { color: 'text-gray-400', text: 'Very Weak' };
  };

  const handleCloseRecentlyDeletedModal = () => {
    setShowRecentlyDeletedModal(false);
    setRecentlyDeletedAccount(null);
  };

  const handleProceedWithNewAccount = () => {
    // Clear the email field and allow user to proceed with new account
    setFormData(prev => ({
      ...prev,
      email: '',
      password: '',
      confirmPassword: ''
    }));
    setShowRecentlyDeletedModal(false);
    setRecentlyDeletedAccount(null);
    setError({
      type: 'GENERIC',
      message: 'Please use a different email address for your new account.'
    });
  };

  const handleGoogleOAuth = async (token) => {
    console.log('🚀 OrganizerForm: OAuth started', { tokenLength: token?.length });
    setLoading(true);
    setError(null);
    
    try {
      console.log('📡 OrganizerForm: Calling googleOAuthCallback...');
      const response = await googleOAuthCallback(token);
      console.log('✅ OrganizerForm: OAuth response received', { 
        action: response.action,
        hasToken: !!response.token,
        hasUser: !!response.user,
        userRole: response.user?.role
      });
      
      if (response.action === 'login') {
        console.log('🔑 OrganizerForm: User exists, logging in...');
        // User exists with OAuth - login directly
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Dispatch custom event to notify other components about user data update
        window.dispatchEvent(new CustomEvent('userDataUpdated', {
          detail: { user: response.user }
        }));
        
        if (response.user.role === 'organizer') {
          console.log('🏢 OrganizerForm: Navigating to organizer dashboard');
          navigate('/organizer/dashboard');
        } else {
          console.log('👥 OrganizerForm: Navigating to volunteer dashboard');
          navigate('/volunteer/dashboard');
        }
      } else if (response.action === 'link_account') {
        console.log('🔗 OrganizerForm: Showing account linking modal');
        // User exists with email but no OAuth - show linking modal
        setOauthData(response.oauthData);
        setExistingUser(response.existingUser);
        setShowLinkingModal(true);
      } else if (response.action === 'register') {
        console.log('📝 OrganizerForm: Showing role selection modal');
        // New user - show role selection
        setOauthData(response.oauthData);
        setShowRoleModal(true);
        console.log('🔍 OrganizerForm: Modal state set to true, oauthData:', response.oauthData);
      }
    } catch (error) {
      console.error('❌ OrganizerForm: OAuth error', { 
        error,
        response: error.response?.data,
        status: error.response?.status,
        code: error.response?.data?.code,
        errorType: error.response?.data?.errorType
      });
      
      // Check if it's a recently deleted account error
      if (error.response?.data?.errorType === 'RECENTLY_DELETED_ACCOUNT') {
        console.log('🗑️ OrganizerForm: Recently deleted account error detected in OAuth');
        setRecentlyDeletedAccount(error.response.data.deletedAccount);
        setShowRecentlyDeletedModal(true);
      } else if (error.response?.data?.code === 'ACCOUNT_DELETED') {
        console.log('🗑️ OrganizerForm: Account deleted error detected');
        setError({
          type: 'GENERIC',
          message: error.response.data.message
        });
      } else {
        console.log('⚠️ OrganizerForm: Generic OAuth error');
        setError({
          type: 'GENERIC',
          message: error.message || 'OAuth authentication failed'
        });
      }
    } finally {
      console.log('🏁 OrganizerForm: OAuth flow completed');
      setLoading(false);
    }
  };

  const handleRoleSelect = (role) => {
    console.log('🎯 OrganizerForm: Role selected', { role });
    setSelectedRole(role);
    setShowRoleModal(false);
    setShowRegistrationForm(true);
    console.log('📝 OrganizerForm: Showing registration form, modal states:', { 
      showRoleModal: false, 
      showRegistrationForm: true 
    });
  };

  const handleRegistrationComplete = async (userData) => {
    console.log('📝 OrganizerForm: OAuth registration started', { userData });
    setLoading(true);
    setError(null);
    
    try {
      console.log('📡 OrganizerForm: Calling completeOAuthRegistration...');
      const response = await completeOAuthRegistration(userData);
      console.log('✅ OrganizerForm: Registration completed', { 
        hasToken: !!response.token,
        hasUser: !!response.user,
        userRole: response.user?.role
      });
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Dispatch custom event to notify other components about user data update
      window.dispatchEvent(new CustomEvent('userDataUpdated', {
        detail: { user: response.user }
      }));
      
      // Keep loading state active during navigation
      if (response.user.role === 'organizer') {
        console.log('🏢 OrganizerForm: Navigating to organizer dashboard');
        navigate('/organizer/dashboard');
      } else {
        console.log('👥 OrganizerForm: Navigating to volunteer dashboard');
        navigate('/volunteer/dashboard');
      }
      
      // Note: Loading state will be cleared when component unmounts after navigation
      // This ensures the button stays disabled until the user is fully logged in
      
    } catch (error) {
      console.error('❌ OrganizerForm: Registration error', { 
        error,
        response: error.response?.data,
        status: error.response?.status,
        errorType: error.response?.data?.errorType
      });
      
      // Check if it's a recently deleted account error
      if (error.response?.data?.errorType === 'RECENTLY_DELETED_ACCOUNT') {
        console.log('🗑️ OrganizerForm: Recently deleted account error detected');
        setError({
          type: 'RECENTLY_DELETED_ACCOUNT',
          message: error.response.data.message,
          deletedAccount: error.response.data.deletedAccount,
          suggestion: error.response.data.suggestion,
          remainingDays: error.response.data.remainingDays
        });
      } else {
        console.log('⚠️ OrganizerForm: Generic registration error');
        setError({
          type: 'GENERIC',
          message: error.message || 'Registration failed'
        });
      }
      
      // Reset loading state on error
      setLoading(false);
    }
  };

  const handleBackToRoleSelection = () => {
    setShowRegistrationForm(false);
    setShowRoleModal(true);
  };

  const handleLinkAccount = async () => {
    console.log('🔗 OrganizerForm: Account linking started', { 
      existingUserId: existingUser._id,
      oauthId: oauthData.oauthId,
      email: oauthData.email
    });
    
    try {
      console.log('📡 OrganizerForm: Calling linkOAuthAccount...');
      const response = await linkOAuthAccount({
        userId: existingUser._id,
        oauthId: oauthData.oauthId,
        name: oauthData.name,
        email: oauthData.email,
        picture: oauthData.picture || null
      });
      console.log('✅ OrganizerForm: Account linking completed', { 
        hasToken: !!response.token,
        hasUser: !!response.user,
        userRole: response.user?.role
      });
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Dispatch custom event to notify other components about user data update
      window.dispatchEvent(new CustomEvent('userDataUpdated', {
        detail: { user: response.user }
      }));
      
      if (response.user.role === 'organizer') {
        console.log('🏢 OrganizerForm: Navigating to organizer dashboard');
        navigate('/organizer/dashboard');
      } else {
        console.log('👥 OrganizerForm: Navigating to volunteer dashboard');
        navigate('/volunteer/dashboard');
      }
    } catch (error) {
      console.error('❌ OrganizerForm: Account linking error', { 
        error,
        response: error.response?.data,
        status: error.response?.status
      });
      setError({
        type: 'GENERIC',
        message: error.message || 'Account linking failed'
      });
    }
  };

  const navigate = useNavigate();
  const cityOptions = ["Mumbai", "Pune", "Delhi", "Bangalore", "Hyderabad", "Chennai"];

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'file') {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
      
      // Handle password validation
      if (name === 'password') {
        validatePassword(value);
        // Clear confirm password error when password changes
        if (formData.confirmPassword && confirmPasswordError) {
          setConfirmPasswordError('');
        }
      } else if (name === 'confirmPassword') {
        validateConfirmPassword(value);
      }
      
      // Check username availability when username field changes
      if (name === 'username') {
        // Clear any username-related errors
        setUsernameError('');
        
        // Validate username format
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (value.length > 0 && !usernameRegex.test(value)) {
          setUsernameError('Username can only contain letters, numbers, and underscores');
          setUsernameStatus({
            checking: false,
            available: null,
            message: ''
          });
        } else if (value.length > 0 && value.length < 3) {
          setUsernameError('Username must be at least 3 characters long');
          setUsernameStatus({
            checking: false,
            available: null,
            message: ''
          });
        } else if (value.length > 30) {
          setUsernameError('Username must be 30 characters or less');
          setUsernameStatus({
            checking: false,
            available: null,
            message: ''
          });
        } else {
          setUsernameError('');
          if (value.length >= 3) {
            checkUsernameAvailability(value);
          } else {
            setUsernameStatus({
              checking: false,
              available: null,
              message: ''
            });
          }
        }
      }
    }
  };

  const checkUsernameAvailability = async (username) => {
    setUsernameStatus({ checking: true, available: null, message: '' });
    
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/user/check-username/${username}`);
      setUsernameStatus({
        checking: false,
        available: response.data.available,
        message: response.data.message
      });
    } catch (error) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: 'Error checking username availability'
      });
    }
  };

  // Handle profile image change from ProfileImageUpload component
  const handleProfileImageChange = useCallback((imageData) => {
    setFormData((prev) => ({ ...prev, profileImage: imageData }));
  }, []);

  // Handle government ID proof change from DocumentUpload component
  const handleGovtIdProofChange = useCallback((documentData) => {
    setFormData((prev) => ({ ...prev, govtIdProof: documentData }));
  }, []);

  // Check if any upload is in progress
  const isUploading = (formData.profileImage && formData.profileImage.uploading) || 
                     (formData.govtIdProof && formData.govtIdProof.uploading);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🎯 Organizer form submitted!');
    console.log('Form data:', formData);
    console.log('Validation states:', {
      passwordErrors: passwordErrors.length,
      confirmPasswordError: !!confirmPasswordError,
      passwordStrength,
      usernameStatus,
      usernameError: !!usernameError,
      isUploading
    });
    setError(null);

    // Validate date of birth
    const dateError = validateDateOfBirth(formData.dateOfBirth);
    if (dateError) {
      setError({
        type: 'GENERIC',
        message: dateError
      });
      return;
    }

    // Validate password before submission
    if (!validatePassword(formData.password)) {
      setError({
        type: 'GENERIC',
        message: 'Please fix password requirements before submitting'
      });
      return;
    }

    // Validate confirm password
    if (!validateConfirmPassword(formData.confirmPassword)) {
      setError({
        type: 'GENERIC',
        message: 'Passwords do not match'
      });
      return;
    }

    // Check if password is too weak
    if (passwordStrength < 4) {
      setError({
        type: 'GENERIC',
        message: 'Password is too weak. Please choose a stronger password.'
      });
      return;
    }

    if (!formData.email || !formData.password) {
      const errorMsg = !formData.email ? 'Email is required' : 'Password is required';
      setError({
        type: 'GENERIC',
        message: errorMsg
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError({
        type: 'GENERIC',
        message: "Passwords don't match"
      });
      return;
    }

    if (!formData.name || !formData.username || !formData.phone || !formData.dateOfBirth || !formData.gender) {
      setError({
        type: 'GENERIC',
        message: 'All fields are required'
      });
      return;
    }

    if (usernameStatus.available === false) {
      setError({
        type: 'GENERIC',
        message: 'Username is not available. Please choose a different one.'
      });
      return;
    }

    if (usernameError) {
      setError({
        type: 'GENERIC',
        message: usernameError
      });
      return;
    }

    setLoading(true);
    setIsSigningUp(true);
    setError(null);
    
    try {
      console.log('🚀 Starting organizer signup process...');
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'profileImage' && formData[key]) {
          // Handle both file objects and Cloudinary image data
          if (formData[key] instanceof File) {
            formDataToSend.append('profileImage', formData[key]);
          } else if (formData[key] && formData[key].url) {
            // If it's Cloudinary data, we need to send the URL
            formDataToSend.append('profileImageUrl', formData[key].url);
          }
        } else if (key === 'govtIdProof' && formData[key]) {
          // Handle both file objects and Cloudinary document data
          if (formData[key] instanceof File) {
            formDataToSend.append('govtIdProof', formData[key]);
          } else if (formData[key] && formData[key].url) {
            // If it's Cloudinary data, we need to send the URL
            formDataToSend.append('govtIdProofUrl', formData[key].url);
          }
        } else if (key !== 'profileImage' && key !== 'govtIdProof') {
          formDataToSend.append(key, formData[key]);
        }
      });

            console.log('📡 Sending organizer signup request to server...');
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/signup-organizer`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ Organizer signup successful:', response.data);
      
      // Show success message
      showAlert.success('🎉 Organizer account created successfully! Please login to continue.');
      
      // Redirect to login page instead of auto-login
      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (err) {
      console.error('❌ Organizer signup error:', err);
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      
      // Check if it's a recently deleted account error
      if (err.response?.data?.errorType === 'RECENTLY_DELETED_ACCOUNT') {
        setRecentlyDeletedAccount(err.response.data.deletedAccount);
        setShowRecentlyDeletedModal(true);
      } else if (err.response?.status === 400) {
        if (err.response.data.message?.includes('Email already exists')) {
          setError({
            type: 'GENERIC',
            message: '📧 An account with this email already exists. Please try logging in instead.'
          });
        } else if (err.response.data.message?.includes('Username already exists')) {
          setError({
            type: 'GENERIC',
            message: '👤 This username is already taken. Please choose a different one.'
          });
        } else {
          setError({
            type: 'GENERIC',
            message: err.response.data.message || '❌ An error occurred during signup'
          });
        }
      } else if (err.response?.status === 409) {
        setError({
          type: 'GENERIC',
          message: '🔄 Account recovery available. Please try to recover your existing account.'
        });
      } else if (err.response?.status === 500) {
        setError({
          type: 'GENERIC',
          message: '💥 Server error. Please try again later or contact support.'
        });
      } else if (err.message === 'Network Error') {
        setError({
          type: 'GENERIC',
          message: '🌐 Network error. Please check your internet connection and try again.'
        });
      } else {
        setError({
          type: 'GENERIC',
          message: err.response?.data?.message || '❌ An unexpected error occurred. Please try again.'
        });
      }
      
              showAlert.error('❌ Signup failed. Please check the errors below.');
          } finally {
        setLoading(false);
        setIsSigningUp(false);
      }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 3, bgcolor: "white", borderRadius: 2, boxShadow: 3 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        Organizer Signup
      </Typography>
      
      {/* Error Display - Moved to top */}
      {error && (
        <>
          {error.type === 'RECENTLY_DELETED_ACCOUNT' ? (
            <Box sx={{
              border: '1px solid #f44336',
              borderRadius: 1,
              p: 3,
              mb: 3,
              backgroundColor: '#ffebee',
              maxWidth: '100%',
              overflow: 'hidden'
            }}>
              <Typography variant="h6" color="error" sx={{ mb: 2, fontWeight: 'bold' }}>
                🚫 Account Recently Deleted - Email Temporarily Blocked
              </Typography>

              {/* Critical Warning */}
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  ⚠️ You cannot use this email address for 7 days!
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  This email is temporarily blocked from creating new accounts until the recovery period expires.
                </Typography>
              </Alert>

              {/* Account Details */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: 'text.primary' }}>
                  📋 Deleted Account Information
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Email:</strong> <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>{formData.email}</span>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Username:</strong> {error.deletedAccount.username}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Name:</strong> {error.deletedAccount.name}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Role:</strong> {error.deletedAccount.role}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Deleted:</strong> {new Date(error.deletedAccount.deletedAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>

              {/* Time Restrictions */}
              <Box sx={{ mb: 2, p: 2, bgcolor: 'warning.50', borderRadius: 1, border: '1px solid', borderColor: 'warning.200' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: 'warning.dark' }}>
                  ⏰ 7-Day Recovery Window
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Recovery Deadline:</strong> {new Date(new Date(error.deletedAccount.deletedAt).getTime() + (7 * 24 * 60 * 60 * 1000)).toLocaleDateString()}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  After this date, you can no longer recover your account, but you can use this email to create a new account.
                </Typography>
              </Box>

              {/* What You Can Do */}
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                <strong>💡 What you can do:</strong> {error.suggestion}
              </Typography>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  component={Link}
                  to="/recover-account"
                  variant="contained"
                  color="success"
                  size="medium"
                  startIcon={<span>🔄</span>}
                  sx={{ textTransform: 'none', fontWeight: 'bold' }}
                >
                  🔄 Recover My Deleted Account
                </Button>

                <Button
                  variant="outlined"
                  color="primary"
                  size="medium"
                  startIcon={<span>✨</span>}
                  onClick={() => {
                    setError(null);
                    setFormData(prev => ({ ...prev, email: '' }));
                  }}
                  sx={{ textTransform: 'none' }}
                >
                  ✨ Use Different Email Address
                </Button>
              </Box>

              {/* Final Note */}
              <Typography variant="body2" sx={{ mt: 2, fontSize: '0.875rem', color: 'text.secondary', fontStyle: 'italic' }}>
                <strong>Note:</strong> You must wait until the 7-day recovery period expires to use this email for a new account.
              </Typography>
            </Box>
          ) : (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error.message}
            </Alert>
          )}
        </>
      )}
      
      {/* Google OAuth Button */}
      <GoogleOAuthButton 
        onSuccess={handleGoogleOAuth}
        onError={(error) => {
          console.error('❌ OrganizerForm: Google OAuth button error', { error });
          setError({
            type: 'GENERIC',
            message: error.message || 'OAuth authentication failed'
          });
        }}
        disabled={loading}
      />
      
      <Divider sx={{ my: 2 }}>
        <Typography variant="body2" color="text.secondary">
          OR
        </Typography>
      </Divider>

      <TextField fullWidth margin="normal" name="name" label="Full Name" value={formData.name} onChange={handleChange} required />
      
      <TextField 
        fullWidth 
        margin="normal" 
        name="username" 
        label="Username" 
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
            : 'Username must be 3-30 characters, letters, numbers, and underscores only'
        }
        error={usernameError || usernameStatus.available === false}
      />
      
      <TextField fullWidth margin="normal" label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
      
      {/* Password Field */}
      <TextField 
        fullWidth 
        margin="normal" 
        name="password" 
        label="Password" 
        type="password" 
        value={formData.password} 
        onChange={handleChange} 
        required 
        error={passwordErrors.length > 0 && formData.password}
        helperText={
          passwordErrors.length > 0 && formData.password
            ? passwordErrors[0]
            : 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
        }
      />
      
      {/* Password Strength Indicator */}
      {formData.password && (
        <div className="mt-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Strength:</span>
            <span className={`text-xs font-medium ${getPasswordStrengthInfo().color}`}>
              {getPasswordStrengthInfo().text}
            </span>
          </div>
          <div className="mt-1 flex space-x-1">
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <div
                key={level}
                className={`h-1 flex-1 rounded ${
                  level <= passwordStrength
                    ? level <= 2 ? 'bg-red-500' 
                      : level <= 3 ? 'bg-yellow-500' 
                      : level <= 4 ? 'bg-blue-500' 
                      : 'bg-green-500'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Password Requirements */}
      {formData.password && (
        <div className="mt-3 space-y-1">
          <p className="text-xs text-gray-600 font-medium">Password Requirements:</p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li className={`flex items-center ${formData.password.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-1">{formData.password.length >= 8 ? '✓' : '○'}</span>
              At least 8 characters
            </li>
            <li className={`flex items-center ${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-1">{/[A-Z]/.test(formData.password) ? '✓' : '○'}</span>
              One uppercase letter
            </li>
            <li className={`flex items-center ${/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-1">{/[a-z]/.test(formData.password) ? '✓' : '○'}</span>
              One lowercase letter
            </li>
            <li className={`flex items-center ${/\d/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-1">{/\d/.test(formData.password) ? '✓' : '○'}</span>
              One number
            </li>
            <li className={`flex items-center ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-1">{/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? '✓' : '○'}</span>
              One special character
            </li>
            <li className={`flex items-center ${!weakPasswords.includes(formData.password.toLowerCase()) ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-1">{!weakPasswords.includes(formData.password.toLowerCase()) ? '✓' : '○'}</span>
              Not a common password
            </li>
          </ul>
          
          {/* Success message when all requirements are met */}
          {passwordErrors.length === 0 && passwordStrength >= 4 && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
              <p className="text-xs text-green-700 font-medium flex items-center">
                <span className="mr-1">✓</span>
                Great! Your password meets all security requirements.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Password Errors */}
      {passwordErrors.length > 0 && formData.password && (
        <div className="mt-2 space-y-1">
          {passwordErrors.map((error, index) => (
            <p key={index} className="text-xs text-red-600 flex items-center">
              <span className="mr-1">⚠</span>
              {error}
            </p>
          ))}
        </div>
      )}

      {/* Confirm Password Field */}
      <TextField 
        fullWidth 
        margin="normal" 
        name="confirmPassword" 
        label="Confirm Password" 
        type="password" 
        value={formData.confirmPassword} 
        onChange={handleChange} 
        required 
        error={confirmPasswordError}
        helperText={confirmPasswordError || 'Please confirm your password'}
      />
      
      {/* Confirm Password Error */}
      {confirmPasswordError && (
        <p className="mt-2 text-xs text-red-600 flex items-center">
          <span className="mr-1">⚠</span>
          {confirmPasswordError}
        </p>
      )}
      
      <TextField fullWidth margin="normal" label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} required />

      <FormControl fullWidth margin="normal">
        <InputLabel>City</InputLabel>
        <Select name="city" value={formData.city} onChange={handleChange} label="City" required>
          {cityOptions.map((city) => (
            <MenuItem key={city} value={city}>{city}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField 
        fullWidth 
        margin="normal"
        name="dateOfBirth" 
        label="Date of Birth" 
        type="date" 
        value={formData.dateOfBirth} 
        onChange={handleChange} 
        InputLabelProps={{ shrink: true }} 
        inputProps={{
          max: new Date().toISOString().split('T')[0] // Prevent future dates
        }}
        error={!!validateDateOfBirth(formData.dateOfBirth)}
        helperText={validateDateOfBirth(formData.dateOfBirth) || "Select your date of birth"}
        required 
      />

      <FormControl fullWidth margin="normal">
        <InputLabel>Gender</InputLabel>
        <Select name="gender" value={formData.gender} onChange={handleChange} label="Gender" required>
          <MenuItem value="male">Male</MenuItem>
          <MenuItem value="female">Female</MenuItem>
          <MenuItem value="other">Other</MenuItem>
        </Select>
      </FormControl>

      <Box mt={2}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>
          📸 Profile Image
        </Typography>
        <ProfileImageUpload
          onImageChange={handleProfileImageChange}
          disabled={loading}
          folder="profiles"
        />
      </Box>

      <Box mt={3}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>
          🆔 Government ID Proof
        </Typography>
        <DocumentUpload
          onDocumentChange={handleGovtIdProofChange}
          disabled={loading}
          folder="documents"
          title="Upload Government ID Proof"
          description="Upload a clear image or PDF of your government-issued ID"
          acceptedTypes="image/*,.pdf"
        />
      </Box>



      <Button 
        type="submit" 
        variant="contained" 
        color="primary" 
        fullWidth 
        sx={{ 
           mt: 2,
           py: 1.5,
           fontSize: '1.1rem',
           fontWeight: 600,
           textTransform: 'none',
           position: 'relative',
           '&:disabled': {
             opacity: 0.7,
             cursor: 'not-allowed'
           }
         }}
         disabled={loading || isSigningUp || passwordErrors.length > 0 || confirmPasswordError || passwordStrength < 4 || isUploading}
       >
         {isSigningUp ? (
           <>
             <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
             Creating Account...
           </>
         ) : loading ? (
           <>
             <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
             Processing...
           </>
         ) : isUploading ? (
           <>
             <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
             Uploading Files...
           </>
         ) : (
           '🚀 Sign Up as Organizer'
         )}
       </Button>


      
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Already a user?{' '}
          <Button 
            variant="text" 
            size="small" 
            onClick={() => navigate('/login')}
            sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
          >
            Login
          </Button>
        </Typography>
      </Box>

      {/* Snackbar for success/error messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Recently Deleted Account Modal */}
              <RecentlyDeletedAccountModal
          isOpen={showRecentlyDeletedModal}
          onClose={handleCloseRecentlyDeletedModal}
          deletedAccount={recentlyDeletedAccount}
          onProceedWithNewAccount={handleProceedWithNewAccount}
          email={formData.email}
          remainingDays={recentlyDeletedAccount?.remainingDays}
          recoveryDeadline={recentlyDeletedAccount?.recoveryDeadline}
        />

      {/* OAuth Modals */}
      {showRoleModal && (
        <RoleSelectionModal
          open={showRoleModal}
          onRoleSelect={handleRoleSelect}
          onClose={() => setShowRoleModal(false)}
          oauthData={oauthData}
        />
      )}

      {showRegistrationForm && (
        <OAuthRegistrationForm
          open={showRegistrationForm}
          oauthData={oauthData}
          role={selectedRole}
          onSubmit={handleRegistrationComplete}
          onBack={handleBackToRoleSelection}
          onClose={() => setShowRegistrationForm(false)}
        />
      )}

      {showLinkingModal && (
        <AccountLinkingModal
          open={showLinkingModal}
          existingUser={existingUser}
          oauthData={oauthData}
          onLink={handleLinkAccount}
          onClose={() => setShowLinkingModal(false)}
        />
      )}

      {/* Full Screen Loader for Signup Process */}
      <FullScreenLoader
        isVisible={isSigningUp}
        message="Creating Your Account..."
        subMessage="Setting up your organizer profile and uploading files..."
        showProgress={false}
      />
    </Box>
  );
}
