import React, { useEffect, useState } from "react";
import Navbar from "../components/layout/Navbar";
import axiosInstance from "../api/axiosInstance";
import VolunteerEventCard from "../components/volunteer/VolunteerEventCard";
import { CalendarIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

export default function VolunteerMyEvents() {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upcomingVisible, setUpcomingVisible] = useState(0);
  const [pastVisible, setPastVisible] = useState(0);
  const [gridColumns, setGridColumns] = useState(1);

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
    const fetchMyEvents = async () => {
      try {
        // 1. Get registered event IDs
        const { data } = await axiosInstance.get("/api/registrations/my-events");
        const eventIds = data.registeredEventIds || [];
        if (eventIds.length === 0) {
          setUpcomingEvents([]);
          setPastEvents([]);
          setLoading(false);
          return;
        }
        // 2. Fetch event details for those IDs
        const eventsRes = await axiosInstance.post("/api/events/batch", { eventIds });
        const now = new Date();
        const upcoming = eventsRes.data.filter(e => new Date(e.endDateTime) >= now);
        const past = eventsRes.data.filter(e => new Date(e.endDateTime) < now);
        setUpcomingEvents(upcoming);
        setPastEvents(past);
      } catch (err) {
        setUpcomingEvents([]);
        setPastEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMyEvents();
  }, []);

  // Set optimal initial display when events or grid columns change
  useEffect(() => {
    if (upcomingEvents.length > 0) {
      setUpcomingVisible(calculateOptimalDisplay(upcomingEvents.length, gridColumns));
    }
    if (pastEvents.length > 0) {
      setPastVisible(calculateOptimalDisplay(pastEvents.length, gridColumns));
    }
  }, [upcomingEvents.length, pastEvents.length, gridColumns]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <Navbar />
      
      <div className="pt-24 pb-12">
        {/* Header Section */}
        <div className="mb-12 px-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8 max-w-7xl mx-auto">
            {/* Main Header Content */}
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-4xl lg:text-5xl font-bold text-blue-800 mb-4 flex items-center justify-center lg:justify-start gap-3">
                <CalendarIcon className="w-10 h-10 text-blue-600" />
                My Registered Events
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl lg:max-w-none">
                Track your volunteer journey and stay updated on your upcoming commitments. <br/>
                Review your past contributions and their impact on the community.
              </p>
            </div>
            
            {/* Summary Section - Inline with header */}
            {!loading && (upcomingEvents.length > 0 || pastEvents.length > 0) && (
              <div className="flex-shrink-0 w-full lg:w-5/12">
                <h3 className="text-xl font-bold text-emerald-800 mb-4 flex items-center justify-center lg:justify-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5" />
                  Your Volunteer Summary
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 text-center border border-white/30 shadow-md hover:shadow-lg transition-shadow">
                    <div className="text-xl font-bold text-emerald-600 mb-1">{upcomingEvents.length}</div>
                    <div className="text-gray-700 font-semibold text-xs">Upcoming</div>
                    <div className="text-xs text-gray-500">Events</div>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 text-center border border-white/30 shadow-md hover:shadow-lg transition-shadow">
                    <div className="text-xl font-bold text-blue-600 mb-1">{pastEvents.length}</div>
                    <div className="text-gray-700 font-semibold text-xs">Completed</div>
                    <div className="text-xs text-gray-500">Events</div>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 text-center border border-white/30 shadow-md hover:shadow-lg transition-shadow">
                    <div className="text-xl font-bold text-purple-600 mb-1">{upcomingEvents.length + pastEvents.length}</div>
                    <div className="text-gray-700 font-semibold text-xs">Total</div>
                    <div className="text-xs text-gray-500">Events</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-lg text-gray-600">Loading your events...</span>
          </div>
        )}

        {/* Content */}
        {!loading && (
          <div className="space-y-16 px-4">
            {/* Upcoming Events Section */}
            <section>
              <div className="flex items-center justify-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <ClockIcon className="w-7 h-7 text-white" />
                </div>
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-emerald-800">Upcoming Events</h2>
                  <p className="text-gray-600">Your scheduled volunteer activities</p>
                </div>
              </div>

              {upcomingEvents.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                    {upcomingEvents.slice(0, upcomingVisible).map(event => (
                      <div key={event._id} className="transform hover:scale-[1.02] transition-all duration-300">
                        <VolunteerEventCard event={event} isRegistered={true} />
                      </div>
                    ))}
                  </div>
                  
                  {/* Smart Show More/Less Controls */}
                  {upcomingEvents.length > upcomingVisible && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                      {/* Show More Button */}
                      <div className="relative">
                        <button
                          className="group relative px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold border-0 overflow-hidden"
                          onClick={() => setUpcomingVisible(showMore(upcomingVisible, upcomingEvents.length, gridColumns))}
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
                          +{Math.min(gridColumns, upcomingEvents.length - upcomingVisible)}
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
                          Showing <span className="font-semibold text-slate-700">{upcomingVisible}</span> of <span className="font-semibold text-slate-700">{upcomingEvents.length}</span> events
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16 bg-white/30 backdrop-blur-sm rounded-2xl border border-white/20 max-w-2xl mx-auto">
                  <div className="text-6xl mb-4">📅</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Upcoming Events</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    You don't have any upcoming registered events. 
                    Explore volunteer opportunities to get started!
                  </p>
                </div>
              )}
            </section>

            {/* Past Events Section */}
            <section>
              <div className="flex items-center justify-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <CheckCircleIcon className="w-7 h-7 text-white" />
                </div>
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-blue-800">Past Events</h2>
                  <p className="text-gray-600">Your completed volunteer activities</p>
                </div>
              </div>

              {pastEvents.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                    {pastEvents.slice(0, pastVisible).map(event => (
                      <div key={event._id} className="transform hover:scale-[1.02] transition-all duration-300">
                        <VolunteerEventCard event={event} isRegistered={true} />
                      </div>
                    ))}
                  </div>
                  
                  {/* Smart Show More/Less Controls */}
                  {pastEvents.length > pastVisible && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                      {/* Show More Button */}
                      <div className="relative">
                        <button
                          className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold border-0 overflow-hidden"
                          onClick={() => setPastVisible(showMore(pastVisible, pastEvents.length, gridColumns))}
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
                          +{Math.min(gridColumns, pastEvents.length - pastVisible)}
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
                          Showing <span className="font-semibold text-slate-700">{pastVisible}</span> of <span className="font-semibold text-slate-700">{pastEvents.length}</span> events
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16 bg-white/30 backdrop-blur-sm rounded-2xl border border-white/20 max-w-2xl mx-auto">
                  <div className="text-6xl mb-4">🏆</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Past Events</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    You haven't completed any events yet. 
                    Start volunteering to build your impact history!
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}