const Event = require('../models/event');
const Registration = require('../models/registration');
const CalendarEvent = require('../models/calendarEvent');
const { format, isAfter, isBefore, isEqual, addWeeks, addMonths, startOfWeek, endOfWeek } = require('date-fns');

// Event status determination
const getEventStatus = (event, userId) => {
  const now = new Date();
  const eventStart = new Date(event.startDateTime);
  const eventEnd = new Date(event.endDateTime);

  // Check if user attended
  if (event.volunteers && event.volunteers.includes(userId)) {
    if (isAfter(now, eventEnd)) {
      return 'attended';
    }
  }

  // Check if event is in the past
  if (isAfter(now, eventEnd)) {
    return 'missed';
  }

  // Event is upcoming
  return 'upcoming';
};

// Generate recurring events
const generateRecurringEvents = (baseEvent, occurrences = 12) => {
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

// Process recurring events for calendar display
const processRecurringEvents = (events, startDate, endDate) => {
  const processedEvents = [];
  
  events.forEach(event => {
    // If it's a recurring event, generate instances within the date range instead of showing the original
    if (event.recurringEvent && event.recurringType && event.recurringValue) {
      const recurringInstances = generateRecurringInstances(event, startDate, endDate);
      processedEvents.push(...recurringInstances);
    } else {
      // Add the original event only if it's not recurring
      processedEvents.push(event);
    }
  });
  
  return processedEvents;
};

// Generate recurring instances within a specific date range
const generateRecurringInstances = (baseEvent, startDate, endDate) => {
  const instances = [];
  const baseStart = new Date(baseEvent.startDateTime);
  const baseEnd = new Date(baseEvent.endDateTime);
  const duration = baseEnd.getTime() - baseStart.getTime();
  
  let currentDate = new Date(baseStart);
  let instanceCount = 0;
  const maxInstances = 52; // Prevent infinite loops
  
  while (currentDate <= endDate && instanceCount < maxInstances) {
    if (currentDate >= startDate) {
      const newEndDate = new Date(currentDate.getTime() + duration);
      
      const instance = {
        ...baseEvent.toObject(),
        _id: `${baseEvent._id}_recurring_${instanceCount}`,
        startDateTime: currentDate.toISOString(),
        endDateTime: newEndDate.toISOString(),
        isRecurringInstance: true,
        originalEventId: baseEvent._id,
        recurringIndex: instanceCount,
        recurringPattern: `${baseEvent.recurringType} - ${baseEvent.recurringValue}`,
        isRecurring: true
      };
      
      instances.push(instance);
    }
    
    // Calculate next occurrence
    if (baseEvent.recurringType === 'weekly') {
      currentDate = addWeeks(currentDate, 1);
    } else if (baseEvent.recurringType === 'monthly') {
      currentDate = addMonths(currentDate, 1);
    } else {
      break;
    }
    
    instanceCount++;
  }
  
  return instances;
};

// Format event for calendar display
const formatEventForCalendar = (event, role, userId) => {
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

// Get week range for API calls
const getWeekRange = (date) => {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(date, { weekStartsOn: 1 }); // Sunday
  return { start, end };
};

// Format event date
const formatEventDate = (date) => {
  return format(new Date(date), 'MMM dd, yyyy');
};

// Format event time
const formatEventTime = (date) => {
  return format(new Date(date), 'hh:mm a');
};

// Check if event is today
const isEventToday = (eventDate) => {
  const today = new Date();
  const eventDateObj = new Date(eventDate);
  return format(today, 'yyyy-MM-dd') === format(eventDateObj, 'yyyy-MM-dd');
};

// Check if event is upcoming
const isEventUpcoming = (eventDate) => {
  return new Date(eventDate) > new Date();
};

// Check if event is past
const isEventPast = (eventDate) => {
  return new Date(eventDate) < new Date();
};

// Add event to user's calendar
exports.addToCalendar = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Check if user exists and has valid _id
    if (!req.user || !req.user._id) {
      console.error('User not found or invalid in addToCalendar');
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    const userId = req.user._id;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check if user is already registered for this event
    const registration = await Registration.findOne({ eventId, volunteerId: userId });
    if (registration) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot add registered events to calendar. They are automatically included.' 
      });
    }

    // Check if user is organizer for this event (creator or team member)
    const isCreator = event.createdBy.toString() === userId.toString();
    const isOrganizerTeamMember = event.organizerTeam && event.organizerTeam.some(team => 
      team.user && team.user.toString() === userId.toString()
    );
    const isOrganizerEvent = isCreator || isOrganizerTeamMember;

    // For organizers, prevent adding their own events
    if (isOrganizerEvent) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot add organizer events to calendar. They are automatically included.' 
      });
    }

    // Check if already in calendar
    const existingCalendarEvent = await CalendarEvent.findOne({ userId, eventId });
    if (existingCalendarEvent) {
      return res.status(400).json({ 
        success: false, 
        message: 'Event is already in your calendar' 
      });
    }

    // Add to calendar
    const calendarEvent = new CalendarEvent({
      userId,
      eventId
    });
    await calendarEvent.save();

    res.status(200).json({ 
      success: true, 
      message: 'Event added to calendar successfully' 
    });
  } catch (error) {
    console.error('Error adding event to calendar:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add event to calendar' 
    });
  }
};

// Remove event from user's calendar
exports.removeFromCalendar = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Check if user exists and has valid _id
    if (!req.user || !req.user._id) {
      console.error('User not found or invalid in removeFromCalendar');
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    const userId = req.user._id;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check if user is registered for this event
    const registration = await Registration.findOne({ eventId, volunteerId: userId });
    if (registration) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot remove registered events from calendar. They are automatically included.' 
      });
    }

    // Check if user is organizer for this event (creator or team member)
    const isCreator = event.createdBy.toString() === userId.toString();
    const isOrganizerTeamMember = event.organizerTeam && event.organizerTeam.some(team => 
      team.user && team.user.toString() === userId.toString()
    );
    const isOrganizerEvent = isCreator || isOrganizerTeamMember;

    // For organizers, prevent removing their own events
    if (isOrganizerEvent) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot remove organizer events from calendar. They are automatically included.' 
      });
    }

    // Remove from calendar
    const result = await CalendarEvent.findOneAndDelete({ userId, eventId });
    if (!result) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found in your calendar' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Event removed from calendar successfully' 
    });
  } catch (error) {
    console.error('Error removing event from calendar:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to remove event from calendar' 
    });
  }
};

// Check if event is in user's calendar
exports.checkCalendarStatus = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Check if user exists and has valid _id
    if (!req.user || !req.user._id) {
      console.error('User not found or invalid in checkCalendarStatus');
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    const userId = req.user._id;

    // Check if user is registered for this event (for volunteers)
    const registration = await Registration.findOne({ eventId, volunteerId: userId });
    const isRegistered = !!registration;

    // Check if user is organizer for this event (creator or team member)
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const isCreator = event.createdBy.toString() === userId.toString();
    const isOrganizerTeamMember = event.organizerTeam && event.organizerTeam.some(team => 
      team.user && team.user.toString() === userId.toString()
    );
    const isOrganizerEvent = isCreator || isOrganizerTeamMember;

    // Check if event is in user's calendar (only if not registered/organizer event)
    let isInCalendar = false;
    if (!isRegistered && !isOrganizerEvent) {
      const calendarEvent = await CalendarEvent.findOne({ userId, eventId });
      isInCalendar = !!calendarEvent;
    }

    res.status(200).json({
      success: true,
      data: {
        isRegistered,
        isOrganizerEvent,
        isInCalendar: isRegistered || isOrganizerEvent ? true : isInCalendar, // Registered/organizer events are always in calendar
        canAddToCalendar: !isRegistered && !isOrganizerEvent && !isInCalendar,
        canRemoveFromCalendar: !isRegistered && !isOrganizerEvent && isInCalendar
      }
    });
  } catch (error) {
    console.error('Error checking calendar status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check calendar status' 
    });
  }
};

// Get user's calendar events
exports.getUserCalendarEvents = async (req, res) => {
  try {
    // Check if user exists and has valid _id
    if (!req.user || !req.user._id) {
      console.error('User not found or invalid in getUserCalendarEvents');
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    const userId = req.user._id;
    const { start, end } = req.query;

    // Get registered events (these are always in calendar)
    const registeredEvents = await Registration.find({ 
      volunteerId: userId 
    }).populate('eventId');

    // Get manually added calendar events
    const calendarEvents = await CalendarEvent.find({ 
      userId 
    }).populate('eventId');

    // Combine and filter by date range if provided
    let allEvents = [];
    
    // Add registered events
    registeredEvents.forEach(reg => {
      if (reg.eventId) {
        allEvents.push({
          ...reg.eventId.toObject(),
          isRegistered: true,
          isInCalendar: true,
          canRemoveFromCalendar: false
        });
      }
    });

    // Add manually added calendar events
    calendarEvents.forEach(cal => {
      if (cal.eventId) {
        allEvents.push({
          ...cal.eventId.toObject(),
          isRegistered: false,
          isInCalendar: true,
          canRemoveFromCalendar: true
        });
      }
    });

    // Filter by date range if provided
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      allEvents = allEvents.filter(event => {
        const eventDate = new Date(event.startDateTime);
        return eventDate >= startDate && eventDate <= endDate;
      });
    }

    // Remove duplicates (in case an event is both registered and manually added)
    const uniqueEvents = [];
    const seen = new Set();
    allEvents.forEach(event => {
      if (!seen.has(event._id.toString())) {
        uniqueEvents.push(event);
        seen.add(event._id.toString());
      }
    });

    res.status(200).json({
      success: true,
      data: uniqueEvents
    });
  } catch (error) {
    console.error('Error getting user calendar events:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get calendar events' 
    });
  }
};

// Get calendar events for display (existing function)
exports.getCalendarEvents = async (req, res) => {
  try {
    const { start, end, role } = req.query;
    
    // Check if user exists and has valid _id
    if (!req.user || !req.user._id) {
      console.error('User not found or invalid in getCalendarEvents');
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    const currentUser = req.user._id;

    if (!start || !end) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }

    let events = [];
    let registeredEventsList = [];
    let additionalCalendarEvents = [];

    if (role === 'volunteer') {
      // For volunteers: get events they have registered for
      const registeredEvents = await Registration.find({ 
        volunteerId: currentUser 
      }).populate('eventId');

      // Get event IDs that user is registered for
      const registeredEventIds = registeredEvents.map(reg => reg.eventId._id);

      // Fetch registered events within date range (only if there are registered events)
      if (registeredEventIds.length > 0) {
        const registeredQuery = {
          startDateTime: { $gte: new Date(start), $lte: new Date(end) },
          _id: { $in: registeredEventIds }
        };
        
        registeredEventsList = await Event.find(registeredQuery)
          .populate('organization')
          .populate('createdBy', 'name username')
          .populate('volunteers', 'name username');
      }

      // Get manually added calendar events
      const calendarEvents = await CalendarEvent.find({ 
        userId: currentUser 
      }).populate('eventId');

      // Get event IDs that are already in registered events
      const registeredEventIdsSet = new Set(registeredEventsList.map(event => event._id.toString()));

      // Filter calendar events to only include those not already in registered events
      additionalCalendarEvents = calendarEvents
        .filter(cal => cal.eventId && cal.eventId._id && !registeredEventIdsSet.has(cal.eventId._id.toString()))
        .map(cal => cal.eventId);

      // Combine registered events and additional calendar events
      const allEvents = [...registeredEventsList, ...additionalCalendarEvents];

      // Process recurring events
      const processedEvents = processRecurringEvents(allEvents, new Date(start), new Date(end));

      // Add status and creator info
      events = processedEvents
        .filter(event => event && event._id && event.createdBy)
        .map(event => {
          // Convert MongoDB document to plain object if needed
          const eventObj = event.toObject ? event.toObject() : event;
          
          const isCreator = eventObj.createdBy._id.toString() === currentUser.toString();
          const hasAttended = registeredEvents.find(reg => 
            reg.eventId._id.toString() === eventObj._id.toString()
          )?.hasAttended || false;
          const isManuallyAdded = !registeredEventIdsSet.has(eventObj._id.toString());

          let status = 'upcoming';
          const now = new Date();
          const eventEnd = new Date(eventObj.endDateTime);

          if (now > eventEnd) {
            if (isManuallyAdded) {
              status = 'missed'; // Manually added events show as missed if past
            } else {
              status = hasAttended ? 'attended' : 'missed';
            }
          }

          return {
            ...eventObj,
            isCreator,
            hasAttended,
            isManuallyAdded,
            status,
            isRecurring: eventObj.recurringEvent || eventObj.isRecurringInstance,
            recurringPattern: eventObj.recurringPattern || 
              (eventObj.recurringEvent ? `${eventObj.recurringType} - ${eventObj.recurringValue}` : null)
          };
        });
    } else {
      // For organizers: get events they're organizing
      const organizerQuery = {
        startDateTime: { $gte: new Date(start), $lte: new Date(end) },
        $or: [
          { createdBy: currentUser },
          { 'organizerTeam.user': currentUser }
        ]
      };

      const organizerEvents = await Event.find(organizerQuery)
        .populate('organization')
        .populate('createdBy', 'name username')
        .populate('organizerTeam.user', 'name username');

      // Get manually added calendar events
      const calendarEvents = await CalendarEvent.find({ 
        userId: currentUser 
      }).populate('eventId');

      // Get event IDs that are already in organizer events
      const organizerEventIds = new Set(organizerEvents.map(event => event._id.toString()));

      // Filter calendar events to only include those not already in organizer events
      additionalCalendarEvents = calendarEvents
        .filter(cal => cal.eventId && cal.eventId._id && !organizerEventIds.has(cal.eventId._id.toString()))
        .map(cal => cal.eventId);

      // Combine organizer events and additional calendar events
      const allEvents = [...organizerEvents, ...additionalCalendarEvents];

      // Process recurring events
      const processedEvents = processRecurringEvents(allEvents, new Date(start), new Date(end));

      // Add status and creator info
      events = processedEvents
        .filter(event => event && event._id) // Remove any undefined or null events
        .map(event => {
          // Convert MongoDB document to plain object if needed
          const eventObj = event.toObject ? event.toObject() : event;
          
          const isCreator = eventObj.createdBy._id.toString() === currentUser.toString();
          const organizerTeamMember = eventObj.organizerTeam?.find(team => 
            team.user._id.toString() === currentUser.toString()
          );
          const hasAttended = organizerTeamMember?.hasAttended || false;
          const isManuallyAdded = !organizerEventIds.has(eventObj._id.toString());
          const isOrganizerEvent = organizerEventIds.has(eventObj._id.toString());

          let status = 'upcoming';
          const now = new Date();
          const eventEnd = new Date(eventObj.endDateTime);

          if (now > eventEnd) {
            if (isCreator) {
              status = 'created';
            } else if (isManuallyAdded) {
              status = 'missed'; // Manually added events show as missed if past
            } else {
              status = hasAttended ? 'attended' : 'missed';
            }
          }

          return {
            ...eventObj,
            isCreator,
            hasAttended,
            isManuallyAdded,
            isOrganizerEvent, // New field to identify organizer events
            status,
            isRecurring: eventObj.recurringEvent || eventObj.isRecurringInstance,
            recurringPattern: eventObj.recurringPattern || 
              (eventObj.recurringEvent ? `${eventObj.recurringType} - ${eventObj.recurringValue}` : null)
          };
        });
    }

    // Final cleanup: ensure no undefined events are sent
    const cleanEvents = events.filter(event => event && event._id);

    res.status(200).json({
      success: true,
      data: cleanEvents
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch calendar events',
      error: error.message 
    });
  }
};

// Get event details for calendar
exports.getCalendarEventDetails = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Check if user exists and has valid _id
    if (!req.user || !req.user._id) {
      console.error('User not found or invalid in getCalendarEventDetails');
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    const currentUser = req.user._id;

    const event = await Event.findById(eventId)
      .populate('organization', 'name')
      .populate('createdBy', 'name username')
      .populate('organizerTeam.user', 'name username')
      .populate('volunteers', 'name username');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check registration status
    const registration = await Registration.findOne({
      eventId: event._id,
      volunteerId: currentUser
    });

    // Check if user is organizer
    const isOrganizer = event.createdBy._id.toString() === currentUser.toString() ||
                       (event.organizerTeam && event.organizerTeam.some(org => org.user && org.user._id.toString() === currentUser.toString()));

    const eventDetails = {
      ...event.toObject(),
      isRegistered: !!registration,
      isOrganizer,
      registrationDetails: registration
    };

    res.json(eventDetails);

  } catch (error) {
    console.error('Error fetching event details:', error);
    res.status(500).json({ message: 'Failed to fetch event details' });
  }
};

// Get calendar statistics
exports.getCalendarStats = async (req, res) => {
  try {
    const { start, end, role } = req.query;
    
    // Check if user exists and has valid _id
    if (!req.user || !req.user._id) {
      console.error('User not found or invalid in getCalendarStats');
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    const currentUser = req.user._id;

    const startDate = new Date(start);
    const endDate = new Date(end);

    let stats = {
      total: 0,
      upcoming: 0,
      attended: 0,
      missed: 0,
      created: 0
    };

    if (role === 'volunteer') {
      // Get registered events
      const registrations = await Registration.find({ 
        volunteerId: currentUser 
      }).populate('eventId');

      const eventIds = registrations.map(reg => reg.eventId._id);
      
      const events = await Event.find({
        _id: { $in: eventIds },
        startDateTime: { $gte: startDate, $lte: endDate }
      });

      const now = new Date();
      
      events.forEach(event => {
        stats.total++;
        const eventEnd = new Date(event.endDateTime);
        
        if (now > eventEnd) {
          stats.attended++;
        } else {
          stats.upcoming++;
        }
      });

    } else if (role === 'organizer') {
      // Get created events
      const events = await Event.find({
        createdBy: currentUser,
        startDateTime: { $gte: startDate, $lte: endDate }
      });

      const now = new Date();
      
      events.forEach(event => {
        stats.total++;
        stats.created++;
        
        const eventEnd = new Date(event.endDateTime);
        if (now > eventEnd) {
          stats.attended++;
        } else {
          stats.upcoming++;
        }
      });
    }

    res.json(stats);

  } catch (error) {
    console.error('Error fetching calendar stats:', error);
    res.status(500).json({ message: 'Failed to fetch calendar statistics' });
  }
}; 