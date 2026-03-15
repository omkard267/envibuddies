// src/api/axiosInstance.js
import axios from "axios";
import { showAlert } from '../utils/notifications';

// Flag to prevent multiple 401 handling
let isHandling401 = false;

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL?.replace('/api', '') || "http://localhost:5000",
  withCredentials: true,
});

// Automatically add token to headers if available
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle 401 responses
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only handle 401 errors and only if we're not already on the login page
    if (error.response && error.response.status === 401 && !window.location.pathname.includes('/login')) {
      // If we're already handling a 401, don't do it again
      if (isHandling401) {
        return Promise.reject(new Error('Session expired - already handling'));
      }
      
      // Set flag to prevent multiple handlers
      isHandling401 = true;
      
      // Clear user data from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Store the current path to redirect back after login
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      
      // Show alert to user
      showAlert.warning('Your session has expired. Please log in again.');
      
      // Redirect to login page
      window.location.href = '/login';
      
      // Prevent any further error handling
      return Promise.reject(new Error('Session expired'));
    }
    return Promise.reject(error);
  }
);

// Reset the flag when the page loads
window.addEventListener('load', () => {
  isHandling401 = false;
});

export default instance;
