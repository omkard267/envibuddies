// frontend/src/components/payment/IntentPaymentGateway.jsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Chip
} from '@mui/material';
import { createIntentPaymentOrder, verifyIntentPayment, getIntentPaymentStatus } from '../../api/intentPayment';

const IntentPaymentGateway = ({ intent, onPaymentSuccess, onPaymentError }) => {
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [error, setError] = useState(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    // Check if Razorpay script is already loaded
    if (window.Razorpay) {
      setRazorpayLoaded(true);
    } else {
      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => setRazorpayLoaded(true);
      script.onerror = () => setError('Failed to load payment gateway');
      document.body.appendChild(script);
    }

    // Check payment status on mount
    if (intent?._id) {
      checkPaymentStatus();
    }

    return () => {
      // Don't remove script on cleanup as it might be used by other components
    };
  }, [intent?._id]);

  const checkPaymentStatus = async () => {
    try {
      const response = await getIntentPaymentStatus(intent._id);
      setPaymentStatus(response.payment);
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  const handlePayment = async () => {
    if (!razorpayLoaded) {
      setError('Payment gateway is still loading. Please try again.');
      return;
    }

    // Validate intent data
    if (!intent || !intent._id) {
      setError('Invalid sponsorship intent data');
      return;
    }

    // Check if payment is already completed
    if (paymentStatus?.status === 'completed') {
      setError('Payment has already been completed for this sponsorship intent');
      return;
    }

    // Check if intent is already converted
    if (intent.status === 'converted' || intent.convertedTo) {
      setError('This sponsorship intent has already been converted to a sponsorship');
      return;
    }

    const amount = intent.payment?.amount || intent.sponsorship?.estimatedValue;
    if (!amount || amount <= 0) {
      setError('Invalid payment amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create payment order
      const orderResponse = await createIntentPaymentOrder(
        intent._id,
        amount
      );

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_ID',
        amount: orderResponse.order.amount,
        currency: orderResponse.order.currency,
        name: intent.organization.name,
        description: `Sponsorship Intent: ${intent.sponsorship.description}`,
        order_id: orderResponse.order.id,
        handler: async (response) => {
          try {
            // Verify payment
            const verifyResponse = await verifyIntentPayment(intent._id, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });

            setPaymentStatus(verifyResponse.sponsorship.paymentStatus);
            onPaymentSuccess?.(verifyResponse);
          } catch (error) {
            setError('Payment verification failed. Please contact support.');
            onPaymentError?.(error);
          }
        },
        prefill: {
          name: intent.sponsor.name,
          email: intent.sponsor.email,
          contact: intent.sponsor.phone
        },
        theme: {
          color: '#1976d2'
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      setError(error.response?.data?.message || 'Failed to initiate payment');
      onPaymentError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      case 'refunded':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Payment Completed';
      case 'pending':
        return 'Payment Pending';
      case 'failed':
        return 'Payment Failed';
      case 'refunded':
        return 'Payment Refunded';
      default:
        return 'Unknown Status';
    }
  };

  if (!intent) {
    return (
      <Alert severity="error">
        No sponsorship intent data available for payment.
      </Alert>
    );
  }

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Payment Gateway
        </Typography>
        
        <Divider sx={{ my: 2 }} />

        {/* Sponsorship Intent Details */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Sponsorship Intent Details
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Organization: {intent.organization?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tier: {intent.tier?.name?.toUpperCase()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Description: {intent.sponsorship?.description}
          </Typography>
        </Box>

        {/* Payment Status */}
        {paymentStatus && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Payment Status
            </Typography>
            <Chip
              label={getStatusText(paymentStatus.status)}
              color={getStatusColor(paymentStatus.status)}
              sx={{ mr: 1 }}
            />
            {paymentStatus.status === 'completed' && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Amount Paid: ₹{paymentStatus.paidAmount}
              </Typography>
            )}
          </Box>
        )}

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Payment Button */}
        {intent.status === 'approved' && 
         intent.sponsorship.type === 'monetary' && 
         !intent.convertedTo && 
         paymentStatus?.status !== 'completed' && (
          <Button
            variant="contained"
            fullWidth
            onClick={handlePayment}
            disabled={loading || !razorpayLoaded}
            sx={{ mt: 2 }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              `Pay ₹${intent.payment?.amount || intent.sponsorship?.estimatedValue}`
            )}
          </Button>
        )}

        {/* Status Information */}
        {intent.status !== 'approved' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Payment is only available for approved sponsorship intents.
          </Alert>
        )}

        {paymentStatus?.status === 'completed' && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Payment completed successfully! Your sponsorship has been created.
          </Alert>
        )}

        {intent.status === 'converted' || intent.convertedTo ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            This sponsorship intent has been converted to a sponsorship. No further payment is required.
          </Alert>
        ) : null}

        {/* Payment Instructions */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Payment Instructions:</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            • You can pay using Credit/Debit cards, UPI, Net Banking, or Wallets
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Payment is secure and processed by Razorpay
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • You will receive a payment confirmation email
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • After payment, your sponsorship will be automatically created
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default IntentPaymentGateway; 