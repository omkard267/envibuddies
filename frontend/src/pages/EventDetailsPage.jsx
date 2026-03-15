// src/pages/EventDetailsPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { showAlert, showConfirm } from "../utils/notifications";
import axiosInstance from "../api/axiosInstance";
import Navbar from "../components/layout/Navbar";
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from "../utils/avatarUtils";
import { 
  getSafeUserData, 
  getDisplayName, 
  getUsernameDisplay, 
  canNavigateToUser, 
  getSafeUserId,
  getSafeUserName 
} from "../utils/safeUserUtils";
import { joinAsOrganizer, getOrganizerTeam, getFullOrganizerTeam } from "../api/event";
import { getVolunteersForEvent } from "../api/registration";
import { io } from "socket.io-client";

import EventChatBox from '../components/chat/EventChatBox';
import StaticMap from '../components/event/StaticMap'; // Import the new component
import { format } from "date-fns";
import useEventSlots from '../hooks/useEventSlots';
import EventQuestionnaireModal from "../components/event/EventQuestionnaireModal";
import ImageCarousel from "../components/event/ImageCarousel";
import { FullScreenLoader, ButtonLoader } from "../components/common/LoaderComponents";
import { checkReportEligibility, generateEventReport } from "../utils/reportUtils";
import { addEventToCalendar, downloadCalendarFile, addToWebsiteCalendar, removeFromWebsiteCalendar, checkWebsiteCalendarStatus } from "../utils/calendarUtils";
import { FaCalendarPlus, FaCalendarMinus } from "react-icons/fa";
import calendarEventEmitter from "../utils/calendarEventEmitter";
import { completeEvent } from "../api/recurringEvents";

// CommentAvatarAndName component
const CommentAvatarAndName = ({ comment }) => {
  const navigate = useNavigate();
  const safeVolunteer = getSafeUserData(comment.volunteer);
  const canNavigate = canNavigateToUser(comment.volunteer);
  
  const handleClick = () => {
    if (canNavigate) {
      navigate(`/volunteer/${getSafeUserId(comment.volunteer)}`);
    }
  };

  return (
    <div 
      className={`flex items-center space-x-3 p-2 rounded transition-colors ${
        canNavigate ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default opacity-75'
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
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 flex items-center justify-center border-2 border-green-200 shadow-sm">
          <span className="text-sm font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{getAvatarInitial(safeVolunteer)}</span>
        </div>
      )}
      <span className={`font-medium ${safeVolunteer.isDeleted ? 'text-gray-600' : 'text-green-800'}`}>
        {getDisplayName(safeVolunteer)}
      </span>
    </div>
  );
};

export default function EventDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [organizerTeam, setOrganizerTeam] = useState([]);
  // For attendance, you may want to use a separate state for full team with hasAttended
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");
  const [showOrganizerTeamDrawer, setShowOrganizerTeamDrawer] = useState(false);
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  const [questionnaireSubmitting, setQuestionnaireSubmitting] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
  const [isDownloadingCertificate, setIsDownloadingCertificate] = useState(false);
  const [activeTab, setActiveTab] = useState('organizers'); // Default to organizers tab
  const [organizerSearchTerm, setOrganizerSearchTerm] = useState('');
  
  // Report generation states
  const [reportEligibility, setReportEligibility] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState("");
  
  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Calendar state
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState({
    isRegistered: false, isInCalendar: false, canAddToCalendar: false, canRemoveFromCalendar: false
  });
  const currentUser = JSON.parse(localStorage.getItem("user"));
  
  // Volunteer management states
  const [removingVolunteer, setRemovingVolunteer] = useState(false);
  const [banningVolunteer, setBanningVolunteer] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  
  // Recurring event states
  const [completingEvent, setCompletingEvent] = useState(false);
  const [completionError, setCompletionError] = useState("");
  const [completionSuccess, setCompletionSuccess] = useState("");

  // Organizer management states
  const [removingOrganizer, setRemovingOrganizer] = useState(false);
  const [banningOrganizer, setBanningOrganizer] = useState(false);
  const [unbanningOrganizer, setUnbanningOrganizer] = useState(false);
  const [selectedOrganizer, setSelectedOrganizer] = useState(null);
  const [showRemoveOrganizerConfirm, setShowRemoveOrganizerConfirm] = useState(false);
  const [showBanOrganizerConfirm, setShowBanOrganizerConfirm] = useState(false);
  const [showUnbanOrganizerConfirm, setShowUnbanOrganizerConfirm] = useState(false);

  // Volunteer unban states
  const [unbanningVolunteer, setUnbanningVolunteer] = useState(false);
  const [showUnbanVolunteerConfirm, setShowUnbanVolunteerConfirm] = useState(false);

  const isCreator = (() => {
    if (!event || !currentUser) return false;

    // Handles both string and object form of createdBy
    const createdById =
      typeof event.createdBy === "string"
        ? event.createdBy
        : event.createdBy?._id;

    return createdById?.toString() === currentUser._id;
  })();

  const isOrgAdmin = (() => {
    if (!event?.organization?.team || !currentUser) return false;

    return event.organization.team.some((member) => {
      const memberUserId =
        typeof member.userId === "string" ? member.userId : member.userId?._id;
      return memberUserId?.toString() === currentUser._id && member.isAdmin;
    });
  })();

  const isOrganizer = currentUser?.role === "organizer";
  const isTeamMember = organizerTeam.some((obj) => (obj.user && obj.user._id ? obj.user._id === currentUser?._id : false));
  const canJoinAsOrganizer = isOrganizer && !isCreator && !isTeamMember;

  const canEdit = isCreator || isOrgAdmin;

  // Check if current user is registered for this event
  const isRegisteredForEvent = event?.volunteers && event.volunteers.some(vol => 
    vol === currentUser?._id || vol?._id === currentUser?._id
  );

  // Volunteers Drawer state and logic (copied from VolunteerEventDetailsPage.jsx)
  const [showVolunteers, setShowVolunteers] = useState(false);
  const [volunteers, setVolunteers] = useState([]);
  const [volunteersLoading, setVolunteersLoading] = useState(false);
  const [bannedVolunteers, setBannedVolunteers] = useState([]);
  const [bannedVolunteersLoading, setBannedVolunteersLoading] = useState(false);
  const [bannedOrganizers, setBannedOrganizers] = useState([]);
  const [bannedOrganizersLoading, setBannedOrganizersLoading] = useState(false);
  // Track join request status for current user
  const [joinRequestStatus, setJoinRequestStatus] = useState(null); // 'pending', 'rejected', null
  
  // Search state
  const [volunteerSearchTerm, setVolunteerSearchTerm] = useState("");

  // Fetch volunteers for this event when drawer is opened
  const fetchVolunteers = useCallback(() => {
    if (!event?._id) return;
    setVolunteersLoading(true);
    getVolunteersForEvent(event._id)
      .then(data => {
        setVolunteers(data);
        setVolunteersLoading(false);
      })
      .catch(() => setVolunteersLoading(false));
  }, [event?._id]);

  // Fetch banned users for this event
  const fetchBannedUsers = useCallback(async () => {
    if (!event?._id) return;
    
    setBannedVolunteersLoading(true);
    setBannedOrganizersLoading(true);
    try {
      const bannedUserIds = event.bannedVolunteers || [];
      
      if (bannedUserIds.length > 0) {
        // Fetch each banned user individually
        const bannedUsersPromises = bannedUserIds.map(async (userId) => {
          try {
            const response = await axiosInstance.get(`/api/users/${userId}`);
            return response.data;
          } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
            return null;
          }
        });
        
        const bannedUsers = (await Promise.all(bannedUsersPromises)).filter(user => user !== null);
        
        // Separate banned volunteers and organizers based on their role
        const bannedVols = bannedUsers.filter(user => user.role === 'volunteer');
        const bannedOrgs = bannedUsers.filter(user => user.role === 'organizer');
        
        setBannedVolunteers(bannedVols);
        setBannedOrganizers(bannedOrgs);
      } else {
        setBannedVolunteers([]);
        setBannedOrganizers([]);
      }
    } catch (error) {
      console.error('Error fetching banned users:', error);
      setBannedVolunteers([]);
      setBannedOrganizers([]);
    } finally {
      setBannedVolunteersLoading(false);
      setBannedOrganizersLoading(false);
    }
  }, [event?._id, event?.bannedVolunteers]);

  // Socket connection for real-time updates (slots, etc.)
  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token: localStorage.getItem('token') }
    });
    
    socket.on('connect', () => {
      // Join event-specific rooms for real-time updates
      if (event?._id) {
        socket.emit('joinEventSlotsRoom', event._id);
        socket.emit('join', `event_${event._id}`);
      }
    });

    // Listen for volunteer removal/ban events
    socket.on('volunteerRemoved', ({ volunteerId, eventId }) => {
      if (eventId === event?._id) {
        setVolunteers(prev => prev.filter(v => v._id !== volunteerId));
      }
    });

    socket.on('volunteerBanned', ({ volunteerId, eventId }) => {
      if (eventId === event?._id) {
        setVolunteers(prev => prev.filter(v => v._id !== volunteerId));
      }
    });

    // Listen for organizer removal/ban events
    socket.on('organizerRemoved', ({ organizerId, eventId }) => {
      if (eventId === event?._id) {
        setOrganizerTeam(prev => prev.filter(obj => obj.user._id !== organizerId));
      }
    });

    socket.on('organizerBanned', ({ organizerId, eventId }) => {
      if (eventId === event?._id) {
        setOrganizerTeam(prev => prev.filter(obj => obj.user._id !== organizerId));
      }
    });

    // Listen for unban events
    socket.on('volunteerUnbanned', ({ volunteerId, eventId }) => {
      if (eventId === event?._id) {
        // Remove from banned volunteers and refresh banned users
        setBannedVolunteers(prev => prev.filter(v => v._id !== volunteerId));
        fetchBannedUsers();
      }
    });

    socket.on('organizerUnbanned', ({ organizerId, eventId }) => {
      if (eventId === event?._id) {
        // Remove from banned organizers and refresh banned users
        setBannedOrganizers(prev => prev.filter(o => o._id !== organizerId));
        fetchBannedUsers();
      }
    });
    
    return () => {
      if (event?._id) {
        socket.emit('leaveEventSlotsRoom', event._id);
        socket.emit('leave', `event_${event._id}`);
      }
      socket.disconnect();
    };
  }, [event?._id]);

  // Always use event.organizerTeam for displaying the team
  const fetchAndSetEvent = async () => {
    try {
      const res = await axiosInstance.get(`/api/events/${id}`);
      setEvent(res.data);
      setOrganizerTeam(res.data.organizerTeam || []);
      // Check join request status for current user
      if (res.data.organizerJoinRequests && currentUser) {
        const reqObj = res.data.organizerJoinRequests.find(r => r.user === currentUser._id || (r.user && r.user._id === currentUser._id));
        if (reqObj) setJoinRequestStatus(reqObj.status);
        else setJoinRequestStatus(null);
      } else {
        setJoinRequestStatus(null);
      }
    } catch (err) {
      setError("Event not found or failed to load.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAndSetEvent();
  }, [id]);

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
      if (!currentUser?._id || !event?._id) return;
      
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
  }, [event?._id, currentUser?._id]);

  // Poll for summary if missing
  useEffect(() => {
    if (!event || event.summary) return;
    const interval = setInterval(async () => {
      try {
        const res = await axiosInstance.get(`/api/events/${id}`);
        if (res.data.summary && res.data.summary.trim()) {
          setEvent(res.data);
          clearInterval(interval);
        }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [event, id]);

  const handleDelete = async () => {
    showConfirm.danger(
      "Are you sure you want to delete this event?",
      async () => {
        try {
          await axiosInstance.delete(`/api/events/${id}`);
          showAlert.success("🎉 Event deleted successfully.");
          navigate(-1); // or navigate('/your-organizations') if you prefer
        } catch (err) {
          console.error("Failed to delete event:", err);
          showAlert.error("❌ Failed to delete event.");
        }
      },
      {
        title: "🗑️ Delete Event",
        confirmText: "Yes, delete it",
        cancelText: "Cancel"
      }
    );
  };

  const handleJoinAsOrganizer = async () => {
    setJoining(true);
    setJoinError("");
    setJoinSuccess("");
    try {
      await joinAsOrganizer(id);
      setJoinSuccess("You have joined as an organizer!");
      await fetchAndSetEvent();
    } catch (err) {
      setJoinError(err?.response?.data?.message || "Failed to join as organizer.");
    } finally {
      setJoining(false);
    }
  };

  // Handler to leave as organizer
  const handleLeaveAsOrganizer = async () => {
    if (!event || !event._id) return;
    
    showConfirm.warning(
      'Are you sure you want to leave as an organizer for this event?',
      async () => {
        try {
          await axiosInstance.post(`/api/events/${event._id}/leave-organizer`);
          await fetchAndSetEvent();
          // Clear join request status for this user after leaving
          setJoinRequestStatus(null);
          showAlert.success('✅ You have left as an organizer for this event.');
        } catch (err) {
          showAlert.error('❌ Failed to leave as organizer.');
        }
      },
      {
        title: '👋 Leave Event',
        confirmText: 'Yes, leave',
        cancelText: 'Stay as organizer'
      }
    );
  };

  // Handler to send join request as organizer
  const handleRequestJoinAsOrganizer = async () => {
    setJoining(true);
    setJoinError("");
    setJoinSuccess("");
    try {
      await axiosInstance.post(`/api/events/${id}/request-join-organizer`);
      await fetchAndSetEvent(); // Always fetch latest status from backend after reapply
      // Do not set joinSuccess here; rely on joinRequestStatus for UI
    } catch (err) {
      setJoinError(err?.response?.data?.message || "Failed to send join request.");
    } finally {
      setJoining(false);
    }
  };

  // Handler for creator to approve a join request
  const handleApproveJoinRequest = async (userId) => {
    try {
      await axiosInstance.post(`/api/events/${id}/approve-join-request`, { userId });
      showAlert("Join request approved.", "success");
      await fetchAndSetEvent();
    } catch (err) {
              showAlert.error('❌ Failed to approve join request.');
    }
  };

  // Handler for creator to reject a join request
  const handleRejectJoinRequest = async (userId) => {
    try {
      await axiosInstance.post(`/api/events/${id}/reject-join-request`, { userId });
      showAlert("Join request rejected.", "success");
      await fetchAndSetEvent();
    } catch (err) {
              showAlert.error('❌ Failed to reject join request.');
    }
  };

  // Handler to withdraw join request
  const handleWithdrawJoinRequest = async () => {
    setJoining(true);
    setJoinError("");
    try {
      await axiosInstance.post(`/api/events/${id}/withdraw-join-request`);
      await fetchAndSetEvent();
    } catch (err) {
      setJoinError(err?.response?.data?.message || "Failed to withdraw join request.");
    } finally {
      setJoining(false);
    }
  };

  // Helper: check if user has a rejected request (even if not pending)
  const hasRejectedRequest = event?.organizerJoinRequests?.some(r => {
    const userId = r.user?._id || r.user;
    return userId === currentUser?._id && (r.status === 'rejected' || r._wasRejected);
  });

  // Use the new hook for live slot info
  const { availableSlots, maxVolunteers, unlimitedVolunteers, loading: slotsLoading } = useEventSlots(id);

  // Volunteer slots filled display
  let slotMessage = '';
  if (slotsLoading) {
    slotMessage = 'Loading slots...';
  } else if (unlimitedVolunteers) {
    slotMessage = 'Unlimited slots';
  } else if (typeof availableSlots === 'number' && typeof maxVolunteers === 'number') {
    const filled = maxVolunteers - availableSlots;
    slotMessage = `${filled}/${maxVolunteers} slots filled`;
  }

  // Check if event is in the past
  const isPastEvent = event && event.endDateTime ? new Date(event.endDateTime) < new Date() : false;
  // Updated handler to support Cloudinary media files
  const handleQuestionnaireSubmit = async (answers, mediaFiles, awards) => {
    setQuestionnaireSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('answers', JSON.stringify(answers));
      // Always send awards, even if it's empty
      formData.append('awards', JSON.stringify(awards || {}));
      
      // Handle Cloudinary media files - they are already uploaded, so we send the URLs
      if (mediaFiles && mediaFiles.length > 0) {
        // Filter out files that are already uploaded to Cloudinary
        const cloudinaryMedia = mediaFiles.filter(file => file.uploaded && file.url);
        if (cloudinaryMedia.length > 0) {
          formData.append('media', JSON.stringify(cloudinaryMedia));
        }
      }
      
      await axiosInstance.post(`/api/events/${event._id}/complete-questionnaire`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Wait 1 second before refetching to ensure certificates are saved
      setTimeout(async () => {
        await fetchAndSetEvent();
        setShowQuestionnaireModal(false);
      }, 1000);
      showAlert("✅ Questionnaire submitted successfully!", "success");
    } catch (err) {
      console.error('Questionnaire submission error:', err);
      showAlert("❌ Failed to submit questionnaire.", "error");
    } finally {
      setQuestionnaireSubmitting(false);
    }
  };

  // Find the current user's organizerTeam object
  const myOrganizerObj = organizerTeam.find(obj => obj.user && obj.user._id === currentUser?._id);
  const myQuestionnaireCompleted = myOrganizerObj?.questionnaire?.completed;
  const isPast = event && new Date() > new Date(event.endDateTime);

  // Find the current user's certificate assignment (if any)
  const myCertificateAssignment = event?.certificates?.find(
    cert => {
      // Check if the certificate is for the current user
      const certUserId = cert.user?._id || cert.user;
      return certUserId === currentUser?._id;
    }
  );
  
  // Check if user is eligible to generate certificate (for organizers and creators)
  const canGenerateCertificate = isPast &&
    (isTeamMember || isCreator) && // Both team members and creators can generate certificates
    myCertificateAssignment &&
    (myCertificateAssignment.role === 'organizer' || myCertificateAssignment.role === 'creator') &&
    !myCertificateAssignment.filePath?.url; // No filePath means certificate not generated yet

  // Check if certificate is already generated
  const certificateGenerated = myCertificateAssignment && myCertificateAssignment.filePath?.url;
  
  // Certificate generation handler with enhanced loading states
  const handleGenerateCertificate = async () => {
    if (!canGenerateCertificate) {
      showAlert.warning('⚠️ You are not eligible to generate a certificate at this time.');
      return;
    }
    
    setIsGeneratingCertificate(true);
    try {
      // Step 1: Initiate certificate generation
      showAlert.info('🔄 Starting certificate generation...');
      const response = await axiosInstance.post(`/api/events/${event._id}/generate-certificate`);
      
      // Step 2: Wait for backend processing with progress feedback
      showAlert.info('📄 Generating PDF certificate...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 3: Uploading to Cloudinary
      showAlert.info('☁️ Uploading certificate to Cloudinary...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 4: Refresh the event to get the updated certificate data
      showAlert.info('🔄 Updating certificate data...');
      const updatedEvent = await axiosInstance.get(`/api/events/${id}`);
      setEvent(updatedEvent.data);
      setOrganizerTeam(updatedEvent.data.organizerTeam || []);
      
      // Force a re-render by updating state
      setForceRefresh(prev => prev + 1);
      
      showAlert.success('🎉 Certificate generated successfully! You can now download it.');
    } catch (err) {
      console.error('Certificate generation error:', err);
      const errorMessage = err.response?.data?.message || 'Failed to generate certificate. Please try again.';
      showAlert(`❌ ${errorMessage}`, "error");
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

  // Combine volunteers and organizerTeam user objects for award selection
  const allParticipants = [
    ...volunteers,
    ...organizerTeam.map(obj => obj.user)
  ].filter((u, idx, arr) => u && arr.findIndex(x => x._id === u._id) === idx);

  // Use only volunteers for award selection
  const awardParticipants = volunteers;

  // Prepare separate arrays for volunteers and organizers
  const volunteerParticipants = volunteers;
  const organizerParticipants = organizerTeam.map(obj => obj.user).filter(u => u && u._id !== currentUser?._id); // Exclude creator from organizer awards

  // Handler to open questionnaire modal, refetch volunteers if empty
  const handleOpenQuestionnaireModal = () => {
    if (volunteers.length === 0) {
      fetchVolunteers();
    }
    setShowQuestionnaireModal(true);
  };

  // Check report eligibility
  const checkEligibility = useCallback(async () => {
    if (!event?._id) return;
    
    const result = await checkReportEligibility(event._id);
    if (result.success) {
      setReportEligibility(result.data);
    } else {
      console.error('Failed to check eligibility:', result.error);
    }
  }, [event?._id]);

  // Check report eligibility when event loads
  // For creators: to manage reports and get detailed stats
  // For all users: report existence is checked directly from event data
  useEffect(() => {
    if (event && isCreator) {
      // For creators, get full eligibility data with stats
      checkEligibility();
    }
  }, [event, isCreator, checkEligibility]);



  // Handle report generation
  const handleGenerateReport = async () => {
    if (!event?._id) return;
    
    setGeneratingReport(true);
    setReportError("");
    
    const result = await generateEventReport(event._id);
    
    if (result.success) {
      const message = result.data.isUpdate ? 'Report updated successfully!' : 'Report generated successfully!';
      showAlert(`✅ ${message}`, "success");
      // Refresh event data to get the updated report
      fetchAndSetEvent();
      // Refresh eligibility to update UI
      checkEligibility();
    } else {
      setReportError(result.error);
      const action = reportEligibility?.reportGenerated ? 'update' : 'generate';
      showAlert(`❌ Failed to ${action} report: ${result.error}`, "error");
    }
    
    setGeneratingReport(false);
  };

  // Calendar functions
  const handleAddToCalendar = () => {
    const result = addEventToCalendar(event);
    if (result.success) {
      console.log(result.message);
    } else {
      console.error(result.message);
    }
  };

  const handleDownloadCalendar = () => {
    const result = downloadCalendarFile(event);
    if (result.success) {
      console.log(result.message);
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

  // Handle volunteer removal
  const handleRemoveVolunteer = async (volunteerId) => {
    if (!event?._id) return;
    
    setRemovingVolunteer(true);
    try {
      await axiosInstance.post(`/api/events/${event._id}/remove-volunteer`, {
        volunteerId: volunteerId
      });
      
      // Remove from local state
      setVolunteers(prev => prev.filter(v => v._id !== volunteerId));
      setShowRemoveConfirm(false);
      setSelectedVolunteer(null);
      
              showAlert.success('✅ Volunteer removed successfully!');
    } catch (err) {
      console.error('Failed to remove volunteer:', err);
      showAlert(err.response?.data?.message || '❌ Failed to remove volunteer', "error");
    } finally {
      setRemovingVolunteer(false);
    }
  };

  // Handle volunteer ban
  const handleBanVolunteer = async (volunteerId) => {
    if (!event?._id) return;
    
    setBanningVolunteer(true);
    try {
      await axiosInstance.post(`/api/events/${event._id}/ban-volunteer`, {
        volunteerId: volunteerId
      });
      
      // Remove from local state
      setVolunteers(prev => prev.filter(v => v._id !== volunteerId));
      setShowBanConfirm(false);
      setSelectedVolunteer(null);
      
              showAlert.success('🚫 Volunteer banned successfully!');
    } catch (err) {
      console.error('Failed to ban volunteer:', err);
      showAlert(err.response?.data?.message || '❌ Failed to ban volunteer', "error");
    } finally {
      setBanningVolunteer(false);
    }
  };
  // Handle event completion for recurring events
  const handleCompleteEvent = async () => {
    if (!event?._id) return;
    
    showConfirm.info(
      "Are you sure you want to complete this event? This will create the next instance if it's a recurring event.",
      async () => {
        try {
          setCompletingEvent(true);
          setCompletionError("");
          setCompletionSuccess("");

          const response = await completeEvent(event._id);
          
          if (response.success) {
            setCompletionSuccess(response.message);
            // Refresh event data
            await fetchAndSetEvent();
            
            // If next instance was created, show info
            if (response.nextInstance) {
              setTimeout(() => {
                showAlert.success(`🎉 Event completed successfully! Next instance created: ${response.nextInstance.title}`);
              }, 1000);
            }
          } else {
            setCompletionError(response.message || "Failed to complete event");
          }
        } catch (error) {
          console.error("Error completing event:", error);
          setCompletionError("Failed to complete event");
        } finally {
          setCompletingEvent(false);
        }
      },
      {
        title: "✅ Complete Event",
        confirmText: "Yes, complete it",
        cancelText: "Cancel"
      }
    );
  };

  // Handle organizer removal
  const handleRemoveOrganizer = async (organizerId) => {
    if (!event?._id) return;
    
    setRemovingOrganizer(true);
    try {
      await axiosInstance.post(`/api/events/${event._id}/remove-organizer`, {
        organizerId: organizerId
      });
      
      // Remove from local state
      setOrganizerTeam(prev => prev.filter(obj => obj.user._id !== organizerId));
      setShowRemoveOrganizerConfirm(false);
      setSelectedOrganizer(null);
      
              showAlert.success('✅ Organizer removed successfully!');
    } catch (err) {
      console.error('Failed to remove organizer:', err);
      showAlert(err.response?.data?.message || '❌ Failed to remove organizer', "error");
    } finally {
      setRemovingOrganizer(false);
    }
  };

  // Handle organizer ban
  const handleBanOrganizer = async (organizerId) => {
    if (!event?._id) return;
    
    setBanningOrganizer(true);
    try {
      await axiosInstance.post(`/api/events/${event._id}/ban-organizer`, {
        organizerId: organizerId
      });
      
      // Remove from local state
      setOrganizerTeam(prev => prev.filter(obj => obj.user._id !== organizerId));
      setShowBanOrganizerConfirm(false);
      setSelectedOrganizer(null);
      
              showAlert.success('🚫 Organizer banned successfully!');
    } catch (err) {
      console.error('Failed to ban organizer:', err);
      showAlert(err.response?.data?.message || '❌ Failed to ban organizer', "error");
    } finally {
      setBanningOrganizer(false);
    }
  };

  // Handle volunteer unban
  const handleUnbanVolunteer = async (volunteerId) => {
    if (!event?._id) return;
    
    setUnbanningVolunteer(true);
    try {
      await axiosInstance.post(`/api/events/${event._id}/unban-volunteer`, {
        volunteerId: volunteerId
      });
      
      // Remove from local state
      setBannedVolunteers(prev => prev.filter(v => v._id !== volunteerId));
      setShowUnbanVolunteerConfirm(false);
      setSelectedVolunteer(null);
      
              showAlert.success('✅ Volunteer unbanned successfully!');
    } catch (err) {
      console.error('Failed to unban volunteer:', err);
      showAlert(err.response?.data?.message || '❌ Failed to unban volunteer', "error");
    } finally {
      setUnbanningVolunteer(false);
    }
  };

  // Handle organizer unban
  const handleUnbanOrganizer = async (organizerId) => {
    if (!event?._id) return;
    
    setUnbanningOrganizer(true);
    try {
      await axiosInstance.post(`/api/events/${event._id}/unban-organizer`, {
        organizerId: organizerId
      });
      
      // Remove from local state
      setBannedOrganizers(prev => prev.filter(o => o._id !== organizerId));
      setShowUnbanOrganizerConfirm(false);
      setSelectedOrganizer(null);
      
              showAlert.success('✅ Organizer unbanned successfully!');
    } catch (err) {
      console.error('Failed to unban organizer:', err);
      showAlert(err.response?.data?.message || '❌ Failed to unban organizer', "error");
    } finally {
      setUnbanningOrganizer(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading event details...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gray-50 pb-12 relative">
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
                fetchBannedUsers();
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
          className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${showOrganizerTeamDrawer ? 'translate-x-0' : 'translate-x-full'}`}
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
                onClick={() => setActiveTab('organizers')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === 'organizers'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Organizers ({organizerTeam.length})
              </button>
              <button
                onClick={() => setActiveTab('volunteers')}
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
          <div className="overflow-y-auto h-[calc(100%-200px)] px-6 py-4">
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
                  const displayName = user.username || user.name || '';
                  return displayName.toLowerCase().includes(organizerSearchTerm.toLowerCase());
                })
                .map((obj) => {
                  const user = obj.user;
                  const safeUser = getSafeUserData(user);
                  const isThisUserCreator = user._id === event.createdBy._id;
                  const displayName = getDisplayName(safeUser);
                  const displayText = getUsernameDisplay(safeUser);
                  const canNavigate = canNavigateToUser(user);
                  
                  return (
                    <div
                      key={user._id}
                      className={`group relative bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 mb-3 transform hover:scale-[1.02] ${isThisUserCreator ? 'border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-md' : ''}`}
                      onClick={() => canNavigate && navigate(`/organizer/${getSafeUserId(user)}`)}
                    >
                      <div className="flex items-center">
                        {getProfileImageUrl(safeUser) ? (
                          <img
                            src={getProfileImageUrl(safeUser)}
                            alt={getSafeUserName(safeUser)}
                            className="w-12 h-12 lg:w-14 lg:h-14 rounded-full object-cover border-2 border-blue-400 mr-3 lg:mr-4 shadow-sm"
                          />
                        ) : (
                          <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-gradient-to-r from-blue-100 to-emerald-100 flex items-center justify-center border-2 border-blue-200 mr-3 lg:mr-4 shadow-sm">
                            <span className="text-base lg:text-lg font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">{getAvatarInitial(safeUser)}</span>
                          </div>
                        )}
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className={`font-medium text-blue-800 text-base lg:text-lg truncate ${
                            safeUser.isDeleted ? 'text-gray-600' : ''
                          }`}>{displayText}</span>
                          {safeUser.username && safeUser.name && !safeUser.isDeleted && (
                            <span className="text-sm text-gray-600 truncate">{safeUser.name}</span>
                          )}
                          {safeUser.isDeleted && safeUser.name && (
                            <span className="text-sm text-gray-500 truncate">{safeUser.name}</span>
                          )}
                        </div>
                        {isThisUserCreator && (
                          <span className="ml-2 px-2 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs rounded-full font-bold shadow-sm">Creator</span>
                        )}
                      </div>
                      
                      {/* Action buttons - shown on hover (only for non-creator organizers, and only visible to event creator) */}
                      {!isThisUserCreator && isCreator && !safeUser.isDeleted && (
                        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg">
                          <div className="flex gap-2 justify-center">
                            {/* Remove button - only available to creator */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrganizer(user);
                                setShowRemoveOrganizerConfirm(true);
                              }}
                              className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-3 py-1 rounded-lg text-xs hover:from-yellow-600 hover:to-amber-600 transition-all duration-200 transform hover:scale-105 shadow-sm"
                              disabled={removingOrganizer}
                            >
                              Remove
                            </button>
                            
                            {/* Ban button - only available to creator */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrganizer(user);
                                setShowBanOrganizerConfirm(true);
                              }}
                              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-lg text-xs hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105 shadow-sm"
                              disabled={banningOrganizer}
                            >
                              Ban
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              }
              {organizerTeam.filter(obj => {
                if (!obj.user?._id) return false;
                const user = obj.user;
                const displayName = user.username || user.name || '';
                return displayName.toLowerCase().includes(organizerSearchTerm.toLowerCase());
              }).length === 0 && organizerSearchTerm && (
                <div className="text-gray-500 text-center py-4">No organizers found matching "{organizerSearchTerm}"</div>
              )}
            </div>

            {/* Banned Organizers Section - Only visible to creator */}
            {isCreator && (
              <div className="mt-6">
                <h3 className="text-md font-semibold text-red-700 mb-3">Banned Organizers</h3>
                {bannedOrganizersLoading ? (
                  <div>Loading banned organizers...</div>
                ) : bannedOrganizers.length === 0 ? (
                  <div className="text-gray-500">No banned organizers.</div>
                ) : (
                  bannedOrganizers
                    .filter(org => {
                      const displayName = org.username || org.name || '';
                      return displayName.toLowerCase().includes(organizerSearchTerm.toLowerCase());
                    })
                    .map((org) => {
                      const safeOrg = getSafeUserData(org);
                      const displayName = getDisplayName(safeOrg);
                      const displayText = getUsernameDisplay(safeOrg);
                      const canNavigate = canNavigateToUser(org);
                      
                      return (
                        <div
                          key={org._id}
                          className="bg-red-50 rounded-lg shadow p-3 border border-red-200"
                        >
                          <div 
                            className={`flex items-center justify-between ${
                              canNavigate ? 'cursor-pointer' : 'cursor-default opacity-75'
                            }`}
                            onClick={() => canNavigate && navigate(`/organizer/${getSafeUserId(org)}`)}
                          >
                            <div className="flex items-center flex-1">
                              {getProfileImageUrl(safeOrg) ? (
                                <img
                                  src={getProfileImageUrl(safeOrg)}
                                  alt={getSafeUserName(safeOrg)}
                                  className="w-14 h-14 rounded-full object-cover border-2 border-red-400 mr-4"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-red-100 to-pink-100 flex items-center justify-center border-2 border-red-200 mr-4 shadow-sm">
                                  <span className="text-lg font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">{getAvatarInitial(safeOrg)}</span>
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className={`font-medium text-lg ${
                                  safeOrg.isDeleted ? 'text-gray-600' : 'text-red-800'
                                }`}>{displayText}</span>
                                {safeOrg.username && safeOrg.name && !safeOrg.isDeleted && (
                                  <span className="text-sm text-gray-600">{safeOrg.name}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <span className="px-2 py-1 bg-red-500 text-white text-xs rounded font-bold">Banned</span>
                              {/* Unban button - only available to creator */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrganizer(org);
                                  setShowUnbanOrganizerConfirm(true);
                                }}
                                className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 transition-colors"
                                disabled={unbanningOrganizer}
                              >
                                Unban
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
                {bannedOrganizers.filter(org => {
                  const displayName = org.username || org.name || '';
                  return displayName.toLowerCase().includes(organizerSearchTerm.toLowerCase());
                }).length === 0 && organizerSearchTerm && bannedOrganizers.length > 0 && (
                  <div className="text-gray-500 text-center py-4">No banned organizers found matching "{organizerSearchTerm}"</div>
                )}
              </div>
            )}
        </div>
      )}
            
            {/* Volunteers Tab Content */}
            {activeTab === 'volunteers' && (
              <div className="space-y-4">
            {/* Active Volunteers Section */}
            <div>
              <h3 className="text-md font-semibold text-green-700 mb-3">Active Volunteers</h3>
              {volunteersLoading ? (
                <div>Loading volunteers...</div>
              ) : volunteers.length === 0 ? (
                <div className="text-gray-500">No volunteers registered.</div>
              ) : (
                volunteers
                  .filter(vol => {
                    const safeVol = getSafeUserData(vol);
                    const displayName = safeVol.username || safeVol.name || '';
                    return displayName.toLowerCase().includes(volunteerSearchTerm.toLowerCase());
                  })
                  .map((vol) => {
                    const safeVol = getSafeUserData(vol);
                    const displayName = getDisplayName(safeVol);
                    const displayText = getUsernameDisplay(safeVol);
                    const canNavigate = canNavigateToUser(vol);
                    
                    return (
                      <div
                        key={vol._id || safeVol._id}
                        className={`group relative bg-gray-50 rounded-lg shadow p-3 border hover:shadow-md transition hover:bg-green-50 ${
                          safeVol.isDeleted ? 'opacity-75 bg-gray-100' : ''
                        }`}
                      >
                        <div 
                          className={`flex items-center flex-1 ${canNavigate ? 'cursor-pointer' : 'cursor-default'}`}
                          onClick={() => canNavigate && navigate(`/volunteer/${getSafeUserId(vol)}`)}
                        >
                          {getProfileImageUrl(safeVol) ? (
                            <img
                              src={getProfileImageUrl(safeVol)}
                              alt={getSafeUserName(safeVol)}
                              className="w-14 h-14 rounded-full object-cover border-2 border-green-400 mr-4"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 flex items-center justify-center border-2 border-green-200 mr-4 shadow-sm">
                              <span className="text-sm font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{getAvatarInitial(safeVol)}</span>
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className={`font-medium text-lg ${
                              safeVol.isDeleted ? 'text-gray-600' : 'text-green-800'
                            }`}>
                              {displayText}
                              {safeVol.isDeleted && (
                                <span className="ml-2 px-2 py-1 bg-gray-500 text-white text-xs rounded-full font-bold">Deleted User</span>
                              )}
                            </span>
                            {safeVol.username && safeVol.name && !safeVol.isDeleted && (
                              <span className="text-sm text-gray-600">{safeVol.name}</span>
                            )}
                            {safeVol.isDeleted && safeVol.name && (
                              <span className="text-sm text-gray-500">{safeVol.name}</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Action buttons - shown on hover */}
                        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg">
                          <div className="flex gap-2 justify-center">
                            {/* Remove button - available to all organizers */}
                            {(isCreator || isTeamMember) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVolunteer(vol);
                                  setShowRemoveConfirm(true);
                                }}
                                className="bg-yellow-500 text-white px-3 py-1 rounded text-xs hover:bg-yellow-600 transition-colors"
                                disabled={removingVolunteer}
                              >
                                Remove
                              </button>
                            )}
                            
                            {/* Ban button - only available to creator */}
                            {isCreator && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVolunteer(vol);
                                  setShowBanConfirm(true);
                                }}
                                className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                                disabled={banningVolunteer}
                              >
                                Ban
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
              {volunteers.filter(vol => {
                const displayName = vol.username || vol.name || '';
                return displayName.toLowerCase().includes(volunteerSearchTerm.toLowerCase());
              }).length === 0 && volunteerSearchTerm && volunteers.length > 0 && (
                <div className="text-gray-500 text-center py-4">No volunteers found matching "{volunteerSearchTerm}"</div>
              )}
            </div>

            {/* Banned Volunteers Section */}
            <div className="mt-6">
              <h3 className="text-md font-semibold text-red-700 mb-3">Banned Volunteers</h3>
              {bannedVolunteersLoading ? (
                <div>Loading banned volunteers...</div>
              ) : bannedVolunteers.length === 0 ? (
                <div className="text-gray-500">No banned volunteers.</div>
              ) : (
                bannedVolunteers
                  .filter(vol => {
                    const safeVol = getSafeUserData(vol);
                    const displayName = safeVol.username || safeVol.name || '';
                    return displayName.toLowerCase().includes(volunteerSearchTerm.toLowerCase());
                  })
                  .map((vol) => {
                    const safeVol = getSafeUserData(vol);
                    const displayName = getDisplayName(safeVol);
                    const displayText = getUsernameDisplay(safeVol);
                    const canNavigate = canNavigateToUser(vol);
                    
                    return (
                      <div
                        key={vol._id || safeVol._id}
                        className={`bg-red-50 rounded-lg shadow p-3 border border-red-200 ${
                          safeVol.isDeleted ? 'opacity-75 bg-gray-100' : ''
                        }`}
                      >
                        <div 
                          className={`flex items-center justify-between ${canNavigate ? 'cursor-pointer' : 'cursor-default'}`}
                          onClick={() => canNavigate && navigate(`/volunteer/${getSafeUserId(vol)}`)}
                        >
                          <div className="flex items-center flex-1">
                            {getProfileImageUrl(safeVol) ? (
                              <img
                                src={getProfileImageUrl(safeVol)}
                                alt={getSafeUserName(safeVol)}
                                className="w-14 h-14 rounded-full object-cover border-2 border-red-400 mr-4"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-red-100 to-pink-100 flex items-center justify-center border-2 border-red-200 mr-4 shadow-sm">
                                <span className="text-sm font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">{getAvatarInitial(safeVol)}</span>
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className={`font-medium text-lg ${
                                safeVol.isDeleted ? 'text-gray-600' : 'text-red-800'
                              }`}>
                                {displayText}
                                {safeVol.isDeleted && (
                                  <span className="ml-2 px-2 py-1 bg-gray-500 text-white text-xs rounded-full font-bold">Deleted User</span>
                                )}
                              </span>
                              {safeVol.username && safeVol.name && !safeVol.isDeleted && (
                                <span className="text-sm text-gray-600">{safeVol.name}</span>
                              )}
                              {safeVol.isDeleted && safeVol.name && (
                                <span className="text-sm text-gray-500">{safeVol.name}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <span className="px-2 py-1 bg-red-500 text-white text-xs rounded font-bold">Banned</span>
                            {/* Unban button - available to all organizers */}
                            {(isCreator || isTeamMember) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVolunteer(vol);
                                  setShowUnbanVolunteerConfirm(true);
                                }}
                                className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 transition-colors"
                                disabled={unbanningVolunteer}
                              >
                                Unban
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
              {bannedVolunteers.filter(vol => {
                const displayName = vol.username || vol.name || '';
                return displayName.toLowerCase().includes(volunteerSearchTerm.toLowerCase());
              }).length === 0 && volunteerSearchTerm && bannedVolunteers.length > 0 && (
                <div className="text-gray-500 text-center py-4">No banned volunteers found matching "{volunteerSearchTerm}"</div>
              )}
            </div>
              </div>
            )}
          </div>
        </div>
      )}
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
          
          /* AI Summary Animation */
          @keyframes gradient-x {
            0%, 100% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
          }
          
          .animate-gradient-x {
            background-size: 200% 200%;
            animation: gradient-x 3s ease infinite;
          }
          
          /* Enhanced hover effects */
          .group:hover .animate-gradient-x {
            animation-duration: 1.5s;
          }
          
          /* Line clamp utility for text truncation */
          .line-clamp-3 {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          /* Hide scrollbar for thumbnail navigation */
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }

          /* Enhanced carousel animations */
          .carousel-slide-enter {
            opacity: 0;
            transform: scale(0.95);
          }
          .carousel-slide-enter-active {
            opacity: 1;
            transform: scale(1);
            transition: opacity 300ms ease-in-out, transform 300ms ease-in-out;
          }
          .carousel-slide-exit {
            opacity: 1;
            transform: scale(1);
          }
          .carousel-slide-exit-active {
            opacity: 0;
            transform: scale(0.95);
            transition: opacity 300ms ease-in-out, transform 300ms ease-in-out;
          }

          /* Smooth hover effects for carousel controls */
          .carousel-control {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .carousel-control:hover {
            transform: translateY(-1px);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          }
        `}</style>
      <div className="pt-24 w-full px-6">
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 max-w-none xl:h-[calc(100vh-8rem)]">
          {/* Left Column - Action Cards */}
          <div className="xl:col-span-1 space-y-6 xl:overflow-y-auto xl:max-h-screen pr-2 pb-8 custom-scrollbar">
            {/* Questionnaire Section for Organizers - AT THE TOP */}
            {/* Show to: organizers for past events ONLY if they are part of the event (not just requested to join) */}
            {isOrganizer && isPastEvent && isTeamMember && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                  Organizer Feedback
                </h3>
                
                <div className="space-y-3">
                  {myOrganizerObj && !myQuestionnaireCompleted ? (
                    <>
                      <p className="text-sm text-gray-600">
                        Complete your questionnaire to generate your certificate.
                      </p>
                      <button
                        onClick={handleOpenQuestionnaireModal}
                        className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                      >
                        Complete Questionnaire
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-2">
                      <div className="text-green-600 font-medium mb-2">✅ Questionnaire Completed</div>
                      <p className="text-sm text-gray-600">Thank you for your feedback!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Certificate Section for Organizers & Creators - BELOW QUESTIONNAIRE */}
            {/* Show to: organizers (only if part of event) and creators for past events */}
            {((isOrganizer && isTeamMember) || isCreator) && isPastEvent && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                  Your Certificate
                </h3>
                
                <div className="space-y-3">
                  {!myQuestionnaireCompleted ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-amber-800">
                        📝 <strong>Complete your questionnaire first</strong> to be eligible for a certificate.
                      </p>
                    </div>
                  ) : !myCertificateAssignment ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        ⏳ <strong>Questionnaire completed!</strong> Certificates will be available once the event creator assigns awards.
                      </p>
                    </div>
                  ) : certificateGenerated ? (
                    <div className="text-center">
                      <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm mb-3">
                        🎉 <strong>Certificate ready!</strong> You can now download your certificate.
                      </div>
                      <button
                        onClick={() => handleDownloadCertificate(
                          myCertificateAssignment.filePath.url,
                          `${event.title}_${myCertificateAssignment.award}_certificate.pdf`
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
                          Award: <span className="font-medium">{myCertificateAssignment.award}</span>
                        </p>
                      </div>
                      <button
                        onClick={handleGenerateCertificate}
                        disabled={!canGenerateCertificate || isGeneratingCertificate}
                        className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
              </div>
            )}




            {/* AI Event Report Section - Visible to Everyone Once Generated */}
            {/* Show to: ALL users for past events when report exists, regardless of role */}
            {isPastEvent && event?.report?.isGenerated && (
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
                    
                    {/* Show detailed stats only for creators */}
                    {isCreator && reportEligibility && (
                      <>
                        {/* AI Event Report Stats */}
                        <div className="bg-gradient-to-r from-violet-900/30 to-indigo-900/30 border border-violet-400/50 rounded-xl p-4 backdrop-blur-sm shadow-lg">
                          <h4 className="text-md font-semibold text-violet-200 mb-3 flex items-center gap-2">
                            <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse"></div>
                            AI Event Report
                          </h4>
                          
                                                    {/* Organizer Questionnaires */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-violet-300">Organizer Questionnaires</span>
                              <span className="text-sm font-semibold text-violet-200">
                                {reportEligibility.completedOrganizerQuestionnaires}/{reportEligibility.totalOrganizers} completed ({reportEligibility.organizerCompletionRate}%)
                              </span>
                            </div>
                            <div className="w-full bg-violet-900/40 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  reportEligibility.organizerCompletionRate >= 50 ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-amber-400 to-orange-400'
                                }`}
                                style={{ width: `${Math.min(reportEligibility.organizerCompletionRate, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          {/* Volunteer Questionnaires */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-violet-300">Volunteer Questionnaires</span>
                              <span className="text-sm font-semibold text-violet-200">
                                {reportEligibility.completedVolunteerQuestionnaires}/{reportEligibility.totalVolunteers} completed ({reportEligibility.volunteerCompletionRate}%)
                              </span>
                            </div>
                            <div className="w-full bg-violet-900/40 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  reportEligibility.volunteerCompletionRate >= 50 ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-amber-400 to-orange-400'
                                }`}
                                style={{ width: `${Math.min(reportEligibility.volunteerCompletionRate, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Event Statistics */}
                        <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-400/50 rounded-xl p-4 backdrop-blur-sm shadow-lg">
                          <h4 className="text-md font-semibold text-cyan-200 mb-3 flex items-center gap-2">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                            Event Statistics
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center">
                              <div className="text-lg font-bold text-cyan-300">
                                {(reportEligibility.totalOrganizers || 0) + (reportEligibility.totalVolunteers || 0)}
                              </div>
                              <div className="text-xs text-cyan-400">Total Participants</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-cyan-300">
                                {Math.round(((reportEligibility.completedOrganizerQuestionnaires + reportEligibility.completedVolunteerQuestionnaires) /
                                  ((reportEligibility.totalOrganizers || 0) + (reportEligibility.totalVolunteers || 0))) * 100)}%
                              </div>
                              <div className="text-xs text-cyan-400">Completion Rate</div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* View Report Button */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          // View report functionality for all users
                          if (event?.report?.content) {
                            const reportWindow = window.open('', '_blank');
                            const htmlContent = `
                              <!DOCTYPE html>
                              <html>
                              <head>
                                <title>Event Report: ${event.title}</title>
                                <style>
                                  body {
                                    font-family: 'Times New Roman', serif;
                                    line-height: 1.8;
                                    color: #2c3e50;
                                    max-width: 900px;
                                    margin: 0 auto;
                                    padding: 40px;
                                    background: #ffffff;
                                  }
                                  .report-header {
                                    text-align: center;
                                    border-bottom: 3px solid #2c5530;
                                    padding-bottom: 20px;
                                    margin-bottom: 40px;
                                  }
                                  .report-title {
                                    font-size: 32px;
                                    font-weight: bold;
                                    color: #2c5530;
                                    margin-bottom: 10px;
                                    text-transform: uppercase;
                                    letter-spacing: 1px;
                                  }
                                  .report-subtitle {
                                    font-size: 18px;
                                    color: #7f8c8d;
                                    font-style: italic;
                                  }
                                  h1 {
                                    font-size: 28px;
                                    color: #2c5530;
                                    border-bottom: 2px solid #4CAF50;
                                    padding-bottom: 10px;
                                    margin-top: 40px;
                                    margin-bottom: 20px;
                                    font-weight: bold;
                                    text-transform: uppercase;
                                    letter-spacing: 0.5px;
                                  }
                                  h2 {
                                    font-size: 22px;
                                    color: #34495e;
                                    border-left: 5px solid #4CAF50;
                                    padding-left: 20px;
                                    margin-top: 35px;
                                    margin-bottom: 15px;
                                    font-weight: bold;
                                    background: #f8f9fa;
                                    padding-top: 10px;
                                    padding-bottom: 10px;
                                  }
                                  h3 {
                                    font-size: 18px;
                                    color: #1976d2;
                                    margin-top: 25px;
                                    margin-bottom: 12px;
                                    font-weight: bold;
                                    border-bottom: 1px solid #e0e0e0;
                                    padding-bottom: 5px;
                                  }
                                  p {
                                    margin-bottom: 15px;
                                    text-align: justify;
                                    text-indent: 20px;
                                  }
                                  ul, ol {
                                    margin-bottom: 15px;
                                    padding-left: 30px;
                                  }
                                  li {
                                    margin-bottom: 8px;
                                    line-height: 1.6;
                                  }
                                  .section {
                                    margin-bottom: 30px;
                                    padding: 20px;
                                    border-radius: 8px;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                  }
                                  .executive-summary {
                                    background: #e8f5e8;
                                    border-left: 5px solid #4CAF50;
                                  }
                                  .impact-section {
                                    background: #e3f2fd;
                                    border-left: 5px solid #2196F3;
                                  }
                                  .recommendations {
                                    background: #fff3e0;
                                    border-left: 5px solid #FF9800;
                                  }
                                  .conclusion {
                                    background: #f3e5f5;
                                    border-left: 5px solid #9C27B0;
                                  }
                                  strong {
                                    color: #2c5530;
                                    font-weight: bold;
                                  }
                                  em {
                                    color: #7f8c8d;
                                    font-style: italic;
                                  }
                                  .page-break {
                                    page-break-before: always;
                                  }
                                  @media print {
                                    body { font-size: 12pt; }
                                    h1 { font-size: 18pt; }
                                    h2 { font-size: 16pt; }
                                    h3 { font-size: 14pt; }
                                  }
                                </style>
                              </head>
                              <body>
                                <div class="report-header">
                                  <div class="report-title">Event Impact Report</div>
                                  <div class="report-subtitle">${event.title}</div>
                                </div>
                                <div class="report-content">
                                  ${event.report.content
                                    .replace(/\n/g, '<br>')
                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                    .replace(/# (.*?)(<br>|$)/g, '<h1>$1</h1>')
                                  .replace(/## (.*?)(<br>|$)/g, '<h2>$1</h2>')
                                  .replace(/### (.*?)(<br>|$)/g, '<h3>$1</h3>')
                                  .replace(/(Executive Summary[\s\S]*?)(?=##|$)/gi, '<div class="section executive-summary">$1</div>')
                                  .replace(/(Impact Assessment[\s\S]*?)(?=##|$)/gi, '<div class="section impact-section">$1</div>')
                                  .replace(/(Recommendations[\s\S]*?)(?=##|$)/gi, '<div class="section recommendations">$1</div>')
                                  .replace(/(Conclusion[\s\S]*?)(?=##|$)/gi, '<div class="section conclusion">$1</div>')}
                                </div>
                              </body>
                              </html>
                            `;
                            reportWindow.document.write(htmlContent);
                            reportWindow.document.close();
                          }
                        }}
                        className="flex-1 bg-gradient-to-r from-violet-500 via-cyan-500 to-blue-500 text-white px-4 py-2 rounded-xl hover:from-violet-600 hover:via-cyan-600 hover:to-blue-600 transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 hover:shadow-cyan-500/25"
                      >
                        📄 View AI Report
                      </button>
                      
                      {/* Show update button only for creators */}
                      {isCreator && reportEligibility && (
                        <button
                          onClick={handleGenerateReport}
                          disabled={generatingReport}
                          className="flex-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 text-white px-4 py-2 rounded-xl hover:from-indigo-600 hover:via-purple-600 hover:to-violet-600 transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {generatingReport ? "🔄 Updating..." : "🔄 Update Report"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Report Section - For when no report is available yet (visible to everyone) */}
            {isPastEvent && !event?.report?.isGenerated && (
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
                    <div className="text-center py-4">
                      <div className="text-amber-400 mb-3 text-4xl">📋</div>
                      <p className="text-sm text-amber-200 mb-2">No AI report available yet.</p>
                      <p className="text-xs text-amber-300">Report will be visible to everyone once generated.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}



            {/* Event Actions Card */}
        {(canEdit || isTeamMember) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                  Event Actions
                </h3>
                
                <div className="space-y-3">
                  {/* Edit Event - Only for creators and org admins */}
            {canEdit && (
                <button
                  onClick={() => navigate(`/events/${id}/edit`)}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
                >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                      Edit Event
                </button>
                  )}

                  {/* Delete Event - Only for creators */}
                  {isCreator && (
                <button
                  onClick={handleDelete}
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
                >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 112 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Delete Event
                </button>
            )}

                  {/* Manage Attendance - For all organizers */}
                  {(canEdit || isTeamMember) && (
            <button
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
              onClick={() => navigate(`/events/${id}/attendance`)}
            >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Manage Attendance
            </button>
                  )}

                  {/* View Govt Approval Letter - For all organizers if available */}
                  {event.govtApprovalLetter && (canEdit || isTeamMember) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>📄 Government Approval Letter:</span>
                      <a
                        href={event.govtApprovalLetter.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {event.govtApprovalLetter.filename}
                      </a>
                    </div>
                  )}
                </div>
          </div>
        )}

            {/* Join Requests Card - Only for creators */}
        {isCreator && event && event.organizerJoinRequests && event.organizerJoinRequests.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                  </svg>
                  Pending Join Requests ({event.organizerJoinRequests.filter(r => r.status === 'pending').length})
                </h3>
                
                <div className="space-y-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {event.organizerJoinRequests.filter(r => r.status === 'pending' && r.user).map(r => {
                const user = r.user;
                    if (!user) return null;
                
                const safeUser = getSafeUserData(user);
                const userId = getSafeUserId(user) || user._id || user;
                const name = getDisplayName(safeUser);
                const canNavigate = canNavigateToUser(user);
                
                return (
                      <div key={userId} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center gap-3 mb-2">
                    {getProfileImageUrl(safeUser) ? (
                      <img 
                        src={getProfileImageUrl(safeUser)} 
                        alt={getSafeUserName(safeUser)} 
                              className="w-8 h-8 rounded-full object-cover border" 
                      />
                    ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-100 to-emerald-100 flex items-center justify-center border border-blue-200 shadow-sm">
                              <span className="text-xs font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">{getAvatarInitial(safeUser)}</span>
                      </div>
                    )}
                    <span
                            className={`font-medium text-sm ${
                              canNavigate ? 'text-blue-700 cursor-pointer hover:underline' : 'text-gray-500 cursor-default'
                      }`}
                      onClick={() => canNavigate && navigate(`/organizer/${userId}`)}
                    >
                      {name}
                    </span>
                        </div>
                        <div className="flex gap-2">
                    <button
                            className="flex-1 bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 transition-colors"
                      onClick={() => handleApproveJoinRequest(userId)}
                          >
                            Approve
                          </button>
                    <button
                            className="flex-1 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                      onClick={() => handleRejectJoinRequest(userId)}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                );
              })}
                </div>
          </div>
        )}

            {/* Join as Organizer Card - For eligible organizers */}
            {!isPastEvent && canJoinAsOrganizer && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  Join Event
                </h3>
                
                <div className="space-y-3">
                  {joinRequestStatus === 'pending' ? (
                    <div className="text-center">
                      <div className="text-blue-700 font-medium mb-2">Request Pending</div>
                      <button
                        onClick={handleWithdrawJoinRequest}
                        className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
                        disabled={joining}
                      >
                        {joining ? "Withdrawing..." : "Withdraw Request"}
                      </button>
                    </div>
                  ) : hasRejectedRequest ? (
                    <div className="text-center">
                      <div className="text-red-700 font-medium mb-2">Request Rejected</div>
                      <button
                        onClick={handleRequestJoinAsOrganizer}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        disabled={joining}
                      >
                        {joining ? "Reapplying..." : "Reapply"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleRequestJoinAsOrganizer}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      disabled={joining}
                    >
                      {joining ? "Requesting..." : "Join as Organizer"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Leave Event Card - For team members who aren't creators */}
        {isTeamMember && !isCreator && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Leave Event
                </h3>
                
          <button
            onClick={handleLeaveAsOrganizer}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Leave as Organizer
          </button>
              </div>
            )}

            {/* Comments Section - Visible to different users based on their role and status */}
            {/* Show to: registered volunteers, organizers, or if user is organizer and can see comments */}
            {(isRegisteredForEvent || isOrganizer || (isOrganizer && comments.length > 0)) && (
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
                  {/* Toggle Comments Button */}
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

                  {/* Comments Display */}
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
                            <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <CommentAvatarAndName comment={comment} />
                              <div className="mt-2 text-sm text-gray-700">
                                {comment.comments || comment.feedback || comment.suggestions || comment.additionalComments || comment.experience || comment.improvements || 'No comment text available'}
                              </div>
                              <div className="mt-2 text-xs text-gray-500 text-right">
                                {comment.createdAt ? format(new Date(comment.createdAt), 'MMM dd, yyyy') : 'Date not available'}
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

            {/* Basic Event Info for Non-Registered Users */}
            {/* Show to: users who are not organizers and not registered, but might be interested */}
            {!isOrganizer && !isRegisteredForEvent && currentUser && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  Event Information
                </h3>
                
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    <span>Date: {event?.date ? format(new Date(event.date), 'MMM dd, yyyy') : 'TBD'}</span>
                  </div>
                  
                  {event?.location && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <span>Location: {event.location}</span>
                    </div>
                  )}
                  
                  {event?.description && (
                    <div className="pt-2">
                      <p className="text-gray-700 line-clamp-3">{event.description}</p>
                    </div>
                  )}
                  
                  <div className="pt-2">
                    <p className="text-xs text-gray-500">
                      Register as a volunteer to see more details and participate in this event.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Registration Status for Registered Volunteers */}
            {/* Show to: users who are registered as volunteers */}
            {isRegisteredForEvent && !isOrganizer && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Registration Status
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Successfully Registered</span>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      You are registered for this event. Check the main event details for more information and updates.
                    </p>
                  </div>
                  
                  {!isPastEvent && (
                    <button
                      onClick={() => navigate(`/volunteer/events/${id}`)}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      View My Registration Details
                    </button>
                  )}
                </div>
              </div>
            )}






            {/* Questionnaire Section for Registered Volunteers */}
            {/* Show to: registered volunteers for past events */}
            {isRegisteredForEvent && !isOrganizer && isPastEvent && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                  Event Feedback
                </h3>
                
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Help us improve future events by sharing your experience.
                  </p>
                  
                  <button
                    onClick={() => navigate(`/volunteer/events/${id}`)}
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    Complete Questionnaire
                  </button>
                </div>
              </div>
            )}

            {/* Certificate Section for Volunteers - BELOW QUESTIONNAIRE */}
            {/* Show to: registered volunteers for past events */}
            {isRegisteredForEvent && !isOrganizer && isPastEvent && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                  Your Certificate
                </h3>
                
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      📝 <strong>Complete your questionnaire first</strong> to be eligible for a certificate.
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      After completing the questionnaire, certificates will be available once the event organizer assigns awards.
                    </p>
                  </div>
                  
                  <button
                    onClick={() => navigate(`/volunteer/events/${id}`)}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Go to Volunteer Event Page
                  </button>
                  
                  <div className="text-xs text-gray-600 text-center">
                    <p>Check your questionnaire status and certificate availability there.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Anonymous User Info */}
            {/* Show to: users who are not logged in */}
            {!currentUser && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  Get Started
                </h3>
                
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Sign up or log in to register for this event and access all features.
                  </p>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => navigate('/auth/volunteer')}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Sign Up as Volunteer
                    </button>
                    
                    <button
                      onClick={() => navigate('/auth/organizer')}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Sign Up as Organizer
                    </button>
                    
                    <button
                      onClick={() => navigate('/auth/login')}
                      className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                    >
                      Log In
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Event Details */}
          <div className="xl:col-span-3 xl:overflow-y-auto xl:max-h-screen pr-2 pb-8 custom-scrollbar">
            {/* Show event ended message if completed */}
            {isPastEvent && (
              <div className="text-red-600 font-semibold mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                This event has ended
              </div>
            )}
        
        {/* Recurring Event Completion */}
        {event.recurringEvent && isPastEvent && (isCreator || isTeamMember) && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Complete Event</h3>
            <p className="text-blue-700 mb-3">
              This event has ended. Complete it to create the next instance in the series.
            </p>
            <button
              onClick={handleCompleteEvent}
              disabled={completingEvent}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {completingEvent ? "Completing..." : "Complete Event & Create Next Instance"}
            </button>
            {completionError && <p className="text-red-600 mt-2">{completionError}</p>}
            {completionSuccess && <p className="text-green-600 mt-2">{completionSuccess}</p>}
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
                  
                  {/* Add to Calendar Button - Moved to end of event name */}
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
                      <div data-calendar-dropdown className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[220px] z-50">
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
                {calendarStatus.isOrganizerEvent && (
                  <div className="px-3 py-2 text-sm text-gray-500 italic">
                    Organizer events are automatically in calendar
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

        {/* AI Report Generation Section - Only for creator of past events */}
        {isCreator && isPast && (
          <div className="relative mt-8 mb-8 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 rounded-2xl shadow-2xl border border-indigo-400/40 p-6 overflow-hidden">
            {/* AI Background Pattern */}
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
              <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-cyan-400 to-blue-400 mb-6 flex items-center gap-3">
                <div className="relative">
                  <svg className="w-6 h-6 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd" />
                  </svg>
                  <div className="absolute -inset-1 bg-cyan-400/30 rounded-full blur-md animate-pulse"></div>
                </div>
                <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent drop-shadow-lg">
                  AI Event Report
                </span>
              </h2>
            
            {reportEligibility && (
              <div className="mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gradient-to-r from-violet-900/30 to-indigo-900/30 border border-violet-400/50 rounded-xl p-4 backdrop-blur-sm shadow-lg">
                    <h3 className="font-semibold text-violet-200 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse"></div>
                      Organizer Questionnaires
                    </h3>
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full mr-2 ${
                        reportEligibility.organizerCompletionRate >= 50 ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}></div>
                      <span className="text-violet-200">{reportEligibility.completedOrganizerQuestionnaires}/{reportEligibility.totalOrganizers} completed ({reportEligibility.organizerCompletionRate}%)</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-violet-900/30 to-indigo-900/30 border border-violet-400/50 rounded-xl p-4 backdrop-blur-sm shadow-lg">
                    <h3 className="font-semibold text-violet-200 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse"></div>
                      Volunteer Questionnaires
                    </h3>
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full mr-2 ${
                        reportEligibility.volunteerCompletionRate >= 50 ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}></div>
                      <span className="text-violet-200">{reportEligibility.completedVolunteerQuestionnaires}/{reportEligibility.totalVolunteers} completed ({reportEligibility.volunteerCompletionRate}%)</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-400/50 rounded-xl p-4 backdrop-blur-sm shadow-lg">
                    <h3 className="font-semibold text-cyan-200 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                      Event Statistics
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-cyan-300">Total Participants:</span>
                        <span className="font-medium text-cyan-200">{(reportEligibility.totalOrganizers || 0) + (reportEligibility.totalVolunteers || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyan-300">Completion Rate:</span>
                        <span className="font-medium text-cyan-200">
                          {Math.round(((reportEligibility.completedOrganizerQuestionnaires + reportEligibility.completedVolunteerQuestionnaires) / 
                          ((reportEligibility.totalOrganizers || 0) + (reportEligibility.totalVolunteers || 0))) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {reportEligibility.reportGenerated ? (
                  <div>
                    <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-400/50 rounded-xl p-4 backdrop-blur-sm shadow-lg mb-4">
                      <p className="text-sm text-emerald-200 font-medium">
                        ✅ <strong className="text-emerald-100">Report has been generated successfully!</strong>
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={() => {
                          // View report functionality for creator
                          if (event?.report?.content) {
                            const reportWindow = window.open('', '_blank');
                            const htmlContent = `
                              <!DOCTYPE html>
                              <html>
                              <head>
                                <title>Event Report: ${event.title}</title>
                                <style>
                                  body {
                                    font-family: 'Times New Roman', serif;
                                    line-height: 1.8;
                                    color: #2c3e50;
                                    max-width: 900px;
                                    margin: 0 auto;
                                    padding: 40px;
                                    background: #ffffff;
                                  }
                                  .report-header {
                                    text-align: center;
                                    border-bottom: 3px solid #2c5530;
                                    padding-bottom: 20px;
                                    margin-bottom: 40px;
                                  }
                                  .report-title {
                                    font-size: 32px;
                                    font-weight: bold;
                                    color: #2c5530;
                                    margin-bottom: 10px;
                                    text-transform: uppercase;
                                    letter-spacing: 1px;
                                  }
                                  .report-subtitle {
                                    font-size: 18px;
                                    color: #7f8c8d;
                                    font-style: italic;
                                  }
                                  h1 {
                                    font-size: 28px;
                                    color: #2c5530;
                                    border-bottom: 2px solid #4CAF50;
                                    padding-bottom: 10px;
                                    margin-top: 40px;
                                    margin-bottom: 20px;
                                    font-weight: bold;
                                    text-transform: uppercase;
                                    letter-spacing: 0.5px;
                                  }
                                  h2 {
                                    font-size: 22px;
                                    color: #34495e;
                                    border-left: 5px solid #4CAF50;
                                    padding-left: 20px;
                                    margin-top: 35px;
                                    margin-bottom: 15px;
                                    font-weight: bold;
                                    background: #f8f9fa;
                                    padding-top: 10px;
                                    padding-bottom: 10px;
                                  }
                                  h3 {
                                    font-size: 18px;
                                    color: #1976d2;
                                    margin-top: 25px;
                                    margin-bottom: 12px;
                                    font-weight: bold;
                                    border-bottom: 1px solid #e0e0e0;
                                    padding-bottom: 5px;
                                  }
                                  p {
                                    margin-bottom: 15px;
                                    text-align: justify;
                                    text-indent: 20px;
                                  }
                                  ul, ol {
                                    margin-bottom: 15px;
                                    padding-left: 30px;
                                  }
                                  li {
                                    margin-bottom: 8px;
                                    line-height: 1.6;
                                  }
                                  .section {
                                    margin-bottom: 30px;
                                    padding: 20px;
                                    border-radius: 8px;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                  }
                                  .executive-summary {
                                    background: #e8f5e8;
                                    border-left: 5px solid #4CAF50;
                                  }
                                  .impact-section {
                                    background: #e3f2fd;
                                    border-left: 5px solid #2196F3;
                                  }
                                  .recommendations {
                                    background: #fff3e0;
                                    border-left: 5px solid #FF9800;
                                  }
                                  .conclusion {
                                    background: #f3e5f5;
                                    border-left: 5px solid #9C27B0;
                                  }
                                  strong {
                                    color: #2c5530;
                                    font-weight: bold;
                                  }
                                  em {
                                    color: #7f8c8d;
                                    font-style: italic;
                                  }
                                  .page-break {
                                    page-break-before: always;
                                  }
                                  @media print {
                                    body { font-size: 12pt; }
                                    h1 { font-size: 18pt; }
                                    h2 { font-size: 16pt; }
                                    h3 { font-size: 14pt; }
                                  }
                                </style>
                              </head>
                              <body>
                                <div class="report-header">
                                  <div class="report-title">Event Impact Report</div>
                                  <div class="report-subtitle">${event.title}</div>
                                </div>
                                <div class="report-content">
                                  ${event.report.content
                                    .replace(/\n/g, '<br>')
                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                    .replace(/# (.*?)(<br>|$)/g, '<h1>$1</h1>')
                                    .replace(/## (.*?)(<br>|$)/g, '<h2>$1</h2>')
                                    .replace(/### (.*?)(<br>|$)/g, '<h3>$1</h3>')
                                    .replace(/(Executive Summary[\s\S]*?)(?=##|$)/gi, '<div class="section executive-summary">$1</div>')
                                    .replace(/(Impact Assessment[\s\S]*?)(?=##|$)/gi, '<div class="section impact-section">$1</div>')
                                    .replace(/(Recommendations[\s\S]*?)(?=##|$)/gi, '<div class="section recommendations">$1</div>')
                                    .replace(/(Conclusion[\s\S]*?)(?=##|$)/gi, '<div class="section conclusion">$1</div>')}
                                </div>
                              </body>
                              </html>
                            `;
                            reportWindow.document.write(htmlContent);
                            reportWindow.document.close();
                          }
                        }}
                        className="flex-1 bg-gradient-to-r from-violet-500 via-cyan-500 to-blue-500 text-white px-4 py-2 rounded-xl hover:from-violet-600 hover:via-cyan-600 hover:to-blue-600 transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 hover:shadow-cyan-500/25"
                      >
                        📄 View Report
                      </button>
                      <button
                        onClick={handleGenerateReport}
                        disabled={generatingReport}
                        className="flex-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 text-white px-4 py-2 rounded-xl hover:from-indigo-600 hover:via-purple-600 hover:to-violet-600 transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generatingReport ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Updating Report...
                          </div>
                        ) : (
                          '🔄 Update Report'
                        )}
                      </button>
                    </div>
                  </div>
                ) : reportEligibility.isEligible ? (
                  <div>
                    <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-400/50 rounded-xl p-4 backdrop-blur-sm shadow-lg mb-4">
                      <p className="text-sm text-emerald-200 font-medium">
                        ✅ <strong className="text-emerald-100">Event is eligible for report generation (50%+ questionnaires completed)</strong>
                      </p>
                    </div>
                    <button
                      onClick={handleGenerateReport}
                      disabled={generatingReport}
                      className="w-full bg-gradient-to-r from-violet-500 via-cyan-500 to-blue-500 text-white px-4 py-2 rounded-xl hover:from-violet-600 hover:via-cyan-600 hover:to-blue-600 transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 hover:shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingReport ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating Report...
                        </div>
                      ) : (
                        '📊 Generate AI Report'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-400/50 rounded-xl p-4 backdrop-blur-sm shadow-lg">
                    <p className="text-sm text-amber-200 font-medium">
                      ⚠️ <strong className="text-amber-100">Need 50% questionnaire completion from both organizers and volunteers to generate report</strong>
                    </p>
                  </div>
                )}
                
                {reportError && (
                  <div className="bg-gradient-to-r from-red-900/30 to-pink-900/30 border border-red-400/50 rounded-xl p-4 backdrop-blur-sm shadow-lg mt-4">
                    <p className="text-sm text-red-200 font-medium">
                      ❌ <strong className="text-red-100">{reportError}</strong>
                    </p>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
      

      
      {event && (
        <EventChatBox eventId={event._id} currentUser={currentUser} />
      )}


      {/* Loader overlay for certificate generation */}
      {isGeneratingCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <span className="text-lg font-semibold text-blue-700">Generating certificate...</span>
          </div>
        </div>
      )}
      <EventQuestionnaireModal
        open={showQuestionnaireModal}
        onClose={() => setShowQuestionnaireModal(false)}
        eventType={event?.eventType}
        onSubmit={handleQuestionnaireSubmit}
        isCreator={organizerTeam.length > 0 && organizerTeam[0].user._id === currentUser?._id}
        volunteerParticipants={volunteerParticipants}
        organizerParticipants={organizerParticipants}
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

      {/* Remove Volunteer Confirmation Modal */}
      {showRemoveConfirm && selectedVolunteer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Remove Volunteer
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove <strong>{selectedVolunteer.username || selectedVolunteer.name}</strong> from this event? They will be able to register again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRemoveConfirm(false);
                  setSelectedVolunteer(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                disabled={removingVolunteer}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveVolunteer(selectedVolunteer._id)}
                className="flex-1 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
                disabled={removingVolunteer}
              >
                {removingVolunteer ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Volunteer Confirmation Modal */}
      {showBanConfirm && selectedVolunteer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Ban Volunteer
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to ban <strong>{selectedVolunteer.username || selectedVolunteer.name}</strong> from this event? They will not be able to register again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBanConfirm(false);
                  setSelectedVolunteer(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                disabled={banningVolunteer}
              >
                Cancel
              </button>
              <button
                onClick={() => handleBanVolunteer(selectedVolunteer._id)}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                disabled={banningVolunteer}
              >
                {banningVolunteer ? 'Banning...' : 'Ban'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Organizer Confirmation Modal */}
      {showRemoveOrganizerConfirm && selectedOrganizer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Remove Organizer
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove <strong>{selectedOrganizer.username || selectedOrganizer.name}</strong> from this event? They will be able to join again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRemoveOrganizerConfirm(false);
                  setSelectedOrganizer(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                disabled={removingOrganizer}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveOrganizer(selectedOrganizer._id)}
                className="flex-1 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
                disabled={removingOrganizer}
              >
                {removingOrganizer ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Organizer Confirmation Modal */}
      {showBanOrganizerConfirm && selectedOrganizer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Ban Organizer
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to ban <strong>{selectedOrganizer.username || selectedOrganizer.name}</strong> from this event? They will not be able to join again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBanOrganizerConfirm(false);
                  setSelectedOrganizer(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                disabled={banningOrganizer}
              >
                Cancel
              </button>
              <button
                onClick={() => handleBanOrganizer(selectedOrganizer._id)}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                disabled={banningOrganizer}
              >
                {banningOrganizer ? 'Banning...' : 'Ban'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unban Volunteer Confirmation Modal */}
      {showUnbanVolunteerConfirm && selectedVolunteer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Unban Volunteer
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to unban <strong>{selectedVolunteer.username || selectedVolunteer.name}</strong> from this event? They will be able to register again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUnbanVolunteerConfirm(false);
                  setSelectedVolunteer(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                disabled={unbanningVolunteer}
              >
                Cancel
              </button>
              <button
                onClick={() => handleUnbanVolunteer(selectedVolunteer._id)}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                disabled={unbanningVolunteer}
              >
                {unbanningVolunteer ? 'Unbanning...' : 'Unban'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unban Organizer Confirmation Modal */}
      {showUnbanOrganizerConfirm && selectedOrganizer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Unban Organizer
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to unban <strong>{selectedOrganizer.username || selectedOrganizer.name}</strong> from this event? They will be able to join again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUnbanOrganizerConfirm(false);
                  setSelectedOrganizer(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                disabled={unbanningOrganizer}
              >
                Cancel
              </button>
              <button
                onClick={() => handleUnbanOrganizer(selectedOrganizer._id)}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                disabled={unbanningOrganizer}
              >
                {unbanningOrganizer ? 'Unbanning...' : 'Unban'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
