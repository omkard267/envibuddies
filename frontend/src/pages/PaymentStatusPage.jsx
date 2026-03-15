// frontend/src/pages/PaymentStatusPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  Paper
} from '@mui/material';
import {
  CheckCircle,
  Pending,
  Error,
  Payment,
  Business,
  Person
} from '@mui/icons-material';
import { getPaymentStatus } from '../api/payment';
import sponsorshipAPI from '../api/sponsorship';
import Navbar from '../components/layout/Navbar';
import PaymentGateway from '../components/payment/PaymentGateway';
import { formatDate } from '../utils/dateUtils';

const PaymentStatusPage = () => {
  const { sponsorshipId } = useParams();
  const navigate = useNavigate();
  const [sponsorship, setSponsorship] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSponsorshipData();
  }, [sponsorshipId]);

  const fetchSponsorshipData = async () => {
    try {
      setLoading(true);
      
      // First try to get sponsorship details
      let sponsorshipRes;
      try {
        sponsorshipRes = await sponsorshipAPI.getSponsorshipById(sponsorshipId);
        setSponsorship(sponsorshipRes);
      } catch (sponsorshipError) {
        console.error('Error fetching sponsorship:', sponsorshipError);
        setError('Sponsorship not found');
        return;
      }

      // Then try to get payment status
      try {
        const paymentRes = await getPaymentStatus(sponsorshipId);
        setPaymentStatus(paymentRes.payment);
      } catch (paymentError) {
        console.error('Error fetching payment status:', paymentError);
        // Don't set error here, just show sponsorship without payment details
        setPaymentStatus(null);
      }
    } catch (error) {
      console.error('Error fetching sponsorship data:', error);
      setError('Failed to load sponsorship details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'pending':
        return <Pending color="warning" />;
      case 'failed':
        return <Error color="error" />;
      case 'refunded':
        return <Payment color="info" />;
      default:
        return <Payment color="action" />;
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

  // Using the utility function instead of local formatDate

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !sponsorship) {
    return (
      <Box>
        <Navbar />
        <Box sx={{ p: 3, maxWidth: 800, mx: 'auto', mt: 2 }}>
          <Alert severity="error">
            {error || 'Sponsorship not found'}
          </Alert>
          <Button
            variant="contained"
            onClick={() => navigate('/my-applications')}
            sx={{ mt: 2 }}
          >
            Back to Applications
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Navbar />
      <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto', mt: 2 }}>
        <Typography variant="h4" gutterBottom>
          Payment Status
        </Typography>

        <Grid container spacing={3}>
          {/* Main Payment Status Card */}
          <Grid xs={12} md={8}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {getStatusIcon(paymentStatus?.status)}
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    Payment Details
                  </Typography>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {paymentStatus ? (
                  <Grid container spacing={2}>
                    <Grid xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Payment Status
                      </Typography>
                      <Chip
                        label={getStatusText(paymentStatus.status)}
                        color={getStatusColor(paymentStatus.status)}
                        sx={{ mt: 1 }}
                      />
                    </Grid>

                    <Grid xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Amount
                      </Typography>
                      <Typography variant="h6" color="primary">
                        ₹{paymentStatus.paidAmount || sponsorship.contribution?.value}
                      </Typography>
                    </Grid>

                  <Grid xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Payment Date
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(paymentStatus?.paymentDate)}
                    </Typography>
                  </Grid>

                  <Grid xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Transaction ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {paymentStatus?.gateway?.paymentId || 'N/A'}
                    </Typography>
                  </Grid>

                  {paymentStatus?.gateway?.refundId && (
                    <Grid xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Refund ID
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {paymentStatus.gateway.refundId}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
                ) : (
                  <Alert severity="info">
                    Payment details not available. This sponsorship may not require payment or payment information is being processed.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Sponsorship Details Card */}
          <Grid xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Sponsorship Details
                </Typography>

                <Divider sx={{ mb: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Organization
                  </Typography>
                  <Typography variant="body1">
                    {sponsorship.organization?.name}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Tier
                  </Typography>
                  <Chip
                    label={sponsorship.tier?.name?.toUpperCase()}
                    color="primary"
                    size="small"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Sponsorship Status
                  </Typography>
                  <Chip
                    label={sponsorship.status?.toUpperCase()}
                    color={sponsorship.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body2">
                    {sponsorship.contribution?.description}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

                     {/* Action Buttons */}
           <Grid xs={12}>
             <Paper sx={{ p: 2 }}>
               <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                 <Button
                   variant="outlined"
                   onClick={() => navigate('/my-applications')}
                 >
                   Back to Applications
                 </Button>

                 {paymentStatus?.status === 'completed' && (
                   <Button
                     variant="contained"
                     onClick={() => navigate(`/sponsorship/${sponsorshipId}`)}
                   >
                     View Sponsorship Details
                   </Button>
                 )}
               </Box>
             </Paper>
           </Grid>

           {/* Payment Gateway Section */}
           {(paymentStatus?.status === 'pending' || !paymentStatus) && 
            (sponsorship.status === 'approved' || sponsorship.status === 'suspended') && 
            sponsorship.contribution?.type === 'monetary' && (
             <Grid xs={12}>
               <PaymentGateway 
                 sponsorship={sponsorship}
                 onPaymentSuccess={(response) => {
                   // Refresh payment status after successful payment
                   fetchSponsorshipData();
                 }}
                 onPaymentError={(error) => {
                   console.error('Payment error:', error);
                 }}
               />
             </Grid>
           )}
        </Grid>
      </Box>
    </Box>
  );
};

export default PaymentStatusPage; 