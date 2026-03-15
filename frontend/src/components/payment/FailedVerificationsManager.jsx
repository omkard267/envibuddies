// frontend/src/components/payment/FailedVerificationsManager.jsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider
} from '@mui/material';
import { getFailedVerifications, manualVerifyIntentPayment } from '../../api/intentPayment';
import { formatDate } from '../../utils/dateUtils';
import { showAlert } from '../../utils/notifications';

const FailedVerificationsManager = ({ organizationId, onRefresh, onFailedVerificationsChange }) => {
  const [failedVerifications, setFailedVerifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedIntent, setSelectedIntent] = useState(null);
  const [manualVerifyDialog, setManualVerifyDialog] = useState(false);
  const [verificationData, setVerificationData] = useState({
    razorpay_payment_id: '',
    razorpay_order_id: '',
    razorpay_signature: ''
  });
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (organizationId) {
      fetchFailedVerifications();
    }
  }, [organizationId]);

  // Notify parent about failed verifications status
  useEffect(() => {
    onFailedVerificationsChange?.(failedVerifications.length > 0);
  }, [failedVerifications.length, onFailedVerificationsChange]);

  const fetchFailedVerifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getFailedVerifications(organizationId);
      setFailedVerifications(response.failedVerifications || []);
    } catch (error) {
      console.error('Error fetching failed verifications:', error);
      setError('Failed to load failed verifications');
    } finally {
      setLoading(false);
    }
  };

  const handleManualVerify = async () => {
    if (!selectedIntent || !verificationData.razorpay_payment_id) {
      setError('Please provide payment details');
      return;
    }

    try {
      setVerifying(true);
      setError(null);
      
      await manualVerifyIntentPayment(selectedIntent._id, verificationData);
      
      // Close dialog and refresh
      setManualVerifyDialog(false);
      setSelectedIntent(null);
      setVerificationData({
        razorpay_payment_id: '',
        razorpay_order_id: '',
        razorpay_signature: ''
      });
      
      // Refresh the list
      fetchFailedVerifications();
      onRefresh?.();
      
      showAlert.success('Payment verified successfully!');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to verify payment');
    } finally {
      setVerifying(false);
    }
  };

  const openManualVerifyDialog = (intent) => {
    setSelectedIntent(intent);
    setManualVerifyDialog(true);
    setError(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  // Don't render anything if there are no failed verifications
  if (failedVerifications.length === 0) {
    return null;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Failed Payment Verifications
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Found {failedVerifications.length} sponsorship intent(s) with pending payments
        </Typography>
        
        {failedVerifications.map((intent) => (
          <Card key={intent._id} sx={{ mb: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box flex={1}>
                  <Typography variant="subtitle1" gutterBottom>
                    {intent.sponsor.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Email: {intent.sponsor.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Amount: ₹{intent.sponsorship.estimatedValue}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Description: {intent.sponsorship.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Created: {formatDate(intent.createdAt)}
                  </Typography>
                </Box>
                
                <Box>
                  <Chip 
                    label={intent.payment?.status || 'No Payment'} 
                    color={intent.payment?.status === 'pending' ? 'warning' : 'default'}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => openManualVerifyDialog(intent)}
                  >
                    Manual Verify
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Manual Verification Dialog */}
      <Dialog 
        open={manualVerifyDialog} 
        onClose={() => setManualVerifyDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Manual Payment Verification</DialogTitle>
        <DialogContent>
          {selectedIntent && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Sponsorship Intent Details:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sponsor: {selectedIntent.sponsor.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Amount: ₹{selectedIntent.sponsorship.estimatedValue}
              </Typography>
            </Box>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom>
            Payment Details (from Razorpay):
          </Typography>
          
          <TextField
            fullWidth
            label="Razorpay Payment ID"
            value={verificationData.razorpay_payment_id}
            onChange={(e) => setVerificationData({
              ...verificationData,
              razorpay_payment_id: e.target.value
            })}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="Razorpay Order ID"
            value={verificationData.razorpay_order_id}
            onChange={(e) => setVerificationData({
              ...verificationData,
              razorpay_order_id: e.target.value
            })}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="Razorpay Signature"
            value={verificationData.razorpay_signature}
            onChange={(e) => setVerificationData({
              ...verificationData,
              razorpay_signature: e.target.value
            })}
            margin="normal"
            required
            multiline
            rows={2}
          />
          
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Important:</strong> Only use this for payments that were successful but failed to verify automatically. 
              Make sure you have the correct payment details from Razorpay dashboard.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setManualVerifyDialog(false)}
            disabled={verifying}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleManualVerify}
            variant="contained"
            disabled={verifying || !verificationData.razorpay_payment_id}
          >
            {verifying ? <CircularProgress size={20} /> : 'Verify Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FailedVerificationsManager; 