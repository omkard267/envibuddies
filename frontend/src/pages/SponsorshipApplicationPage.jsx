import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sponsorshipIntentAPI, getOrganizationById, sponsorAPI } from '../api';
import Navbar from '../components/layout/Navbar';
import { showAlert } from '../utils/notifications';
import { FullScreenLoader } from '../components/common/LoaderComponents';

export default function SponsorshipApplicationPage() {
  const { organizationId, eventId } = useParams();
  const navigate = useNavigate();
  
  const [organization, setOrganization] = useState(null);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [userSponsorProfile, setUserSponsorProfile] = useState(null);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [formData, setFormData] = useState({
    sponsor: {
      user: null,
      name: '',
      email: '',
      phone: '',
      sponsorType: 'business',
      business: {
        name: '',
        industry: '',
        website: '',
        description: ''
      },
      individual: {
        profession: '',
        organization: '',
        designation: ''
      },
      location: {
        city: '',
        state: '',
        country: 'India'
      }
    },
    sponsorship: {
      type: 'monetary',
      description: '',
      estimatedValue: '',
      currency: 'INR',
      monetary: {
        amount: '',
        paymentMethod: '',
        paymentTimeline: ''
      },
      goods: {
        items: [],
        quantity: '',
        deliveryTimeline: ''
      },
      service: {
        serviceType: '',
        duration: '',
        expertise: ''
      },
      media: {
        reach: '',
        platforms: [],
        duration: ''
      }
    },
    recognition: {
      recognitionLevel: '',
      specificBenefits: [],
      additionalRequests: ''
    },
    additionalInfo: {
      howDidYouHear: '',
      previousExperience: '',
      timeline: '',
      specialRequirements: '',
      questions: ''
    }
  });

  const [errors, setErrors] = useState({});
  const [minimumContribution, setMinimumContribution] = useState(0);

  useEffect(() => {
    fetchOrganizationData();
    checkUserSponsorProfile();
  }, [organizationId, eventId]);

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);
      const [orgRes] = await Promise.all([
        getOrganizationById(organizationId)
      ]);
      setOrganization(orgRes.data);
      
      // Set minimum contribution from organization settings
      if (orgRes.data?.sponsorship?.minimumContribution) {
        setMinimumContribution(orgRes.data.sponsorship.minimumContribution);
      }
      
      if (eventId) {
        // Fetch event data if eventId is provided
        // You'll need to implement this API call
      }
    } catch (error) {
      console.error('Error fetching organization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserSponsorProfile = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user"));
      if (!userData) {
        return;
      }

      const sponsorResponse = await sponsorAPI.getMySponsorProfile();
      
      if (sponsorResponse) {
        setUserSponsorProfile(sponsorResponse);
        setHasExistingProfile(true);
        prefillFormWithSponsorData(sponsorResponse);
      }
    } catch (error) {
      // Silently handle error - user might not have a sponsor profile
    }
  };

  const prefillFormWithSponsorData = (sponsorData) => {
    setFormData(prev => ({
      ...prev,
      sponsor: {
        ...prev.sponsor,
        user: sponsorData.user?._id || sponsorData.user, // Include the user ID
        name: sponsorData.contactPerson || '', // Use contactPerson from sponsor profile
        email: sponsorData.email || '',
        phone: sponsorData.phone || '',
        sponsorType: sponsorData.sponsorType || 'business',
        business: {
          name: sponsorData.business?.name || '',
          industry: sponsorData.business?.industry || '',
          website: sponsorData.business?.website || sponsorData.socialLinks?.website || '', // Check both business.website and socialLinks.website
          description: sponsorData.business?.description || ''
        },
        individual: {
          profession: sponsorData.individual?.profession || '',
          organization: sponsorData.individual?.organization || '',
          designation: sponsorData.individual?.designation || ''
        },
        location: {
          city: sponsorData.location?.city || '',
          state: sponsorData.location?.state || '',
          country: sponsorData.location?.country || 'India'
        }
      }
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      
      if (section === 'sponsor' && name.includes('.')) {
        const field = name.split('.')[1];
        if (field === 'business' || field === 'individual' || field === 'location') {
          const subField = name.split('.')[2];
          setFormData(prev => ({
            ...prev,
            sponsor: {
              ...prev.sponsor,
              [field]: {
                ...prev.sponsor[field],
                [subField]: value
              }
            }
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            sponsor: {
              ...prev.sponsor,
              [field]: value
            }
          }));
        }
      } else if (section === 'sponsorship' && name.includes('.')) {
        const field = name.split('.')[1];
        if (field === 'monetary' || field === 'goods' || field === 'service' || field === 'media') {
          const subField = name.split('.')[2];
          setFormData(prev => ({
            ...prev,
            sponsorship: {
              ...prev.sponsorship,
              [field]: {
                ...prev.sponsorship[field],
                [subField]: value
              }
            }
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            sponsorship: {
              ...prev.sponsorship,
              [field]: value
            }
          }));
        }
      } else if (section === 'recognition' && name.includes('.')) {
        const field = name.split('.')[1];
        setFormData(prev => ({
          ...prev,
          recognition: {
            ...prev.recognition,
            [field]: value
          }
        }));
      } else if (section === 'additionalInfo' && name.includes('.')) {
        const field = name.split('.')[1];
        setFormData(prev => ({
          ...prev,
          additionalInfo: {
            ...prev.additionalInfo,
            [field]: value
          }
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.sponsor.name.trim()) newErrors.name = 'Name is required';
      if (!formData.sponsor.email.trim()) newErrors.email = 'Email is required';
      if (!formData.sponsor.phone.trim()) newErrors.phone = 'Phone is required';
      
      if (formData.sponsor.sponsorType === 'business') {
        if (!formData.sponsor.business.name.trim()) newErrors.businessName = 'Business name is required';
        if (!formData.sponsor.business.industry.trim()) newErrors.industry = 'Industry is required';
      } else {
        if (!formData.sponsor.individual.profession.trim()) newErrors.profession = 'Profession is required';
      }
    }
    
    if (step === 2) {
      if (!formData.sponsorship.description.trim()) newErrors.description = 'Description is required';
      if (!formData.sponsorship.estimatedValue) newErrors.estimatedValue = 'Estimated value is required';
      if (Number(formData.sponsorship.estimatedValue) <= 0) newErrors.estimatedValue = 'Estimated value must be greater than 0';
      
      // Check minimum contribution requirement
      if (minimumContribution > 0 && Number(formData.sponsorship.estimatedValue) < minimumContribution) {
        newErrors.estimatedValue = `Minimum contribution required is ₹${minimumContribution.toLocaleString()}`;
      }
      
      if (formData.sponsorship.type === 'monetary') {
        if (!formData.sponsorship.monetary.amount) newErrors.amount = 'Amount is required';
        if (Number(formData.sponsorship.monetary.amount) <= 0) newErrors.amount = 'Amount must be greater than 0';
        
        // Check minimum contribution for monetary sponsorships
        if (minimumContribution > 0 && Number(formData.sponsorship.monetary.amount) < minimumContribution) {
          newErrors.amount = `Minimum contribution required is ₹${minimumContribution.toLocaleString()}`;
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    // Prevent multiple submissions
    if (submitting) {
      return;
    }
    
    // Only submit if we're on the final step (step 3)
    if (currentStep !== 3) {
      return;
    }
    
    if (!validateStep(currentStep)) {
      return;
    }

    try {
      setSubmitting(true);
      
      // Get current user data
      const currentUser = JSON.parse(localStorage.getItem("user"));
      if (!currentUser || !currentUser._id) {
        showAlert.warning('Please log in to submit a sponsorship application.');
        return;
      }
      
      const submitData = {
        ...formData,
        organizationId,
        eventId,
        sponsorProfileId: userSponsorProfile?._id || null
      };

      // Ensure the sponsor user ID is set
      submitData.sponsor.user = currentUser._id;

      // Use the formatIntentData function to properly format the data
      const formattedData = sponsorshipIntentAPI.formatIntentData(submitData);
      
      await sponsorshipIntentAPI.submitIntent(formattedData);
      
      showAlert.success('Sponsorship application submitted successfully!');
      navigate(`/organizations/${organizationId}`);
    } catch (error) {
      console.error('Error submitting application:', error);
      
      // Show specific error message for minimum contribution
      if (error.response?.data?.message && error.response.data.message.includes('Minimum contribution required')) {
        showAlert.error(`Submission failed: ${error.response.data.message}. Please increase your estimated value and try again.`);
      } else {
        showAlert.error('Failed to submit application. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="pt-20 lg:pt-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Loading organization details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="pt-20 lg:pt-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Organization Not Found</h1>
              <p className="text-gray-600 mb-6">The organization you're looking for doesn't exist or you don't have permission to access it.</p>
              <button
                onClick={() => navigate('/')}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-md"
              >
                Go Back Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />
      
      {/* Professional Action Bar - Fixed at top */}
      <div className="fixed top-16 lg:top-20 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            {/* Left side - Back button and title */}
            <div className="flex items-center space-x-4">
              <button
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 flex items-center group"
                onClick={() => navigate(`/organization/${organizationId}`)}
              >
                <span className="transform group-hover:-translate-x-1 transition-transform duration-200">←</span>
                <span className="ml-1">Back to Organization</span>
              </button>
              <div className="hidden sm:block w-px h-6 bg-gray-300"></div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-800 truncate max-w-xs sm:max-w-md lg:max-w-lg">
                Sponsor: {organization.name}
              </h1>
            </div>

            {/* Right side - Action buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate(`/organization/${organizationId}`)}
                className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md hover:from-gray-600 hover:to-gray-700 transition-all duration-200 text-sm font-medium"
              >
                Cancel
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={submitting || currentStep !== 3}
                className={`px-6 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-sm font-medium ${
                  submitting || currentStep !== 3
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800 transform hover:scale-105'
                }`}
              >
                {submitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </div>
                ) : (
                  'Submit Application'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Adjusted padding for fixed action bar */}
      <div className="pt-32 lg:pt-36 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Organization Information Header */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-800 to-indigo-800 bg-clip-text text-transparent mb-2">
                  Sponsorship Application
                </h2>
                <p className="text-gray-600 mb-4">
                  Complete the form below to submit your sponsorship application for {organization.name}
                </p>
                
                {/* Organization Status Indicators */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 px-3 py-1 rounded-full shadow-sm">
                    Organization ID: {organization._id}
                  </span>
                  {minimumContribution > 0 && (
                    <span className="text-sm bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 px-3 py-1 rounded-full shadow-sm">
                      Min. Contribution: ₹{minimumContribution.toLocaleString()}
                    </span>
                  )}
                  {hasExistingProfile && (
                    <span className="text-sm bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-3 py-1 rounded-full shadow-sm">
                      ✓ Profile Pre-filled
                    </span>
                  )}
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="hidden lg:flex flex-col items-end space-y-2 text-sm text-gray-600">
                <div className="text-right">
                  <div className="font-semibold text-gray-800">Organization</div>
                  <div className="text-blue-600">{organization.name}</div>
                </div>
                {organization.sponsorship?.contactEmail && (
                  <div className="text-right">
                    <div className="font-semibold text-gray-800">Contact</div>
                    <div className="text-blue-600">{organization.sponsorship.contactEmail}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Application Process Overview */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
              Application Process Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</div>
                  <h4 className="font-semibold text-gray-800">Sponsor Information</h4>
                </div>
                <p className="text-sm text-gray-600">Tell us about yourself or your organization</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</div>
                  <h4 className="font-semibold text-gray-800">Sponsorship Details</h4>
                </div>
                <p className="text-sm text-gray-600">Describe what you're offering and its value</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">3</div>
                  <h4 className="font-semibold text-gray-800">Recognition & Additional Info</h4>
                </div>
                <p className="text-sm text-gray-600">Choose recognition preferences and provide additional details</p>
              </div>
            </div>
            
            {minimumContribution > 0 && (
              <div className="mt-4 p-3 bg-gradient-to-r from-orange-100 to-red-100 border border-orange-300 rounded-lg">
                <p className="text-orange-800 text-sm">
                  💡 <strong>Note:</strong> This organization requires a minimum contribution of ₹{minimumContribution.toLocaleString()}. 
                  Please ensure your estimated value meets this requirement.
                </p>
              </div>
            )}
            
            <div className="mt-4 p-3 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 rounded-lg">
              <p className="text-green-800 text-sm">
                📋 After submission, our team will review your application and contact you within 2-3 business days.
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    currentStep >= step 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-20 h-1 mx-3 transition-all duration-300 ${
                      currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span className="font-medium">Sponsor Details</span>
              <span className="font-medium">Sponsorship Details</span>
              <span className="font-medium">Additional Info</span>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-blue-800 flex items-center">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
              Application Form
            </h3>
            <p className="text-blue-700 text-sm mt-1">
              Complete all required fields to submit your sponsorship application
            </p>
          </div>
          
          <div className="p-6">
            {/* Step 1: Sponsor Details */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Sponsor Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="sponsor.name"
                      value={formData.sponsor.name || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your full name"
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="sponsor.email"
                      value={formData.sponsor.email || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your email address"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="sponsor.phone"
                      value={formData.sponsor.phone || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your phone number"
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sponsor Type
                    </label>
                    <select
                      name="sponsor.sponsorType"
                      value={formData.sponsor.sponsorType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="business">Business/Organization</option>
                      <option value="individual">Individual</option>
                    </select>
                    <p className="text-sm text-gray-500 mt-1">
                      Choose whether you're representing a business/organization or sponsoring as an individual
                    </p>
                  </div>
                </div>

                {formData.sponsor.sponsorType === 'business' ? (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-900">Business Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Business Website
                        </label>
                        <input
                          type="url"
                          name="sponsor.business.website"
                          value={formData.sponsor.business.website || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Business Name *
                        </label>
                        <input
                          type="text"
                          name="sponsor.business.name"
                          value={formData.sponsor.business.name || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter business name"
                        />
                        {errors.businessName && <p className="text-red-500 text-sm mt-1">{errors.businessName}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Industry *
                        </label>
                        <input
                          type="text"
                          name="sponsor.business.industry"
                          value={formData.sponsor.business.industry || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Technology, Healthcare, Education"
                        />
                        {errors.industry && <p className="text-red-500 text-sm mt-1">{errors.industry}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Description
                      </label>
                      <textarea
                        name="sponsor.business.description"
                        value={formData.sponsor.business.description || ''}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Brief description of your business..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-900">Individual Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Profession *
                        </label>
                        <input
                          type="text"
                          name="sponsor.individual.profession"
                          value={formData.sponsor.individual.profession || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Doctor, Engineer, Teacher"
                        />
                        {errors.profession && <p className="text-red-500 text-sm mt-1">{errors.profession}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Organization
                        </label>
                        <input
                          type="text"
                          name="sponsor.individual.organization"
                          value={formData.sponsor.individual.organization || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Where you work (optional)"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Designation
                        </label>
                        <input
                          type="text"
                          name="sponsor.individual.designation"
                          value={formData.sponsor.individual.designation || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Senior Manager, Director"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Location</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        name="sponsor.location.city"
                        value={formData.sponsor.location.city || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter city"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        name="sponsor.location.state"
                        value={formData.sponsor.location.state || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter state"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        name="sponsor.location.country"
                        value={formData.sponsor.location.country || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter country"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Sponsorship Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Sponsorship Details</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sponsorship Description *
                  </label>
                  <textarea
                    name="sponsorship.description"
                    value={formData.sponsorship.description || ''}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe your sponsorship proposal and how it will benefit the organization..."
                  />
                  {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Value (INR) *
                    </label>
                    <input
                      type="number"
                      name="sponsorship.estimatedValue"
                      value={formData.sponsorship.estimatedValue || ''}
                      onChange={handleChange}
                      min={minimumContribution > 0 ? minimumContribution : 0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Enter estimated value${minimumContribution > 0 ? ` (min: ₹${minimumContribution.toLocaleString()})` : ''}`}
                    />
                    {minimumContribution > 0 && (
                      <p className="text-sm text-blue-600 mt-1">
                        💡 Minimum contribution required: ₹{minimumContribution.toLocaleString()}
                      </p>
                    )}
                    {errors.estimatedValue && <p className="text-red-500 text-sm mt-1">{errors.estimatedValue}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <select
                      name="sponsorship.currency"
                      value={formData.sponsorship.currency || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="INR">Indian Rupee (INR)</option>
                      <option value="USD">US Dollar (USD)</option>
                      <option value="EUR">Euro (EUR)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sponsorship Type
                  </label>
                  <select
                    name="sponsorship.type"
                    value={formData.sponsorship.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="monetary">💰 Monetary (Cash/Financial Support)</option>
                    <option value="goods">📦 Goods/Services (Products, Equipment, Materials)</option>
                    <option value="service">🛠️ Professional Services (Expertise, Skills, Time)</option>
                    <option value="media">📢 Media/Advertising (Promotion, Marketing Support)</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    Select the type of sponsorship you're offering. This helps us understand your contribution better.
                  </p>
                </div>

                {formData.sponsorship.type === 'monetary' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-900">Monetary Sponsorship</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Amount (INR) *
                        </label>
                        <input
                          type="number"
                          name="sponsorship.monetary.amount"
                          value={formData.sponsorship.monetary.amount || ''}
                          onChange={handleChange}
                          min={minimumContribution > 0 ? minimumContribution : 0}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Enter amount${minimumContribution > 0 ? ` (min: ₹${minimumContribution.toLocaleString()})` : ''}`}
                        />
                        {minimumContribution > 0 && (
                          <p className="text-sm text-blue-600 mt-1">
                            💡 Minimum contribution required: ₹{minimumContribution.toLocaleString()}
                          </p>
                        )}
                        {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Method
                        </label>
                        <select
                          name="sponsorship.monetary.paymentMethod"
                          value={formData.sponsorship.monetary.paymentMethod || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select payment method</option>
                          <option value="bank_transfer">🏦 Bank Transfer (NEFT/RTGS/IMPS)</option>
                          <option value="cheque">📄 Cheque (Post-dated or immediate)</option>
                          <option value="online_payment">💳 Online Payment (UPI/Card/Net Banking)</option>
                          <option value="cash">💵 Cash (For smaller amounts)</option>
                        </select>
                        <p className="text-sm text-gray-500 mt-1">
                          Choose your preferred payment method. We'll coordinate the details after approval.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Timeline
                      </label>
                      <select
                        name="sponsorship.monetary.paymentTimeline"
                        value={formData.sponsorship.monetary.paymentTimeline || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select payment timeline</option>
                        <option value="immediate">Immediate</option>
                        <option value="within_week">Within 1 week</option>
                        <option value="within_month">Within 1 month</option>
                        <option value="before_event">Before event</option>
                        <option value="after_event">After event</option>
                      </select>
                      <p className="text-sm text-gray-500 mt-1">
                        When would you like to make the payment?
                      </p>
                    </div>
                  </div>
                )}

                {formData.sponsorship.type === 'goods' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-900">Goods/Services Sponsorship</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Items/Services
                      </label>
                      <input
                        type="text"
                        name="sponsorship.goods.items"
                        value={formData.sponsorship.goods.items?.join(', ') || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          const items = value.split(',').map(item => item.trim()).filter(item => item);
                          setFormData(prev => ({
                            ...prev,
                            sponsorship: {
                              ...prev.sponsorship,
                              goods: {
                                ...prev.sponsorship.goods,
                                items
                              }
                            }
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., T-shirts, Banners, Food items (comma separated)"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity
                        </label>
                        <input
                          type="text"
                          name="sponsorship.goods.quantity"
                          value={formData.sponsorship.goods.quantity || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., 100 pieces, 50 kg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Delivery Timeline
                        </label>
                        <input
                          type="text"
                          name="sponsorship.goods.deliveryTimeline"
                          value={formData.sponsorship.goods.deliveryTimeline || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., 1 week before event"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {formData.sponsorship.type === 'service' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-900">Professional Services</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Service Type
                        </label>
                        <input
                          type="text"
                          name="sponsorship.service.serviceType"
                          value={formData.sponsorship.service.serviceType || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Legal consultation, Marketing support"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration
                        </label>
                        <input
                          type="text"
                          name="sponsorship.service.duration"
                          value={formData.sponsorship.service.duration || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., 6 months, 1 year"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expertise Area
                      </label>
                      <input
                        type="text"
                        name="sponsorship.service.expertise"
                        value={formData.sponsorship.service.expertise || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Digital marketing, Legal compliance"
                      />
                    </div>
                  </div>
                )}

                {formData.sponsorship.type === 'media' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-900">Media/Advertising</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reach/Audience
                        </label>
                        <input
                          type="text"
                          name="sponsorship.media.reach"
                          value={formData.sponsorship.media.reach || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., 10,000 followers, 50,000 readers"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration
                        </label>
                        <input
                          type="text"
                          name="sponsorship.media.duration"
                          value={formData.sponsorship.media.duration || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., 1 month, 3 months"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Platforms
                      </label>
                      <input
                        type="text"
                        name="sponsorship.media.platforms"
                        value={formData.sponsorship.media.platforms?.join(', ') || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          const platforms = value.split(',').map(platform => platform.trim()).filter(platform => platform);
                          setFormData(prev => ({
                            ...prev,
                            sponsorship: {
                              ...prev.sponsorship,
                              media: {
                                ...prev.sponsorship.media,
                                platforms
                              }
                            }
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Instagram, Facebook, YouTube (comma separated)"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Recognition & Additional Info */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recognition & Additional Information</h2>
                
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Recognition Preferences</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    💡 <strong>Note:</strong> Recognition levels are based on your actual contribution value and are automatically calculated. 
                    This preference helps us understand your visibility requirements.
                  </p>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Recognition Level
                    </label>
                    <select
                      name="recognition.recognitionLevel"
                      value={formData.recognition.recognitionLevel || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select recognition level (optional)</option>
                      <option value="high">🌟 High Visibility - Logo prominently displayed, social media mentions, website acknowledgment</option>
                      <option value="medium">⭐ Medium Visibility - Logo displayed, social media mentions</option>
                      <option value="low">✨ Low Visibility - Website acknowledgment only</option>
                      <option value="minimal">💫 Minimal Recognition - Simple thank you mention</option>
                    </select>
                    <p className="text-sm text-gray-500 mt-1">
                      Choose your preferred level of recognition. This helps us understand your visibility preferences.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Recognition Requests
                    </label>
                    <textarea
                      name="recognition.additionalRequests"
                      value={formData.recognition.additionalRequests || ''}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any specific recognition requests..."
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        How did you hear about us?
                      </label>
                      <select
                        name="additionalInfo.howDidYouHear"
                        value={formData.additionalInfo.howDidYouHear || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select option</option>
                        <option value="social_media">📱 Social Media (Instagram, Facebook, etc.)</option>
                        <option value="website">🌐 Website (Our official website)</option>
                        <option value="referral">👥 Referral (Friend, colleague, partner)</option>
                        <option value="event">🎉 Previous Event (Attended our past events)</option>
                        <option value="search">🔍 Search Engine (Google, Bing, etc.)</option>
                        <option value="other">📋 Other (Please specify in notes)</option>
                      </select>
                      <p className="text-sm text-gray-500 mt-1">
                        This helps us understand which channels are most effective for reaching potential sponsors
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timeline
                      </label>
                      <select
                        name="additionalInfo.timeline"
                        value={formData.additionalInfo.timeline || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select timeline</option>
                        <option value="immediate">Immediate</option>
                        <option value="within_week">Within 1 week</option>
                        <option value="within_month">Within 1 month</option>
                        <option value="before_event">Before event</option>
                        <option value="after_event">After event</option>
                      </select>
                      <p className="text-sm text-gray-500 mt-1">
                        When would you like to provide this sponsorship? This helps us plan accordingly.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Previous Sponsorship Experience
                    </label>
                    <textarea
                      name="additionalInfo.previousExperience"
                      value={formData.additionalInfo.previousExperience || ''}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe any previous sponsorship experience..."
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Tell us about any previous events or organizations you've sponsored. This helps us understand your experience level.
                    </p>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Special Requirements
                    </label>
                    <textarea
                      name="additionalInfo.specialRequirements"
                      value={formData.additionalInfo.specialRequirements || ''}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any special requirements or considerations..."
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Any specific requirements for your sponsorship? (e.g., specific event dates, delivery methods, special arrangements)
                    </p>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Questions or Comments
                    </label>
                    <textarea
                      name="additionalInfo.questions"
                      value={formData.additionalInfo.questions || ''}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any questions or additional comments..."
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Have questions about the sponsorship process? Feel free to ask here and we'll get back to you.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Buttons - Bottom */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-between">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md font-medium ${
              currentStep === 1
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700'
            }`}
          >
            Previous
          </button>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate(`/organization/${organizationId}`)}
              className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 transform hover:scale-105 shadow-md font-medium"
            >
              Cancel Application
            </button>
            
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-md font-medium"
              >
                Next Step
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className={`px-8 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md font-medium ${
                  submitting
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800'
                }`}
              >
                {submitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Submitting Application...
                  </div>
                ) : (
                  'Submit Application'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Page Loader for Form Submission */}
        <FullScreenLoader
          isVisible={submitting}
          message="Submitting Sponsorship Application..."
          showProgress={false}
        />
      </div>
    </div>
  );
} 