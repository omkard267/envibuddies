import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import axiosInstance from '../../api/axiosInstance';
import CalendarErrorBoundary from './CalendarErrorBoundary';
import EventModal from './EventModal';
import AddEventModal from './AddEventModal';

const EventCalendar = ({ role, userId }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const calendarRef = useRef(null);

  // Event color coding
  const EVENT_COLORS = {
    upcoming: '#2196F3',    // Blue
    attended: '#4CAF50',    // Green
    missed: '#F44336',      // Red
    created: '#FF9800',     // Orange (for organizers)
    recurring: '#9C27B0'    // Purple
  };

  // Fetch events for calendar
  const fetchEvents = async (start, end) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/calendar/events', {
        params: {
          start: start.toISOString(),
          end: end.toISOString(),
          role,
          userId
        }
      });
      
      // Transform events for FullCalendar
      const calendarEvents = response.data.events.map(event => ({
        id: event._id,
        title: event.title,
        start: event.startDateTime,
        end: event.endDateTime,
        color: EVENT_COLORS[event.status] || EVENT_COLORS.upcoming,
        extendedProps: {
          eventType: event.eventType,
          status: event.status,
          isRegistered: event.isRegistered,
          isOrganizer: event.isOrganizer,
          location: event.location,
          description: event.description
        }
      }));
      
      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle event click
  const handleEventClick = (clickInfo) => {
    setSelectedEvent(clickInfo.event);
    setShowEventModal(true);
  };

  // Handle date click
  const handleDateClick = (clickInfo) => {
    if (role === 'organizer') {
      // For organizers, date click can open add event modal
      setShowAddModal(true);
    }
  };

  // Handle date range change
  const handleDatesSet = (dateInfo) => {
    if (dateInfo && dateInfo.start && dateInfo.end) {
      fetchEvents(dateInfo.start, dateInfo.end);
    }
  };

  return (
    <div className="calendar-container bg-white rounded-lg shadow-lg p-6">
      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {role === 'organizer' ? 'My Events Calendar' : 'My Registered Events'}
        </h2>
        {role === 'organizer' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Event
          </button>
        )}
      </div>

      {/* Color Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Upcoming</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Attended</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Missed</span>
        </div>
        {role === 'organizer' && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>Created</span>
          </div>
        )}
      </div>

      {/* FullCalendar Component */}
      <div className="calendar-wrapper">
        <CalendarErrorBoundary>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,listWeek'
            }}
            events={events}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            datesSet={handleDatesSet}
            height="auto"
            eventDisplay="block"
            dayMaxEvents={3}
            moreLinkClick="popover"
            loading={loading}
            eventTimeFormat={{
              hour: 'numeric',
              minute: '2-digit',
              meridiem: 'short'
            }}
            eventDidMount={(info) => {
              // Optional: Add custom styling or behavior when events are mounted
            }}
            eventWillUnmount={(info) => {
              // Optional: Clean up when events are unmounted
            }}
          />
        </CalendarErrorBoundary>
      </div>

      {/* Event Modal */}
      {showEventModal && selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
          role={role}
        />
      )}

      {/* Add Event Modal (for organizers) */}
      {showAddModal && role === 'organizer' && (
        <AddEventModal
          onClose={() => setShowAddModal(false)}
          onEventAdded={() => {
            setShowAddModal(false);
            // Refresh events
            if (calendarRef.current) {
              const calendarApi = calendarRef.current.getApi();
              if (calendarApi && calendarApi.view) {
                fetchEvents(calendarApi.view.currentStart, calendarApi.view.currentEnd);
              }
            }
          }}
        />
      )}
    </div>
  );
};

export default EventCalendar; 