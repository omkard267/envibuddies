import React, { useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Chip,
  Grid,
  Alert,
} from '@mui/material';

const TimeSlotSelector = ({ timeSlots, onSelectionChange, selectedTimeSlot }) => {
  const [selectedSlot, setSelectedSlot] = useState(selectedTimeSlot?.slotId || '');
  const [selectedCategory, setSelectedCategory] = useState(selectedTimeSlot?.categoryId || '');

  const handleSlotChange = (slotId) => {
    setSelectedSlot(slotId);
    setSelectedCategory(''); // Reset category when slot changes
    onSelectionChange(null); // Clear selection
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    const slot = timeSlots.find(s => s.id === selectedSlot);
    const category = slot?.categories.find(c => c.id === categoryId);
    
    onSelectionChange({
      slotId: selectedSlot,
      slotName: slot?.name,
      categoryId: categoryId,
      categoryName: category?.name
    });
  };

  const getSelectedSlot = () => timeSlots.find(slot => slot.id === selectedSlot);
  const getSelectedCategory = () => {
    const slot = getSelectedSlot();
    return slot?.categories.find(cat => cat.id === selectedCategory);
  };

  const isCategoryAvailable = (category) => {
    return category.maxVolunteers === null || category.currentVolunteers < category.maxVolunteers;
  };

  const getAvailableSpots = (category) => {
    if (category.maxVolunteers === null) return 'Unlimited';
    return `${category.maxVolunteers - category.currentVolunteers} spots left`;
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Select Time Slot & Category
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Time Slot</InputLabel>
            <Select
              value={selectedSlot}
              onChange={(e) => handleSlotChange(e.target.value)}
              label="Time Slot"
            >
              {timeSlots.map((slot) => (
                <MenuItem key={slot.id} value={slot.id}>
                  <Box>
                    <Typography variant="body1">{slot.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {slot.startTime} - {slot.endTime}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth disabled={!selectedSlot}>
            <InputLabel>Category</InputLabel>
            <Select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              label="Category"
            >
              {selectedSlot && getSelectedSlot()?.categories.map((category) => (
                <MenuItem 
                  key={category.id} 
                  value={category.id}
                  disabled={!isCategoryAvailable(category)}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <Typography>{category.name}</Typography>
                    <Chip 
                      label={getAvailableSpots(category)}
                      size="small"
                      color={isCategoryAvailable(category) ? 'success' : 'error'}
                      variant="outlined"
                    />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {selectedSlot && getSelectedSlot() && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              {getSelectedSlot().name} ({getSelectedSlot().startTime} - {getSelectedSlot().endTime})
            </Typography>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Available Categories:
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {getSelectedSlot().categories.map((category) => (
                <Chip
                  key={category.id}
                  label={`${category.name} (${getAvailableSpots(category)})`}
                  color={isCategoryAvailable(category) ? 'primary' : 'error'}
                  variant={selectedCategory === category.id ? 'filled' : 'outlined'}
                  onClick={() => handleCategoryChange(category.id)}
                  disabled={!isCategoryAvailable(category)}
                />
              ))}
            </Box>

            {selectedCategory && getSelectedCategory() && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Selected: <strong>{getSelectedCategory().name}</strong> in {getSelectedSlot().name}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {selectedSlot && getSelectedSlot()?.categories.every(cat => !isCategoryAvailable(cat)) && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          All categories in this time slot are full. Please select a different time slot.
        </Alert>
      )}
    </Box>
  );
};

export default TimeSlotSelector; 