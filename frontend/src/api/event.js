import axiosInstance from './axiosInstance';

// Join an event as an organizer
export const joinAsOrganizer = async (eventId) => {
  const res = await axiosInstance.post(`/api/events/${eventId}/join-organizer`);
  return res.data;
};

// Get the organizer team for an event
export const getOrganizerTeam = async (eventId) => {
  const res = await axiosInstance.get(`/api/events/${eventId}/organizer-team`);
  return res.data.organizerTeam;
};

// Get the full organizer team for an event (with hasAttended)
export const getFullOrganizerTeam = async (eventId) => {
  const res = await axiosInstance.get(`/api/events/${eventId}/organizer-team?full=1`);
  return res.data.organizerTeam;
};

// Update attendance for an organizer
export const updateOrganizerAttendance = async (eventId, organizerId, hasAttended) => {
  const res = await axiosInstance.patch(`/api/events/${eventId}/organizer/${organizerId}/attendance`, { hasAttended });
  return res.data;
};
// Get events by organization ID
export const getEventsByOrganization = async (orgId) => {
  const res = await axiosInstance.get(`/api/events/organization/${orgId}`);
  return res.data;
};

// Get event count for statistics
export const getEventCount = async () => {
  try {
    const response = await axiosInstance.get('/api/events/count');
    return response.data;
  } catch (error) {
    console.error('Error fetching event count:', error);
    return { eventCount: 0 };
  }
}; 