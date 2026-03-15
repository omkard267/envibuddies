import axiosInstance from './axiosInstance';

// Sponsorship Intent API service
const sponsorshipIntentAPI = {
  // Submit sponsorship intent (public)
  submitIntent: async (intentData) => {
    try {
      const response = await axiosInstance.post('/api/sponsorship-intents/apply', intentData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get organization intents (authenticated - admin)
  getOrganizationIntents: async (organizationId, params = {}) => {
    try {
      const response = await axiosInstance.get(`/api/sponsorship-intents/organization/${organizationId}`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get user intents (authenticated)
  getUserIntents: async (params = {}) => {
    const response = await axiosInstance.get('/api/sponsorship-intents/user/me', { params });
    return response.data;
  },

  // Get intent by ID (authenticated)
  getIntentById: async (intentId) => {
    const response = await axiosInstance.get(`/api/sponsorship-intents/${intentId}`);
    return response.data;
  },

  // Delete intent (authenticated)
  deleteIntent: async (intentId) => {
    const response = await axiosInstance.delete(`/api/sponsorship-intents/${intentId}`);
    return response.data;
  },

  // Update intent (authenticated)
  updateIntent: async (intentId, data) => {
    try {
      const response = await axiosInstance.put(`/api/sponsorship-intents/${intentId}`, data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update intent');
    }
  },

  // Review intent (authenticated - admin)
  reviewIntent: async (intentId, reviewData) => {
    const response = await axiosInstance.patch(`/api/sponsorship-intents/${intentId}/review`, reviewData);
    return response.data;
  },

  // Add communication to intent (authenticated)
  addCommunication: async (intentId, communicationData) => {
    const response = await axiosInstance.post(`/api/sponsorship-intents/${intentId}/communication`, communicationData);
    return response.data;
  },

  // Cleanup orphaned intents (authenticated - admin)
  cleanupOrphanedIntents: async () => {
    const response = await axiosInstance.post('/api/sponsorship-intents/cleanup-orphaned');
    return response.data;
  },

  // Helper function to format intent data for API
  formatIntentData: (data) => {
    return {
      sponsor: {
        user: data.sponsor?.user || null,
        name: data.sponsor.name,
        email: data.sponsor.email,
        phone: data.sponsor.phone,
        sponsorType: data.sponsor.sponsorType,
        business: data.sponsor.sponsorType === 'business' ? data.sponsor.business : null,
        individual: data.sponsor.sponsorType === 'individual' ? data.sponsor.individual : null,
        location: data.sponsor.location
      },
      organization: data.organizationId, // Map organizationId to organization
      event: data.eventId || null,      // Map eventId to event
      sponsorship: {
        type: data.sponsorship.type,
        description: data.sponsorship.description,
        estimatedValue: Number(data.sponsorship.estimatedValue) || 0,
        currency: data.sponsorship.currency || 'INR',
        monetary: data.sponsorship.type === 'monetary' ? {
          ...data.sponsorship.monetary,
          amount: Number(data.sponsorship.monetary.amount) || 0
        } : null,
        goods: data.sponsorship.type === 'goods' ? data.sponsorship.goods : null,
        service: data.sponsorship.type === 'service' ? data.sponsorship.service : null,
        media: data.sponsorship.type === 'media' ? data.sponsorship.media : null
      },
      recognition: {
        recognitionLevel: data.recognition?.recognitionLevel && data.recognition.recognitionLevel.trim() !== '' ? data.recognition.recognitionLevel : undefined,
        specificBenefits: data.recognition?.specificBenefits || [],
        additionalRequests: data.recognition?.additionalRequests
      },
      additionalInfo: {
        howDidYouHear: data.additionalInfo?.howDidYouHear,
        previousExperience: data.additionalInfo?.previousExperience,
        timeline: data.additionalInfo?.timeline,
        specialRequirements: data.additionalInfo?.specialRequirements,
        questions: data.additionalInfo?.questions
      },
      files: data.files || {}
    };
  },

  // Helper function to format review data
  formatReviewData: (data) => {
    return {
      decision: data.decision, // 'approve', 'reject', 'request_changes', 'convert_to_sponsorship'
      reviewNotes: data.reviewNotes,
      adminNotes: data.adminNotes,
      convertToSponsorship: data.convertToSponsorship || false,
      sponsorshipUpdates: data.sponsorshipUpdates || null
    };
  },

  // Helper function to format communication data
  formatCommunicationData: (data) => {
    return {
      type: data.type, // 'email', 'phone', 'meeting', 'other'
      summary: data.summary,
      nextAction: data.nextAction
    };
  }
};

export default sponsorshipIntentAPI; 