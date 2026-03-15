import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Card,
  CardContent,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Avatar,
} from '@mui/material';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import BusinessIcon from '@mui/icons-material/Business';

const RoleSelectionModal = ({ open, onClose, onRoleSelect, oauthData }) => {
  const [selectedRole, setSelectedRole] = useState('');

  const handleRoleSelect = () => {
    if (selectedRole) {
      onRoleSelect(selectedRole);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedRole('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      sx={{ zIndex: 9999 }}
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
          bgcolor: '#f8f9fa',
          zIndex: 9999
        }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="center" gap={2} mb={2}>
          <Avatar 
            src={oauthData?.picture || null} 
            alt={oauthData?.name}
            sx={{ width: 60, height: 60 }}
          >
            {oauthData?.name?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold" color="primary">
              Choose Your Role
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Welcome, {oauthData?.name}!
            </Typography>
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Select how you'd like to contribute to environmental causes
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <FormControl component="fieldset" sx={{ width: '100%' }}>
          <RadioGroup
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            sx={{ gap: 2 }}
          >
            <Card 
              variant="outlined" 
              sx={{ 
                cursor: 'pointer',
                border: selectedRole === 'volunteer' ? '2px solid #1976d2' : '1px solid #ddd',
                backgroundColor: selectedRole === 'volunteer' ? '#e3f2fd' : 'white',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#1976d2',
                  backgroundColor: '#f3f8ff',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                }
              }}
              onClick={() => setSelectedRole('volunteer')}
            >
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={3}>
                  <Radio value="volunteer" color="primary" />
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: '50%', 
                      bgcolor: '#e3f2fd',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <VolunteerActivismIcon sx={{ fontSize: 32, color: '#1976d2' }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight="bold" color="primary">
                        Volunteer
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Join events, contribute to environmental causes, and make a difference in your community.
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Perfect for individuals who want to participate in events
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card 
              variant="outlined" 
              sx={{ 
                cursor: 'pointer',
                border: selectedRole === 'organizer' ? '2px solid #1976d2' : '1px solid #ddd',
                backgroundColor: selectedRole === 'organizer' ? '#e3f2fd' : 'white',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#1976d2',
                  backgroundColor: '#f3f8ff',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                }
              }}
              onClick={() => setSelectedRole('organizer')}
            >
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={3}>
                  <Radio value="organizer" color="primary" />
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: '50%', 
                      bgcolor: '#e3f2fd',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <BusinessIcon sx={{ fontSize: 32, color: '#1976d2' }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight="bold" color="primary">
                        Organizer
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Create and manage events, lead environmental initiatives, and coordinate volunteer activities.
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Ideal for organizations and event leaders
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </RadioGroup>
        </FormControl>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={handleRoleSelect} 
          variant="contained" 
          disabled={!selectedRole}
          sx={{ minWidth: 120, py: 1 }}
        >
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RoleSelectionModal;
