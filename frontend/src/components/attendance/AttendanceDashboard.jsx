import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axiosInstance from '../../api/axiosInstance';
import { 
  FaUsers, 
  FaUserCheck, 
  FaUserTimes, 
  FaUserClock, 
  FaUserPlus, 
  FaUserMinus,
  FaChartLine,
  FaClock,
  FaCalendarCheck,
  FaCalendarTimes,
  FaEye,
  FaEyeSlash,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaTrophy,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaChartBar,
  FaUserFriends,
  FaClipboardList
} from 'react-icons/fa';

const AttendanceDashboard = ({ eventId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch initial stats
  const fetchStats = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setIsUpdating(true);
      }
      const response = await axiosInstance.get(`/api/registrations/event/${eventId}/stats`);
      if (response.data.success) {
        setStats(response.data.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching attendance stats:', err);
      if (showLoading) {
        setError('Failed to load attendance statistics');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      } else {
        setIsUpdating(false);
      }
    }
  };

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      newSocket.emit('joinAttendanceRoom', eventId);
    });

    newSocket.on('attendanceUpdated', (data) => {
      // Refresh stats when attendance is updated (silent update)
      fetchStats(false);
    });

    setSocket(newSocket);

    // Initial fetch
    fetchStats();

    // Cleanup
    return () => {
      if (newSocket) {
        newSocket.emit('leaveAttendanceRoom', eventId);
        newSocket.disconnect();
      }
    };
  }, [eventId]);

  // Auto-refresh every 2 minutes (less frequent, silent updates)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats(false); // Silent background refresh
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [eventId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const formatTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getEventStatusColor = () => {
    if (stats.event.isEnded) return 'text-red-600 bg-red-50 border-red-200';
    if (stats.event.isLive) return 'text-green-600 bg-green-50 border-green-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  const getEventStatusText = () => {
    if (stats.event.isEnded) return 'Event Ended';
    if (stats.event.isLive) return 'Event Live';
    return 'Event Not Started';
  };

  const getAttendanceRateColor = (rate) => {
    if (rate >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (rate >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-4">
      {/* Box 1: Event Overview Header */}
      <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">Event Overview</h2>
            <p className="text-sm text-gray-600 truncate max-w-[200px]">{stats.event.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded-full text-xs font-semibold border ${getEventStatusColor()}`}>
              {getEventStatusText()}
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
              title={showDetails ? "Hide details" : "Show details"}
            >
              {showDetails ? <FaEye size={14} /> : <FaEyeSlash size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Box 2: Overall Statistics */}
      <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <FaChartBar className="text-blue-500" />
          Overall Statistics
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600">Total</p>
                <p className="text-xl font-bold text-blue-800">{stats.overall.totalParticipants}</p>
              </div>
              <FaUsers className="text-blue-500 text-lg" />
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600">Present</p>
                <p className="text-xl font-bold text-green-800">{stats.overall.totalPresent}</p>
              </div>
              <FaUserCheck className="text-green-500 text-lg" />
            </div>
          </div>

          <div className={`border rounded-lg p-3 ${getAttendanceRateColor(stats.overall.attendanceRate)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">Rate</p>
                <p className="text-xl font-bold">{stats.overall.attendanceRate}%</p>
              </div>
              <FaChartLine className="text-lg" />
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-orange-600">Volunteers</p>
                <p className="text-xl font-bold text-orange-800">{stats.volunteers.total}</p>
              </div>
              <FaUsers className="text-orange-500 text-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Box 3: Volunteer Statistics */}
      <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <FaUserFriends className="text-emerald-500" />
          Volunteer Statistics
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-center">
              <div className="text-green-600 font-bold text-lg">{stats.volunteers.checkedIn}</div>
              <div className="text-xs text-green-600">Checked In</div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-center">
              <div className="text-blue-600 font-bold text-lg">{stats.volunteers.checkedIn}</div>
              <div className="text-xs text-blue-600">Present</div>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="text-center">
              <div className="text-yellow-600 font-bold text-lg">{stats.volunteers.notArrived}</div>
              <div className="text-xs text-yellow-600">Pending</div>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-center">
              <div className="text-red-600 font-bold text-lg">{stats.volunteers.checkedOut}</div>
              <div className="text-xs text-red-600">Checked Out</div>
            </div>
          </div>
        </div>
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Efficiency:</span>
            <span className={`font-semibold ${
              stats.volunteers.total > 0 ? 
              (stats.volunteers.checkedIn / stats.volunteers.total * 100) >= 80 ? 'text-green-600' : 'text-yellow-600' : 'text-gray-400'
            }`}>
              {stats.volunteers.total > 0 ? Math.round((stats.volunteers.checkedIn / stats.volunteers.total) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Box 4: Organizer Statistics */}
      <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <FaCalendarCheck className="text-purple-500" />
          Organizer Statistics
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="text-center">
              <div className="text-purple-600 font-bold text-lg">{stats.organizers.total}</div>
              <div className="text-xs text-purple-600">Total</div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-center">
              <div className="text-green-600 font-bold text-lg">{stats.organizers.present}</div>
              <div className="text-xs text-green-600">Present</div>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="text-center">
              <div className="text-yellow-600 font-bold text-lg">{stats.organizers.total - stats.organizers.present}</div>
              <div className="text-xs text-yellow-600">Pending</div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-center">
              <div className="text-blue-600 font-bold text-lg">
                {stats.organizers.total > 0 ? Math.round((stats.organizers.present / stats.organizers.total) * 100) : 0}%
              </div>
              <div className="text-xs text-blue-600">Rate</div>
            </div>
          </div>
        </div>
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Coverage:</span>
            <span className={`font-semibold ${
              stats.organizers.total > 0 ? 
              (stats.organizers.present / stats.organizers.total * 100) >= 80 ? 'text-green-600' : 'text-yellow-600' : 'text-gray-400'
            }`}>
              {stats.organizers.total > 0 ? Math.round((stats.organizers.present / stats.organizers.total) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Box 5: Recent Activity */}
      <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <FaClock className="text-indigo-500" />
          Recent Activity
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <FaUserPlus className="text-green-500" />
              <div>
                <div className="text-green-600 font-bold">{stats.recentActivity.checkIns}</div>
                <div className="text-xs text-green-600">Check-ins</div>
              </div>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <FaUserMinus className="text-red-500" />
              <div>
                <div className="text-red-600 font-bold">{stats.recentActivity.checkOuts}</div>
                <div className="text-xs text-red-600">Check-outs</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Details Section */}
      {showDetails && (
        <div className="space-y-3">
          {/* Event Schedule Box */}
          <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FaCalendarAlt className="text-gray-500" />
              Event Schedule
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <FaClock className="text-blue-500" />
                <span className="text-gray-600">
                  Start: {formatDate(stats.event.startDateTime)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FaTimesCircle className="text-red-500" />
                <span className="text-gray-600">
                  End: {formatDate(stats.event.endDateTime)}
                </span>
              </div>
            </div>
          </div>

          {/* System Status Box */}
          <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FaCheckCircle className="text-green-500" />
              System Status
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-gray-600">
                  {isUpdating ? 'Updating...' : 'Live updates enabled'}
                </span>
              </div>
              <div className="text-center text-gray-400">
                Last updated: {lastUpdated ? formatTime(lastUpdated) : '—'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceDashboard; 