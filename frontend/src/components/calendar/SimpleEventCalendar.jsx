import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import axiosInstance from '../../api/axiosInstance';
import EventModal from './EventModal';
import AddEventModal from './AddEventModal';
import calendarEventEmitter from '../../utils/calendarEventEmitter';
import { showAlert } from '../../utils/notifications';

const SimpleEventCalendar = forwardRef(({ role, userId, organizations = [], onAddEvent, onExpand, isExpanded = false }, ref) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExpandedCalendar, setShowExpandedCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [error, setError] = useState(null);

  // Expose fetchEvents function to parent components
  useImperativeHandle(ref, () => ({
    fetchEvents: (isRefresh = false) => fetchEvents(isRefresh)
  }));

  // Event color coding - base colors for different statuses
  const EVENT_COLORS = {
    upcoming: 'bg-blue-500',
    attended: 'bg-green-500',
    missed: 'bg-red-500',
    created: 'bg-orange-500',
    recurring: 'bg-purple-500'
  };

  // Get event display properties
  const getEventDisplayProps = (event) => {
    const now = new Date();
    const eventEnd = new Date(event.endDateTime);
    const isCompleted = now > eventEnd;
    
    // Determine the primary display style based on time/attendance status
    let displayStyle = 'default';
    let borderColor = '';
    let bgColor = '';
    let textColor = 'text-white';
    let secondaryIcon = '';
    let secondaryColor = '';
    
    // Check if this is a recurring event
    const isRecurring = event.recurringEvent || event.isRecurringInstance;
    let recurringIndicator = '';
    let recurringColor = '';
    
    if (isRecurring) {
      recurringIndicator = '🔄'; // Default recurring icon
      recurringColor = 'bg-purple-500';
      
      // Different indicators for different recurring types
      if (event.recurringType === 'weekly') {
        recurringIndicator = '📅'; // Weekly icon
      } else if (event.recurringType === 'monthly') {
        recurringIndicator = '📆'; // Monthly icon
      }
    }
    
    if (isCompleted) {
      if (event.hasAttended) {
        displayStyle = 'attended';
        borderColor = 'border-l-4 border-l-green-400';
        bgColor = 'bg-gradient-to-r from-green-500 to-green-600';
      } else {
        displayStyle = 'missed';
        borderColor = 'border-l-4 border-l-red-400';
        bgColor = 'bg-gradient-to-r from-red-500 to-red-600';
      }
    } else {
      displayStyle = 'upcoming';
      borderColor = 'border-l-4 border-l-blue-400';
      bgColor = 'bg-gradient-to-r from-blue-500 to-blue-600';
    }
    
    // Override color for recurring events
    if (isRecurring) {
      bgColor = 'bg-gradient-to-r from-purple-500 to-purple-600';
      borderColor = 'border-l-4 border-l-purple-400';
    }
    
    // Add secondary indicator for creator status
    if (event.isCreator) {
      secondaryIcon = '👑'; // Crown for creator
      secondaryColor = 'bg-yellow-400';
    }
    
    return {
      displayStyle,
      borderColor,
      bgColor,
      textColor,
      secondaryIcon,
      secondaryColor,
      isCreator: event.isCreator,
      isCompleted,
      isUpcoming: !isCompleted,
      statusText: isCompleted ? (event.hasAttended ? 'Attended' : 'Missed') : 'Upcoming',
      isRecurring,
      recurringIndicator,
      recurringColor,
      recurringPattern: event.recurringPattern
    };
  };

  // Fetch events for calendar
  const fetchEvents = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const response = await axiosInstance.get('/api/calendar/events', {
        params: {
          start: startOfMonth.toISOString(),
          end: endOfMonth.toISOString(),
          role,
          userId
        }
      });
      
      setEvents(response.data?.data || []);
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      console.error('Error details:', error.response?.data);
      setEvents([]); // Set empty array on error
      setError(error.response?.data?.message || 'Failed to load events');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [currentMonth, role, userId]);

  useEffect(() => {
    fetchEvents();
  }, [currentMonth, role, userId]);

  // Listen for calendar refresh events
  useEffect(() => {
    const unsubscribe = calendarEventEmitter.subscribe('calendarRefresh', (data) => {
      fetchEvents(true); // Use refresh mode
    });

    return () => {
      unsubscribe();
    };
  }, [fetchEvents]);

  // Get days in month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  // Get events for a specific date
  const getEventsForDate = (date) => {
    if (!date) return [];
    
    return events.filter(event => {
      const eventDate = new Date(event.startDateTime);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  // Handle event click
  const handleEventClick = (event) => {
    // For recurring instances, we need to redirect to the original event
    if (event.isRecurringInstance && event.originalEventId) {
      // Create a modified event object with the original event ID
      const originalEvent = {
        ...event,
        _id: event.originalEventId // Use the original event ID for navigation
      };
      setSelectedEvent(originalEvent);
    } else {
      setSelectedEvent(event);
    }
    setShowEventModal(true);
  };

  // Handle date click
  const handleDateClick = (date) => {
    if (role === 'organizer') {
      if (organizations.length === 0) {
        // Show message that organization is required
        showAlert.warning('You need to be a member of an organization to create events. Please join an organization first.');
        return;
      }
      setShowAddModal(true);
    }
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Go to today
  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Handle calendar expansion
  const handleCalendarExpand = () => {
    if (onExpand) {
      onExpand(true);
    } else {
      setShowExpandedCalendar(true);
    }
  };

  // Handle calendar collapse
  const handleCalendarCollapse = () => {
    if (onExpand) {
      onExpand(false);
    } else {
      setShowExpandedCalendar(false);
    }
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className={`calendar-container bg-white rounded-lg shadow-md p-2.5 relative z-0 ${isExpanded ? 'w-full' : ''}`}>
      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-800">
            {role === 'organizer' ? 'My Events Calendar' : 'My Registered Events Calendar'}
          </h2>
          {refreshing && (
            <div className="flex items-center gap-1 text-blue-600 text-xs">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              <span>Refreshing...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchEvents(true)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
            title="Refresh Calendar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {role === 'organizer' && !isExpanded && (
            <button
              onClick={handleCalendarExpand}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
              title="Expand Calendar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          )}
          {role === 'organizer' && isExpanded && (
            <button
              onClick={handleCalendarCollapse}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-all duration-200"
              title="Collapse Calendar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {role === 'organizer' && (
            <button
              onClick={onAddEvent || (() => setShowAddModal(true))}
              disabled={organizations.length === 0}
              className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 font-medium whitespace-nowrap ${
                organizations.length === 0
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
              }`}
              title={organizations.length === 0 ? 'Join an organization first to create events' : 'Add new event'}
            >
              + Add Event
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={goToPreviousMonth}
          className="p-1 hover:bg-gray-100 rounded text-sm"
        >
          ←
        </button>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <button
            onClick={goToToday}
            className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-200"
          >
            Today
          </button>
        </div>
        <button
          onClick={goToNextMonth}
          className="p-1 hover:bg-gray-100 rounded text-sm"
        >
          →
        </button>
      </div>

                        {/* Color Legend */}
                  <div className="flex flex-wrap gap-1.5 mb-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-gradient-to-r from-blue-500 to-blue-600 border-l-4 border-l-blue-400"></div>
                      <span> Upcoming</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-gradient-to-r from-green-500 to-green-600 border-l-4 border-l-green-400"></div>
                      <span> Attended</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-gradient-to-r from-red-500 to-red-600 border-l-4 border-l-red-400"></div>
                      <span> Missed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-gradient-to-r from-purple-500 to-purple-600 border-l-4 border-l-purple-400 relative">
                        <span className="text-[6px] absolute inset-0 flex items-center justify-center text-white">🔄</span>
                      </div>
                      <span> Recurring</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-gradient-to-r from-purple-500 to-purple-600 border-l-4 border-l-purple-400 relative">
                        <span className="text-[6px] absolute inset-0 flex items-center justify-center text-white">📅</span>
                      </div>
                      <span> Weekly</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-gradient-to-r from-purple-500 to-purple-600 border-l-4 border-l-purple-400 relative">
                        <span className="text-[6px] absolute inset-0 flex items-center justify-center text-white">📆</span>
                      </div>
                      <span> Monthly</span>
                    </div>
                    {role === 'organizer' && (
                      <div className="flex items-center gap-2">
                        <div className="relative w-4 h-4 rounded bg-gray-300 border-l-4 border-l-gray-400">
                          <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-yellow-400"></div>
                        </div>
                        <span>Created by You</span>
                      </div>
                    )}
                  </div>

                        {/* Calendar Grid */}
                   <div className={`grid grid-cols-7 gap-0.5 ${isExpanded ? 'gap-1' : ''}`}>
                     {/* Day Headers */}
                     {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                       <div key={day} className={`p-1 text-center font-semibold text-gray-600 text-xs ${isExpanded ? 'p-2 text-sm bg-gray-50 rounded' : ''}`}>
                         {day}
                       </div>
                     ))}
        
        {/* Calendar Days */}
        {days.map((day, index) => {
          const dayEvents = getEventsForDate(day);
          const isToday = day && day.toDateString() === new Date().toDateString();
          
          return (
            <div
              key={index}
              className={`${isExpanded ? 'min-h-[120px] p-2' : role === 'organizer' ? 'min-h-[50px] p-1' : 'min-h-[80px] p-1'} border border-gray-200 ${
                isToday ? 'bg-blue-50' : 'bg-white'
              } ${!day ? 'bg-gray-50' : 'hover:bg-gray-50 cursor-pointer'}`}
              onClick={() => day && handleDateClick(day)}
            >
              {day && (
                <>
                  <div className={`${isExpanded ? 'text-sm font-medium mb-2' : role === 'organizer' ? 'text-xs font-medium' : 'text-sm font-medium mb-1'} ${
                    isToday ? 'text-blue-600' : 'text-gray-700'
                  }`}>
                    {day.getDate()}
                  </div>
                  <div className={`${isExpanded ? 'mt-0 space-y-1' : role === 'organizer' ? 'mt-0.5 space-y-0.5' : 'mt-1 space-y-1'}`}>
                    {dayEvents.slice(0, isExpanded ? undefined : role === 'organizer' ? 1 : 2).map((event, eventIndex) => {
                      const displayProps = getEventDisplayProps(event);
                      return (
                        <div
                          key={eventIndex}
                          className={`${isExpanded ? 'text-xs px-2 py-1.5' : role === 'organizer' ? 'text-[8px] px-1 py-1' : 'text-xs px-1.5 py-1'} rounded-sm cursor-pointer text-white truncate shadow-sm hover:shadow-md transition-all duration-200 ${displayProps.bgColor} ${displayProps.borderColor} relative font-medium`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                          title={`${event.title} - ${displayProps.statusText}${displayProps.isRecurring ? ` (${displayProps.recurringPattern})` : ''}`}
                        >
                          <div className="flex items-center gap-1">
                            {/* Recurring indicator */}
                            {displayProps.recurringIndicator && (
                              <span className={`${isExpanded ? 'text-xs' : role === 'organizer' ? 'text-[6px]' : 'text-xs'} flex-shrink-0`}>{displayProps.recurringIndicator}</span>
                            )}
                            <span className="flex-1 truncate leading-tight">{event.title}</span>
                          </div>
                          
                          {/* Secondary indicator for creator events */}
                          {displayProps.secondaryIcon && (
                            <div className={`absolute ${isExpanded ? '-top-1 -right-1 w-3 h-3' : role === 'organizer' ? '-top-0.5 -right-0.5 w-2.5 h-2.5' : '-top-1 -right-1 w-3 h-3'} rounded-full ${displayProps.secondaryColor} flex items-center justify-center shadow-sm`}>
                              <span className={`${isExpanded ? 'text-xs' : role === 'organizer' ? 'text-[6px]' : 'text-xs'} font-bold`}>👑</span>
                            </div>
                          )}
                          
                          {/* Recurring instance indicator */}
                          {event.isRecurringInstance && (
                            <div className={`absolute ${isExpanded ? '-top-1 -left-1 w-3 h-3' : role === 'organizer' ? '-top-0.5 -left-0.5 w-2.5 h-2.5' : '-top-1 -left-1 w-3 h-3'} rounded-full bg-purple-400 flex items-center justify-center shadow-sm`}>
                              <span className={`${isExpanded ? 'text-xs' : role === 'organizer' ? 'text-[6px]' : 'text-xs'} font-bold text-white`}>R</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {!isExpanded && dayEvents.length > (role === 'organizer' ? 1 : 2) && (
                      <div className={`${role === 'organizer' ? 'text-[8px]' : 'text-xs'} text-gray-600 font-semibold bg-gray-100 px-1 py-0.5 rounded-sm mt-0.5`}>
                        +{dayEvents.length - (role === 'organizer' ? 1 : 2)} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading events...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-center py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 font-medium">Error loading calendar</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
            <button
              onClick={() => {
                setError(null);
                fetchEvents();
              }}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
          role={role}
          onEventUpdated={fetchEvents}
        />
      )}

      {/* Add Event Modal (for organizers) */}
      {showAddModal && role === 'organizer' && (
        <AddEventModal
          onClose={() => setShowAddModal(false)}
          onEventAdded={() => {
            setShowAddModal(false);
            fetchEvents();
          }}
        />
      )}

      {/* Expanded Calendar Modal (fallback for when not using dashboard expansion) */}
      {showExpandedCalendar && !isExpanded && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-2"
          onClick={() => setShowExpandedCalendar(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                {role === 'organizer' ? 'My Events Calendar' : 'My Registered Events Calendar'}
              </h2>
              <button
                onClick={() => setShowExpandedCalendar(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Calendar Content */}
            <div className="p-4 overflow-auto max-h-[calc(95vh-80px)]">
              {/* Navigation */}
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-800"
                >
                  ← Previous
                </button>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </h3>
                  <button
                    onClick={goToToday}
                    className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Today
                  </button>
                </div>
                <button
                  onClick={goToNextMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-800"
                >
                  Next →
                </button>
              </div>

              {/* Color Legend */}
              <div className="flex flex-wrap gap-2 mb-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-gradient-to-r from-blue-500 to-blue-600 border-l-4 border-l-blue-400"></div>
                  <span className="text-gray-700">Upcoming</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-gradient-to-r from-green-500 to-green-600 border-l-4 border-l-green-400"></div>
                  <span className="text-gray-700">Attended</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-gradient-to-r from-red-500 to-red-600 border-l-4 border-l-red-400"></div>
                  <span className="text-gray-700">Missed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-gradient-to-r from-purple-500 to-purple-600 border-l-4 border-l-purple-400 relative">
                    <span className="text-[6px] absolute inset-0 flex items-center justify-center text-white">🔄</span>
                  </div>
                  <span className="text-gray-700">Recurring</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-gradient-to-r from-purple-500 to-purple-600 border-l-4 border-l-purple-400 relative">
                    <span className="text-[6px] absolute inset-0 flex items-center justify-center text-white">📅</span>
                  </div>
                  <span className="text-gray-700">Weekly</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-gradient-to-r from-purple-500 to-purple-600 border-l-4 border-l-purple-400 relative">
                    <span className="text-[6px] absolute inset-0 flex items-center justify-center text-white">📆</span>
                  </div>
                  <span className="text-gray-700">Monthly</span>
                </div>
                {role === 'organizer' && (
                  <div className="flex items-center gap-1.5">
                    <div className="relative w-4 h-4 rounded bg-gray-300 border-l-4 border-l-gray-400">
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-400"></div>
                    </div>
                    <span className="text-gray-700">Created by You</span>
                  </div>
                )}
              </div>

              {/* Expanded Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center font-semibold text-gray-600 text-sm bg-gray-50 rounded">
                    {day}
                  </div>
                ))}

                {/* Calendar Days */}
                {days.map((day, index) => {
                  const dayEvents = getEventsForDate(day);
                  const isToday = day && day.toDateString() === new Date().toDateString();
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[120px] p-2 border border-gray-200 ${
                        isToday ? 'bg-blue-50' : 'bg-white'
                      } ${!day ? 'bg-gray-50' : 'hover:bg-gray-50 cursor-pointer'}`}
                      onClick={() => day && handleDateClick(day)}
                    >
                      {day && (
                        <>
                          <div className={`text-sm font-medium mb-2 ${
                            isToday ? 'text-blue-600' : 'text-gray-700'
                          }`}>
                            {day.getDate()}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.map((event, eventIndex) => {
                              const displayProps = getEventDisplayProps(event);
                              return (
                                <div
                                  key={eventIndex}
                                  className={`text-xs px-2 py-1.5 rounded cursor-pointer text-white truncate shadow-sm hover:shadow-md transition-all duration-200 ${displayProps.bgColor} ${displayProps.borderColor} relative font-medium`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEventClick(event);
                                  }}
                                  title={`${event.title} - ${displayProps.statusText}${displayProps.isRecurring ? ` (${displayProps.recurringPattern})` : ''}`}
                                >
                                  <div className="flex items-center gap-1">
                                    {/* Recurring indicator */}
                                    {displayProps.recurringIndicator && (
                                      <span className="text-xs flex-shrink-0">{displayProps.recurringIndicator}</span>
                                    )}
                                    <span className="flex-1 truncate leading-tight">{event.title}</span>
                                  </div>
                                  
                                  {/* Secondary indicator for creator events */}
                                  {displayProps.secondaryIcon && (
                                    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${displayProps.secondaryColor} flex items-center justify-center shadow-sm`}>
                                      <span className="text-xs font-bold">👑</span>
                                    </div>
                                  )}
                                  
                                  {/* Recurring instance indicator */}
                                  {event.isRecurringInstance && (
                                    <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-purple-400 flex items-center justify-center shadow-sm">
                                      <span className="text-xs font-bold text-white">R</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default SimpleEventCalendar; 