import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { 
  getSeriesDetails, 
  updateSeriesStatus, 
  deleteSeries, 
  createNextInstance,
  getSeriesStats 
} from '../api/recurringEvents';
import { 
  Box, 
  Typography, 
  Button, 
  CircularProgress, 
  Alert, 
  Chip,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Paper
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

export default function SeriesDetailsPage() {
  const { seriesId } = useParams();
  const navigate = useNavigate();
  const [series, setSeries] = useState(null);
  const [instances, setInstances] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: '', title: '', message: '' });

  useEffect(() => {
    fetchSeriesDetails();
    fetchSeriesStats();
  }, [seriesId]);

  const fetchSeriesDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getSeriesDetails(seriesId);
      if (response.success) {
        setSeries(response.data.series);
        setInstances(response.data.instances);
      } else {
        setError('Failed to fetch series details');
      }
    } catch (err) {
      console.error('Error fetching series details:', err);
      setError('Failed to load series details');
    } finally {
      setLoading(false);
    }
  };

  const fetchSeriesStats = async () => {
    try {
      const response = await getSeriesStats(seriesId);
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Error fetching series stats:', err);
    }
  };

  const handleAction = async (action, status = null) => {
    try {
      setActionLoading(true);
      setError(null);

      switch (action) {
        case 'pause':
        case 'resume':
          await updateSeriesStatus(seriesId, status);
          break;
        case 'cancel':
          await deleteSeries(seriesId);
          navigate('/recurring-series');
          return;
        case 'create-next':
          await createNextInstance(seriesId);
          break;
        default:
          break;
      }

      fetchSeriesDetails();
      fetchSeriesStats();
    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      setError(`Failed to ${action} series`);
    } finally {
      setActionLoading(false);
      setConfirmDialog({ open: false, action: '', title: '', message: '' });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'info';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Active';
      case 'paused': return 'Paused';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM dd, yyyy HH:mm');
  };

  const isEventPast = (endDateTime) => {
    return new Date(endDateTime) < new Date();
  };

  const isEventUpcoming = (startDateTime) => {
    return new Date(startDateTime) > new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <Navbar />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Alert severity="error">
            {error || 'Series not found'}
          </Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/recurring-series')}
            sx={{ mt: 2 }}
          >
            Back to Series
          </Button>
        </div>
      </div>
    );
  }

  const hasActions = series.status === 'active' || series.status === 'paused';
  const isTerminal = series.status === 'cancelled' || series.status === 'completed';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <Box display="flex" alignItems="center" mb={4}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/recurring-series')}
            sx={{ mr: 2 }}
          >
            Back to Series
          </Button>
          <Typography variant="h4" component="h1" color="primary">
            Series Details
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Series Information */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                  <div>
                    <Typography variant="h5" gutterBottom>
                      {series.title}
                    </Typography>
                    <Typography variant="body1" color="textSecondary" paragraph>
                      {series.description}
                    </Typography>
                  </div>
                  <Chip 
                    label={getStatusText(series.status)} 
                    color={getStatusColor(series.status)} 
                  />
                </Box>

                <Box display="flex" gap={1} mb={3} flexWrap="wrap">
                  <Chip 
                    label={`${series.recurringType} - ${series.recurringValue}`} 
                    variant="outlined" 
                  />
                  <Chip 
                    label={`${instances.length} Instances`} 
                    variant="outlined" 
                  />
                  {series.organization && (
                    <Chip 
                      label={series.organization.name} 
                      variant="outlined" 
                    />
                  )}
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Start Date:</strong> {formatDate(series.startDate)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>End Date:</strong> {formatDate(series.endDate)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Max Instances:</strong> {series.maxInstances || 'Unlimited'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Created:</strong> {formatDate(series.createdAt)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Series Actions (only if actions are available) */}
          {hasActions && (
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Series Actions
                  </Typography>
                  
                  <Box display="flex" flexDirection="column" gap={2}>
                    {series.status === 'active' && (
                      <Button
                        variant="outlined"
                        startIcon={<PauseIcon />}
                        onClick={() => setConfirmDialog({
                          open: true,
                          action: 'pause',
                          title: 'Pause Series',
                          message: 'Are you sure you want to pause this series? Future instances will not be created automatically.'
                        })}
                        disabled={actionLoading}
                      >
                        Pause Series
                      </Button>
                    )}
                    
                    {series.status === 'paused' && (
                      <Button
                        variant="outlined"
                        startIcon={<PlayIcon />}
                        onClick={() => handleAction('resume', 'active')}
                        disabled={actionLoading}
                      >
                        Resume Series
                      </Button>
                    )}
                    
                    {series.status === 'active' && (
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleAction('create-next')}
                        disabled={actionLoading}
                      >
                        Create Next Instance
                      </Button>
                    )}
                    
                    {series.status !== 'cancelled' && (
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<StopIcon />}
                        onClick={() => setConfirmDialog({
                          open: true,
                          action: 'cancel',
                          title: 'Cancel Series',
                          message: 'Are you sure you want to cancel this series? This action cannot be undone.'
                        })}
                        disabled={actionLoading}
                      >
                        Cancel Series
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>

              {/* Statistics */}
              {stats && (
                <Card sx={{ mt: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Statistics
                    </Typography>
                    
                    <Box display="flex" flexDirection="column" gap={1}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">Total Instances:</Typography>
                        <Typography variant="body2" fontWeight="bold">{stats.totalInstances}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">Completed:</Typography>
                        <Typography variant="body2" fontWeight="bold">{stats.completedInstances}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">Upcoming:</Typography>
                        <Typography variant="body2" fontWeight="bold">{stats.upcomingInstances}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">Total Registrations:</Typography>
                        <Typography variant="body2" fontWeight="bold">{stats.totalRegistrations}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">Average Attendance:</Typography>
                        <Typography variant="body2" fontWeight="bold">{stats.averageAttendance}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Grid>
          )}

          {/* Show message if series is cancelled or completed */}
          {isTerminal && (
            <Grid item xs={12} md={4}>
              <Card sx={{ mt: hasActions ? 2 : 0 }}>
                <CardContent>
                  <Typography color="textSecondary">
                    This series is <b>{getStatusText(series.status)}</b>.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Instances List */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Event Instances
                </Typography>
                
                {instances.length === 0 ? (
                  <Typography color="textSecondary">No instances found</Typography>
                ) : (
                  <List>
                    {instances.map((instance, index) => (
                      <React.Fragment key={instance._id}>
                        <ListItem>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="subtitle1">
                                  Instance #{instance.recurringInstanceNumber}
                                </Typography>
                                {isEventPast(instance.endDateTime) && (
                                  <Chip label="Completed" color="success" size="small" />
                                )}
                                {isEventUpcoming(instance.startDateTime) && (
                                  <Chip label="Upcoming" color="primary" size="small" />
                                )}
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2">
                                  {formatDate(instance.startDateTime)} - {formatDate(instance.endDateTime)}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                  Volunteers: {instance.volunteers?.length || 0}
                                </Typography>
                              </Box>
                            }
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              onClick={() => navigate(`/events/${instance._id}`)}
                              size="small"
                            >
                              <ViewIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < instances.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, action: '', title: '', message: '' })}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, action: '', title: '', message: '' })}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleAction(confirmDialog.action, confirmDialog.action === 'pause' ? 'paused' : null)}
            color={confirmDialog.action === 'cancel' ? 'error' : 'primary'}
            disabled={actionLoading}
          >
            {actionLoading ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
} 