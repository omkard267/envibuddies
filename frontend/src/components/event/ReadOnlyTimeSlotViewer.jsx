import React from 'react';
import { Box, Typography, Card, CardContent, Chip } from '@mui/material';

const ReadOnlyTimeSlotViewer = ({ timeSlots = [] }) => {
  if (!timeSlots || timeSlots.length === 0) {
    return (
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          No time slots configured for this event.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Existing Time Slots & Categories
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        These time slots and categories are read-only. You can add new ones below.
      </Typography>
      
      {timeSlots.map((slot, slotIndex) => (
        <Card key={slot.id} sx={{ mb: 2, border: '1px solid #e0e0e0' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
                {slot.name || `Time Slot ${slotIndex + 1}`}
              </Typography>
              <Chip 
                label={`${slot.startTime} - ${slot.endTime}`}
                color="primary"
                variant="outlined"
                size="small"
              />
            </Box>

            <Box
              sx={{
                mb: 2,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="body2" color="text.secondary">
                  <strong>Start Time:</strong> {slot.startTime}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  <strong>End Time:</strong> {slot.endTime}
                </Typography>
              </Box>
            </Box>

            <Typography variant="subtitle2" gutterBottom>
              Categories ({slot.categories.length})
            </Typography>

            {slot.categories.map((category, catIndex) => (
              <Box key={category.id} sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 1, 
                p: 1, 
                bgcolor: 'grey.50', 
                borderRadius: 1 
              }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {category.name || `Category ${catIndex + 1}`}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {category.maxVolunteers ? (
                    <Chip
                      label={`Max: ${category.maxVolunteers}`}
                      color="secondary"
                      variant="outlined"
                      size="small"
                    />
                  ) : (
                    <Chip
                      label="Unlimited"
                      color="success"
                      variant="outlined"
                      size="small"
                    />
                  )}
                  {category.currentVolunteers > 0 && (
                    <Chip
                      label={`Current: ${category.currentVolunteers}`}
                      color="info"
                      variant="outlined"
                      size="small"
                    />
                  )}
                </Box>
              </Box>
            ))}

            {slot.categories.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No categories configured for this time slot.
              </Typography>
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default ReadOnlyTimeSlotViewer; 