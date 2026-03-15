import React, { useState, useEffect } from 'react';
import { showAlert, showConfirm } from '../../utils/notifications';
import sponsorAPI from '../../api/sponsor';
import { SubmitButton, FullScreenLoader, UploadProgress } from '../common/LoaderComponents';

const SponsorProfileForm = ({ existingSponsor, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    sponsorType: 'business',
    contactPerson: '',
    email: '',
    phone: '',
    location: {
      city: '',
      state: '',
      country: 'India'
    },
    socialLinks: {
      website: '',
      linkedin: '',
      twitter: '',
      facebook: '',
      instagram: ''
    },
    preferences: {
      focusAreas: [],
      preferredContributionType: [],
      notes: ''
    },
    business: {
      name: '',
      industry: '',
      website: '',
      description: '',
      yearEstablished: '',
      employeeCount: ''
    },
    individual: {
      profession: '',
      organization: '',
      designation: '',
      description: ''
    }
  });

  const [files, setFiles] = useState({
    logo: null,
    gstCertificate: null,
    panCard: null,
    companyRegistration: null
  });

  const [existingFiles, setExistingFiles] = useState({
    logo: null,
    gstCertificate: null,
    panCard: null,
    companyRegistration: null
  });

  const [removedFiles, setRemovedFiles] = useState({
    logo: false,
    gstCertificate: false,
    panCard: false,
    companyRegistration: false
  });

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({});
  const [errors, setErrors] = useState({});

  const focusAreaOptions = [
    'Environmental Conservation',
    'Education & Literacy',
    'Healthcare & Medical',
    'Poverty Alleviation',
    'Women Empowerment',
    'Child Welfare',
    'Animal Welfare',
    'Disaster Relief',
    'Community Development',
    'Arts & Culture',
    'Sports & Recreation',
    'Technology & Innovation',
    'Agriculture & Rural Development',
    'Mental Health',
    'Disability Support'
  ];



  const contributionTypeOptions = [
    'monetary',
    'goods',
    'service',
    'media'
  ];

  // Initialize form data when existingSponsor changes
  useEffect(() => {
    if (existingSponsor) {
      // Set form data
      setFormData({
        sponsorType: existingSponsor.sponsorType || 'business',
        contactPerson: existingSponsor.contactPerson || '',
        email: existingSponsor.email || '',
        phone: existingSponsor.phone || '',
        location: {
          city: existingSponsor.location?.city || '',
          state: existingSponsor.location?.state || '',
          country: existingSponsor.location?.country || 'India'
        },
        socialLinks: {
          website: existingSponsor.socialLinks?.website || '',
          linkedin: existingSponsor.socialLinks?.linkedin || '',
          twitter: existingSponsor.socialLinks?.twitter || '',
          facebook: existingSponsor.socialLinks?.facebook || '',
          instagram: existingSponsor.socialLinks?.instagram || ''
        },
        preferences: {
          focusAreas: existingSponsor.preferences?.focusAreas || [], 
          preferredContributionType: existingSponsor.preferences?.preferredContributionType || [], 
          notes: existingSponsor.preferences?.notes || ''
        },
        business: {
          name: existingSponsor.business?.name || '',
          industry: existingSponsor.business?.industry || '',
          website: existingSponsor.business?.website || '',
          description: existingSponsor.business?.description || '', 
          yearEstablished: existingSponsor.business?.yearEstablished || '',
          employeeCount: existingSponsor.business?.employeeCount || ''
        },
        individual: {
          profession: existingSponsor.individual?.profession || '',
          organization: existingSponsor.individual?.organization || '',
          designation: existingSponsor.individual?.designation || '',
          description: existingSponsor.individual?.description || ''
        }
      });

      // Set existing files for editing
      if (existingSponsor.business) {
        const existingFilesData = {
          logo: existingSponsor.business.logo || null,
          gstCertificate: existingSponsor.business.documents?.gstCertificate || null,
          panCard: existingSponsor.business.documents?.panCard || null,
          companyRegistration: existingSponsor.business.documents?.companyRegistration || null
        };
        
        setExistingFiles(existingFilesData);
      } else {
        setExistingFiles({
          logo: null,
          gstCertificate: null,
          panCard: null,
          companyRegistration: null
        });
      }

      // Reset temporary states when editing
      setFiles({});
      setRemovedFiles({});
      setUploadProgress({});
      setUploadStatus({});
    }
  }, [existingSponsor]);

  // Reset only temporary file states (preserves existingFiles for prefilling)
  const resetTemporaryFileStates = () => {
    setFiles({});
    setRemovedFiles({});
    setUploadProgress({});
    setUploadStatus({});
  };

  // Reset file states when form is cancelled
  const resetFileStates = () => {
    setFiles({});
    setRemovedFiles({});
    setUploadProgress({});
    setUploadStatus({});
  };

  // Retry failed upload
  const retryUpload = (fileType) => {
    const currentFile = files[fileType];
    if (currentFile) {
      // Remove the failed upload and start fresh
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[currentFile.name];
        return newProgress;
      });
      
      setUploadStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[currentFile.name];
        return newStatus;
      });
      
      // Retry the upload
      handleFileSelect(fileType, currentFile);
    }
  };

  // Reset file input values to ensure they can be reused
  const resetFileInput = (fileType) => {
    const fileInput = document.querySelector(`input[type="file"][key*="${fileType}"]`);
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('location.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        location: { ...prev.location, [field]: value }
      }));
    } else if (name.startsWith('socialLinks.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        socialLinks: { ...prev.socialLinks, [field]: value }
      }));
    } else if (name.startsWith('preferences.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        preferences: { ...prev.preferences, [field]: value }
      }));
    } else if (name.startsWith('business.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        business: { ...prev.business, [field]: value }
      }));
    } else if (name.startsWith('individual.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        individual: { ...prev.individual, [field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };



  // Handle file selection and start upload
  const handleFileSelect = async (fileType, file) => {
    if (!file) return;

    // Check if there's already a file of this type (either new or existing) and warn the user
    if (files[fileType] || existingFiles[fileType]) {
      const existingFileType = files[fileType] ? 'newly selected' : 'existing';
      
      showConfirm.warning(
        `You already have a ${fileType} file (${existingFileType}). Selecting a new file will replace the existing one. Do you want to continue?`,
        () => {
          // Continue with file selection - call the original logic directly
          handleFileSelectionDirect(file, fileType);
        },
        {
          title: '📁 File Conflict',
          confirmText: 'Yes, replace it',
          cancelText: 'Keep existing file'
        }
      );
      return;
    }

    // If no conflict, proceed directly
    handleFileSelectionDirect(file, fileType);
  };

  // Helper function to handle file selection logic
  const handleFileSelectionDirect = (file, fileType) => {
    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      if (typeof showAlert === 'function') {
        showAlert(`File ${file.name} is too large. Maximum size is 10MB.`);
      } else {
        console.error('showAlert is not defined:', showAlert);
      }
      return;
    }

    // Validate file type
    const allowedTypes = {
      logo: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
      gstCertificate: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
      panCard: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
      companyRegistration: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    };

    if (allowedTypes[fileType] && !allowedTypes[fileType].includes(file.type)) {
      if (typeof showAlert === 'function') {
        showAlert(`File ${file.name} is not a supported format for ${fileType}. Please use PDF or image files.`);
      } else {
        console.error('showAlert is not defined:', showAlert);
      }
      return;
    }

    const fileName = file.name;
    
    // Clear any existing file of the same type to ensure only one file per document type
    setFiles(prev => {
      const newFiles = { ...prev };
      // Remove any existing file of the same type
      if (newFiles[fileType]) {
        // Clear upload progress and status for the old file
        const oldFileName = newFiles[fileType].name;
        setUploadProgress(prevProgress => {
          const newProgress = { ...prevProgress };
          delete newProgress[oldFileName];
          return newProgress;
        });
        setUploadStatus(prevStatus => {
          const newStatus = { ...prevStatus };
          delete newStatus[oldFileName];
          return newStatus;
        });
      }
      // Set the new file
      newFiles[fileType] = file;
      return newFiles;
    });
    
    // Reset removedFiles state for this file type when adding a new file
    setRemovedFiles(prev => ({ ...prev, [fileType]: false }));
    
    // Initialize upload progress for this file
    setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
    setUploadStatus(prev => ({ ...prev, [fileName]: 'uploading' }));
    setIsUploading(true);

    try {
      // Simulate upload progress (in real implementation, this would come from Cloudinary)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[fileName] || 0;
          if (current >= 90) {
            clearInterval(progressInterval);
            return { ...prev, [fileName]: 90 };
          }
          return { ...prev, [fileName]: current + 10 };
        });
      }, 100);

      // Simulate file upload delay
      setTimeout(() => {
        try {
          // Clear the progress interval if it's still running
          clearInterval(progressInterval);
          
          // Mark upload as successful
          setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
          setUploadStatus(prev => ({ ...prev, [fileName]: 'completed' }));
          
          // Store the file
          // setFiles(prev => ({ ...prev, [fileType]: file })); // This line is now handled by the new logic
          
          // Check if all uploads are complete
          setTimeout(() => {
            const allComplete = Object.values(uploadStatus).every(status => 
              status === 'completed' || status === 'error'
            );
            if (allComplete) {
              setIsUploading(false);
            }
          }, 500);
          
        } catch (error) {
          console.error(`❌ Error in upload completion for ${fileName}:`, error);
          setUploadStatus(prev => ({ ...prev, [fileName]: 'error' }));
          if (typeof showAlert === 'function') {
            showAlert(`Failed to complete upload for ${fileName}. Please try again.`);
          } else {
            console.error('showAlert is not defined:', showAlert);
          }
        }
      }, 2000);

    } catch (error) {
      console.error(`❌ Error uploading file ${fileName}:`, error);
      setUploadStatus(prev => ({ ...prev, [fileName]: 'error' }));
      setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
      if (typeof showAlert === 'function') {
        showAlert(`Failed to start upload for ${fileName}. Please check your file and try again.`);
      } else {
        console.error('showAlert is not defined:', showAlert);
      }
      
      // Check if all uploads are complete
      setTimeout(() => {
        const allComplete = Object.values(uploadStatus).every(status => 
          status === 'completed' || status === 'error'
        );
        if (allComplete) {
          setIsUploading(false);
        }
      }, 500);
    }
  };

  // Handle file removal
  const handleFileRemove = (fileType) => {
    const currentFile = files[fileType];
    if (currentFile) {
      const fileName = currentFile.name;
      
      // Remove from upload progress and status
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fileName];
        return newProgress;
      });
      
      setUploadStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[fileName];
        return newStatus;
      });
    }
    
    // Clear the new file
    setFiles(prev => ({ ...prev, [fileType]: null }));
    
    // Mark this file as removed (for backend processing)
    setRemovedFiles(prev => ({ ...prev, [fileType]: true }));
    
    // Also clear any existing file to ensure preview is updated
    setExistingFiles(prev => ({ ...prev, [fileType]: null }));
    
    // Reset the file input to ensure it can be reused
    resetFileInput(fileType);
  };

  // Handle existing file removal
  const handleExistingFileRemove = (fileType) => {
    // Mark this file as removed (for backend processing)
    setRemovedFiles(prev => ({ ...prev, [fileType]: true }));
    
    // Don't clear existingFiles immediately - backend needs this info for deletion
    // setExistingFiles(prev => ({ ...prev, [fileType]: null }));
  };

  // Handle undoing file removal
  const handleUndoFileRemoval = (fileType) => {
    setRemovedFiles(prev => ({ ...prev, [fileType]: false }));
  };

  const handleCheckboxChange = (e) => {
    const { name, value, checked } = e.target;
    
    if (name === 'focusAreas') {
      setFormData(prev => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          focusAreas: checked 
            ? [...prev.preferences.focusAreas, value]
            : prev.preferences.focusAreas.filter(area => area !== value)
        }
      }));
    } else if (name === 'preferredContributionType') {
      setFormData(prev => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          preferredContributionType: checked 
            ? [...prev.preferences.preferredContributionType, value]
            : prev.preferences.preferredContributionType.filter(type => type !== value)
        }
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.contactPerson.trim()) {
      newErrors.contactPerson = 'Contact person is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (!formData.location.city.trim()) {
      newErrors['location.city'] = 'City is required';
    }
    if (!formData.location.state.trim()) {
      newErrors['location.state'] = 'State is required';
    }

    if (formData.sponsorType === 'business') {
      if (!formData.business.name.trim()) {
        newErrors['business.name'] = 'Business name is required';
      }
      if (!formData.business.industry.trim()) {
        newErrors['business.industry'] = 'Industry is required';
      }
    } else {
      if (!formData.individual.profession.trim()) {
        newErrors['individual.profession'] = 'Profession is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Check if any files are currently uploading
    if (isUploading) {
      if (typeof showAlert?.error === 'function') {
        showAlert.error('Please wait for all files to finish uploading before submitting');
      } else {
        console.error('showAlert.error is not defined:', showAlert?.error);
      }
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        files,
        removedFiles, // Send information about which files were removed
        existingFiles // Send existing file info for reference
      };

      if (existingSponsor) {
        await sponsorAPI.updateSponsor(existingSponsor._id, submitData);
      } else {
        await sponsorAPI.createSponsor(submitData);
      }

      // Reset only temporary file states, keep existingFiles for profile data
      resetTemporaryFileStates();
      onSuccess();
    } catch (error) {
      console.error('Error saving sponsor profile:', error);
      if (typeof showAlert?.error === 'function') {
        showAlert.error(error.message || 'Failed to save sponsor profile');
      } else {
        console.error('showAlert.error is not defined:', showAlert?.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-4xl mx-auto relative">
      {/* Close Button */}
      <button
        type="button"
        onClick={onCancel}
        disabled={loading || isUploading}
        className={`absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 focus:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center transition-all duration-200 hover:scale-105 ${
          loading || isUploading ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
        }`}
        aria-label="Close form"
        title="Close form"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {existingSponsor ? 'Update Sponsor Profile' : 'Become a Sponsor'}
        </h2>
        <p className="text-gray-600">
          {existingSponsor 
            ? 'Update your sponsor profile to continue supporting great causes'
            : 'Join our community of sponsors and make a difference in society'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Sponsor Type Selection */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sponsor Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
              <input
                type="radio"
                name="sponsorType"
                value="business"
                checked={formData.sponsorType === 'business'}
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
                name="sponsorType"
                value="individual"
                checked={formData.sponsorType === 'individual'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Person *
            </label>
            <input
              type="text"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.contactPerson ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Full name of contact person"
            />
            {errors.contactPerson && (
              <p className="text-red-500 text-sm mt-1">{errors.contactPerson}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="contact@example.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="+91-9876543210"
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website
            </label>
            <input
              type="url"
              name="socialLinks.website"
              value={formData.socialLinks.website}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.example.com"
            />
          </div>
        </div>

        {/* Location */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City *
            </label>
            <input
              type="text"
              name="location.city"
              value={formData.location.city}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors['location.city'] ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Mumbai"
            />
            {errors['location.city'] && (
              <p className="text-red-500 text-sm mt-1">{errors['location.city']}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State *
            </label>
            <input
              type="text"
              name="location.state"
              value={formData.location.state}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors['location.state'] ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Maharashtra"
            />
            {errors['location.state'] && (
              <p className="text-red-500 text-sm mt-1">{errors['location.state']}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <input
              type="text"
              name="location.country"
              value={formData.location.country}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="India"
            />
          </div>
        </div>

        {/* Business/Individual Specific Fields */}
        {formData.sponsorType === 'business' ? (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  name="business.name"
                  value={formData.business.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors['business.name'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="ABC Company Ltd."
                />
                {errors['business.name'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['business.name']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry *
                </label>
                <input
                  type="text"
                  name="business.industry"
                  value={formData.business.industry}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors['business.industry'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Technology, Healthcare, etc."
                />
                {errors['business.industry'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['business.industry']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year Established
                </label>
                <input
                  type="number"
                  name="business.yearEstablished"
                  value={formData.business.yearEstablished}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2020"
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee Count
                </label>
                <select
                  name="business.employeeCount"
                  value={formData.business.employeeCount}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Description
                </label>
                <textarea
                  name="business.description"
                  value={formData.business.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of your business..."
                />
              </div>
            </div>

            {/* File Upload Section */}
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-3">Business Documents</h4>
              
              {/* Logo Upload */}
              <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Logo
                  </label>
                
                {/* Show existing logo if available and not marked for removal */}
                {existingFiles.logo && !removedFiles.logo && (
                  <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={existingFiles.logo.url} 
                          alt="Current Logo" 
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Current Logo</p>
                          <p className="text-xs text-gray-600">{existingFiles.logo.filename}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExistingFileRemove('logo')}
                        className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Show message when logo is marked for removal */}
                {existingFiles.logo && removedFiles.logo && (
                  <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-red-100 rounded-lg border flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-red-900">Logo Marked for Removal</p>
                          <p className="text-xs text-red-600">Logo will be deleted when you save changes</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUndoFileRemoval('logo')}
                        className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50"
                      >
                        Undo
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Show new file being uploaded */}
                {files.logo && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-white rounded-lg border flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-900">New Logo Selected</p>
                          <p className="text-xs text-blue-600">{files.logo.name}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFileRemove('logo')}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {/* Show message when no logo is uploaded */}
                {!existingFiles.logo && !removedFiles.logo && !files.logo && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg border flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">No Business Logo Uploaded</p>
                        <p className="text-xs text-gray-600">Upload a business logo to enhance your profile</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* File input for new logo */}
                <div className="flex items-center space-x-4">
                  {existingFiles.logo && !removedFiles.logo && (
                    <p className="text-xs text-blue-600 mb-2">
                      💡 You can replace the current logo by selecting a new file below
                    </p>
                  )}
                  <input
                    key={`logo-${files.logo?.name || 'empty'}`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect('logo', e.target.files[0])}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {files.logo && (
                    <button
                      type="button"
                      onClick={() => handleFileRemove('logo')}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {files.logo && (
                  <p className="text-sm text-gray-600 mt-1">
                    New file: {files.logo.name}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Only one logo file is allowed. Selecting a new file will replace the existing one.
                </p>
                </div>

              {/* GST Certificate Upload */}
              <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GST Certificate
                  </label>
                
                {/* Show existing GST certificate if available */}
                {existingFiles.gstCertificate && !removedFiles.gstCertificate && (
                  <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-white rounded-lg border flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Current GST Certificate</p>
                          <p className="text-xs text-gray-600">{existingFiles.gstCertificate.filename}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExistingFileRemove('gstCertificate')}
                        className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Show message when GST certificate is marked for removal */}
                {existingFiles.gstCertificate && removedFiles.gstCertificate && (
                  <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-red-100 rounded-lg border flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-red-900">GST Certificate Marked for Removal</p>
                          <p className="text-xs text-red-600">GST Certificate will be deleted when you save changes</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUndoFileRemoval('gstCertificate')}
                        className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50"
                      >
                        Undo
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Show new file being uploaded */}
                {files.gstCertificate && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-white rounded-lg border flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-900">New GST Certificate Selected</p>
                          <p className="text-xs text-blue-600">{files.gstCertificate.name}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFileRemove('gstCertificate')}
                        className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {/* Show message when no GST certificate is uploaded */}
                {!existingFiles.gstCertificate && !removedFiles.gstCertificate && !files.gstCertificate && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg border flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">No GST Certificate Uploaded</p>
                        <p className="text-xs text-gray-600">Upload your GST certificate for verification</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* File input for new GST certificate */}
                <div className="flex items-center space-x-4">
                  {existingFiles.gstCertificate && !removedFiles.gstCertificate && (
                    <p className="text-xs text-blue-600 mb-2">
                      💡 You can replace the current GST Certificate by selecting a new file below
                    </p>
                  )}
                  <input
                    key={`gstCertificate-${files.gstCertificate?.name || 'empty'}`}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => handleFileSelect('gstCertificate', e.target.files[0])}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {files.gstCertificate && (
                    <button
                      type="button"
                      onClick={() => handleFileRemove('gstCertificate')}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {files.gstCertificate && (
                  <p className="text-sm text-gray-600 mt-1">
                    New file: {files.gstCertificate.name}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Only one GST Certificate file is allowed. Selecting a new file will replace the existing one.
                </p>
                </div>

              {/* PAN Card Upload */}
              <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PAN Card
                  </label>
                
                {/* Show existing PAN card if available */}
                {existingFiles.panCard && !removedFiles.panCard && (
                  <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-white rounded-lg border flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Current PAN Card</p>
                          <p className="text-xs text-gray-600">{existingFiles.panCard.filename}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExistingFileRemove('panCard')}
                        className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Show message when PAN card is marked for removal */}
                {existingFiles.panCard && removedFiles.panCard && (
                  <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-red-100 rounded-lg border flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-red-900">PAN Card Marked for Removal</p>
                          <p className="text-xs text-red-600">PAN Card will be deleted when you save changes</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUndoFileRemoval('panCard')}
                        className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50"
                      >
                        Undo
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Show new file being uploaded */}
                {files.panCard && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-white rounded-lg border flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-900">New PAN Card Selected</p>
                          <p className="text-xs text-blue-600">{files.panCard.name}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFileRemove('panCard')}
                        className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {/* Show message when no PAN card is uploaded */}
                {!existingFiles.panCard && !removedFiles.panCard && !files.panCard && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg border flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">No PAN Card Uploaded</p>
                        <p className="text-xs text-gray-600">Upload your PAN card for verification</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* File input for new PAN card */}
                <div className="flex items-center space-x-4">
                  {existingFiles.panCard && !removedFiles.panCard && (
                    <p className="text-xs text-blue-600 mb-2">
                      💡 You can replace the current PAN Card by selecting a new file below
                    </p>
                  )}
                  <input
                    key={`panCard-${files.panCard?.name || 'empty'}`}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => handleFileSelect('panCard', e.target.files[0])}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {files.panCard && (
                    <button
                      type="button"
                      onClick={() => handleFileRemove('panCard')}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {files.panCard && (
                  <p className="text-sm text-gray-600 mt-1">
                    New file: {files.panCard.name}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Only one PAN Card file is allowed. Selecting a new file will replace the existing one.
                </p>
                </div>

              {/* Company Registration Upload */}
              <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Registration
                  </label>
                
                {/* Show existing company registration if available */}
                {existingFiles.companyRegistration && !removedFiles.companyRegistration && (
                  <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-white rounded-lg border flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Current Company Registration</p>
                          <p className="text-xs text-gray-600">{existingFiles.companyRegistration.filename}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExistingFileRemove('companyRegistration')}
                        className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Show message when company registration is marked for removal */}
                {existingFiles.companyRegistration && removedFiles.companyRegistration && (
                  <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-red-100 rounded-lg border flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-red-900">Company Registration Marked for Removal</p>
                          <p className="text-xs text-red-600">Company Registration will be deleted when you save changes</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUndoFileRemoval('companyRegistration')}
                        className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50"
                      >
                        Undo
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Show new file being uploaded */}
                {files.companyRegistration && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-white rounded-lg border flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-900">New Company Registration Selected</p>
                          <p className="text-xs text-blue-600">{files.companyRegistration.name}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFileRemove('companyRegistration')}
                        className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {/* Show message when no company registration is uploaded */}
                {!existingFiles.companyRegistration && !removedFiles.companyRegistration && !files.companyRegistration && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg border flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">No Company Registration Uploaded</p>
                        <p className="text-xs text-gray-600">Upload your company registration document</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* File input for new company registration */}
                <div className="flex items-center space-x-4">
                  {existingFiles.companyRegistration && !removedFiles.companyRegistration && (
                    <p className="text-xs text-blue-600 mb-2">
                      💡 You can replace the current Company Registration by selecting a new file below
                    </p>
                  )}
                  <input
                    key={`companyRegistration-${files.companyRegistration?.name || 'empty'}`}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => handleFileSelect('companyRegistration', e.target.files[0])}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {files.companyRegistration && (
                    <button
                      type="button"
                      onClick={() => handleFileRemove('companyRegistration')}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {files.companyRegistration && (
                  <p className="text-sm text-gray-600 mt-1">
                    New file: {files.companyRegistration.name}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Only one Company Registration file is allowed. Selecting a new file will replace the existing one.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Individual Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profession
                </label>
                <input
                  type="text"
                  name="individual.profession"
                  value={formData.individual.profession}
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
                  name="individual.organization"
                  value={formData.individual.organization}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Company name or self-employed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Designation
                </label>
                <input
                  type="text"
                  name="individual.designation"
                  value={formData.individual.designation}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Senior Developer, Manager, etc."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personal Description
                </label>
                <textarea
                  name="individual.description"
                  value={formData.individual.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description about yourself..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Sponsorship Preferences */}
        <div className="bg-green-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sponsorship Preferences</h3>
          
          {/* Focus Areas */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Focus Areas (Select all that apply)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {focusAreaOptions.map(area => (
                <label key={area} className="flex items-center">
                  <input
                    type="checkbox"
                    name="focusAreas"
                    value={area}
                    checked={formData.preferences.focusAreas.includes(area)}
                    onChange={handleCheckboxChange}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">{area}</span>
                </label>
              ))}
            </div>
          </div>



          {/* Preferred Contribution Types */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Preferred Contribution Types
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {contributionTypeOptions.map(type => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    name="preferredContributionType"
                    value={type}
                    checked={formData.preferences.preferredContributionType.includes(type)}
                    onChange={handleCheckboxChange}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              name="preferences.notes"
              value={formData.preferences.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any specific requirements or preferences..."
            />
          </div>
        </div>

        {/* Social Media Links */}
        <div className="bg-purple-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Media Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LinkedIn
              </label>
              <input
                type="url"
                name="socialLinks.linkedin"
                value={formData.socialLinks.linkedin}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Twitter
              </label>
              <input
                type="url"
                name="socialLinks.twitter"
                value={formData.socialLinks.twitter}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://twitter.com/username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Facebook
              </label>
              <input
                type="url"
                name="socialLinks.facebook"
                value={formData.socialLinks.facebook}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://facebook.com/username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instagram
              </label>
              <input
                type="url"
                name="socialLinks.instagram"
                value={formData.socialLinks.instagram}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://instagram.com/username"
              />
            </div>
          </div>
        </div>

        {/* Upload Progress Display */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">File Upload Progress</h4>
            {Object.entries(uploadProgress).map(([fileName, progress]) => {
              // Find the fileType for this fileName
              const fileType = Object.keys(files).find(key => files[key]?.name === fileName);
              const status = uploadStatus[fileName] || 'uploading';
              
              return (
                <div key={fileName} className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg border flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{fileName}</p>
                        <p className="text-xs text-gray-600">{fileType}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {status === 'error' && (
                        <button
                          type="button"
                          onClick={() => fileType && retryUpload(fileType)}
                          className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50"
                        >
                          Retry
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => fileType && handleFileRemove(fileType)}
                        className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        status === 'error' ? 'bg-red-500' : 
                        status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  
                  {/* Status Text */}
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-xs ${
                      status === 'error' ? 'text-red-600' : 
                      status === 'completed' ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {status === 'error' ? 'Upload failed' : 
                       status === 'completed' ? 'Upload completed' : 
                       `Uploading... ${progress}%`}
                    </span>
                    {status === 'error' && (
                      <span className="text-xs text-red-600">
                        Click "Retry" to try again
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading || isUploading}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <SubmitButton
            loading={loading || isUploading}
            disabled={loading || isUploading}
            className="px-6 py-3"
          >
            {existingSponsor ? 'Update Profile' : 'Create Profile'}
          </SubmitButton>
        </div>
      </form>

      {/* Full Screen Loader for Form Submission */}
      <FullScreenLoader
        isVisible={loading}
        message="Saving sponsor profile..."
        showProgress={false}
      />
    </div>
  );
};

export default SponsorProfileForm; 