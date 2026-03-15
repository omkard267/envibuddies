import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import VolunteerEventCard from "./VolunteerEventCard";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

const VolunteerEventsTab = ({ searchTerm = "" }) => {
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
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axiosInstance.get("/api/events/all-events", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const now = new Date();
        const future = data
          .filter((event) => new Date(event.startDateTime) >= now)
          .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));

        const past = data
          .filter((event) => new Date(event.startDateTime) < now)
          .sort((a, b) => new Date(b.startDateTime) - new Date(a.startDateTime));

        setUpcomingEvents(future);
        setPastEvents(past);
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
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

  // Filter events based on search term
  const filterEvents = (events) => {
    if (!searchTerm.trim()) return events;
    
    const searchLower = searchTerm.toLowerCase();
    return events.filter(event => {
      const title = event.title?.toLowerCase() || '';
      const description = event.description?.toLowerCase() || '';
      const organizationName = event.organization?.name?.toLowerCase() || '';
      const eventType = event.eventType?.toLowerCase() || '';
      const location = event.location?.toLowerCase() || '';
      
      return title.includes(searchLower) ||
             description.includes(searchLower) ||
             organizationName.includes(searchLower) ||
             eventType.includes(searchLower) ||
             location.includes(searchLower);
    });
  };

  const filteredUpcomingEvents = filterEvents(upcomingEvents);
  const filteredPastEvents = filterEvents(pastEvents);

  if (loading) return <p>Loading events...</p>;

  return (
    <div className="px-2 sm:px-4">
      {/* Upcoming Events */}
      <h2 className="text-xl font-semibold mb-6">Upcoming Events</h2>
      {filteredUpcomingEvents.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredUpcomingEvents.slice(0, upcomingVisible).map((event) => (
              <VolunteerEventCard key={event._id} event={event} />
            ))}
          </div>
                     {/* Smart Show More/Less Controls */}
           <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
             {/* Show More Button */}
             {filteredUpcomingEvents.length > upcomingVisible && (
               <div className="relative">
                 <button
                   className="group relative px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold border-0 overflow-hidden"
                   onClick={() => setUpcomingVisible(showMore(upcomingVisible, filteredUpcomingEvents.length, gridColumns))}
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
                   +{Math.min(gridColumns, filteredUpcomingEvents.length - upcomingVisible)}
                 </div>
               </div>
             )}
             
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
                 Showing <span className="font-semibold text-slate-700">{upcomingVisible}</span> of <span className="font-semibold text-slate-700">{filteredUpcomingEvents.length}</span> events
               </span>
             </div>
           </div>
        </>
      ) : searchTerm ? (
        <p className="text-gray-500">No upcoming events found matching "{searchTerm}".</p>
      ) : (
        <p className="text-gray-500">No upcoming events available.</p>
      )}

      {/* Past Events */}
      <h2 className="text-xl font-semibold mt-12 mb-6">Past Events</h2>
      {filteredPastEvents.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPastEvents.slice(0, pastVisible).map((event) => (
              <VolunteerEventCard key={event._id} event={event} />
            ))}
          </div>
                     {/* Smart Show More/Less Controls */}
           <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
             {/* Show More Button */}
             {filteredPastEvents.length > pastVisible && (
               <div className="relative">
                 <button
                   className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold border-0 overflow-hidden"
                   onClick={() => setPastVisible(showMore(pastVisible, filteredPastEvents.length, gridColumns))}
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
                   +{Math.min(gridColumns, filteredPastEvents.length - pastVisible)}
                 </div>
               </div>
             )}
             
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
                 Showing <span className="font-semibold text-slate-700">{pastVisible}</span> of <span className="font-semibold text-slate-700">{filteredPastEvents.length}</span> events
               </span>
             </div>
           </div>
        </>
      ) : searchTerm ? (
        <p className="text-gray-500">No past events found matching "{searchTerm}".</p>
      ) : (
        <p className="text-gray-500">No past events found.</p>
      )}
    </div>
  );
};

export default VolunteerEventsTab;
