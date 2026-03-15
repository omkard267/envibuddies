// frontend/src/components/payment/ManualVerificationForm.jsx

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { manualVerifyIntentPayment } from '../../api/intentPayment';

const ManualVerificationForm = ({ intent, onSuccess, onCancel }) => {
  const [verificationData, setVerificationData] = useState({
    paymentType: 'cash',
    paymentReference: '',
    paymentDate: '',
    paymentAmount: intent?.sponsorship?.estimatedValue || '',
    paymentNotes: '',
    // Razorpay fields (optional)
    razorpay_payment_id: '',
    razorpay_order_id: '',
    razorpay_signature: ''
  });
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!verificationData.paymentReference) {
      setError('Please provide a payment reference (receipt number, transaction ID, etc.)');
      return;
    }

    if (!verificationData.paymentAmount || verificationData.paymentAmount <= 0) {
      setError('Please provide a valid payment amount');
      return;
    }

    try {
      setVerifying(true);
      setError(null);
      
      // For Razorpay payments, use the existing verification
      if (verificationData.paymentType === 'razorpay' && verificationData.razorpay_payment_id) {
        await manualVerifyIntentPayment(intent._id, {
          razorpay_payment_id: verificationData.razorpay_payment_id,
          razorpay_order_id: verificationData.razorpay_order_id,
          razorpay_signature: verificationData.razorpay_signature
        });
      } else {
        // For other payment types, use a custom verification approach
        await manualVerifyIntentPayment(intent._id, {
          paymentType: verificationData.paymentType,
          paymentReference: verificationData.paymentReference,
          paymentDate: verificationData.paymentDate,
          paymentAmount: verificationData.paymentAmount,
          paymentNotes: verificationData.paymentNotes,
          manualVerification: true
        });
      }
      
      onSuccess();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to verify payment');
    } finally {
      setVerifying(false);
    }
  };

  const handleInputChange = (field, value) => {
    setVerificationData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const isRazorpayPayment = verificationData.paymentType === 'razorpay';

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Typography variant="subtitle2" gutterBottom>
        Payment Details:
      </Typography>
      
      <FormControl fullWidth margin="normal">
        <InputLabel>Payment Type *</InputLabel>
        <Select
          value={verificationData.paymentType}
          onChange={(e) => handleInputChange('paymentType', e.target.value)}
          label="Payment Type *"
        >
          <MenuItem value="cash">Cash</MenuItem>
          <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
          <MenuItem value="check">Check / Cheque</MenuItem>
          <MenuItem value="upi">UPI</MenuItem>
          <MenuItem value="razorpay">Razorpay (Online)</MenuItem>
          <MenuItem value="other">Other</MenuItem>
        </Select>
      </FormControl>

      <TextField
        fullWidth
        label="Payment Reference *"
        value={verificationData.paymentReference}
        onChange={(e) => handleInputChange('paymentReference', e.target.value)}
        margin="normal"
        required
        placeholder={verificationData.paymentType === 'cash' ? 'Receipt Number' : 
                   verificationData.paymentType === 'bank_transfer' ? 'Transaction ID' :
                   verificationData.paymentType === 'check' ? 'Check Number' :
                   verificationData.paymentType === 'razorpay' ? 'Razorpay Payment ID' :
                   'Reference Number'}
        helperText={`Required: ${verificationData.paymentType === 'cash' ? 'Receipt number' : 
                    verificationData.paymentType === 'bank_transfer' ? 'Bank transaction ID' :
                    verificationData.paymentType === 'check' ? 'Check number' :
                    verificationData.paymentType === 'razorpay' ? 'Razorpay payment ID' :
                    'Payment reference'} for tracking`
        }
      />

      <TextField
        fullWidth
        label="Payment Amount *"
        type="number"
        value={verificationData.paymentAmount}
        onChange={(e) => handleInputChange('paymentAmount', e.target.value)}
        margin="normal"
        required
        placeholder="Enter amount"
        helperText="Amount received (should match sponsorship amount)"
      />

      <TextField
        fullWidth
        label="Payment Date"
        type="date"
        value={verificationData.paymentDate}
        onChange={(e) => handleInputChange('paymentDate', e.target.value)}
        margin="normal"
        InputLabelProps={{ shrink: true }}
        helperText="Date when payment was received"
      />

      <TextField
        fullWidth
        label="Payment Notes"
        value={verificationData.paymentNotes}
        onChange={(e) => handleInputChange('paymentNotes', e.target.value)}
        margin="normal"
        multiline
        rows={2}
        placeholder="Additional notes about the payment"
        helperText="Optional: Any additional details about the payment"
      />

      {/* Razorpay specific fields - only show if Razorpay is selected */}
      {isRazorpayPayment && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle2" gutterBottom>
            Razorpay Details (Optional):
          </Typography>
          
          <TextField
            fullWidth
            label="Razorpay Payment ID"
            value={verificationData.razorpay_payment_id}
            onChange={(e) => handleInputChange('razorpay_payment_id', e.target.value)}
            margin="normal"
            placeholder="pay_xxxxxxxxxxxxx"
            helperText="Optional: For additional verification"
          />
          
          <TextField
            fullWidth
            label="Razorpay Order ID"
            value={verificationData.razorpay_order_id}
            onChange={(e) => handleInputChange('razorpay_order_id', e.target.value)}
            margin="normal"
            placeholder="order_xxxxxxxxxxxxx"
            helperText="Optional: For additional verification"
          />
          
          <TextField
            fullWidth
            label="Razorpay Signature"
            value={verificationData.razorpay_signature}
            onChange={(e) => handleInputChange('razorpay_signature', e.target.value)}
            margin="normal"
            multiline
            rows={2}
            placeholder="Signature from payment confirmation"
            helperText="Optional: For additional verification"
          />
        </>
      )}
      
      <Divider sx={{ my: 3 }} />
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Payment Reference Examples:</strong>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          • <strong>Cash:</strong> Receipt number, invoice number
        </Typography>
        <Typography variant="body2">
          • <strong>Bank Transfer:</strong> Transaction ID, UTR number
        </Typography>
        <Typography variant="body2">
          • <strong>Check:</strong> Check number, bank details
        </Typography>
        <Typography variant="body2">
          • <strong>UPI:</strong> UPI transaction ID
        </Typography>
        <Typography variant="body2">
          • <strong>Razorpay:</strong> Payment ID from dashboard
        </Typography>
      </Alert>
      
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          onClick={onCancel}
          disabled={verifying}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={verifying || !verificationData.paymentReference || !verificationData.paymentAmount}
          startIcon={verifying ? <CircularProgress size={20} /> : null}
        >
          {verifying ? 'Verifying...' : 'Verify Payment'}
        </Button>
      </Box>
    </Box>
  );
};

export default ManualVerificationForm; 