import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { showAlert } from '../utils/notifications';
import { verifyRecoveryToken } from '../api/auth';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

const RecoveryConfirmationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState(null);
  const [error, setError] = useState('');
  const [recoveryData, setRecoveryData] = useState(null);

  const token = searchParams.get('token');

  console.log('Token from URL params:', token);
  console.log('Search params:', Object.fromEntries(searchParams.entries()));

  // Auto-retry mechanism for recovery in progress
  useEffect(() => {
    if (recoveryStatus === 'loading' && token) {
      // If recovery is in loading state, wait a bit and then retry
      const retryTimer = setTimeout(() => {
        console.log('🔄 [FRONTEND] Auto-retrying recovery for token:', token.substring(0, 8));
        // Use a function reference to avoid circular dependency
        const attemptRecovery = async () => {
          if (token && !sessionStorage.getItem(`recovery_${token}`)) {
            await handleRecovery();
          }
        };
        attemptRecovery();
      }, 2000); // Wait 2 seconds before retrying
      
      return () => clearTimeout(retryTimer);
    }
  }, [recoveryStatus, token]); // Remove handleRecovery from dependencies

  // Main recovery effect - runs only once when component mounts
  useEffect(() => {
    console.log('🔄 [FRONTEND] useEffect triggered with token:', token ? 'present' : 'missing');
    
    if (!token) {
      setError('No recovery token provided');
      setIsLoading(false);
      return;
    }

    // Auto-recover the account when the page loads
    console.log('🔄 [FRONTEND] Calling handleRecovery from useEffect');
    
    // Only call handleRecovery if not already processed
    if (token && !sessionStorage.getItem(`recovery_${token}`)) {
      // Use a function reference to avoid circular dependency
      const attemptRecovery = async () => {
        await handleRecovery();
      };
      attemptRecovery();
    }
    
    // Cleanup function to clear session storage when component unmounts
    return () => {
      if (token) {
        const recoveryKey = `recovery_${token}`;
        sessionStorage.removeItem(recoveryKey);
        console.log('🧹 [FRONTEND] Cleaned up session storage for token');
      }
    };
  }, [token]); // Remove handleRecovery from dependencies

  const handleRecovery = useCallback(async () => {
    if (!token) return;

    // Prevent multiple recovery attempts
    if (isRecovering) {
      console.log('🔄 Recovery already in progress, skipping duplicate call');
      return;
    }

    // Add additional protection against multiple calls
    const recoveryKey = `recovery_${token}`;
    if (sessionStorage.getItem(recoveryKey)) {
      console.log('🔄 Recovery already attempted for this token, skipping duplicate call');
      return;
    }

    // Mark this token as being processed
    sessionStorage.setItem(recoveryKey, 'processing');
    setIsRecovering(true);
    setRecoveryStatus('loading'); // Set loading state immediately
    setError(''); // Clear any previous errors
    
    console.log('🚀 [FRONTEND] Attempting recovery with token:', token);
    console.log('🚀 [FRONTEND] Token length:', token?.length);
    console.log('🚀 [FRONTEND] Recovery attempt timestamp:', new Date().toISOString());
    
    try {
      const data = await verifyRecoveryToken({ token });
      
      console.log('✅ [FRONTEND] Recovery response data:', data);
      
      // Mark recovery as completed
      sessionStorage.setItem(recoveryKey, 'completed');
      
      // Clear any previous errors
      setError('');
      
      setRecoveryStatus('success');
      setRecoveryData(data);
      
      // Show success message based on account type
      if (data.accountType === 'OAuth') {
        showAlert.success('OAuth account recovered successfully! Check your email for login instructions.');
      } else {
        showAlert.success('Account recovered successfully! Check your email for the new password.');
      }
    } catch (error) {
      console.error('Recovery error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        validationErrors: error.response?.data?.errors
      });
      
      // Clear session storage on error
      const recoveryKey = `recovery_${token}`;
      sessionStorage.removeItem(recoveryKey);
      
      // Handle specific error cases
      if (error.response?.data?.error === 'RECOVERY_IN_PROGRESS') {
        // This is not a real failure - recovery is in progress
        setError('Account recovery is already in progress. Please wait while we complete the process...');
        setRecoveryStatus('loading'); // Keep showing loading state
        showAlert.info('Recovery in progress. Please wait...');
        
        // Don't clear session storage - let the recovery continue
        // Don't set error status - keep it as loading
        return; // Exit early, don't show error state
      } else {
        // This is a real error
        const recoveryKey = `recovery_${token}`;
        sessionStorage.removeItem(recoveryKey);
        
        setError(error.response?.data?.message || 'Recovery failed');
        showAlert.error(error.response?.data?.message || 'Recovery failed');
        setRecoveryStatus('error');
      }
    } finally {
      setIsLoading(false);
      setIsRecovering(false);
    }
  }, [token]);

  const handleRetry = () => {
    setRecoveryStatus(null);
    setError('');
    setRecoveryData(null);
    setIsLoading(true);
    handleRecovery();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Recovering Your Account</h2>
            <p className="text-gray-600">Please wait while we restore your account...</p>
          </div>
        </div>
      </div>
    );
  }

  if (recoveryStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-green-900 mb-4">Account Recovered!</h2>
            <p className="text-gray-600 mb-6">
              {recoveryData?.accountType === 'OAuth' 
                ? 'Your OAuth account has been successfully restored. You can now login using your OAuth provider.'
                : 'Your account has been successfully restored. A new password has been sent to your email address.'
              }
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800">
                <strong>Welcome back!</strong> All your events, messages, and data have been preserved.
              </p>
              {recoveryData ? (
                <p className="text-xs text-green-600 mt-2">
                  <strong>Note:</strong> {recoveryData.accountType === 'OAuth' 
                    ? 'OAuth accounts may have minimal profile information. You can complete your profile after logging in.'
                    : 'Password-based accounts require complete profile information for security.'
                  }
                </p>
              ) : (
                <p className="text-xs text-green-600 mt-2">
                  <strong>Note:</strong> Loading account information...
                </p>
              )}
            </div>
            
            {recoveryData?.passwordNote ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">📧 Check Your Email</h3>
                <p className="text-sm text-blue-700 mb-2">
                  <strong>Important:</strong> A new password has been sent to your email address.
                </p>
                <p className="text-xs text-blue-600">
                  Please check your inbox (and spam folder) for the email containing your new password. 
                  Use that password to login, then change it immediately for security.
                </p>
              </div>
            ) : recoveryData?.oauthNote ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-green-800 mb-2">📧 Check Your Email</h3>
                <p className="text-sm text-green-700 mb-2">
                  <strong>Great!</strong> A welcome back email has been sent to your email address.
                </p>
                <p className="text-xs text-green-600">
                  Please check your inbox (and spam folder) for the email with instructions on how to login with your OAuth account.
                </p>
              </div>
            ) : null}
            
            {recoveryData ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-green-800 mb-2">✅ Account Recovery Details</h3>
                <p className="text-sm text-green-700 mb-2">
                  <strong>Account Type:</strong> {recoveryData.accountType || 'Unknown'}
                </p>
                <p className="text-xs text-green-600">
                  <strong>Profile Fields:</strong> Date of Birth: {recoveryData.hasProfileFields?.dateOfBirth ? 'Present' : 'Not set'}, 
                  Gender: {recoveryData.hasProfileFields?.gender ? 'Present' : 'Not set'}
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-xs text-blue-600">
                  <strong>Note:</strong> Account recovery details are being loaded...
                </p>
              </div>
            )}
            

            
            <div className="space-y-3">
              <Link
                to="/login"
                className="block w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
              >
                Go to Login
              </Link>
              
              <Link
                to="/recover-account"
                className="block w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
              >
                Request New Recovery Link
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (recoveryStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            
            <h2 className="text-2xl font-bold text-blue-900 mb-4">Recovering Your Account</h2>
            <p className="text-gray-600 mb-6">
              {error || 'Please wait while we restore your account and send you the necessary information...'}
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">🔄 Recovery in Progress</h3>
              <p className="text-sm text-blue-700 mb-2">
                <strong>What's happening:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-2 text-left list-disc list-inside space-y-1">
                <li>Verifying your recovery token</li>
                <li>Restoring your account data</li>
                <li>Generating new credentials</li>
                <li>Sending recovery email</li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-xs text-yellow-700">
                <strong>Please wait:</strong> Do not refresh this page or close the browser tab. 
                The recovery process will complete automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (recoveryStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-red-900 mb-4">Recovery Failed</h2>
            <p className="text-gray-600 mb-6">
              {error || 'We were unable to recover your account. The recovery link may have expired or is invalid.'}
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">
                <strong>Possible reasons:</strong>
              </p>
              <ul className="text-sm text-red-700 mt-2 text-left list-disc list-inside space-y-1">
                <li>Recovery link has expired (valid for 1 hour)</li>
                <li>Recovery link has already been used</li>
                <li>Account was not found or is not deleted</li>
                <li>Invalid or corrupted recovery token</li>
                <li>Missing required profile information</li>
              </ul>
            </div>
            
            {error && error.includes('MISSING_PROFILE_FIELDS') && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Missing Profile Information</h3>
                <p className="text-xs text-yellow-700">
                  Your password-based account is missing required profile fields. This can happen if the account was created 
                  before these fields were made mandatory. Please contact support for assistance.
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                disabled={isRecovering}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isRecovering ? 'Retrying...' : 'Try Again'}
              </button>
              
              <Link
                to="/recover-account"
                className="block w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
              >
                Request New Recovery Link
              </Link>
              
              <Link
                to="/login"
                className="block w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default RecoveryConfirmationPage;
