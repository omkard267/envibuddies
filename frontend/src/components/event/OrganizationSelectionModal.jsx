import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { showAlert } from '../../utils/notifications';
import { 
  BuildingOfficeIcon, 
  PlusIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const OrganizationSelectionModal = ({ isOpen, onClose, onOrganizationSelected }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState('');

  // Fetch user's organizations
  useEffect(() => {
    if (!isOpen) return;
    
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
  }, [isOpen]);

  const handleCreateEvent = () => {
    if (!selectedOrg) {
      showAlert.warning('Please select an organization first');
      return;
    }
    
    // Call the callback with the selected organization
    onOrganizationSelected(selectedOrg);
    onClose();
  };

  const handleJoinOrganization = () => {
    onClose();
    navigate('/join-organization');
  };

  const handleCreateOrganization = () => {
    onClose();
    navigate('/register-organization');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">Create New Event</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:text-red-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loadingOrgs ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading organizations...</p>
            </div>
          ) : organizations.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-gradient-to-r from-red-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Organization Required</h3>
              <p className="text-slate-600 mb-6">
                You need to be a member of an organization to create events.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleJoinOrganization}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-medium"
                >
                  Join Organization
                </button>
                <button
                  onClick={handleCreateOrganization}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3 rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 font-medium"
                >
                  Create Organization
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <BuildingOfficeIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Select Organization</h3>
                    <p className="text-sm text-slate-600">Choose the organization for your event</p>
                  </div>
                </div>
                
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Organization
                </label>
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-300"
                >
                  {organizations.map(org => (
                    <option key={org._id} value={org._id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-slate-500 mt-2">
                  Choose the organization for which you want to create the event.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-slate-200 text-slate-700 py-3 px-4 rounded-xl hover:bg-slate-300 transition-all duration-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEvent}
                  disabled={loading || !selectedOrg}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all duration-300 font-medium"
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

export default OrganizationSelectionModal;
