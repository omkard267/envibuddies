import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { showAlert } from '../utils/notifications';
import { getOrganizationById, updateOrganization } from '../api';
import Navbar from '../components/layout/Navbar';
import { FullScreenLoader } from '../components/common/LoaderComponents';
import OrganizationDocumentUpload from '../components/organization/OrganizationDocumentUpload';

export default function OrganizationSettingsPage() {
  const { organizationId } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [documentOperations, setDocumentOperations] = useState({
    uploading: false,
    removing: false
  });
  const [documentsInitialized, setDocumentsInitialized] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const lastAutoSaveTime = useRef(0);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    orgEmail: '',
    orgPhone: '',
    website: '',
    headOfficeLocation: '',
    focusArea: '',
    focusAreaOther: '',
    yearOfEstablishment: '',
    visionMission: '',
    socialLinks: [],
    sponsorship: {
      enabled: false,
      description: '',
      contactEmail: '',
      minimumContribution: '',
      allowCustomSponsorship: true,
      customSponsorshipContact: {
        email: '',
        phone: '',
        description: ''
      }
    }
  });

  // Document management state
  const [documents, setDocuments] = useState({
    logo: null,
    gstCertificate: null,
    panCard: null,
    ngoRegistration: null,
    letterOfIntent: null
  });

  useEffect(() => {
    fetchOrganizationData();
    // Reset document operations and initialization flag on page load
    setDocumentOperations({
      uploading: false,
      removing: false
    });
    setDocumentsInitialized(false);
    setHasUnsavedChanges(false);
  }, [organizationId]);

  // Warn user about unsaved changes when trying to leave the page
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);
      const response = await getOrganizationById(organizationId);
      const orgData = response.data;
      
      // Check if current user is admin of this organization
      const userData = JSON.parse(localStorage.getItem("user"));
      if (!userData) {
              showAlert.error('You must be logged in to edit this organization.');
      navigate(`/organization/${organizationId}`, { replace: true });
      return;
      }
      
      // Check if user is the creator or an admin team member
      const isCreator = orgData.createdBy === userData._id;
      const isAdminMember = orgData.team && Array.isArray(orgData.team) ? orgData.team.some(member => 
        member.userId === userData._id && 
        member.status === 'approved' && 
        member.isAdmin
      ) : false;
      
      if (!isCreator && !isAdminMember) {
        showAlert.error('You do not have permission to edit this organization.');
        navigate(`/organization/${organizationId}`, { replace: true });
        return;
      }

      setOrganization(orgData);
      setFormData({
        name: orgData.name || '',
        description: orgData.description || '',
        orgEmail: orgData.orgEmail || '',
        orgPhone: orgData.orgPhone || '',
        website: orgData.website || '',
        headOfficeLocation: orgData.headOfficeLocation || '',
        focusArea: orgData.focusArea || '',
        focusAreaOther: orgData.focusAreaOther || '',
        yearOfEstablishment: orgData.yearOfEstablishment ? orgData.yearOfEstablishment.toString() : '',
        visionMission: orgData.visionMission || '',
        socialLinks: orgData.socialLinks || [],
        sponsorship: {
          enabled: orgData.sponsorship?.enabled || false,
          description: orgData.sponsorship?.description || '',
          contactEmail: orgData.sponsorship?.contactEmail || '',
          minimumContribution: orgData.sponsorship?.minimumContribution || 5000,
          allowCustomSponsorship: orgData.sponsorship?.allowCustomSponsorship !== false,
          customSponsorshipContact: {
            email: orgData.sponsorship?.customSponsorshipContact?.email || '',
            phone: orgData.sponsorship?.customSponsorshipContact?.phone || '',
            description: orgData.sponsorship?.customSponsorshipContact?.description || ''
          }
        }
      });

      // Load existing documents
      setDocuments({
        logo: orgData.logo || null,
        gstCertificate: orgData.documents?.gstCertificate || null,
        panCard: orgData.documents?.panCard || null,
        ngoRegistration: orgData.documents?.ngoRegistration || null,
        letterOfIntent: orgData.documents?.letterOfIntent || null
      });
      
      // Mark documents as initialized after a short delay to allow components to mount
      setTimeout(() => {
        setDocumentsInitialized(true);
      }, 100);
    } catch (error) {
      console.error('Error fetching organization data:', error);
              showAlert.error('Failed to load organization data');
      navigate(`/organization/${organizationId}`, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'socialLinks') {
      // Handle social links as comma-separated string
      const links = value.split(',').map(link => link.trim()).filter(link => link);
      setFormData(prev => ({ ...prev, socialLinks: links }));
    } else if (name.startsWith('sponsorship.customSponsorshipContact.')) {
      const field = name.split('.')[2];
      setFormData(prev => ({
        ...prev,
        sponsorship: {
          ...prev.sponsorship,
          customSponsorshipContact: {
            ...prev.sponsorship.customSponsorshipContact,
            [field]: value
          }
        }
      }));
    } else if (name.startsWith('sponsorship.')) {
      const field = name.split('.')[1];
      if (type === 'checkbox') {
        setFormData(prev => ({
          ...prev,
          sponsorship: { ...prev.sponsorship, [field]: checked }
        }));
      } else if (field === 'minimumContribution') {
        setFormData(prev => ({
          ...prev,
          sponsorship: { ...prev.sponsorship, [field]: value }
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          sponsorship: { ...prev.sponsorship, [field]: value }
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
  };

  // Handle document changes
  const handleDocumentChange = useCallback((documentType, documentData) => {
    setDocuments(prev => ({
      ...prev,
      [documentType]: documentData
    }));

    // Mark as having unsaved changes when document changes
    setHasUnsavedChanges(true);

    // Only track document operations after documents are initialized
    if (!documentsInitialized) return;

    // Track document operations for loading states
    if (documentData && documentData.uploading) {
      setDocumentOperations(prev => ({
        ...prev,
        uploading: true
      }));
    } else if (documentData === null) {
      setDocumentOperations(prev => ({
        ...prev,
        removing: true
      }));
      
      // Reset removing state after a short delay to allow the removal process to complete
      setTimeout(() => {
        console.log('Resetting removing state to false');
        setDocumentOperations(prev => ({
          ...prev,
          removing: false
        }));
      }, 1500);
    } else if (documentData && !documentData.uploading) {
      setDocumentOperations(prev => ({
        ...prev,
        uploading: false,
        removing: false
      }));

      // Auto-save document changes to database (only if not already auto-saving)
      // Temporarily disabled to prevent infinite loops
      // if (!autoSaving) {
      //   autoSaveDocument(documentType, documentData);
      // }
    }
  }, [documentsInitialized, autoSaving]);

  // Auto-save document changes to database
  const autoSaveDocument = async (documentType, documentData) => {
    if (autoSaving) {
      console.log(`Auto-save already in progress for ${documentType}, skipping...`);
      return;
    }

    // Debounce auto-save to prevent rapid calls
    const now = Date.now();
    const timeSinceLastSave = now - lastAutoSaveTime.current;
    if (timeSinceLastSave < 2000) { // 2 second debounce
      console.log(`Auto-save debounced for ${documentType}, too soon since last save`);
      return;
    }

    setAutoSaving(true);
    lastAutoSaveTime.current = now;
    
    try {
      const prepareDocumentData = (doc) => {
        if (!doc) return null;
        if (typeof doc === 'string') return doc; // Existing document URL
        if (doc.url) return doc.url; // Newly uploaded document
        return null;
      };

      const updateData = {};
      
      if (documentType === 'logo') {
        updateData.logo = prepareDocumentData(documentData);
      } else {
        updateData.documents = {
          [documentType]: prepareDocumentData(documentData)
        };
      }

      await updateOrganization(organizationId, updateData);
      
      // Reset unsaved changes flag since we auto-saved
      setHasUnsavedChanges(false);
      
      console.log(`${documentType} auto-saved successfully`);
    } catch (error) {
      console.error(`Error auto-saving ${documentType}:`, error);
      // Don't show error toast for auto-save failures, just log them
      // The user can still manually save the form
    } finally {
      setAutoSaving(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Basic field validation
    if (!formData.name.trim()) newErrors.name = 'Organization name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.headOfficeLocation.trim()) newErrors.headOfficeLocation = 'Head office location is required';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.orgEmail.trim()) {
      newErrors.orgEmail = 'Email is required';
    } else if (!emailRegex.test(formData.orgEmail)) {
      newErrors.orgEmail = 'Please enter a valid email address';
    }

    // Phone validation (basic)
    if (formData.orgPhone && formData.orgPhone.trim()) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(formData.orgPhone.replace(/[\s\-\(\)]/g, ''))) {
        newErrors.orgPhone = 'Please enter a valid phone number';
      }
    }

    // Website validation
    if (formData.website && formData.website.trim()) {
      try {
        new URL(formData.website);
      } catch {
        newErrors.website = 'Please enter a valid URL (e.g., https://example.com)';
      }
    }

    // Year validation
    if (formData.yearOfEstablishment) {
      const year = parseInt(formData.yearOfEstablishment);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1800 || year > currentYear) {
        newErrors.yearOfEstablishment = `Please enter a valid year between 1800 and ${currentYear}`;
      }
    }

    // Sponsorship validation
    if (formData.sponsorship.enabled) {
      if (!formData.sponsorship.description.trim()) {
        newErrors['sponsorship.description'] = 'Sponsorship description is required when sponsorship is enabled';
      }
      if (!formData.sponsorship.contactEmail.trim()) {
        newErrors['sponsorship.contactEmail'] = 'Sponsorship contact email is required when sponsorship is enabled';
      } else if (!emailRegex.test(formData.sponsorship.contactEmail)) {
        newErrors['sponsorship.contactEmail'] = 'Please enter a valid email address';
      }
      if (!formData.sponsorship.minimumContribution || formData.sponsorship.minimumContribution <= 0) {
        newErrors['sponsorship.minimumContribution'] = 'Minimum contribution must be greater than 0';
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

    // Check if any documents are still uploading or being removed
    const hasUploadingDocuments = Object.values(documents).some(doc => 
      doc && doc.uploading
    );
    const hasRemovingDocuments = documentOperations.removing;

    if (hasUploadingDocuments) {
      showAlert.warning('Please wait for all document uploads to complete before saving.');
      return;
    }

    if (hasRemovingDocuments) {
      showAlert.warning('Please wait for document removal to complete before saving.');
      return;
    }

    setSaving(true);
    try {
      // Prepare document data with proper handling of existing vs new documents
      const prepareDocumentData = (doc) => {
        if (!doc) return null;
        if (typeof doc === 'string') return doc; // Existing document URL
        if (doc.url) return doc.url; // Newly uploaded document
        return null;
      };

      const updateData = {
        name: formData.name,
        description: formData.description,
        orgEmail: formData.orgEmail,
        orgPhone: formData.orgPhone,
        website: formData.website,
        headOfficeLocation: formData.headOfficeLocation,
        focusArea: formData.focusArea,
        focusAreaOther: formData.focusAreaOther,
        yearOfEstablishment: formData.yearOfEstablishment,
        visionMission: formData.visionMission,
        socialLinks: formData.socialLinks,
        sponsorship: formData.sponsorship,
        // Include document updates with proper handling
        logo: prepareDocumentData(documents.logo),
        documents: {
          gstCertificate: prepareDocumentData(documents.gstCertificate),
          panCard: prepareDocumentData(documents.panCard),
          ngoRegistration: prepareDocumentData(documents.ngoRegistration),
          letterOfIntent: prepareDocumentData(documents.letterOfIntent)
        }
      };

      await updateOrganization(organizationId, updateData);
      
      // Reset unsaved changes flag
      setHasUnsavedChanges(false);
      
      // Show success toast
      showAlert.success('Organization settings updated successfully!');
      
      // Use replace: true to prevent browser back button from going back to settings
      navigate(`/organization/${organizationId}`, { replace: true });
    } catch (error) {
      console.error('Error updating organization:', error);
      
      // Show error toast
      showAlert.error(error.response?.data?.message || error.message || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 px-6 max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-24 px-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Organization Settings</h1>
              <p className="text-gray-600">Manage your organization's details and sponsorship settings</p>
            </div>
            <button
              onClick={() => navigate(`/organization/${organizationId}`)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back to Organization
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* Basic Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Organization name"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

                             <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Email *
                 </label>
                 <input
                   type="email"
                   name="orgEmail"
                   value={formData.orgEmail}
                   onChange={handleChange}
                   className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                     errors.orgEmail ? 'border-red-500' : 'border-gray-300'
                   }`}
                   placeholder="contact@organization.com"
                 />
                 {errors.orgEmail && (
                   <p className="text-red-500 text-sm mt-1">{errors.orgEmail}</p>
                 )}
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Phone
                 </label>
                 <input
                   type="tel"
                   name="orgPhone"
                   value={formData.orgPhone}
                   onChange={handleChange}
                   className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                     errors.orgPhone ? 'border-red-500' : 'border-gray-300'
                   }`}
                   placeholder="+91-9876543210"
                 />
                 {errors.orgPhone && (
                   <p className="mt-1 text-sm text-red-600">{errors.orgPhone}</p>
                 )}
               </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.website ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="https://www.organization.com"
                />
                {errors.website && (
                  <p className="mt-1 text-sm text-red-600">{errors.website}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Describe your organization..."
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                )}
              </div>
            </div>
          </div>

                     {/* Organization Details */}
           <div className="mb-8">
             <h2 className="text-xl font-semibold text-gray-900 mb-6">Organization Details</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="md:col-span-2">
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Head Office Location *
                 </label>
                 <input
                   type="text"
                   name="headOfficeLocation"
                   value={formData.headOfficeLocation}
                   onChange={handleChange}
                   className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                     errors.headOfficeLocation ? 'border-red-500' : 'border-gray-300'
                   }`}
                   placeholder="Mumbai, Maharashtra"
                 />
                 {errors.headOfficeLocation && (
                   <p className="text-red-500 text-sm mt-1">{errors.headOfficeLocation}</p>
                 )}
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Focus Area
                 </label>
                 <select
                   name="focusArea"
                   value={formData.focusArea}
                   onChange={handleChange}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 >
                   <option value="">Select Focus Area</option>
                   <option value="Environment">Environment</option>
                   <option value="Education">Education</option>
                   <option value="Healthcare">Healthcare</option>
                   <option value="Poverty">Poverty</option>
                   <option value="Women Empowerment">Women Empowerment</option>
                   <option value="Child Welfare">Child Welfare</option>
                   <option value="Animal Welfare">Animal Welfare</option>
                   <option value="Other">Other</option>
                 </select>
               </div>

               {formData.focusArea === 'Other' && (
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Specify Focus Area
                   </label>
                   <input
                     type="text"
                     name="focusAreaOther"
                     value={formData.focusAreaOther}
                     onChange={handleChange}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                     placeholder="Specify your focus area"
                   />
                 </div>
               )}

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Year of Establishment
                 </label>
                 <input
                   type="number"
                   name="yearOfEstablishment"
                   value={formData.yearOfEstablishment}
                   onChange={handleChange}
                   className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                     errors.yearOfEstablishment ? 'border-red-500' : 'border-gray-300'
                   }`}
                   placeholder="2020"
                   min="1800"
                   max={new Date().getFullYear()}
                 />
                 {errors.yearOfEstablishment && (
                   <p className="mt-1 text-sm text-red-600">{errors.yearOfEstablishment}</p>
                 )}
               </div>

               <div className="md:col-span-2">
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Vision & Mission
                 </label>
                 <textarea
                   name="visionMission"
                   value={formData.visionMission}
                   onChange={handleChange}
                   rows={4}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="Describe your organization's vision and mission..."
                 />
               </div>
             </div>
           </div>

                     {/* Social Media */}
           <div className="mb-8">
             <h2 className="text-xl font-semibold text-gray-900 mb-6">Social Media</h2>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 Social Media Links
               </label>
               <textarea
                 name="socialLinks"
                                   value={(formData.socialLinks || []).join(', ')}
                 onChange={handleChange}
                 rows={3}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 placeholder="https://facebook.com/organization, https://twitter.com/organization, https://instagram.com/organization"
               />
               <p className="text-sm text-gray-500 mt-1">
                 Enter social media URLs separated by commas
               </p>
             </div>
           </div>

          {/* Document Management */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Document Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Logo
                </label>
                <OrganizationDocumentUpload
                  onDocumentChange={(doc) => handleDocumentChange('logo', doc)}
                  existingDocument={documents.logo}
                  title="Logo"
                  documentType="logo"
                  folder="organizations/logos"
                  acceptedTypes="image/*"
                  maxFileSize={5 * 1024 * 1024} // 5MB for logo
                />
              </div>

              {/* GST Certificate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GST Certificate
                </label>
                <OrganizationDocumentUpload
                  onDocumentChange={(doc) => handleDocumentChange('gstCertificate', doc)}
                  existingDocument={documents.gstCertificate}
                  title="GST Certificate"
                  documentType="gstCertificate"
                  folder="organizations/documents"
                />
              </div>

              {/* PAN Card */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PAN Card
                </label>
                <OrganizationDocumentUpload
                  onDocumentChange={(doc) => handleDocumentChange('panCard', doc)}
                  existingDocument={documents.panCard}
                  title="PAN Card"
                  documentType="panCard"
                  folder="organizations/documents"
                />
              </div>

              {/* NGO Registration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NGO Registration
                </label>
                <OrganizationDocumentUpload
                  onDocumentChange={(doc) => handleDocumentChange('ngoRegistration', doc)}
                  existingDocument={documents.ngoRegistration}
                  title="NGO Registration"
                  documentType="ngoRegistration"
                  folder="organizations/documents"
                />
              </div>

              {/* Letter of Intent */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Letter of Intent
                </label>
                <OrganizationDocumentUpload
                  onDocumentChange={(doc) => handleDocumentChange('letterOfIntent', doc)}
                  existingDocument={documents.letterOfIntent}
                  title="Letter of Intent"
                  documentType="letterOfIntent"
                  folder="organizations/documents"
                />
              </div>
            </div>
          </div>

          {/* Sponsorship Settings */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Sponsorship Settings</h2>
              {formData.sponsorship.enabled && (
                <button
                  onClick={() => navigate(`/organization/${organizationId}/applications`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  View Applications
                </button>
              )}
            </div>
            
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  name="sponsorship.enabled"
                  checked={formData.sponsorship.enabled}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-lg font-medium text-gray-900">
                  Enable Sponsorship Program
                </label>
              </div>
              <p className="text-sm text-gray-600">
                When enabled, organizations and individuals can apply to sponsor your events and activities.
              </p>
            </div>

            {formData.sponsorship.enabled && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sponsorship Description *
                  </label>
                  <textarea
                    name="sponsorship.description"
                    value={formData.sponsorship.description || ''}
                    onChange={handleChange}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors['sponsorship.description'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Describe your sponsorship opportunities and what sponsors can expect..."
                  />
                  {errors['sponsorship.description'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['sponsorship.description']}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sponsorship Contact Email *
                    </label>
                    <input
                      type="email"
                      name="sponsorship.contactEmail"
                      value={formData.sponsorship.contactEmail || ''}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors['sponsorship.contactEmail'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="sponsorship@organization.com"
                    />
                    {errors['sponsorship.contactEmail'] && (
                      <p className="text-red-500 text-sm mt-1">{errors['sponsorship.contactEmail']}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Contribution (₹)
                    </label>
                    <input
                      type="number"
                      name="sponsorship.minimumContribution"
                      value={formData.sponsorship.minimumContribution || ''}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors['sponsorship.minimumContribution'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="5000"
                      min="0"
                    />
                    {errors['sponsorship.minimumContribution'] && (
                      <p className="text-red-500 text-sm mt-1">{errors['sponsorship.minimumContribution']}</p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      name="sponsorship.allowCustomSponsorship"
                      checked={formData.sponsorship.allowCustomSponsorship}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-lg font-medium text-gray-900">
                      Allow Custom Sponsorship Proposals
                    </label>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    When enabled, potential sponsors can submit custom sponsorship proposals beyond predefined packages.
                  </p>

                  {formData.sponsorship.allowCustomSponsorship && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Custom Sponsorship Contact Email
                        </label>
                        <input
                          type="email"
                          name="sponsorship.customSponsorshipContact.email"
                          value={formData.sponsorship.customSponsorshipContact.email || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="custom@organization.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Custom Sponsorship Contact Phone
                        </label>
                        <input
                          type="tel"
                          name="sponsorship.customSponsorshipContact.phone"
                          value={formData.sponsorship.customSponsorshipContact.phone || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="+91-9876543210"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Custom Sponsorship Description
                        </label>
                        <textarea
                          name="sponsorship.customSponsorshipContact.description"
                          value={formData.sponsorship.customSponsorshipContact.description || ''}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Describe how potential sponsors can reach out for custom proposals..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-8 border-t border-gray-200">
            <div className="flex flex-col items-end space-y-2">
              {/* Unsaved Changes Indicator */}
              {hasUnsavedChanges && (
                <div className="text-sm text-amber-600 flex items-center space-x-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span>You have unsaved changes - Click "Save Changes" to save your documents and settings</span>
                </div>
              )}
              {/* Document Operations Status */}
              {(documentOperations.uploading || documentOperations.removing) && documentsInitialized && (
                <div className="text-sm text-gray-600 flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>
                    {documentOperations.uploading && 'Uploading documents...'}
                    {documentOperations.removing && 'Removing documents...'}
                  </span>
                </div>
              )}
              
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
              >
                {saving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>
                  {saving ? 'Saving...' : 'Save Changes'}
                </span>
              </button>
            </div>
          </div>
        </form>

        {/* Page Loader for Form Submission */}
        <FullScreenLoader
          isVisible={saving}
          message="Updating Organization Settings..."
          showProgress={false}
        />

        {/* Document Operations Overlay - Only show when there are actual operations and documents are initialized */}
        {(documentOperations.uploading || documentOperations.removing) && documentsInitialized && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {documentOperations.uploading ? 'Uploading Documents' : 'Removing Documents'}
              </h3>
              <p className="text-gray-600 mb-4">
                {documentOperations.uploading 
                  ? 'Please wait while your documents are being uploaded to Cloudinary...'
                  : 'Please wait while your documents are being removed...'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 