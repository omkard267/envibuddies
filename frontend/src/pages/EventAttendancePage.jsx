import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFullOrganizerTeam, updateOrganizerAttendance } from "../api/event";
import { getVolunteersForEvent, updateVolunteerAttendance, downloadAttendanceReport } from "../api/registration";
import Navbar from "../components/layout/Navbar";
import AttendanceQrScanner from "../components/attendance/AttendanceQrScanner";
import AttendanceDashboard from "../components/attendance/AttendanceDashboard";
import axiosInstance from "../api/axiosInstance"; // <-- Use axiosInstance
import { useRef } from 'react';
import { FaPencilAlt } from 'react-icons/fa';
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from "../utils/avatarUtils";
import { 
  getSafeUserData, 
  getDisplayName, 
  getUsernameDisplay, 
  getEmailDisplay, 
  getPhoneDisplay,
  canNavigateToUser,
  getSafeUserId,
  getSafeUserName,
  // Attendance-specific utilities
  getAttendanceUserData,
  getAttendanceDisplayName,
  getAttendanceUsernameDisplay,
  getAttendanceEmailDisplay,
  getAttendancePhoneDisplay,
  getAttendanceProfileImageUrl,
  getAttendanceAvatarInitial
} from "../utils/safeUserUtils";
import { UsersIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { showAlert } from '../utils/notifications';

export default function EventAttendancePage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [organizers, setOrganizers] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const currentUser = JSON.parse(localStorage.getItem("user"));
  // Legacy support for old image URLs - will be removed after Cloudinary migration
  const [showScanner, setShowScanner] = useState(false);
  const [volunteerEdit, setVolunteerEdit] = useState({}); // { [registrationId]: { type: 'in'|'out', value: '' } }
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [activeTab, setActiveTab] = useState('volunteer'); // 'volunteer' or 'organizer'

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const [orgs, vols] = await Promise.all([
          getFullOrganizerTeam(eventId),
          getVolunteersForEvent(eventId),
        ]);
        setOrganizers(orgs);
        setVolunteers(vols);

      } catch (err) {
        setError("Failed to load attendance data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  // Access control: only organizers
  if (!currentUser || currentUser.role !== "organizer") {
    return <div className="min-h-screen flex items-center justify-center text-red-600 font-bold">Access denied</div>;
  }

  const handleOrganizerAttendance = async (organizerId, checked) => {
    try {
      const response = await updateOrganizerAttendance(eventId, organizerId, checked);
      
      setOrganizers((prev) => {
        const updated = prev.map((obj) =>
          obj.user._id === organizerId ? { ...obj, hasAttended: checked } : obj
      );
        return updated;
      });
    } catch (err) {
      showAlert.error("Failed to update organizer attendance");
    }
  };

  const handleVolunteerAttendance = async (registrationId, checked) => {
    try {
      await updateVolunteerAttendance(registrationId, checked);
      setVolunteers((prev) =>
        prev.map((v) =>
          v.registrationId === registrationId ? { ...v, hasAttended: checked } : v
        )
      );
    } catch (err) {
      showAlert.error("Failed to update volunteer attendance");
    }
  };

  const handleScan = async (scannedText) => {
    try {
      const data = JSON.parse(scannedText);

      if (data.registrationId) {
        // Entry QR logic
        const registrationId = data.registrationId;
        if (!registrationId) throw new Error("Invalid QR code");
        const response = await axiosInstance.patch(`/api/registrations/${registrationId}/attendance`, { hasAttended: true });
        showAlert.success("Attendance marked!");
        // Update inTime from response
        const updated = response.data.registration;
        setVolunteers((prev) => prev.map((v) => v.registrationId === registrationId ? { ...v, hasAttended: true, inTime: updated.inTime } : v));
      } else if (data.exitQrToken) {
        // Exit QR logic
        const exitQrToken = data.exitQrToken;
        if (!exitQrToken) throw new Error("Invalid QR code");
        const response = await axiosInstance.post(`/api/registrations/exit/${exitQrToken}`);
        showAlert.success("Exit marked!");
        // Update outTime from response
        const { outTime } = response.data;
        setVolunteers((prev) => prev.map((v) => {
          // Try to match by exitQrToken, fallback to registrationId if not present
          if (v.exitQrToken === exitQrToken) {
            return { ...v, outTime };
          }
          // Try to match by registrationId if possible (from QR data)
          if (data.registrationId && v.registrationId === data.registrationId) {
            return { ...v, outTime };
          }
          return v;
        }));
      } else {
        throw new Error("Invalid QR code");
      }
    } catch (err) {
      showAlert.error("Invalid QR code or failed to mark attendance.");
    }
    setShowScanner(false);
  };

  // Manual save for inTime/outTime
  const handleVolunteerTimeSave = async (registrationId, type) => {
    const value = volunteerEdit[registrationId]?.value;
    if (!value) return;
    const endpoint = type === 'in'
      ? `/api/registrations/${registrationId}/in-time`
      : `/api/registrations/${registrationId}/out-time`;
    await axiosInstance.patch(endpoint, {
      [type === 'in' ? 'inTime' : 'outTime']: value
    });
    setVolunteers((prev) => prev.map((v) =>
      v.registrationId === registrationId
        ? { ...v, [type === 'in' ? 'inTime' : 'outTime']: value }
        : v
    ));
    setVolunteerEdit((prev) => ({ ...prev, [registrationId]: undefined }));
  };

  // Helper for formatting date/time
  function formatDateTime(dt) {
    if (!dt) return '—';
    const date = new Date(dt);
    return date.toLocaleString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  // Helper: is current user the event creator?
  const isEventCreator = eventId && organizers.length > 0 && organizers[0].user && currentUser && organizers[0].user._id === currentUser._id;

  // Handle report download
  const handleDownloadReport = async (format = 'pdf') => {
    try {
      setDownloadingReport(true);
      const blob = await downloadAttendanceReport(eventId, format);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance_report_${format}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showAlert.success(`Attendance report downloaded successfully as ${format.toUpperCase()}!`);
    } catch (error) {
      console.error('Error downloading report:', error);
      showAlert.error('Failed to download attendance report');
    } finally {
      setDownloadingReport(false);
    }
  };

  // Debug: Log volunteers before rendering
  

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-24 px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
          <div className="text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-2">Event Attendance</h1>
            <div className="w-16 sm:w-24 h-1 bg-gradient-to-r from-blue-500 to-emerald-500 mx-auto lg:mx-0 rounded-full"></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Download Report Dropdown */}
            <div className="relative w-full sm:w-auto">
              <button
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-transform transform hover:scale-105 disabled:opacity-50 text-sm sm:text-base"
                onClick={() => document.getElementById('reportDropdown').classList.toggle('hidden')}
                disabled={downloadingReport}
              >
                {downloadingReport ? 'Downloading...' : '📊 Download Attendance'}
              </button>
              <div id="reportDropdown" className="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50">
                <div className="py-1">
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      handleDownloadReport('pdf');
                      document.getElementById('reportDropdown').classList.add('hidden');
                    }}
                  >
                    📄 Download as PDF
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      handleDownloadReport('excel');
                      document.getElementById('reportDropdown').classList.add('hidden');
                    }}
                  >
                    📊 Download as Excel
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      handleDownloadReport('csv');
                      document.getElementById('reportDropdown').classList.add('hidden');
                    }}
                  >
                    📋 Download as CSV
                  </button>
                </div>
              </div>
            </div>
            <button
              className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition-transform transform hover:scale-105 text-sm sm:text-base"
              onClick={() => setShowScanner(true)}
            >
              Scan Volunteer QR
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-1 xl:grid-cols-5 gap-4 lg:gap-6 xl:gap-8 max-w-none xl:h-[calc(100vh-8rem)]">
          {/* Left Column - Compact Event Overview */}
          <div className="xl:col-span-2 space-y-4 xl:overflow-y-auto xl:max-h-screen pr-2 pb-8 custom-scrollbar">
        <AttendanceDashboard eventId={eventId} />
          </div>

          {/* Right Column - Attendance Tables with Tabs */}
          <div className="xl:col-span-3 xl:overflow-y-auto xl:max-h-screen custom-scrollbar">
            <div className="bg-white rounded-lg shadow-lg p-4">
              {/* Tab Navigation */}
              <div className="flex justify-center mb-6">
                <div className="flex flex-col sm:flex-row bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
                  <button
                    onClick={() => setActiveTab('volunteer')}
                    className={`px-4 sm:px-6 py-2 text-sm font-semibold rounded-md transition-all duration-300 ${
                      activeTab === 'volunteer' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Volunteer Attendance
                  </button>
            {isEventCreator && (
                    <button
                      onClick={() => setActiveTab('organizer')}
                      className={`px-4 sm:px-6 py-2 text-sm font-semibold rounded-md transition-all duration-300 ${
                        activeTab === 'organizer' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Organizer Attendance
                    </button>
                  )}
                </div>
              </div>

              {/* Tab Content with Slideshow Effect */}
              <div className="relative overflow-x-hidden">
                <div
                  className="flex w-[200%] transition-transform duration-500 ease-in-out"
                  style={{ 
                    transform: activeTab === 'volunteer' ? 'translateX(0)' : 'translateX(-50%)'
                  }}
                >
                  {/* Volunteer Tab */}
                  <div className="w-1/2 p-2">
                    {loading ? (
                      <div className="text-center py-6">Loading volunteers...</div>
                    ) : error ? (
                      <div className="text-red-600 text-center py-6">{error}</div>
                    ) : (
                                             <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-emerald-200 p-4">
                         <div className="flex flex-col sm:flex-row items-start gap-3 mb-6 p-3 sm:p-4 border border-emerald-100 rounded-xl bg-emerald-50/50">
                           <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
                             <UsersIcon className="w-7 h-7 text-white" />
                           </div>
                           <div className="flex-1 min-w-0 text-center sm:text-left">
                             <h2 className="text-lg sm:text-xl font-bold text-emerald-800 mb-2">Volunteers</h2>
                             <p className="text-gray-600 text-sm mb-3">Event participants and helpers</p>
                             <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                               <p className="text-emerald-800 text-sm font-medium">
                                 ⚠️ <strong>Important:</strong> Volunteer attendance cannot be changed once In-Time has been set. 
                                 Attendance is automatically marked when a volunteer scans their QR code and In-Time is recorded. 
                                 This action cannot be undone.
                               </p>
                </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white/50 backdrop-blur-sm rounded-xl overflow-hidden">
                  <thead className="bg-gradient-to-r from-emerald-50 to-emerald-100">
                    <tr>
                      <th className="p-2 sm:p-3 text-left font-semibold text-emerald-800 w-12 sm:w-16">Photo</th>
                      <th className="p-2 sm:p-3 text-left font-semibold text-emerald-800 w-24 sm:w-32">Name</th>
                      <th className="p-2 sm:p-3 text-left font-semibold text-emerald-800 w-28 sm:w-40 hidden sm:table-cell">Email</th>
                      <th className="p-2 sm:p-3 text-left font-semibold text-emerald-800 w-20 sm:w-32 hidden sm:table-cell">Phone</th>
                      <th className="p-2 sm:p-3 text-center font-semibold text-emerald-800 w-16 sm:w-20">Attended</th>
                      <th className="p-2 sm:p-3 text-center font-semibold text-emerald-800 w-20 sm:w-24">Status</th>
                      <th className="p-2 sm:p-3 text-center font-semibold text-emerald-800 w-32 sm:w-48 lg:w-64">In-Time</th>
                      <th className="p-2 sm:p-3 text-center font-semibold text-emerald-800 w-32 sm:w-48 lg:w-64">Out-Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {volunteers.map((v) => {
                      const editState = volunteerEdit[v.registrationId] || {};
                      // Use attendance-specific utilities for attendance records (from OMKAR DHUMAL1 branch)
                      const attendanceVolunteer = getAttendanceUserData(v);
                      const canNavigate = canNavigateToUser(v);
                      
                      return (
                        <tr key={v._id} className={`hover:bg-gray-50/50 transition-all duration-300 ${attendanceVolunteer.isDeleted ? 'opacity-60' : ''}`}>
                          <td className="p-2 sm:p-3 w-12 sm:w-16">
                            {getAttendanceProfileImageUrl(attendanceVolunteer) ? (
                              <img
                                src={getAttendanceProfileImageUrl(attendanceVolunteer)}
                                alt={getAttendanceDisplayName(attendanceVolunteer)}
                                className="w-8 h-8 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-emerald-200"
                              />
                            ) : (
                              <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 shadow-sm ${getRoleColors(attendanceVolunteer.role)}`}>
                                <span className="text-xs sm:text-sm font-bold text-current">{getAttendanceAvatarInitial(attendanceVolunteer)}</span>
                              </div>
                            )}
                          </td>
                          <td className={`p-2 sm:p-3 font-medium w-24 sm:w-32 ${attendanceVolunteer.isDeleted ? 'text-gray-500' : 'text-gray-800'} text-sm sm:text-base`}>
                            {getAttendanceDisplayName(attendanceVolunteer)}
                          </td>
                          <td className={`p-2 sm:p-3 w-28 sm:w-40 ${attendanceVolunteer.isDeleted ? 'text-gray-500' : 'text-gray-600'} hidden sm:table-cell text-sm`}>
                            {getAttendanceEmailDisplay(attendanceVolunteer)}
                          </td>
                          <td className={`p-2 sm:p-3 w-20 sm:w-32 ${attendanceVolunteer.isDeleted ? 'text-gray-500' : 'text-gray-600'} hidden sm:table-cell text-sm`}>
                            {getAttendancePhoneDisplay(attendanceVolunteer)}
                          </td>
                          <td className="p-2 sm:p-3 text-center w-16 sm:w-20">
                            <input
                              type="checkbox"
                              checked={!!v.hasAttended}
                              onChange={e => handleVolunteerAttendance(v.registrationId, e.target.checked)}
                              disabled={attendanceVolunteer.isDeleted || !!v.inTime}
                              className="w-5 h-5 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2 disabled:opacity-50"
                            />
                          </td>
                          <td className="p-2 sm:p-3 text-center w-20 sm:w-24">
                            {v.hasAttended ? (
                              <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs sm:text-sm font-semibold">
                                <CheckCircleIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Attended</span>
                                <span className="sm:hidden">✓</span>
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          {/* In-Time column */}
                          <td className="p-2 sm:p-3 align-top w-32 sm:w-48 lg:w-64">
                            <div className="flex items-center gap-2">
                              <span className={`${attendanceVolunteer.isDeleted ? 'text-gray-500' : 'text-gray-700'}`}>
                                {formatDateTime(v.inTime)}
                              </span>
                              {!attendanceVolunteer.isDeleted && (
                                <button
                                  className="p-1 text-gray-500 hover:text-blue-600 focus:outline-none transition-all duration-300"
                                  title="Edit In-Time"
                                  onClick={() => setVolunteerEdit(prev => ({ ...prev, [v.registrationId]: { type: 'in', value: v.inTime ? new Date(v.inTime).toISOString().slice(0,16) : '' } }))}
                                >
                                  <FaPencilAlt size={14} />
                                </button>
                              )}
                            </div>
                            {editState.type === 'in' && !attendanceVolunteer.isDeleted && (
                              <div className="mt-3 space-y-2">
                                <input
                                  type="datetime-local"
                                  value={editState.value}
                                  onChange={e => setVolunteerEdit(prev => ({ ...prev, [v.registrationId]: { type: 'in', value: e.target.value } }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleVolunteerTimeSave(v.registrationId, 'in')} 
                                    className="flex-1 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all duration-300"
                                  >
                                    Save
                                  </button>
                                  <button 
                                    onClick={() => setVolunteerEdit(prev => ({ ...prev, [v.registrationId]: undefined }))} 
                                    className="flex-1 bg-gray-300 text-gray-800 px-3 py-1 rounded-lg text-sm font-semibold hover:bg-gray-400 transition-all duration-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                          {/* Out-Time column */}
                          <td className="p-2 sm:p-3 align-top w-32 sm:w-48 lg:w-64">
                            <div className="flex items-center gap-2">
                              <span className={`${attendanceVolunteer.isDeleted ? 'text-gray-500' : 'text-gray-700'}`}>
                                {formatDateTime(v.outTime)}
                              </span>
                              {!attendanceVolunteer.isDeleted && (
                                <button
                                  className="p-1 text-gray-500 hover:text-blue-600 focus:outline-none transition-all duration-300"
                                  title="Edit Out-Time"
                                  onClick={() => setVolunteerEdit(prev => ({ ...prev, [v.registrationId]: { type: 'out', value: v.outTime ? new Date(v.outTime).toISOString().slice(0,16) : '' } }))}
                                >
                                  <FaPencilAlt size={14} />
                                </button>
                              )}
                            </div>
                            {editState.type === 'out' && !attendanceVolunteer.isDeleted && (
                              <div className="mt-3 space-y-2">
                                <input
                                  type="datetime-local"
                                  value={editState.value}
                                  onChange={e => setVolunteerEdit(prev => ({ ...prev, [v.registrationId]: { type: 'out', value: e.target.value } }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleVolunteerTimeSave(v.registrationId, 'out')} 
                                    className="flex-1 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all duration-300"
                                  >
                                    Save
                                  </button>
                                  <button 
                                    onClick={() => setVolunteerEdit(prev => ({ ...prev, [v.registrationId]: undefined }))} 
                                    className="flex-1 bg-gray-300 text-gray-800 px-3 py-1 rounded-lg text-sm font-semibold hover:bg-gray-400 transition-all duration-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
                    )}
                  </div>

                  {/* Organizer Tab - Always rendered but only visible for event creators */}
                  <div className="w-1/2 p-2">
                    {!isEventCreator ? (
                      <div className="text-center py-6 text-gray-500">
                        <p>Organizer attendance is only visible to event creators</p>
                      </div>
                    ) : loading ? (
                      <div className="text-center py-6">Loading organizers...</div>
                    ) : error ? (
                      <div className="text-red-600 text-center py-6">{error}</div>
                    ) : (
                                             <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-200 p-4">
                         <div className="flex flex-col sm:flex-row items-start gap-3 mb-6 p-3 sm:p-4 border border-blue-100 rounded-xl bg-blue-50/50">
                           <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
                             <UsersIcon className="w-7 h-7 text-white" />
                           </div>
                           <div className="flex-1 min-w-0 text-center sm:text-left">
                             <h2 className="text-lg sm:text-xl font-bold text-blue-800 mb-2">Organizers</h2>
                             <p className="text-gray-600 text-sm mb-3">Event management team</p>
                                                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                               <p className="text-blue-800 text-sm font-medium">
                                 ℹ️ <strong>Note:</strong> Organizer attendance can be manually updated using the checkboxes below. 
                                 This allows event creators to track team member participation.
                               </p>
                             </div>
                           </div>
                         </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full bg-white/50 backdrop-blur-sm rounded-xl overflow-hidden table-fixed">
                            <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
                              <tr>
                                <th className="p-2 sm:p-3 text-left font-semibold text-blue-800 w-12 sm:w-16">Photo</th>
                                <th className="p-2 sm:p-3 text-left font-semibold text-blue-800 w-24 sm:w-32">Name</th>
                                <th className="p-2 sm:p-3 text-left font-semibold text-blue-800 w-20 sm:w-32 hidden sm:table-cell">Phone</th>
                                <th className="p-2 sm:p-3 text-left font-semibold text-blue-800 w-28 sm:w-40 hidden sm:table-cell">Email</th>
                                <th className="p-2 sm:p-3 text-center font-semibold text-blue-800 w-16 sm:w-20">Attended</th>
                                <th className="p-2 sm:p-3 text-center font-semibold text-blue-800 w-20 sm:w-24">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {organizers.map((obj) => {
                                // Use attendance-specific utilities for attendance records
                                const attendanceUser = getAttendanceUserData(obj.user);
                                const canNavigate = canNavigateToUser(obj.user);
                                
                                return (
                                  <tr key={obj.user?._id || obj._id} className={`hover:bg-gray-50/50 transition-all duration-300 ${attendanceUser.isDeleted ? 'opacity-60' : ''}`}>
                                    <td className="p-2 sm:p-3 w-12 sm:w-16">
                                      {getAttendanceProfileImageUrl(attendanceUser) ? (
                                        <img
                                          src={getAttendanceProfileImageUrl(attendanceUser)}
                                          alt={getAttendanceDisplayName(attendanceUser)}
                                          className="w-8 h-8 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-blue-200"
                                        />
                                      ) : (
                                        <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 shadow-sm ${getRoleColors(attendanceUser.role)}`}>
                                          <span className="text-xs sm:text-sm font-bold text-current">{getAttendanceAvatarInitial(attendanceUser)}</span>
                                        </div>
                                      )}
                                    </td>
                                    <td className={`p-2 sm:p-3 font-medium w-24 sm:w-32 ${attendanceUser.isDeleted ? 'text-gray-500' : 'text-gray-800'} text-sm sm:text-base`}>
                                      {getAttendanceUsernameDisplay(attendanceUser)}
                                    </td>
                                    <td className={`p-2 sm:p-3 w-20 sm:w-32 ${attendanceUser.isDeleted ? 'text-gray-500' : 'text-gray-600'} hidden sm:table-cell text-sm`}>
                                      {getAttendancePhoneDisplay(attendanceUser)}
                                    </td>
                                    <td className={`p-2 sm:p-3 w-28 sm:w-40 ${attendanceUser.isDeleted ? 'text-gray-500' : 'text-gray-600'} hidden sm:table-cell text-sm`}>
                                      {getAttendanceEmailDisplay(attendanceUser)}
                                    </td>
                                    <td className="p-2 sm:p-3 text-center w-16 sm:w-20">
                                      <input
                                        type="checkbox"
                                        checked={!!obj.hasAttended}
                                        onChange={e => handleOrganizerAttendance(obj.user._id, e.target.checked)}
                                        disabled={attendanceUser.isDeleted}
                                        className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 bg-blue-100 border-blue-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
                                      />
                                    </td>
                                    <td className="p-2 sm:p-3 text-center w-20 sm:w-24">
                                      {obj.hasAttended ? (
                                        <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs sm:text-sm font-semibold">
                                          <CheckCircleIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                          <span className="hidden sm:inline">Attended</span>
                                          <span className="sm:hidden">✓</span>
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-4 sm:p-6 lg:p-8 relative w-full max-w-sm sm:max-w-md">
              <h3 className="text-lg sm:text-xl font-semibold text-center mb-4 text-gray-800">Scan QR Code</h3>
              <AttendanceQrScanner
                onScan={handleScan}
                onClose={() => setShowScanner(false)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
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
        
        @media (max-width: 640px) {
          .custom-scrollbar::-webkit-scrollbar {
            width: 3px;
          }
        }
      `}</style>
    </div>
  );
} 