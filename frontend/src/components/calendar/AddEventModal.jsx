import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { showAlert } from '../../utils/notifications';

const AddEventModal = ({ onClose, onEventAdded }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState('');

  // Fetch user's organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoadingOrgs(true);
        const response = await axiosInstance.get('/api/organizations/approved');
        // Handle new API response format
        const orgs = response.data.data || response.data;
        setOrganizations(orgs);
        if (orgs.length > 0) {
          setSelectedOrg(orgs[0]._id); // Select first organization by default
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
        // Handle 404 or other errors gracefully
        setOrganizations([]);
      } finally {
        setLoadingOrgs(false);
      }
    };

    fetchOrganizations();
  }, []);

  const handleCreateEvent = () => {
    if (!selectedOrg) {
      showAlert.warning('Please select an organization first');
      return;
    }
    
    // Navigate to the new create event page with organization pre-selected
    navigate(`/create-event?org=${selectedOrg}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Create New Event</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loadingOrgs ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading organizations...</p>
            </div>
          ) : organizations.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-red-600 mb-4">
                You need to be a member of an organization to create events.
              </p>
              <button
                onClick={() => {
                  onClose();
                  navigate('/join-organization');
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Join Organization
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Organization
                </label>
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {organizations.map(org => (
                    <option key={org._id} value={org._id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-2">
                  Choose the organization for which you want to create the event.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEvent}
                  disabled={loading || !selectedOrg}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddEventModal; 