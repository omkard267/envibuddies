const { addWeeks, addMonths } = require('date-fns');

// Generate recurring events
exports.generateRecurringEvents = (baseEvent, occurrences = 12) => {
  const events = [];
  const startDate = new Date(baseEvent.startDateTime);
  const endDate = new Date(baseEvent.endDateTime);
  const duration = endDate.getTime() - startDate.getTime();

  for (let i = 0; i < occurrences; i++) {
    let newStartDate, newEndDate;

    if (baseEvent.recurringType === 'weekly') {
      newStartDate = addWeeks(startDate, i);
      newEndDate = new Date(newStartDate.getTime() + duration);
    } else if (baseEvent.recurringType === 'monthly') {
      newStartDate = addMonths(startDate, i);
      newEndDate = new Date(newStartDate.getTime() + duration);
    } else {
      break; // No recurring pattern
    }

    events.push({
      ...baseEvent,
      _id: `${baseEvent._id}_recurring_${i}`,
      startDateTime: newStartDate.toISOString(),
      endDateTime: newEndDate.toISOString(),
      isRecurring: true,
      recurringIndex: i
    });
  }

  return events;
};

// Format event for calendar display
exports.formatEventForCalendar = (event, role, userId) => {
  const status = getEventStatus(event, userId);
  const isRegistered = event.volunteers && event.volunteers.includes(userId);
  const isOrganizer = event.createdBy === userId;

  return {
    id: event._id,
    title: event.title,
    start: event.startDateTime,
    end: event.endDateTime,
    color: getEventColor(status, role, isOrganizer),
    extendedProps: {
      eventType: event.eventType,
      status,
      isRegistered,
      isOrganizer,
      location: event.location,
      description: event.description,
      isRecurring: event.isRecurring || false
    }
  };
};

// Get event status
const getEventStatus = (event, userId) => {
  const now = new Date();
  const eventEnd = new Date(event.endDateTime);

  // Check if user attended
  if (event.volunteers && event.volunteers.includes(userId)) {
    if (now > eventEnd) {
      return 'attended';
    }
  }

  // Check if event is in the past
  if (now > eventEnd) {
    return 'missed';
  }

  // Event is upcoming
  return 'upcoming';
};

// Get event color based on status and role
const getEventColor = (status, role, isOrganizer) => {
  const colors = {
    upcoming: '#2196F3',    // Blue
    attended: '#4CAF50',    // Green
    missed: '#F44336',      // Red
    created: '#FF9800',     // Orange (for organizers)
    recurring: '#9C27B0'    // Purple
  };

  if (role === 'organizer' && isOrganizer) {
    return colors.created;
  }

  return colors[status] || colors.upcoming;
}; 