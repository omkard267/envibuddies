// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PrivateRoute from "./components/PrivateRoute";
import HomePage from "./pages/HomePage";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";
import RecoverAccountPage from "./pages/RecoverAccountPage";
import RecoveryConfirmationPage from "./pages/RecoveryConfirmationPage";
import VolunteerDashboard from "./pages/VolunteerDashboard";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import RegisterOrganization from "./pages/RegisterOrganization";
import VolunteerEvents from "./pages/VolunteerEvents";
import OrganizationPage from "./pages/OrganizationPage";
import JoinOrganizationPage from "./pages/JoinOrganizationPage";
import YourOrganizations from "./pages/YourOrganizations";
import MyRequests from "./pages/MyRequests";
import ProfilePage from "./pages/ProfilePage";
import EventDetailsPage from "./pages/EventDetailsPage";
import MyEvents from "./pages/MyEvents";
import EditEventPage from "./pages/EditEventPage";
import VolunteerOrganizationPage from "./pages/VolunteerOrganizationPage";
import VolunteerEventDetailsPage from "./pages/VolunteerEventDetailsPage";
import OrganizerPublicPage from "./pages/OrganizerPublicPage";
import VolunteerPublicPage from "./pages/VolunteerPublicPage";
import EventAttendancePage from './pages/EventAttendancePage';
import OrganizationPublicPage from "./pages/OrganizationPublicPage";
import VolunteerMyEvents from "./pages/VolunteerMyEvents";
import ResourceCenter from "./pages/ResourceCenter";
import CreateEventPage from "./pages/CreateEventPage";
import RecurringSeriesPage from "./pages/RecurringSeriesPage";
import SeriesDetailsPage from "./pages/SeriesDetailsPage";
import SponsorshipDirectoryPage from "./pages/SponsorshipDirectoryPage";
import SponsorshipApplicationPage from "./pages/SponsorshipApplicationPage";
import SponsorshipApplicationsReviewPage from "./pages/SponsorshipApplicationsReviewPage";
import OrganizationSettingsPage from "./pages/OrganizationSettingsPage";
import MyApplicationsPage from "./pages/MyApplicationsPage";
import EditApplicationPage from "./pages/EditApplicationPage";
import SponsorProfilePage from "./pages/SponsorProfilePage";
import PaymentStatusPage from "./pages/PaymentStatusPage";
import IntentPaymentPage from "./pages/IntentPaymentPage";
import ReceiptPage from "./pages/ReceiptPage";
import React, { useState, useEffect } from "react";
import axiosInstance from "./api/axiosInstance";
import ChatBubble from "./components/aiChatbot/ChatBubble";
import ChatWindow from "./components/aiChatbot/ChatWindow";
import FAQSection from "./pages/FAQSection";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import CookiePolicyPage from "./pages/CookiePolicyPage";

import NotFoundPage from "./pages/NotFoundPage";
import { ChatProvider, useChatContext } from "./context/ChatContext";


const GENERAL_QUESTIONS = [
  "What is your pricing?",
  "How much does it cost?",
  "Tell me about your price plans.",
  "Hello",
  "Hi",
  "Hey",
  "How do I reset my password?",
  "I forgot my password",
  "How can I contact support?",
  "How do I get support?",
  "What features do you have?",
  "What can you do?",
  "How do I register?",
  "How do I sign up?",
  "How do I create an account?",
  "How do I login?",
  "How do I log in?",
  "How do I sign in?",
  "What events are coming up?",
  "Show me upcoming events",
  "How do I volunteer?",
  "How can I join as a volunteer?",
  "How can my organization partner?",
  "How do I register my organization?",
  "Where is the FAQ?",
  "Frequently asked questions",
  "Where are you based?",
  "What is your location?",
  "How can I donate?",
  "How can I contribute?",
];

const PERSONAL_QUESTIONS = [
  "When is my next event?",
  "How many events have I completed?",
  "Which events am I registered for?",
  "Show me my upcoming events",
  "What events have I attended?",
  "My next volunteering event",
  "How many events did I complete?",
  "My event history",
  "Upcoming events I'm registered for",
  "Show me my certificates",
  "Did I get a certificate for my last event?",
  "When did I join this NGO?",
  "What are my upcoming events this week?",
  "Events in Mumbai",
  "Show me the details of my last event",
  "My registered events",
  "Events near Delhi",
  "My certificates",
  "Last event details",
  "Member since",
];

function App() {
  return (
    <ChatProvider>
      <AppContent />
    </ChatProvider>
  );
}

function AppContent() {
  const [messages, setMessages] = useState(() => {
    // Load messages from localStorage on component mount
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user._id;
    
    if (userId) {
      const savedMessages = localStorage.getItem(`chatMessages_${userId}`);
      if (savedMessages) {
        try {
          return JSON.parse(savedMessages);
        } catch (error) {
          console.error('Error parsing saved messages:', error);
        }
      }
    }
    return [
      { sender: "bot", text: "Hi! How can I help you today?" },
    ];
  });
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false); // Add this flag
  const { rootChatOpen, openRootChat, closeRootChat } = useChatContext();

  // Check authentication status and user ID on component mount
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user._id;
      
      setIsAuthenticated(!!token);
      setCurrentUserId(userId);
      setIsAuthChecked(true); // Mark auth check as complete
    };

    checkAuth();

    // Listen for custom events from login/logout
    const handleUserDataUpdate = (event) => {
      if (event.detail?.user) {
        setIsAuthenticated(true);
        setCurrentUserId(event.detail.user._id);
      }
    };

    const handleLogout = () => {
      setIsAuthenticated(false);
      setCurrentUserId(null);
    };

    // Listen for route changes to re-check auth
    const handleRouteChange = () => {
      checkAuth();
    };

    window.addEventListener('userDataUpdated', handleUserDataUpdate);
    window.addEventListener('userLoggedOut', handleLogout);
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdate);
      window.removeEventListener('userLoggedOut', handleLogout);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // Save messages to localStorage whenever they change (user-specific)
  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem(`chatMessages_${currentUserId}`, JSON.stringify(messages));
    }
  }, [messages, currentUserId]);

  // Clear chat history when user logs out or switches accounts
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user._id;
      
      // If user changed or logged out
      if (userId !== currentUserId) {
        setCurrentUserId(userId);
        setIsAuthenticated(!!token);
        
        // Load new user's chat history or reset to default
        if (userId && token) {
          const savedMessages = localStorage.getItem(`chatMessages_${userId}`);
          if (savedMessages) {
            try {
              setMessages(JSON.parse(savedMessages));
            } catch (error) {
              console.error('Error parsing saved messages:', error);
              setMessages([{ sender: "bot", text: "Hi! How can I help you today?" }]);
            }
          } else {
            setMessages([{ sender: "bot", text: "Hi! How can I help you today?" }]);
          }
        } else {
          // User logged out - clear messages
          setMessages([{ sender: "bot", text: "Hi! How can I help you today?" }]);
        }
      }
    };

    // Listen for storage changes (when user logs in/out in another tab)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check on focus (when user returns to this tab)
    window.addEventListener('focus', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, [currentUserId]);

  const handleSendMessage = async (msg) => {
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: msg },
    ]);
    setLoading(true);
    try {
      const res = await axiosInstance.post("/api/chat", { message: msg });
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: res.data.response },
      ]);
    } catch (err) {
      let errorMessage = "Sorry, something went wrong. Please try again.";
      
      if (err.response?.status === 401) {
        errorMessage = "Please log in to ask personal questions. You can login here: https://envibuddies.me/login";
        setIsAuthenticated(false);
      } else if (err.response?.status === 500) {
        errorMessage = "Sorry, I'm having trouble right now. Please try again later.";
      }
      
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: errorMessage },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReply = (suggestion) => {
    if (!loading) {
      handleSendMessage(suggestion);
    }
  };

  // Combine questions based on authentication status
  const suggestedQuestions = isAuthenticated 
    ? [...PERSONAL_QUESTIONS, ...GENERAL_QUESTIONS]
    : GENERAL_QUESTIONS;

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/recover-account" element={<RecoverAccountPage />} />
          <Route path="/recovery-confirmation" element={<RecoveryConfirmationPage />} />
          <Route path="/faqs" element={<FAQSection />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
          <Route path="/cookie-policy" element={<CookiePolicyPage />} />
          <Route path="/test-404" element={<NotFoundPage />} />

          {/* Protected Routes */}
          <Route
            path="/volunteer/dashboard"
            element={
              <PrivateRoute>
                <VolunteerDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/organizer/dashboard"
            element={
              <PrivateRoute>
                <OrganizerDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/register-organization"
            element={
              <PrivateRoute>
                <RegisterOrganization />
              </PrivateRoute>
            }
          />
          <Route
            path="/events"
            element={
              <PrivateRoute>
                <VolunteerEvents />
              </PrivateRoute>
            }
          />
          <Route
            path="/organization/:id"
            element={
              <PrivateRoute>
                <OrganizationPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/join-organization"
            element={
              <PrivateRoute>
                <JoinOrganizationPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/your-organizations"
            element={
              <PrivateRoute>
                <YourOrganizations />
              </PrivateRoute>
            }
          />
          <Route
            path="/my-requests"
            element={
              <PrivateRoute>
                <MyRequests />
              </PrivateRoute>
            }
          />
          <Route
            path="/my-events"
            element={
              <PrivateRoute>
                <MyEvents />
              </PrivateRoute>
            }
          />
          <Route
            path="/volunteer/my-events"
            element={
              <PrivateRoute>
                <VolunteerMyEvents />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/sponsor-profile"
            element={
              <PrivateRoute>
                <SponsorProfilePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/events/:id"
            element={
              <PrivateRoute>
                <EventDetailsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/events/:id/edit"
            element={
              <PrivateRoute>
                <EditEventPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/volunteer/events/:id"
            element={
              <PrivateRoute>
                <VolunteerEventDetailsPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/volunteer/organization/:id"
            element={
              <PrivateRoute>
                <VolunteerOrganizationPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/organizer/:id"
            element={
              <PrivateRoute>
                <OrganizerPublicPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/volunteer/:id"
            element={
              <PrivateRoute>
                <VolunteerPublicPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/events/:eventId/attendance"
            element={
              <PrivateRoute>
                <EventAttendancePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/organizations/:id"
            element={
              <PrivateRoute>
                <OrganizationPublicPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/resources"
            element={
              <PrivateRoute>
                <ResourceCenter />
              </PrivateRoute>
            }
          />
          <Route
            path="/create-event"
            element={
              <PrivateRoute>
                <CreateEventPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/recurring-series"
            element={
              <PrivateRoute>
                <RecurringSeriesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/recurring-series/:seriesId"
            element={
              <PrivateRoute>
                <SeriesDetailsPage />
              </PrivateRoute>
            }
          />
          
          {/* Sponsorship Routes */}
          <Route
            path="/sponsors"
            element={
              <PrivateRoute>
                <SponsorshipDirectoryPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/sponsor/:userId"
            element={
              <PrivateRoute>
                <SponsorshipDirectoryPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/organization/:organizationId/sponsor"
            element={
              <PrivateRoute>
                <SponsorshipApplicationPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/organization/:organizationId/event/:eventId/sponsor"
            element={
              <PrivateRoute>
                <SponsorshipApplicationPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/organization/:organizationId/settings"
            element={
              <PrivateRoute>
                <OrganizationSettingsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/organization/:organizationId/applications"
            element={
              <PrivateRoute>
                <SponsorshipApplicationsReviewPage />
              </PrivateRoute>
            }
          />
          
          {/* Application Management Routes */}
          <Route
            path="/my-applications"
            element={
              <PrivateRoute>
                <MyApplicationsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/applications/:applicationId/edit"
            element={
              <PrivateRoute>
                <EditApplicationPage />
              </PrivateRoute>
            }
          />
          
          {/* Payment Routes */}
          <Route
            path="/payment-status/:sponsorshipId"
            element={
              <PrivateRoute>
                <PaymentStatusPage />
              </PrivateRoute>
            }
          />
          
          <Route
            path="/intent-payment/:intentId"
            element={
              <PrivateRoute>
                <IntentPaymentPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/receipt/:receiptId"
            element={
              <PrivateRoute>
                <ReceiptPage />
              </PrivateRoute>
            }
          />
          
          {/* 404 Page - Must be last */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
      <ChatBubble onClick={openRootChat} />
      <ChatWindow
        isOpen={rootChatOpen}
        onClose={closeRootChat}
        messages={messages}
        onSendMessage={handleSendMessage}
        loading={loading}
        suggestions={suggestedQuestions}
        onQuickReply={handleQuickReply}
      />

    </>
  );
}

export default App;
