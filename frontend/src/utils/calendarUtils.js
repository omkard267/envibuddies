import { format, isAfter, isBefore, isEqual, addWeeks, addMonths, startOfWeek, endOfWeek } from 'date-fns';
import { addEventToCalendar as addEventToWebsiteCalendarAPI, removeEventFromCalendar, checkCalendarStatus } from '../api/calendar';
import calendarEventEmitter from './calendarEventEmitter';
import { showAlert } from './notifications';

// Event status determination
export const getEventStatus = (event, userId) => {
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
export const generateRecurringEvents = (baseEvent, occurrences = 12) => {
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

// Process recurring events for frontend display
export const processRecurringEvents = (events, startDate, endDate) => {
  const processedEvents = [];
  
  events.forEach(event => {
    // Add the original event
    processedEvents.push(event);
    
    // If it's a recurring event, generate instances within the date range
    if (event.recurringEvent && event.recurringType && event.recurringValue) {
      const recurringInstances = generateRecurringInstances(event, startDate, endDate);
      processedEvents.push(...recurringInstances);
    }
  });
  
  return processedEvents;
};

// Generate recurring instances within a specific date range
export const generateRecurringInstances = (baseEvent, startDate, endDate) => {
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
      
      instances.push({
        ...baseEvent,
        _id: `${baseEvent._id}_recurring_${instanceCount}`,
        startDateTime: currentDate.toISOString(),
        endDateTime: newEndDate.toISOString(),
        isRecurringInstance: true,
        originalEventId: baseEvent._id,
        recurringIndex: instanceCount,
        recurringPattern: `${baseEvent.recurringType} - ${baseEvent.recurringValue}`,
        isRecurring: true
      });
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
export const formatEventForCalendar = (event, role, userId) => {
  const status = getEventStatus(event, userId);
  const isRegistered = event.volunteers && event.volunteers.includes(userId);
  const isOrganizer = event.createdBy === userId;
  const isRecurring = event.recurringEvent || event.isRecurringInstance;

  return {
    id: event._id,
    title: event.title,
    start: event.startDateTime,
    end: event.endDateTime,
    color: getEventColor(status, role, isOrganizer, isRecurring),
    extendedProps: {
      eventType: event.eventType,
      status,
      isRegistered,
      isOrganizer,
      location: event.location,
      description: event.description,
      isRecurring,
      recurringPattern: event.recurringPattern || 
        (event.recurringEvent ? `${event.recurringType} - ${event.recurringValue}` : null),
      isRecurringInstance: event.isRecurringInstance || false,
      recurringIndex: event.recurringIndex
    }
  };
};

// Get event color based on status and role
export const getEventColor = (status, role, isOrganizer, isRecurring = false) => {
  const colors = {
    upcoming: '#2196F3',    // Blue
    attended: '#4CAF50',    // Green
    missed: '#F44336',      // Red
    created: '#FF9800',     // Orange (for organizers)
    recurring: '#9C27B0'    // Purple
  };

  // Recurring events get priority color
  if (isRecurring) {
    return colors.recurring;
  }

  if (role === 'organizer' && isOrganizer) {
    return colors.created;
  }

  return colors[status] || colors.upcoming;
};

// Get week range for API calls
export const getWeekRange = (date) => {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday start
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return { start, end };
};

// Format date for display
export const formatEventDate = (date) => {
  return format(new Date(date), 'EEEE, MMMM d, yyyy');
};

// Format time for display
export const formatEventTime = (date) => {
  return format(new Date(date), 'h:mm a');
};

// Check if event is today
export const isEventToday = (eventDate) => {
  const today = new Date();
  const eventDateObj = new Date(eventDate);
  return isEqual(today, eventDateObj);
};

// Check if event is in the future
export const isEventUpcoming = (eventDate) => {
  const now = new Date();
  const eventDateObj = new Date(eventDate);
  return isAfter(eventDateObj, now);
};

// Check if event is in the past
export const isEventPast = (eventDate) => {
  const now = new Date();
  const eventDateObj = new Date(eventDate);
  return isBefore(eventDateObj, now);
};

// Calendar integration utilities
export const addEventToCalendar = (event) => {
  try {
    // Format dates for calendar
    const startDate = new Date(event.startDateTime);
    const endDate = new Date(event.endDateTime);
    
    // Format dates for calendar (YYYYMMDDTHHMMSSZ format)
    const formatDateForCalendar = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    };
    
    // Create calendar event data
    const calendarData = {
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      startTime: formatDateForCalendar(startDate),
      endTime: formatDateForCalendar(endDate),
      allDay: false
    };
    
    // Create calendar URL for different platforms
    const createCalendarUrl = () => {
      const baseUrl = 'https://calendar.google.com/calendar/render';
      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: calendarData.title,
        dates: `${calendarData.startTime}/${calendarData.endTime}`,
        details: calendarData.description,
        location: calendarData.location,
        sf: true,
        output: 'xml'
      });
      
      return `${baseUrl}?${params.toString()}`;
    };
    
    // Try to detect platform and provide appropriate option
    const userAgent = navigator.userAgent.toLowerCase();
    let calendarUrl = '';
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      // iOS - use webcal format
      calendarUrl = createCalendarUrl();
    } else if (userAgent.includes('android')) {
      // Android - use Google Calendar
      calendarUrl = createCalendarUrl();
    } else {
      // Desktop - use Google Calendar
      calendarUrl = createCalendarUrl();
    }
    
    // Open calendar in new tab
    const newWindow = window.open(calendarUrl, '_blank');
    
    if (newWindow) {
      return { success: true, message: 'Calendar opened successfully!' };
    } else {
      return { success: false, message: 'Failed to open calendar (popup may be blocked)' };
    }
    
  } catch (error) {
    console.error('Error adding event to calendar:', error);
    return { success: false, message: 'Failed to add event to calendar' };
  }
};

// Alternative method using native calendar API (if supported)
export const addEventToNativeCalendar = async (event) => {
  try {
    // Check if native calendar API is available
    if ('calendar' in navigator && navigator.calendar) {
      const calendarEvent = {
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        startTime: new Date(event.startDateTime),
        endTime: new Date(event.endDateTime),
        allDay: false
      };
      
      await navigator.calendar.addEvent(calendarEvent);
      return { success: true, message: 'Event added to calendar successfully!' };
    } else {
      // Fallback to web calendar
      return addEventToCalendar(event);
    }
  } catch (error) {
    console.error('Error with native calendar API:', error);
    // Fallback to web calendar
    return addEventToCalendar(event);
  }
};

// Download calendar file (.ics format)
export const downloadCalendarFile = (event) => {
  try {
    const startDate = new Date(event.startDateTime);
    const endDate = new Date(event.endDateTime);
    
    // Format date for ICS file
    const formatDateForICS = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    };
    
    // Create ICS content
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EnviBuddies//Event Calendar//EN',
      'BEGIN:VEVENT',
      `UID:${event._id}@mumbaimitra.com`,
      `DTSTART:${formatDateForICS(startDate)}`,
      `DTEND:${formatDateForICS(endDate)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description || ''}`,
      `LOCATION:${event.location || ''}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    
    // Create and download file
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return { success: true, message: 'Calendar file downloaded successfully!' };
  } catch (error) {
    console.error('Error downloading calendar file:', error);
    return { success: false, message: 'Failed to download calendar file' };
  }
};

// Add event to website calendar
export const addToWebsiteCalendar = async (eventId) => {
  try {
    const result = await addEventToWebsiteCalendarAPI(eventId);
    if (result.success) {
      // Notify calendar to refresh
      calendarEventEmitter.notifyCalendarRefresh();
      calendarEventEmitter.notifyEventChange(eventId, 'added');
      // Show success notification
      showAlert.success('Event added to calendar successfully!');
    } else {
      showAlert.error(result.message || 'Failed to add event to calendar');
    }
    return result;
  } catch (error) {
    console.error('Error adding to website calendar:', error);
    showAlert.error('Failed to add event to calendar');
    return { success: false, message: error.message || 'Failed to add to website calendar' };
  }
};

// Remove event from website calendar
export const removeFromWebsiteCalendar = async (eventId) => {
  try {
    const result = await removeEventFromCalendar(eventId);
    if (result.success) {
      // Notify calendar to refresh
      calendarEventEmitter.notifyCalendarRefresh();
      calendarEventEmitter.notifyEventChange(eventId, 'removed');
      // Show success notification
      showAlert.success('Event removed from calendar successfully!');
    } else {
      showAlert.error(result.message || 'Failed to remove event from calendar');
    }
    return result;
  } catch (error) {
    console.error('Error removing from website calendar:', error);
    showAlert.error('Failed to remove event from calendar');
    return { success: false, message: error.message || 'Failed to remove from website calendar' };
  }
};

// Check if event is in website calendar
export const checkWebsiteCalendarStatus = async (eventId) => {
  try {
    const result = await checkCalendarStatus(eventId);
    return result;
  } catch (error) {
    console.error('Error checking website calendar status:', error);
    return { success: false, message: error.message || 'Failed to check calendar status' };
  }
};

// Helper function to determine if an event can be added to calendar
export const canAddToWebsiteCalendar = (event, user) => {
  if (!event || !user) return false;
  
  // Check if user is the creator
  const isCreator = event.createdBy === user._id || event.createdBy?._id === user._id;
  
  // Check if user is part of organizer team
  const isOrganizerTeamMember = event.organizerTeam && event.organizerTeam.some(team => 
    team.user === user._id || team.user?._id === user._id
  );
  
  // Check if user is registered (for volunteers)
  const isRegistered = event.volunteers && event.volunteers.some(vol => 
    vol === user._id || vol?._id === user._id
  );
  
  // Can add if not creator, not organizer team member, and not registered
  return !isCreator && !isOrganizerTeamMember && !isRegistered;
}; 