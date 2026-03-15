// src/api/auth.js
import axiosInstance from './axiosInstance';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth`;
const USER_API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users`;

export const signupVolunteer = (data) => axiosInstance.post(`/api/auth/signup-volunteer`, data);
export const signupOrganizer = (data) => axiosInstance.post(`/api/auth/signup-organizer`, data);
export const loginUser = (data) => axiosInstance.post(`/api/auth/login`, data);
export const setPassword = (data) => axiosInstance.post(`/api/auth/set-password`, data);

export const updateProfile = (data) => {
  return axiosInstance.put(`/api/users/profile`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Account Recovery Functions
/**
 * Request account recovery by sending a recovery email
 * @param {Object} data - Object containing email
 * @returns {Promise<Object>} Response from the server
 */
export const requestAccountRecovery = async (data) => {
  try {
    const response = await axiosInstance.post(`/api/account/recovery/request`, data);
    return response.data;
  } catch (error) {
    console.error('Error requesting account recovery:', error);
    throw error;
  }
};

/**
 * Verify recovery token and restore account
 * @param {Object} data - Object containing recovery token
 * @returns {Promise<Object>} Response from the server
 */
export const verifyRecoveryToken = async (data) => {
  try {
    const response = await axiosInstance.post(`/api/account/recovery/verify`, data);
    return response.data;
  } catch (error) {
    console.error('Error verifying recovery token:', error);
    throw error;
  }
};

// Delete user account
/**
 * Delete the currently authenticated user's account
 * @returns {Promise<Object>} Response from the server
 */
export const deleteAccount = async () => {
  try {
    const response = await axiosInstance.delete(`/api/account`);
    return response.data;
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
};

// Get user counts for statistics
export const getUserCounts = async () => {
  try {
    const response = await axiosInstance.get('/api/users/counts');
    return response.data;
  } catch (error) {
    console.error('❌ Frontend: Error fetching user counts:', error);
    return { volunteerCount: 0, organizerCount: 0 };
  }
};
