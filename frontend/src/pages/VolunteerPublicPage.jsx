import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import axiosInstance from "../api/axiosInstance";
import EventCard from "../components/event/EventCard";
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from "../utils/avatarUtils";
import { formatDate } from "../utils/dateUtils";
import { 
  getSafeUserData, 
  getDisplayName, 
  getUsernameDisplay, 
  getSafeUserName, 
  getSafeUserRole 
} from "../utils/safeUserUtils";
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  MapPinIcon, 
  CalendarIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  SparklesIcon,
  ArrowLeftIcon,
  ExclamationCircleIcon,
  WifiIcon
} from "@heroicons/react/24/outline";

export default function VolunteerPublicPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [volunteer, setVolunteer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState(""); // 'network', 'not_found', 'deleted', 'invalid_id', 'server_error'
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [eventType, setEventType] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  // Validate ID parameter
  const isValidId = (id) => {
    return id && typeof id === 'string' && id.trim().length > 0 && /^[a-zA-Z0-9]+$/.test(id);
  };

  // Handle retry functionality
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setIsRetrying(true);
    setError("");
    setEventsError("");
    setLoading(true);
    setEventsLoading(true);
    
    // Retry after a short delay
    setTimeout(() => {
      fetchVolunteerData();
      fetchEventsData();
    }, 1000);
  };

  // Fetch volunteer data with comprehensive error handling
  const fetchVolunteerData = async () => {
    try {
      // Validate ID first
      if (!isValidId(id)) {
        setError("Invalid volunteer ID format");
        setErrorType("invalid_id");
        setLoading(false);
        return;
      }

      const response = await axiosInstance.get(`/api/users/${id}`);
      
      // Check if response has data
      if (!response.data) {
        throw new Error("No data received from server");
      }

      // Check if user data indicates a deleted account
      const safeVolunteerData = getSafeUserData(response.data);
      
      if (safeVolunteerData.isDeleted) {
        setError("This volunteer account has been deleted");
        setErrorType("deleted");
        setLoading(false);
        return;
      }

      // Validate required fields
      if (!safeVolunteerData._id || !safeVolunteerData.email) {
        throw new Error("Invalid volunteer data received");
      }

      setVolunteer(safeVolunteerData);
      setError("");
      setErrorType("");
      setLoading(false);
      
    } catch (err) {
      console.error("Error fetching volunteer data:", err);
      
      // Handle different types of errors
      if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
        setError("Network connection failed. Please check your internet connection.");
        setErrorType("network");
      } else if (err.response?.status === 404) {
        setError("Volunteer not found. The profile you're looking for doesn't exist.");
        setErrorType("not_found");
      } else if (err.response?.status === 403) {
        setError("Access denied. You don't have permission to view this profile.");
        setErrorType("access_denied");
      } else if (err.response?.status >= 500) {
        setError("Server error. Please try again later.");
        setErrorType("server_error");
      } else if (err.response?.data?.error === 'ACCOUNT_DELETED') {
        setError("This volunteer account has been deleted");
        setErrorType("deleted");
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
        setErrorType("api_error");
      } else {
        setError("Failed to load volunteer profile. Please try again.");
        setErrorType("unknown");
      }
      
      setLoading(false);
    }
  };

  // Fetch events data with comprehensive error handling
  const fetchEventsData = async () => {
    try {
      if (!isValidId(id)) {
        setEventsError("Invalid volunteer ID");
        setEventsLoading(false);
        return;
      }

      // Get registrations for this volunteer
      const registrationsResponse = await axiosInstance.get(`/api/registrations/volunteer/${id}`);
      
      if (!registrationsResponse.data) {
        throw new Error("No registration data received");
      }

      const registrations = registrationsResponse.data;
      
      // Validate registrations data
      if (!Array.isArray(registrations)) {
        throw new Error("Invalid registration data format");
      }

      // Extract event IDs and filter out invalid ones
      const eventIds = registrations
        .filter(r => r && r.eventId && typeof r.eventId === 'string')
        .map(r => r.eventId);

      if (eventIds.length === 0) {
        setEvents([]);
        setEventsLoading(false);
        return;
      }

      // Fetch event details for all eventIds with individual error handling
      const eventPromises = eventIds.map(async (eventId) => {
        try {
          const eventResponse = await axiosInstance.get(`/api/events/${eventId}`);
          return eventResponse.data;
        } catch (eventErr) {
          console.warn(`Failed to fetch event ${eventId}:`, eventErr);
          return null; // Return null for failed events
        }
      });

      const eventsData = (await Promise.all(eventPromises))
        .filter(e => e && e._id && e.title) // Filter out null/invalid events
        .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));

      setEvents(eventsData);
      setEventsError("");
      setEventsLoading(false);
      
    } catch (err) {
      console.error("Error fetching events data:", err);
      
      if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
        setEventsError("Failed to load events due to network issues");
      } else if (err.response?.status === 404) {
        setEventsError("Events not found for this volunteer");
      } else if (err.response?.status >= 500) {
        setEventsError("Server error while loading events");
      } else {
        setEventsError("Failed to load events. Please try again.");
      }
      
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setError("No volunteer ID provided");
      setErrorType("invalid_id");
      setLoading(false);
      return;
    }

    fetchVolunteerData();
  }, [id, retryCount]);

  useEffect(() => {
    if (!id || !isValidId(id)) return;
    
    fetchEventsData();
  }, [id, retryCount]);

  // Filter and sort events based on current filter settings
  const now = new Date();
  
  // First apply all filters
  let filteredEvents = events.filter(e => {
    if (!e || !e.startDateTime) return false;
    
    try {
      const eventDate = new Date(e.startDateTime);
      
      // Filter by event type
      if (eventType !== "all") {
        switch (eventType) {
          case "upcoming":
            if (eventDate <= now) return false;
            break;
          case "past":
            if (eventDate > now) return false;
            break;
          case "live":
            // Consider events happening today as live
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            if (eventDate < today || eventDate >= tomorrow) return false;
            break;
        }
      }
      
      return true;
    } catch (dateErr) {
      console.warn("Invalid date in event:", e, dateErr);
      return false;
    }
  });

  // Sort events
  filteredEvents.sort((a, b) => {
    switch (sortBy) {
      case "date":
        return new Date(b.startDateTime) - new Date(a.startDateTime);
      case "date-old":
        return new Date(a.startDateTime) - new Date(b.startDateTime);
      case "name":
        return a.title.localeCompare(b.title);
      case "participants":
        return (b.registeredVolunteers?.length || 0) - (a.registeredVolunteers?.length || 0);
      case "organization":
        return (a.organizationName || "").localeCompare(b.organizationName || "");
      default:
        return 0;
    }
  });

  // Split filtered events into upcoming and past+live for display
  // Only split if eventType is "all", otherwise use the already filtered events
  const upcomingEvents = eventType === "all" 
    ? filteredEvents.filter(e => {
        try {
          return e && e.startDateTime && new Date(e.startDateTime) > now;
        } catch (dateErr) {
          console.warn("Invalid date in event:", e, dateErr);
          return false;
        }
      })
    : eventType === "upcoming" ? filteredEvents : [];
  
  const pastAndLiveEvents = eventType === "all" 
    ? filteredEvents.filter(e => {
        try {
          return e && e.startDateTime && new Date(e.startDateTime) <= now;
        } catch (dateErr) {
          console.warn("Invalid date in event:", e, dateErr);
          return false;
        }
      })
    : (eventType === "past" || eventType === "live") ? filteredEvents : [];

  // Render error component
  const renderError = () => {
    const errorConfig = {
      network: {
        icon: WifiIcon,
        title: "Connection Error",
        description: "Please check your internet connection and try again.",
        action: "Retry"
      },
      not_found: {
        icon: ExclamationCircleIcon,
        title: "Volunteer Not Found",
        description: "The volunteer profile you're looking for doesn't exist or has been removed.",
        action: "Go Back"
      },
      deleted: {
        icon: ExclamationTriangleIcon,
        title: "Account Deleted",
        description: "This volunteer account has been permanently deleted.",
        action: "Go Back"
      },
      invalid_id: {
        icon: ExclamationCircleIcon,
        title: "Invalid Profile",
        description: "The volunteer ID is invalid or malformed.",
        action: "Go Back"
      },
      access_denied: {
        icon: ExclamationTriangleIcon,
        title: "Access Denied",
        description: "You don't have permission to view this volunteer profile.",
        action: "Go Back"
      },
      server_error: {
        icon: ExclamationTriangleIcon,
        title: "Server Error",
        description: "Our servers are experiencing issues. Please try again later.",
        action: "Retry"
      },
      api_error: {
        icon: ExclamationCircleIcon,
        title: "Error Loading Profile",
        description: error,
        action: "Retry"
      },
      unknown: {
        icon: ExclamationTriangleIcon,
        title: "Something Went Wrong",
        description: "An unexpected error occurred. Please try again.",
        action: "Retry"
      }
    };

    const config = errorConfig[errorType] || errorConfig.unknown;
    const IconComponent = config.icon;

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-white rounded-2xl shadow-lg p-8 max-w-md w-full animate-fadeIn">
          <IconComponent className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{config.title}</h2>
          <p className="text-gray-600 mb-6">{config.description}</p>
          
          <div className="flex gap-3 justify-center">
            {config.action === "Retry" ? (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRetrying ? "Retrying..." : "Retry"}
              </button>
            ) : (
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Go Back
              </button>
            )}
            
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render events error
  const renderEventsError = () => (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <div className="text-center py-8">
        <ExclamationCircleIcon className="w-12 h-12 text-orange-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Events Loading Error</h3>
        <p className="text-gray-600 mb-4">{eventsError}</p>
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {isRetrying ? "Retrying..." : "Retry Loading Events"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <Navbar />
      
      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        @media (max-width: 1280px) {
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
        }
        
        /* Compact event cards for volunteer public page */
        .volunteer-event-card {
          min-height: 200px !important;
        }
        
        .volunteer-event-card .event-image {
          height: 100px !important;
        }
        
        .volunteer-event-card .event-content {
          padding: 10px !important;
        }
        
        .volunteer-event-card .event-title {
          font-size: 13px !important;
          line-height: 1.3 !important;
        }
        
        .volunteer-event-card .event-description {
          font-size: 11px !important;
          line-height: 1.4 !important;
        }
      `}</style>
      
      <div className="pt-24 w-full px-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 max-w-none xl:h-[calc(100vh-8rem)]">
          {loading ? (
            <div className="col-span-full animate-pulse space-y-8">
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                  <div className="h-32 w-32 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/2" />
                    <div className="h-6 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                  </div>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="col-span-full">
              {renderError()}
            </div>
          ) : (
            <>
              {/* Left Column - Profile Info, Contact, Social */}
              <div className="xl:col-span-1 space-y-6 xl:overflow-y-auto xl:max-h-screen pr-2 pb-8 custom-scrollbar">
                
                {/* Profile Header */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4">
                    <div className="flex flex-col items-center text-center">
                      {/* Profile Image */}
                      <div className="relative group mb-4">
                        {getProfileImageUrl(volunteer) ? (
                          <img
                            src={getProfileImageUrl(volunteer)}
                            alt={getSafeUserName(volunteer)}
                            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl transition-all duration-500 hover:scale-105 hover:shadow-2xl"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className="w-24 h-24 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 flex items-center justify-center border-4 border-white shadow-xl transition-all duration-500 hover:scale-105 hover:shadow-2xl"
                          style={{ display: getProfileImageUrl(volunteer) ? 'none' : 'flex' }}
                        >
                          <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{getAvatarInitial(volunteer)}</span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1.5 shadow-lg">
                          <SparklesIcon className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      
                      {/* Profile Info */}
                      <h1 className="text-xl font-bold text-white mb-2">
                        {getSafeUserName(volunteer) || 'Unknown Volunteer'}
                      </h1>
                      <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-full text-xs border border-white/30">
                          Volunteer
                        </span>
                        {volunteer?.city && (
                          <div className="flex items-center gap-1 text-white/90">
                            <MapPinIcon className="w-3 h-3" />
                            <span className="text-sm">{volunteer.city}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-white/90 leading-relaxed">
                        {volunteer?.aboutMe ? (volunteer.aboutMe.length > 120 ? volunteer.aboutMe.substring(0, 120) + '...' : volunteer.aboutMe) : "Passionate volunteer making a difference in the community."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20">
                  <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <div className="w-5 h-5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                      <UserIcon className="w-3 h-3 text-white" />
                    </div>
                    Contact Information
                  </h3>
                  <div className="space-y-2">
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-4 h-4 bg-emerald-100 rounded-md flex items-center justify-center">
                          <EnvelopeIcon className="w-3 h-3 text-emerald-600" />
                        </div>
                        <div className="font-semibold text-slate-700 text-xs">Email</div>
                      </div>
                      <div className="text-slate-600 text-xs ml-6">{volunteer?.email || 'Not available'}</div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-4 h-4 bg-blue-100 rounded-md flex items-center justify-center">
                          <PhoneIcon className="w-3 h-3 text-blue-600" />
                        </div>
                        <div className="font-semibold text-slate-700 text-xs">Phone</div>
                      </div>
                      <div className="text-slate-600 text-xs ml-6">{volunteer?.phone || 'Not available'}</div>
                    </div>
                    {volunteer?.city && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-4 h-4 bg-purple-100 rounded-md flex items-center justify-center">
                            <MapPinIcon className="w-3 h-3 text-purple-600" />
                          </div>
                          <div className="font-semibold text-slate-700 text-xs">Location</div>
                        </div>
                        <div className="text-slate-600 text-xs ml-6">{volunteer.city}</div>
                      </div>
                    )}
                    {volunteer?.emergencyPhone && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-4 h-4 bg-red-100 rounded-md flex items-center justify-center">
                            <PhoneIcon className="w-3 h-3 text-red-600" />
                          </div>
                          <div className="font-semibold text-slate-700 text-xs">Emergency Contact</div>
                        </div>
                        <div className="text-slate-600 text-xs ml-6">{volunteer.emergencyPhone}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Social Links & Details */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20">
                  <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <GlobeAltIcon className="w-3 h-3 text-white" />
                    </div>
                    Social Links & Details
                  </h3>
                  <div className="space-y-3">
                    {volunteer?.socials && Object.values(volunteer.socials).some(social => social) && (
                      <div>
                        <span className="text-xs text-slate-500 mb-2 block">Social Media</span>
                        <div className="flex flex-wrap gap-2">
                          {volunteer.socials.instagram && (
                            <a 
                              href={volunteer.socials.instagram} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="group relative flex items-center justify-center w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-110 hover:-translate-y-1"
                              title="Instagram"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                              </svg>
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                Instagram
                              </div>
                            </a>
                          )}
                          {volunteer.socials.linkedin && (
                            <a 
                              href={volunteer.socials.linkedin} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="group relative flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-110 hover:-translate-y-1"
                              title="LinkedIn"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                              </svg>
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                LinkedIn
                              </div>
                            </a>
                          )}
                          {volunteer.socials.twitter && (
                            <a 
                              href={volunteer.socials.twitter} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="group relative flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-110 hover:-translate-y-1"
                              title="Twitter"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                              </svg>
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                Twitter
                              </div>
                            </a>
                          )}
                          {volunteer.socials.facebook && (
                            <a 
                              href={volunteer.socials.facebook} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="group relative flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-110 hover:-translate-y-1"
                              title="Facebook"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                              </svg>
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                Facebook
                              </div>
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-4 h-4 bg-orange-100 rounded-md flex items-center justify-center">
                          <CalendarIcon className="w-3 h-3 text-orange-600" />
                        </div>
                        <div className="font-semibold text-slate-700 text-xs">Member Since</div>
                      </div>
                      <div className="text-slate-600 text-xs ml-6">{volunteer?.createdAt ? formatDate(volunteer.createdAt) : 'Unknown'}</div>
                    </div>
                  </div>
                </div>

                {/* Volunteer Statistics */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20">
                  <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <div className="w-5 h-5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                      <CheckCircleIcon className="w-3 h-3 text-white" />
                    </div>
                    Volunteer Statistics
                  </h3>
                  <div className="space-y-2">
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-emerald-100 rounded-md flex items-center justify-center">
                            <CalendarIcon className="w-3 h-3 text-emerald-600" />
                          </div>
                          <div className="font-semibold text-slate-700 text-xs">Total Events</div>
                        </div>
                        <div className="text-slate-600 text-xs font-bold">{events.length}</div>
                      </div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-blue-100 rounded-md flex items-center justify-center">
                            <ClockIcon className="w-3 h-3 text-blue-600" />
                          </div>
                          <div className="font-semibold text-slate-700 text-xs">Upcoming</div>
                        </div>
                        <div className="text-slate-600 text-xs font-bold">{upcomingEvents.length}</div>
                      </div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-purple-100 rounded-md flex items-center justify-center">
                            <CheckCircleIcon className="w-3 h-3 text-purple-600" />
                          </div>
                          <div className="font-semibold text-slate-700 text-xs">Completed</div>
                        </div>
                        <div className="text-slate-600 text-xs font-bold">{pastAndLiveEvents.length}</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column - Events */}
              <div className="xl:col-span-3 xl:overflow-y-auto xl:max-h-screen pr-2 pb-8 custom-scrollbar">
                
                {/* About Me Section */}
                {volunteer?.aboutMe && (
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 mb-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-white" />
                      </div>
                      About Me
                    </h3>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                      {volunteer.aboutMe}
                    </p>
                  </div>
                )}

                {/* Events Section */}
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 mb-6">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-emerald-900 to-teal-900 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                    <CalendarIcon className="w-6 h-6" />
                    Events
                    <span className="ml-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                      {filteredEvents.length}
                    </span>
                  </h2>

                  {/* Event Filters & Controls */}
                  <div className="bg-white/40 backdrop-blur-sm rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Event Type Filter */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-emerald-600" />
                          Event Type
                        </label>
                        <select
                          className="w-full p-2.5 border border-slate-200 rounded-lg bg-white/80 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-sm"
                          value={eventType}
                          onChange={e => setEventType(e.target.value)}
                        >
                          <option value="all">All Events</option>
                          <option value="upcoming">Upcoming Only</option>
                          <option value="past">Past Only</option>
                          <option value="live">Live Events</option>
                        </select>
                      </div>
                      
                      {/* Sort By */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                          <ClockIcon className="w-4 h-4 text-teal-600" />
                          Sort By
                        </label>
                        <select
                          className="w-full p-2.5 border border-slate-200 rounded-lg bg-white/80 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-sm"
                          value={sortBy}
                          onChange={e => setSortBy(e.target.value)}
                        >
                          <option value="date">Date (Newest)</option>
                          <option value="date-old">Date (Oldest)</option>
                          <option value="name">Event Name</option>
                          <option value="participants">Participants</option>
                          <option value="organization">Organization</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Events Display */}
                  <div className="space-y-6">
                    {eventsError ? (
                      renderEventsError()
                    ) : filteredEvents.length === 0 ? (
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6">
                        <div className="text-center py-12">
                          <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 text-lg">No events match the current filters.</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Show sections based on event type filter */}
                        {(eventType === "all" || eventType === "upcoming") && (
                          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6">
                            <h3 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-emerald-900 to-teal-900 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                              <CalendarIcon className="w-5 h-5" />
                              Upcoming Events
                              <span className="ml-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                                {upcomingEvents.length}
                              </span>
                            </h3>
                        {eventsLoading ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="animate-pulse">
                                <div className="h-40 bg-gray-200 rounded-lg mb-3" />
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                                <div className="h-3 bg-gray-200 rounded w-1/2" />
                              </div>
                            ))}
                          </div>
                        ) : upcomingEvents.length === 0 ? (
                          <div className="text-center py-12">
                            <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">No upcoming events registered.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {upcomingEvents.map(e => (
                              <div key={e._id} className="volunteer-event-card transform hover:-translate-y-2 transition-all duration-300">
                                <EventCard event={e} />
                              </div>
                            ))}
                          </div>
                        )}
                        </div>
                        )}

                        {(eventType === "all" || eventType === "past" || eventType === "live") && (
                          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6">
                            <h3 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-gray-900 to-slate-900 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                              <CheckCircleIcon className="w-5 h-5" />
                              {eventType === "live" ? "Live Events" : "Past & Live Events"}
                              <span className="ml-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                                {eventType === "live" ? filteredEvents.length : pastAndLiveEvents.length}
                              </span>
                            </h3>
                        {eventsLoading ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="animate-pulse">
                                <div className="h-40 bg-gray-200 rounded-lg mb-3" />
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                                <div className="h-3 bg-gray-200 rounded w-1/2" />
                              </div>
                            ))}
                          </div>
                        ) : (eventType === "live" ? filteredEvents.length : pastAndLiveEvents.length) === 0 ? (
                          <div className="text-center py-12">
                            <CheckCircleIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">
                              {eventType === "live" ? "No live events found." : "No past or live events found."}
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(eventType === "live" ? filteredEvents : pastAndLiveEvents).map(e => (
                              <div key={e._id} className="volunteer-event-card transform hover:-translate-y-2 transition-all duration-300">
                                <EventCard event={e} />
                              </div>
                            ))}
                          </div>
                        )}
                          </div>
                        )}
                    </>
                  )}
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
