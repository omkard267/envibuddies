import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardActions, 
  Typography, 
  Button, 
  Chip, 
  Box, 
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import { 
  MoreVert as MoreVertIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { 
  updateSeriesStatus, 
  deleteSeries, 
  createNextInstance 
} from '../../api/recurringEvents';

export default function RecurringSeriesCard({ series, onUpdate }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: '', title: '', message: '' });
  const navigate = useNavigate();

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAction = async (action) => {
    handleMenuClose();
    
    switch (action) {
      case 'pause':
        setConfirmDialog({
          open: true,
          action: 'pause',
          title: 'Pause Series',
          message: 'Are you sure you want to pause this series? Future instances will not be created automatically.'
        });
        break;
      case 'resume':
        await performAction('resume', 'active');
        break;
      case 'cancel':
        setConfirmDialog({
          open: true,
          action: 'cancel',
          title: 'Cancel Series',
          message: 'Are you sure you want to cancel this series? This action cannot be undone.'
        });
        break;
      case 'view':
        navigate(`/recurring-series/${series._id}`);
        break;
      case 'create-next':
        await performAction('create-next');
        break;
      default:
        break;
    }
  };

  const performAction = async (action, status = null) => {
    try {
      setLoading(true);
      setError(null);

      switch (action) {
        case 'pause':
        case 'resume':
          await updateSeriesStatus(series._id, status);
          break;
        case 'cancel':
          await deleteSeries(series._id);
          break;
        case 'create-next':
          await createNextInstance(series._id);
          break;
        default:
          break;
      }

      onUpdate(); // Refresh the list
    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      setError(`Failed to ${action} series`);
    } finally {
      setLoading(false);
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
    if (!date) return 'No end date';
    return format(new Date(date), 'MMM dd, yyyy');
  };

  return (
    <>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Typography variant="h6" component="h3" gutterBottom sx={{ flex: 1 }}>
              {series.title}
            </Typography>
            <IconButton size="small" onClick={handleMenuOpen}>
              <MoreVertIcon />
            </IconButton>
          </Box>

          <Typography variant="body2" color="textSecondary" gutterBottom>
            {series.description}
          </Typography>

          <Box display="flex" gap={1} mb={2} flexWrap="wrap">
            <Chip 
              label={getStatusText(series.status)} 
              color={getStatusColor(series.status)} 
              size="small" 
            />
            <Chip 
              label={`${series.recurringType} - ${series.recurringValue}`} 
              variant="outlined" 
              size="small" 
            />
          </Box>

          <Box mb={2}>
            <Typography variant="body2" color="textSecondary">
              <strong>Instances:</strong> {series.totalInstancesCreated || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              <strong>Start Date:</strong> {format(new Date(series.startDate), 'MMM dd, yyyy')}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              <strong>End Date:</strong> {formatDate(series.endDate)}
            </Typography>
            {series.maxInstances && (
              <Typography variant="body2" color="textSecondary">
                <strong>Max Instances:</strong> {series.maxInstances}
              </Typography>
            )}
          </Box>

          {series.organization && (
            <Typography variant="body2" color="textSecondary">
              <strong>Organization:</strong> {series.organization.name}
            </Typography>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
          <Button
            size="small"
            startIcon={<ViewIcon />}
            onClick={() => handleAction('view')}
            disabled={loading}
          >
            View Details
          </Button>
          
          {series.status === 'active' && (
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => handleAction('create-next')}
              disabled={loading}
              color="primary"
            >
              Create Next
            </Button>
          )}
        </CardActions>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleAction('view')}>
          <ViewIcon sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        
        {series.status === 'active' && (
          <MenuItem onClick={() => handleAction('pause')}>
            <PauseIcon sx={{ mr: 1 }} />
            Pause Series
          </MenuItem>
        )}
        
        {series.status === 'paused' && (
          <MenuItem onClick={() => handleAction('resume')}>
            <PlayIcon sx={{ mr: 1 }} />
            Resume Series
          </MenuItem>
        )}
        
        {series.status === 'active' && (
          <MenuItem onClick={() => handleAction('create-next')}>
            <AddIcon sx={{ mr: 1 }} />
            Create Next Instance
          </MenuItem>
        )}
        
        {series.status !== 'cancelled' && (
          <MenuItem onClick={() => handleAction('cancel')} sx={{ color: 'error.main' }}>
            <StopIcon sx={{ mr: 1 }} />
            Cancel Series
          </MenuItem>
        )}
      </Menu>

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
            onClick={() => performAction(confirmDialog.action, confirmDialog.action === 'pause' ? 'paused' : null)}
            color={confirmDialog.action === 'cancel' ? 'error' : 'primary'}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 