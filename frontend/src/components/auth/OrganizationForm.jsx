// components/auth/OrganizationForm.jsx 

import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useNavigate } from 'react-router-dom';
import { showAlert } from '../../utils/notifications';
import {
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  CircularProgress,
  Grid,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import { ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { FullScreenLoader } from '../../components/common/LoaderComponents';

const FOCUS_AREAS = [
  'Environment',
  'Education',
  'Health',
  'Women Empowerment',
  'Animal Welfare',
  'Rural Development',
  'Other'
];

const steps = [
  {
    label: 'Basic Information',
    description: 'Organization details and focus area'
  },
  {
    label: 'Contact & Location',
    description: 'Location and contact information'
  },
  {
    label: 'Vision & Social',
    description: 'Mission statement and social links'
  },
  {
    label: 'Documents',
    description: 'Required certificates and documents'
  },
  {
    label: 'Review & Submit',
    description: 'Review all information and submit'
  }
];

export default function OrganizationForm() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    socialLinks: [''],
    headOfficeLocation: '',
    orgEmail: '',
    visionMission: '',
    orgPhone: '',
    yearOfEstablishment: '',
    focusArea: 'Environment', // Set default value
    focusAreaOther: '',
  });
  
  // Document upload loading states
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [isGstUploading, setIsGstUploading] = useState(false);
  const [isPanUploading, setIsPanUploading] = useState(false);
  const [isNgoUploading, setIsNgoUploading] = useState(false);
  const [isLetterUploading, setIsLetterUploading] = useState(false);
  const [files, setFiles] = useState({
    logo: null,
    gstCertificate: null,
    panCard: null,
    ngoRegistration: null,
    letterOfIntent: null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files: fileList } = e.target;
    setFiles((prev) => ({ ...prev, [name]: fileList[0] }));
  };

  const handleSocialLinkChange = (index, value) => {
    const updatedLinks = [...formData.socialLinks];
    updatedLinks[index] = value;
    setFormData((prev) => ({ ...prev, socialLinks: updatedLinks }));
  };

  const addSocialLink = () => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, '']
    }));
  };

  // Validation function to check if all required fields are filled
  const isFormValid = () => {
    const requiredFields = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      headOfficeLocation: formData.headOfficeLocation.trim(),
      orgEmail: formData.orgEmail.trim(),
      visionMission: formData.visionMission.trim(),
      orgPhone: formData.orgPhone.trim(),
      yearOfEstablishment: formData.yearOfEstablishment.trim(),
      focusArea: formData.focusArea
    };

    // Check if focusArea is 'Other', then focusAreaOther is also required
    if (formData.focusArea === 'Other') {
      requiredFields.focusAreaOther = formData.focusAreaOther.trim();
    }

    // Check if all required fields have values
    return Object.values(requiredFields).every(value => value && value.length > 0);
  };

  const handleNext = () => {
    // Check if current step has required fields filled before allowing next
    if (activeStep === 3 && !isFormValid()) {
              showAlert.error('Please fill all required fields before reviewing your organization details.');
      return;
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Show loading notifications for document uploads
      let loadingNotifications = [];
      
      if (files.logo) {
        setIsLogoUploading(true);
        loadingNotifications.push(showAlert.organizationLogoUploading('Uploading organization logo to Cloudinary...'));
      }
      
      if (files.gstCertificate) {
        setIsGstUploading(true);
        loadingNotifications.push(showAlert.organizationDocumentUploading('Uploading GST certificate to Cloudinary...'));
      }
      
      if (files.panCard) {
        setIsPanUploading(true);
        loadingNotifications.push(showAlert.organizationDocumentUploading('Uploading PAN card to Cloudinary...'));
      }
      
      if (files.ngoRegistration) {
        setIsNgoUploading(true);
        loadingNotifications.push(showAlert.organizationDocumentUploading('Uploading NGO registration to Cloudinary...'));
      }
      
      if (files.letterOfIntent) {
        setIsLetterUploading(true);
        loadingNotifications.push(showAlert.organizationDocumentUploading('Uploading letter of intent to Cloudinary...'));
      }
      
      const token = localStorage.getItem('token');
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'socialLinks') {
          data.append('socialLinks', JSON.stringify(value));
        } else {
          data.append(key, value);
        }
      });
      Object.entries(files).forEach(([key, file]) => {
        if (file) data.append(key, file);
      });
      
      const response = await axiosInstance.post('/api/organizations/register', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      showAlert.success('Organization created successfully! All documents uploaded to Cloudinary.');
      
      // Organization created successfully, redirect to your-organizations
      setTimeout(() => {
        navigate('/your-organizations');
      }, 1500); // Small delay to show the success message
      
    } catch (err) {
      if (err.response && err.response.status === 409) {
        showAlert.error('An organization with this name already exists. Please choose a different name.');
      } else {
        showAlert.error('Failed to register organization. Please check your network or try again.');
      }
      console.error(err);
    } finally {
      setIsSubmitting(false);
      // Reset all document upload loading states
      setIsLogoUploading(false);
      setIsGstUploading(false);
      setIsPanUploading(false);
      setIsNgoUploading(false);
      setIsLetterUploading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
  return (
          <div className="space-y-6">
            {/* Basic Information Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                Basic Information
              </h3>
              <div className="space-y-3 sm:space-y-4">
                {/* First row: Organization Name and Year of Establishment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name *</label>
      <TextField
        name="name"
        value={formData.name}
        onChange={handleChange}
        required
                      fullWidth
                      variant="outlined"
                      size="small"
                      placeholder="Enter your organization name"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
      />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year of Establishment *</label>
      <TextField
                      name="yearOfEstablishment"
                      value={formData.yearOfEstablishment}
        onChange={handleChange}
                      type="number"
        required
                      fullWidth
                      variant="outlined"
                      size="small"
                      placeholder="e.g., 2020"
                      inputProps={{ 
                        min: "1900", 
                        max: new Date().getFullYear().toString() 
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    />
                  </div>
                </div>
                
                {/* Second row: Website URL and Focus Area */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website URL (optional)</label>
      <TextField
        name="website"
        value={formData.website}
        onChange={handleChange}
        type="url"
                      fullWidth
                      variant="outlined"
                      size="small"
                      placeholder="https://www.yourorganization.com"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Focus Area *</label>
                    <TextField
                      name="focusArea"
                      select
                      value={formData.focusArea}
                      onChange={handleChange}
                      required
                      fullWidth
                      variant="outlined"
                      size="small"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    >
                      {FOCUS_AREAS.map((area) => (
                        <MenuItem key={area} value={area}>{area}</MenuItem>
                      ))}
                    </TextField>
                  </div>
                </div>
                
                {/* Conditional field for Other Focus Area */}
                {formData.focusArea === 'Other' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Please specify Focus Area *</label>
                    <TextField
                      name="focusAreaOther"
                      value={formData.focusAreaOther}
                      onChange={handleChange}
                      required
                      fullWidth
                      variant="outlined"
                      size="small"
                      placeholder="Enter your specific focus area"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Description Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Description
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brief Description *</label>
                <TextField
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  multiline
                  rows={4}
                  required
                  fullWidth
                  variant="outlined"
                  size="small"
                  placeholder="Describe your organization's mission, goals, and the impact you aim to create..."
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            {/* Location Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                Location Information
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Head Office Location *</label>
      <TextField
        name="headOfficeLocation"
        value={formData.headOfficeLocation}
        onChange={handleChange}
        required
                  fullWidth
                  variant="outlined"
                  size="small"
                  placeholder="Enter the complete address of your organization"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
              </div>
            </div>
            
            {/* Contact Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                Contact Details
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization Email *</label>
      <TextField
        name="orgEmail"
        value={formData.orgEmail}
        onChange={handleChange}
        type="email"
        required
                      fullWidth
                      variant="outlined"
                      size="small"
                      placeholder="contact@organization.com"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
      />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization Phone *</label>
      <TextField
        name="orgPhone"
        value={formData.orgPhone}
        onChange={handleChange}
        type="tel"
        required
                      fullWidth
                      variant="outlined"
                      size="small"
                      placeholder="+91 98765 43210"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Vision & Mission Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                Vision & Mission
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vision & Mission Statement *</label>
      <TextField
        name="visionMission"
        value={formData.visionMission}
        onChange={handleChange}
        multiline
                  rows={4}
        required
                  fullWidth
                  variant="outlined"
                  size="small"
                  placeholder="Describe your organization's vision, mission, and long-term goals..."
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
              </div>
            </div>
            
      {/* Social Links Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-6 h-6 bg-pink-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                  </svg>
                </div>
                Social Media Links
              </h3>
              <div className="space-y-4">
      {formData.socialLinks.map((link, index) => (
                  <div key={index}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Social Link #{index + 1} {index === 0 ? '(optional)' : ''}
                    </label>
        <TextField
          value={link}
          onChange={(e) => handleSocialLinkChange(index, e.target.value)}
          type="url"
                      fullWidth
                      variant="outlined"
                      size="small"
                      placeholder="https://example.com/profile"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    />
                  </div>
                ))}
                
                <div className="pt-2">
                  <Button 
                    onClick={addSocialLink} 
                    variant="outlined" 
                    color="info" 
                    size="small"
                    sx={{ 
                      borderRadius: 1.5,
                      textTransform: 'none',
                      fontWeight: 600,
                      py: 0.5,
                      px: 2
                    }}
                  >
        + Add Another Link
      </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
      {/* Documents Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Required Documents
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Logo Upload */}
                <div className="text-center">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Organization Logo</label>
          <Button
            variant="outlined"
            component="label"
                    size="small"
                    sx={{ 
                      width: '100%', 
                      py: 2, 
                      borderRadius: 1.5,
                      borderStyle: 'dashed',
                      borderWidth: 1.5,
                      textTransform: 'none',
                      fontWeight: 600,
                      minHeight: '60px'
                    }}
                  >
            <input
              type="file"
              name="logo"
              accept="image/*,application/pdf"
              hidden
              onChange={handleFileChange}
            />
                    {files.logo ? `${files.logo.name} ✓` : 'Upload Logo (Image/PDF)'}
          </Button>
                  {/* {getFilePreview(files.logo)} */}
                </div>
                
                {/* GST Certificate */}
                <div className="text-center">
                  <label className="block text-sm font-medium text-gray-700 mb-2">GST Certificate</label>
          <Button
            variant="outlined"
            component="label"
                    size="small"
                    sx={{ 
                      width: '100%', 
                      py: 2, 
                      borderRadius: 1.5,
                      borderStyle: 'dashed',
                      borderWidth: 1.5,
                      textTransform: 'none',
                      fontWeight: 600,
                      minHeight: '60px'
                    }}
                  >
            <input
              type="file"
              name="gstCertificate"
              accept="image/*,application/pdf"
              hidden
              onChange={handleFileChange}
            />
                    {files.gstCertificate ? `${files.gstCertificate.name} ✓` : 'GST Certificate (Image/PDF)'}
          </Button>
                  {/* {getFilePreview(files.gstCertificate)} */}
                </div>
                
                {/* PAN Card */}
                <div className="text-center">
                  <label className="block text-sm font-medium text-gray-700 mb-2">PAN Card</label>
          <Button
            variant="outlined"
            component="label"
                    size="small"
                    sx={{ 
                      width: '100%', 
                      py: 2, 
                      borderRadius: 1.5,
                      borderStyle: 'dashed',
                      borderWidth: 1.5,
                      textTransform: 'none',
                      fontWeight: 600,
                      minHeight: '60px'
                    }}
                  >
            <input
              type="file"
              name="panCard"
              accept="image/*,application/pdf"
              hidden
              onChange={handleFileChange}
            />
                    {files.panCard ? `${files.panCard.name} ✓` : 'PAN Card (Image/PDF)'}
          </Button>
                  {/* {getFilePreview(files.panCard)} */}
                </div>
                
                {/* NGO Registration */}
                <div className="text-center">
                  <label className="block text-sm font-medium text-gray-700 mb-2">NGO Registration</label>
          <Button
            variant="outlined"
            component="label"
                    size="small"
                    sx={{ 
                      width: '100%', 
                      py: 2, 
                      borderRadius: 1.5,
                      borderStyle: 'dashed',
                      borderWidth: 1.5,
                      textTransform: 'none',
                      fontWeight: 600,
                      minHeight: '60px'
                    }}
                  >
            <input
              type="file"
              name="ngoRegistration"
              accept="image/*,application/pdf"
              hidden
              onChange={handleFileChange}
            />
                    {files.ngoRegistration ? `${files.ngoRegistration.name} ✓` : 'NGO Registration Certificate (Image/PDF)'}
          </Button>
                  {/* {getFilePreview(files.ngoRegistration)} */}
                </div>
                
                {/* Letter of Intent */}
                <div className="text-center">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Letter of Intent</label>
          <Button
            variant="outlined"
            component="label"
                    size="small"
                    sx={{ 
                      width: '100%', 
                      py: 2, 
                      borderRadius: 1.5,
                      borderStyle: 'dashed',
                      borderWidth: 1.5,
                      textTransform: 'none',
                      fontWeight: 600,
                      minHeight: '60px'
                    }}
                  >
            <input
              type="file"
              name="letterOfIntent"
              accept="image/*,application/pdf"
              hidden
              onChange={handleFileChange}
            />
                    {files.letterOfIntent ? `${files.letterOfIntent.name} ✓` : 'Letter of Intent (Image/PDF)'}
          </Button>
                  {/* {getFilePreview(files.letterOfIntent)} */}
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            {/* Review Header */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center">
                <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Review Your Organization Details
              </h3>
              <p className="text-blue-700 text-sm">
                Please review all the information below before submitting. You can go back to any step to make changes.
              </p>
            </div>
            
            {/* Basic Information Review */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-5 h-5 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                Basic Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Organization Name:</span>
                  <p className="text-gray-900 font-medium">{formData.name || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Year of Establishment:</span>
                  <p className="text-gray-900 font-medium">{formData.yearOfEstablishment || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Focus Area:</span>
                  <p className="text-gray-900 font-medium">{formData.focusArea || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Website:</span>
                  <p className="text-gray-900 font-medium">{formData.website || 'Not provided'}</p>
                </div>
              </div>
            </div>
            
            {/* Contact Information Review */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-5 h-5 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                Contact Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Head Office Location:</span>
                  <p className="text-gray-900 font-medium">{formData.headOfficeLocation || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Organization Email:</span>
                  <p className="text-gray-900 font-medium">{formData.orgEmail || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Organization Phone:</span>
                  <p className="text-gray-900 font-medium">{formData.orgPhone || 'Not provided'}</p>
                </div>
              </div>
            </div>
            
            {/* Description & Vision Review */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-5 h-5 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Description & Vision
              </h4>
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Brief Description:</span>
                  <p className="text-gray-900 mt-1">{formData.description || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Vision & Mission Statement:</span>
                  <p className="text-gray-900 mt-1">{formData.visionMission || 'Not provided'}</p>
                </div>
              </div>
            </div>
            
            {/* Documents Review */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-5 h-5 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Documents
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { key: 'logo', label: 'Organization Logo' },
                  { key: 'gstCertificate', label: 'GST Certificate' },
                  { key: 'panCard', label: 'PAN Card' },
                  { key: 'ngoRegistration', label: 'NGO Registration' },
                  { key: 'letterOfIntent', label: 'Letter of Intent' }
                ].map((doc) => (
                  <div key={doc.key} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-1">{doc.label}</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${files[doc.key] ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {files[doc.key] ? '✓ Uploaded' : 'Pending'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', sm: '600px', md: '800px', lg: '1000px' },
        mx: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2, sm: 3 },
        pb: { xs: 4, sm: 6 },
        mb: { xs: 2, sm: 4 },
        px: { xs: 2, sm: 3 }
      }}
      encType="multipart/form-data"
    >
            {/* Progress Stepper */}
      <Paper elevation={0} sx={{ 
        p: { xs: 2, sm: 3 }, 
        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
        backdropFilter: 'blur(10px)',
        overflow: 'hidden'
      }}>
        {/* Mobile Stepper - Show current step and progress */}
        <Box sx={{ display: { xs: 'block', sm: 'none' }, mb: 2 }}>
          <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
            Step {activeStep + 1} of {steps.length}
          </Typography>
          <Box sx={{ 
            width: '100%', 
            height: 4, 
            bgcolor: 'grey.200', 
            borderRadius: 2,
            overflow: 'hidden'
          }}>
            <Box sx={{ 
              width: `${((activeStep + 1) / steps.length) * 100}%`, 
              height: '100%', 
              bgcolor: 'primary.main',
              transition: 'width 0.3s ease'
            }} />
          </Box>
          <Typography variant="caption" color="primary" align="center" sx={{ mt: 1, display: 'block' }}>
            {steps[activeStep].label}
          </Typography>
        </Box>

        {/* Desktop Stepper */}
        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <Stepper 
            activeStep={activeStep} 
            orientation="horizontal"
            sx={{
              '& .MuiStepLabel-root': {
                minWidth: '120px'
              }
            }}
          >
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>
                  <Typography 
                    variant="body2"
                    fontWeight={activeStep === index ? 600 : 400}
                    sx={{ 
                      fontSize: '0.875rem',
                      wordBreak: 'break-word'
                    }}
                  >
                    {step.label}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      </Paper>

      {/* Step Content */}
      <Paper elevation={0} sx={{ 
        p: { xs: 2, sm: 3 }, 
        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
        backdropFilter: 'blur(10px)' 
      }}>
        <Box sx={{ mb: { xs: 1, sm: 2 } }}>
          <Typography 
            variant={{ xs: 'h6', sm: 'h5' }} 
            fontWeight="bold" 
            color="primary" 
            gutterBottom
          >
            {steps[activeStep].label}
          </Typography>
          <Typography 
            variant={{ xs: 'caption', sm: 'body2' }} 
            color="text.secondary"
            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
          >
            {steps[activeStep].description}
          </Typography>
        </Box>

        {renderStepContent(activeStep)}
      </Paper>

      {/* Navigation Buttons */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        gap: { xs: 2, sm: 0 },
        alignItems: { xs: 'stretch', sm: 'center' }
      }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
          variant="outlined"
          startIcon={<ChevronLeftIcon className="w-4 h-4" />}
          sx={{ 
            borderRadius: 2, 
            textTransform: 'none', 
            fontWeight: 600,
            order: { xs: 2, sm: 1 }
          }}
        >
          Back
        </Button>
        
        <Box sx={{ order: { xs: 1, sm: 2 } }}>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={isSubmitting || !isFormValid()}
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
              sx={{ 
                borderRadius: 2, 
                textTransform: 'none', 
                fontWeight: 600,
                px: { xs: 3, sm: 4 },
                py: { xs: 1, sm: 1.5 },
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              {isSubmitting ? 'Creating Organization...' : 'Create Organization'}
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={handleNext}
              endIcon={<ChevronRightIcon className="w-4 h-4" />}
              sx={{ 
                borderRadius: 2, 
                textTransform: 'none', 
                fontWeight: 600,
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              Next
            </Button>
          )}
          {activeStep === steps.length - 1 && !isFormValid() && (
            <Typography 
              variant="caption" 
              color="error" 
              sx={{ 
                mt: 1, 
                display: 'block', 
                textAlign: 'center',
                fontSize: { xs: '0.7rem', sm: '0.75rem' }
              }}
            >
              Please fill all required fields to submit
            </Typography>
          )}
                 </Box>
       </Box>

       {/* Page Loader for Form Submission */}
       <FullScreenLoader
         isVisible={isSubmitting}
         message="Creating Organization..."
         showProgress={false}
       />
     </Box>
   );
 }
