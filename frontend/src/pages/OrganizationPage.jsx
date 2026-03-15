// src/pages/OrganizationPage.jsx

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Navbar from "../components/layout/Navbar";
import Avatar from "../components/common/Avatar";
import { approveTeamMember, rejectTeamMember, getOrganizationOrganizers } from "../api/organization";
import EventCreationWrapper from "../components/event/EventCreationWrapper";
import EventCard from "../components/event/EventCard";
import { OrganizationSponsorshipSection } from "../components/sponsor";
import { formatDate } from "../utils/dateUtils";
import {
  PlusIcon, 
  Cog6ToothIcon, 
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  UsersIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  UserGroupIcon,
  XMarkIcon,
  MapPinIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { showAlert } from "../utils/notifications";
import { getProfileImageUrl, getAvatarInitial, getOrganizationLogoUrl, hasOrganizationLogo } from "../utils/avatarUtils";
import { 
  getSafeUserData, 
  getSafeUserName,
  getSafeUserId,
  canNavigateToUser 
} from "../utils/safeUserUtils";

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

export default function OrganizationPage() {
  const { id } = useParams();
  const [organization, setOrganization] = useState(null);
  const [memberEntry, setMemberEntry] = useState(null);
  const [events, setEvents] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const eventCreationRef = useRef(null);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showEventForm) {
      // Save current scroll position
      const scrollY = window.scrollY;
      
      // Prevent body scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // Restore body scroll
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [showEventForm]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [organizersError, setOrganizersError] = useState("");
  const [showOrganizers, setShowOrganizers] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [upcomingVisible, setUpcomingVisible] = useState(0);
  const [pastVisible, setPastVisible] = useState(0);
  const [gridColumns, setGridColumns] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setOrganizersError("");


        
        const [orgRes, eventRes] = await Promise.all([
          axiosInstance.get(`/api/organizations/${id}`),
          axiosInstance.get(`/api/events/organization/${id}`),
        ]);



        // Safely set organization data
        const orgData = orgRes?.data || null;
        setOrganization(orgData);
        
        // Ensure events is always an array
        const safeEvents = Array.isArray(eventRes?.data) ? eventRes.data : [];
        setEvents(safeEvents);

        if (user?.role === "organizer") {

          const teamRes = await axiosInstance.get(`/api/organizations/${id}/team`);
          const team = teamRes?.data || [];

          // Ensure team is always an array
          const safeTeam = Array.isArray(team) ? team : [];
          
          const memberEntry = safeTeam.find(
            (member) => member?.userId?._id === user?._id
          );

          if (memberEntry) {
            setMemberEntry(memberEntry);
            if (memberEntry.status === "pending") {
              setHasRequested(true);
              setIsMember(false);
              setIsCreator(false);
              setIsAdmin(false);
            } else if (memberEntry.status === "approved") {
              setHasRequested(false);
              setIsMember(true);
              setIsCreator(orgData?.createdBy === user._id);
              setIsAdmin(
                orgData?.createdBy === user._id || memberEntry.isAdmin
              );
            }
          } else {
            setHasRequested(false);
            setIsMember(false);
            setIsCreator(false);
            setIsAdmin(false);
          }

          const pending = safeTeam.filter((member) => member?.status === "pending");
          setPendingRequests(pending);
          
          // Set team data for the drawer
          setTeam(safeTeam);
        }
        // Fetch organizers for this org (all roles) only if token exists
        const token = localStorage.getItem("token");
        if (token) {
          try {
            const organizersRes = await getOrganizationOrganizers(id);

            
            // Ensure organizers is always an array
            if (organizersRes?.data) {
              const organizersData = Array.isArray(organizersRes.data) ? organizersRes.data : [];
              setOrganizers(organizersData);
            } else {
              setOrganizers([]);
            }
          } catch (error) {
            console.error("❌ Error fetching organizers:", error);
            setOrganizersError("Failed to load organizers");
            setOrganizers([]); // Ensure it's always an array
          }
        } else {
          setOrganizers([]); // Ensure it's always an array when no token
        }
      } catch (error) {
        console.error("❌ Error fetching organization data:", error);

        
        setOrganizersError("Failed to load organization data");
      } finally {
        setLoading(false);
        // Trigger animations
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
      }
    };

    fetchData();
  }, [id]);

  // Calculate optimal initial display based on grid columns
  const calculateOptimalDisplay = (totalEvents, columns) => {
    if (totalEvents === 0) return 0;
    
    // Show 1 complete row by default
    const oneRow = columns;
    
    // If we have less than 1 complete row, show all
    if (totalEvents <= oneRow) return totalEvents;
    
    // If we have more than 1 complete row, show 1 complete row
    return oneRow;
  };

  // Smart show more/less functions
  const showMore = (currentVisible, totalEvents, columns) => {
    const currentRows = Math.ceil(currentVisible / columns);
    const nextRow = currentRows + 1;
    const nextVisible = nextRow * columns;
    
    // Don't exceed total events
    return Math.min(nextVisible, totalEvents);
  };

  const showLess = (currentVisible, columns) => {
    const currentRows = Math.ceil(currentVisible / columns);
    if (currentRows <= 1) return columns; // Keep at least 1 row
    
    const prevRow = currentRows - 1;
    return prevRow * columns;
  };

  // Update grid columns based on screen size
  useEffect(() => {
    const updateGridColumns = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setGridColumns(3);
      } else if (window.innerWidth >= 768) { // md breakpoint
        setGridColumns(2);
      } else {
        setGridColumns(1);
      }
    };

    updateGridColumns();
    window.addEventListener('resize', updateGridColumns);
    return () => window.removeEventListener('resize', updateGridColumns);
  }, []);

  const handleJoinRequest = async () => {
    try {
      setJoining(true);
      await axiosInstance.post(`/api/organizations/${id}/join`);
      setHasRequested(true);
      showAlert.success("Join request sent.");
    } catch (err) {
      showAlert.error(err.response?.data?.message || "Request failed.");
    } finally {
      setJoining(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await approveTeamMember(id, userId);
      showAlert.success("User approved successfully");
      setPendingRequests((prev) => prev.filter((m) => m.userId._id !== userId));
    } catch (err) {
      showAlert.error(err.response?.data?.message || "Approval failed");
    }
  };

  const handleReject = async (userId) => {
    try {
      await rejectTeamMember(id, userId);
      showAlert.success("User rejected successfully");
      setPendingRequests((prev) => prev.filter((m) => m.userId._id !== userId));
    } catch (err) {
      showAlert.error(err.response?.data?.message || "Rejection failed");
    }
  };

  // Add this function to remove a pending request by userId
  const removePendingRequest = (userId) => {
    setPendingRequests((prev) => prev.filter((m) => m.userId._id !== userId));
  };

  const now = new Date();
  const upcoming = events && Array.isArray(events) ? events.filter((e) => new Date(e.startDateTime) >= now) : [];
  const past = events && Array.isArray(events) ? events.filter((e) => new Date(e.startDateTime) < now) : [];

  // Set optimal initial display when events or grid columns change
  useEffect(() => {
    if (upcoming && Array.isArray(upcoming) && upcoming.length > 0) {
      setUpcomingVisible(calculateOptimalDisplay(upcoming.length, gridColumns));
    }
    if (past && Array.isArray(past) && past.length > 0) {
      setPastVisible(calculateOptimalDisplay(past.length, gridColumns));
    }
  }, [upcoming.length, past.length, gridColumns]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 relative">
      <Navbar />
      
      {/* Show Organizers Button - fixed top right */}
      {organizers && Array.isArray(organizers) && organizers.length > 0 && !organizersError && (
        <button
          className={`fixed z-50 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200
            top-[calc(2cm+1.5rem)]
            ${showOrganizers ? 'right-[340px]' : 'right-8'}
          `}
          style={{ transition: 'right 0.3s cubic-bezier(0.4,0,0.2,1)' }}
          onClick={() => setShowOrganizers((prev) => !prev)}
        >
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5" />
            {showOrganizers ? 'Hide Organizers' : 'Show Organizers'}
          </div>
        </button>
      )}
      
      {/* Organizers Drawer */}
      {organizers && Array.isArray(organizers) && organizers.length > 0 && !organizersError && (
        <div
          className={`fixed top-0 right-0 h-full w-80 bg-white/90 backdrop-blur-sm shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${showOrganizers ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-700 to-emerald-700 bg-clip-text text-transparent">Organizers</h2>
            <button
              className="text-slate-500 hover:text-red-600 text-2xl font-bold transition-colors duration-200"
              onClick={() => setShowOrganizers(false)}
              aria-label="Close organizers drawer"
            >
              ×
            </button>
          </div>
          <div className="overflow-y-auto h-[calc(100%-64px)] px-6 py-4 space-y-4">
            {organizers.map((org) => (
              <div
                key={org.userId._id}
                className="flex items-center bg-white/70 backdrop-blur-sm rounded-xl shadow-md p-4 border border-white/20 hover:shadow-lg transition-all duration-300 cursor-pointer hover:bg-blue-50/50"
                onClick={() => navigate(`/organizer/${org.userId._id}`)}
              >
                <Avatar user={org.userId} size="lg" role="organizer" className="mr-4" />
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-900 text-lg">{org.userId.name}</span>
                  {org.userId.username && (
                    <span className="text-sm text-slate-600">@{org.userId.username}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
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
        
        /* Compact event cards for organization page */
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
        {organization ? (
          <>
              {/* Left Column - Actions & Key Info */}
              <div className="xl:col-span-1 space-y-6 xl:overflow-y-auto xl:max-h-screen pr-2 pb-8 custom-scrollbar">

            {/* Join Status Card */}
            {user?.role === "organizer" && organization && (
              <div className={`transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20">
                  {isAdmin ? (
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircleIcon className="w-5 h-5" />
                      <div>
                        <p className="font-semibold text-sm">Admin Member</p>
                        {memberEntry?.updatedAt && (
                          <p className="text-xs text-slate-500">Joined {formatDate(memberEntry.updatedAt)}</p>
                        )}
                      </div>
                    </div>
                  ) : isMember ? (
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircleIcon className="w-5 h-5" />
                      <div>
                        <p className="font-semibold text-sm">Member</p>
                        {memberEntry?.updatedAt && (
                          <p className="text-xs text-slate-500">Joined {formatDate(memberEntry.updatedAt)}</p>
                        )}
                      </div>
                    </div>
                  ) : hasRequested ? (
                    <div className="flex items-center gap-2 text-amber-700">
                      <ClockIcon className="w-5 h-5" />
                      <p className="font-semibold text-sm">Request Pending</p>
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
              </div>
            )}

            {/* Action Buttons */}
            {organization && (
              <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    {(isAdmin || isMember) && (
                    <button
                      className="w-full flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 text-sm"
                      onClick={() => setShowEventForm(true)}
                    >
                      <PlusIcon className="w-4 h-4" />
                      Create New Event
                    </button>
                  )}

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
            {organization && (
              <div className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <OrganizationSponsorshipSection 
                  organizationId={id}
                  organization={organization}
                  isAdmin={isAdmin}
                  isCreator={isCreator}
                />
              </div>
            )}

            {/* Pending Requests */}
            {isAdmin && pendingRequests && Array.isArray(pendingRequests) && pendingRequests.length > 0 && (
              <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Pending Requests ({pendingRequests.length})</h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                    {pendingRequests.map((req) => (
                      <div
                        key={req?.userId?._id}
                        data-userid={req?.userId?._id}
                        className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white/50 backdrop-blur-sm rounded-lg p-3 border border-white/20 hover:shadow-md transition-all duration-300 gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {req?.userId?.profileImage ? (
                            <img
                              src={getProfileImageUrl(req.userId)}
                              alt="Profile"
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-100 to-emerald-100 flex items-center justify-center border-2 border-blue-200 shadow-sm flex-shrink-0">
                              <span className="text-sm font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                                {req?.userId?.name?.[0] || '?'}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 text-sm truncate">
                              {req?.userId?.name || 'Unknown User'}
                            </p>
                            <div className="text-xs text-slate-500 space-y-1">
                              {req?.userId?.username && (
                                <p className="truncate">@{req.userId.username}</p>
                              )}
                              <p className="truncate" title={req?.userId?.email}>
                                {req?.userId?.email || 'No email'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end sm:justify-start">
                          <button
                            className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors duration-200 flex items-center justify-center"
                            onClick={() => handleApprove(req?.userId?._id)}
                            title="Approve"
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors duration-200 flex items-center justify-center"
                            onClick={() => handleReject(req?.userId?._id)}
                            title="Reject"
                          >
                            <XCircleIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* About Section */}
            {organization && (
              <div className={`transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20">
                  <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <BuildingOfficeIcon className="w-4 h-4 text-white" />
                    </div>
                    About Organization
                  </h3>
                  
                  {organization.visionMission && (
                    <div className="mb-3 p-2.5 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-lg border border-blue-100">
                      <p className="text-slate-700 text-sm leading-relaxed font-medium">{organization.visionMission}</p>
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
                      <div className="text-slate-600 text-xs ml-6">{organization.headOfficeLocation || 'Not specified'}</div>
                    </div>
                    
                    {organization.orgEmail && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-4 h-4 bg-green-100 rounded-md flex items-center justify-center">
                            <EnvelopeIcon className="w-3 h-3 text-green-600" />
                          </div>
                          <div className="font-semibold text-slate-700 text-xs">Email</div>
                        </div>
                        <div className="text-slate-600 text-xs ml-6">{organization.orgEmail}</div>
                      </div>
                    )}
                    
                    {organization.orgPhone && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-4 h-4 bg-purple-100 rounded-md flex items-center justify-center">
                            <PhoneIcon className="w-3 h-3 text-purple-600" />
                          </div>
                          <div className="font-semibold text-slate-700 text-xs">Phone</div>
                        </div>
                        <div className="text-slate-600 text-xs ml-6">{organization.orgPhone}</div>
                      </div>
                    )}
                    
                    {organization.yearOfEstablishment && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-4 h-4 bg-orange-100 rounded-md flex items-center justify-center">
                            <CalendarIcon className="w-3 h-3 text-orange-600" />
                          </div>
                          <div className="font-semibold text-slate-700 text-xs">Established</div>
                        </div>
                        <div className="text-slate-600 text-xs ml-6">{organization.yearOfEstablishment}</div>
                      </div>
                    )}
                    
                    {organization.focusArea && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-4 h-4 bg-emerald-100 rounded-md flex items-center justify-center">
                            <BuildingOfficeIcon className="w-3 h-3 text-emerald-600" />
                          </div>
                          <div className="font-semibold text-slate-700 text-xs">Focus Area</div>
                        </div>
                        <div className="text-slate-600 text-xs ml-6">{organization.focusArea === 'Other' ? organization.focusAreaOther : organization.focusArea}</div>
                      </div>
                    )}
                    
                    {organization.website && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/30 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-4 h-4 bg-cyan-100 rounded-md flex items-center justify-center">
                            <GlobeAltIcon className="w-3 h-3 text-cyan-600" />
                          </div>
                          <div className="font-semibold text-slate-700 text-xs">Website</div>
                        </div>
                        <a 
                          href={organization.website} 
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
              </div>
            )}

          </div>

          {/* Right Column - Main Content */}
          <div className="xl:col-span-3 xl:overflow-y-auto xl:max-h-screen pr-2 pb-8 custom-scrollbar">
            
            {/* Organization Header */}
            <div className={`mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                  <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-lg border-4 border-white/20">
                    {hasOrganizationLogo(organization) ? (
                      <img src={getOrganizationLogoUrl(organization)} alt={organization?.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center text-white text-4xl font-bold relative">
                        {getOrganizationInitials(organization?.name)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent mb-4">
                      {organization?.name || 'Organization'}
                    </h1>
                    <p className="text-slate-700 text-lg mb-4">{organization?.description || 'No description available.'}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {organization?.website && (
                      <a
                        href={organization.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
                      >
                        <GlobeAltIcon className="w-4 h-4" />
                        Visit Website
                      </a>
                    )}

                    {organization?.verifiedStatus && (
                      <div className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm">
                        <ShieldCheckIcon className="w-4 h-4" />
                        {organization.verifiedStatus}
                      </div>
                    )}

                    <button
                      className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
                      onClick={() => setDrawerOpen(true)}
                    >
                      <EyeIcon className="w-4 h-4" />
                      View Organizers
                    </button>
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
                      {upcoming.slice(0, upcomingVisible).map((e) => (
                        <div key={e._id} className="organization-event-card">
                          <EventCard event={e} />
                        </div>
                      ))}
                    </div>
                    
                    {/* Smart Show More/Less Controls */}
                    {upcoming.length > upcomingVisible && (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                        {/* Show More Button */}
                        <div className="relative">
                          <button
                            className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold border-0 overflow-hidden"
                            onClick={() => setUpcomingVisible(showMore(upcomingVisible, upcoming.length, gridColumns))}
                          >
                            {/* Animated background overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                            
                            <span className="relative flex items-center justify-center gap-2">
                              <span className="text-sm sm:text-base">Show More Events</span>
                              <ChevronDownIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-y-1 transition-transform duration-300" />
                            </span>
                          </button>
                          
                          {/* Event count badge - positioned outside button container */}
                          <div className="absolute -top-2 -right-2 bg-white text-blue-600 text-xs font-bold px-2 py-1 rounded-full shadow-md border-2 border-blue-500 z-10">
                            +{Math.min(gridColumns, upcoming.length - upcomingVisible)}
                          </div>
                        </div>
                        
                        {/* Show Less Button */}
                        {upcomingVisible > gridColumns && (
                          <button
                            className="group relative px-8 py-4 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold border-2 border-slate-300 hover:border-slate-400"
                            onClick={() => setUpcomingVisible(showLess(upcomingVisible, gridColumns))}
                          >
                            <span className="flex items-center justify-center gap-2">
                              <ChevronUpIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-y-1 transition-transform duration-300" />
                              <span className="text-sm sm:text-base">Show Less Events</span>
                            </span>
                            
                            {/* Event count badge */}
                            <div className="absolute -top-2 -right-2 bg-white text-slate-600 text-xs font-bold px-2 py-1 rounded-full shadow-md border-2 border-slate-400">
                              -{gridColumns}
                            </div>
                          </button>
                        )}
                        
                        {/* Events Info Display */}
                        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                          <span>
                            Showing <span className="font-semibold text-slate-700">{upcomingVisible}</span> of <span className="font-semibold text-slate-700">{upcoming.length}</span> events
                          </span>
                        </div>
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
                  <ClockIcon className="w-6 h-6" />
                  Past Events ({past && Array.isArray(past) ? past.length : 0})
                </h2>
                {!past || !Array.isArray(past) || past.length === 0 ? (
                  <p className="text-slate-600 text-center py-8">No past events found.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {past.slice(0, pastVisible).map((e) => (
                        <div key={e._id} className="organization-event-card">
                          <EventCard event={e} />
                        </div>
                      ))}
                    </div>
                    
                    {/* Smart Show More/Less Controls */}
                    {past.length > pastVisible && (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                        {/* Show More Button */}
                        <div className="relative">
                          <button
                            className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold border-0 overflow-hidden"
                            onClick={() => setPastVisible(showMore(pastVisible, past.length, gridColumns))}
                          >
                            {/* Animated background overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                            
                            <span className="relative flex items-center justify-center gap-2">
                              <span className="text-sm sm:text-base">Show More Events</span>
                              <ChevronDownIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-y-1 transition-transform duration-300" />
                            </span>
                          </button>
                          
                          {/* Event count badge - positioned outside button container */}
                          <div className="absolute -top-2 -right-2 bg-white text-blue-600 text-xs font-bold px-2 py-1 rounded-full shadow-md border-2 border-blue-500 z-10">
                            +{Math.min(gridColumns, past.length - pastVisible)}
                          </div>
                        </div>
                        
                        {/* Show Less Button */}
                        {pastVisible > gridColumns && (
                          <button
                            className="group relative px-8 py-4 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold border-2 border-slate-300 hover:border-slate-400"
                            onClick={() => setPastVisible(showLess(pastVisible, gridColumns))}
                          >
                            <span className="flex items-center justify-center gap-2">
                              <ChevronUpIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-y-1 transition-transform duration-300" />
                              <span className="text-sm sm:text-base">Show Less Events</span>
                            </span>
                            
                            {/* Event count badge */}
                            <div className="absolute -top-2 -right-2 bg-white text-slate-600 text-xs font-bold px-2 py-1 rounded-full shadow-md border-2 border-slate-400">
                              -{gridColumns}
                            </div>
                          </button>
                        )}
                        
                        {/* Events Info Display */}
                        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                          <span>
                            Showing <span className="font-semibold text-slate-700">{pastVisible}</span> of <span className="font-semibold text-slate-700">{past.length}</span> events
                          </span>
                        </div>
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
                <XCircleIcon className="w-8 h-8 text-white" />
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
                  fetchEvents();
                  showAlert.success("🎉 Event created successfully and added to the organization!");
                }}
              />
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
