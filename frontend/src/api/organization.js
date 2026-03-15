// src/api/organization.js
import axiosInstance from './axiosInstance';

export const registerOrganization = (data) =>
  axiosInstance.post('/api/organizations/register', data);

export const getMyOrganization = () =>
  axiosInstance.get('/api/organizations/my');

export const getAllOrganizations = () =>
  axiosInstance.get('/api/organizations');

export const getOrganizationById = (id) =>
  axiosInstance.get(`/api/organizations/${id}`);

export const requestToJoinOrganization = (id) =>
  axiosInstance.post(`/api/organizations/${id}/join`);

export const getOrganizationTeam = (id) =>
  axiosInstance.get(`/api/organizations/${id}/team`);

export const getApprovedOrganizations = () =>
  axiosInstance.get('/api/organizations/approved');

export const approveTeamMember = (orgId, userId) =>
  axiosInstance.patch(`/api/organizations/${orgId}/approve/${userId}`);

export const rejectTeamMember = (orgId, userId) =>
  axiosInstance.delete(`/api/organizations/${orgId}/reject/${userId}`);

// Helper: Fetch only approved organizers from the team
export const getOrganizationOrganizers = async (id) => {
  const res = await axiosInstance.get(`/api/organizations/${id}/team`);
  // Only approved organizers
  return res.data.filter(
    (member) => member.status === 'approved' && member.userId.role === 'organizer'
  );
};

// Fetch user by ID (for organizer profile)
export const getUserById = (id) => {
  return axiosInstance.get(`/api/users/${id}`);
}

export const updateOrganization = (id, data) => {
  return axiosInstance.put(`/api/organizations/${id}`, data);
} 

// Get organization count for statistics
export const getOrganizationCount = async () => {
  try {
    const response = await axiosInstance.get('/api/organizations/count');
    return response.data;
  } catch (error) {
    console.error('Error fetching organization count:', error);
    return { organizationCount: 0 };
  }
};
