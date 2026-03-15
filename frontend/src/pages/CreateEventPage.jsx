import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import EventCreationWrapper from '../components/event/EventCreationWrapper';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { 
  BuildingOfficeIcon, 
  PlusIcon, 
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";

export default function CreateEventPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [showEventForm, setShowEventForm] = useState(false);

  // Get organization from URL parameter
  const orgFromUrl = searchParams.get('org');

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get('/api/organizations/approved');
        
        // Handle new API response format
        const orgs = response.data.data || response.data;
        setOrganizations(orgs);
        
        // If org is specified in URL and exists in user's organizations, use it
        if (orgFromUrl && orgs.find(org => org._id === orgFromUrl)) {
          setSelectedOrgId(orgFromUrl);
          setShowEventForm(true);
        } else if (orgs.length > 0) {
          // Otherwise, select the first organization
          setSelectedOrgId(orgs[0]._id);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
        // Handle 404 or other errors gracefully
        setOrganizations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, [orgFromUrl]);

  const handleOrganizationChange = (orgId) => {
    setSelectedOrgId(orgId);
  };

  const handleClose = () => {
    setShowEventForm(false);
    navigate('/organizer/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
        <Navbar />
        <div className="pt-24 px-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-lg text-gray-600">Loading organizations...</span>
          </div>
        </div>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
        <Navbar />
        <div className="pt-24 px-6 max-w-7xl mx-auto">
          <div className="text-center py-16">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 max-w-md mx-auto">
              <div className="text-6xl mb-6">🏢</div>
              <h1 className="text-3xl font-bold text-gray-800 mb-4">Create Event</h1>
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
                  <h3 className="font-semibold text-red-700">Organization Required</h3>
                </div>
                <p className="text-red-600 mb-4">
                  You need to be a member of an organization to create events.
                </p>
                <button
                  onClick={() => navigate('/join-organization')}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
                >
                  Join Organization
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <Navbar />
      
      <div className="pt-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Create Event</h1>
          <p className="text-gray-600">Set up your next amazing event</p>
        </div>

        {!showEventForm ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 max-w-lg mx-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BuildingOfficeIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Select Organization</h2>
              <p className="text-gray-600">
                Choose the organization for which you want to create the event.
              </p>
            </div>
            
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Organization
              </label>
              <select
                value={selectedOrgId}
                onChange={(e) => handleOrganizationChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all duration-300"
              >
                {organizations.map(org => (
                  <option key={org._id} value={org._id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => navigate('/organizer/dashboard')}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-200 transition-all duration-300 font-semibold border border-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowEventForm(true)}
                disabled={!selectedOrgId}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold disabled:transform-none disabled:shadow-lg"
              >
                Continue
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <CheckCircleIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Creating Event for: {organizations.find(org => org._id === selectedOrgId)?.name}
                  </h2>
                  <p className="text-gray-600 text-sm">Fill in the event details below</p>
                </div>
              </div>
              <button
                onClick={() => setShowEventForm(false)}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-all duration-300 font-semibold"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                Back to Selection
              </button>
            </div>
            
            <EventCreationWrapper
              selectedOrgId={selectedOrgId}
              organizationOptions={organizations}
              onClose={handleClose}
              onEventCreated={(eventData) => {
                showAlert.success("🎉 Event created successfully!");
                // Navigate to the organizer dashboard to see the new event
                navigate('/organizer/dashboard');
              }}
            />
          </div>
        )}
      </div>

    </div>
  );
} 