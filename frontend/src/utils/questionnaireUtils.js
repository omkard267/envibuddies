import axiosInstance from '../api/axiosInstance';

/**
 * Utility functions for volunteer questionnaire management
 */

/**
 * Check if a volunteer has completed the questionnaire for a specific event
 * @param {string} eventId - The event ID
 * @returns {Promise<boolean>} - Whether the questionnaire is completed
 */
export const checkQuestionnaireStatus = async (eventId) => {
  try {
    const response = await axiosInstance.get(`/api/registrations/event/${eventId}/my-registration`);
    return response.data.questionnaireCompleted || false;
  } catch (error) {
    console.error('Error checking questionnaire status:', error);
    return false;
  }
};

/**
 * Submit volunteer questionnaire for an event
 * @param {string} eventId - The event ID
 * @param {Object} answers - The questionnaire answers
 * @returns {Promise<Object>} - The submission response
 */
export const submitVolunteerQuestionnaire = async (eventId, answers) => {
  try {
    const response = await axiosInstance.post(`/api/registrations/event/${eventId}/questionnaire`, {
      answers
    });
    return {
      success: true,
      data: response.data,
      message: 'Questionnaire submitted successfully! Thank you for your feedback.'
    };
  } catch (error) {
    console.error('Error submitting questionnaire:', error);
    const errorMessage = error.response?.data?.message || 'Failed to submit questionnaire. Please try again.';
    
    return {
      success: false,
      error: error,
      message: errorMessage,
      alreadySubmitted: error.response?.status === 400 && errorMessage.includes('already submitted')
    };
  }
};

/**
 * Check if an event is past its end date
 * @param {string} endDateTime - The event end date time
 * @returns {boolean} - Whether the event has ended
 */
export const isEventPast = (endDateTime) => {
  return new Date() > new Date(endDateTime);
};

/**
 * Get registration details with questionnaire status
 * @param {string} eventId - The event ID
 * @returns {Promise<Object>} - Registration details and questionnaire status
 */
export const getRegistrationWithQuestionnaireStatus = async (eventId) => {
  try {
    const response = await axiosInstance.get(`/api/registrations/event/${eventId}/my-registration`);
    return {
      success: true,
      registration: response.data.registration,
      questionnaireCompleted: response.data.questionnaireCompleted || false
    };
  } catch (error) {
    console.error('Error fetching registration details:', error);
    return {
      success: false,
      registration: null,
      questionnaireCompleted: false
    };
  }
};
