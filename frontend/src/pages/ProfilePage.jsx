import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { updateProfile, deleteAccount } from "../api/auth";
import { getMyOrganization } from "../api/organization";
import Navbar from "../components/layout/Navbar";
import { formatDate } from "../utils/dateUtils";
import { 
  getSafeUserData, 
  getDisplayName, 
  getUsernameDisplay, 
  getSafeUserName,
  getSafeUserId,
  getSafeUserRole 
} from "../utils/safeUserUtils";
import {
  UserIcon,
  CameraIcon,
  IdentificationIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  UsersIcon,
  GlobeAltIcon,
  LockClosedIcon,
  KeyIcon
} from "@heroicons/react/24/outline";
import { showAlert, showConfirm } from "../utils/notifications";
import { getProfileImageUrl, getGovtIdProofUrl, getAvatarInitial, getRoleColors } from "../utils/avatarUtils";
import { FullScreenLoader } from "../components/common/LoaderComponents";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [govtIdPreview, setGovtIdPreview] = useState(null);
  const [removeProfileImage, setRemoveProfileImage] = useState(false);
  const [removeGovtIdProof, setRemoveGovtIdProof] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [usernameError, setUsernameError] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Profile update loading states
  const [isProfileImageUploading, setIsProfileImageUploading] = useState(false);
  const [isProfileImageDeleting, setIsProfileImageDeleting] = useState(false);
  const [isDocumentUploading, setIsDocumentUploading] = useState(false);
  const [isDocumentDeleting, setIsDocumentDeleting] = useState(false);

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

    const fetchData = async () => {
      try {
        // Fetch organization details if user is an organizer
        if (safeUserData.role === "organizer") {
          try {
            const orgResponse = await getMyOrganization();
            // Handle new API response format
            if (orgResponse.data && orgResponse.data.exists && orgResponse.data.data && orgResponse.data.data._id) {
              setOrganization(orgResponse.data.data);
            }
          } catch (error) {
            console.error("No organization found or error fetching organization");
          }
        }

        setUser(safeUserData);
        setFormData({
          name: safeUserData.name || "",
          username: safeUserData.username || "",
          email: safeUserData.email || "",
          phone: safeUserData.phone || "",
          emergencyPhone: safeUserData.emergencyPhone || "",
          dateOfBirth: safeUserData.dateOfBirth ? new Date(safeUserData.dateOfBirth).toISOString().split('T')[0] : "",
          city: safeUserData.city || "",
          gender: safeUserData.gender || "",
          aboutMe: safeUserData.aboutMe || "",
          socials: {
            instagram: safeUserData.socials?.instagram || "",
            linkedin: safeUserData.socials?.linkedin || "",
            twitter: safeUserData.socials?.twitter || "",
            facebook: safeUserData.socials?.facebook || "",
          },
          newPassword: "",
          confirmPassword: "",
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Validate username format
    if (name === 'username') {
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (value.length > 0 && !usernameRegex.test(value)) {
        setUsernameError('Username can only contain letters, numbers, and underscores');
      } else if (value.length > 0 && value.length < 3) {
        setUsernameError('Username must be at least 3 characters long');
      } else if (value.length > 30) {
        setUsernameError('Username must be 30 characters or less');
      } else {
        setUsernameError('');
      }
    }
    
    if (name.startsWith('socials.')) {
      const socialKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        socials: {
          ...prev.socials,
          [socialKey]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        showAlert.error(`Profile image is too large! File size: ${fileSizeMB}MB. Maximum allowed size is 5MB. Please choose a smaller image.`);
        e.target.value = ''; // Clear the input
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        showAlert.error('Please select a valid image file (JPG, PNG, GIF, etc.) for your profile picture.');
        e.target.value = ''; // Clear the input
        return;
      }

      setFormData(prev => ({ ...prev, profileImage: file }));
      // Store the file object with type information for proper preview
      setProfileImagePreview(file);
      setRemoveProfileImage(false); // Reset remove flag when new file is selected
      
      // Show success message with file info
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      showAlert.success(`Profile image selected successfully! File size: ${fileSizeMB}MB`);
    }
  };

  const handleGovtIdChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        showAlert.error(`Government ID document is too large! File size: ${fileSizeMB}MB. Maximum allowed size is 5MB. Please choose a smaller file.`);
        e.target.value = ''; // Clear the input
        return;
      }

      // Validate file type (images and PDFs allowed)
      const allowedTypes = ['image/', 'application/pdf'];
      const isValidType = allowedTypes.some(type => file.type.startsWith(type));
      
      if (!isValidType) {
        showAlert.error('Please select a valid document file (JPG, PNG, PDF, etc.) for your government ID proof.');
        e.target.value = ''; // Clear the input
        return;
      }

      setFormData(prev => ({ ...prev, govtIdProof: file }));
      // Store the file object with type information for proper preview
      setGovtIdPreview(file);
      setRemoveGovtIdProof(false); // Reset remove flag when new file is selected
      
      // Show success message with file info
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      showAlert.success(`Government ID document selected successfully! File size: ${fileSizeMB}MB`);
    }
  };

  const handleRemoveProfileImage = () => {
    setRemoveProfileImage(true);
    setProfileImagePreview(null);
    setFormData(prev => ({ ...prev, profileImage: undefined }));
  };

  const handleRemoveGovtIdProof = () => {
    setRemoveGovtIdProof(true);
    setGovtIdPreview(null);
    setFormData(prev => ({ ...prev, govtIdProof: undefined }));
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation.toLowerCase() !== 'delete my account') {
      showAlert.warning('Please type "delete my account" exactly as shown to confirm deletion.');
      return;
    }

    // Use showConfirm for better UX
    showConfirm.action(
      '⚠️ WARNING: This will permanently delete your account and all associated data. This action cannot be undone. Are you absolutely sure?',
      async () => {
        try {
          setIsDeleting(true);
          await deleteAccount();
          
          // Clear all local storage
          localStorage.clear();
          sessionStorage.clear();
          
          // Redirect to home with a success message in the state
          navigate('/', { 
            state: { 
              message: 'Your account has been successfully deleted. We\'re sorry to see you go!',
              messageType: 'success'
            },
            replace: true // Replace the current entry in the history stack
          });
          
          // Force a full page reload to ensure all state is cleared
          window.location.href = '/';
          
        } catch (error) {
          console.error('Error deleting account:', error);
          const errorMessage = error.response?.data?.message || 
                             error.message || 
                             'Failed to delete account. Please try again later.';
          
          showAlert.error(`Error: ${errorMessage}`);
          
          // If it's an authentication error, log the user out
          if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login', { replace: true });
          }
          
          // Close the dialog on error
          setShowDeleteDialog(false);
          setDeleteConfirmation('');
        } finally {
          setIsDeleting(false);
        }
      },
      {
        title: 'Delete Account Confirmation',
        confirmText: 'Yes, Delete My Account',
        cancelText: 'Cancel',
        type: 'danger'
      }
    );
    return;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.username && formData.username.length < 3) {
      showAlert.warning("Username must be at least 3 characters long.");
      return;
    }
    
    setSaving(true);

    try {
      // Show appropriate loading notifications based on what's being updated
      let loadingNotifications = [];
      
      if (formData.profileImage) {
        setIsProfileImageUploading(true);
        loadingNotifications.push(showAlert.profileImageUploading('Uploading profile image to Cloudinary...'));
      }
      
      if (removeProfileImage && user.profileImage) {
        setIsProfileImageDeleting(true);
        loadingNotifications.push(showAlert.profileImageDeleting('Deleting profile image from Cloudinary...'));
      }
      
      if (formData.govtIdProof) {
        setIsDocumentUploading(true);
        loadingNotifications.push(showAlert.documentUploading('Uploading government ID to Cloudinary...'));
      }
      
      if (removeGovtIdProof && user.govtIdProofUrl) {
        setIsDocumentDeleting(true);
        loadingNotifications.push(showAlert.documentDeleting('Deleting government ID from Cloudinary...'));
      }
      
      // Show general profile update notification
      const profileUpdateNotification = showAlert.profileUpdating('Updating profile information...');
      
      const data = new FormData();
      
      // Add all form data
      Object.keys(formData).forEach(key => {
        if (key === 'socials') {
          data.append('socials', JSON.stringify(formData.socials));
        } else if (key === 'profileImage' && formData[key]) {
          data.append('profileImage', formData[key]);
        } else if (key === 'govtIdProof' && formData[key]) {
          data.append('govtIdProof', formData[key]);
        } else if (formData[key] && key !== 'newPassword' && key !== 'confirmPassword' && key !== 'organization') {
          data.append(key, formData[key]);
        }
      });

      // Add remove flags
      if (removeProfileImage) {
        data.append('removeProfileImage', 'true');
      }
      if (removeGovtIdProof) {
        data.append('removeGovtIdProof', 'true');
      }

      // Handle password change
      if (formData.newPassword && formData.newPassword === formData.confirmPassword) {
        data.append('password', formData.newPassword);
      }

      const response = await updateProfile(data);
      
      if (response.data.success) {
        // Update localStorage with new user data
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
        setEditing(false);
        // Update previews after save
        setProfileImagePreview(null);
        setGovtIdPreview(null);
        setRemoveProfileImage(false);
        setRemoveGovtIdProof(false);
        setRefreshKey(prev => prev + 1);
        // Clear password fields
        setFormData(prev => ({
          ...prev,
          newPassword: "",
          confirmPassword: "",
          profileImage: undefined,
          govtIdProof: undefined,
        }));
        
        // Dispatch custom event to notify other components about user data update
        window.dispatchEvent(new CustomEvent('userDataUpdated', {
          detail: { user: response.data.user }
        }));
        
        showAlert.success('Profile updated successfully! All files processed.');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      
      // Provide specific error messages based on error type
      if (error.response?.data?.message) {
        const errorMessage = error.response.data.message;
        
        // Handle file size errors
        if (errorMessage.includes('File too large') || errorMessage.includes('fileSize')) {
          showAlert.error('File is too large! Please ensure your files are under 5MB and try again.');
        }
        // Handle file type errors
        else if (errorMessage.includes('Only image files') || errorMessage.includes('Only image files and PDFs')) {
          showAlert.error('Invalid file type! Please select a valid image or PDF file.');
        }
        // Handle username/email conflicts
        else if (errorMessage.includes('already exists')) {
          showAlert.error(errorMessage);
        }
        // Handle other specific errors
        else {
          showAlert.error(errorMessage);
        }
      } else {
        showAlert.error('Failed to update profile. Please try again.');
      }
    } finally {
      setSaving(false);
      // Reset all loading states
      setIsProfileImageUploading(false);
      setIsProfileImageDeleting(false);
      setIsDocumentUploading(false);
      setIsDocumentDeleting(false);
    }
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
            <p className="text-gray-600">Please log in to view your profile.</p>
          </div>
        </div>
      </div>
    );
  }

  // Get safe user data for display
  const safeUser = getSafeUserData(user);

  return (
    <div className="h-screen overflow-y-auto bg-gray-50 pt-16 px-4">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-100 to-emerald-100 flex items-center justify-center overflow-hidden border-4 border-blue-200 shadow-lg">
                  {safeUser.profileImage ? (
                    <img
                      src={getProfileImageUrl(safeUser) ? `${getProfileImageUrl(safeUser)}?k=${refreshKey}` : ''}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                      {getSafeUserName(safeUser).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {/* Govt ID Proof */}
                {safeUser.govtIdProofUrl ? (
                  safeUser.govtIdProofUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                    <img
                      src={getGovtIdProofUrl(safeUser) ? `${getGovtIdProofUrl(safeUser)}?k=${refreshKey}` : ''}
                      alt="Govt ID"
                      className="w-20 h-14 object-contain border rounded shadow-md mt-2"
                    />
                  ) : (
                    <a
                      href={getGovtIdProofUrl(safeUser) ? `${getGovtIdProofUrl(safeUser)}?k=${refreshKey}` : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline text-xs mt-2"
                    >
                      View Govt ID
                    </a>
                  )
                ) : (
                  <span className="text-gray-400 text-xs mt-2">No Govt ID uploaded</span>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent">{getSafeUserName(safeUser)}</h1>
                <p className="text-lg text-blue-600 font-medium">{getUsernameDisplay(safeUser)}</p>
                <p className="text-slate-600 capitalize">{getSafeUserRole(safeUser) === "organizer" ? "Event Organizer" : "Volunteer"}</p>
                {organization && (
                  <p className="text-sm text-blue-600 font-medium">{organization.name}</p>
                )}
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setEditing(!editing)}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  editing 
                    ? 'bg-gray-500 text-white hover:bg-gray-600 shadow-md' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                }`}
              >
                {editing ? 'Cancel' : 'Edit Profile'}
              </button>
              {editing && (
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {isProfileImageUploading ? 'Uploading Image...' :
                       isProfileImageDeleting ? 'Deleting Image...' :
                       isDocumentUploading ? 'Uploading Document...' :
                       isDocumentDeleting ? 'Deleting Document...' :
                       'Saving Changes...'}
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in transition-all duration-700">
          {/* Profile Photo Section */}
          {editing && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 transform transition duration-500 hover:shadow-lg hover:scale-105 animate-fade-in flex flex-col gap-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center animate-fade-in">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3 animate-bounce">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                Profile Photo
              </h2>
              <div className="flex items-center space-x-6 animate-fade-in">
                <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-4 border-blue-200 shadow-lg transition-transform duration-500 hover:scale-110">
                  {profileImagePreview ? (
                    <img
                      src={URL.createObjectURL(profileImagePreview)}
                      alt="Profile Preview"
                      className="w-24 h-24 rounded-full object-cover animate-fade-in"
                    />
                  ) : safeUser.profileImage ? (
                    <img
                      src={getProfileImageUrl(safeUser) || ''}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                      {getSafeUserName(safeUser).charAt(0).toUpperCase()}
                    </div>
                  )}
                  {profileImagePreview && (
                    <span className="block text-xs text-gray-500 mt-1 text-center">{profileImagePreview.name}</span>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Change Profile Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isProfileImageUploading || isProfileImageDeleting}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: Square image, max 5MB. Supported formats: JPG, PNG, GIF, WebP
                  </p>
                  
                  {/* Loading indicator for profile image operations */}
                  {(isProfileImageUploading || isProfileImageDeleting) && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      {isProfileImageUploading ? 'Uploading image...' : 'Deleting image...'}
                    </div>
                  )}
                  
                  {user.profileImage && !removeProfileImage && (
                    <button
                      type="button"
                      onClick={handleRemoveProfileImage}
                      disabled={isProfileImageDeleting}
                      className="mt-2 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Remove Current Photo
                    </button>
                  )}
                </div>
              </div>
              {/* Govt ID Proof Section */}
              <div className="mt-8 animate-fade-in">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center animate-pulse">
                  <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center mr-2 animate-bounce">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  Govt ID Proof
                </h3>
                <div className="flex items-center gap-6 animate-fade-in">
                  {govtIdPreview ? (
                    <div>
                      <span className="block text-xs text-gray-500 mb-1">Preview:</span>
                      {govtIdPreview.type && govtIdPreview.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(govtIdPreview)}
                          alt="Govt ID Preview"
                          className="w-32 h-20 object-contain border rounded shadow-md animate-fade-in"
                        />
                      ) : (
                        <div className="w-32 h-20 border rounded shadow-md flex flex-col items-center justify-center bg-gray-50 animate-fade-in">
                          <svg className="w-8 h-8 text-red-500 mb-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-gray-600 text-center">PDF Document</span>
                          <span className="text-xs text-gray-500 text-center mt-1">{govtIdPreview.name}</span>
                        </div>
                      )}
                      {govtIdPreview && govtIdPreview.type && govtIdPreview.type.startsWith('image/') && (
                        <span className="block text-xs text-gray-500 mt-1 text-center">{govtIdPreview.name}</span>
                      )}
                    </div>
                  ) : safeUser.govtIdProofUrl ? (
                    <div>
                      <span className="block text-xs text-slate-500 mb-1">Current:</span>
                      {safeUser.govtIdProofUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                        <img
                          src={getGovtIdProofUrl(safeUser) || ''}
                          alt="Govt ID"
                          className="w-32 h-20 object-contain border rounded shadow-md animate-fade-in"
                        />
                      ) : (
                        <div className="w-32 h-20 border rounded shadow-md flex flex-col items-center justify-center bg-gray-50 animate-fade-in">
                          <svg className="w-8 h-8 text-red-500 mb-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-gray-600 text-center">PDF Document</span>
                          <a
                            href={getGovtIdProofUrl(safeUser) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline text-xs mt-1 hover:text-blue-800"
                          >
                            View PDF
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">No Govt ID uploaded</span>
                  )}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Change Govt ID Proof</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleGovtIdChange}
                      disabled={isDocumentUploading || isDocumentDeleting}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Accepted: Image/PDF, max 5MB</p>
                    
                    {/* Loading indicator for government ID operations */}
                    {(isDocumentUploading || isDocumentDeleting) && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                        {isDocumentUploading ? 'Uploading document...' : 'Deleting document...'}
                      </div>
                    )}
                    
                    {user.govtIdProofUrl && !removeGovtIdProof && (
                      <button
                        type="button"
                        onClick={handleRemoveGovtIdProof}
                        disabled={isDocumentDeleting}
                        className="mt-2 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Remove Current Govt ID
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Personal Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 transform transition duration-300 hover:shadow-md hover:scale-[1.01] animate-fade-in">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                Personal Information
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={!editing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      disabled={!editing}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 transition-colors ${
                        usernameError ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="username"
                    />
                    {editing && (
                      <p className={`text-xs mt-1 ${
                        usernameError ? 'text-red-500' : 'text-gray-500'
                      }`}>
                        {usernameError || 'Username can only contain letters, numbers, and underscores'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      disabled={!editing}
                      max={new Date().toISOString().split('T')[0]} // Prevent future dates
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 transition-colors ${
                        editing && new Date(formData.dateOfBirth) > new Date() ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                    {editing && new Date(formData.dateOfBirth) > new Date() && (
                      <p className="text-red-500 text-xs mt-1">Date of birth cannot be in the future</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      disabled={!editing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 transition-colors"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={!editing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 transition-colors"
                  />
                </div>
                {/* About Me moved here */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">About Me</label>
                  <textarea
                    name="aboutMe"
                    value={formData.aboutMe}
                    onChange={handleChange}
                    disabled={!editing}
                    rows={6}
                    placeholder="Tell us about yourself, your interests, and what drives you to make a difference..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 transform transition duration-300 hover:shadow-md hover:scale-[1.01] animate-fade-in">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                Contact Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!editing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={!editing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Phone</label>
                  <input
                    type="tel"
                    name="emergencyPhone"
                    value={formData.emergencyPhone}
                    onChange={handleChange}
                    disabled={!editing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Account Information & Socials */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Account Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 transform transition duration-300 hover:shadow-md hover:scale-[1.01]">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Account Information
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-slate-200">
                  <span className="font-medium text-slate-700">Role:</span>
                  <span className="text-slate-900 capitalize font-semibold">{getSafeUserRole(safeUser)}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-200">
                  <span className="font-medium text-slate-700">Member Since:</span>
                  <span className="text-slate-900">
                    {formatDate(safeUser.createdAt)}
                  </span>
                </div>
                {organization && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="font-medium text-gray-700">Organization:</span>
                    <span className="text-blue-600 font-semibold">{organization.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Socials */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 transform transition duration-300 hover:shadow-md hover:scale-[1.01]">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                  </svg>
                </div>
                Social Media
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                  <input
                    type="url"
                    name="socials.instagram"
                    value={formData.socials.instagram}
                    onChange={handleChange}
                    disabled={!editing}
                    placeholder="https://instagram.com/username"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                  <input
                    type="url"
                    name="socials.linkedin"
                    value={formData.socials.linkedin}
                    onChange={handleChange}
                    disabled={!editing}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Twitter</label>
                  <input
                    type="url"
                    name="socials.twitter"
                    value={formData.socials.twitter}
                    onChange={handleChange}
                    disabled={!editing}
                    placeholder="https://twitter.com/username"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
                  <input
                    type="url"
                    name="socials.facebook"
                    value={formData.socials.facebook}
                    onChange={handleChange}
                    disabled={!editing}
                    placeholder="https://facebook.com/username"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* About Me & Change Password */}
          {/* This block is now replaced by the above two sections */}

          {/* Change Password */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 transform transition duration-300 hover:shadow-md hover:scale-[1.01]">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              Change Password
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  disabled={!editing}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={!editing}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 transition-colors"
                />
              </div>
              {formData.newPassword && formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                <p className="text-red-500 text-sm">Passwords do not match</p>
              )}
            </div>
          </div>
        </form>

        {/* Account Deletion Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            Delete Account
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            Delete My Account
          </button>
        </div>

        {/* Back Button */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            ← Back
          </button>
        </div>

        {/* Delete Account Confirmation Dialog */}
        {showDeleteDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Delete Your Account</h3>
              <p className="text-gray-700 mb-4">
                This will permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Type <span className="font-mono bg-gray-100 px-2 py-1 rounded">delete my account</span> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md mb-4"
                placeholder="Type 'delete my account' to confirm"
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setDeleteConfirmation('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || deleteConfirmation.toLowerCase() !== 'delete my account'}
                  className={`px-4 py-2 text-white rounded-md ${
                    deleteConfirmation.toLowerCase() === 'delete my account' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-red-300 cursor-not-allowed'
                  }`}
                >
                  {isDeleting ? 'Deleting...' : 'Permanently Delete Account'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Loader for Form Submission */}
        <FullScreenLoader
          isVisible={saving}
          message="Updating Profile..."
          showProgress={false}
        />
      </div>
    </div>
  );
}