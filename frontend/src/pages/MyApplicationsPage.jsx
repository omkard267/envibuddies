import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sponsorshipIntentAPI } from '../api';
import { getReceiptsBySponsorship } from '../api/receipt';
import Navbar from '../components/layout/Navbar';
import { formatDate } from '../utils/dateUtils';
import { 
  DocumentTextIcon,
  BuildingOfficeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  EyeIcon,
  PencilIcon,
  CreditCardIcon,
  ReceiptRefundIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { showAlert } from '../utils/notifications';

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [user, setUser] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Get user from localStorage
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchApplications();
  }, []);

  // Function to handle organization link click
  const handleOrganizationClick = (organizationId) => {
    if (!organizationId) return;
    
    if (user?.role === 'volunteer') {
      // For volunteers, navigate to organization public page
      navigate(`/organizations/${organizationId}`);
    } else if (user?.role === 'organizer') {
      // For organizers, navigate to organization page
      navigate(`/organization/${organizationId}`);
    }
  };

  // Function to handle explore organizations button click
  const handleExploreOrganizations = () => {
    if (user?.role === 'volunteer') {
      // For volunteers, navigate to volunteer dashboard organizations tab
      navigate('/volunteer/dashboard?tab=organizations');
    } else if (user?.role === 'organizer') {
      // For organizers, navigate to join organization page
      navigate('/join-organization');
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      // Fetch all applications without pagination to ensure we get all of them
      const response = await sponsorshipIntentAPI.getUserIntents({ 
        page: 1, 
        limit: 100, // Get a large number to ensure we get all applications
        status: 'all' // Get all statuses
      });
      
      // Store debug info
      setDebugInfo({
        response,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      
      // Handle different response structures
      if (response.intents) {
        setApplications(response.intents);
      } else if (Array.isArray(response)) {
        setApplications(response);
      } else {
        console.error('Unexpected response structure:', response);
        setApplications([]);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setDebugInfo({
        error: error.message,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      showAlert.error('Failed to load your applications. Please try again.');
      setApplications([]);
    } finally {
      setLoading(false);
      // Trigger animations
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    }
  };

  const getStatusBadge = (status, sponsorshipType, convertedTo) => {
    const statusConfig = {
      pending: { 
        color: 'bg-amber-100 text-amber-800 border-amber-200', 
        label: 'Pending Review',
        icon: <ClockIcon className="w-4 h-4" />
      },
      under_review: { 
        color: 'bg-blue-100 text-blue-800 border-blue-200', 
        label: 'Under Review',
        icon: <EyeIcon className="w-4 h-4" />
      },
      approved: { 
        color: sponsorshipType === 'monetary' ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200', 
        label: sponsorshipType === 'monetary' ? 
          (convertedTo ? 'Approved - Payment Completed' : 'Approved - Payment Required') : 
          'Approved',
        icon: <CheckCircleIcon className="w-4 h-4" />
      },
      rejected: { 
        color: 'bg-red-100 text-red-800 border-red-200', 
        label: 'Rejected',
        icon: <XCircleIcon className="w-4 h-4" />
      },
      changes_requested: { 
        color: 'bg-purple-100 text-purple-800 border-purple-200', 
        label: 'Changes Requested',
        icon: <ExclamationTriangleIcon className="w-4 h-4" />
      },
      converted: { 
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200', 
        label: 'Converted to Sponsorship',
        icon: <CheckCircleIcon className="w-4 h-4" />
      }
    };

    const config = statusConfig[status] || { 
      color: 'bg-slate-100 text-slate-800 border-slate-200', 
      label: status.replace('_', ' ').toUpperCase(),
      icon: <DocumentTextIcon className="w-4 h-4" />
    };
    
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const handleViewDetails = (application) => {
    setSelectedApplication(application);
    setShowDetailsModal(true);
  };

  const handleEditApplication = (application) => {
    // Navigate to edit page with application data
    navigate(`/applications/${application._id}/edit`);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedApplication(null);
  };

  // Add refresh function
  const handleRefresh = () => {
    fetchApplications();
  };

  const handleViewReceipt = async (application) => {
    try {
      // If the application has a convertedTo (sponsorship), we can get receipts for that sponsorship
      if (application.convertedTo) {
        // Fetch receipts for the converted sponsorship
        const response = await getReceiptsBySponsorship(application.convertedTo);
        if (response.success && response.receipts && response.receipts.length > 0) {
          // Navigate to the first receipt's details page
          navigate(`/receipt/${response.receipts[0]._id}`);
        } else {
          showAlert.warning('No receipt found for this sponsorship. Please check back later.');
        }
      } else {
        showAlert.info('Receipt not available yet. Please wait for the sponsorship to be created.');
      }
    } catch (error) {
      console.error('Error viewing receipt:', error);
      showAlert.error('Failed to load receipt. Please try again.');
    }
  };

  // Listen for navigation back to this page
  useEffect(() => {
    const handleFocus = () => {
      // Refresh data when user returns to this page
      fetchApplications();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

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
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent">
                My Sponsorship Applications
              </h1>
              <p className="text-slate-600 text-lg mt-2">
                Track the status of your sponsorship applications and manage your submissions.
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                <DocumentTextIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total Applications</p>
                <p className="text-2xl font-bold text-slate-900">{applications.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl">
                <ClockIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Pending Review</p>
                <p className="text-2xl font-bold text-slate-900">{applications.filter(app => app.status === 'pending').length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl">
                <CheckCircleIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Approved</p>
                <p className="text-2xl font-bold text-slate-900">{applications.filter(app => app.status === 'approved').length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl">
                <CurrencyDollarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Monetary</p>
                <p className="text-2xl font-bold text-slate-900">{applications.filter(app => app.sponsorship?.type === 'monetary').length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {applications.length === 0 ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <DocumentTextIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  No Applications Found
                </h3>
                <p className="text-slate-600 mb-6">
                  {loading ? 'Loading your applications...' : 'No sponsorship applications found in your account.'}
                </p>
                
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
                  >
                    <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Refreshing...' : 'Refresh'}
                  </button>
                  <button
                    onClick={handleExploreOrganizations}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <BuildingOfficeIcon className="w-5 h-5" />
                    Browse Organizations
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
              <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-200/50">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Your Applications ({applications.length})
                  </h3>
                  <div className="text-sm text-slate-500">
                    Showing all applications
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200/50">
                  <thead className="bg-slate-50/30">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Organization
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/50 divide-y divide-slate-200/50">
                    {applications.map((application, index) => (
                      <tr 
                        key={application._id} 
                        className={`hover:bg-slate-50/50 transition-all duration-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div 
                              className="text-sm font-medium text-slate-900 cursor-pointer hover:text-blue-600 hover:underline transition-colors duration-200"
                              onClick={() => handleOrganizationClick(application.organization?._id)}
                            >
                              {application.organization?.name || 'Unknown Organization'}
                            </div>
                            {application.event && (
                              <div className="text-sm text-slate-500">
                                Event: {application.event.title}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900 capitalize">
                            {application.sponsorship.type}
                          </div>
                          <div className="text-sm text-slate-500">
                            {application.sponsor.sponsorType}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">
                            {formatCurrency(application.sponsorship.estimatedValue, application.sponsorship.currency)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(application.status, application.sponsorship.type, application.convertedTo)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {formatDate(application.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleViewDetails(application)}
                              className="inline-flex items-center gap-1 px-3 py-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            >
                              <EyeIcon className="w-4 h-4" />
                              View
                            </button>
                            {(application.status === 'changes_requested' || application.status === 'pending') && (
                              <button
                                onClick={() => handleEditApplication(application)}
                                className="inline-flex items-center gap-1 px-3 py-1 text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-all duration-200"
                              >
                                <PencilIcon className="w-4 h-4" />
                                Edit
                              </button>
                            )}
                            {application.status === 'approved' && application.sponsorship.type === 'monetary' && !application.convertedTo && (
                              <button
                                onClick={() => navigate(`/intent-payment/${application._id}`)}
                                className="inline-flex items-center gap-1 px-3 py-1 text-orange-600 hover:text-orange-900 hover:bg-orange-50 rounded-lg transition-all duration-200"
                              >
                                <CreditCardIcon className="w-4 h-4" />
                                Payment
                              </button>
                            )}
                            
                            {application.status === 'approved' && application.sponsorship.type === 'monetary' && application.convertedTo && (
                              <button
                                onClick={() => navigate(`/payment-status/${application.convertedTo}`)}
                                className="inline-flex items-center gap-1 px-3 py-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-all duration-200"
                              >
                                <EyeIcon className="w-4 h-4" />
                                View Payment
                              </button>
                            )}

                            {/* Show payment status for completed payments even if not converted */}
                            {application.status === 'approved' && 
                             application.sponsorship.type === 'monetary' && 
                             !application.convertedTo && 
                             application.payment?.status === 'completed' && (
                              <button
                                onClick={() => navigate(`/intent-payment/${application._id}`)}
                                className="inline-flex items-center gap-1 px-3 py-1 text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-all duration-200"
                              >
                                <CheckCircleIcon className="w-4 h-4" />
                                Payment Completed
                              </button>
                            )}

                            {/* Receipt link for completed payments */}
                            {(application.status === 'approved' || application.status === 'converted') && 
                             application.sponsorship.type === 'monetary' && 
                             application.payment?.status === 'completed' && 
                             application.convertedTo && (
                              <button
                                onClick={() => handleViewReceipt(application)}
                                className="inline-flex items-center gap-1 px-3 py-1 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-all duration-200"
                              >
                                <ReceiptRefundIcon className="w-4 h-4" />
                                Receipt
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Application Details Modal */}
      {showDetailsModal && selectedApplication && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-2xl rounded-2xl bg-white/95 backdrop-blur-sm border-white/20">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-slate-900">
                  Application Details
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-slate-400 hover:text-slate-600 transition-colors duration-200"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="bg-slate-50/50 rounded-xl p-4">
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <BuildingOfficeIcon className="w-5 h-5" />
                    Organization
                  </h4>
                  <p 
                    className="text-slate-600 cursor-pointer hover:text-blue-600 hover:underline transition-colors duration-200"
                    onClick={() => handleOrganizationClick(selectedApplication.organization?._id)}
                  >
                    {selectedApplication.organization?.name}
                  </p>
                  {selectedApplication.event && (
                    <p className="text-sm text-slate-500 mt-1">Event: {selectedApplication.event.title}</p>
                  )}
                </div>

                {/* Status */}
                <div className="bg-slate-50/50 rounded-xl p-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Status</h4>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(selectedApplication.status)}
                    <span className="text-sm text-slate-500">
                      {selectedApplication.review?.reviewedAt && 
                        `Reviewed on ${formatDate(selectedApplication.review.reviewedAt)}`
                      }
                    </span>
                  </div>
                </div>

                {/* Sponsorship Details */}
                <div className="bg-slate-50/50 rounded-xl p-4">
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <CurrencyDollarIcon className="w-5 h-5" />
                    Sponsorship Details
                  </h4>
                  <div className="space-y-2">
                    <p><strong>Type:</strong> {selectedApplication.sponsorship.type}</p>
                    <p><strong>Value:</strong> {formatCurrency(selectedApplication.sponsorship.estimatedValue, selectedApplication.sponsorship.currency)}</p>
                    <p><strong>Description:</strong> {selectedApplication.sponsorship.description}</p>
                  </div>
                </div>

                {/* Admin Review */}
                {selectedApplication.review && (
                  <div className="bg-blue-50/50 rounded-xl p-4">
                    <h4 className="font-semibold text-slate-900 mb-3">Admin Review</h4>
                    <div className="space-y-2">
                      <p><strong>Decision:</strong> {selectedApplication.review.decision?.replace('_', ' ').toUpperCase()}</p>
                      {selectedApplication.review.reviewNotes && (
                        <p><strong>Review Notes:</strong> {selectedApplication.review.reviewNotes}</p>
                      )}
                      {selectedApplication.review.adminNotes && (
                        <p><strong>Admin Notes:</strong> {selectedApplication.review.adminNotes}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                  {(selectedApplication.status === 'changes_requested' || selectedApplication.status === 'pending') && (
                    <button
                      onClick={() => {
                        handleCloseModal();
                        handleEditApplication(selectedApplication);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit Application
                    </button>
                  )}
                  
                  {/* Receipt link for completed payments */}
                  {(selectedApplication.status === 'approved' || selectedApplication.status === 'converted') && 
                   selectedApplication.sponsorship.type === 'monetary' && 
                   selectedApplication.payment?.status === 'completed' && 
                   selectedApplication.convertedTo && (
                    <button
                      onClick={async () => {
                        try {
                          const response = await getReceiptsBySponsorship(selectedApplication.convertedTo);
                          if (response.success && response.receipts && response.receipts.length > 0) {
                            navigate(`/receipt/${response.receipts[0]._id}`);
                            handleCloseModal();
                          } else {
                            showAlert.warning('No receipt found for this sponsorship. Please check back later.');
                          }
                        } catch (error) {
                          console.error('Error viewing receipt:', error);
                          showAlert.error('Failed to load receipt. Please try again.');
                        }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <ReceiptRefundIcon className="w-4 h-4" />
                      View Receipt
                    </button>
                  )}
                  
                  <button
                    onClick={handleCloseModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-300 to-slate-400 hover:from-slate-400 hover:to-slate-500 text-slate-700 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <XMarkIcon className="w-4 h-4" />
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 