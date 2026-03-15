// src/pages/OrganizerDashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Navbar from "../components/layout/Navbar";
import EventCreationWrapper from "../components/event/EventCreationWrapper";
import EventCard from "../components/event/EventCard";
import SimpleEventCalendar from "../components/calendar/SimpleEventCalendar";
import OrganizationSelectionModal from "../components/event/OrganizationSelectionModal";
import Footer from "../components/layout/Footer";
import { 
  PlusIcon, 
  CalendarIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { showAlert } from '../utils/notifications';

export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [events, setEvents] = useState([]);
  const [upcomingVisible, setUpcomingVisible] = useState(0);
  const [pastVisible, setPastVisible] = useState(0);
  const [gridColumns, setGridColumns] = useState(1);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [showOrgSelectionModal, setShowOrgSelectionModal] = useState(false);
  const [selectedOrgForEvent, setSelectedOrgForEvent] = useState(null);
  const calendarRef = useRef(null);

  useEffect(() => {
    // Animation on mount
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Fetch user profile
    axiosInstance
      .get("/api/user/profile")
      .then((res) => setUser(res.data.user))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoadingEvents(true);
    axiosInstance
      .get("/api/events/all-events")
      .then((res) => {
        setEvents(res.data);
        setLoadingEvents(false);
      })
      .catch((err) => {
        console.error("Error fetching events:", err);
        setLoadingEvents(false);
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // ✅ Use optimized backend route that returns only approved orgs
    axiosInstance
      .get("/api/organizations/approved")
      .then((res) => {
        // Handle new API response format
        const orgs = res.data.data || res.data;
        setOrganizations(orgs);
        setLoadingOrgs(false);
      })
      .catch((err) => {
        console.error("Error fetching approved organizations:", err);
        // Handle 404 or other errors gracefully
        setOrganizations([]);
        setLoadingOrgs(false);
      });
  }, [user]);

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

  // Handle organization selection for event creation
  const handleOrganizationSelected = (orgId) => {
    setSelectedOrgForEvent(orgId);
    setShowEventModal(true);
  };

  // Handle event creation success
  const handleEventCreated = (eventData) => {
    // Add the new event to the events list
    setEvents(prevEvents => {
      // Add the new event at the beginning of the list
      return [eventData, ...prevEvents];
    });
    
    // Refresh the calendar to show the new event
    if (calendarRef.current && calendarRef.current.fetchEvents) {
      calendarRef.current.fetchEvents(true);
    }
    
    // Show success message
    showAlert.success("🎉 Event created successfully and added to your dashboard!");
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
      if (window.innerWidth >= 1280) { // xl breakpoint
        setGridColumns(3);
      } else if (window.innerWidth >= 1024) { // lg breakpoint
        setGridColumns(2);
      } else if (window.innerWidth >= 640) { // sm breakpoint
        setGridColumns(2);
      } else {
        setGridColumns(1);
      }
    };

    updateGridColumns();
    window.addEventListener('resize', updateGridColumns);
    return () => window.removeEventListener('resize', updateGridColumns);
  }, []);

  // Helper to get the event's date for filtering
  // Only consider events with valid startDateTime
  const now = new Date();
  const validEvents = events.filter(e => e.startDateTime && !isNaN(new Date(e.startDateTime)));
  const upcoming = validEvents.filter(e => new Date(e.startDateTime) >= now).sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
  const past = validEvents.filter(e => new Date(e.startDateTime) < now).sort((a, b) => new Date(b.startDateTime) - new Date(a.startDateTime));

  // Set optimal initial display when events or grid columns change
  useEffect(() => {
    if (upcoming.length > 0) {
      setUpcomingVisible(calculateOptimalDisplay(upcoming.length, gridColumns));
    }
    if (past.length > 0) {
      setPastVisible(calculateOptimalDisplay(past.length, gridColumns));
    }
  }, [upcoming.length, past.length, gridColumns]);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 animate-pulse">
          <div className="h-4 bg-slate-200 rounded mb-3"></div>
          <div className="h-6 bg-slate-200 rounded mb-4"></div>
          <div className="h-3 bg-slate-200 rounded mb-2"></div>
          <div className="h-3 bg-slate-200 rounded w-2/3"></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <Navbar />

      {/* Main Content with Calendar Sidebar */}
      <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 w-full">
        {!isCalendarExpanded ? (
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Main Content */}
            <div className="flex-1">
              {/* Header Section */}
              <div className={`mb-6 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="relative">
                  {/* Animated Background Elements */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    
                  </div>

                  {/* User Name Display - More compact */}
                  <div className="text-center lg:text-left">
                    <div className="flex flex-col lg:flex-row items-center lg:items-baseline gap-2 lg:gap-3 mb-2">
                      <h1 className="text-2xl lg:text-4xl font-bold">
                        <span className="bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                          Welcome back,
                        </span>
                      </h1>
                      <h2 className="text-3xl lg:text-5xl font-extrabold relative">
                        <span className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
                          {user?.name || 'Organizer'}
                        </span>
                        {/* Underline Effect */}
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-full transform scale-x-0 animate-pulse" style={{ animationDuration: '2s' }}></div>
                      </h2>
                    </div>
                    <p className="text-base lg:text-lg text-slate-600 max-w-2.5xl mx-auto lg:mx-0">
                      Ready to make a difference? Let's create some amazing environmental events together! 🌱✨
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className={`grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 rounded-2xl shadow-lg border border-blue-200/50 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 font-medium">Upcoming Events</p>
                      <p className="text-2xl font-bold text-slate-900">{upcoming.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <CalendarIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 rounded-2xl shadow-lg border border-emerald-200/50 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-600 font-medium">Past Events</p>
                      <p className="text-2xl font-bold text-slate-900">{past.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <CheckCircleIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 rounded-2xl shadow-lg border border-purple-200/50 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-600 font-medium">Total Events</p>
                      <p className="text-2xl font-bold text-slate-900">{events.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <ClockIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Organization Status Section */}
              {organizations.length === 0 && (
                <div className={`mb-6 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
                      <h3 className="font-semibold text-red-700">Organization Required</h3>
                    </div>
                    <p className="text-red-600 mb-4">
                      You need to be a member of an organization to create and manage events.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => navigate('/join-organization')}
                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 font-medium"
                      >
                        Join Organization
                      </button>
                      <button
                        onClick={() => navigate('/register-organization')}
                        className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 font-medium"
                      >
                        Create Organization
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Events Section */}
              <div className={`mb-8 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                    <CalendarIcon className="w-6 h-6 mr-3 text-emerald-600" />
                    Upcoming Events
                  </h2>
                  {upcoming.length > 0 && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                      {upcoming.length} event{upcoming.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                
                {loadingEvents ? (
                  <LoadingSkeleton />
                ) : upcoming.length === 0 ? (
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ExclamationTriangleIcon className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Upcoming Events</h3>
                    <p className="text-slate-600 mb-4">You haven't created any upcoming events yet.</p>
                    <button
                      onClick={() => {
                        if (organizations.length === 0) {
                          showAlert.warning('You need to be a member of an organization to create events. Please join an organization first.');
                          return;
                        }
                        setShowOrgSelectionModal(true);
                      }}
                      className={`px-6 py-2 rounded-xl transition-all duration-300 font-medium ${
                        organizations.length === 0 
                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-emerald-600 to-blue-600 text-white hover:shadow-lg transform hover:-translate-y-1'
                      }`}
                      disabled={organizations.length === 0}
                    >
                      {organizations.length === 0 ? 'Join Organization First' : 'Create Your First Event'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {upcoming.slice(0, upcomingVisible).map(event => (
                        <div key={event._id} className="transform hover:-translate-y-1 transition-all duration-300">
                          <EventCard event={event} />
                        </div>
                      ))}
                    </div>
                    {/* Smart Show More/Less Controls */}
                    {upcoming.length > upcomingVisible && (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                        {/* Show More Button */}
                        <div className="relative">
                          <button
                            className="group relative px-8 py-4 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold border-0 overflow-hidden"
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
                          <div className="absolute -top-2 -right-2 bg-white text-emerald-600 text-xs font-bold px-2 py-1 rounded-full shadow-md border-2 border-emerald-500 z-10">
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
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                          <span>
                            Showing <span className="font-semibold text-slate-700">{upcomingVisible}</span> of <span className="font-semibold text-slate-700">{upcoming.length}</span> events
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Past Events Section */}
              <div className={`mb-8 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                    <CheckCircleIcon className="w-6 h-6 mr-3 text-blue-600" />
                    Past Events
                  </h2>
                  {past.length > 0 && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {past.length} event{past.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                
                {loadingEvents ? (
                  <LoadingSkeleton />
                ) : past.length === 0 ? (
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ClockIcon className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Past Events</h3>
                    <p className="text-slate-600">Your completed events will appear here.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {past.slice(0, pastVisible).map(event => (
                        <div key={event._id} className="transform hover:-translate-y-1 transition-all duration-300">
                          <EventCard event={event} />
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
                            Showing <span className="font-semibold text-slate-700">{pastVisible}</span> of <span className="font-slate-700">{past.length}</span> events
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Calendar Sidebar */}
            <div className="lg:w-80 xl:w-96 lg:flex-shrink-0">
              {user && (
                <div className={`lg:sticky lg:top-20 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-slate-900 flex items-center">
                        <CalendarIcon className="w-5 h-5 mr-2 text-emerald-600" />
                        Event Calendar
                      </h3>
                    </div>
                    <SimpleEventCalendar 
                      ref={calendarRef}
                      role="organizer" 
                      userId={user._id}
                      organizations={organizations}
                      onAddEvent={() => {
                        if (organizations.length === 0) {
                          showAlert.warning('You need to be a member of an organization to create events. Please join an organization first.');
                          return;
                        }
                        setShowOrgSelectionModal(true);
                      }}
                      onExpand={setIsCalendarExpanded}
                      isExpanded={isCalendarExpanded}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Expanded Calendar View - Full Dashboard */
          <div className="w-full">
            <div className={`transition-all duration-1000 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-slate-900 flex items-center">
                    <CalendarIcon className="w-6 h-6 mr-3 text-emerald-600" />
                    Event Calendar
                  </h3>
                  <button
                    onClick={() => setIsCalendarExpanded(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all duration-300 font-medium"
                  >
                    ← Back to Dashboard
                  </button>
                </div>
                <SimpleEventCalendar 
                  ref={calendarRef}
                  role="organizer" 
                  userId={user._id}
                  organizations={organizations}
                  onAddEvent={() => {
                    if (organizations.length === 0) {
                      showAlert.warning('You need to be a member of an organization first.');
                      return;
                    }
                    setShowOrgSelectionModal(true);
                  }}
                  onExpand={setIsCalendarExpanded}
                  isExpanded={isCalendarExpanded}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Event Form Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative flex flex-col">
            <div className="sticky top-0 bg-white rounded-t-2xl px-6 py-4 border-b border-slate-200 z-[100] shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Create New Event</h2>
                <button
                  className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:text-red-600 transition-colors"
                  onClick={() => setShowEventModal(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <EventCreationWrapper
                selectedOrgId={selectedOrgForEvent}
                organizationOptions={organizations}
                onClose={() => {
                  setShowEventModal(false);
                  setSelectedOrgForEvent(null);
                }}
                onEventCreated={handleEventCreated}
              />
            </div>
          </div>
        </div>
      )}

      {/* Organization Selection Modal */}
      <OrganizationSelectionModal
        isOpen={showOrgSelectionModal}
        onClose={() => setShowOrgSelectionModal(false)}
        onOrganizationSelected={handleOrganizationSelected}
      />
      
      <Footer />
    </div>
  );
}
