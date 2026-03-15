import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Close as CloseIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  getSeriesDetails,
  updateSeriesStatus,
  deleteSeries,
  createNextInstance
} from '../../api/recurringEvents';

export default function SeriesManagementModal({ open, onClose, seriesId, onUpdate }) {
  const [series, setSeries] = useState(null);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && seriesId) {
      fetchSeriesDetails();
    }
  }, [open, seriesId]);

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
          onClose();
          break;
        case 'create-next':
          await createNextInstance(seriesId);
          break;
        default:
          break;
      }

      fetchSeriesDetails(); // Refresh data
      onUpdate(); // Update parent
    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      setError(`Failed to ${action} series`);
    } finally {
      setActionLoading(false);
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
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (!series) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Series Management</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Series Information */}
        <Box mb={3}>
          <Typography variant="h5" gutterBottom>
            {series.title}
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            {series.description}
          </Typography>

          <Box display="flex" gap={1} mb={2} flexWrap="wrap">
            <Chip 
              label={getStatusText(series.status)} 
              color={getStatusColor(series.status)} 
            />
            <Chip 
              label={`${series.recurringType} - ${series.recurringValue}`} 
              variant="outlined" 
            />
            <Chip 
              label={`${instances.length} Instances`} 
              variant="outlined" 
            />
          </Box>

          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
            <Typography variant="body2">
              <strong>Start Date:</strong> {formatDate(series.startDate)}
            </Typography>
            <Typography variant="body2">
              <strong>End Date:</strong> {formatDate(series.endDate)}
            </Typography>
            <Typography variant="body2">
              <strong>Organization:</strong> {series.organization?.name || 'N/A'}
            </Typography>
            <Typography variant="body2">
              <strong>Max Instances:</strong> {series.maxInstances || 'Unlimited'}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Series Actions */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Series Actions
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {series.status === 'active' && (
              <Button
                variant="outlined"
                startIcon={<PauseIcon />}
                onClick={() => handleAction('pause', 'paused')}
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
                startIcon={<ViewIcon />}
                onClick={() => handleAction('create-next')}
                disabled={actionLoading}
              >
                Create Next Instance
              </Button>
            )}
            
            <Button
              variant="outlined"
              color="error"
              startIcon={<StopIcon />}
              onClick={() => handleAction('cancel')}
              disabled={actionLoading}
            >
              Cancel Series
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Instances List */}
        <Box>
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
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
} 