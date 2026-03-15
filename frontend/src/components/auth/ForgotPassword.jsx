import React, { useState } from 'react';
import { showAlert } from '../../utils/notifications';
import { forgotPassword } from '../../services/authService';
import { Link } from 'react-router-dom';
import { CircularProgress, Alert, Box, Typography, TextField, Button, Paper } from '@mui/material';
import { Email as EmailIcon, CheckCircle as CheckCircleIcon, Info as InfoIcon } from '@mui/icons-material';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showOAuthMessage, setShowOAuthMessage] = useState(false);
  const [oauthProvider, setOauthProvider] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setShowOAuthMessage(false);

    try {
      const response = await forgotPassword(email);
      setIsSuccess(true);
              showAlert.success('✅ Password reset email sent successfully!');
    } catch (error) {
      console.error('Forgot password error:', error);
      
      if (error.response?.data?.isOAuthUser) {
        setShowOAuthMessage(true);
        setOauthProvider(error.response.data.oauthProvider);
        setEmail(''); // Clear email for OAuth users
        showAlert.info('ℹ️ OAuth account detected');
      } else if (error.response?.status === 429) {
        // Rate limited
        const lockoutTime = error.response.data.lockoutUntil;
        const minutes = Math.ceil((new Date(lockoutTime) - new Date()) / 1000 / 60);
        setError(`🚫 Too many password reset attempts. Please try again in ${minutes} minutes.`);
        showAlert.error('🚫 Rate limited - too many attempts');
      } else if (error.response?.status === 404) {
        setError('❌ No account found with this email address.');
        showAlert.error('❌ Email not found');
      } else if (error.response?.status === 500) {
        setError('💥 Server error. Please try again later.');
        showAlert.error('💥 Server error');
      } else if (error.message === 'Network Error') {
        setError('🌐 Network error. Please check your internet connection.');
        showAlert.error('🌐 Network error');
      } else {
        setError(error.response?.data?.message || '❌ An error occurred while sending the reset email.');
        showAlert.error('❌ Failed to send reset email');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthMessageClose = () => {
    setShowOAuthMessage(false);
    setOauthProvider('');
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Check Your Email
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <InfoIcon className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">What happens next?</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Check your email inbox (and spam folder)</li>
                    <li>Click the reset link in the email</li>
                    <li>Create a new password</li>
                    <li>Login with your new password</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setIsSuccess(false)}
              className="text-blue-600 border-blue-600 hover:bg-blue-50"
            >
              Send Another Reset Email
            </Button>
            
            <Link
              to="/login"
              className="block text-center text-blue-600 hover:text-blue-500 text-sm"
            >
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <EmailIcon className="mx-auto h-16 w-16 text-blue-500" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Forgot Your Password?
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {showOAuthMessage && (
          <Alert 
            severity="info" 
            onClose={handleOAuthMessageClose}
            className="mb-4"
          >
            <div>
              <p className="font-medium mb-2">
                🔐 This account was created with {oauthProvider}
              </p>
              <p className="text-sm mb-2">
                OAuth accounts don't have passwords until they're linked to a manual account.
              </p>
              <div className="space-y-2">
                <Link 
                  to="/login" 
                  className="block text-blue-600 hover:text-blue-500 underline text-sm"
                >
                  ← Go back to login and use "Sign in with {oauthProvider}"
                </Link>
                <p className="text-xs text-gray-600">
                  💡 You can also set a password from your profile settings after logging in.
                </p>
              </div>
            </div>
          </Alert>
        )}

        {error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <TextField
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              disabled={isSubmitting}
              className="mb-4"
            />
          </div>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isSubmitting || !email.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white py-3"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <CircularProgress size={20} color="inherit" />
                <span>Sending Reset Email...</span>
              </div>
            ) : (
              'Send Reset Email'
            )}
          </Button>

          <div className="text-center">
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-500 text-sm"
            >
              ← Back to Login
            </Link>
          </div>
        </form>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">💡 Helpful Information</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• Check your spam/junk folder if you don't receive the email</p>
            <p>• The reset link expires in 1 hour</p>
            <p>• OAuth users should use "Sign in with Google" instead</p>
            <p>• Contact support if you continue having issues</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
