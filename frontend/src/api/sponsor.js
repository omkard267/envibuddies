import axiosInstance from './axiosInstance';

// Sponsor API service
const sponsorAPI = {
  // Get all sponsors (public)
  getAllSponsors: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/api/sponsors', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch sponsors');
    }
  },

  // Search sponsors (public)
  searchSponsors: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/api/sponsors/search', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to search sponsors');
    }
  },

  // Get sponsor by user ID (public)
  getSponsorByUserId: async (userId) => {
    try {
      const response = await axiosInstance.get(`/api/sponsors/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch sponsor');
    }
  },

  // Create sponsor profile (protected)
  createSponsor: async (sponsorData) => {
    try {
      const formData = new FormData();
      
      // Add basic sponsor data
      formData.append('sponsorType', sponsorData.sponsorType);
      formData.append('contactPerson', sponsorData.contactPerson);
      formData.append('email', sponsorData.email);
      formData.append('phone', sponsorData.phone);
      
      // Add location data
      if (sponsorData.location) {
        formData.append('location.city', sponsorData.location.city || '');
        formData.append('location.state', sponsorData.location.state || '');
        formData.append('location.country', sponsorData.location.country || 'India');
      }
      
      // Add social links
      if (sponsorData.socialLinks) {
        Object.keys(sponsorData.socialLinks).forEach(key => {
          if (sponsorData.socialLinks[key]) {
            formData.append(`socialLinks.${key}`, sponsorData.socialLinks[key]);
          }
        });
      }
      
      // Add preferences
      if (sponsorData.preferences) {
        if (sponsorData.preferences.focusAreas) {
          sponsorData.preferences.focusAreas.forEach(area => {
            formData.append('preferences.focusAreas', area);
          });
        }
        if (sponsorData.preferences.preferredContributionType) {
          sponsorData.preferences.preferredContributionType.forEach(type => {
            formData.append('preferences.preferredContributionType', type);
          });
        }
        if (sponsorData.preferences.notes) {
          formData.append('preferences.notes', sponsorData.preferences.notes);
        }
      }
      
      // Add business or individual details
      if (sponsorData.sponsorType === 'business') {
        if (sponsorData.business) {
          formData.append('business.name', sponsorData.business.name || '');
          formData.append('business.industry', sponsorData.business.industry || '');
          formData.append('business.website', sponsorData.business.website || '');
          formData.append('business.description', sponsorData.business.description || '');
          formData.append('business.yearEstablished', sponsorData.business.yearEstablished || '');
          formData.append('business.employeeCount', sponsorData.business.employeeCount || '');
        }
        
        // Add business files
        if (sponsorData.files?.logo) {
          formData.append('logo', sponsorData.files.logo);
        }
        if (sponsorData.files?.gstCertificate) {
          formData.append('gstCertificate', sponsorData.files.gstCertificate);
        }
        if (sponsorData.files?.panCard) {
          formData.append('panCard', sponsorData.files.panCard);
        }
        if (sponsorData.files?.companyRegistration) {
          formData.append('companyRegistration', sponsorData.files.companyRegistration);
        }
      } else if (sponsorData.sponsorType === 'individual') {
        if (sponsorData.individual) {
          formData.append('individual.profession', sponsorData.individual.profession || '');
          formData.append('individual.organization', sponsorData.individual.organization || '');
          formData.append('individual.designation', sponsorData.individual.designation || '');
          formData.append('individual.description', sponsorData.individual.description || '');
        }
      }

      const response = await axiosInstance.post('/api/sponsors', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create sponsor profile');
    }
  },

  // Get current user's sponsor profile (protected)
  getMySponsorProfile: async () => {
    try {
      const response = await axiosInstance.get('/api/sponsors/profile/me');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch sponsor profile');
    }
  },

  // Update sponsor profile (protected)
  updateSponsor: async (sponsorId, sponsorData) => {
    try {
      const formData = new FormData();
      
      // Add basic sponsor data
      formData.append('contactPerson', sponsorData.contactPerson);
      formData.append('email', sponsorData.email);
      formData.append('phone', sponsorData.phone);
      
      // Add location data
      if (sponsorData.location) {
        formData.append('location.city', sponsorData.location.city || '');
        formData.append('location.state', sponsorData.location.state || '');
        formData.append('location.country', sponsorData.location.country || 'India');
      }
      
      // Add social links
      if (sponsorData.socialLinks) {
        Object.keys(sponsorData.socialLinks).forEach(key => {
          if (sponsorData.socialLinks[key]) {
            formData.append(`socialLinks.${key}`, sponsorData.socialLinks[key]);
          }
        });
      }
      
      // Add preferences
      if (sponsorData.preferences) {
        if (sponsorData.preferences.focusAreas) {
          sponsorData.preferences.focusAreas.forEach(area => {
            formData.append('preferences.focusAreas', area);
          });
        }
        if (sponsorData.preferences.preferredContributionType) {
          sponsorData.preferences.preferredContributionType.forEach(type => {
            formData.append('preferences.preferredContributionType', type);
          });
        }
        if (sponsorData.preferences.notes) {
          formData.append('preferences.notes', sponsorData.preferences.notes);
        }
      }
      
      // Add business or individual details
      if (sponsorData.business) {
        formData.append('business.name', sponsorData.business.name || '');
        formData.append('business.industry', sponsorData.business.industry || '');
        formData.append('business.website', sponsorData.business.website || '');
        formData.append('business.description', sponsorData.business.description || '');
        formData.append('business.yearEstablished', sponsorData.business.yearEstablished || '');
        formData.append('business.employeeCount', sponsorData.business.employeeCount || '');
      }
      
      if (sponsorData.individual) {
        formData.append('individual.profession', sponsorData.individual.profession || '');
        formData.append('individual.organization', sponsorData.individual.organization || '');
        formData.append('individual.designation', sponsorData.individual.designation || '');
        formData.append('individual.description', sponsorData.individual.description || '');
      }
      
      // Add files if provided
      if (sponsorData.files?.logo) {
        formData.append('logo', sponsorData.files.logo);
      }
      if (sponsorData.files?.gstCertificate) {
        formData.append('gstCertificate', sponsorData.files.gstCertificate);
      }
      if (sponsorData.files?.panCard) {
        formData.append('panCard', sponsorData.files.panCard);
      }
      if (sponsorData.files?.companyRegistration) {
        formData.append('companyRegistration', sponsorData.files.companyRegistration);
      }

      // Add removedFiles information
      if (sponsorData.removedFiles) {
        Object.keys(sponsorData.removedFiles).forEach(key => {
          if (sponsorData.removedFiles[key]) {
            formData.append(`removedFiles[${key}]`, 'true');
          }
        });
      }

      // Add existingFiles information for reference
      if (sponsorData.existingFiles) {
        Object.keys(sponsorData.existingFiles).forEach(key => {
          if (sponsorData.existingFiles[key]) {
            formData.append(`existingFiles[${key}][url]`, sponsorData.existingFiles[key].url || '');
            formData.append(`existingFiles[${key}][publicId]`, sponsorData.existingFiles[key].publicId || '');
            formData.append(`existingFiles[${key}][filename]`, sponsorData.existingFiles[key].filename || '');
          }
        });
      }

      const response = await axiosInstance.put(`/api/sponsors/${sponsorId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update sponsor profile');
    }
  },

  // Delete sponsor profile (protected)
  deleteSponsor: async (sponsorId) => {
    try {
      const response = await axiosInstance.delete(`/api/sponsors/${sponsorId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete sponsor profile');
    }
  },

  // Get sponsor statistics (protected)
  getSponsorStats: async () => {
    try {
      const response = await axiosInstance.get('/api/sponsors/stats/me');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch sponsor statistics');
    }
  },

  // Verify sponsor (admin only)
  verifySponsor: async (sponsorId, verificationData) => {
    try {
      const response = await axiosInstance.patch(`/api/sponsors/${sponsorId}/verify`, verificationData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to verify sponsor');
    }
  },

  // Check for duplicate sponsor profiles (debug utility)
  checkDuplicateSponsors: async () => {
    try {
      const response = await axiosInstance.get('/api/sponsors/debug/check-duplicates');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to check duplicate sponsors');
    }
  },
};

export default sponsorAPI; 