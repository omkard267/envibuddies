import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import { getUserById } from "../api/organization";
import { FaInstagram, FaLinkedin, FaTwitter, FaFacebook } from "react-icons/fa";
import axiosInstance from "../api/axiosInstance";
import EventCard from "../components/event/EventCard";
import OrganizationCard from "../components/common/OrganizationCard";
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from "../utils/avatarUtils";
import { 
  getSafeUserData, 
  getDisplayName, 
  getUsernameDisplay, 
  getSafeUserName,
  getSafeUserId,
  getSafeUserRole 
} from "../utils/safeUserUtils";
import { formatDate } from "../utils/dateUtils";
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
  BuildingOfficeIcon,
  UsersIcon,
  XCircleIcon
} from "@heroicons/react/24/outline";

export default function UserProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("all");
  const [eventType, setEventType] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  useEffect(() => {
    setLoading(true);
    setError("");
    getUserById(id)
      .then((res) => {
        // Check if user data indicates a deleted account
        const safeUserData = getSafeUserData(res.data);
        if (safeUserData.isDeleted) {
          setError("This user account has been deleted");
          setLoading(false);
          return;
        }
        setUser(safeUserData);
        setLoading(false);
      })
      .catch((err) => {
        if (err.response?.data?.error === 'ACCOUNT_DELETED') {
          setError("This user account has been deleted");
        } else {
          setError("User not found");
        }
        setLoading(false);
      });
  }, [id]);

  // Fetch organizations this organizer is a part of
  useEffect(() => {
    if (!id) return;
    axiosInstance
      .get(`/api/organizations/user/${id}`)
      .then((res) => {
        // Handle the response format - it might be wrapped in a data property
        const orgs = res.data.data || res.data;
        
        // Add membership status to each organization
        const orgsWithStatus = (Array.isArray(orgs) ? orgs : []).map(org => ({
          ...org,
          status: org.createdBy === id ? "creator" : "member"
        }));
        
        setOrganizations(orgsWithStatus);
      })
      .catch((err) => {
        console.error('Error fetching organizations:', err);
        setOrganizations([]);
      });
  }, [id]);

  // Fetch events for this organizer (all or filtered by org)
  useEffect(() => {
    if (!id) return;
    setEventsLoading(true);
    let url = "";
    if (selectedOrg === "all") {
      url = `/api/events/created-by/${id}`;
    } else {
      url = `/api/events/by-organizer-and-org/${id}/${selectedOrg}`;
    }
    axiosInstance
      .get(url)
      .then((res) => {
        setEvents(res.data);
        setEventsLoading(false);
      })
      .catch(() => setEventsLoading(false));
  }, [id, selectedOrg]);

  // Handle organization click
  const handleOrganizationClick = (organization) => {
    if (organization && organization._id) {
      navigate(`/organization/${organization._id}`);
    }
  };

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
      default:
        return 0;
    }
  });

  // Split filtered events into upcoming and past for display
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
  
  const pastEvents = eventType === "all" 
    ? filteredEvents.filter(e => {
        try {
          return e && e.startDateTime && new Date(e.startDateTime) <= now;
        } catch (dateErr) {
          console.warn("Invalid date in event:", e, dateErr);
          return false;
        }
      })
    : eventType === "past" ? filteredEvents : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
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
        
        /* Compact event cards for organizer public page */
        .organizer-event-card {
          min-height: 200px !important;
        }
        
        .organizer-event-card .event-image {
          height: 100px !important;
        }
        
        .organizer-event-card .event-content {
          padding: 10px !important;
        }
        
        .organizer-event-card .event-title {
          font-size: 13px !important;
          line-height: 1.3 !important;
        }
        
        .organizer-event-card .event-description {
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
              <div className="text-center py-16">
                <div className="max-w-md mx-auto">
                  <div className="p-4 bg-gradient-to-r from-red-500 to-red-600 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                    <XCircleIcon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {error}
                  </h3>
                  <p className="text-slate-600">
                    The organizer profile you're looking for doesn't exist or has been removed.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Left Column - Profile Info, Contact, Social, Organizations */}
              <div className="xl:col-span-1 space-y-6 xl:overflow-y-auto xl:max-h-screen pr-2 pb-8 custom-scrollbar">
                
                {/* Profile Header */}
                <div className="bg-white/60 backdrop-blur-sm rounded-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
                    <div className="flex flex-col items-center text-center">
                      {/* Profile Image */}
                      <div className="relative group mb-4">
                {getProfileImageUrl(user) ? (
                  <img
                    src={getProfileImageUrl(user)}
                    alt={getSafeUserName(user)}
                            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl transition-all duration-500 hover:scale-105 hover:shadow-2xl"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center border-4 border-white shadow-xl transition-all duration-500 hover:scale-105 hover:shadow-2xl"
                          style={{ display: getProfileImageUrl(user) ? 'none' : 'flex' }}
                        >
                          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{getAvatarInitial(user)}</span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1.5 shadow-lg">
                          <SparklesIcon className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      
                      {/* Profile Info */}
                      <h1 className="text-xl font-bold text-white mb-2">
                        {getSafeUserName(user) || 'Unknown Organizer'}
                      </h1>
                      <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-full text-xs border border-white/30">
                          Event Organizer
                        </span>
                        {user?.city && (
                          <div className="flex items-center gap-1 text-white/90">
                            <MapPinIcon className="w-3 h-3" />
                            <span className="text-sm">{user.city}</span>
                  </div>
                )}
                      </div>
                      <p className="text-sm text-white/90 leading-relaxed">
                        {user?.aboutMe ? (user.aboutMe.length > 120 ? user.aboutMe.substring(0, 120) + '...' : user.aboutMe) : "Experienced event organizer creating memorable experiences."}
                      </p>
              </div>
                  </div>
                  </div>

                {/* Contact Information */}
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
                  <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                      <UserIcon className="w-3 h-3 text-white" />
                    </div>
                    Contact Information
                  </h3>
                  <div className="space-y-2">
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-4 h-4 bg-blue-100 rounded-md flex items-center justify-center">
                          <EnvelopeIcon className="w-3 h-3 text-blue-600" />
                        </div>
                        <div className="font-semibold text-slate-700 text-xs">Email</div>
                      </div>
                      <div className="text-slate-600 text-xs ml-6">{user?.email || 'Not available'}</div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-4 h-4 bg-green-100 rounded-md flex items-center justify-center">
                          <PhoneIcon className="w-3 h-3 text-green-600" />
                        </div>
                        <div className="font-semibold text-slate-700 text-xs">Phone</div>
                      </div>
                      <div className="text-slate-600 text-xs ml-6">{user?.phone || 'Not available'}</div>
                    </div>
                    {user?.city && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-4 h-4 bg-purple-100 rounded-md flex items-center justify-center">
                            <MapPinIcon className="w-3 h-3 text-purple-600" />
                          </div>
                          <div className="font-semibold text-slate-700 text-xs">Location</div>
                        </div>
                        <div className="text-slate-600 text-xs ml-6">{user.city}</div>
                    </div>
                  )}
                    {user?.emergencyPhone && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-4 h-4 bg-red-100 rounded-md flex items-center justify-center">
                            <PhoneIcon className="w-3 h-3 text-red-600" />
                          </div>
                          <div className="font-semibold text-slate-700 text-xs">Emergency Contact</div>
                        </div>
                        <div className="text-slate-600 text-xs ml-6">{user.emergencyPhone}</div>
                    </div>
                  )}
                    {user?.position && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-4 h-4 bg-orange-100 rounded-md flex items-center justify-center">
                            <BuildingOfficeIcon className="w-3 h-3 text-orange-600" />
                          </div>
                          <div className="font-semibold text-slate-700 text-xs">Position</div>
                        </div>
                        <div className="text-slate-600 text-xs ml-6">{user.position}</div>
                    </div>
                  )}
                  </div>
                </div>

                {/* Social Links & Details */}
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
                  <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <GlobeAltIcon className="w-3 h-3 text-white" />
                    </div>
                    Social Links & Details
                  </h3>
                  <div className="space-y-3">
                    {user?.socials && Object.values(user.socials).some(social => social) && (
                <div>
                        <span className="text-xs text-slate-500 mb-2 block">Social Media</span>
                        <div className="flex flex-wrap gap-2">
                          {user.socials.instagram && (
                            <a
                              href={user.socials.instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative flex items-center justify-center w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-110 hover:-translate-y-1"
                              title="Instagram"
                            >
                              <FaInstagram className="w-4 h-4" />
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                Instagram
                              </div>
                            </a>
                          )}
                          {user.socials.linkedin && (
                            <a
                              href={user.socials.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-110 hover:-translate-y-1"
                              title="LinkedIn"
                            >
                              <FaLinkedin className="w-4 h-4" />
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                LinkedIn
                              </div>
                            </a>
                          )}
                          {user.socials.twitter && (
                            <a
                              href={user.socials.twitter}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-110 hover:-translate-y-1"
                              title="Twitter"
                            >
                              <FaTwitter className="w-4 h-4" />
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                Twitter
                              </div>
                            </a>
                          )}
                          {user.socials.facebook && (
                            <a
                              href={user.socials.facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-110 hover:-translate-y-1"
                              title="Facebook"
                            >
                              <FaFacebook className="w-4 h-4" />
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
                      <div className="text-slate-600 text-xs ml-6">{user?.createdAt ? formatDate(user.createdAt) : 'Unknown'}</div>
                    </div>
                  </div>
                </div>

                {/* Organizations */}
                {organizations.length > 0 && (
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
                    <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <div className="w-5 h-5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <BuildingOfficeIcon className="w-3 h-3 text-white" />
                      </div>
                      Organizations
                    </h3>
                    <div className="space-y-2">
                      {organizations.slice(0, 3).map((org) => (
                        <div key={org._id} className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                          <div className="font-semibold text-slate-700 text-xs mb-1">{org.name}</div>
                          <div className="text-slate-600 text-xs">{org.description ? (org.description.length > 50 ? org.description.substring(0, 50) + '...' : org.description) : 'No description'}</div>
                        </div>
                      ))}
                      {organizations.length > 3 && (
                        <div className="text-xs text-slate-500 text-center">
                          +{organizations.length - 3} more organizations
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Organizer Statistics */}
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
                  <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                      <CheckCircleIcon className="w-3 h-3 text-white" />
                    </div>
                    Organizer Statistics
                  </h3>
                  <div className="space-y-2">
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-blue-100 rounded-md flex items-center justify-center">
                            <CalendarIcon className="w-3 h-3 text-blue-600" />
                          </div>
                          <div className="font-semibold text-slate-700 text-xs">Total Events</div>
                        </div>
                        <div className="text-slate-600 text-xs font-bold">{events.length}</div>
                      </div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-emerald-100 rounded-md flex items-center justify-center">
                            <ClockIcon className="w-3 h-3 text-emerald-600" />
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
                        <div className="text-slate-600 text-xs font-bold">{pastEvents.length}</div>
                      </div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-indigo-100 rounded-md flex items-center justify-center">
                            <BuildingOfficeIcon className="w-3 h-3 text-indigo-600" />
                          </div>
                          <div className="font-semibold text-slate-700 text-xs">Organizations</div>
                        </div>
                        <div className="text-slate-600 text-xs font-bold">{organizations.length}</div>
                      </div>
                </div>
              </div>
                </div>

              </div>

                            {/* Right Column - About, Events */}
              <div className="xl:col-span-3 xl:overflow-y-auto xl:max-h-screen pr-2 pb-8 custom-scrollbar">
                
                {/* About Me Section */}
                {user?.aboutMe && (
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 mb-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-white" />
                      </div>
                      About Me
                    </h3>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                      {user.aboutMe}
                    </p>
                  </div>
                )}

                {/* Organizations Section */}
                {organizations.length > 0 && (
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 mb-6">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                      <BuildingOfficeIcon className="w-6 h-6" />
                      Organizations
                      <span className="ml-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                        {organizations.length}
                      </span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {organizations.map((org, index) => (
                        <div
                          key={org._id}
                          className="transform hover:-translate-y-1 transition-all duration-300"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <OrganizationCard
                            organization={org}
                            onClick={() => handleOrganizationClick(org)}
                            variant="default"
                            showStats={true}
                            autoSize={true}
                            membershipStatus={org.status}
                          />
                        </div>
                      ))}
                    </div>
                </div>
              )}

                {/* Events Section */}
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 mb-6">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                    <CalendarIcon className="w-6 h-6" />
                    Events
                    <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {filteredEvents.length}
                    </span>
                  </h2>

                  {/* Event Filters & Controls */}
                  <div className="bg-white/40 backdrop-blur-sm rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Organization Filter */}
                  {organizations.length > 0 && (
                    <div>
                        <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                          <BuildingOfficeIcon className="w-4 h-4 text-indigo-600" />
                          Organization
                        </label>
                      <select
                          className="w-full p-2.5 border border-slate-200 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                        value={selectedOrg}
                        onChange={e => setSelectedOrg(e.target.value)}
                      >
                        <option value="all">All Organizations</option>
                        {organizations.map(org => (
                          <option key={org._id} value={org._id}>{org.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                    
                    {/* Event Type Filter */}
                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-blue-600" />
                        Event Type
                      </label>
                      <select
                        className="w-full p-2.5 border border-slate-200 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
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
                        <ClockIcon className="w-4 h-4 text-emerald-600" />
                        Sort By
                      </label>
                      <select
                        className="w-full p-2.5 border border-slate-200 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                      >
                        <option value="date">Date (Newest)</option>
                        <option value="date-old">Date (Oldest)</option>
                        <option value="name">Event Name</option>
                        <option value="participants">Participants</option>
                      </select>
                    </div>
                  </div>
                </div>

                                    {/* Events Display */}
                  <div className="space-y-6">
                {eventsLoading ? (
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6">
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                          <p className="text-slate-600">Loading events...</p>
                        </div>
                      </div>
                ) : events.length === 0 ? (
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6">
                        <div className="text-center py-12">
                          <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 text-lg">No events created by this organizer{selectedOrg !== "all" ? " in this organization" : ""}.</p>
                        </div>
                      </div>
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
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                              <CalendarIcon className="w-6 h-6" />
                              {eventType === "upcoming" ? "Upcoming Events" : "Upcoming Events"}
                              <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                {upcomingEvents.length}
                              </span>
                            </h2>
                            {upcomingEvents.length === 0 ? (
                              <div className="text-center py-12">
                                <ClockIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 text-lg">No upcoming events.</p>
                              </div>
                            ) : (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {upcomingEvents.slice(0, 6).map(e => (
                                    <div key={e._id} className="organizer-event-card transform hover:-translate-y-2 transition-all duration-300">
                                      <EventCard event={e} />
                                    </div>
                                  ))}
                                </div>
                                {upcomingEvents.length > 6 && (
                                  <div className="text-center mt-6">
                                    <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                                      Show More Upcoming Events ({upcomingEvents.length - 6} more)
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {(eventType === "all" || eventType === "past") && (
                          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6">
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-gray-900 to-slate-900 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                              <CheckCircleIcon className="w-6 h-6" />
                              {eventType === "past" ? "Past Events" : "Past Events"}
                              <span className="ml-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                                {pastEvents.length}
                              </span>
                            </h2>
                            {pastEvents.length === 0 ? (
                              <div className="text-center py-12">
                                <CheckCircleIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 text-lg">No past events found.</p>
                              </div>
                            ) : (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {pastEvents.slice(0, 6).map(e => (
                                    <div key={e._id} className="organizer-event-card transform hover:-translate-y-2 transition-all duration-300">
                                      <EventCard event={e} />
                                    </div>
                                  ))}
                                </div>
                                {pastEvents.length > 6 && (
                                  <div className="text-center mt-6">
                                    <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                                      Show More Past Events ({pastEvents.length - 6} more)
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                            </div>
                          )}

                        {eventType === "live" && (
                          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6">
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-red-900 to-orange-900 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                              <ClockIcon className="w-6 h-6" />
                              Live Events
                              <span className="ml-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                                {filteredEvents.length}
                              </span>
                            </h2>
                            {filteredEvents.length === 0 ? (
                              <div className="text-center py-12">
                                <ClockIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 text-lg">No live events found.</p>
                              </div>
                            ) : (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {filteredEvents.slice(0, 6).map(e => (
                                    <div key={e._id} className="organizer-event-card transform hover:-translate-y-2 transition-all duration-300">
                                      <EventCard event={e} />
                                    </div>
                                  ))}
                                </div>
                                {filteredEvents.length > 6 && (
                                  <div className="text-center mt-6">
                                    <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                                      Show More Live Events ({filteredEvents.length - 6} more)
                                    </button>
                            </div>
                          )}
                        </>
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