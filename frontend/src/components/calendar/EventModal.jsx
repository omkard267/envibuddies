import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { FaMapMarkerAlt, FaClock, FaUsers, FaCalendar, FaRedo } from 'react-icons/fa';
import axiosInstance from '../../api/axiosInstance';
import calendarEventEmitter from '../../utils/calendarEventEmitter';
import { showAlert, showConfirm } from '../../utils/notifications';
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from "../../utils/avatarUtils";
import { getSafeUserData, getSafeUserName } from "../../utils/safeUserUtils";
import { ButtonLoader, FullScreenLoader } from '../../components/common/LoaderComponents';
import {
  XMarkIcon,
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  UsersIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  LinkIcon
} from "@heroicons/react/24/outline";

const EventModal = ({ event, onClose, role, onEventUpdated }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [registrationDetails, setRegistrationDetails] = useState(null);
  const [isRegistered, setIsRegistered] = useState(event.isRegistered || false);
  
  // Registration modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registrationStep, setRegistrationStep] = useState(1);
  const [isGroup, setIsGroup] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [newMember, setNewMember] = useState({ name: "", phone: "", email: "" });
  const [volunteer, setVolunteer] = useState(null);
  
  
  // Determine event status
  const now = new Date();
  const eventStart = new Date(event.startDateTime);
  const eventEnd = new Date(event.endDateTime);
  
  const isUpcoming = now < eventStart;
  const isLive = now >= eventStart && now < eventEnd;
  const isCompleted = now >= eventEnd;

  // Check if this is a recurring event
  const isRecurring = event.recurringEvent || event.isRecurringInstance;
  const recurringPattern = event.recurringPattern || 
    (event.recurringEvent ? `${event.recurringType} - ${event.recurringValue}` : null);

  // Fetch registration details when modal opens
  useEffect(() => {
    const fetchRegistrationDetails = async () => {
      if (!event?._id) return;
      
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user?._id) return;
        
        const res = await axiosInstance.get(`/api/registrations/event/${event._id}/my-registration`);
        setIsRegistered(true);
        setRegistrationDetails(res.data.registration);
      } catch (error) {
        // User is not registered for this event
        setIsRegistered(false);
        setRegistrationDetails(null);
      }
    };
    
    fetchRegistrationDetails();
  }, [event?._id]);

  // Get volunteer details when registration modal opens
  useEffect(() => {
    if (showRegisterModal) {
      const user = JSON.parse(localStorage.getItem("user"));
      setVolunteer(user);
    }
  }, [showRegisterModal]);

  const handleRegisterClick = () => {
    setShowRegisterModal(true);
    setRegistrationStep(1);
    setIsGroup(false);
    setGroupMembers([]);
    setNewMember({ name: "", phone: "", email: "" });
  };

  const handleAddMember = () => {
    if (newMember.name && newMember.phone && newMember.email) {
      setGroupMembers([...groupMembers, newMember]);
      setNewMember({ name: "", phone: "", email: "" });
    }
  };

  const handleRegistrationSubmit = async ({ groupMembers, selectedTimeSlot }) => {
    try {
      setLoading(true);
      const qrLoadingId = showAlert.qrGenerating('Generating entry QR code...');
      const payload = { eventId: event._id, groupMembers, selectedTimeSlot };
      await axiosInstance.post('/api/registrations', payload);
      
      // Re-fetch registration details to update UI
      const regDetailsRes = await axiosInstance.get(`/api/registrations/event/${event._id}/my-registration`);
      setIsRegistered(true);
      setRegistrationDetails(regDetailsRes.data.registration);
      
      // Close registration modal
      setShowRegisterModal(false);
      
      // Notify calendar to refresh
      calendarEventEmitter.notifyCalendarRefresh();
      calendarEventEmitter.notifyEventChange(event._id, 'registered');
      
      // Call callback to refresh calendar
      if (onEventUpdated) {
        onEventUpdated();
      }
      
      showAlert.success("Registered successfully! Entry QR code generated.");
    } catch (error) {
      console.error('Registration failed:', error);
      showAlert.error(error.response?.data?.message || 'Failed to register for event');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!event?._id) return;
    
    showConfirm.warning(
      'Are you sure you want to withdraw your registration for this event?',
      async () => {
        try {
          setLoading(true);
          const qrDeletingId = showAlert.qrDeleting('Deleting QR codes...');
          // Use event ID for withdrawal as per backend route
          await axiosInstance.delete(`/api/registrations/${event._id}`);
          setIsRegistered(false);
          setRegistrationDetails(null);
          
          // Notify calendar to refresh
          calendarEventEmitter.notifyCalendarRefresh();
          calendarEventEmitter.notifyEventChange(event._id, 'withdrawn');
          
          // Call callback to refresh calendar
          if (onEventUpdated) {
            onEventUpdated();
          }
          
          showAlert.success('Registration withdrawn successfully. QR codes deleted.');
          
          // Close modal after successful withdrawal
          onClose();
        } catch (error) {
          console.error('Withdrawal failed:', error);
          showAlert.error(error.response?.data?.message || 'Failed to withdraw from event');
        } finally {
          setLoading(false);
        }
      },
      {
        title: '📝 Withdraw Registration',
        confirmText: 'Yes, withdraw',
        cancelText: 'Keep my registration'
      }
    );
  };

  const getStatusColor = (status, isCreator = false) => {
    if (isCreator) {
      // For organizers who created the event
      switch (status) {
        case 'upcoming': return 'text-blue-600';
        case 'live': return 'text-green-600';
        case 'completed': return 'text-gray-600';
        default: {
          // Fallback: calculate color based on event dates for organizers
          if (isUpcoming) return 'text-blue-600';
          if (isLive) return 'text-green-600';
          if (isCompleted) return 'text-gray-600';
          return 'text-gray-600';
        }
      }
    } else {
      // For volunteers
      switch (status) {
        case 'upcoming': return 'text-blue-600';
        case 'attended': return 'text-green-600';
        case 'missed': return 'text-red-600';
        default: return 'text-gray-600';
      }
    }
  };

  const getStatusText = (status, isCreator = false) => {
    if (isCreator) {
      // For organizers who created the event
      switch (status) {
        case 'upcoming': return 'Upcoming';
        case 'live': return 'Live';
        case 'completed': return 'Completed';
        default: {
          // Fallback: calculate status based on event dates for organizers
          if (isUpcoming) return 'Upcoming';
          if (isLive) return 'Live';
          if (isCompleted) return 'Completed';
          return 'Unknown';
        }
      }
    } else {
      // For volunteers
      switch (status) {
        case 'upcoming': return 'Upcoming';
        case 'attended': return 'Attended';
        case 'missed': return 'Missed';
        default: return 'Unknown';
      }
    }
  };

  // Recurring Event Information Component
  const RecurringEventInfo = () => {
    if (!isRecurring) return null;
    
    return (
      <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200 mb-4">
        <FaRedo className="text-purple-600 text-lg" />
        <div>
          <p className="text-sm font-semibold text-purple-800">Recurring Event</p>
          <p className="text-xs text-purple-600">
            {recurringPattern}
          </p>
          {event.isRecurringInstance && (
            <p className="text-xs text-purple-500">
              Instance #{event.recurringIndex + 1} of recurring series
            </p>
          )}
        </div>
      </div>
    );
  };

  // Registration Modal Component
  const RegistrationModal = () => {
    if (!showRegisterModal) return null;

    const handleRegister = () => {
      // Validate group members if group registration
      if (isGroup) {
        if (!groupMembers.length) {
          showAlert.warning("Please add at least one group member.");
          return;
        }
        for (const member of groupMembers) {
          if (!member.name || !member.phone || !member.email) {
            showAlert.warning("All group members must have name, phone, and email.");
            return;
          }
        }
      }
      const payload = {
        groupMembers: isGroup ? groupMembers : [],
      };
      handleRegistrationSubmit(payload);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
          <button
            className="absolute top-2 right-3 text-xl text-gray-500 hover:text-red-600"
            onClick={() => setShowRegisterModal(false)}
          >
            ×
          </button>
          
          {registrationStep === 1 && (
            <div>
              <div className="text-lg font-semibold mb-4">Confirm Your Details</div>
              <div className="flex items-center gap-4 mb-4">
                {volunteer?.profileImage ? (
                  <img
                    src={getProfileImageUrl(volunteer)}
                    alt={volunteer.name}
                    className="w-12 h-12 rounded-full object-cover bg-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-100 to-emerald-100 flex items-center justify-center border-2 border-blue-200 shadow-sm">
                    <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">{getAvatarInitial(volunteer?.name)}</span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-800">{volunteer?.name}</p>
                  <p className="text-sm text-gray-600">{volunteer?.email}</p>
                  <p className="text-sm text-gray-600">{volunteer?.phone}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                To update your details, please go to your profile settings.
              </p>
              <button
                onClick={() => setRegistrationStep(2)}
                className="w-full mt-2 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Next
              </button>
            </div>
          )}

          {registrationStep === 2 && (
            <div>
              <div className="text-lg font-semibold mb-4">Register as Individual or Group?</div>
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => { setIsGroup(false); setRegistrationStep(4); }}
                  className={`flex-1 py-2 rounded ${!isGroup ? 'bg-blue-600 text-white' : 'bg-white border border-blue-600 text-blue-600'} font-semibold`}
                >
                  Individual
                </button>
                <button
                  onClick={() => { setIsGroup(true); setRegistrationStep(3); }}
                  className={`flex-1 py-2 rounded ${isGroup ? 'bg-blue-600 text-white' : 'bg-white border border-blue-600 text-blue-600'} font-semibold`}
                >
                  Group
                </button>
              </div>
            </div>
          )}

          {registrationStep === 3 && (
            <div>
              <div className="text-lg font-semibold mb-2">Add Group Members</div>
              <div className="space-y-2 mb-2">
                <input
                  className="w-full border rounded px-3 py-2"
                  placeholder="Full Name"
                  value={newMember.name}
                  onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                />
                <input
                  className="w-full border rounded px-3 py-2"
                  placeholder="Phone Number"
                  value={newMember.phone}
                  onChange={e => setNewMember({ ...newMember, phone: e.target.value })}
                />
                <input
                  className="w-full border rounded px-3 py-2"
                  placeholder="Email Address"
                  value={newMember.email}
                  onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                />
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  Add Member
                </button>
              </div>

              {groupMembers.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-1">Added Members:</h4>
                  <ul className="list-disc list-inside text-sm text-gray-700">
                    {groupMembers.map((member, index) => (
                      <li key={index}>{member.name} - {member.email}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  className="px-4 py-2 rounded border border-gray-400 text-gray-700 hover:bg-gray-100"
                  onClick={() => setRegistrationStep(2)}
                >
                  Back
                </button>
                <button
                  onClick={() => setRegistrationStep(4)}
                  className={`px-4 py-2 rounded ${groupMembers.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  disabled={groupMembers.length === 0}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {registrationStep === 4 && (
            <div>
              <div className="text-lg font-semibold mb-3">Confirm & Register</div>
              <p className="mb-4 text-sm text-gray-600">
                Please confirm to register for this event. A QR code will be generated after successful registration.
              </p>
              <div className="flex justify-between">
                <button
                  className="px-4 py-2 rounded border border-gray-400 text-gray-700 hover:bg-gray-100"
                  onClick={() => setRegistrationStep(isGroup ? 3 : 2)}
                >
                  Back
                </button>
                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <ButtonLoader size="sm" color="white" />
                      Generating QR Code...
                    </>
                  ) : (
                    'Register'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-bold text-gray-800">{event.title}</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            {/* Status Badge */}
            <div className="mt-2 flex gap-2">
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(event.status, event.isCreator)} bg-opacity-10`}>
                {getStatusText(event.status, event.isCreator)}
              </span>
              {event.isCreator && (
                <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-yellow-400 text-yellow-900">
                  👑 Created by You
                </span>
              )}
            </div>
          </div>

          {/* Event Details */}
          <div className="p-6 space-y-4">
            {/* Recurring Event Information */}
            <RecurringEventInfo />
            
            {/* Date & Time */}
            <div className="flex items-center gap-3">
              <FaCalendar className="text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Date & Time</p>
                <p className="font-medium">
                  {event.startDateTime ? format(new Date(event.startDateTime), 'EEEE, MMMM d, yyyy') : 'Date not available'}
                </p>
                <p className="text-sm text-gray-500">
                  {event.startDateTime && event.endDateTime ? 
                    `${format(new Date(event.startDateTime), 'h:mm a')} - ${format(new Date(event.endDateTime), 'h:mm a')}` : 
                    'Time not available'
                  }
                </p>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-center gap-3">
                <FaMapMarkerAlt className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-medium">{event.location}</p>
                </div>
              </div>
            )}

            {/* Event Type */}
            {event.eventType && (
              <div className="flex items-center gap-3">
                <FaUsers className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Event Type</p>
                  <p className="font-medium capitalize">
                    {event.eventType.replace('_', ' ')}
                  </p>
                </div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Description</p>
                <p className="text-gray-800">{event.description}</p>
              </div>
            )}

            {/* Action Buttons */}
            {role === 'volunteer' && (
              <div className="pt-4 border-t">
                {isUpcoming && (
                  <>
                    {isRegistered ? (
                      <button
                        onClick={handleWithdraw}
                        disabled={loading}
                        className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {loading ? 'Withdrawing...' : 'Withdraw Registration'}
                      </button>
                    ) : (
                      <button
                        onClick={handleRegisterClick}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading ? 'Registering...' : 'Register for Event'}
                      </button>
                    )}
                  </>
                )}
                
                {isLive && (
                  <div className="text-center py-3">
                    <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="font-semibold">Event is Live</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      This event is currently happening. You cannot modify your registration.
                    </p>
                  </div>
                )}
                
                {isCompleted && (
                  <div className="text-center py-3">
                    <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg">
                      <span className="font-semibold">Event Completed</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      This event has ended. Check your attendance status above.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* View Details Button */}
            <div className="pt-4 border-t">
              <button
                onClick={() => {
                  onClose();
                  // For recurring instances, use the original event ID for navigation
                  const eventId = event.isRecurringInstance && event.originalEventId 
                    ? event.originalEventId 
                    : event._id;
                  
                  // Navigate to event details page based on role
                  if (role === 'volunteer') {
                    navigate(`/volunteer/events/${eventId}`);
                  } else {
                    navigate(`/events/${eventId}`);
                  }
                }}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200"
              >
                View Full Details
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Registration Modal */}
      <RegistrationModal />

      {/* Page Loader for Registration */}
      <FullScreenLoader
        isVisible={loading}
        message="Processing Registration..."
        showProgress={false}
      />
    </>
  );
};

export default EventModal; 