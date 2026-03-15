import axiosInstance from './axiosInstance';

// Sponsorship API service
const sponsorshipAPI = {
  // Get organization sponsorships (public)
  getOrganizationSponsorships: async (organizationId, params = {}) => {
    try {
      const response = await axiosInstance.get(`/api/sponsorships/organization/${organizationId}`, { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch organization sponsorships');
    }
  },

  // Get event sponsorships (public)
  getEventSponsorships: async (eventId, params = {}) => {
    try {
      const response = await axiosInstance.get(`/api/sponsorships/event/${eventId}`, { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch event sponsorships');
    }
  },

  // Get sponsorship statistics (public)
  getSponsorshipStats: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/api/sponsorships/stats', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch sponsorship statistics');
    }
  },

  // Create sponsorship (protected)
  createSponsorship: async (sponsorshipData) => {
    try {
      const response = await axiosInstance.post('/api/sponsorships', sponsorshipData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create sponsorship');
    }
  },

  // Get sponsorship by ID (protected)
  getSponsorshipById: async (sponsorshipId) => {
    try {
      const response = await axiosInstance.get(`/api/sponsorships/${sponsorshipId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch sponsorship');
    }
  },

  // Update sponsorship (protected)
  updateSponsorship: async (sponsorshipId, sponsorshipData) => {
    try {
      const response = await axiosInstance.put(`/api/sponsorships/${sponsorshipId}`, sponsorshipData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update sponsorship');
    }
  },

  // Delete sponsorship (protected)
  deleteSponsorship: async (sponsorshipId) => {
    try {
      const response = await axiosInstance.delete(`/api/sponsorships/${sponsorshipId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete sponsorship');
    }
  },

  // Approve sponsorship (protected)
  approveSponsorship: async (sponsorshipId, reviewData = {}) => {
    try {
      const response = await axiosInstance.patch(`/api/sponsorships/${sponsorshipId}/approve`, reviewData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to approve sponsorship');
    }
  },

  // Reject sponsorship (protected)
  rejectSponsorship: async (sponsorshipId, reviewData = {}) => {
    try {
      const response = await axiosInstance.patch(`/api/sponsorships/${sponsorshipId}/reject`, reviewData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to reject sponsorship');
    }
  },

  // Activate sponsorship (protected)
  activateSponsorship: async (sponsorshipId, activationData = {}) => {
    try {
      const response = await axiosInstance.patch(`/api/sponsorships/${sponsorshipId}/activate`, activationData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to activate sponsorship');
    }
  },

  // Complete sponsorship (protected)
  completeSponsorship: async (sponsorshipId, completionData = {}) => {
    try {
      const response = await axiosInstance.patch(`/api/sponsorships/${sponsorshipId}/complete`, completionData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to complete sponsorship');
    }
  },

  // Helper function to format sponsorship data for API
  formatSponsorshipData: (data) => {
    return {
      sponsorId: data.sponsorId,
      organizationId: data.organizationId,
      eventId: data.eventId || null,
      sponsorshipType: data.sponsorshipType, // 'package' or 'custom'
      package: data.sponsorshipType === 'package' ? {
        name: data.package.name,
        tier: data.package.tier,
        predefinedBenefits: data.package.predefinedBenefits
      } : null,
      customContribution: data.sponsorshipType === 'custom' ? {
        description: data.customContribution.description,
        estimatedValue: data.customContribution.estimatedValue,
        customBenefits: data.customContribution.customBenefits
      } : null,
      contribution: {
        type: data.contribution.type, // 'monetary', 'goods', 'service', 'media'
        description: data.contribution.description,
        value: data.contribution.value,
        currency: data.contribution.currency || 'INR'
      },
      period: {
        startDate: data.period?.startDate,
        endDate: data.period?.endDate,
        isRecurring: data.period?.isRecurring || false,
        recurringFrequency: data.period?.recurringFrequency
      },
      recognition: {
        logoDisplayed: data.recognition?.logoDisplayed || true,
        socialMediaMentions: data.recognition?.socialMediaMentions || true,
        websiteAcknowledgement: data.recognition?.websiteAcknowledgement || true,
        eventAcknowledgement: data.recognition?.eventAcknowledgement || true,
        certificateInclusion: data.recognition?.certificateInclusion || false
      }
    };
  },

  // Helper function to format review data
  formatReviewData: (data) => {
    return {
      reviewNotes: data.reviewNotes,
      adminNotes: data.adminNotes
    };
  },

  // Helper function to format activation data
  formatActivationData: (data) => {
    return {
      startDate: data.startDate || new Date().toISOString()
    };
  },

  // Helper function to format completion data
  formatCompletionData: (data) => {
    return {
      endDate: data.endDate || new Date().toISOString(),
      impact: {
        volunteersSupported: data.impact?.volunteersSupported || 0,
        eventsSupported: data.impact?.eventsSupported || 0,
        totalValue: data.impact?.totalValue || 0,
        beneficiariesReached: data.impact?.beneficiariesReached || 0,
        environmentalImpact: data.impact?.environmentalImpact,
        socialImpact: data.impact?.socialImpact
      }
    };
  }
};

export default sponsorshipAPI; 