import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getOrganizationById,
  getOrganizationTeam
} from '../api/organization';
import { getEventsByOrganization } from '../api/event';
import EventCard from '../components/event/EventCard';
import EventCreationWrapper from '../components/event/EventCreationWrapper';
import Navbar from '../components/layout/Navbar';
import { OrganizationSponsorshipSection } from '../components/sponsor';
import { getProfileImageUrl, getAvatarInitial, getRoleColors, getOrganizationLogoUrl, hasOrganizationLogo } from '../utils/avatarUtils';
import { 
  getSafeUserData, 
  getDisplayName, 
  getUsernameDisplay, 
  getSafeUserName,
  getSafeUserId,
  canNavigateToUser 
} from '../utils/safeUserUtils';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ClipboardDocumentListIcon,
  GlobeAltIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  MapPinIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  EyeIcon,
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  XCircleIcon
} from "@heroicons/react/24/outline";
import axiosInstance from '../api/axiosInstance';
import { showAlert } from '../utils/notifications';
import { formatDate } from '../utils/dateUtils';

// Get organization initials for default logo
const getOrganizationInitials = (name) => {
  if (!name || name.trim().length === 0) return '?';
  
  const trimmedName = name.trim();
  if (trimmedName.length === 1) {
    return trimmedName.toUpperCase();
  }
  
  const words = trimmedName.split(/\s+/);
  if (words.length === 1) {
    return trimmedName.substring(0, 2).toUpperCase();
  }
  
  const initials = words.slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase();
  return initials.length > 0 ? initials : '?';
};



export default function OrganizationPublicPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [team, setTeam] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [upcomingEventsToShow, setUpcomingEventsToShow] = useState(2);
  const [pastEventsToShow, setPastEventsToShow] = useState(2);
  const [joining, setJoining] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [memberEntry, setMemberEntry] = useState(null);
  const [isRejected, setIsRejected] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const eventCreationRef = useRef(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));

  const handleJoinRequest = async () => {
    try {
      setJoining(true);
      await axiosInstance.post(`/api/organizations/${id}/join`);
      setHasRequested(true);
      setIsRejected(false);
      showAlert.success(isRejected ? "Reapplication sent successfully!" : "Join request sent.");
    } catch (err) {
      showAlert.error(err.response?.data?.message || "Request failed.");
    } finally {
      setJoining(false);
    }
  };

  const handleWithdrawRequest = async () => {
    try {
      setWithdrawing(true);
      await axiosInstance.delete(`/api/organizations/${id}/withdraw`);
      setHasRequested(false);
      setIsRejected(false);
      showAlert.success("Join request withdrawn successfully!");
    } catch (err) {
      showAlert.error(err.response?.data?.message || "Withdraw failed.");
    } finally {
      setWithdrawing(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [orgRes, teamRes, eventsRes] = await Promise.all([
          getOrganizationById(id),
          getOrganizationTeam(id),
          getEventsByOrganization(id)
        ]);
        
        // Safely set organization data
        const orgData = orgRes?.data || null;
        setOrg(orgData);
        
        // Safely set team data
        const teamData = teamRes?.data || [];
        setTeam(Array.isArray(teamData) ? teamData : []);
        
        // Safely set events data
        const eventsData = eventsRes || [];
        setEvents(Array.isArray(eventsData) ? eventsData : []);

        // Check if current user is admin of this organization and join status
        if (user) {
          const memberEntry = teamData.find(
            (member) => member?.userId?._id === user?._id
          );
          
          if (memberEntry) {
            setMemberEntry(memberEntry);
            if (memberEntry.status === "pending") {
              setHasRequested(true);
              setIsMember(false);
              setIsCreator(false);
              setIsAdmin(false);
              setIsRejected(false);
            } else if (memberEntry.status === "approved") {
              setHasRequested(false);
              setIsMember(true);
              setIsRejected(false);
              setIsCreator(orgData?.createdBy === user._id);
            setIsAdmin(
                orgData?.createdBy === user._id || memberEntry.isAdmin
            );
            } else if (memberEntry.status === "rejected") {
              setHasRequested(false);
              setIsMember(false);
              setIsCreator(false);
              setIsAdmin(false);
              setIsRejected(true);
            }
          } else {
            setHasRequested(false);
            setIsMember(false);
            setIsCreator(false);
            setIsAdmin(false);
            setIsRejected(false);
          }
        }
      } catch (err) {
        setOrg(null);
        setTeam([]);
        setEvents([]);
      } finally {
        setLoading(false);
        // Trigger animations
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
        <Navbar />
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
        <Navbar />
        <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Organization Not Found</h1>
            <p className="text-slate-600">The organization you're looking for doesn't exist or has been removed.</p>
          </div>
        </div>
      </div>
    );
  }

  const {
    name = '',
    description = '',
    logo = null,
    website = null,
    headOfficeLocation = '',
    orgEmail = '',
    visionMission = '',
    orgPhone = '',
    yearOfEstablishment = '',
    focusArea = '',
    focusAreaOther = '',
    socialLinks = [],
    documents = {}
  } = org || {};

  // Event logic (same as OrganizationPage)
  const now = new Date();
  const upcoming = events && Array.isArray(events) ? events.filter((e) => new Date(e.startDateTime) >= now) : [];
  const past = events && Array.isArray(events) ? events.filter((e) => new Date(e.startDateTime) < now) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
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
        
        /* Compact event cards for organization public page */
        .organization-event-card {
          min-height: 240px !important;
        }
        
        .organization-event-card .event-image {
          height: 120px !important;
        }
        
        .organization-event-card .event-content {
          padding: 12px !important;
        }
        
        .organization-event-card .event-title {
          font-size: 14px !important;
          line-height: 1.3 !important;
        }
        
        .organization-event-card .event-description {
          font-size: 12px !important;
          line-height: 1.4 !important;
        }
        
        /* Drawer Animation Styles */
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .drawer-overlay {
          animation: fadeIn 0.3s ease-out;
        }
        
        .drawer-content {
          animation: slideInFromRight 0.3s ease-out;
        }
      `}</style>
      
      {/* Main Content - 2 Column Layout */}
      <div className="pt-24 w-full px-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 max-w-none xl:h-[calc(100vh-8rem)]">
        {org ? (
          <>
            {/* Left Column - Sponsors, About, Social Media */}
            <div className="xl:col-span-1 space-y-6 xl:overflow-y-auto xl:max-h-screen pr-2 pb-8 custom-scrollbar">
        
              {/* Join Request Section - Only for organizers */}
              {user?.role === "organizer" && org ? (
                <div className={`bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center">
                      <UsersIcon className="w-4 h-4 text-white" />
                    </div>
                    Join Organization
                  </h3>
                  
                  {isCreator ? (
                    <div className="flex items-center gap-2 text-purple-700">
                      <CheckCircleIcon className="w-4 h-4" />
                      <div>
                        <p className="font-semibold text-sm">Creator</p>
                        {org?.createdAt && (
                          <p className="text-xs text-slate-500">Created {formatDate(org.createdAt)}</p>
                        )}
                      </div>
                    </div>
                  ) : isAdmin ? (
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircleIcon className="w-4 h-4" />
                      <div>
                        <p className="font-semibold text-sm">Admin Member</p>
                        {memberEntry?.updatedAt && (
                          <p className="text-xs text-slate-500">Joined {formatDate(memberEntry.updatedAt)}</p>
                        )}
                      </div>
                    </div>
                  ) : isMember ? (
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircleIcon className="w-4 h-4" />
                      <div>
                        <p className="font-semibold text-sm">Member</p>
                        {memberEntry?.updatedAt && (
                          <p className="text-xs text-slate-500">Joined {formatDate(memberEntry.updatedAt)}</p>
                        )}
                      </div>
                    </div>
                  ) : hasRequested ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-amber-700">
                        <ClockIcon className="w-4 h-4" />
                        <p className="font-semibold text-sm">Request Pending</p>
                      </div>
                      <button
                        onClick={handleWithdrawRequest}
                        disabled={withdrawing}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 text-sm"
                      >
                        <XCircleIcon className="w-4 h-4" />
                        {withdrawing ? "Withdrawing..." : "Withdraw Request"}
                      </button>
                    </div>
                  ) : isRejected ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-red-700">
                        <XCircleIcon className="w-4 h-4" />
                        <p className="font-semibold text-sm">Request Rejected</p>
                      </div>
                      <button
                        onClick={handleJoinRequest}
                        disabled={joining}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 text-sm"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                        {joining ? "Reapplying..." : "Reapply"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleJoinRequest}
                      disabled={joining}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 text-sm"
                    >
                      <UsersIcon className="w-4 h-4" />
                      {joining ? "Sending..." : "Request to Join"}
                    </button>
                  )}
                </div>
              ) : user && user.role !== "organizer" && org ? (
                <div className={`bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center">
                      <UsersIcon className="w-4 h-4 text-white" />
                    </div>
                    Join Organization
                  </h3>
                  <p className="text-sm text-slate-600">
                    Only organizers can join organizations. Switch to organizer account to request membership.
                  </p>
                </div>
              ) : !user && org ? (
                <div className={`bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center">
                      <UsersIcon className="w-4 h-4 text-white" />
                    </div>
                    Join Organization
                  </h3>
                  <p className="text-sm text-slate-600">
                    <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign in</a> as an organizer to request membership.
                  </p>
                </div>
                            ) : null}

              {/* Quick Actions - Only for members/admins */}
              {(isAdmin || isMember) && org && (
                <div className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h3>
                    <div className="space-y-2">
                      <button
                        className="w-full flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 text-sm"
                        onClick={() => setShowEventForm(true)}
                      >
                        <PlusIcon className="w-4 h-4" />
                        Create New Event
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            className="w-full flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 text-sm"
                            onClick={() => navigate(`/organization/${id}/settings`)}
                          >
                            <Cog6ToothIcon className="w-4 h-4" />
                            Settings
                          </button>
                          <button
                            className="w-full flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 text-sm"
                            onClick={() => navigate(`/organization/${id}/applications`)}
                          >
                            <ClipboardDocumentListIcon className="w-4 h-4" />
                            View Applications
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                                </div>
              )}

              {/* Sponsorship Section */}
              {org && (
                <div className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <OrganizationSponsorshipSection 
                    organizationId={id}
                    organization={org}
                    isAdmin={isAdmin}
                    isCreator={isCreator}
                  />
                </div>
              )}

                            {/* About Section */}
              {org && (
                <div className={`bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <BuildingOfficeIcon className="w-4 h-4 text-white" />
                    </div>
                    About Organization
                  </h3>
                  
                  {visionMission && (
                    <div className="mb-3 p-2.5 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-lg border border-blue-100">
                      <p className="text-slate-700 text-sm leading-relaxed font-medium">{visionMission}</p>
                    </div>
                  )}
            
                  <div className="space-y-2">
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-4 h-4 bg-blue-100 rounded-md flex items-center justify-center">
                          <MapPinIcon className="w-3 h-3 text-blue-600" />
                        </div>
                        <div className="font-semibold text-slate-700 text-xs">Head Office</div>
                      </div>
                      <div className="text-slate-600 text-xs ml-6">{headOfficeLocation || 'Not specified'}</div>
                    </div>
                    
                    {orgEmail && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-4 h-4 bg-green-100 rounded-md flex items-center justify-center">
                            <EnvelopeIcon className="w-3 h-3 text-green-600" />
                          </div>
                          <div className="font-semibold text-slate-700 text-xs">Email</div>
                        </div>
                        <div className="text-slate-600 text-xs ml-6">{orgEmail}</div>
                      </div>
                    )}
                    
                    {orgPhone && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-4 h-4 bg-purple-100 rounded-md flex items-center justify-center">
                            <PhoneIcon className="w-3 h-3 text-purple-600" />
                          </div>
                          <div className="font-semibold text-slate-700 text-xs">Phone</div>
                        </div>
                        <div className="text-slate-600 text-xs ml-6">{orgPhone}</div>
                      </div>
                    )}
                    
                    {yearOfEstablishment && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-4 h-4 bg-orange-100 rounded-md flex items-center justify-center">
                            <CalendarIcon className="w-3 h-3 text-orange-600" />
                          </div>
                          <div className="font-semibold text-slate-700 text-xs">Established</div>
                        </div>
                        <div className="text-slate-600 text-xs ml-6">{yearOfEstablishment}</div>
                      </div>
                    )}
                    
                    {focusArea && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-4 h-4 bg-emerald-100 rounded-md flex items-center justify-center">
                            <BuildingOfficeIcon className="w-3 h-3 text-emerald-600" />
                          </div>
                          <div className="font-semibold text-slate-700 text-xs">Focus Area</div>
                        </div>
                        <div className="text-slate-600 text-xs ml-6">{focusArea === 'Other' ? focusAreaOther : focusArea}</div>
                      </div>
                    )}
                    
                    {website && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-4 h-4 bg-cyan-100 rounded-md flex items-center justify-center">
                            <GlobeAltIcon className="w-3 h-3 text-cyan-600" />
                          </div>
                          <div className="font-semibold text-slate-700 text-xs">Website</div>
                        </div>
                        <a 
                          href={website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors text-xs ml-6"
                        >
                          <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                          Visit Website
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

        {/* Social Media Links */}
              {org && (
                <div className={`bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-lg border border-white/20 transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <GlobeAltIcon className="w-4 h-4 text-white" />
            </div>
                  Social Media
                </h3>
                <div className="flex flex-wrap gap-2">
            {socialLinks && Array.isArray(socialLinks) && socialLinks.length > 0 && socialLinks.map((link, idx) => {
              if (!link) return null;
              
              // Determine social media platform and icon
              const getSocialIcon = (url) => {
                const lowerUrl = url.toLowerCase();
                if (lowerUrl.includes('instagram.com') || lowerUrl.includes('instagram')) {
                  return (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  );
                } else if (lowerUrl.includes('linkedin.com') || lowerUrl.includes('linkedin')) {
                  return (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  );
                } else if (lowerUrl.includes('twitter.com') || lowerUrl.includes('twitter') || lowerUrl.includes('x.com')) {
                  return (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  );
                } else if (lowerUrl.includes('facebook.com') || lowerUrl.includes('facebook')) {
                  return (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  );
                } else if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtube')) {
                  return (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  );
                } else {
                        return <ArrowTopRightOnSquareIcon className="w-4 h-4" />;
                }
              };

              const getSocialGradient = (url) => {
                const lowerUrl = url.toLowerCase();
                if (lowerUrl.includes('instagram.com') || lowerUrl.includes('instagram')) {
                  return 'from-pink-500 to-purple-600';
                } else if (lowerUrl.includes('linkedin.com') || lowerUrl.includes('linkedin')) {
                  return 'from-blue-600 to-blue-700';
                } else if (lowerUrl.includes('twitter.com') || lowerUrl.includes('twitter') || lowerUrl.includes('x.com')) {
                  return 'from-blue-400 to-blue-500';
                } else if (lowerUrl.includes('facebook.com') || lowerUrl.includes('facebook')) {
                  return 'from-blue-600 to-blue-800';
                } else if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtube')) {
                  return 'from-red-500 to-red-600';
                } else {
                  return 'from-purple-500 to-purple-600';
                }
              };

              return (
                <a 
                  key={idx} 
                  href={link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                        className="group relative flex items-center justify-center w-10 h-10 bg-gradient-to-r text-white rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-110 hover:-translate-y-1 shadow-md"
                  style={{ background: `linear-gradient(135deg, ${getSocialGradient(link).includes('pink') ? '#ec4899' : getSocialGradient(link).includes('blue') ? '#3b82f6' : getSocialGradient(link).includes('red') ? '#ef4444' : '#8b5cf6'}, ${getSocialGradient(link).includes('purple') ? '#9333ea' : getSocialGradient(link).includes('blue') ? '#1d4ed8' : getSocialGradient(link).includes('red') ? '#dc2626' : '#7c3aed'})` }}
                  title={link}
                >
                  {getSocialIcon(link)}
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-10">
                    {link && typeof link === 'string' && link.length > 30 ? link.substring(0, 30) + '...' : link}
                  </div>
                </a>
              );
            })}
            {(!socialLinks || !Array.isArray(socialLinks) || socialLinks.length === 0) && (
                    <div className="text-center py-4 w-full">
                      <GlobeAltIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">No social media links provided.</p>
              </div>
            )}
          </div>
        </div>
              )}

            </div>

            {/* Right Column - Organization Info, Events */}
            <div className="xl:col-span-3 xl:overflow-y-auto xl:max-h-screen pr-2 pb-8 custom-scrollbar">
              
              {/* Organization Header */}
              <div className={`mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                    <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-lg border-4 border-white/20">
                      {hasOrganizationLogo(org) ? (
                        <img src={getOrganizationLogoUrl(org)} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center text-white text-4xl font-bold relative">
                          {getOrganizationInitials(name)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent mb-4">
                        {name || 'Organization'}
                      </h1>
                      <p className="text-slate-700 text-lg mb-4">{description || 'No description available.'}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
                        onClick={() => setDrawerOpen(true)}
                      >
                        <EyeIcon className="w-4 h-4" />
                        View Organizers
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
                            onClick={() => navigate(`/organization/${id}/settings`)}
                          >
                            <Cog6ToothIcon className="w-4 h-4" />
                            Settings
                          </button>
                          <button
                            className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
                            onClick={() => navigate(`/organization/${id}/applications`)}
                          >
                            <ClipboardDocumentListIcon className="w-4 h-4" />
                            View Applications
                          </button>
                        </>
                      )}
                    </div>
          </div>
        </div>
              </div>

              {/* Upcoming Events */}
              <div className={`mb-8 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                    <CalendarIcon className="w-6 h-6" />
              Upcoming Events ({upcoming && Array.isArray(upcoming) ? upcoming.length : 0})
            </h2>
            {!upcoming || !Array.isArray(upcoming) || upcoming.length === 0 ? (
                    <p className="text-slate-600 text-center py-8">No upcoming events.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {upcoming.slice(0, upcomingEventsToShow).map((e) => (
                          <div key={e._id} className="organization-event-card">
                            <EventCard event={e} />
              </div>
                   ))}
                 </div>
                      
                      {upcoming.length > upcomingEventsToShow && (
                   <div className="text-center mt-6">
                     <button
                       onClick={() => setUpcomingEventsToShow(upcomingEventsToShow + 2)}
                       className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                     >
                            Show More Events ({upcoming.length - upcomingEventsToShow} more)
                     </button>
                   </div>
                 )}
                    </>
            )}
          </div>
              </div>

              {/* Past Events */}
              <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                    <CalendarIcon className="w-6 h-6" />
              Past Events ({past && Array.isArray(past) ? past.length : 0})
            </h2>
            {!past || !Array.isArray(past) || past.length === 0 ? (
                    <p className="text-slate-600 text-center py-8">No past events found.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {past.slice(0, pastEventsToShow).map((e) => (
                          <div key={e._id} className="organization-event-card">
                            <EventCard event={e} />
              </div>
                   ))}
                 </div>
                      
                      {past.length > pastEventsToShow && (
                   <div className="text-center mt-6">
                     <button
                       onClick={() => setPastEventsToShow(pastEventsToShow + 2)}
                       className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                     >
                            Show More Events ({past.length - pastEventsToShow} more)
                     </button>
                   </div>
                 )}
                    </>
                  )}
                </div>
              </div>

            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-gradient-to-r from-red-500 to-red-600 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <XMarkIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Organization not found
              </h3>
              <p className="text-slate-600">
                The organization you're looking for doesn't exist or has been removed.
              </p>
            </div>
               </div>
            )}
          </div>
        </div>

        {/* Drawer for Organizers */}
        {drawerOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-end z-50 drawer-overlay">
            <div className="bg-white/95 backdrop-blur-sm w-full max-w-md h-full shadow-2xl p-6 relative overflow-y-auto drawer-content">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <UserGroupIcon className="w-5 h-5 text-white" />
                  </div>
                  Organizers
                </h2>
                <button
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                  onClick={() => setDrawerOpen(false)}
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              {team && Array.isArray(team) && team.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserGroupIcon className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-lg">No organizers found.</p>
                </div>
              )}
              
              {team && Array.isArray(team) && team.filter(member => member.status === 'approved').map((member) => {
                const safeUser = getSafeUserData(member.userId);
                const canNavigate = canNavigateToUser(member.userId);
                
                return (
                  <div 
                    key={member._id} 
                    className={`flex items-center gap-4 mb-4 p-4 rounded-xl border border-slate-200 transition-all duration-200 group ${
                      safeUser.isDeleted ? 'opacity-75 bg-gray-50 cursor-default' : 'cursor-pointer hover:bg-blue-50'
                    }`}
                    onClick={() => canNavigate && navigate(`/organizer/${getSafeUserId(member.userId)}`)}
                  >
                    {getProfileImageUrl(safeUser) ? (
                      <img 
                        src={getProfileImageUrl(safeUser)} 
                        alt={getSafeUserName(safeUser)} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-100 to-emerald-100 flex items-center justify-center border-2 border-blue-200 shadow-md">
                        <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">{getAvatarInitial(safeUser)}</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className={`font-semibold transition-colors ${
                        safeUser.isDeleted ? 'text-gray-600' : 'text-slate-900 group-hover:text-blue-700'
                      }`}>
                        {getSafeUserName(safeUser)}
                        {safeUser.isDeleted && (
                          <span className="ml-2 px-2 py-1 bg-gray-500 text-white text-xs rounded-full font-bold">Deleted User</span>
                        )}
                      </div>
                      <div className={`text-sm ${
                        safeUser.isDeleted ? 'text-gray-500' : 'text-blue-600'
                      }`}>
                        {safeUser.username ? `@${safeUser.username}` : ''}
                      </div>
                      <div className={`text-sm ${
                        safeUser.isDeleted ? 'text-gray-400' : 'text-slate-600'
                      }`}>
                        {safeUser.email || 'N/A'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* Event creation modal */}
      {showEventForm && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-hidden"
          style={{ 
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '2rem',
            paddingBottom: '2rem'
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative border border-white/20"
            style={{
              maxHeight: 'calc(100vh - 4rem)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white rounded-t-2xl px-6 py-4 border-b border-slate-200 z-[100] shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Create New Event</h2>
                <button
                  className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:text-red-600 transition-colors"
                  onClick={async () => {
                    if (eventCreationRef.current && eventCreationRef.current.close) {
                      await eventCreationRef.current.close();
                    } else {
                      setShowEventForm(false);
                    }
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div 
              className="flex-1 overflow-y-auto p-6"
              style={{ 
                scrollbarWidth: 'thin',
                scrollbarColor: '#CBD5E0 #F7FAFC'
              }}
            >
              <EventCreationWrapper
                ref={eventCreationRef}
                selectedOrgId={id}
                onClose={() => setShowEventForm(false)}
                onEventCreated={(eventData) => {
                  // Refresh the events list by refetching
                  const fetchEvents = async () => {
                    try {
                      const eventsRes = await getEventsByOrganization(id);
                      const eventsData = eventsRes || [];
                      setEvents(Array.isArray(eventsData) ? eventsData : []);
                    } catch (error) {
                      console.error('Error fetching events:', error);
                    }
                  };
                  fetchEvents();
                  showAlert.success("🎉 Event created successfully and added to the organization!");
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
