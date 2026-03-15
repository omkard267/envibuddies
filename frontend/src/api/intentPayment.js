// frontend/src/api/intentPayment.js

import axiosInstance from './axiosInstance';

// Get payment configuration
export const getIntentPaymentConfig = async () => {
  try {
    const response = await axiosInstance.get('/api/intent-payments/config');
    return response.data;
  } catch (error) {
    console.error('Error fetching payment config:', error);
    throw error;
  }
};

// Create payment order for sponsorship intent
export const createIntentPaymentOrder = async (intentId, amount, currency = 'INR') => {
  try {
    const response = await axiosInstance.post(`/api/intent-payments/create-order/${intentId}`, {
      amount,
      currency
    });
    return response.data;
  } catch (error) {
    console.error('Error creating payment order:', error);
    throw error;
  }
};

// Verify payment for sponsorship intent
export const verifyIntentPayment = async (intentId, paymentData) => {
  try {
    const response = await axiosInstance.post(`/api/intent-payments/verify/${intentId}`, paymentData);
    return response.data;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};

// Get payment status for sponsorship intent
export const getIntentPaymentStatus = async (intentId) => {
  try {
    const response = await axiosInstance.get(`/api/intent-payments/status/${intentId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting payment status:', error);
    throw error;
  }
};

// Manual payment verification for failed verifications
export const manualVerifyIntentPayment = async (intentId, paymentData) => {
  try {
    const response = await axiosInstance.post(`/api/intent-payments/manual-verify/${intentId}`, paymentData);
    return response.data;
  } catch (error) {
    console.error('Error manually verifying payment:', error);
    throw error;
  }
};

// Get failed payment verifications for admin review
export const getFailedVerifications = async (organizationId) => {
  try {
    const response = await axiosInstance.get(`/api/intent-payments/failed-verifications/${organizationId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting failed verifications:', error);
    throw error;
  }
}; 