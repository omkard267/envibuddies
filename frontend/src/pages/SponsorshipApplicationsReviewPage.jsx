import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sponsorshipIntentAPI, sponsorAPI, getOrganizationById } from '../api';
import { getReceiptsBySponsorship } from '../api/receipt';
import Navbar from '../components/layout/Navbar';
import FailedVerificationsManager from '../components/payment/FailedVerificationsManager';
import ManualVerificationForm from '../components/payment/ManualVerificationForm';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { showAlert } from '../utils/notifications';

export default function SponsorshipApplicationsReviewPage() {
  const { organizationId } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    decision: '',
    reviewNotes: '',
    adminNotes: ''
  });
  const [editableData, setEditableData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [showConversionWarning, setShowConversionWarning] = useState(false);
  const [pendingConversion, setPendingConversion] = useState(null);
  const [showManualVerification, setShowManualVerification] = useState(false);
  const [selectedIntentForManualVerification, setSelectedIntentForManualVerification] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [hasFailedVerifications, setHasFailedVerifications] = useState(false);

  useEffect(() => {
    if (organizationId) {
      fetchData();
      setHasFailedVerifications(false); // Reset when organization changes
    }
  }, [organizationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [orgRes, applicationsRes] = await Promise.all([
        getOrganizationById(organizationId),
        sponsorshipIntentAPI.getOrganizationIntents(organizationId)
      ]);

      setOrganization(orgRes.data);
      setApplications(applicationsRes?.intents || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      
      // If it's a 403 error, show a specific message
      if (error.response?.status === 403) {
        showAlert.error('Access denied: You need admin privileges to view sponsorship applications.');
      } else if (error.response?.status === 401) {
        showAlert.warning('Please log in to view sponsorship applications.');
      } else {
        showAlert.error('Failed to load sponsorship applications. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!reviewData.decision) {
      showAlert.warning('Please select a decision');
      return;
    }

    // Check if trying to convert monetary sponsorship without payment
    if (reviewData.decision === 'convert_to_sponsorship' && 
        selectedApplication.sponsorship.type === 'monetary' &&
        (!selectedApplication.payment || selectedApplication.payment.status !== 'completed')) {
      
      // Show warning dialog
      setPendingConversion({
        decision: reviewData.decision,
        reviewNotes: reviewData.reviewNotes,
        adminNotes: reviewData.adminNotes
      });
      setShowConversionWarning(true);
      return;
    }

    await submitReview();
  };

  const submitReview = async () => {
    setIsSubmitting(true);
    try {
      
      const response = await sponsorshipIntentAPI.reviewIntent(
        selectedApplication._id,
        reviewData
      );


      // Check if the response indicates success (backend returns message and intent)
      if (response.message && response.intent) {
        // Show appropriate success message based on decision
        if (reviewData.decision === 'convert_to_sponsorship') {
          if (selectedApplication.status === 'converted') {
            showAlert.success('Sponsorship updated successfully! The existing sponsorship has been updated with the new details.');
          } else if (reviewData.manualConversion) {
            showAlert.success('Application converted to sponsorship successfully! Payment has been marked as completed (manual conversion).');
          } else {
            showAlert.success('Application converted to sponsorship successfully! A new active sponsorship has been created.');
          }
        } else if (reviewData.decision === 'delete_sponsorship') {
          showAlert.success('Sponsorship deleted successfully! The sponsorship has been removed from the system.');
        } else if (reviewData.decision === 'suspend_sponsorship') {
          showAlert.success('Sponsorship suspended successfully! The sponsorship has been temporarily disabled.');
        } else if (reviewData.decision === 'reactivate_sponsorship') {
          showAlert.success('Sponsorship reactivated successfully! The sponsorship has been re-enabled.');
        } else if (reviewData.decision === 'approve') {
          showAlert.success(`Application approved successfully! Status changed from "${selectedApplication.status}" to "approved".`);
        } else if (reviewData.decision === 'reject') {
          showAlert.success(`Application rejected successfully! Status changed from "${selectedApplication.status}" to "rejected".`);
        } else if (reviewData.decision === 'request_changes') {
          showAlert.success(`Changes requested successfully! Status changed from "${selectedApplication.status}" to "changes_requested".`);
        } else {
          showAlert.success(`Application reviewed successfully! Status: ${response.intent.status}`);
        }

        // Reset form and close modal first
        setReviewData({ decision: '', reviewNotes: '', adminNotes: '' });
        setSelectedApplication(null);
        
        // Wait a moment for the modal to close, then refresh data
        setTimeout(async () => {
          await fetchData();
        }, 100);
      } else {
        throw new Error('Review submission failed: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error reviewing intent:', error);
      
      // Handle specific error for monetary conversion without payment
      if (error.response?.data?.message === 'Cannot convert monetary sponsorship intent without payment') {
        const details = error.response.data.details;
        showAlert.warning(`${details.warning}\n\n${details.instructions}`);
      } else {
        showAlert.error('Error reviewing application: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmConversion = async () => {
    setShowConversionWarning(false);
    if (pendingConversion) {
      // Add manual conversion flag and notes
      const manualConversionData = {
        ...pendingConversion,
        manualConversion: true,
                        manualConversionNotes: `Manual conversion by admin - Payment received outside the system (${formatDateTime(new Date())})`
      };
      setReviewData(manualConversionData);
      setPendingConversion(null);
      await submitReview();
    }
  };

  const handleCancelConversion = () => {
    setShowConversionWarning(false);
    setPendingConversion(null);
  };

  const handleCleanupOrphaned = async () => {
    try {
      const response = await sponsorshipIntentAPI.cleanupOrphanedIntents();
      showAlert.success(`Cleanup completed! ${response.cleanedCount} orphaned intents were cleaned up.`);
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Error cleaning up orphaned intents:', error);
      showAlert.error('Failed to cleanup orphaned intents. Please try again.');
    }
  };

  const handleCheckDuplicates = async () => {
    try {
      const result = await sponsorAPI.checkDuplicateSponsors();
      if (result.duplicates.length === 0) {
        showAlert.info('No duplicate sponsor profiles found!');
      } else {
        showAlert.success(`Found and cleaned ${result.duplicates.length} duplicate sponsor profiles. Check console for details.`);
      }
    } catch (error) {
      console.error('Error checking duplicate sponsors:', error);
      showAlert.error('Failed to check duplicate sponsors');
    }
  };

  const handleApplicationClick = (application) => {
    setSelectedApplication(application);
    setEditableData({
      estimatedValue: application.sponsorship.estimatedValue,
      description: application.sponsorship.description,
      currency: application.sponsorship.currency,
      // Add other editable fields as needed
    });
    // Pre-fill review data if decision already exists
    if (application.review?.decision) {
      setReviewData({
        decision: application.review.decision,
        reviewNotes: application.review.reviewNotes || '',
        adminNotes: application.review.adminNotes || ''
      });
    } else {
      setReviewData({ decision: '', reviewNotes: '', adminNotes: '' });
    }
    setShowModal(true);
    setShowFullHistory(false); // Reset to show recent only
  };

  const getStatusBadge = (status, type, convertedTo) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      under_review: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      changes_requested: 'bg-purple-100 text-purple-800',
      converted: 'bg-green-100 text-green-800'
    };

    const statusLabels = {
      pending: 'Pending Review',
      under_review: 'Under Review',
      approved: type === 'monetary' && !convertedTo ? 'Approved - Payment Required' : 'Approved',
      rejected: 'Rejected',
      changes_requested: 'Changes Requested',
      converted: 'Converted to Sponsorship'
    };

    const color = statusColors[status] || 'bg-gray-100 text-gray-800';
    const label = statusLabels[status] || status.replace('_', ' ').toUpperCase();

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {label}
      </span>
    );
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Helper function to get the current estimated value for display
  const getCurrentEstimatedValue = () => {
    if (editableData?.estimatedValue !== undefined && editableData.estimatedValue !== '') {
      return editableData.estimatedValue;
    }
    return selectedApplication?.sponsorship?.estimatedValue || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mt-10 bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <div className="text-green-500 text-xl mr-3">✅</div>
              <div>
                <p className="text-green-800 font-medium">{successMessage}</p>
              </div>
              <button
                onClick={() => {
                  setShowSuccessMessage(false);
                  setSuccessMessage('');
                }}
                className="ml-auto text-green-600 hover:text-green-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        <div className="max-w-6xl mx-auto">
                     <div className="mb-8">
             <h1 className="text-3xl font-bold text-gray-900 mb-2">
               Sponsorship Applications Review
             </h1>
             <p className="text-gray-600 mb-4">
               Review and manage sponsorship applications for {organization?.name}
             </p>
             
             {/* Review Process Info */}
             <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
               <h3 className="text-sm font-medium text-yellow-900 mb-2">📝 Review Guidelines</h3>
               <div className="text-sm text-yellow-800 space-y-1">
                 <p><strong>✅ Approve:</strong> Accept the application and proceed with sponsorship</p>
                 <p><strong>❌ Reject:</strong> Decline with constructive feedback</p>
                 <p><strong>🔄 Request Changes:</strong> Ask sponsor to modify their proposal</p>
                 <p><strong>💰 Convert:</strong> Automatically create an active sponsorship relationship</p>
                 <p className="text-xs mt-2">All decisions will be communicated to the sponsor with your review notes.</p>
               </div>
             </div>
             
             {/* Admin Tools */}
             <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
               <h3 className="text-sm font-medium text-blue-900 mb-2">🔧 Admin Tools</h3>
               <div className="text-sm text-blue-800 space-y-1">
                 <p>If you encounter issues with sponsorship applications, you can clean up orphaned data:</p>
                 <div className="flex space-x-2 mt-2">
                   <button
                     onClick={handleCleanupOrphaned}
                     className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                   >
                     Cleanup Orphaned Data
                   </button>
                   <button
                     onClick={handleCheckDuplicates}
                     className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                   >
                     Check Duplicates
                   </button>
                 </div>
               </div>
             </div>

             {/* Failed Payment Verifications */}
             {hasFailedVerifications && (
               <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                 <h3 className="text-sm font-medium text-orange-900 mb-2">⚠️ Payment Issues</h3>
                 <div className="text-sm text-orange-800 space-y-1">
                   <p>Manage failed payment verifications and manual payment processing:</p>
                   <FailedVerificationsManager 
                     organizationId={organizationId} 
                     onRefresh={fetchData}
                     onFailedVerificationsChange={setHasFailedVerifications}
                   />
                 </div>
               </div>
             )}
           </div>

          {applications.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Found</h3>
              <p className="text-gray-600 mb-4">
                {loading ? 'Loading applications...' : 'No sponsorship applications found for this organization.'}
              </p>
              <button
                onClick={fetchData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sponsor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {applications.map((application) => (
                      <tr key={application._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className={`text-sm font-medium ${
                              application.sponsor.isDeleted ? 'text-gray-600' : 'text-gray-900'
                            }`}>
                              {application.sponsor.name || 'Deleted User'}
                              {application.sponsor.isDeleted && (
                                <span className="ml-2 px-2 py-1 bg-gray-500 text-white text-xs rounded-full font-bold">Deleted User</span>
                              )}
                            </div>
                            <div className={`text-sm ${
                              application.sponsor.isDeleted ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {application.sponsor.email || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 capitalize">
                            {application.sponsorship.type}
                          </div>
                          <div className="text-sm text-gray-500">
                            {application.sponsor.sponsorType}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(application.sponsorship.estimatedValue, application.sponsorship.currency)}
                          </div>
                          {application.review?.decision && (
                            <div className="text-xs text-gray-500 mt-1">
                              Decision: {application.review.decision.replace('_', ' ').toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(application.status, application.sponsorship.type, application.convertedTo)}
                            
                            {/* Payment Status Indicator for Monetary Sponsorships */}
                            {application.sponsorship.type === 'monetary' && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                application.payment?.status === 'completed' 
                                  ? application.payment?.manualVerification 
                                    ? 'bg-purple-100 text-purple-800'  // Manual verification
                                    : application.payment?.manualConversion 
                                      ? 'bg-orange-100 text-orange-800'  // Manual conversion (proceed anyway)
                                      : 'bg-green-100 text-green-800'    // Regular payment
                                  : 'bg-gray-100 text-gray-800'    // Payment pending
                              }`}>
                                {application.payment?.status === 'completed' 
                                  ? (application.payment?.manualVerification 
                                      ? `💰 ${application.payment?.paymentType || 'Manual'}`
                                      : application.payment?.manualConversion 
                                        ? '💰 Manual Payment'
                                        : '💰 Paid')
                                  : '💳 Payment Pending'
                                }
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(application.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleApplicationClick(application)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            {application.status === 'pending' ? 'Review' : 'View & Edit'}
                          </button>
                          
                          {/* Receipt link for completed payments */}
                          {(application.status === 'approved' || application.status === 'converted') && 
                           application.sponsorship.type === 'monetary' && 
                           application.payment?.status === 'completed' && 
                           application.convertedTo && (
                            <button
                              onClick={async () => {
                                try {
                                  const response = await getReceiptsBySponsorship(application.convertedTo);
                                  if (response.success && response.receipts && response.receipts.length > 0) {
                                    window.open(`/receipt/${response.receipts[0]._id}`, '_blank');
                                  } else {
                                    showAlert.warning('No receipt found for this sponsorship.');
                                  }
                                } catch (error) {
                                  console.error('Error fetching receipt:', error);
                                  showAlert.error('Failed to load receipt.');
                                }
                              }}
                              className="text-purple-600 hover:text-purple-900"
                            >
                              View Receipt
                            </button>
                          )}
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
      {showModal && selectedApplication && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Sponsorship Application Details
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedApplication(null);
                    setReviewData({ decision: '', reviewNotes: '', adminNotes: '' });
                    setEditableData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6 max-h-96 overflow-y-auto">
                {/* Sponsor Information */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">Sponsor Information</h4>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className={`font-medium ${
                          selectedApplication.sponsor.isDeleted ? 'text-gray-600' : 'text-gray-900'
                        }`}>
                          {selectedApplication.sponsor.name || 'Deleted User'}
                          {selectedApplication.sponsor.isDeleted && (
                            <span className="ml-2 px-2 py-1 bg-gray-500 text-white text-xs rounded-full font-bold">Deleted User</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className={`font-medium ${
                          selectedApplication.sponsor.isDeleted ? 'text-gray-400' : 'text-gray-900'
                        }`}>
                          {selectedApplication.sponsor.email || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className={`font-medium ${
                          selectedApplication.sponsor.isDeleted ? 'text-gray-400' : 'text-gray-900'
                        }`}>
                          {selectedApplication.sponsor.phone || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Type</p>
                        <p className="font-medium capitalize">{selectedApplication.sponsor.sponsorType}</p>
                      </div>
                      {selectedApplication.sponsor.location && (
                        <div>
                          <p className="text-sm text-gray-600">Location</p>
                          <p className="font-medium">
                            {selectedApplication.sponsor.location.city}, {selectedApplication.sponsor.location.state}, {selectedApplication.sponsor.location.country}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Business/Individual Details */}
                    {selectedApplication.sponsor.sponsorType === 'business' && selectedApplication.sponsor.business && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Business Details</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Business Name</p>
                            <p className="font-medium">{selectedApplication.sponsor.business.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Industry</p>
                            <p className="font-medium">{selectedApplication.sponsor.business.industry}</p>
                          </div>
                          {selectedApplication.sponsor.business.website && (
                            <div>
                              <p className="text-sm text-gray-600">Website</p>
                              <p className="font-medium">{selectedApplication.sponsor.business.website}</p>
                            </div>
                          )}
                          {selectedApplication.sponsor.business.description && (
                            <div>
                              <p className="text-sm text-gray-600">Description</p>
                              <p className="font-medium">{selectedApplication.sponsor.business.description}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {selectedApplication.sponsor.sponsorType === 'individual' && selectedApplication.sponsor.individual && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Individual Details</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Profession</p>
                            <p className="font-medium">{selectedApplication.sponsor.individual.profession}</p>
                          </div>
                          {selectedApplication.sponsor.individual.organization && (
                            <div>
                              <p className="text-sm text-gray-600">Organization</p>
                              <p className="font-medium">{selectedApplication.sponsor.individual.organization}</p>
                            </div>
                          )}
                          {selectedApplication.sponsor.individual.designation && (
                            <div>
                              <p className="text-sm text-gray-600">Designation</p>
                              <p className="font-medium">{selectedApplication.sponsor.individual.designation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sponsorship Details */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">Sponsorship Details</h4>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Type</p>
                        <p className="font-medium capitalize">{selectedApplication.sponsorship.type}</p>
                      </div>
                      
                      {/* Editable Fields */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description (Editable)
                        </label>
                        <textarea
                          value={editableData?.description || selectedApplication.sponsorship.description}
                          onChange={(e) => setEditableData({ ...editableData, description: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Estimated Value (Editable)
                            </label>
                            <input
                              type="number"
                              value={editableData?.estimatedValue !== undefined ? editableData.estimatedValue : selectedApplication.sponsorship.estimatedValue}
                              onChange={(e) => {
                                const value = e.target.value;
                                setEditableData({ 
                                  ...editableData, 
                                  estimatedValue: value === '' ? '' : Number(value) 
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Currency
                            </label>
                            <select
                              value={editableData?.currency || selectedApplication.sponsorship.currency}
                              onChange={(e) => setEditableData({ ...editableData, currency: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="INR">INR (₹)</option>
                              <option value="USD">USD ($)</option>
                              <option value="EUR">EUR (€)</option>
                            </select>
                          </div>
                        </div>
                        
                        {/* Calculated Tier Display */}
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Calculated Tier (Auto-updated)
                          </label>
                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              getCurrentEstimatedValue() >= 50000 ? 'bg-gradient-to-r from-gray-800 to-gray-600 text-white' :
                              getCurrentEstimatedValue() >= 25000 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400 text-white' :
                              getCurrentEstimatedValue() >= 10000 ? 'bg-gradient-to-r from-gray-400 to-gray-300 text-white' :
                              'bg-gradient-to-r from-green-500 to-green-400 text-white'
                            }`}>
                              {getCurrentEstimatedValue() >= 50000 ? '💎 Platinum' :
                               getCurrentEstimatedValue() >= 25000 ? '🥇 Gold' :
                               getCurrentEstimatedValue() >= 10000 ? '🥈 Silver' :
                               '🏘️ Community'}
                            </span>
                            <span className="text-sm text-gray-600">
                              (Based on ₹{getCurrentEstimatedValue().toLocaleString()})
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Tier is automatically calculated based on contribution value and will be updated when you save.
                          </p>
                        </div>
                      
                      {/* Type-specific details */}
                      {selectedApplication.sponsorship.type === 'monetary' && selectedApplication.sponsorship.monetary && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Monetary Details</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Amount</p>
                              <p className="font-medium">{formatCurrency(selectedApplication.sponsorship.monetary.amount, selectedApplication.sponsorship.currency)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Payment Method</p>
                              <p className="font-medium">{selectedApplication.sponsorship.monetary.paymentMethod}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Payment Timeline</p>
                              <p className="font-medium">{selectedApplication.sponsorship.monetary.paymentTimeline}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selectedApplication.sponsorship.type === 'goods' && selectedApplication.sponsorship.goods && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Goods Details</h5>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-gray-600">Items/Services</p>
                              <p className="font-medium">{selectedApplication.sponsorship.goods.items?.join(', ')}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Quantity</p>
                              <p className="font-medium">{selectedApplication.sponsorship.goods.quantity}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Delivery Timeline</p>
                              <p className="font-medium">{selectedApplication.sponsorship.goods.deliveryTimeline}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selectedApplication.sponsorship.type === 'service' && selectedApplication.sponsorship.service && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Service Details</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Service Type</p>
                              <p className="font-medium">{selectedApplication.sponsorship.service.serviceType}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Duration</p>
                              <p className="font-medium">{selectedApplication.sponsorship.service.duration}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Expertise</p>
                              <p className="font-medium">{selectedApplication.sponsorship.service.expertise}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selectedApplication.sponsorship.type === 'media' && selectedApplication.sponsorship.media && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Media Details</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Reach</p>
                              <p className="font-medium">{selectedApplication.sponsorship.media.reach}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Platforms</p>
                              <p className="font-medium">{selectedApplication.sponsorship.media.platforms?.join(', ')}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Duration</p>
                              <p className="font-medium">{selectedApplication.sponsorship.media.duration}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recognition Preferences */}
                {selectedApplication.recognition && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">Recognition Preferences</h4>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="space-y-3">
                        {selectedApplication.recognition.recognitionLevel && (
                          <div>
                            <p className="text-sm text-gray-600">Recognition Level</p>
                            <p className="font-medium capitalize">
                              {selectedApplication.recognition.recognitionLevel === 'high' && '🌟 High Visibility'}
                              {selectedApplication.recognition.recognitionLevel === 'medium' && '⭐ Medium Visibility'}
                              {selectedApplication.recognition.recognitionLevel === 'low' && '✨ Low Visibility'}
                              {selectedApplication.recognition.recognitionLevel === 'minimal' && '💫 Minimal Recognition'}
                            </p>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedApplication.recognition.logoDisplay}
                              disabled
                              className="mr-2"
                            />
                            <span className="text-sm">🏷️ Logo Display</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedApplication.recognition.socialMediaMention}
                              disabled
                              className="mr-2"
                            />
                            <span className="text-sm">📱 Social Media</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedApplication.recognition.websiteAcknowledgement}
                              disabled
                              className="mr-2"
                            />
                            <span className="text-sm">🌐 Website</span>
                          </label>
                        </div>
                        {selectedApplication.recognition.additionalRequests && (
                          <div>
                            <p className="text-sm text-gray-600">Additional Requests</p>
                            <p className="font-medium">{selectedApplication.recognition.additionalRequests}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Information */}
                {selectedApplication.additionalInfo && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">Additional Information</h4>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="space-y-3">
                        {selectedApplication.additionalInfo.howDidYouHear && (
                          <div>
                            <p className="text-sm text-gray-600">How did you hear about us?</p>
                            <p className="font-medium">{selectedApplication.additionalInfo.howDidYouHear}</p>
                          </div>
                        )}
                        {selectedApplication.additionalInfo.previousExperience && (
                          <div>
                            <p className="text-sm text-gray-600">Previous Experience</p>
                            <p className="font-medium">{selectedApplication.additionalInfo.previousExperience}</p>
                          </div>
                        )}
                        {selectedApplication.additionalInfo.timeline && (
                          <div>
                            <p className="text-sm text-gray-600">Timeline</p>
                            <p className="font-medium">{selectedApplication.additionalInfo.timeline}</p>
                          </div>
                        )}
                        {selectedApplication.additionalInfo.specialRequirements && (
                          <div>
                            <p className="text-sm text-gray-600">Special Requirements</p>
                            <p className="font-medium">{selectedApplication.additionalInfo.specialRequirements}</p>
                          </div>
                        )}
                        {selectedApplication.additionalInfo.questions && (
                          <div>
                            <p className="text-sm text-gray-600">Questions</p>
                            <p className="font-medium">{selectedApplication.additionalInfo.questions}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Suggestions Tracking */}
                {selectedApplication.adminSuggestions && selectedApplication.adminSuggestions.requested.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">📝 Admin Suggestions</h4>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-yellow-800 mb-3">
                        <strong>Suggestions made to the sponsor:</strong>
                      </p>
                      {selectedApplication.adminSuggestions.requested.map((suggestion, index) => (
                        <div key={index} className={`mb-2 p-2 rounded ${suggestion.implemented ? 'bg-green-100 border border-green-200' : 'bg-yellow-100 border border-yellow-200'}`}>
                          <div className="flex items-center justify-between">
                            <p className="text-sm">
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${suggestion.implemented ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                              {suggestion.suggestion}
                            </p>
                            <span className={`text-xs px-2 py-1 rounded ${suggestion.implemented ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                              {suggestion.implemented ? '✅ Implemented' : '⏳ Pending'}
                            </span>
                          </div>
                          {suggestion.implemented && suggestion.implementedAt && (
                            <p className="text-xs text-gray-600 mt-1">
                              Implemented on {formatDate(suggestion.implementedAt)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Review */}
                {selectedApplication.review && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Admin Review</h4>
                    <div className="bg-blue-50 p-3 rounded">
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

                {/* Change History / Audit Trail */}
                {selectedApplication.changeHistory && selectedApplication.changeHistory.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Change History</h4>
                    <div className="bg-gray-50 p-3 rounded max-h-60 overflow-y-auto">
                      {selectedApplication.changeHistory.slice(-5).reverse().map((change, index) => (
                        <div key={index} className="mb-3 pb-3 border-b border-gray-200 last:border-b-0">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {change.changeType.replace('_', ' ').toUpperCase()}
                              </p>
                              <p className="text-xs text-gray-600">
                                {formatDateTime(change.timestamp)}
                              </p>
                              {change.notes && (
                                <p className="text-sm text-gray-700 mt-1">{change.notes}</p>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {change.changedBy ? 'By Admin' : 'System'}
                            </span>
                          </div>
                          
                          {/* Show changes */}
                          {change.changes && change.changes.length > 0 && (
                            <div className="mt-2">
                              {change.changes.map((fieldChange, fieldIndex) => (
                                <div key={fieldIndex} className="text-xs text-gray-600">
                                  <span className="font-medium">{fieldChange.field}:</span>
                                  <span className="text-red-600"> {fieldChange.oldValue}</span>
                                  <span> → </span>
                                  <span className="text-green-600">{fieldChange.newValue}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Show payment context if available */}
                          {change.paymentContext && (
                            <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
                              <p><strong>Payment Status:</strong> {change.paymentContext.previousPaymentStatus} → {change.paymentContext.newPaymentStatus}</p>
                              {change.paymentContext.adminNotes && (
                                <p><strong>Admin Notes:</strong> {change.paymentContext.adminNotes}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review Section */}
                {(
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">
                      {selectedApplication.status === 'pending' ? 'Review Application' : 'Update Decision'}
                    </h4>
                    {selectedApplication.status !== 'pending' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-blue-800">
                          💡 <strong>Note:</strong> You can change the decision for this application. 
                          The sponsor will be notified of any changes.
                        </p>
                        {selectedApplication.review?.decision && (
                          <p className="text-sm text-blue-700 mt-2">
                            <strong>Current Decision:</strong> {selectedApplication.review.decision.replace('_', ' ').toUpperCase()}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="space-y-4">
                                             <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                           Decision
                         </label>
                         <select
                           value={reviewData.decision}
                           onChange={(e) => setReviewData({ ...reviewData, decision: e.target.value })}
                           className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                         >
                           <option value="">Select decision</option>
                           
                           {/* Show different options based on sponsorship status */}
                           {selectedApplication.status === 'converted' || selectedApplication.convertedTo ? (
                             // If sponsorship exists, show limited options
                             <>
                               <option value="delete_sponsorship">🗑️ Delete Sponsorship (Remove sponsorship entirely)</option>
                               <option value="suspend_sponsorship">⏸️ Suspend Sponsorship (Temporarily disable)</option>
                               <option value="reactivate_sponsorship">▶️ Reactivate Sponsorship (Re-enable if suspended)</option>
                             </>
                           ) : (
                             // If no sponsorship exists, show full options
                             <>
                               <option value="approve">✅ Approve (Accept the sponsorship application)</option>
                               <option value="reject">❌ Reject (Decline the sponsorship application)</option>
                               <option value="request_changes">🔄 Request Changes (Ask sponsor to modify their proposal)</option>
                               <option value="convert_to_sponsorship">💰 Convert to Sponsorship (Automatically create active sponsorship)</option>
                             </>
                           )}
                         </select>
                         <p className="text-sm text-gray-500 mt-1">
                           {selectedApplication.status === 'converted' || selectedApplication.convertedTo ? (
                             <>
                               <strong>Delete:</strong> Remove the sponsorship entirely<br/>
                               <strong>Suspend:</strong> Temporarily disable the sponsorship<br/>
                               <strong>Reactivate:</strong> Re-enable a suspended sponsorship
                             </>
                           ) : (
                             <>
                               <strong>Approve:</strong> Accept the application and contact sponsor for next steps<br/>
                               <strong>Reject:</strong> Decline with feedback to the sponsor<br/>
                               <strong>Request Changes:</strong> Ask sponsor to modify their proposal<br/>
                               <strong>Convert:</strong> {selectedApplication.sponsorship.type === 'monetary' ? 
                                 'Create active sponsorship (payment required for monetary sponsorships)' : 
                                 'Automatically create an active sponsorship relationship'}
                             </>
                           )}
                         </p>
                       </div>
                                             <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                           Review Notes (Visible to Sponsor)
                         </label>
                         <textarea
                           value={reviewData.reviewNotes}
                           onChange={(e) => setReviewData({ ...reviewData, reviewNotes: e.target.value })}
                           rows={3}
                           className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                           placeholder="Notes that will be shared with the sponsor..."
                         />
                         <p className="text-sm text-gray-500 mt-1">
                           These notes will be visible to the sponsor. Be professional and constructive in your feedback.
                         </p>
                       </div>
                                             <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                           Admin Notes (Internal)
                         </label>
                         <textarea
                           value={reviewData.adminNotes}
                           onChange={(e) => setReviewData({ ...reviewData, adminNotes: e.target.value })}
                           rows={3}
                           className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                           placeholder="Internal notes for your team..."
                         />
                         <p className="text-sm text-gray-500 mt-1">
                           These notes are private and only visible to your team. Use for internal discussions, follow-ups, or reminders.
                         </p>
                       </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedApplication(null);
                    setReviewData({ decision: '', reviewNotes: '', adminNotes: '' });
                    setEditableData(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                
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
                          window.open(`/receipt/${response.receipts[0]._id}`, '_blank');
                        } else {
                          showAlert.warning('No receipt found for this sponsorship.');
                        }
                      } catch (error) {
                        console.error('Error fetching receipt:', error);
                        showAlert.error('Failed to load receipt.');
                        }
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    View Receipt
                  </button>
                )}
                
                <button
                  onClick={handleReview}
                  disabled={!reviewData.decision || isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSubmitting && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  <span>
                    {isSubmitting 
                      ? 'Processing...' 
                      : (selectedApplication.status === 'pending' ? 'Submit Review' : 
                         ['delete_sponsorship', 'suspend_sponsorship', 'reactivate_sponsorship'].includes(reviewData.decision) ? 
                         'Manage Sponsorship' : 'Update Decision')
                    }
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversion Warning Dialog */}
      {showConversionWarning && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="text-yellow-500 text-2xl mr-3">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-900">
                Payment Required for Conversion
              </h3>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-3">
                You are trying to convert a <strong>monetary sponsorship</strong> without payment verification.
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                <p className="text-sm font-medium text-yellow-800 mb-2">
                  Sponsorship Details:
                </p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Amount: ₹{selectedApplication.sponsorship.estimatedValue}</li>
                  <li>• Type: {selectedApplication.sponsorship.type.toUpperCase()}</li>
                  <li>• Payment Status: {selectedApplication.payment?.status || 'No Payment'}</li>
                </ul>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-800 mb-2">
                  What happens if you proceed:
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Sponsorship will be created as "active"</li>
                  <li>• Payment status will be marked as "completed"</li>
                  <li>• Payment will be recorded as received outside the system</li>
                  <li>• This action will be logged in the audit trail</li>
                  <li>• Sponsor will not be prompted for online payment</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-red-800">
                ⚠️ Warning: This will mark the payment as completed without online verification. 
                Only proceed if you have confirmed payment was received (cash, bank transfer, etc.).
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleCancelConversion}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmConversion}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Proceed Anyway
              </button>
            </div>
            
            <div className="mt-3 text-center">
              <button
                onClick={() => {
                  setShowConversionWarning(false);
                  setPendingConversion(null);
                  setShowManualVerification(true);
                  setSelectedIntentForManualVerification(selectedApplication);
                }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Use Manual Payment Verification Instead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Payment Verification Modal */}
      {showManualVerification && selectedIntentForManualVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Manual Payment Verification
              </h3>
              <button
                onClick={() => {
                  setShowManualVerification(false);
                  setSelectedIntentForManualVerification(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-blue-800 mb-2">
                  Sponsorship Intent Details:
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Sponsor: {selectedIntentForManualVerification.sponsor?.name}</li>
                  <li>• Amount: ₹{selectedIntentForManualVerification.sponsorship.estimatedValue}</li>
                  <li>• Type: {selectedIntentForManualVerification.sponsorship.type.toUpperCase()}</li>
                  <li>• Description: {selectedIntentForManualVerification.sponsorship.description}</li>
                </ul>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-yellow-800">
                  ⚠️ Instructions: Enter the payment details from Razorpay dashboard or payment confirmation.
                </p>
              </div>
            </div>
            
            <ManualVerificationForm 
              intent={selectedIntentForManualVerification}
              onSuccess={() => {
                setShowManualVerification(false);
                setSelectedIntentForManualVerification(null);
                // Close the review modal as well
                setSelectedApplication(null);
                setReviewData({ decision: '', reviewNotes: '', adminNotes: '' });
                fetchData(); // Refresh the list
                // Show success message
                setSuccessMessage('Payment verified successfully! Sponsorship has been created.');
                setShowSuccessMessage(true);
                // Auto-hide success message after 3 seconds
                setTimeout(() => {
                  setShowSuccessMessage(false);
                  setSuccessMessage('');
                }, 3000);
              }}
              onCancel={() => {
                setShowManualVerification(false);
                setSelectedIntentForManualVerification(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
} 