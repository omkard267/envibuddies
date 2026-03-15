import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import RecurringSeriesCard from '../components/recurring/RecurringSeriesCard';
import { getUserRecurringSeries } from '../api/recurringEvents';
import { 
  PlusIcon, 
  CalendarIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export default function RecurringSeriesPage() {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSeries();
    // Trigger animations
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const fetchSeries = async () => {
    try {
      setLoading(true);
      const response = await getUserRecurringSeries();
      if (response.success) {
        setSeries(response.data);
      } else {
        setError('Failed to fetch recurring series');
      }
    } catch (err) {
      console.error('Error fetching series:', err);
      setError('Failed to load recurring series');
    } finally {
      setLoading(false);
    }
  };

  const handleSeriesUpdate = () => {
    fetchSeries(); // Refresh the list
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'paused': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircleIcon className="w-4 h-4" />;
      case 'paused': return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'completed': return <InformationCircleIcon className="w-4 h-4" />;
      case 'cancelled': return <XCircleIcon className="w-4 h-4" />;
      default: return <ClockIcon className="w-4 h-4" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Active';
      case 'paused': return 'Paused';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
        <Navbar />
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <Navbar />
      
      <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className={`mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent">
              Recurring Event Series
            </h1>
            <p className="text-slate-600 text-lg mt-2">
              Manage your recurring event series and track their progress
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                <ChartBarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total Series</p>
                <p className="text-2xl font-bold text-slate-900">{series.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl">
                <CheckCircleIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Active</p>
                <p className="text-2xl font-bold text-slate-900">{series.filter(s => s.status === 'active').length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl">
                <ExclamationTriangleIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Paused</p>
                <p className="text-2xl font-bold text-slate-900">{series.filter(s => s.status === 'paused').length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                <InformationCircleIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Completed</p>
                <p className="text-2xl font-bold text-slate-900">{series.filter(s => s.status === 'completed').length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className={`mb-8 p-4 bg-red-50 border border-red-200 rounded-xl transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex items-center gap-3">
              <XCircleIcon className="w-5 h-5 text-red-600" />
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Content Section */}
        <div className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {series.length === 0 ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <CalendarIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  No recurring series found
                </h3>
                <p className="text-slate-600 mb-6">
                  Create your first recurring event series to get started
                </p>
                <button
                  onClick={() => navigate('/create-event')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  <PlusIcon className="w-5 h-5" />
                  Create First Series
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {series.map((seriesItem, index) => (
                <div
                  key={seriesItem._id}
                  className={`transition-all duration-500 delay-${index * 100}`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <RecurringSeriesCard
                    series={seriesItem}
                    onUpdate={handleSeriesUpdate}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Series Statistics Summary */}
        {series.length > 0 && (
          <div className={`mt-12 p-6 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Series Overview</h3>
            <div className="flex flex-wrap gap-3">
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor('active')}`}>
                {getStatusIcon('active')}
                {series.filter(s => s.status === 'active').length} Active
              </span>
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor('paused')}`}>
                {getStatusIcon('paused')}
                {series.filter(s => s.status === 'paused').length} Paused
              </span>
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor('completed')}`}>
                {getStatusIcon('completed')}
                {series.filter(s => s.status === 'completed').length} Completed
              </span>
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor('cancelled')}`}>
                {getStatusIcon('cancelled')}
                {series.filter(s => s.status === 'cancelled').length} Cancelled
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 