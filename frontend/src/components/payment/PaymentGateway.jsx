// frontend/src/components/payment/PaymentGateway.jsx

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
import { createPaymentOrder, verifyPayment, getPaymentStatus } from '../../api/payment';

const PaymentGateway = ({ sponsorship, onPaymentSuccess, onPaymentError }) => {
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
    if (sponsorship?._id) {
      checkPaymentStatus();
    }

    return () => {
      // Don't remove script on cleanup as it might be used by other components
    };
  }, [sponsorship?._id]);

  const checkPaymentStatus = async () => {
    try {
      const response = await getPaymentStatus(sponsorship._id);
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

    // Validate sponsorship data
    if (!sponsorship || !sponsorship._id) {
      setError('Invalid sponsorship data');
      return;
    }

    const amount = sponsorship.payment?.amount || sponsorship.contribution?.value;
    if (!amount || amount <= 0) {
      setError('Invalid payment amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create payment order
      const orderResponse = await createPaymentOrder(
        sponsorship._id,
        amount
      );

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_ID', // Replace with your key
        amount: orderResponse.order.amount,
        currency: orderResponse.order.currency,
        name: sponsorship.organization.name,
        description: `Sponsorship: ${sponsorship.contribution.description}`,
        order_id: orderResponse.order.id,
        handler: async (response) => {
          try {
            // Verify payment
            const verifyResponse = await verifyPayment(sponsorship._id, {
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
          name: sponsorship.sponsor.name || sponsorship.sponsor.contactPerson,
          email: sponsorship.sponsor.email,
          contact: sponsorship.sponsor.phone
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

  if (!sponsorship) {
    return (
      <Alert severity="error">
        No sponsorship data available for payment.
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

        {/* Sponsorship Details */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Sponsorship Details
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Organization: {sponsorship.organization?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tier: {sponsorship.tier?.name?.toUpperCase()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Description: {sponsorship.contribution?.description}
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
        {(sponsorship.status === 'approved' || sponsorship.status === 'suspended') && paymentStatus?.status !== 'completed' && (
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
              `Pay ₹${sponsorship.payment?.amount || sponsorship.contribution?.value}`
            )}
          </Button>
        )}

        {/* Status Information */}
        {sponsorship.status === 'suspended' && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            This sponsorship is currently suspended. Payment will reactivate it once completed.
          </Alert>
        )}

        {paymentStatus?.status === 'completed' && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Payment completed successfully! Your sponsorship is now active.
          </Alert>
        )}

        {sponsorship.status !== 'approved' && sponsorship.status !== 'suspended' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Payment is only available for approved or suspended sponsorships.
          </Alert>
        )}



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
        </Box>
      </CardContent>
    </Card>
  );
};

export default PaymentGateway; 