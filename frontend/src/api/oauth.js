import axiosInstance from './axiosInstance';

const OAUTH_API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/oauth`;

// Google OAuth callback
export const googleOAuthCallback = async (token) => {
  try {
    const response = await axiosInstance.post(`${OAUTH_API}/google`, { token });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'OAuth authentication failed' };
  }
};

// Complete OAuth registration
export const completeOAuthRegistration = async (userData) => {
  try {
    const response = await axiosInstance.post(`${OAUTH_API}/complete-registration`, userData, {
      timeout: 25000 // 25 second timeout
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Registration failed' };
  }
};

// Link OAuth to existing account
export const linkOAuthAccount = async (linkData) => {
  try {
    const response = await axiosInstance.post(`${OAUTH_API}/link-account`, linkData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Account linking failed' };
  }
};

// Unlink OAuth account
export const unlinkOAuthAccount = async (userId) => {
  try {
    const response = await axiosInstance.post(`${OAUTH_API}/unlink-account`, { userId });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Account unlinking failed' };
  }
};

// Check username availability
export const checkOAuthUsername = async (username) => {
  try {
    const response = await axiosInstance.get(`${OAUTH_API}/check-username/${username}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Username check failed' };
  }
};
