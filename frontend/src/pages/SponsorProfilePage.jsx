import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sponsorAPI } from "../api";
import { SponsorProfileForm, SponsorProfileDisplay } from "../components/sponsor";
import { FullScreenLoader } from "../components/common/LoaderComponents";
import Navbar from "../components/layout/Navbar";
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from "../utils/avatarUtils";
import { 
  getSafeUserData, 
  getDisplayName, 
  getUsernameDisplay, 
  getSafeUserName,
  getSafeUserId,
  getSafeUserRole 
} from "../utils/safeUserUtils";
import {
  CurrencyDollarIcon,
  UserIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  SparklesIcon,
  CheckCircleIcon,
  BoltIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from "@heroicons/react/24/outline";
import { showAlert, showConfirm } from "../utils/notifications";

export default function SponsorProfilePage() {
  const [user, setUser] = useState(null);
  const [sponsorProfile, setSponsorProfile] = useState(null);
  const [showSponsorForm, setShowSponsorForm] = useState(false);
  const [sponsorLoading, setSponsorLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = JSON.parse(localStorage.getItem("user"));

    if (!token || !userData) {
      navigate("/login");
      return;
    }

    // Check if user data indicates a deleted account
    const safeUserData = getSafeUserData(userData);
    if (safeUserData.isDeleted) {
      // Redirect to login if user account is deleted
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
      return;
    }

    setUser(safeUserData);
    setLoading(false);

    // Always try to fetch sponsor profile - don't rely on the flag
    fetchSponsorProfile();
  }, [navigate]);

  // Fetch sponsor profile data
  const fetchSponsorProfile = async () => {
    setFetchLoading(true);
    setSponsorLoading(true);
    try {
      const sponsorResponse = await sponsorAPI.getMySponsorProfile();
      setSponsorProfile(sponsorResponse);
    } catch (error) {
      console.error('Error fetching sponsor profile:', error);
      setSponsorProfile(null);
    } finally {
      setFetchLoading(false);
      setSponsorLoading(false);
    }
  };

  // Load sponsor profile when component mounts or user changes
  useEffect(() => {
    if (user) {
      fetchSponsorProfile();
    }
  }, [user]);

  const handleCreateSponsor = () => {
    setShowSponsorForm(true);
  };

  const handleSponsorSuccess = async () => {
    setShowSponsorForm(false);
    setFormLoading(true);
    
    try {
      // Refresh sponsor profile data
      await fetchSponsorProfile();
      
      // Update user data in localStorage
      const userData = JSON.parse(localStorage.getItem("user"));
      userData.sponsor = { isSponsor: true };
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      
      // Dispatch custom event to notify other components about user data update
      window.dispatchEvent(new CustomEvent('userDataUpdated', {
        detail: { user: userData }
      }));
      
      showAlert.success('Sponsor profile saved successfully!');
    } catch (error) {
      console.error('Error refreshing sponsor profile:', error);
      showAlert.error('Profile saved but failed to refresh data. Please refresh the page.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSponsorCancel = () => {
    setShowSponsorForm(false);
  };

  const handleEditSponsor = () => {
    setShowSponsorForm(true);
  };

  const handleDeleteSponsor = async () => {
    // Use showConfirm for better UX
    showConfirm.action(
      'Are you sure you want to delete your sponsor profile? This action cannot be undone.',
      async () => {
        setDeleteLoading(true);
        try {
          // Check if sponsor profile exists before deleting
          if (!sponsorProfile || !sponsorProfile._id) {
            showAlert.error('No sponsor profile found to delete.');
            return;
          }
          
          await sponsorAPI.deleteSponsor(sponsorProfile._id);
          
          // Update user data in localStorage
          const userData = JSON.parse(localStorage.getItem("user"));
          userData.sponsor = { isSponsor: false };
          localStorage.setItem("user", JSON.stringify(userData));
          setUser(userData);
          
          // Dispatch custom event to notify other components about user data update
          window.dispatchEvent(new CustomEvent('userDataUpdated', {
            detail: { user: userData }
          }));
          
          setSponsorProfile(null);
          showAlert.success('Sponsor profile deleted successfully!');
        } catch (error) {
          console.error('Error deleting sponsor profile:', error);
          showAlert.error('Failed to delete sponsor profile. Please try again.');
        } finally {
          setDeleteLoading(false);
        }
      },
      {
        title: 'Delete Sponsor Profile',
        confirmText: 'Yes, Delete',
        cancelText: 'Cancel',
        type: 'danger'
      }
    );
  };

  if (loading) {
    return (
      <div className="h-screen overflow-y-auto bg-gray-50 pt-16 px-4">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen overflow-y-auto bg-gray-50 pt-16 px-4">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h1>
            <p className="text-gray-600">Please log in to view your sponsor profile.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-gray-50 pt-16 px-4">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden border-4 border-purple-200">
                  {getProfileImageUrl(user) ? (
                    <img
                      src={getProfileImageUrl(user)}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 flex items-center justify-center border-2 border-purple-200 shadow-sm">
                      <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">{getAvatarInitial(user)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-purple-900 to-blue-900 bg-clip-text text-transparent">Sponsor Profile</h1>
                <p className="text-lg text-purple-600 font-medium">{getSafeUserName(user)}</p>
                <p className="text-slate-600">{getUsernameDisplay(user)}</p>
                <p className="text-sm text-slate-500 capitalize">{getSafeUserRole(user) === "organizer" ? "Event Organizer" : "Volunteer"}</p>
              </div>
            </div>
            <div className="flex space-x-3">
              {user.sponsor?.isSponsor && sponsorProfile && (
                <button
                  onClick={handleEditSponsor}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Edit Sponsor Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sponsor Section */}
        {!showSponsorForm && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                  <svg className="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  Sponsor Capabilities
                </h2>
                <p className="text-gray-600">
                  {user.sponsor?.isSponsor 
                    ? 'You have sponsor capabilities enabled. Manage your sponsor profile below.'
                    : 'Upgrade your account to become a sponsor and support great causes.'
                  }
                </p>
              </div>
              {!user.sponsor?.isSponsor && (
                <button
                  onClick={handleCreateSponsor}
                  disabled={formLoading}
                  className={`px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg ${
                    formLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {formLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    'Become a Sponsor'
                  )}
                </button>
              )}
            </div>

            {sponsorLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading sponsor profile...</p>
              </div>
            ) : sponsorProfile ? (
              <div>
                <SponsorProfileDisplay
                  sponsor={sponsorProfile}
                  onEdit={handleEditSponsor}
                  onDelete={handleDeleteSponsor}
                  deleteLoading={deleteLoading}
                  editLoading={formLoading}
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Support Causes</h3>
                    <p className="text-sm text-gray-600">Contribute to events and organizations that make a difference</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Get Recognition</h3>
                    <p className="text-sm text-gray-600">Receive acknowledgment and visibility for your contributions</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Track Impact</h3>
                    <p className="text-sm text-gray-600">Monitor the impact of your sponsorships and contributions</p>
                  </div>
                </div>
                
                <div className="text-center mt-6">
                  <button
                    onClick={handleCreateSponsor}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    Create Sponsor Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sponsor Form Modal */}
        {showSponsorForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <SponsorProfileForm
                key={`sponsor-form-${sponsorProfile?._id || 'new'}`}
                onSuccess={handleSponsorSuccess}
                onCancel={handleSponsorCancel}
                existingSponsor={sponsorProfile}
              />
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Full Screen Loader for Delete Operation */}
      <FullScreenLoader
        isVisible={deleteLoading}
        message="Deleting sponsor profile and cleaning up files..."
        showProgress={false}
      />
    </div>
  );
} 