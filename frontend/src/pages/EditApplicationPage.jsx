import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sponsorshipIntentAPI } from '../api';
import Navbar from '../components/layout/Navbar';
import { showAlert } from '../utils/notifications';
import { FullScreenLoader } from '../components/common/LoaderComponents';

export default function EditApplicationPage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    sponsor: {
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
        paymentMethod: 'bank_transfer'
      },
      goods: {
        items: [],
        description: ''
      },
      service: {
        services: [],
        description: ''
      },
      media: {
        platforms: [],
        description: ''
      }
    },
    recognition: {
      recognitionLevel: 'medium',
      specificBenefits: [],
      additionalRequests: ''
    },
    additionalInfo: {
      previousExperience: '',
      motivation: '',
      timeline: '',
      specialRequirements: '',
      howDidYouHear: '',
      questions: ''
    }
  });

  useEffect(() => {
    fetchApplication();
  }, [applicationId]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const response = await sponsorshipIntentAPI.getIntentById(applicationId);
      setApplication(response);
      
      // Pre-fill form with existing data
      if (response) {
        setFormData({
          sponsor: {
            user: response.sponsor.user, // Preserve the user ID
            name: response.sponsor.name || '',
            email: response.sponsor.email || '',
            phone: response.sponsor.phone || '',
            sponsorType: response.sponsor.sponsorType || 'business',
            business: response.sponsor.business || {
              name: '',
              industry: '',
              website: '',
              description: ''
            },
            individual: response.sponsor.individual || {
              profession: '',
              organization: '',
              designation: ''
            },
            location: response.sponsor.location || {
              city: '',
              state: '',
              country: 'India'
            }
          },
          sponsorship: {
            type: response.sponsorship.type || 'monetary',
            description: response.sponsorship.description || '',
            estimatedValue: response.sponsorship.estimatedValue || '',
            currency: response.sponsorship.currency || 'INR',
            monetary: response.sponsorship.monetary || {
              amount: '',
              paymentMethod: 'bank_transfer'
            },
            goods: response.sponsorship.goods || {
              items: [],
              description: ''
            },
            service: response.sponsorship.service || {
              services: [],
              description: ''
            },
            media: response.sponsorship.media || {
              platforms: [],
              description: ''
            }
          },
          recognition: {
            recognitionLevel: response.recognition?.recognitionLevel || 'medium',
            specificBenefits: response.recognition?.specificBenefits || [],
            additionalRequests: response.recognition?.additionalRequests || ''
          },
          additionalInfo: {
            previousExperience: response.additionalInfo?.previousExperience || '',
            motivation: response.additionalInfo?.motivation || '',
            timeline: response.additionalInfo?.timeline || '',
            specialRequirements: response.additionalInfo?.specialRequirements || '',
            howDidYouHear: response.additionalInfo?.howDidYouHear || '',
            questions: response.additionalInfo?.questions || ''
          }
        });
      }
    } catch (error) {
      console.error('Error fetching application:', error);
      showAlert.error('Failed to load application. Please try again.');
    } finally {
      setLoading(false);
    }
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
    switch (step) {
      case 1:
        return formData.sponsor.name && formData.sponsor.email && formData.sponsor.phone;
      case 2:
        return formData.sponsorship.description && formData.sponsorship.estimatedValue;
      case 3:
        return true; // Recognition step is optional
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      showAlert.warning('Please fill in all required fields.');
      return;
    }

    try {
      setSaving(true);
      
      const submitData = {
        ...formData,
        organizationId: application.organization._id,
        eventId: application.event?._id || null
      };

      // Use the formatIntentData function to properly format the data
      const formattedData = sponsorshipIntentAPI.formatIntentData(submitData);
      
      await sponsorshipIntentAPI.updateIntent(applicationId, formattedData);
      
      showAlert.success('Application updated successfully!');
      navigate('/my-applications');
    } catch (error) {
      console.error('Error updating application:', error);
      showAlert.error('Failed to update application. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading application...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Application Not Found</h1>
            <p className="text-gray-600">The application you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mt-10 bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Edit Application
              </h1>
              <p className="text-gray-600 mb-4">
                Update your sponsorship application for {application.organization?.name}
              </p>
              
              {/* Admin Feedback Display */}
              {application.review && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-medium text-yellow-900 mb-2">📝 Admin Feedback</h3>
                  <div className="text-sm text-yellow-800 space-y-2">
                    <p><strong>Decision:</strong> {application.review.decision?.replace('_', ' ').toUpperCase()}</p>
                    {application.review.reviewNotes && (
                      <p><strong>Review Notes:</strong> {application.review.reviewNotes}</p>
                    )}
                    {application.review.adminNotes && (
                      <p><strong>Admin Notes:</strong> {application.review.adminNotes}</p>
                    )}
                    <p className="text-xs mt-2">Please review the feedback above and update your application accordingly.</p>
                  </div>
                </div>
              )}

              {/* Progress Steps */}
              <div className="flex items-center justify-center mb-8">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step <= currentStep 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {step}
                    </div>
                    {step < 3 && (
                      <div className={`w-16 h-1 mx-2 ${
                        step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                      }`}></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <div className="space-y-6">
              {currentStep === 1 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 1: Sponsor Information</h2>
                  
                  {/* Sponsor Type */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sponsor Type *</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                        <input
                          type="radio"
                          name="sponsor.sponsorType"
                          value="business"
                          checked={formData.sponsor.sponsorType === 'business'}
                          onChange={handleChange}
                          className="mr-3"
                        />
                        <div>
                          <div className="font-medium text-gray-900">Business Sponsor</div>
                          <div className="text-sm text-gray-600">Companies, organizations, or enterprises</div>
                        </div>
                      </label>
                      <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                        <input
                          type="radio"
                          name="sponsor.sponsorType"
                          value="individual"
                          checked={formData.sponsor.sponsorType === 'individual'}
                          onChange={handleChange}
                          className="mr-3"
                        />
                        <div>
                          <div className="font-medium text-gray-900">Individual Sponsor</div>
                          <div className="text-sm text-gray-600">Personal sponsorships and donations</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Person *
                      </label>
                      <input
                        type="text"
                        name="sponsor.name"
                        value={formData.sponsor.name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Full name of contact person"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="sponsor.email"
                        value={formData.sponsor.email}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="contact@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        name="sponsor.phone"
                        value={formData.sponsor.phone}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  {/* Business/Individual Details */}
                  {formData.sponsor.sponsorType === 'business' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Business Name
                        </label>
                        <input
                          type="text"
                          name="sponsor.business.name"
                          value={formData.sponsor.business.name}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Company name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Industry
                        </label>
                        <input
                          type="text"
                          name="sponsor.business.industry"
                          value={formData.sponsor.business.industry}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Technology, Healthcare, etc."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Website
                        </label>
                        <input
                          type="url"
                          name="sponsor.business.website"
                          value={formData.sponsor.business.website}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://www.example.com"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Profession
                        </label>
                        <input
                          type="text"
                          name="sponsor.individual.profession"
                          value={formData.sponsor.individual.profession}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Software Engineer, Doctor, etc."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Organization
                        </label>
                        <input
                          type="text"
                          name="sponsor.individual.organization"
                          value={formData.sponsor.individual.organization}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Current organization"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Designation
                        </label>
                        <input
                          type="text"
                          name="sponsor.individual.designation"
                          value={formData.sponsor.individual.designation}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Senior Manager, Director"
                        />
                      </div>
                    </div>
                  )}

                  {/* Location Information */}
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
                          value={formData.sponsor.location.city}
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
                          value={formData.sponsor.location.state}
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
                          value={formData.sponsor.location.country}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter country"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 2: Sponsorship Details</h2>
                  
                  {/* Sponsorship Type */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sponsorship Type *</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {['monetary', 'goods', 'service', 'media'].map((type) => (
                        <label key={type} className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                          <input
                            type="radio"
                            name="sponsorship.type"
                            value={type}
                            checked={formData.sponsorship.type === type}
                            onChange={handleChange}
                            className="mr-3"
                          />
                          <div>
                            <div className="font-medium text-gray-900 capitalize">{type}</div>
                            <div className="text-sm text-gray-600">
                              {type === 'monetary' && 'Cash or bank transfer'}
                              {type === 'goods' && 'Products, equipment, or materials'}
                              {type === 'service' && 'Professional services or expertise'}
                              {type === 'media' && 'Advertising, promotion, or publicity'}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      name="sponsorship.description"
                      value={formData.sponsorship.description}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe your sponsorship offer in detail..."
                    />
                  </div>

                  {/* Estimated Value */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estimated Value *
                      </label>
                      <input
                        type="number"
                        name="sponsorship.estimatedValue"
                        value={formData.sponsorship.estimatedValue}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="5000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Currency
                      </label>
                      <select
                        name="sponsorship.currency"
                        value={formData.sponsorship.currency}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="INR">Indian Rupee (₹)</option>
                        <option value="USD">US Dollar ($)</option>
                        <option value="EUR">Euro (€)</option>
                      </select>
                    </div>
                  </div>

                  {/* Type-specific fields */}
                  {formData.sponsorship.type === 'monetary' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-medium text-gray-900">Monetary Sponsorship Details</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Amount *
                          </label>
                          <input
                            type="number"
                            name="sponsorship.monetary.amount"
                            value={formData.sponsorship.monetary.amount}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter amount"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Payment Method
                          </label>
                          <select
                            name="sponsorship.monetary.paymentMethod"
                            value={formData.sponsorship.monetary.paymentMethod}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cheque">Cheque</option>
                            <option value="online_payment">Online Payment</option>
                            <option value="cash">Cash</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Timeline
                        </label>
                        <select
                          name="sponsorship.monetary.paymentTimeline"
                          value={formData.sponsorship.monetary.paymentTimeline}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="immediate">Immediate</option>
                          <option value="within_week">Within 1 week</option>
                          <option value="within_month">Within 1 month</option>
                          <option value="before_event">Before event</option>
                          <option value="after_event">After event</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {formData.sponsorship.type === 'goods' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-medium text-gray-900">Goods/Services Sponsorship</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Items/Services *
                        </label>
                        <input
                          type="text"
                          name="sponsorship.goods.items"
                          value={formData.sponsorship.goods.items.join(', ')}
                          onChange={(e) => {
                            const items = e.target.value.split(',').map(item => item.trim()).filter(item => item);
                            setFormData(prev => ({
                              ...prev,
                              sponsorship: {
                                ...prev.sponsorship,
                                goods: {
                                  ...prev.sponsorship.goods,
                                  items: items
                                }
                              }
                            }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., T-shirts, banners, equipment (separate with commas)"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          name="sponsorship.goods.description"
                          value={formData.sponsorship.goods.description}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Describe the goods/services you're offering..."
                        />
                      </div>
                    </div>
                  )}

                  {formData.sponsorship.type === 'service' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-medium text-gray-900">Professional Services</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Services Offered *
                        </label>
                        <input
                          type="text"
                          name="sponsorship.service.services"
                          value={formData.sponsorship.service.services.join(', ')}
                          onChange={(e) => {
                            const services = e.target.value.split(',').map(service => service.trim()).filter(service => service);
                            setFormData(prev => ({
                              ...prev,
                              sponsorship: {
                                ...prev.sponsorship,
                                service: {
                                  ...prev.sponsorship.service,
                                  services: services
                                }
                              }
                            }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Design services, technical support (separate with commas)"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          name="sponsorship.service.description"
                          value={formData.sponsorship.service.description}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Describe the services you're offering..."
                        />
                      </div>
                    </div>
                  )}

                  {formData.sponsorship.type === 'media' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-medium text-gray-900">Media & Advertising</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Platforms *
                        </label>
                        <input
                          type="text"
                          name="sponsorship.media.platforms"
                          value={formData.sponsorship.media.platforms.join(', ')}
                          onChange={(e) => {
                            const platforms = e.target.value.split(',').map(platform => platform.trim()).filter(platform => platform);
                            setFormData(prev => ({
                              ...prev,
                              sponsorship: {
                                ...prev.sponsorship,
                                media: {
                                  ...prev.sponsorship.media,
                                  platforms: platforms
                                }
                              }
                            }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Social media, website, print media (separate with commas)"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          name="sponsorship.media.description"
                          value={formData.sponsorship.media.description}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Describe the media/advertising support you're offering..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 3 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 3: Recognition & Additional Info</h2>
                  
                  {/* Recognition Preferences */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Recognition Preferences</h3>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preferred Recognition Level
                      </label>
                      <select
                        name="recognition.recognitionLevel"
                        value={formData.recognition.recognitionLevel}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="high">High Visibility</option>
                        <option value="medium">Medium Visibility</option>
                        <option value="low">Low Visibility</option>
                        <option value="minimal">Minimal Recognition</option>
                      </select>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Recognition Requests
                      </label>
                      <textarea
                        name="recognition.additionalRequests"
                        value={formData.recognition.additionalRequests}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Any specific recognition requests..."
                      />
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Additional Information</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          How did you hear about us?
                        </label>
                        <select
                          name="additionalInfo.howDidYouHear"
                          value={formData.additionalInfo.howDidYouHear}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select an option</option>
                          <option value="social_media">Social Media</option>
                          <option value="website">Website</option>
                          <option value="referral">Referral</option>
                          <option value="event">Previous Event</option>
                          <option value="advertisement">Advertisement</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Previous Sponsorship Experience
                        </label>
                        <textarea
                          name="additionalInfo.previousExperience"
                          value={formData.additionalInfo.previousExperience}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Describe any previous sponsorship experience..."
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Motivation for Sponsorship
                        </label>
                        <textarea
                          name="additionalInfo.motivation"
                          value={formData.additionalInfo.motivation}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Why do you want to sponsor this event/organization?"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Timeline
                        </label>
                        <select
                          name="additionalInfo.timeline"
                          value={formData.additionalInfo.timeline}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select a timeline</option>
                          <option value="immediate">Immediate</option>
                          <option value="within_week">Within 1 week</option>
                          <option value="within_month">Within 1 month</option>
                          <option value="before_event">Before event</option>
                          <option value="after_event">After event</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Special Requirements
                        </label>
                        <textarea
                          name="additionalInfo.specialRequirements"
                          value={formData.additionalInfo.specialRequirements}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Any special requirements or conditions..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Questions or Comments
                        </label>
                        <textarea
                          name="additionalInfo.questions"
                          value={formData.additionalInfo.questions}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Any questions or additional comments..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className={`px-6 py-2 rounded-lg transition-colors ${
                  currentStep === 1
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                Previous
              </button>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => navigate('/my-applications')}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                
                {currentStep < 3 ? (
                  <button
                    onClick={handleNext}
                    disabled={!validateStep(currentStep)}
                    className={`px-6 py-2 rounded-lg transition-colors ${
                      !validateStep(currentStep)
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={saving || !validateStep(currentStep)}
                    className={`px-6 py-2 rounded-lg transition-colors ${
                      saving || !validateStep(currentStep)
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {saving ? 'Updating...' : 'Update Application'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page Loader for Form Submission */}
        <FullScreenLoader
          isVisible={saving}
          message="Updating Application..."
          showProgress={false}
        />
      </div>
    </div>
  );
} 