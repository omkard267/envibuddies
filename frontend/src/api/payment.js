// frontend/src/api/payment.js

import axiosInstance from './axiosInstance';

// Get payment configuration
export const getPaymentConfig = async () => {
  try {
    const response = await axiosInstance.get('/api/payments/config');
    return response.data;
  } catch (error) {
    console.error('Error fetching payment config:', error);
    throw error;
  }
};

// Create payment order
export const createPaymentOrder = async (sponsorshipId, amount, currency = 'INR') => {
  try {
    const response = await axiosInstance.post(`/api/payments/create-order/${sponsorshipId}`, {
      amount,
      currency
    });
    return response.data;
  } catch (error) {
    console.error('Error creating payment order:', error);
    throw error;
  }
};

// Verify payment
export const verifyPayment = async (sponsorshipId, paymentData) => {
  try {
    const response = await axiosInstance.post(`/api/payments/verify/${sponsorshipId}`, paymentData);
    return response.data;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};

// Get payment status
export const getPaymentStatus = async (sponsorshipId) => {
  try {
    const response = await axiosInstance.get(`/api/payments/status/${sponsorshipId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching payment status:', error);
    throw error;
  }
};

// Refund payment (admin only)
export const refundPayment = async (sponsorshipId, reason) => {
  try {
    const response = await axiosInstance.post(`/api/payments/refund/${sponsorshipId}`, {
      reason
    });
    return response.data;
  } catch (error) {
    console.error('Error refunding payment:', error);
    throw error;
  }
}; 