const { v4: uuidv4 } = require('uuid');

// Generate unique IDs for time slots and categories
const generateId = () => uuidv4();

// Validate time format (HH:MM)
const isValidTimeFormat = (time) => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

// Convert time string to minutes for comparison
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Check if two time ranges overlap
const doTimeRangesOverlap = (start1, end1, start2, end2) => {
  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);
  
  return start1Min < end2Min && start2Min < end1Min;
};

// Validate time slots
const validateTimeSlots = (timeSlots) => {
  if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
    return { isValid: false, error: 'At least one time slot is required' };
  }

  // Check for overlapping time slots
  for (let i = 0; i < timeSlots.length; i++) {
    for (let j = i + 1; j < timeSlots.length; j++) {
      const slot1 = timeSlots[i];
      const slot2 = timeSlots[j];
      
      if (doTimeRangesOverlap(slot1.startTime, slot1.endTime, slot2.startTime, slot2.endTime)) {
        return { 
          isValid: false, 
          error: `Time slots "${slot1.name}" and "${slot2.name}" overlap` 
        };
      }
    }
  }

  // Validate individual time slots
  for (const slot of timeSlots) {
    if (!slot.name || slot.name.trim() === '') {
      return { isValid: false, error: 'All time slots must have a name' };
    }
    
    if (!isValidTimeFormat(slot.startTime) || !isValidTimeFormat(slot.endTime)) {
      return { isValid: false, error: 'Invalid time format. Use HH:MM format' };
    }
    
    if (timeToMinutes(slot.startTime) >= timeToMinutes(slot.endTime)) {
      return { isValid: false, error: `End time must be after start time for slot "${slot.name}"` };
    }
    
    if (!Array.isArray(slot.categories) || slot.categories.length === 0) {
      return { isValid: false, error: `Time slot "${slot.name}" must have at least one category` };
    }
    
    // Validate categories within the slot
    const categoryNames = slot.categories.map(cat => cat.name.toLowerCase());
    const uniqueCategoryNames = [...new Set(categoryNames)];
    if (categoryNames.length !== uniqueCategoryNames.length) {
      return { isValid: false, error: `Duplicate category names found in slot "${slot.name}"` };
    }
    
    for (const category of slot.categories) {
      if (!category.name || category.name.trim() === '') {
        return { isValid: false, error: 'All categories must have a name' };
      }
      
      if (category.maxVolunteers !== null && category.maxVolunteers <= 0) {
        return { isValid: false, error: `Max volunteers must be positive for category "${category.name}"` };
      }
    }
  }

  return { isValid: true };
};

// Prepare time slots for saving (add IDs if missing)
const prepareTimeSlotsForSave = (timeSlots) => {
  return timeSlots.map(slot => ({
    id: slot.id || generateId(),
    name: slot.name,
    startTime: slot.startTime,
    endTime: slot.endTime,
    categories: slot.categories.map(category => ({
      id: category.id || generateId(),
      name: category.name,
      maxVolunteers: category.maxVolunteers,
      currentVolunteers: category.currentVolunteers || 0
    }))
  }));
};

// Check if a category has available spots
const isCategoryAvailable = (category) => {
  return category.maxVolunteers === null || category.currentVolunteers < category.maxVolunteers;
};

// Get available categories for a time slot
const getAvailableCategories = (timeSlot) => {
  return timeSlot.categories.filter(isCategoryAvailable);
};

// Update volunteer count for a category
const updateCategoryVolunteerCount = (event, slotId, categoryId, increment = true) => {
  const timeSlot = event.timeSlots.find(slot => slot.id === slotId);
  if (!timeSlot) return false;
  
  const category = timeSlot.categories.find(cat => cat.id === categoryId);
  if (!category) return false;
  
  if (increment) {
    if (!isCategoryAvailable(category)) return false;
    category.currentVolunteers += 1;
  } else {
    category.currentVolunteers = Math.max(0, category.currentVolunteers - 1);
  }
  
  return true;
};

module.exports = {
  generateId,
  isValidTimeFormat,
  timeToMinutes,
  doTimeRangesOverlap,
  validateTimeSlots,
  prepareTimeSlotsForSave,
  isCategoryAvailable,
  getAvailableCategories,
  updateCategoryVolunteerCount
}; 