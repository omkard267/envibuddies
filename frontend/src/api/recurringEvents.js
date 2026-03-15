import axiosInstance from './axiosInstance';

// Get all recurring series for the current user
export const getUserRecurringSeries = async () => {
  try {
    const response = await axiosInstance.get('/api/recurring-events/series');
    return response.data;
  } catch (error) {
    console.error('Error fetching recurring series:', error);
    throw error;
  }
};

// Get series details with all instances
export const getSeriesDetails = async (seriesId) => {
  try {
    const response = await axiosInstance.get(`/api/recurring-events/series/${seriesId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching series details:', error);
    throw error;
  }
};

// Create next instance in a series
export const createNextInstance = async (seriesId) => {
  try {
    const response = await axiosInstance.post(`/api/recurring-events/series/${seriesId}/next-instance`);
    return response.data;
  } catch (error) {
    console.error('Error creating next instance:', error);
    throw error;
  }
};

// Update series status
export const updateSeriesStatus = async (seriesId, status) => {
  try {
    const response = await axiosInstance.patch(`/api/recurring-events/series/${seriesId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('Error updating series status:', error);
    throw error;
  }
};

// Delete/cancel series
export const deleteSeries = async (seriesId) => {
  try {
    const response = await axiosInstance.delete(`/api/recurring-events/series/${seriesId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting series:', error);
    throw error;
  }
};

// Get series statistics
export const getSeriesStats = async (seriesId) => {
  try {
    const response = await axiosInstance.get(`/api/recurring-events/series/${seriesId}/stats`);
    return response.data;
  } catch (error) {
    console.error('Error fetching series stats:', error);
    throw error;
  }
};

// Complete event and create next instance if needed
export const completeEvent = async (eventId) => {
  try {
    const response = await axiosInstance.post(`/api/events/${eventId}/complete`);
    return response.data;
  } catch (error) {
    console.error('Error completing event:', error);
    throw error;
  }
}; 