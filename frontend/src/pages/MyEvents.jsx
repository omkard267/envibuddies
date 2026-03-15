import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import Navbar from "../components/layout/Navbar";
import EventCard from "../components/event/EventCard";
import { 
  CalendarIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

export default function MyEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upcomingVisible, setUpcomingVisible] = useState(0);
  const [pastVisible, setPastVisible] = useState(0);
  const [gridColumns, setGridColumns] = useState(1);
  const [user] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [isVisible, setIsVisible] = useState(false);

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
      if (window.innerWidth >= 1280) { // xl breakpoint
        setGridColumns(4);
      } else if (window.innerWidth >= 1024) { // lg breakpoint
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

  useEffect(() => {
    // Animation on mount
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    axiosInstance
      .get("/api/events/my-events")
      .then((res) => {
        setEvents(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
      });
  }, [user]);

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-6 animate-pulse">
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
      <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className={`mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
            My Events
          </h1>
          <p className="text-slate-600 text-lg">
            Manage and view all your upcoming and past events
          </p>
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

        {/* Upcoming Events Section */}
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
          
          {loading ? (
            <LoadingSkeleton />
          ) : upcoming.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExclamationTriangleIcon className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Upcoming Events</h3>
              <p className="text-slate-600">You haven't registered for any upcoming events yet.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                      className="group relative px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold border-0 overflow-hidden"
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
          
          {loading ? (
            <LoadingSkeleton />
          ) : past.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DocumentTextIcon className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Past Events</h3>
              <p className="text-slate-600">Your completed events will appear here.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                      className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold border-0 overflow-hidden"
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
  );
} 