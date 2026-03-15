import axiosInstance from './axiosInstance';

// Add event to user's calendar
export const addEventToCalendar = async (eventId) => {
  try {
    const response = await axiosInstance.post(`/api/calendar/add/${eventId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Failed to add event to calendar' };
  }
};

// Remove event from user's calendar
export const removeEventFromCalendar = async (eventId) => {
  try {
    const response = await axiosInstance.delete(`/api/calendar/remove/${eventId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Failed to remove event from calendar' };
  }
};

// Check calendar status for an event
export const checkCalendarStatus = async (eventId) => {
  try {
    const response = await axiosInstance.get(`/api/calendar/status/${eventId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Failed to check calendar status' };
  }
};

// Get user's calendar events
export const getUserCalendarEvents = async (start, end) => {
  try {
    const params = {};
    if (start) params.start = start;
    if (end) params.end = end;
    
    const response = await axiosInstance.get('/api/calendar/user-events', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Failed to get calendar events' };
  }
}; 