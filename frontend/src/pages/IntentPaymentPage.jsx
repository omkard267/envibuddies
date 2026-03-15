// frontend/src/pages/IntentPaymentPage.jsx

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
  Container,
  Stack,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  CheckCircle,
  Pending,
  Error,
  Payment,
  Business,
  ArrowBack,
  Receipt,
  AccountBalance,
  CalendarToday,
  AttachMoney,
  ReceiptLong,
  Security
} from '@mui/icons-material';
import { getIntentPaymentStatus } from '../api/intentPayment';
import sponsorshipIntentAPI from '../api/sponsorshipIntent';
import Navbar from '../components/layout/Navbar';
import IntentPaymentGateway from '../components/payment/IntentPaymentGateway';
import { formatDate } from '../utils/dateUtils';

const IntentPaymentPage = () => {
  const { intentId } = useParams();
  const navigate = useNavigate();
  const [intent, setIntent] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [receiptInfo, setReceiptInfo] = useState(null);

  useEffect(() => {
    fetchIntentData();
  }, [intentId]);

  const fetchIntentData = async () => {
    try {
      setLoading(true);
      
      // First try to get intent details
      let intentRes;
      try {
        intentRes = await sponsorshipIntentAPI.getIntentById(intentId);
        setIntent(intentRes);
      } catch (intentError) {
        console.error('Error fetching intent:', intentError);
        setError('Sponsorship intent not found');
        return;
      }

      // Then try to get payment status
      try {
        const paymentRes = await getIntentPaymentStatus(intentId);
        setPaymentStatus(paymentRes.payment);
      } catch (paymentError) {
        console.error('Error fetching payment status:', paymentError);
        // Don't set error here, just show intent without payment details
        setPaymentStatus(null);
      }
    } catch (error) {
      console.error('Error fetching intent data:', error);
      setError('Failed to load sponsorship intent details');
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
        return 'No Payment';
    }
  };

  // Using the utility function instead of local formatDate

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
        <Navbar />
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: 'calc(100vh - 80px)',
          pt: '80px'
        }}>
          <Stack spacing={3} alignItems="center">
            <CircularProgress size={60} color="primary" />
            <Typography variant="h6" color="text.secondary">
              Loading payment details...
            </Typography>
          </Stack>
        </Box>
      </Box>
    );
  }

  if (error || !intent) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
        <Navbar />
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: 'calc(100vh - 80px)',
          pt: '80px'
        }}>
          <Stack spacing={3} alignItems="center" sx={{ maxWidth: 500, textAlign: 'center' }}>
            <Alert severity="error" sx={{ width: '100%' }}>
              {error || 'Sponsorship intent not found'}
            </Alert>
            <Button
              variant="contained"
              startIcon={<ArrowBack />}
              onClick={() => navigate('/my-applications')}
              size="large"
            >
              Back to Applications
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
      <Navbar />
      
      <Box sx={{ 
        maxWidth: '1200px', 
        mx: 'auto', 
        py: 4, 
        pt: '100px',
        px: 3
      }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/my-applications')}
            sx={{ mb: 2 }}
          >
            Back to Applications
          </Button>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1e293b' }}>
            Sponsorship Payment
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Complete your sponsorship payment for {intent.organization?.name}
          </Typography>
        </Box>

        {/* Success Banner for Completed Payment */}
        {paymentStatus?.status === 'completed' && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              '& .MuiAlert-icon': { fontSize: 28 },
              '& .MuiAlert-message': { fontSize: '1.1rem', fontWeight: 'medium' }
            }}
            icon={<CheckCircle fontSize="large" />}
          >
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              Payment Completed Successfully! 🎉
            </Typography>
            <Typography variant="body2">
              Your sponsorship payment has been processed and verified. Your sponsorship is now active.
            </Typography>
          </Alert>
        )}

        {/* Main Content Layout */}
        <Box sx={{ 
          display: 'flex', 
          gap: 3,
          flexDirection: { xs: 'column', md: 'row' }
        }}>
          {/* Left Column - Payment Information */}
          <Box sx={{ 
            flex: { xs: '1', md: '2' },
            minWidth: 0
          }}>
            <Stack spacing={3}>
              {/* Payment Status Card */}
              <Card sx={{ 
                boxShadow: paymentStatus?.status === 'completed' 
                  ? '0 4px 12px rgba(76, 175, 80, 0.15)' 
                  : '0 1px 3px rgba(0,0,0,0.12)', 
                borderRadius: 2,
                border: paymentStatus?.status === 'completed' ? '2px solid #4caf50' : 'none'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ 
                      bgcolor: paymentStatus?.status === 'completed' ? 'success.main' : 'primary.main', 
                      mr: 2,
                      width: 48,
                      height: 48
                    }}>
                      {paymentStatus?.status === 'completed' ? <CheckCircle /> : <AttachMoney />}
                    </Avatar>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
                        Payment Information
                      </Typography>
                      {paymentStatus?.status === 'completed' && (
                        <Typography variant="body2" color="success.main" sx={{ fontWeight: 'medium' }}>
                          ✓ Payment verified and processed
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {paymentStatus ? (
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 3
                    }}>
                      <Box sx={{ 
                        p: 2, 
                        bgcolor: paymentStatus?.status === 'completed' ? '#f1f8e9' : '#f8fafc', 
                        borderRadius: 2, 
                        border: paymentStatus?.status === 'completed' ? '1px solid #4caf50' : '1px solid #e2e8f0'
                      }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Payment Status
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          {getStatusIcon(paymentStatus.status)}
                          <Chip
                            label={getStatusText(paymentStatus.status)}
                            color={getStatusColor(paymentStatus.status)}
                            size="small"
                            sx={{ 
                              ml: 1, 
                              fontWeight: 'bold',
                              bgcolor: paymentStatus?.status === 'completed' ? '#4caf50' : undefined,
                              color: paymentStatus?.status === 'completed' ? 'white' : undefined
                            }}
                          />
                        </Box>
                      </Box>

                      <Box sx={{ 
                        p: 2, 
                        bgcolor: paymentStatus?.status === 'completed' ? '#f1f8e9' : '#f8fafc', 
                        borderRadius: 2, 
                        border: paymentStatus?.status === 'completed' ? '1px solid #4caf50' : '1px solid #e2e8f0'
                      }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Amount Paid
                        </Typography>
                        <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(paymentStatus.paidAmount || intent.sponsorship?.estimatedValue)}
                        </Typography>
                        {paymentStatus?.status === 'completed' && (
                          <Typography variant="caption" color="success.main" sx={{ fontWeight: 'medium' }}>
                            ✓ Payment received
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ 
                        p: 2, 
                        bgcolor: paymentStatus?.status === 'completed' ? '#f1f8e9' : '#f8fafc', 
                        borderRadius: 2, 
                        border: paymentStatus?.status === 'completed' ? '1px solid #4caf50' : '1px solid #e2e8f0'
                      }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Payment Date
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <CalendarToday sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            {formatDate(paymentStatus?.paymentDate)}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ 
                        p: 2, 
                        bgcolor: paymentStatus?.status === 'completed' ? '#f1f8e9' : '#f8fafc', 
                        borderRadius: 2, 
                        border: paymentStatus?.status === 'completed' ? '1px solid #4caf50' : '1px solid #e2e8f0'
                      }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Transaction ID
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <Security sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                          <Typography variant="body2" sx={{ 
                            fontFamily: 'monospace', 
                            fontWeight: 'medium',
                            wordBreak: 'break-all'
                          }}>
                            {paymentStatus?.gateway?.paymentId || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ) : (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      Payment details not available. This sponsorship intent may not require payment or payment information is being processed.
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Payment Gateway Section - Only show if payment not completed */}
              {intent.status === 'approved' && 
               intent.sponsorship?.type === 'monetary' && 
               paymentStatus?.status !== 'completed' && (
                <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12)', borderRadius: 2 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                        <Payment />
                      </Avatar>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
                        Complete Payment
                      </Typography>
                    </Box>
                    <IntentPaymentGateway 
                      intent={intent}
                      onPaymentSuccess={(response) => {
                        if (response.receipt) {
                          setReceiptInfo(response.receipt);
                        }
                        fetchIntentData();
                      }}
                      onPaymentError={(error) => {
                        console.error('Payment error:', error);
                      }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Success Message for Completed Payment */}
              {paymentStatus?.status === 'completed' && (
                <Card sx={{ 
                  boxShadow: '0 4px 12px rgba(76, 175, 80, 0.15)', 
                  borderRadius: 2,
                  border: '2px solid #4caf50',
                  bgcolor: '#f1f8e9'
                }}>
                  <CardContent sx={{ p: 3, textAlign: 'center' }}>
                    <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1e293b', mb: 1 }}>
                      Payment Successfully Completed!
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Your sponsorship has been activated and you can now access all benefits.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                      {receiptInfo && (
                        <Button
                          variant="contained"
                          color="secondary"
                          startIcon={<Receipt />}
                          onClick={() => navigate(`/receipt/${receiptInfo.id}`)}
                          size="medium"
                        >
                          View Receipt
                        </Button>
                      )}
                      {intent.convertedTo && (
                        <Button
                          variant="contained"
                          startIcon={<AccountBalance />}
                          onClick={() => navigate(`/payment-status/${intent.convertedTo}`)}
                          size="medium"
                        >
                          View Sponsorship
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Stack>
          </Box>

          {/* Right Column - Sponsorship Details */}
          <Box sx={{ 
            flex: { xs: '1', md: '1' },
            minWidth: { md: '300px' }
          }}>
            <Stack spacing={3}>
              {/* Sponsorship Details Card */}
              <Card sx={{ 
                boxShadow: paymentStatus?.status === 'completed' 
                  ? '0 4px 12px rgba(76, 175, 80, 0.15)' 
                  : '0 1px 3px rgba(0,0,0,0.12)', 
                borderRadius: 2,
                border: paymentStatus?.status === 'completed' ? '2px solid #4caf50' : 'none'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ 
                      bgcolor: paymentStatus?.status === 'completed' ? 'success.main' : 'info.main', 
                      mr: 2 
                    }}>
                      <Business />
                    </Avatar>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
                        Sponsorship Details
                      </Typography>
                      {paymentStatus?.status === 'completed' && (
                        <Typography variant="body2" color="success.main" sx={{ fontWeight: 'medium' }}>
                          ✓ Active sponsorship
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <List sx={{ p: 0 }}>
                    <ListItem sx={{ px: 0, py: 1 }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <Business color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Organization"
                        secondary={intent.organization?.name}
                        primaryTypographyProps={{ variant: 'subtitle2', color: 'text.secondary' }}
                        secondaryTypographyProps={{ variant: 'body1', fontWeight: 'medium' }}
                      />
                    </ListItem>

                    <ListItem sx={{ px: 0, py: 1 }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <ReceiptLong color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Sponsorship Tier"
                        secondary={
                          <Chip
                            label={intent.tier?.name?.toUpperCase()}
                            color="primary"
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        }
                        primaryTypographyProps={{ variant: 'subtitle2', color: 'text.secondary' }}
                      />
                    </ListItem>

                    <ListItem sx={{ px: 0, py: 1 }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <CheckCircle color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Intent Status"
                        secondary={
                          <Chip
                            label={intent.status?.toUpperCase()}
                            color={intent.status === 'approved' ? 'success' : 'default'}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        }
                        primaryTypographyProps={{ variant: 'subtitle2', color: 'text.secondary' }}
                      />
                    </ListItem>

                    <ListItem sx={{ px: 0, py: 1 }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <ReceiptLong color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Description"
                        secondary={intent.sponsorship?.description}
                        primaryTypographyProps={{ variant: 'subtitle2', color: 'text.secondary' }}
                        secondaryTypographyProps={{ variant: 'body2', color: '#475569' }}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>

              {/* Action Buttons Card */}
              <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12)', borderRadius: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: '#1e293b', mb: 2 }}>
                    Actions
                  </Typography>
                  <Stack spacing={2}>
                    <Button
                      variant="outlined"
                      startIcon={<ArrowBack />}
                      onClick={() => navigate('/my-applications')}
                      fullWidth
                      size="large"
                    >
                      Back to Applications
                    </Button>

                    {paymentStatus?.status === 'completed' && intent.convertedTo && (
                      <Button
                        variant="contained"
                        startIcon={<AccountBalance />}
                        onClick={() => navigate(`/payment-status/${intent.convertedTo}`)}
                        fullWidth
                        size="large"
                      >
                        View Sponsorship Details
                      </Button>
                    )}

                    {receiptInfo && (
                      <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<Receipt />}
                        onClick={() => navigate(`/receipt/${receiptInfo.id}`)}
                        fullWidth
                        size="large"
                      >
                        View Receipt
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default IntentPaymentPage; 