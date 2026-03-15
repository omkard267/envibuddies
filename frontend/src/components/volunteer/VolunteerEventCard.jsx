// src/components/volunteer/VolunteerEventCard.jsx

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import defaultImages from "../../utils/eventTypeImages";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";
import useEventSlots from '../../hooks/useEventSlots';
import { isEventPast, getRegistrationWithQuestionnaireStatus } from '../../utils/questionnaireUtils';
import { addEventToCalendar, downloadCalendarFile, addToWebsiteCalendar, removeFromWebsiteCalendar, checkWebsiteCalendarStatus } from "../../utils/calendarUtils";
import { FaCalendarPlus, FaCalendarMinus } from "react-icons/fa";
import calendarEventEmitter from "../../utils/calendarEventEmitter";
import { 
  getSafeUserData, 
  getDisplayName, 
  getUsernameDisplay, 
  getSafeUserName,
  getSafeUserId,
  getSafeUserRole 
} from "../../utils/safeUserUtils";
import { 
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  ClockIcon,
  BuildingOfficeIcon,
  StarIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const VolunteerEventCard = ({ event }) => {
  const navigate = useNavigate();
  const [isRegistered, setIsRegistered] = useState(false);
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(false);
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState({
    isRegistered: false,
    isInCalendar: false,
    canAddToCalendar: false,
    canRemoveFromCalendar: false
  });
  const userData = JSON.parse(localStorage.getItem("user"));
  const user = getSafeUserData(userData); // Get safe user data

  // Handle recurring event instances - use original event ID for API calls
  const getEffectiveEventId = (id) => {
    // If it's a recurring instance ID (contains '_recurring_'), extract the original event ID
    if (id && id.includes('_recurring_')) {
      return id.split('_recurring_')[0];
    }
    return id;
  };

  const effectiveEventId = getEffectiveEventId(event._id);

  // Check if user is removed or banned from this event
  const isRemoved = event?.removedVolunteers?.includes(getSafeUserId(user));
  const isBanned = event?.bannedVolunteers?.includes(getSafeUserId(user));

  useEffect(() => {
    const checkRegistrationAndQuestionnaire = async () => {
      if (!effectiveEventId || !user) return;
      
      try {
        // Check if user is registered
        const registrationCheck = await axiosInstance.get(`/api/registrations/${effectiveEventId}/check`);
        
        if (registrationCheck.data.registered) {
          setIsRegistered(true);
          
          // If registered and event is past, check questionnaire status
          if (isEventPast(event.endDateTime)) {
            const { questionnaireCompleted } = await getRegistrationWithQuestionnaireStatus(effectiveEventId);
            setQuestionnaireCompleted(questionnaireCompleted);
          } else {
            setQuestionnaireCompleted(false);
          }
        } else {
          setIsRegistered(false);
          setQuestionnaireCompleted(false);
          
          // Remove from localStorage if not registered
          const registeredEvents = JSON.parse(localStorage.getItem("registeredEvents") || "[]");
          const idx = registeredEvents.indexOf(effectiveEventId);
          if (idx !== -1) {
            registeredEvents.splice(idx, 1);
            localStorage.setItem("registeredEvents", JSON.stringify(registeredEvents));
          }
        }
      } catch (error) {
        console.error('Error checking registration and questionnaire status:', error);
        setIsRegistered(false);
        setQuestionnaireCompleted(false);
      }
    };
    
    checkRegistrationAndQuestionnaire();
  }, [effectiveEventId, user, event.endDateTime]);

  // Check calendar status
  useEffect(() => {
    const checkCalendarStatus = async () => {
      if (!getSafeUserId(user) || !effectiveEventId) return;
      
      try {
        const result = await checkWebsiteCalendarStatus(effectiveEventId);
        if (result.success) {
          setCalendarStatus(result.data);
        }
      } catch (error) {
        console.error('Error checking calendar status:', error);
      }
    };
    checkCalendarStatus();
  }, [effectiveEventId, getSafeUserId(user)]);

  // Close calendar options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside the calendar button and dropdown
      const calendarButton = event.target.closest('[data-calendar-button]');
      const calendarDropdown = event.target.closest('[data-calendar-dropdown]');
      
      if (showCalendarOptions && !calendarButton && !calendarDropdown) {
        setShowCalendarOptions(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showCalendarOptions]);

  const {
    _id,
    title,
    description,
    eventType,
    organization,
    startDateTime,
    endDateTime,
    maxVolunteers,
    unlimitedVolunteers,
    volunteers = [],
    location,
    equipmentNeeded = [],
    waterProvided,
    medicalSupport,
    ageGroup,
    precautions,
    publicTransport,
    contactPerson,
    timeSlotsEnabled,
    timeSlots = [],
    recurringEvent,
    recurringType,
    recurringValue,
    isRecurringInstance,
    recurringInstanceNumber,
    summary,
    report,
    certificates = [],
    sponsorship = {}
  } = event;

  // Use the new hook for live slot info
  const { availableSlots, maxVolunteers: hookMaxVolunteers, unlimitedVolunteers: hookUnlimitedVolunteers, loading: slotsLoading } = useEventSlots(effectiveEventId);

  // User-friendly slot message with color
  let slotMessage = '';
  let slotColor = '';
  if (slotsLoading) {
    slotMessage = 'Loading slots...';
    slotColor = '';
  } else if (hookUnlimitedVolunteers) {
    slotMessage = 'Unlimited slots';
    slotColor = '';
  } else if (typeof availableSlots === 'number') {
    if (availableSlots <= 0) {
      slotMessage = 'No slots left';
      slotColor = 'text-red-600';
    } else if (availableSlots === 1 || availableSlots === 2) {
      slotMessage = `Only ${availableSlots} slot${availableSlots === 1 ? '' : 's'} remaining`;
      slotColor = 'text-red-600';
    } else if (availableSlots >= 3 && availableSlots <= 5) {
      slotMessage = `Only ${availableSlots} slots remaining`;
      slotColor = 'text-orange-500';
    } else {
      slotMessage = `${availableSlots} slots left`;
      slotColor = 'text-green-700';
    }
  }

  const formattedDate = `${format(new Date(startDateTime), "d MMMM, yyyy")} — ${format(
    new Date(endDateTime),
    "h:mm a"
  )}`;

  const eventImage = defaultImages[eventType?.toLowerCase()] || defaultImages["default"];
  const cityState = location?.split(",").slice(-2).join(", ").trim();

  // Check if event is in the past
  const isPastEvent = new Date(endDateTime) < new Date();
  // Check if event is live (ongoing)
  const now = new Date();
  const isLiveEvent = new Date(startDateTime) <= now && now < new Date(endDateTime);

  const handleRegister = (e) => {
    e.stopPropagation(); // prevent card navigation
    navigate(`/volunteer/events/${effectiveEventId}`);
  };

  // Calendar functions
  const handleAddToCalendar = (e) => {
    e.stopPropagation(); // prevent card navigation
    addEventToCalendar(event);
  };

  const handleDownloadCalendar = (e) => {
    e.stopPropagation(); // prevent card navigation
    downloadCalendarFile(event);
  };

  const handleAddToWebsiteCalendar = async (e) => {
    e.stopPropagation(); // prevent card navigation
    try {
      const result = await addToWebsiteCalendar(event._id);
      if (result.success) {
        const statusResult = await checkWebsiteCalendarStatus(event._id);
        if (statusResult.success) setCalendarStatus(statusResult.data);
      } else { console.error(result.message); }
    } catch (error) { console.error('Error adding to website calendar:', error); }
  };

  const handleRemoveFromWebsiteCalendar = async (e) => {
    e.stopPropagation(); // prevent card navigation
    try {
      const result = await removeFromWebsiteCalendar(event._id);
      if (result.success) {
        const statusResult = await checkWebsiteCalendarStatus(event._id);
        if (statusResult.success) setCalendarStatus(statusResult.data);
      } else { console.error(result.message); }
    } catch (error) { console.error('Error removing from website calendar:', error); }
  };

  // Get truncated description for consistent card heights
  const getTruncatedDescription = (text, maxLength = 120) => {
    if (!text || text.length <= maxLength) return text || "No description provided.";
    return text.substring(0, maxLength).trim() + '...';
  };

  // Get event type display
  const getEventTypeDisplay = () => {
    if (!eventType) return 'General Event';
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get location display
  const getLocationDisplay = () => {
    if (!location) return 'Location not specified';
    const parts = location.split(',').map(part => part.trim());
    return parts.length > 2 ? parts.slice(-2).join(', ') : location;
  };

  // Get event features
  const getEventFeatures = () => {
    const features = [];
    
    if (waterProvided) features.push({ label: 'Water Provided', icon: '💧', color: 'text-blue-600' });
    if (medicalSupport) features.push({ label: 'Medical Support', icon: '🏥', color: 'text-red-600' });
    if (ageGroup) features.push({ label: ageGroup, icon: '👥', color: 'text-green-600' });
    if (timeSlotsEnabled) features.push({ label: 'Time Slots', icon: '⏰', color: 'text-purple-600' });
    if (equipmentNeeded?.length > 0) features.push({ label: 'Equipment', icon: '🛠️', color: 'text-amber-600' });
    if (recurringEvent) features.push({ label: 'Recurring', icon: '🔄', color: 'text-indigo-600' });
    
    return features;
  };

  const eventFeatures = getEventFeatures();

  // Get registration status display
  const getRegistrationStatus = () => {
    if (isPastEvent) {
      return { text: 'Event Ended', icon: XCircleIcon, color: 'text-red-600', bg: 'bg-red-100' };
    }
    if (isBanned) {
      return { text: 'Banned from Event', icon: XCircleIcon, color: 'text-red-600', bg: 'bg-red-100' };
    }
    if (isRemoved) {
      return { text: 'Removed from Event', icon: ExclamationTriangleIcon, color: 'text-yellow-600', bg: 'bg-yellow-100' };
    }
    if (isRegistered) {
      return { text: 'Registered Successfully', icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-100' };
    }
    if (availableSlots > 0 || hookUnlimitedVolunteers) {
      return { text: 'Registration Open', icon: StarIcon, color: 'text-blue-600', bg: 'bg-blue-100' };
    }
    return { text: 'No Slots Available', icon: XCircleIcon, color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  const registrationStatus = getRegistrationStatus();
  const StatusIcon = registrationStatus.icon;

  return (
    <div
      className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer relative min-h-[280px] flex flex-col"
      onClick={() => navigate(`/volunteer/events/${effectiveEventId}`)}
    >
      {/* Status Badges */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 items-end">
        {isLiveEvent && (
          <div className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow animate-pulse">
            LIVE
          </div>
        )}
        {isPastEvent && isRegistered && (
          questionnaireCompleted ? (
            <div className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
              Completed
            </div>
          ) : (
            <div className="bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
              Questionnaire Pending
            </div>
          )
        )}
        {isRecurringInstance && (
          <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
            #{recurringInstanceNumber}
          </div>
        )}
      </div>

      {/* Event Image */}
      <div className="relative h-36 overflow-hidden">
        <img
          src={eventImage}
          alt={eventType}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      </div>

      {/* Event Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Header with Organization Info inline */}
        <div className="mb-3">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-bold text-slate-900 line-clamp-2 group-hover:text-blue-700 transition-colors duration-200 flex-1 mr-3">
              {title}
            </h3>
            <div className="flex items-center gap-1 text-xs text-slate-600 flex-shrink-0">
              <BuildingOfficeIcon className="w-3 h-3" />
              <span className="truncate max-w-[80px]">
                {typeof organization === 'object' && organization?.name ? organization.name : typeof organization === 'string' ? organization : 'Unknown'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              {getEventTypeDisplay()}
            </div>
            {recurringEvent && (
              <div className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                {recurringType} - {recurringValue}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-slate-600 text-sm mb-3 line-clamp-2 flex-1">
          {getTruncatedDescription(description)}
        </p>

        {/* Compact Event Details Row */}
        <div className="flex items-center gap-4 mb-3 text-xs">
          <div className="flex items-center gap-1">
            <CalendarIcon className="w-3 h-3 text-slate-500" />
            <span className="text-slate-700 font-medium">
              {format(new Date(startDateTime), "d MMM")} • {format(new Date(startDateTime), "h:mm a")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <MapPinIcon className="w-3 h-3 text-slate-500" />
            <span className="text-slate-700 font-medium truncate max-w-[120px]">
              {getLocationDisplay()}
            </span>
          </div>
        </div>

        {/* Volunteer Slots and Event Features inline */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-3 h-3 text-slate-500" />
            <span className={`text-xs font-medium ${slotColor}`}>
              {slotMessage}
            </span>
            {!slotsLoading && !hookUnlimitedVolunteers && (
              <span className="text-xs text-slate-500">
                ({availableSlots || 0}/{hookMaxVolunteers || maxVolunteers || 0})
              </span>
            )}
          </div>
          
          {/* Compact Event Features */}
          {eventFeatures.length > 0 && (
            <div className="flex gap-1">
              {eventFeatures.slice(0, 3).map((feature, index) => (
                <div key={index} className="px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-600" title={feature.label}>
                  {feature.icon}
                </div>
              ))}
              {eventFeatures.length > 3 && (
                <div className="px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                  +{eventFeatures.length - 3}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Registration Status - Compact */}
        <div className="mb-3">
          <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${registrationStatus.bg}`}>
            <StatusIcon className={`w-3 h-3 ${registrationStatus.color}`} />
            <span className={`text-xs font-medium ${registrationStatus.color}`}>
              {registrationStatus.text}
            </span>
          </div>
        </div>

        {/* Registration Button */}
        {!isPastEvent && !isBanned && !isRemoved && !isRegistered && (availableSlots > 0 || hookUnlimitedVolunteers) && (
          <button
            onClick={handleRegister}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium mb-3"
          >
            Register for Event
          </button>
        )}

        {/* Footer with Stats inline */}
        <div className="mt-auto pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Click to view details</span>
            <div className="flex items-center gap-3">
              {volunteers?.length > 0 && (
                <div className="flex items-center gap-1">
                  <UsersIcon className="w-3 h-3" />
                  <span>{volunteers.length}</span>
                </div>
              )}
              {certificates?.length > 0 && (
                <div className="flex items-center gap-1">
                  <TrophyIcon className="w-3 h-3" />
                  <span>{certificates.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add to Calendar Button */}
      <div className="absolute bottom-3 right-3 z-20">
        <div className="relative">
          <button
            data-calendar-button
            onClick={(e) => {
              e.stopPropagation();
              setShowCalendarOptions(!showCalendarOptions);
            }}
            className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
            title="Add to Calendar"
          >
            <FaCalendarPlus className="w-4 h-4" />
          </button>
          
          {/* Calendar Options Dropdown */}
          {showCalendarOptions && (
            <div data-calendar-dropdown className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[220px] z-30">
              {/* Website Calendar Options */}
              {calendarStatus.canAddToCalendar && (
                <button
                  onClick={handleAddToWebsiteCalendar}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                >
                  <FaCalendarPlus className="w-4 h-4" />
                  Add to Website Calendar
                </button>
              )}
              {calendarStatus.canRemoveFromCalendar && (
                <button
                  onClick={handleRemoveFromWebsiteCalendar}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                >
                  <FaCalendarMinus className="w-4 h-4" />
                  Remove from Website Calendar
                </button>
              )}
              {calendarStatus.isRegistered && (
                <div className="px-3 py-2 text-sm text-gray-500 italic">
                  Registered events are automatically in calendar
                </div>
              )}
              
              {/* External Calendar Options */}
              <div className="border-t border-gray-200 my-1"></div>
              <button
                onClick={handleAddToCalendar}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
              >
                <FaCalendarPlus className="w-4 h-4" />
                Add to Google Calendar
              </button>
              <button
                onClick={handleDownloadCalendar}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
              >
                <FaCalendarPlus className="w-4 h-4" />
                Download .ics File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VolunteerEventCard;
