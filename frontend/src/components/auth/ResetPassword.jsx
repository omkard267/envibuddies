import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { showAlert } from '../../utils/notifications';
import { resetPassword, verifyResetToken } from '../../services/authService';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isValidToken, setIsValidToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  // Password validation states
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Common weak passwords
  const weakPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein', 'welcome', 'password123', 'admin123'];

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        showAlert.error('No reset token provided');
        navigate('/forgot-password');
        return;
      }

      try {
        const response = await verifyResetToken(token);
        if (response.valid) {
          setUserEmail(response.email);
          setIsValidToken(true);
        } else {
          showAlert.error('Invalid or expired token');
          navigate('/forgot-password');
        }
      } catch (error) {
        showAlert.error('Error validating token');
        navigate('/forgot-password');
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, [token, navigate]);

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
    if (confirmPass !== password) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  // Handle password change
  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    validatePassword(newPassword);
    
    // Clear confirm password error when password changes
    if (confirmPassword && confirmPasswordError) {
      setConfirmPasswordError('');
    }
  };

  // Handle confirm password change
  const handleConfirmPasswordChange = (e) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    validateConfirmPassword(newConfirmPassword);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log('🔄 Form submission already in progress, ignoring duplicate submit');
      return;
    }
    
    // Validate token is present
    if (!token) {
      showAlert.error('No reset token provided. Please use the link from your email.');
      navigate('/forgot-password');
      return;
    }
    
    // Validate password
    if (!validatePassword(password)) {
      showAlert.error('Please fix password requirements before submitting');
      return;
    }

    // Validate confirm password
    if (!validateConfirmPassword(confirmPassword)) {
      showAlert.error('Passwords do not match');
      return;
    }

    // Check if password is too weak
    if (passwordStrength < 4) {
      showAlert.error('Password is too weak. Please choose a stronger password.');
      return;
    }

    setIsSubmitting(true);
    console.log('🔄 Starting password reset process...');
    
    try {
      console.log('📤 Sending reset password request:', { 
        token: token.substring(0, 10) + '...', 
        passwordLength: password.length, 
        passwordStrength 
      });
      
      await resetPassword({ token, newPassword: password });
      
      console.log('✅ Password reset successful');
              showAlert.success('Password reset successfully. You can now login with your new password.');
      
      // Clear form data
      setPassword('');
      setConfirmPassword('');
      
      // Redirect to login
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Reset password error:', error);
      const errorMessage = error.response?.data?.message;
      
      console.log('Error details:', {
        status: error.response?.status,
        errorMessage: errorMessage,
        fullResponse: error.response?.data
      });
      
      if (error.response?.status === 400) {
        if (errorMessage?.includes('cannot be the same as your old password')) {
          showAlert.error('🔒 New password cannot be the same as your old password');
          // Don't redirect for this error - let user try again
        } else if (errorMessage?.includes('commonly used')) {
          showAlert.error('🚫 This password is too common. Please choose a more unique password.');
          // Don't redirect for this error - let user try again
        } else if (errorMessage?.includes('uppercase letter, one lowercase letter, one number, and one special character')) {
          showAlert.warning('⚠️ Password must meet all strength requirements. Please check the requirements below.');
          // Don't redirect for this error - let user try again
        } else if (errorMessage?.includes('already been used') || errorMessage?.includes('has expired') || errorMessage?.includes('already used or has expired')) {
          showAlert.error('⏰ This reset link has already been used or has expired. Please request a new password reset.');
          // Redirect to forgot password page after a delay
          setTimeout(() => {
            navigate('/forgot-password');
          }, 3000);
        } else if (errorMessage?.includes('Invalid or expired reset token')) {
          showAlert.error('🔑 This reset link is invalid or has expired. Please request a new password reset.');
          // Redirect to forgot password page after a delay
          setTimeout(() => {
            navigate('/forgot-password');
          }, 3000);
        } else {
          console.log('No specific error handler matched, showing raw error message:', errorMessage);
          showAlert.error(errorMessage || '❌ An error occurred while resetting your password');
        }
      } else {
        showAlert.error(errorMessage || '❌ An error occurred while resetting your password');
      }
    } finally {
      setIsSubmitting(false);
      console.log('🔄 Password reset process completed');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!isValidToken) {
    return null;
  }

  const strengthInfo = getPasswordStrengthInfo();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please enter a new password for {userEmail}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength="8"
                className={`appearance-none relative block w-full px-3 py-2 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:z-10 sm:text-sm ${
                  passwordErrors.length > 0 && password 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
                placeholder="Enter new password"
                value={password}
                onChange={handlePasswordChange}
              />
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Strength:</span>
                    <span className={`text-xs font-medium ${strengthInfo.color}`}>
                      {strengthInfo.text}
                    </span>
                  </div>
                  <div className="mt-1 flex space-x-1">
                    {[1, 2, 3, 4, 5].map((level) => (
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
              {password && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-gray-600 font-medium">Password Requirements:</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li className={`flex items-center ${password.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
                      <span className="mr-1">{password.length >= 8 ? '✓' : '○'}</span>
                      At least 8 characters
                    </li>
                    <li className={`flex items-center ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                      <span className="mr-1">{/[A-Z]/.test(password) ? '✓' : '○'}</span>
                      One uppercase letter
                    </li>
                    <li className={`flex items-center ${/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                      <span className="mr-1">{/[a-z]/.test(password) ? '✓' : '○'}</span>
                      One lowercase letter
                    </li>
                    <li className={`flex items-center ${/\d/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                      <span className="mr-1">{/\d/.test(password) ? '✓' : '○'}</span>
                      One number
                    </li>
                    <li className={`flex items-center ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                      <span className="mr-1">{/[!@#$%^&*(),.?":{}|<>]/.test(password) ? '✓' : '○'}</span>
                      One special character
                    </li>
                    <li className={`flex items-center ${!weakPasswords.includes(password.toLowerCase()) ? 'text-green-600' : 'text-gray-400'}`}>
                      <span className="mr-1">{!weakPasswords.includes(password.toLowerCase()) ? '✓' : '○'}</span>
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
              {passwordErrors.length > 0 && password && (
                <div className="mt-2 space-y-1">
                  {passwordErrors.map((error, index) => (
                    <p key={index} className="text-xs text-red-600 flex items-center">
                      <span className="mr-1">⚠</span>
                      {error}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength="8"
                className={`appearance-none relative block w-full px-3 py-2 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:z-10 sm:text-sm ${
                  confirmPasswordError 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
              />
              
              {/* Confirm Password Error */}
              {confirmPasswordError && (
                <p className="mt-2 text-xs text-red-600 flex items-center">
                  <span className="mr-1">⚠</span>
                  {confirmPasswordError}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting || passwordErrors.length > 0 || confirmPasswordError || passwordStrength < 4}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </div>
        </form>

        {/* Helpful Information */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            Password Tips
          </h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• Use a mix of letters, numbers, and special characters</p>
            <p>• Avoid common passwords like "password" or "123456"</p>
            <p>• Don't use personal information like your name or birthday</p>
            <p>• Consider using a password manager for better security</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
