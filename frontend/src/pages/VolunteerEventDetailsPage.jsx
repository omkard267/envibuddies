// src/pages/VolunteerEventDetailsPage.jsx

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

import { format } from "date-fns";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

import axiosInstance from "../api/axiosInstance";
import { getFullOrganizerTeam } from "../api/event";
import { getEventReport, downloadReportAsPDF } from '../utils/reportUtils';
import defaultImages from "../utils/eventTypeImages";
import { addEventToCalendar, downloadCalendarFile, addToWebsiteCalendar, removeFromWebsiteCalendar, checkWebsiteCalendarStatus } from "../utils/calendarUtils";
import { FaCalendarPlus, FaCalendarMinus } from "react-icons/fa";
import calendarEventEmitter from "../utils/calendarEventEmitter";

import useEventSlots from '../hooks/useEventSlots';
import Navbar from "../components/layout/Navbar";
import VolunteerRegisterModal from "../components/volunteer/VolunteerRegisterModal";
import VolunteerQuestionnaireModal from '../components/volunteer/VolunteerQuestionnaireModal';
import EventChatBox from '../components/chat/EventChatBox';
import StaticMap from '../components/event/StaticMap';
import ImageCarousel from '../components/event/ImageCarousel';
import Avatar from "../components/common/Avatar";
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from "../utils/avatarUtils";
import { 
  getSafeUserData, 
  getDisplayName, 
  getUsernameDisplay, 
  getSafeUserName,
  getSafeUserId,
  getSafeUserRole,
  canNavigateToUser 
} from "../utils/safeUserUtils";
import { showAlert, showConfirm } from "../utils/notifications";
import { ButtonLoader, FullScreenLoader } from "../components/common/LoaderComponents";

// CommentAvatarAndName component
const CommentAvatarAndName = ({ comment }) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (comment.volunteer?._id && canNavigateToUser(comment.volunteer)) {
      navigate(`/volunteer/${comment.volunteer._id}`);
    }
  };

  // Get safe volunteer data
  const safeVolunteer = getSafeUserData(comment.volunteer);

  return (
    <div 
      className={`flex items-center space-x-3 p-2 rounded transition-colors ${
        canNavigateToUser(safeVolunteer) 
          ? 'cursor-pointer hover:bg-gray-50' 
          : 'cursor-default opacity-75'
      }`}
      onClick={handleClick}
    >
      {getProfileImageUrl(safeVolunteer) ? (
        <img 
          src={getProfileImageUrl(safeVolunteer)} 
          alt={getSafeUserName(safeVolunteer)} 
          className="w-10 h-10 rounded-full object-cover border-2 border-green-400" 
        />
      ) : (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-green-400 ${getRoleColors('volunteer')}`}>
          <span className="text-sm font-bold">{getAvatarInitial(safeVolunteer)}</span>
        </div>
      )}
      <span className={`font-medium ${safeVolunteer.isDeleted ? 'text-gray-500' : 'text-green-800'}`}>
        {getUsernameDisplay(safeVolunteer) || getSafeUserName(safeVolunteer)}
      </span>
    </div>
  );
};

export default function VolunteerEventDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Registration state
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationDetails, setRegistrationDetails] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isGeneratingQrCode, setIsGeneratingQrCode] = useState(false);
  
  // UI Interaction state
  const [showExitQr, setShowExitQr] = useState(false);
  const [exitQrPath, setExitQrPath] = useState({});
  const userData = JSON.parse(localStorage.getItem("user"));
  const user = getSafeUserData(userData); // Get safe user data



  // Organizer & Volunteer List state
  const [organizerTeam, setOrganizerTeam] = useState([]);
  const [showOrganizerTeamDrawer, setShowOrganizerTeamDrawer] = useState(false);
  const [volunteers, setVolunteers] = useState([]);
  const [volunteersLoading, setVolunteersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('organizers');
  
  // Search state
  const [organizerSearchTerm, setOrganizerSearchTerm] = useState("");
  const [volunteerSearchTerm, setVolunteerSearchTerm] = useState("");

  // Questionnaire state
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(false);
  const [questionnaireSubmitting, setQuestionnaireSubmitting] = useState(false);

  // Certificate state
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
  const [isDownloadingCertificate, setIsDownloadingCertificate] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);
  
  // Report state
  const [eventReport, setEventReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Calendar state
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState({
    isRegistered: false, isInCalendar: false, canAddToCalendar: false, canRemoveFromCalendar: false
  });

  // Custom hook for live slot information
  const { availableSlots, unlimitedVolunteers, loading: slotsLoading } = useEventSlots(id);

  // Check if user is removed or banned from this event
  const isRemoved = event?.removedVolunteers?.includes(getSafeUserId(user));
  const isBanned = event?.bannedVolunteers?.includes(getSafeUserId(user));

  // User-friendly slot message with color
  let slotMessage = '';
  let slotColor = '';
  if (slotsLoading) {
    slotMessage = 'Loading slots...';
    slotColor = '';
  } else if (unlimitedVolunteers) {
    slotMessage = 'Unlimited slots';
    slotColor = '';
  } else if (typeof availableSlots === 'number') {
    if (availableSlots <= 0) {
      slotMessage = 'No slots left';
      slotColor = 'text-red-600';
    } else if (availableSlots <= 2) {
      slotMessage = `Only ${availableSlots} slot${availableSlots === 1 ? '' : 's'} remaining`;
      slotColor = 'text-red-600';
    } else if (availableSlots <= 5) {
      slotMessage = `Only ${availableSlots} slots remaining`;
      slotColor = 'text-orange-500';
    } else {
      slotMessage = `${availableSlots} slots left`;
      slotColor = 'text-green-700';
    }
  }

  // --- DATA FETCHING & SIDE EFFECTS ---

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await axiosInstance.get(`/api/events/${id}`);
        setEvent(res.data);
        if (res.data.organizerTeam && Array.isArray(res.data.organizerTeam)) {
          setOrganizerTeam(res.data.organizerTeam);
        }
      } catch (err) {
        setError("Event not found or failed to load.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id, forceRefresh]); // Added forceRefresh to re-fetch event data when needed

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

  // Check calendar status
  useEffect(() => {
    const checkCalendarStatus = async () => {
      if (!getSafeUserId(user) || !event?._id) return;
      
      try {
        const result = await checkWebsiteCalendarStatus(event._id);
        if (result.success) {
          setCalendarStatus(result.data);
        }
      } catch (error) {
        console.error('Error checking calendar status:', error);
      }
    };
    
    checkCalendarStatus();
  }, [event?._id, getSafeUserId(user)]);

  // Poll for AI summary if it's missing
  useEffect(() => {
    if (!event || event.summary) return;
    const interval = setInterval(async () => {
      try {
        const res = await axiosInstance.get(`/api/events/${id}`);
        if (res.data.summary && res.data.summary.trim()) {
          setEvent(prev => ({ ...prev, summary: res.data.summary }));
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Polling for summary failed:", err);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [event, id]);

  // Fetch full organizer team details
  useEffect(() => {
    const fetchTeam = async () => {
      if (!event?._id) return;
      try {
        const team = await getFullOrganizerTeam(id);
        setOrganizerTeam(team);
      } catch (err) {
        setOrganizerTeam([]);
      }
    };
    fetchTeam();
  }, [event?._id, id]);

  // Check user's registration status on load
  useEffect(() => {
    if (event?._id && getSafeUserId(user)) {
      axiosInstance.get(`/api/registrations/event/${event._id}/my-registration`)
        .then(res => {
          if (res.data.registered) {
            setIsRegistered(true);
            setRegistrationDetails(res.data.registration);
            if (new Date() > new Date(event.endDateTime) && res.data.questionnaireCompleted) {
              setQuestionnaireCompleted(true);
            }
          } else {
            setIsRegistered(false);
            setRegistrationDetails(null);
            setQuestionnaireCompleted(false);
          }
        })
        .catch((err) => {
          // Handle 404 and other errors gracefully
          if (err.response?.status === 404) {
            setIsRegistered(false);
            setRegistrationDetails(null);
            setQuestionnaireCompleted(false);
          } else {
            console.error('Error checking registration status:', err);
            setIsRegistered(false);
            setRegistrationDetails(null);
            setQuestionnaireCompleted(false);
          }
        });
    }
  }, [event?._id, getSafeUserId(user), event?.endDateTime]);

  // Poll for attendance `inTime` if user is registered but hasn't been scanned in
  useEffect(() => {
    if (!isRegistered || registrationDetails?.inTime || !event?._id) return;
    const interval = setInterval(async () => {
      try {
        const res = await axiosInstance.get(`/api/registrations/event/${event._id}/my-registration`);
        if (res.data.registration?.inTime) {
          setRegistrationDetails(res.data.registration);
          clearInterval(interval);
        }
      } catch (err) {
         console.error("Polling for inTime failed:", err);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [isRegistered, registrationDetails?.inTime, event?._id]);

  // Fetch list of registered volunteers when the drawer is opened
  const fetchVolunteers = useCallback(() => {
    if (!event?._id) return;
    setVolunteersLoading(true);
    axiosInstance.get(`/api/registrations/event/${event._id}/volunteers`)
      .then(res => {
        setVolunteers(res.data);
      })
      .catch(err => console.error("Failed to fetch volunteers:", err))
      .finally(() => setVolunteersLoading(false));
  }, [event?._id]);

  // Check for available event report for past events
  const isPastEvent = event && event.endDateTime ? new Date(event.endDateTime) < new Date() : false;
  
  // Clear QR codes when event becomes past
  useEffect(() => {
    if (isPastEvent) {
      clearQrCodeState();
    }
  }, [isPastEvent]); // Only depend on isPastEvent
  
  useEffect(() => {
    if (isPastEvent) {
      fetchEventReport();
    }
  }, [isPastEvent]); // Fetch report for all users when event is past

  // Socket connection for real-time updates (slots, etc.)
  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token: localStorage.getItem('token') }
    });
    
    socket.on('connect', () => {
      // Join event-specific rooms for real-time updates
      if (event?._id) {
        socket.emit('joinEventSlotsRoom', event._id);
      }
    });
    
    return () => {
      if (event?._id) {
        socket.emit('leaveEventSlotsRoom', event._id);
      }
      socket.disconnect();
    };
  }, [event?._id]);

  // --- EVENT HANDLERS ---

  const handleRegistrationSubmit = async ({ groupMembers, selectedTimeSlot }) => {
    try {
      setIsGeneratingQrCode(true);
      const qrLoadingId = showAlert.qrGenerating('Generating entry QR code...');
      
      const payload = { eventId: event._id, groupMembers, selectedTimeSlot };
      await axiosInstance.post("/api/registrations", payload);
      setShowRegisterModal(false);
      
      // Re-fetch registration details to update UI
      const regDetailsRes = await axiosInstance.get(`/api/registrations/event/${event._id}/my-registration`);
      if (regDetailsRes.data.registered) {
        setIsRegistered(true);
        setRegistrationDetails(regDetailsRes.data.registration);
      }
      showAlert.success("Registered successfully! Entry QR code generated.");
    } catch (err) {
      console.error("Registration failed:", err);
      const errorMessage = err.response?.data?.message || "Failed to register. Please try again.";
      showAlert.error(errorMessage);
    } finally {
      setIsGeneratingQrCode(false);
    }
  };

  const handleWithdrawRegistration = async () => {
    if (!event?._id) return;
    // Use showConfirm for better UX
    showConfirm.action(
      'Are you sure you want to withdraw your registration for this event?',
      async () => {
        try {
          const qrDeletingId = showAlert.qrDeleting('Deleting QR codes...');
          // Use event ID for withdrawal as per backend route
          await axiosInstance.delete(`/api/registrations/${event._id}`);
          setIsRegistered(false);
          setRegistrationDetails(null);
          showAlert.success('Registration withdrawn successfully. QR codes deleted.');
        } catch (err) {
          showAlert.error(err.response?.data?.message || 'Failed to withdraw registration.');
        }
      },
      {
        title: 'Withdraw Registration',
        confirmText: 'Yes, Withdraw',
        cancelText: 'Cancel',
        type: 'warning'
      }
    );
    return;
  };

  const handleGenerateExitQr = async () => {
    if (!registrationDetails?._id) return;
    try {
      setLoading(true);
      const qrLoadingId = showAlert.qrGenerating('Generating exit QR code...');
      const res = await axiosInstance.get(`/api/registrations/${registrationDetails._id}/exit-qr`);
      setExitQrPath(res.data.exitQrPath);
      setShowExitQr(true);
      showAlert.success('Exit QR code generated successfully!');
    } catch (err) {
      showAlert.error(err.response?.data?.message || 'Failed to generate exit QR.');
    } finally {
      setLoading(false);
    }
  };

  // Clear QR code state when event completes
  const clearQrCodeState = () => {
    // Clear exit QR code state
    setExitQrPath({});
    // Clear entry QR code reference from registration details
    if (registrationDetails?.qrCodePath) {
      setRegistrationDetails(prev => ({
        ...prev,
        qrCodePath: {}
      }));
    }
  };
  
  const handleQuestionnaireSubmit = async (answers, mediaFiles = []) => {
    if (questionnaireCompleted) {
      showAlert.warning('You have already submitted your questionnaire.');
      return;
    }
    
    setQuestionnaireSubmitting(true);
    try {
      // Handle Cloudinary media files - they are already uploaded
      if (mediaFiles && mediaFiles.length > 0) {
        const formData = new FormData();
        formData.append('answers', JSON.stringify(answers));
        
        // Filter out files that are already uploaded to Cloudinary
        const cloudinaryMedia = mediaFiles.filter(file => file.uploaded && file.url);
        if (cloudinaryMedia.length > 0) {
          formData.append('media', JSON.stringify(cloudinaryMedia));
        }
        
        await axiosInstance.post(`/api/registrations/event/${event._id}/questionnaire`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // No media files, use regular JSON
        await axiosInstance.post(`/api/registrations/event/${event._id}/questionnaire`, { answers });
      }
      
      setQuestionnaireCompleted(true);
      setShowQuestionnaireModal(false);
      
      if (registrationDetails) {
        setRegistrationDetails(prev => ({ ...prev, questionnaireCompleted: true }));
      }
      
      showAlert.success('Questionnaire submitted successfully! Thank you for your feedback.');
    } catch (err) {
      console.error('Questionnaire submission error:', err);
      const errorMessage = err.response?.data?.message || 'Failed to submit questionnaire. Please try again.';
      showAlert.error(errorMessage);
      
      if (err.response?.status === 400 && err.response?.data?.message?.includes('already submitted')) {
        setQuestionnaireCompleted(true);
        setShowQuestionnaireModal(false);
      }
    } finally {
      setQuestionnaireSubmitting(false);
    }
  };

  const handleGenerateCertificate = async () => {
    if (!isRegistered || !questionnaireCompleted || !event?._id) {
      showAlert.warning('You are not eligible to generate a certificate at this time.');
      return;
    }
    
    setIsGeneratingCertificate(true);
    try {
      // Step 1: Initiate certificate generation
      showAlert.info('🔄 Starting certificate generation...');
      await axiosInstance.post(`/api/events/${event._id}/generate-certificate`);
      
      // Step 2: Wait for backend processing with progress feedback
      showAlert.info('📄 Generating PDF certificate...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 3: Uploading to Cloudinary
      showAlert.info('☁️ Uploading certificate to Cloudinary...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 4: Refresh event data
      setForceRefresh(prev => prev + 1); // Trigger re-fetch of event data
      showAlert.success('🎉 Certificate generated successfully! You can now download it.');
    } catch (err) {
      console.error('Certificate generation error:', err);
      showAlert.error(err.response?.data?.message || 'Failed to generate certificate. Please try again.');
    } finally {
      setIsGeneratingCertificate(false);
    }
  };

  // Enhanced certificate download handler with loading state
  const handleDownloadCertificate = async (certificateUrl, certificateName) => {
    setIsDownloadingCertificate(true);
    try {
      showAlert.info('📥 Starting certificate download...');
      
      // For Cloudinary URLs, add download parameters to force download
      let downloadUrl = certificateUrl;
      if (certificateUrl.includes('cloudinary.com')) {
        const separator = certificateUrl.includes('?') ? '&' : '?';
        downloadUrl = `${certificateUrl}${separator}fl_attachment`;
      }

      // Create a temporary link element for download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = certificateName || 'certificate.pdf';
      link.style.display = 'none';
      
      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Small delay to ensure download starts
      await new Promise(resolve => setTimeout(resolve, 500));
      
      showAlert.success('✅ Certificate download started!');
    } catch (error) {
      console.error('Certificate download error:', error);
      showAlert.error('❌ Failed to download certificate. Please try again.');
    } finally {
      setIsDownloadingCertificate(false);
    }
  };

  const fetchEventReport = async () => {
    if (!event?._id) return;
    setReportLoading(true);
    try {
    const result = await getEventReport(event._id);
    if (result.success) {
      setEventReport(result.data);
    } else {
      console.error('Failed to fetch report:', result.error);
    }
    } catch (error) {
      console.error('Error fetching event report:', error);
    } finally {
    setReportLoading(false);
    }
  };

  const handleViewReport = () => setShowReportModal(true);

  const handleDownloadReport = () => {
    if (eventReport?.report?.content) {
      const filename = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.pdf`;
      downloadReportAsPDF(eventReport.report.content, filename);
    }
  };

  // Fetch comments for the event
  const fetchComments = useCallback(async () => {
    if (!event?._id) return;
    
    setCommentsLoading(true);
    try {
      const response = await axiosInstance.get(`/api/registrations/event/${event._id}/comments`);
      if (response.data.success) {
        setComments(response.data.comments);
      } else {
        console.error('Failed to fetch comments:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  }, [event?._id]);

  // --- DERIVED STATE & RENDER LOGIC ---

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading event details...</p></div>;
  }
  if (error || !event) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-red-500">{error}</p></div>;
  }



  // Calendar functions
  const handleAddToCalendar = () => {
    const result = addEventToCalendar(event);
    if (result.success) {
    } else {
      console.error(result.message);
    }
  };

  const handleDownloadCalendar = () => {
    const result = downloadCalendarFile(event);
    if (result.success) {
    } else {
      console.error(result.message);
    }
  };

  const handleAddToWebsiteCalendar = async () => {
    try {
      const result = await addToWebsiteCalendar(event._id);
      if (result.success) {
        const statusResult = await checkWebsiteCalendarStatus(event._id);
        if (statusResult.success) setCalendarStatus(statusResult.data);
      } else { console.error(result.message); }
    } catch (error) { console.error('Error adding to website calendar:', error); }
  };

  const handleRemoveFromWebsiteCalendar = async () => {
    try {
      const result = await removeFromWebsiteCalendar(event._id);
      if (result.success) {
        const statusResult = await checkWebsiteCalendarStatus(event._id);
        if (statusResult.success) setCalendarStatus(statusResult.data);
      } else { console.error(result.message); }
    } catch (error) { console.error('Error removing from website calendar:', error); }
  };

  const now = new Date();
  const isLiveEvent = new Date(event.startDateTime) <= now && now < new Date(event.endDateTime);
  const hasCompletedEvent = !!(registrationDetails?.inTime && registrationDetails?.outTime);

  // Filter certificates for current user
  const userCertificates = event?.certificates?.filter(
    cert => (getSafeUserId(cert.user) || cert.user) === getSafeUserId(user)
  ) || [];
  
  const canGenerateCertificate = isPastEvent && isRegistered && questionnaireCompleted && userCertificates.length > 0 && userCertificates[0].role === 'volunteer' && !userCertificates[0].filePath?.url;
  const certificateGenerated = userCertificates.length > 0 && userCertificates[0].filePath?.url;

  const eventImage = defaultImages[event.eventType?.toLowerCase()] || defaultImages["default"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pb-12 relative">
      <Navbar />

      {/* Single Participants Sidebar Button */}
      {(organizerTeam.length > 0 || true) && (
          <button
          className={`fixed z-50 bg-gradient-to-r from-blue-600/80 to-blue-700/80 backdrop-blur-sm text-white px-3 py-3 rounded-l-lg shadow-lg hover:from-blue-700/90 hover:to-blue-800/90 transition-all duration-300 transform top-32 ${
            showOrganizerTeamDrawer ? 'right-96' : 'right-0'
          }`}
          onClick={() => {
            setShowOrganizerTeamDrawer((prev) => {
              if (!prev) {
                fetchVolunteers();
              }
              return !prev;
            });
          }}
        >
          <div className="flex flex-col items-center gap-1">
            {/* Participants Icon */}
            <svg 
              className="w-5 h-5 text-white" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
            
            {/* Arrow Icon */}
            <div className={`w-3 h-3 transition-all duration-300 ${
              showOrganizerTeamDrawer ? 'rotate-0' : 'rotate-180'
            }`}>
              <svg 
                className="w-3 h-3 text-white" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          </button>
      )}

      {/* Single Participants Sidebar with Slider */}
      {(organizerTeam.length > 0 || true) && (
        <div
          className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out ${showOrganizerTeamDrawer ? 'translate-x-0' : 'translate-x-full'}`}
        >
            <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-blue-700">View Participants</h2>
            <button
              className="text-gray-500 hover:text-red-600 text-2xl font-bold"
              onClick={() => setShowOrganizerTeamDrawer(false)}
              aria-label="Close participants drawer"
            >
              ×
            </button>
            </div>
          
          {/* Slider Tabs */}
          <div className="px-6 py-3 border-b">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => {
                  setActiveTab('organizers');
                }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === 'organizers'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Organizers ({organizerTeam.length})
              </button>
              <button
                onClick={() => {
                  if (activeTab !== 'volunteers') {
                    fetchVolunteers();
                  }
                  setActiveTab('volunteers');
                }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === 'volunteers'
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Volunteers ({volunteers.length})
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
            <div className="px-6 py-3 border-b">
              <input
                type="text"
              placeholder={`Search ${activeTab === 'organizers' ? 'organizers' : 'volunteers'}...`}
              value={activeTab === 'organizers' ? organizerSearchTerm : volunteerSearchTerm}
              onChange={(e) => {
                if (activeTab === 'organizers') {
                  setOrganizerSearchTerm(e.target.value);
                } else {
                  setVolunteerSearchTerm(e.target.value);
                }
              }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          
          {/* Content Area */}
          <div className="overflow-y-auto h-[calc(100%-200px)] px-6 py-4 custom-scrollbar">
            {/* Organizers Tab Content */}
            {activeTab === 'organizers' && (
              <div className="space-y-4">
                {/* Active Organizers Section */}
                <div>
                  <h3 className="text-md font-semibold text-blue-700 mb-3">Active Organizers</h3>
              {organizerTeam
                    .filter((obj) => {
                      if (!obj.user || !obj.user._id) return false;
                      const user = obj.user;
                      const displayName = getSafeUserName(user) || getUsernameDisplay(user) || '';
                  return displayName.toLowerCase().includes(organizerSearchTerm.toLowerCase());
                })
                    .map((obj) => {
                      const user = obj.user;
                      const isThisUserCreator = user._id === event.createdBy._id;
                      const displayName = getSafeUserName(user) || getUsernameDisplay(user) || 'User';
                      const displayText = getSafeUserName(user) ? `@${getSafeUserName(user)}` : displayName;
                      const canNavigate = canNavigateToUser(user);
                      
                  return (
                        <div
                          key={user._id}
                          className={`group relative bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 mb-3 transform hover:scale-[1.02] ${isThisUserCreator ? 'border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-md' : ''}`}
                          onClick={() => canNavigate && navigate(`/organizer/${getSafeUserId(user)}`)}
                        >
                          <div className="flex items-center">
                            {getProfileImageUrl(user) ? (
                              <img
                                src={getProfileImageUrl(user)}
                                alt={getSafeUserName(user)}
                                className="w-12 h-12 lg:w-14 lg:h-14 rounded-full object-cover border-2 border-blue-400 mr-3 lg:mr-4 shadow-sm"
                              />
                            ) : (
                              <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center border-2 border-blue-400 mr-3 lg:mr-4 shadow-sm ${getRoleColors(user.role || 'organizer')}`}>
                                <span className="text-base lg:text-lg font-bold">{getAvatarInitial(user)}</span>
                      </div>
                            )}
                      <div className="flex flex-col flex-1 min-w-0">
                              <span className={`font-medium text-blue-800 text-base lg:text-lg truncate ${
                                user.isDeleted ? 'text-gray-600' : ''
                              }`}>{displayText}</span>
                              {getSafeUserName(user) && getSafeUserRole(user) === 'organizer' && (
                                <span className="text-sm text-gray-600 truncate">{getSafeUserRole(user)}</span>
                        )}
                      </div>
                            {isThisUserCreator && (
                              <span className="ml-2 px-2 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs rounded-full font-bold shadow-sm">Creator</span>
                      )}
                          </div>
                    </div>
                  );
                    })
                  }
              {organizerTeam.filter(obj => {
                    if (!obj.user?._id) return false;
                    const user = obj.user;
                    const displayName = getSafeUserName(user) || getUsernameDisplay(user) || '';
                return displayName.toLowerCase().includes(organizerSearchTerm.toLowerCase());
              }).length === 0 && organizerSearchTerm && (
                <div className="text-gray-500 text-center py-4">No organizers found matching "{organizerSearchTerm}"</div>
              )}
            </div>
          </div>
            )}
            
            {/* Volunteers Tab Content */}
            {activeTab === 'volunteers' && (
              <div className="space-y-4">
                {/* Active Volunteers Section */}
                <div>
                  <h3 className="text-md font-semibold text-green-700 mb-3">Active Volunteers</h3>
          {volunteersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                      <span className="ml-3 text-gray-600">Loading volunteers...</span>
                    </div>
          ) : volunteers.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">
                      <div className="text-gray-400 mb-2">👥</div>
                      <p>No volunteers registered yet.</p>
                    </div>
          ) : (
            volunteers
              .filter(vol => {
                const displayName = getSafeUserName(vol) || getUsernameDisplay(vol) || '';
                return displayName.toLowerCase().includes(volunteerSearchTerm.toLowerCase());
              })
              .map(vol => {
                const safeVol = getSafeUserData(vol);
                const displayName = getDisplayName(safeVol);
                const displayText = getUsernameDisplay(safeVol);
                const canNavigate = canNavigateToUser(vol);
                
                return (
                  <div 
                    key={getSafeUserId(vol) || safeVol._id} 
                            className={`group relative bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 mb-3 transform hover:scale-[1.02] ${
                              safeVol.isDeleted ? 'opacity-75 bg-gray-100' : ''
                    }`} 
                    onClick={() => canNavigate && navigate(`/volunteer/${getSafeUserId(vol)}`)}
                  >
                            <div className="flex items-center">
                              {getProfileImageUrl(safeVol) ? (
                                <img
                                  src={getProfileImageUrl(safeVol)}
                                  alt={getSafeUserName(safeVol)}
                                  className="w-12 h-12 lg:w-14 lg:h-14 rounded-full object-cover border-2 border-green-400 mr-3 lg:mr-4 shadow-sm"
                                />
                              ) : (
                                <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center border-2 border-green-400 mr-3 lg:mr-4 shadow-sm ${getRoleColors(safeVol.role || 'volunteer')}`}>
                                  <span className="text-base lg:text-lg font-bold">{getAvatarInitial(safeVol)}</span>
                    </div>
                              )}
                    <div className="flex flex-col flex-1 min-w-0">
                                <span className={`font-medium text-green-800 text-base lg:text-lg truncate ${
                                  safeVol.isDeleted ? 'text-gray-600' : ''
                      }`}>
                        {displayText}
                        {safeVol.isDeleted && (
                          <span className="ml-2 px-2 py-1 bg-gray-500 text-white text-xs rounded-full font-bold">Deleted User</span>
                        )}
                      </span>
                      {safeVol.username && safeVol.name && !safeVol.isDeleted && (
                        <span className="text-sm text-gray-600 truncate">{safeVol.name}</span>
                      )}
                      {safeVol.isDeleted && safeVol.name && (
                        <span className="text-sm text-gray-500 truncate">{safeVol.name}</span>
                      )}
                              </div>
                    </div>
                  </div>
                );
              })
          )}
          {volunteers.filter(vol => {
            const displayName = getSafeUserName(vol) || getUsernameDisplay(vol) || '';
            return displayName.toLowerCase().includes(volunteerSearchTerm.toLowerCase());
          }).length === 0 && volunteerSearchTerm && volunteers.length > 0 && (
            <div className="text-gray-500 text-center py-4">No volunteers found matching "{volunteerSearchTerm}"</div>
          )}
        </div>
      </div>
            )}
          </div>
        </div>
      )}
      
      {/* LIVE badge */}
      {isLiveEvent && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow z-20 animate-pulse">LIVE</div>
      )}

             <div className="pt-24 w-full px-6">
         {/* Two Column Layout */}
         <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 max-w-none xl:h-[calc(100vh-8rem)]">
           {/* Left Column - Action Cards */}
           <div className="xl:col-span-1 space-y-6 xl:overflow-y-auto xl:max-h-screen pr-2 pb-8 custom-scrollbar">
             {/* Certificate Section - Only visible for completed events */}
             {isPastEvent && isRegistered && (
               <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                 <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                   <DocumentTextIcon className="w-5 h-5 text-blue-600" />
              Your Certificate
            </h3>
            {userCertificates.length > 0 ? (
                   <div className="space-y-3">
                {certificateGenerated ? (
                    <div className="text-center">
                      <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm mb-3">
                        🎉 <strong>Certificate ready!</strong> You can now download your certificate.
                      </div>
                      <button
                        onClick={() => handleDownloadCertificate(
                          userCertificates[0].filePath.url,
                          `${event.title}_${userCertificates[0].award}_certificate.pdf`
                        )}
                        disabled={isDownloadingCertificate}
                        className="inline-flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDownloadingCertificate ? (
                          <>
                            <ButtonLoader size="sm" className="mr-2" />
                            Downloading...
                          </>
                        ) : (
                          '📄 Download Certificate'
                        )}
                      </button>
                    </div>
                  ) : (
                       <div className="space-y-3">
                         <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                           <p className="text-sm text-green-800">
                             🎖️ <strong>Award assigned!</strong> You can now generate your certificate.
                           </p>
                           <p className="text-xs text-green-700 mt-1">
                             Award: <span className="text-blue-800">{userCertificates[0]?.award}</span>
                           </p>
                         </div>
                         <button
                           onClick={handleGenerateCertificate}
                           disabled={!canGenerateCertificate || isGeneratingCertificate}
                           className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                           {isGeneratingCertificate ? (
                             <>
                               <ButtonLoader size="sm" className="mr-2" />
                               Generating Certificate...
                             </>
                           ) : (
                             "🎨 Generate Certificate"
                           )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
                   <div className="space-y-3">
                {!questionnaireCompleted ? (
                       <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                         <p className="text-sm text-amber-800">
                           📝 <strong>Complete your questionnaire first</strong> to be eligible for a certificate.
                         </p>
                       </div>
                     ) : (
                       <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                         <p className="text-sm text-blue-800">
                           ⏳ <strong>Questionnaire completed!</strong> Certificates will be available once the event organizer assigns awards.
                         </p>
                       </div>
                )}
              </div>
            )}
          </div>
             )}

             {/* Questionnaire Section for Volunteers */}
             {isPastEvent && isRegistered && (
               <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                 <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                   <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                   </svg>
                   Event Feedback
                 </h3>
                 
                 <div className="space-y-3">
                   {questionnaireCompleted ? (
                     <div className="text-center py-2">
                       <div className="text-green-600 font-medium mb-2">✅ Questionnaire Completed</div>
                       <p className="text-sm text-gray-600">Thank you for your feedback!</p>
          </div>
                   ) : (
                     <>
                       <p className="text-sm text-gray-600">
                         Help us improve future events by sharing your experience.
                       </p>
                       <button
                         onClick={() => setShowQuestionnaireModal(true)}
                         className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                         disabled={questionnaireSubmitting}
                       >
                         {questionnaireSubmitting ? 'Submitting...' : 'Complete Questionnaire'}
                       </button>
                     </>
                   )}
                 </div>
               </div>
             )}

                                                       {/* AI Event Report Section - Visible to Everyone Once Generated */}
               {/* Show to: ALL users for past events when report exists, regardless of participation */}
               {isPastEvent && eventReport && (
                <div className="relative bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 rounded-2xl shadow-2xl border border-indigo-400/40 p-6 overflow-hidden">
                  {/* Dynamic AI Background Pattern */}
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500/8 via-indigo-500/8 via-cyan-500/8 to-blue-500/8"></div>
                  
                  {/* Enhanced Glowing Border Effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/25 via-indigo-500/25 via-cyan-500/25 to-blue-500/25 blur-2xl animate-pulse"></div>
                  
                  {/* Animated AI Circuit Pattern with Better Colors */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-4 left-4 w-16 h-16 border border-cyan-400/50 rounded-full animate-ping"></div>
                    <div className="absolute top-8 right-8 w-8 h-8 border border-violet-400/50 rounded-full animate-pulse"></div>
                    <div className="absolute bottom-6 left-8 w-12 h-12 border border-indigo-400/50 rounded-full animate-bounce"></div>
                    <div className="absolute bottom-8 right-4 w-6 h-6 border border-blue-400/50 rounded-full animate-ping"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-cyan-300/30 rounded-full animate-spin"></div>
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-cyan-400 to-blue-400 mb-6 flex items-center gap-3">
                      <div className="relative">
                        <svg className="w-6 h-6 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd" />
                        </svg>
                        <div className="absolute -inset-1 bg-cyan-400/30 rounded-full blur-md animate-pulse"></div>
                      </div>
                      <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent drop-shadow-lg">
                        AI Event Report
                      </span>
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Report Status */}
                      <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-400/50 rounded-xl p-4 backdrop-blur-sm shadow-lg">
                        <p className="text-sm text-emerald-200 font-medium">
                          ✅ <strong className="text-emerald-100">AI Report Generated!</strong> The event analysis report is now available.
                        </p>
                      </div>
                      
                      {/* View Report Button */}
                      <div className="flex gap-3">
                        <button
                          onClick={handleViewReport}
                          className="flex-1 bg-gradient-to-r from-violet-500 via-cyan-500 to-blue-500 text-white px-4 py-2 rounded-xl hover:from-violet-600 hover:via-cyan-600 hover:to-blue-600 transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 hover:shadow-cyan-500/25"
                        >
                          📄 View AI Report
                        </button>
                        
                        <button
                          onClick={handleDownloadReport}
                          className="flex-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 text-white px-4 py-2 rounded-xl hover:from-indigo-600 hover:via-purple-600 hover:to-violet-600 transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 hover:shadow-purple-500/25"
                        >
                          📥 Download PDF
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

                             {/* AI Report Section - For when no report is available yet (visible to everyone) */}
               {isPastEvent && !eventReport && (
                <div className="relative bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 rounded-2xl shadow-2xl border border-indigo-400/40 p-6 overflow-hidden">
                  {/* Dynamic AI Background Pattern */}
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500/8 via-indigo-500/8 via-cyan-500/8 to-blue-500/8"></div>
                  
                  {/* Enhanced Glowing Border Effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/25 via-indigo-500/25 via-cyan-500/25 to-blue-500/25 blur-2xl animate-pulse"></div>
                  
                  {/* Animated AI Circuit Pattern with Better Colors */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-4 left-4 w-16 h-16 border border-cyan-400/50 rounded-full animate-ping"></div>
                    <div className="absolute top-8 right-8 w-8 h-8 border border-violet-400/50 rounded-full animate-pulse"></div>
                    <div className="absolute bottom-6 left-8 w-12 h-12 border border-indigo-400/50 rounded-full animate-bounce"></div>
                    <div className="absolute bottom-8 right-4 w-6 h-6 border border-blue-400/50 rounded-full animate-ping"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-cyan-300/30 rounded-full animate-pulse"></div>
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-cyan-400 to-blue-400 mb-6 flex items-center gap-3">
                      <div className="relative">
                        <svg className="w-6 h-6 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd" />
                        </svg>
                        <div className="absolute -inset-1 bg-cyan-400/30 rounded-full blur-md animate-pulse"></div>
                      </div>
                      <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent drop-shadow-lg">
                        AI Event Report
                      </span>
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Report Status */}
                      <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-400/50 rounded-xl p-4 backdrop-blur-sm shadow-lg">
                        <p className="text-sm text-amber-200 font-medium">
                          ⏳ <strong className="text-amber-100">AI Report Pending</strong> The event analysis report is not yet available.
                        </p>
                      </div>
                      
                      {/* Placeholder Content */}
                      {reportLoading ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400 mx-auto mb-3"></div>
                          <span className="text-sm text-amber-200">Checking for available report...</span>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <div className="text-amber-400 mb-3 text-4xl">📋</div>
                          <p className="text-sm text-amber-200 mb-2">No AI report available yet.</p>
                          <p className="text-xs text-amber-300">Report will be visible to everyone once generated.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

             {/* Comments Section */}
             {isPastEvent && (
               <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                 <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                   <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                   </svg>
                   Volunteer Feedback & Comments
                   {comments.length > 0 && (
                     <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                       {comments.length}
                     </span>
                   )}
                 </h3>
                 
                 <div className="space-y-3">
                   <button
                     onClick={() => {
                       setShowComments(!showComments);
                       if (!showComments && comments.length === 0) {
                         fetchComments();
                       }
                     }}
                     className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center gap-2"
                   >
                     <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                       <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                     </svg>
                     {showComments ? 'Hide Comments' : 'Show Comments'}
                   </button>

                   {showComments && (
                     <div className="mt-4">
                       {commentsLoading ? (
                         <div className="text-center py-4">
                           <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
                           <span className="ml-3 text-gray-600">Loading comments...</span>
                         </div>
                       ) : comments.length > 0 ? (
                         <div className="max-h-64 overflow-y-auto space-y-3 custom-scrollbar">
                           {comments.map((comment, index) => (
                             <div key={comment._id || index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                               <CommentAvatarAndName comment={comment} />
                               <div className="mt-2 text-sm text-gray-700">
                                 {comment.comment}
                               </div>
                               <div className="mt-2 text-xs text-gray-500 text-right">
                                 {comment.submittedAt ? format(new Date(comment.submittedAt), 'MMM dd, yyyy') : 'Date not available'}
                               </div>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <div className="text-center py-4 text-gray-500">
                           <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                             <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                           </svg>
                           <p className="text-sm font-medium">No comments yet</p>
                           <p className="text-xs text-gray-400 mt-1">Comments will appear here once volunteers complete their questionnaires.</p>
                         </div>
                       )}
                     </div>
                   )}
                 </div>
               </div>
             )}

             {/* Event Actions & Status Section */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
               <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                 <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                   <path fillRule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd" />
                 </svg>
                 Event Actions & Status
               </h3>
               
               <div className="space-y-4">
                 {/* Banned Status */}
                 {isBanned && (
                   <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                     🚫 You are banned from this event by the event creator. You cannot register.
                   </div>
                 )}

                 {/* Removed Status */}
                 {isRemoved && !isBanned && (
                   <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg">
                     ⚠️ You were removed from this event by an organizer. You can register again.
                   </div>
                 )}

                                   {/* Entry QR Code - Only for live/upcoming events (automatically cleared when event completes) */}
                  {!isPastEvent && !registrationDetails?.inTime && registrationDetails?.qrCodePath?.url && (
                    <div className="text-center">
                      <h4 className="text-md font-semibold mb-2 text-blue-800">Your Entry QR Code</h4>
                      <img src={registrationDetails.qrCodePath.url} alt="Entry QR Code" className="border border-gray-300 p-2 w-48 h-48 mx-auto" />
                      <p className="mt-3 text-blue-800 text-sm">Show this to the organizer at the event entrance.</p>
                    </div>
                  )}

                  {/* Exit QR Generation & Display - Only for live events (automatically cleared when event completes) */}
                  {!isPastEvent && registrationDetails?.inTime && !registrationDetails?.outTime && (
                    !showExitQr ? (
                      <button onClick={handleGenerateExitQr} className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm">
                        Generate Exit QR
                      </button>
                    ) : exitQrPath?.url && (
                      <div className="text-center">
                        <h4 className="text-md font-semibold mb-2 text-green-800">Your Exit QR Code</h4>
                        <img src={exitQrPath.url} alt="Exit QR Code" className="border border-gray-300 p-2 w-48 h-48 mx-auto" />
                        <p className="mt-3 text-green-800 text-sm">Show this to the organizer at the exit to mark your out-time.</p>
                      </div>
                    )
                  )}

                 {/* Registration Button - Show for upcoming and live events if not banned */}
                 {!isPastEvent && !isRegistered && !isBanned && (availableSlots > 0 || unlimitedVolunteers) && (
                   <button onClick={() => setShowRegisterModal(true)} className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm">
                     {isLiveEvent ? 'Register for Live Event' : 'Register for Event'}
                   </button>
                 )}
                 
                                   {/* Status Messages for Completed Events */}
                  {isPastEvent && (
                    <div className="space-y-3">
                      <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                        🏁 This event has ended.
                      </div>
                      
                      {/* QR Code Information */}
                      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm">
                        🔒 <strong>QR codes automatically cleared.</strong> All entry and exit QR codes have been removed for security.
                      </div>
                      
                      {/* Attendance Status Messages */}
                      {isRegistered && !hasCompletedEvent && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-lg text-sm">
                          ⚠️ <strong>Event completed without attendance.</strong> You were registered but didn't attend this event.
                        </div>
                      )}
                      
                      {isRegistered && hasCompletedEvent && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
                          ✅ <strong>Thank you for attending!</strong> Your attendance is complete.
                        </div>
                      )}
                      
                      {!isRegistered && (
                        <div className="bg-gray-50 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm">
                          📝 <strong>Event completed.</strong> You were not registered for this event.
                        </div>
                      )}
                    </div>
                  )}
                 
                 {/* Live Event Status for Unregistered Users */}
                 {isLiveEvent && !isRegistered && (
                   <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm text-center">
                     🎯 This event is currently live! You can still register if slots are available.
                   </div>
                 )}
                 
                 {/* Live Event Status for Registered Users */}
                 {isLiveEvent && isRegistered && (
                   <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm text-center">
                     🚀 Event is live! Make sure to check in with your QR code.
                   </div>
                 )}
                 
                 {/* Upcoming Event Status - Only for unregistered users */}
                 {!isPastEvent && !isLiveEvent && !isRegistered && (
                   <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-2 rounded-lg text-sm text-center">
                     📅 This event is upcoming. Registration is open!
                   </div>
                 )}
                 
                 {/* Upcoming Event Status - For registered users */}
                 {!isPastEvent && !isLiveEvent && isRegistered && (
                   <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm text-center">
                     ✅ You're registered for this upcoming event!
                   </div>
                 )}
                 
                 {/* Questionnaire Button */}
                 {isPastEvent && isRegistered && !questionnaireCompleted && (
                   <button onClick={() => setShowQuestionnaireModal(true)} className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm" disabled={questionnaireSubmitting}>
                     {questionnaireSubmitting ? 'Submitting...' : 'Complete Questionnaire'}
                   </button>
                 )}
                 {questionnaireCompleted && <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm text-center">✅ Questionnaire completed!</div>}
                 
                                   {/* Withdraw Button - Only for upcoming/live events */}
                  {!isPastEvent && isRegistered && !registrationDetails?.inTime && (
                    <button onClick={handleWithdrawRegistration} className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm">
                      Withdraw Registration
                    </button>
                  )}
                 
                 {/* Event Information for All Users */}
                 <div className="border-t border-gray-200 pt-4 mt-4">
                   <h4 className="text-sm font-semibold text-gray-700 mb-2">Event Status</h4>
                   <div className="space-y-2 text-xs text-gray-600">
                     <div className="flex justify-between">
                       <span>Event Type:</span>
                       <span className="font-medium">{event.eventType || "Not specified"}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>Location:</span>
                       <span className="font-medium">{event.location}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>Start Time:</span>
                       <span className="font-medium">
                         {event.startDateTime ? format(new Date(event.startDateTime), 'hh:mm a, dd/MM/yyyy') : 'Not specified'}
                       </span>
                     </div>
                     <div className="flex justify-between">
                       <span>Volunteer Slots:</span>
                       <span className="font-medium">{slotMessage}</span>
                     </div>
                   </div>
                 </div>
               </div>
             </div>


           </div>

           {/* Right Column - Event Details */}
           <div className="xl:col-span-3 xl:overflow-y-auto xl:max-h-screen pr-2 pb-8 custom-scrollbar">

                {/* Event Details - Organized like EventDetailsPage */}
        
        {/* Show event ended message if completed */}
        {isPastEvent && (
          <div className="text-red-600 font-semibold mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            This event has ended
          </div>
        )}

        {/* Event Title and Calendar Button */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-blue-800 flex items-center gap-4">
                  {event.title}
                  {event.isRecurringInstance && (
                <span className="text-lg bg-blue-100 text-blue-700 px-3 py-1 rounded">
                      Instance #{event.recurringInstanceNumber}
                    </span>
                  )}
                </h1>
                {event.recurringEvent && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded">
                      Recurring Event
                    </span>
                    <span className="text-sm text-gray-600">
                      {event.recurringType} - {event.recurringValue}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Add to Calendar Button */}
              <div className="relative">
                <button
                  data-calendar-button
                  onClick={() => setShowCalendarOptions(!showCalendarOptions)}
                  className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                  title="Add to Calendar"
                >
                  <FaCalendarPlus className="w-5 h-5" />
                </button>
                
                {/* Calendar Options Dropdown */}
                {showCalendarOptions && (
                  <div data-calendar-dropdown className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[220px] z-50">
                    {/* Website Calendar Options */}
                    {calendarStatus.canAddToCalendar && (
                      <button
                        onClick={() => {
                          handleAddToWebsiteCalendar();
                          setShowCalendarOptions(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                      >
                        <FaCalendarPlus className="w-4 h-4" />
                        Add to Website Calendar
                      </button>
                    )}
                    {calendarStatus.canRemoveFromCalendar && (
                      <button
                        onClick={() => {
                          handleRemoveFromWebsiteCalendar();
                          setShowCalendarOptions(false);
                        }}
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
                      onClick={() => {
                        handleAddToCalendar();
                        setShowCalendarOptions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                    >
                      <FaCalendarPlus className="w-4 h-4" />
                      Add to Google Calendar
                    </button>
                    <button
                      onClick={() => {
                        handleDownloadCalendar();
                        setShowCalendarOptions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                    >
                      <FaCalendarPlus className="w-4 h-4" />
                      Download .ics File
                    </button>
                  </div>
                )}
              </div>
            </div>
            
        {/* Event Description */}
        <p className="text-gray-700 mb-6 text-lg leading-relaxed">{event.description}</p>

        {/* Event Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Location Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              Event Location
            </h3>
            
            {/* Location Text */}
            <p className="text-gray-700 mb-3">{event.location}</p>
            
            {/* Map Display */}
            <div className="mt-4">
              {event.mapLocation && event.mapLocation.lat && event.mapLocation.lng ? (
                // Show actual map with coordinates
                <div>
                  <StaticMap 
                    key={`${event.mapLocation.lat}-${event.mapLocation.lng}-${event.mapLocation.address}`}
                    lat={event.mapLocation.lat} 
                    lng={event.mapLocation.lng} 
                  />
                  {event.mapLocation.address && (
                    <p className="text-gray-600 mt-2 text-sm">{event.mapLocation.address}</p>
                  )}
                </div>
              ) : (
                // Show fallback map or location display
                <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-center h-48 text-gray-500">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm font-medium">Location: {event.location}</p>
                      <p className="text-xs text-gray-400 mt-1">Map coordinates not available</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Additional Location Info */}
            {event.mapLocation && event.mapLocation.address && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-800">Detailed Address</p>
                    <p className="text-sm text-blue-700">{event.mapLocation.address}</p>
                  </div>
                </div>
                </div>
              )}
          </div>

          {/* Timing Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Event Timing
            </h3>
            <div className="space-y-2">
              <div>
                <span className="font-medium text-gray-700">Start:</span>
                <p className="text-gray-600">
                  {event && event.startDateTime ? format(new Date(event.startDateTime), 'hh:mm a, d MMMM yyyy') : 'Not specified'}
                </p>
                </div>
              <div>
                <span className="font-medium text-gray-700">End:</span>
                <p className="text-gray-600">
                  {event && event.endDateTime ? format(new Date(event.endDateTime), 'hh:mm a, d MMMM yyyy') : 'Not specified'}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Type:</span>
                <p className="text-gray-600">{event.eventType || "Not specified"}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Volunteer Slots:</span>
                <p className="text-gray-600">{slotMessage}</p>
              </div>
            </div>
          </div>

          {/* Event Registration & Category Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Registration & Category
            </h3>
            <div className="space-y-2">
              <div>
                <span className="font-medium text-gray-700">Category:</span>
                <p className="text-gray-600">{event.category || "Not specified"}</p>
                  </div>
              <div>
                <span className="font-medium text-gray-700">Group Registration:</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${event.groupRegistration ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {event.groupRegistration ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Recurring Event:</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${event.recurringEvent ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                  {event.recurringEvent ? "Yes" : "No"}
                </span>
              </div>
              {event.recurringEvent && (
                <div>
                  <span className="font-medium text-gray-700">Recurring Pattern:</span>
                  <p className="text-gray-600">{event.recurringType} - {event.recurringValue}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Event Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Event Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              {event.groupRegistration && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-gray-700">Group Registration Enabled</span>
                </div>
              )}
              {event.recurringEvent && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span className="text-gray-700">Recurs {event.recurringType} on {event.recurringValue}</span>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700">Instructions:</span>
                <p className="text-gray-600 mt-1">{event.instructions || "None"}</p>
              </div>
            </div>

            <div className="space-y-3">
              {event.equipmentNeeded?.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Equipment Needed:</span>
                  <ul className="list-disc list-inside text-gray-600 mt-1">
                    {event.equipmentNeeded.map((eq, i) => (
                      <li key={i}>{eq}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">Focus Area:</span>
                <p className="text-gray-600 mt-1">{event.focusArea || "Not specified"}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Target Audience:</span>
                <p className="text-gray-600 mt-1">{event.targetAudience || "General public"}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Event Status:</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  event.status === 'completed' ? 'bg-green-100 text-green-700' : 
                  event.status === 'ongoing' ? 'bg-blue-100 text-blue-700' : 
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {event.status || "upcoming"}
                </span>
            </div>
              </div>
              </div>
            </div>

        {/* Volunteer Logistics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            Volunteer Logistics
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Drinking Water:</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${event.waterProvided ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {event.waterProvided ? "Yes" : "No"}
                </span>
                  </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Medical Support:</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${event.medicalSupport ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {event.medicalSupport ? "Yes" : "No"}
                </span>
              </div>
              <div>
                <span className="text-gray-700">Recommended Age Group:</span>
                <p className="text-gray-600 mt-1">{event.ageGroup || "Not specified"}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">Special Precautions:</span>
                <p className="text-gray-600 mt-1">{event.precautions || "None"}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Public Transport:</span>
                <p className="text-gray-600 mt-1">{event.publicTransport || "Not mentioned"}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Contact Person:</span>
                <p className="text-gray-600 mt-1">{event.contactPerson || "Not listed"}</p>
              </div>
                </div>
                
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">Parking Available:</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${event.parkingAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {event.parkingAvailable ? "Yes" : "No"}
                </span>
                      </div>
              <div>
                <span className="font-medium text-gray-700">Accessibility:</span>
                <p className="text-gray-600 mt-1">{event.accessibility || "Standard"}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Weather Dependent:</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${event.weatherDependent ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                  {event.weatherDependent ? "Yes" : "No"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                 {/* Event Images Carousel */}
                 {event.eventImages?.length > 0 && (
                   <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                     <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                       <svg className="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 20 20">
                         <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                       </svg>
                       Event Images
                     </h3>
                     
                     <ImageCarousel 
                       images={event.eventImages}
                       autoPlay={true}
                       interval={5000}
                     />
                   </div>
                 )}

                 {/* AI Summary Section - New container with proper spacing */}
         <div className="relative mb-8 mx-4">
           {/* AI Summary with gradient border */}
           <div className="relative group">
             {/* Animated gradient border with AI colors - positioned to overlap left column */}
             <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400/60 via-purple-400/60 to-cyan-400/60 rounded-xl blur-sm opacity-90 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-gradient-x -left-1 z-10"></div>
             
             {/* Secondary subtle gradient layer for enhanced border effect */}
             <div className="absolute -inset-1 bg-gradient-to-r from-blue-300/40 via-purple-300/40 to-cyan-300/40 rounded-xl blur-md opacity-60 group-hover:opacity-80 transition duration-1000 group-hover:duration-200 animate-gradient-x -left-1.5 z-5"></div>
             
             {/* Main content card - smaller size with proper positioning */}
             <div className="relative bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-white/20 z-20">
               {/* Header with enhanced AI styling - smaller */}
               <div className="flex items-center gap-3 mb-4">
                 <div className="relative">
                   {/* Animated background circle */}
                   <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-600 to-cyan-500 rounded-full blur-sm animate-pulse"></div>
                   {/* Main icon container - smaller */}
                   <div className="relative w-10 h-10 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                     <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                       <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                     </svg>
                   </div>
                   {/* Floating particles effect - smaller */}
                   <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                   <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
                 </div>
                 
                 <div className="flex-1">
                   <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent tracking-tight">
                     AI Event Summary
                   </h3>
                   <p className="text-xs text-gray-500 mt-1 font-medium tracking-wide">Powered by advanced AI analysis</p>
                 </div>
                 
                 {/* AI status indicator - smaller */}
                 <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full border border-green-200">
                   <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                   <span className="text-xs font-medium text-green-700">AI Active</span>
                 </div>
               </div>
               
               {/* Content with enhanced styling */}
               <div className="relative">
                 {/* Subtle pattern overlay */}
                 <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/30 rounded-lg pointer-events-none"></div>
                 
                 <div className="relative">
                   {event.summary && event.summary.trim() ? (
                     <div className="text-gray-800 whitespace-pre-line leading-relaxed text-lg font-normal tracking-wide">
                       <div className="prose prose-gray max-w-none">
                         <p className="text-gray-700 leading-7 mb-4 first:mt-0 last:mb-0 text-justify">
                           {event.summary}
                         </p>
                       </div>
                      </div>
                    ) : (
                     <div className="flex items-center gap-3 text-gray-500 italic">
                       <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                       <span className="text-sm font-medium">Generating AI summary...</span>
                      </div>
                    )}
                  </div>
              </div>
               
               {/* Bottom accent - smaller */}
               <div className="mt-4 pt-3 border-t border-gradient-to-r from-blue-200 via-purple-200 to-cyan-200">
                 <div className="flex items-center justify-between text-xs text-gray-500">
                   <span className="font-medium tracking-wide">Generated with advanced AI algorithms</span>
                   <div className="flex items-center gap-1">
                     <div className="w-1.5 h-1.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                     <span className="font-medium">Real-time analysis</span>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         </div>

                </div>
          </div>
      

      </div>
      
      {/* --- MODALS & OVERLAYS --- */}
      
      {event && <EventChatBox eventId={event._id} currentUser={user} />}

              <VolunteerRegisterModal 
          open={showRegisterModal} 
          onClose={() => setShowRegisterModal(false)} 
          volunteer={user} 
          onSubmit={handleRegistrationSubmit} 
          event={event} 
          isRegistering={isGeneratingQrCode}
        />
      
      <VolunteerQuestionnaireModal open={showQuestionnaireModal} onClose={() => setShowQuestionnaireModal(false)} eventType={event?.eventType} onSubmit={handleQuestionnaireSubmit} />
      
      {/* Page Loader for Registration */}
      <FullScreenLoader
        isVisible={isGeneratingQrCode}
        message="Generating QR Code..."
        showProgress={false}
      />

      {/* Page Loader for Questionnaire Submission */}
      <FullScreenLoader
        isVisible={questionnaireSubmitting}
        message="Submitting Questionnaire..."
        subMessage="Please wait while we save your responses and media files..."
        showProgress={false}
      />
      
      {/* Full Screen Loader for Certificate Generation */}
      <FullScreenLoader
        isVisible={isGeneratingCertificate}
        message="Generating Certificate..."
        subMessage="Creating your personalized certificate with award details..."
        showProgress={false}
      />

      {/* FIX: Report Modal is now correctly placed outside other conditional blocks */}
      {showReportModal && eventReport && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setShowReportModal(false)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Event Report: {event.title}</h2>
              <div className="flex gap-2">
                <button onClick={handleDownloadReport} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Download PDF</button>
                <button onClick={() => setShowReportModal(false)} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">Close</button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto">
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: eventReport.report.content.replace(/\n/g, '<br />') }}
              />
            </div>
          </div>
        </div>
      )}
      
      <style jsx="true">{`
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
      `}</style>
    </div>
  );
}