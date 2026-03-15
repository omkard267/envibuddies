// frontend/src/components/receipt/ReceiptDisplay.jsx

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Chip,
  Grid,
  Button
} from '@mui/material';
import { Download, Print, Share } from '@mui/icons-material';

const ReceiptDisplay = ({ receipt, onDownload, onPrint, onShare }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getPaymentTypeLabel = (type) => {
    const labels = {
      'razorpay': 'Online Payment (Razorpay)',
      'cash': 'Cash Payment',
      'bank_transfer': 'Bank Transfer',
      'check': 'Check/Cheque',
      'upi': 'UPI Payment',
      'other': 'Other Payment Method'
    };
    return labels[type] || type;
  };

  const getPaymentTypeColor = (type) => {
    const colors = {
      'razorpay': 'primary',
      'cash': 'success',
      'bank_transfer': 'info',
      'check': 'warning',
      'upi': 'secondary',
      'other': 'default'
    };
    return colors[type] || 'default';
  };

  if (!receipt) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Typography color="text.secondary">Receipt not found</Typography>
      </Box>
    );
  }

  return (
    <Card sx={{ maxWidth: 800, mx: 'auto', mt: 2 }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
            RECEIPT
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {receipt.receiptNumber}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Issue Date: {formatDate(receipt.issueDate)}
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Sponsor Details (From - who is paying) */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            From:
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
            {receipt.sponsor?.name}
          </Typography>
          {receipt.sponsor?.email && (
            <Typography variant="body2" color="text.secondary">
              Email: {receipt.sponsor.email}
            </Typography>
          )}
          {receipt.sponsor?.phone && (
            <Typography variant="body2" color="text.secondary">
              Phone: {receipt.sponsor.phone}
            </Typography>
          )}
        </Box>

        {/* Organization Details (To - who is receiving) */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            To:
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
            {receipt.organization?.name}
          </Typography>
          {receipt.organization?.address && (
            <Typography variant="body2" color="text.secondary">
              {receipt.organization.address}
            </Typography>
          )}
          {receipt.organization?.phone && (
            <Typography variant="body2" color="text.secondary">
              Phone: {receipt.organization.phone}
            </Typography>
          )}
          {receipt.organization?.email && (
            <Typography variant="body2" color="text.secondary">
              Email: {receipt.organization.email}
            </Typography>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Sponsorship Details */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            Sponsorship Details:
          </Typography>
          {receipt.event && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Event: {receipt.event.title}
            </Typography>
          )}
          {receipt.sponsorship?.tier && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Tier: {receipt.sponsorship.tier.name}
            </Typography>
          )}
          {receipt.sponsorship?.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Description: {receipt.sponsorship.description}
            </Typography>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Payment Details */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            Payment Details:
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Payment Type:
              </Typography>
              <Chip 
                label={getPaymentTypeLabel(receipt.paymentType)}
                color={getPaymentTypeColor(receipt.paymentType)}
                size="small"
                sx={{ mt: 0.5 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Payment Date:
              </Typography>
              <Typography variant="body1">
                {formatDate(receipt.paymentDate)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Payment Reference:
              </Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                {receipt.paymentReference}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Amount:
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                {formatCurrency(receipt.paymentAmount)}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Manual Verification Details */}
        {receipt.manualVerification && (
          <>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Manual Verification Details:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Verified By: {receipt.manualVerification.verifiedBy?.name || 'Admin'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Verified At: {formatDate(receipt.manualVerification.verifiedAt)}
              </Typography>
              {receipt.manualVerification.notes && (
                <Typography variant="body2" color="text.secondary">
                  Notes: {receipt.manualVerification.notes}
                </Typography>
              )}
            </Box>
          </>
        )}

        {/* Razorpay Details */}
        {receipt.razorpayDetails && (
          <>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Razorpay Details:
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                Payment ID: {receipt.razorpayDetails.paymentId}
              </Typography>
              {receipt.razorpayDetails.orderId && (
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                  Order ID: {receipt.razorpayDetails.orderId}
                </Typography>
              )}
            </Box>
          </>
        )}

        {/* Payment Notes */}
        {receipt.paymentNotes && (
          <>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Payment Notes:
              </Typography>
              <Typography variant="body2">
                {receipt.paymentNotes}
              </Typography>
            </Box>
          </>
        )}

        <Divider sx={{ mb: 3 }} />

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          {onDownload && (
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => onDownload(receipt._id)}
            >
              Download
            </Button>
          )}
          {onPrint && (
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={() => onPrint()}
            >
              Print
            </Button>
          )}
          {onShare && (
            <Button
              variant="outlined"
              startIcon={<Share />}
              onClick={() => onShare(receipt._id)}
            >
              Share
            </Button>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            This is a computer-generated receipt. No signature required.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Receipt Status: {receipt.status.toUpperCase()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ReceiptDisplay; 