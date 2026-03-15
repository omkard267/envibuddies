// src/components/event/EventStepOne.jsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  TextField,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  FormGroup,
  Alert,
  Chip,
  CircularProgress,
} from "@mui/material";
import LocationPicker from './LocationPicker'; // Make sure this path is correct
import TimeSlotBuilder from './TimeSlotBuilder';
import { showAlert } from "../../utils/notifications";
import axiosInstance from "../../api/axiosInstance"; 

// CSS animations for enhanced UI
const spinAnimation = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject CSS if not already present
if (!document.getElementById('event-step-one-styles')) {
  const style = document.createElement('style');
  style.id = 'event-step-one-styles';
  style.textContent = spinAnimation;
  document.head.appendChild(style);
}

export default function EventStepOne({
  formData,
  setFormData,
  setLetterFile,
  selectedOrgId,
  organizationOptions = [],
  onNext,
  existingImages = [],
  existingLetter = null,
  onRemoveExistingImage,
  onRemoveExistingLetter,
  readOnly = false,
  // Upload state management props
  uploadProgress = {},
  uploadStatus = {},
  isUploading = false,
  uploadErrors = {},
  onUploadProgress = () => {},
  onUploadStatus = () => {},
  onUploadError = () => {}
}) {
  const [remainingVolunteers, setRemainingVolunteers] = useState(0);
  const [allocationError, setAllocationError] = useState("");
  const [editingCategory, setEditingCategory] = useState(null); // Track which category is being edited
  const [newLetterFile, setNewLetterFile] = useState(null); // Track newly uploaded letter

  // Calculate remaining volunteers, optionally excluding a specific category
  const calculateRemainingVolunteers = useCallback((excludeCategory = null) => {
    if (formData.unlimitedVolunteers) {
      return Infinity;
    }

    const eventMax = parseInt(formData.maxVolunteers) || 0;
    if (eventMax <= 0) {
      return 0;
    }

    // Calculate total allocated volunteers across all time slots and categories
    let totalAllocated = 0;
    if (formData.timeSlots && formData.timeSlots.length > 0) {
      formData.timeSlots.forEach(slot => {
        slot.categories.forEach(category => {
          // Skip the category being edited if specified
          if (excludeCategory && 
              excludeCategory.slotId === slot.id && 
              excludeCategory.categoryId === category.id) {
            return;
          }
          
          if (category.maxVolunteers && category.maxVolunteers > 0) {
            totalAllocated += category.maxVolunteers;
          }
        });
      });
    }

    return eventMax - totalAllocated;
  }, [formData.maxVolunteers, formData.unlimitedVolunteers, formData.timeSlots]);

  useEffect(() => {
    const remaining = calculateRemainingVolunteers(editingCategory);
    setRemainingVolunteers(remaining);

    // Set error if over-allocated
    if (remaining < 0) {
      setAllocationError(`Over-allocated by ${Math.abs(remaining)} volunteers`);
    } else {
      setAllocationError("");
    }
  }, [formData.maxVolunteers, formData.unlimitedVolunteers, formData.timeSlots, editingCategory]);

  // Cleanup upload states when component unmounts
  useEffect(() => {
    return () => {
      // Only clean up object URLs - don't call state setters during unmount to avoid infinite loops
      if (formData.eventImages) {
        formData.eventImages.forEach(file => {
          if (file && !file.uploaded && file instanceof File && file.preview) {
            try {
              URL.revokeObjectURL(file.preview);
            } catch (error) {
              // Ignore cleanup errors
            }
          }
        });
      }
      
      if (newLetterFile && !newLetterFile.uploaded && newLetterFile instanceof File && newLetterFile.preview) {
        try {
          URL.revokeObjectURL(newLetterFile.preview);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
  }, [formData.eventImages, newLetterFile]);

  const handleMaxVolunteersChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const equipmentOptions = ["Gloves", "Bags", "Masks", "Tools"];
  const eventTypes = [
    "Beach Cleanup",
    "Tree Plantation",
    "Awareness Drive",
    "Animal Rescue",
    "Education"
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      if (name === "equipmentNeeded") {
        setFormData((prev) => ({
          ...prev,
          equipmentNeeded: checked
            ? [...prev.equipmentNeeded, value]
            : prev.equipmentNeeded.filter((item) => item !== value),
        }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: checked }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };
  
  const handleLocationChange = (newLocation) => {
    // Handle null/undefined values to prevent crashes
    if (!newLocation) {
      setFormData((prev) => ({
        ...prev,
        mapLocation: null,
      }));
      return;
    }

    // newLocation is { lat, lng, address } from the map click or search
    setFormData((prev) => ({
      ...prev,
      mapLocation: {
        lat: newLocation.lat,
        lng: newLocation.lng,
        address: newLocation.address, // Update address from LocationPicker
      },
      // Also reflect the chosen address in the simple text field so users see it immediately
      location: newLocation.address || prev.location || '',
    }));
  };

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) {
      return;
    }

    // Enhanced file validation with better feedback
    const validationResults = validateImageFiles(files);
    
    if (validationResults.invalidFiles.length > 0) {
      const errorMessage = `❌ File validation failed:\n${validationResults.invalidFiles.join('\n')}`;
      showAlert.warning(errorMessage);
    }

    if (validationResults.validFiles.length === 0) {
      e.target.value = '';
      return;
    }

    // Show success message for valid files
    if (validationResults.validFiles.length > 0) {
      const fileNames = validationResults.validFiles.map(f => f.name).join(', ');
      showAlert.success(`✅ ${validationResults.validFiles.length} image(s) validated: ${fileNames}`);
    }

    // Start upload for each valid file (files will be added to formData after successful upload)
    for (const file of validationResults.validFiles) {
      await handleImageUpload(file);
    }

    // Clear the file input
    e.target.value = '';
  };



  // Enhanced image file validation with comprehensive checks
  const validateImageFiles = (files) => {
    const validFiles = [];
    const invalidFiles = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const maxFiles = 5;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    // Check total file count
    if (files.length > maxFiles) {
      invalidFiles.push(`Maximum ${maxFiles} images allowed (you selected ${files.length})`);
      return { validFiles: [], invalidFiles };
    }

    // Check existing files count
    const existingCount = (formData.eventImages || []).length;
    if (existingCount + files.length > maxFiles) {
      invalidFiles.push(`Total images would exceed ${maxFiles} limit (${existingCount} existing + ${files.length} new)`);
      return { validFiles: [], invalidFiles };
    }

    for (const file of files) {
      let isValid = true;
      let errorMessage = '';

      // File size validation
      if (file.size > maxSize) {
        isValid = false;
        errorMessage = `${file.name}: File size (${formatFileSize(file.size)}) exceeds 10MB limit`;
      }

      // File type validation
      if (!allowedTypes.includes(file.type)) {
        isValid = false;
        errorMessage = `${file.name}: Invalid file type (${file.type}). Allowed: JPEG, PNG, GIF, WebP`;
      }

      // File name validation
      if (file.name.length > 100) {
        isValid = false;
        errorMessage = `${file.name}: File name too long (max 100 characters)`;
      }

      // Check for duplicate files
      const existingFiles = formData.eventImages || [];
      const isDuplicate = existingFiles.some(existing => 
        existing.name === file.name && existing.size === file.size
      );
      
      if (isDuplicate) {
        isValid = false;
        errorMessage = `${file.name}: Duplicate file detected`;
      }

      // Check for suspicious file extensions
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const suspiciousExtensions = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js'];
      if (suspiciousExtensions.includes(fileExtension)) {
        isValid = false;
        errorMessage = `${file.name}: File type not allowed for security reasons`;
      }

      if (isValid) {
        validFiles.push(file);
      } else {
        invalidFiles.push(errorMessage);
      }
    }

    return { validFiles, invalidFiles };
  };

  // Utility function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Enhanced error categorization with user guidance
  const categorizeUploadError = (error, fileName) => {
    let category = 'unknown';
    let message = 'Upload failed. Please try again.';
    let suggestion = 'Check your internet connection and try again.';

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      
      switch (status) {
        case 400:
          category = 'validation';
          message = 'Invalid file format or corrupted file.';
          suggestion = 'Please check the file format and try uploading again.';
          break;
        case 401:
          category = 'authentication';
          message = 'Authentication required. Please log in again.';
          suggestion = 'Try refreshing the page and logging in again.';
          break;
        case 403:
          category = 'permission';
          message = 'Upload permission denied.';
          suggestion = 'Contact your administrator if you believe this is an error.';
          break;
        case 413:
          category = 'size';
          message = 'File size exceeds the maximum limit.';
          suggestion = 'Please compress the file or choose a smaller one.';
          break;
        case 429:
          category = 'rate_limit';
          message = 'Too many upload attempts. Please wait a moment.';
          suggestion = 'Wait a few minutes before trying again.';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          category = 'server';
          message = 'Server error occurred during upload.';
          suggestion = 'Please try again in a few minutes.';
          break;
        default:
          category = 'server';
          message = `Server error (${status}). Please try again.`;
          suggestion = 'If the problem persists, contact support.';
      }
    } else if (error.request) {
      // Network error
      category = 'network';
      message = 'Network error. Upload could not be completed.';
      suggestion = 'Check your internet connection and try again.';
    } else if (error.code === 'ECONNABORTED') {
      // Timeout error
      category = 'timeout';
      message = 'Upload timed out. File may be too large.';
      suggestion = 'Try uploading a smaller file or check your connection speed.';
    } else {
      // Other errors
      category = 'unknown';
      message = 'An unexpected error occurred.';
      suggestion = 'Please try again or contact support if the problem persists.';
    }

    return { category, message, suggestion };
  };

  // Enhanced error recovery and user guidance functions
  const getErrorRecoverySteps = (errorCategory, fileName) => {
    const recoverySteps = {
      validation: [
        'Check if the file format is supported (JPEG, PNG, GIF, WebP for images; PDF for letters)',
        'Ensure the file is not corrupted by opening it in another application',
        'Try converting the file to a different format if possible',
        'Verify the file size is under 10MB'
      ],
      size: [
        'Compress the image using online tools like TinyPNG or ImageOptim',
        'Reduce image dimensions while maintaining quality',
        'Convert to a more efficient format (e.g., JPEG instead of PNG)',
        'Split large documents into smaller parts if applicable'
      ],
      network: [
        'Check your internet connection stability',
        'Try switching between WiFi and mobile data',
        'Close other bandwidth-heavy applications',
        'Wait a few minutes and try again'
      ],
      server: [
        'Wait a few minutes and try uploading again',
        'Check if the service is experiencing issues',
        'Try uploading during off-peak hours',
        'Contact support if the problem persists'
      ],
      timeout: [
        'Try uploading a smaller file first',
        'Check your internet connection speed',
        'Close other applications that might be using bandwidth',
        'Try uploading during off-peak hours'
      ],
      rate_limit: [
        'Wait 5-10 minutes before trying again',
        'Avoid uploading multiple files simultaneously',
        'Check if you have other uploads in progress',
        'Try uploading during off-peak hours'
      ],
      permission: [
        'Ensure you are logged in with the correct account',
        'Check if your account has upload permissions',
        'Try refreshing the page and logging in again',
        'Contact your administrator if the problem persists'
      ],
      authentication: [
        'Refresh the page and log in again',
        'Check if your session has expired',
        'Clear browser cookies and cache',
        'Try using a different browser'
      ],
      unknown: [
        'Refresh the page and try again',
        'Clear browser cache and cookies',
        'Try using a different browser',
        'Contact support if the problem persists'
      ]
    };

    return recoverySteps[errorCategory] || recoverySteps.unknown;
  };

  const getFileOptimizationTips = (fileType) => {
    const tips = {
      image: [
        'Use JPEG format for photographs (better compression)',
        'Use PNG format for graphics with transparency',
        'Optimize images to 1200x800px for web display',
        'Keep file sizes under 2MB for faster uploads'
      ],
      letter: [
        'Use PDF format for best compatibility',
        'Ensure text is clearly readable when scanned',
        'Use high-resolution scans (300 DPI recommended)',
        'Compress PDFs if they exceed 5MB'
      ]
    };

    return tips[fileType] || tips.image;
  };

  const handleCancelUpload = (fileName, index) => {
    try {
      // Clear upload progress
      onUploadProgress(fileName, null);
      
      // Remove the file from the form data
      const updatedImages = formData.eventImages.filter((_, idx) => idx !== index);
      setFormData(prev => ({ ...prev, eventImages: updatedImages }));
      
      // Clear any error for this file
      onUploadError(fileName, '');
      
      showAlert.info(`⏹️ Upload cancelled for ${fileName}`);
      
    } catch (error) {
      console.error('Error cancelling upload:', error);
      showAlert.error(`❌ Failed to cancel upload: ${error.message || error}`);
    }
  };

  const handleCancelLetterUpload = (fileName) => {
    try {
      // Clear upload progress
      onUploadProgress(fileName, null);
      
      // Clear the new letter file
      setNewLetterFile(null);
      
      // Clear the letter from form data
    setFormData(prev => ({
      ...prev,
        govtApprovalLetter: null
      }));
      
      // Clear any error for this file
      onUploadError(fileName, '');
      
      showAlert.info(`⏹️ Letter upload cancelled for ${fileName}`);
      
    } catch (error) {
      console.error('Error cancelling letter upload:', error);
      showAlert.error(`❌ Failed to cancel letter upload: ${error.message || error}`);
    }
  };

  const handleRetryUpload = async (fileName, fileType) => {
    try {
      // Find the file in the appropriate state
      let fileToRetry = null;
      
      if (fileType === 'image') {
        fileToRetry = formData.eventImages?.find(img => img.name === fileName);
      } else if (fileType === 'letter') {
        // Check both newLetterFile and formData.govtApprovalLetter
        fileToRetry = newLetterFile?.name === fileName ? newLetterFile : 
                     formData.govtApprovalLetter?.name === fileName ? formData.govtApprovalLetter : null;
      }

      if (!fileToRetry) {
        showAlert.error(`❌ File ${fileName} not found for retry`);
        return;
      }

      // Clear the error
      onUploadError(fileName, '');
      
      // Show retry message
      showAlert.info(`🔄 Retrying upload for ${fileName}...`);
      
      // Retry the upload
      if (fileType === 'image') {
        await handleImageUpload(fileToRetry);
      } else if (fileType === 'letter') {
        await handleLetterUpload(fileToRetry);
      }

    } catch (error) {
      console.error(`Error retrying upload for ${fileName}:`, error);
      showAlert.error(`❌ Failed to retry upload for ${fileName}`);
    }
  };

  const handleFileOptimization = (fileName, fileType) => {
    const tips = getFileOptimizationTips(fileType);
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      position: relative;
    `;
    
    content.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #333; display: flex; align-items: center; gap: 10px;">
          🛠️ File Optimization Tips for ${fileName}
        </h3>
        <p style="margin: 0; color: #666; font-size: 14px;">
          Here are some tips to optimize your ${fileType} file for better upload performance:
        </p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">💡 Optimization Recommendations:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #555;">
          ${tips.map(tip => `<li style="margin-bottom: 8px;">${tip}</li>`).join('')}
        </ul>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">🔧 Quick Actions:</h4>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button id="retryBtn" style="
            background: #1976d2;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">🔄 Retry Upload</button>
          <button id="closeBtn" style="
            background: #6c757d;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">Close</button>
        </div>
      </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Add event listeners
    const retryBtn = content.querySelector('#retryBtn');
    const closeBtn = content.querySelector('#closeBtn');
    
    retryBtn.addEventListener('click', () => {
      if (modal && modal.parentNode) {
        document.body.removeChild(modal);
      }
      handleRetryUpload(fileName, fileType);
    });
    
    closeBtn.addEventListener('click', () => {
      if (modal && modal.parentNode) {
        document.body.removeChild(modal);
      }
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (modal && modal.parentNode) {
          document.body.removeChild(modal);
        }
      }
    });
    
    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (modal && modal.parentNode) {
          document.body.removeChild(modal);
        }
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  };

  // Help section functions
  const handleShowUploadTroubleshooting = () => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 700px;
      max-height: 80vh;
      overflow-y: auto;
      position: relative;
    `;
    
    content.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #333; display: flex; align-items: center; gap: 10px;">
          🔧 Upload Troubleshooting Guide
        </h3>
        <p style="margin: 0; color: #666; font-size: 14px;">
          Common upload issues and their solutions:
        </p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">❌ Common Upload Errors:</h4>
        <div style="margin-bottom: 15px;">
          <h5 style="margin: 0 0 8px 0; color: #555;">File Too Large</h5>
          <p style="margin: 0; color: #666; font-size: 14px;">
            • Compress images using online tools like TinyPNG<br>
            • Convert to more efficient formats (JPEG instead of PNG)<br>
            • Reduce image dimensions while maintaining quality
          </p>
        </div>
        <div style="margin-bottom: 15px;">
          <h5 style="margin: 0 0 8px 0; color: #555;">Invalid File Type</h5>
          <p style="margin: 0; color: #666; font-size: 14px;">
            • Images: Use JPEG, PNG, GIF, or WebP formats<br>
            • Letters: Use images or PDF format<br>
            • Check file extension matches the actual format
          </p>
        </div>
        <div style="margin-bottom: 15px;">
          <h5 style="margin: 0 0 8px 0; color: #555;">Network Issues</h5>
          <p style="margin: 0; color: #666; font-size: 14px;">
            • Check internet connection stability<br>
            • Try switching between WiFi and mobile data<br>
            • Close bandwidth-heavy applications<br>
            • Wait a few minutes and try again
          </p>
        </div>
        <div style="margin-bottom: 15px;">
          <h5 style="margin: 0 0 8px 0; color: #555;">Upload Timeout</h5>
          <p style="margin: 0; color: #666; font-size: 14px;">
            • Try uploading smaller files first<br>
            • Check connection speed<br>
            • Upload during off-peak hours
          </p>
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">💡 Pro Tips:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #555;">
          <li>Always compress images before uploading</li>
          <li>Use appropriate formats (JPEG for photos, PNG for graphics)</li>
          <li>Keep file sizes under 2MB for faster uploads</li>
          <li>Ensure government letters are clearly readable</li>
          <li>Upload during off-peak hours for better performance</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <button id="closeTroubleshootingBtn" style="
          background: #1976d2;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">Got it! Close</button>
      </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Add event listener
    const closeBtn = content.querySelector('#closeTroubleshootingBtn');
    closeBtn.addEventListener('click', () => {
      if (modal && modal.parentNode) {
        document.body.removeChild(modal);
      }
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (modal && modal.parentNode) {
          document.body.removeChild(modal);
        }
      }
    });
    
    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (modal && modal.parentNode) {
          document.body.removeChild(modal);
        }
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  };

  const handleShowFileOptimizationGuide = () => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 700px;
      max-height: 80vh;
      overflow-y: auto;
      position: relative;
    `;
    
    content.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #333; display: flex; align-items: center; gap: 10px;">
          📚 File Optimization Guide
        </h3>
        <p style="margin: 0; color: #666; font-size: 14px;">
          Learn how to optimize your files for better upload performance:
        </p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">🖼️ Image Optimization:</h4>
        <div style="margin-bottom: 15px;">
          <h5 style="margin: 0 0 8px 0; color: #555;">Format Selection</h5>
          <p style="margin: 0; color: #666; font-size: 14px;">
            • <strong>JPEG:</strong> Best for photographs and complex images<br>
            • <strong>PNG:</strong> Best for graphics with transparency<br>
            • <strong>WebP:</strong> Modern format with excellent compression<br>
            • <strong>GIF:</strong> Use only for simple animations
          </p>
        </div>
        <div style="margin-bottom: 15px;">
          <h5 style="margin: 0 0 8px 0; color: #555;">Size Optimization</h5>
          <p style="margin: 0; color: #666; font-size: 14px;">
            • Recommended dimensions: 1200x800px<br>
            • Maximum file size: 2MB for optimal performance<br>
            • Use online tools: TinyPNG, ImageOptim, Squoosh<br>
            • Maintain quality while reducing file size
          </p>
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">📄 Document Optimization:</h4>
        <div style="margin-bottom: 15px;">
          <h5 style="margin: 0 0 8px 0; color: #555;">PDF Optimization</h5>
          <p style="margin: 0; color: #666; font-size: 14px;">
            • Use PDF compression tools<br>
            • Remove unnecessary metadata<br>
            • Optimize images within PDFs<br>
            • Target size: under 5MB
          </p>
        </div>
        <div style="margin-bottom: 15px;">
          <h5 style="margin: 0 0 8px 0; color: #555;">Image Scans</h5>
          <p style="margin: 0; color: #666; font-size: 14px;">
            • Scan at 300 DPI for good quality<br>
            • Use JPEG format for scanned documents<br>
            • Ensure text is clearly readable<br>
            • Compress after scanning
          </p>
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">🛠️ Tools & Resources:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #555;">
          <li><strong>Image Compression:</strong> TinyPNG, ImageOptim, Squoosh</li>
          <li><strong>PDF Tools:</strong> Adobe Acrobat, SmallPDF, PDF24</li>
          <li><strong>Online Converters:</strong> Convertio, CloudConvert</li>
          <li><strong>File Management:</strong> Use the optimization tips in error messages</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <button id="closeOptimizationBtn" style="
          background: #1976d2;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">Got it! Close</button>
      </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Add event listener
    const closeBtn = content.querySelector('#closeOptimizationBtn');
    closeBtn.addEventListener('click', () => {
      if (modal && modal.parentNode) {
        document.body.removeChild(modal);
      }
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (modal && modal.parentNode) {
          document.body.removeChild(modal);
        }
      }
    });
    
    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (modal && modal.parentNode) {
          document.body.removeChild(modal);
        }
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  };

  // Enhanced upload guidance for different file types
  const getUploadGuidance = (fileType, fileName) => {
    const guidance = {
      image: {
        tips: [
          '📸 Use high-quality images for better event presentation',
          '🖼️ Supported formats: JPEG, PNG, GIF, WebP',
          '📏 Maximum file size: 10MB per image',
          '🔢 Maximum images: 5 total for the event'
        ],
        recommendations: [
          'Use landscape orientation for better display',
          'Ensure good lighting and clear subject matter',
          'Consider image dimensions (recommended: 1200x800px)'
        ]
      },
      letter: {
        tips: [
          '📄 Upload government approval letter or official document',
          '📋 Supported formats: Images (JPEG, PNG, GIF, WebP) and PDF',
          '📏 Maximum file size: 10MB',
          '🔢 Maximum letters: 1 per event',
          '✅ Required for event approval'
        ],
        recommendations: [
          'Ensure document is clearly readable',
          'Use high-resolution scans for better quality',
          'Include all relevant approval details'
        ]
      }
    };

    return guidance[fileType] || guidance.image;
  };

  // Enhanced upload statistics and user feedback
  const getUploadStatistics = () => {
    const totalFiles = (formData.eventImages || []).length + (newLetterFile ? 1 : 0);
    const uploadedFiles = (formData.eventImages || []).filter(img => img.uploaded).length + 
                         (newLetterFile && newLetterFile.uploaded ? 1 : 0);
    const pendingFiles = totalFiles - uploadedFiles;
    const errorFiles = uploadErrors && typeof uploadErrors === 'object' ? Object.keys(uploadErrors).length : 0;
    
    return {
      total: totalFiles,
      uploaded: uploadedFiles,
      pending: pendingFiles,
      errors: errorFiles,
      progress: totalFiles > 0 ? Math.round((uploadedFiles / totalFiles) * 100) : 0
    };
  };

  // Performance optimization and utility functions
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const memoizedFormatFileSize = useMemo(() => {
    const sizeCache = new Map();
    return (bytes) => {
      if (sizeCache.has(bytes)) {
        return sizeCache.get(bytes);
      }
      const result = formatFileSize(bytes);
      sizeCache.set(bytes, result);
      return result;
    };
  }, []);

  const getFileTypeIconMemoized = useMemo(() => {
    return (fileType) => getFileTypeIcon(fileType);
  }, []);

  const isUploadInProgress = useMemo(() => {
    return isUploading || (uploadProgress && typeof uploadProgress === 'object' && Object.values(uploadProgress).some(progress => progress > 0 && progress < 100));
  }, [isUploading, uploadProgress]);

  const hasCriticalErrors = useMemo(() => {
    return uploadErrors && typeof uploadErrors === 'object' && Object.keys(uploadErrors).length > 0;
  }, [uploadErrors]);

  const canProceedToNextStepOptimized = useMemo(() => {
    return !isUploadInProgress && !hasCriticalErrors;
  }, [isUploadInProgress, hasCriticalErrors]);

  // Enhanced file validation with caching
  const validateFileWithCache = useCallback((file, fileType) => {
    const cacheKey = `${file.name}-${file.size}-${file.type}-${fileType}`;
    
    if (validationCache.current.has(cacheKey)) {
      return validationCache.current.get(cacheKey);
    }
    
    let result;
    if (fileType === 'image') {
      result = validateImageFiles([file]);
      result = result.validFiles.length > 0 ? { isValid: true, file: result.validFiles[0] } : { isValid: false, errors: result.invalidFiles };
    } else {
      result = validateLetterFile(file);
    }
    
    validationCache.current.set(cacheKey, result);
    return result;
  }, []);

  // Initialize validation cache
  const validationCache = useRef(new Map());

  // Loading state manager
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  const setProcessingState = useCallback((loading, message = '') => {
    setIsProcessing(loading);
    setProcessingMessage(message);
  }, []);

  // Error boundary state
  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);

  const handleError = useCallback((error, context) => {
    console.error(`Error in ${context}:`, error);
    setHasError(true);
    setErrorDetails({ error, context, timestamp: new Date().toISOString() });
    
    // Show user-friendly error message
    showAlert.error(`❌ An error occurred while ${context}. Please try again or contact support if the problem persists.`);
  }, []);

  const resetErrorState = useCallback(() => {
    setHasError(false);
    setErrorDetails(null);
  }, []);

  // Enhanced file preview and management functions
  
  // Helper function to get file type icon
  const getFileTypeIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return '🖼️';
    } else if (fileType === 'application/pdf') {
      return '📄';
    } else if (fileType.startsWith('text/')) {
      return '📝';
    } else if (fileType.startsWith('video/')) {
      return '🎥';
    } else if (fileType.startsWith('audio/')) {
      return '🎵';
    } else {
      return '📁';
    }
  };

  const handlePreviewImage = (file, index) => {
    try {
      const imageUrl = file.uploaded && file.cloudinaryUrl ? file.cloudinaryUrl : URL.createObjectURL(file);
      
      // Create a modal for image preview
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        cursor: pointer;
      `;
      
      const image = document.createElement('img');
      image.src = imageUrl;
      image.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      `;
      
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '✕';
      closeButton.style.cssText = `
        position: absolute;
        top: 20px;
        right: 30px;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.3s;
      `;
      
      closeButton.addEventListener('mouseenter', () => {
        closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
      });
      
      closeButton.addEventListener('mouseleave', () => {
        closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
      });
      
      const fileInfo = document.createElement('div');
      fileInfo.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 14px;
        text-align: center;
      `;
      fileInfo.innerHTML = `
        <div><strong>${file.name}</strong></div>
        <div>${formatFileSize(file.size)}</div>
        <div>${file.type}</div>
        <div>${file.uploaded ? '✅ Uploaded' : '⏳ Pending Upload'}</div>
      `;
      
      modal.appendChild(image);
      modal.appendChild(closeButton);
      modal.appendChild(fileInfo);
      document.body.appendChild(modal);
      
      // Close modal on click
      const closeModal = () => {
        if (modal && modal.parentNode) {
          document.body.removeChild(modal);
        }
        if (!file.uploaded) {
          URL.revokeObjectURL(imageUrl);
        }
      };
      
      modal.addEventListener('click', closeModal);
      closeButton.addEventListener('click', closeModal);
      
      // Close on escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          closeModal();
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);
      
    } catch (error) {
      console.error('Error previewing image:', error);
      showAlert.error('❌ Failed to preview image. Please try again.');
    }
  };

  const handlePreviewExistingImage = (img, index) => {
    try {
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        cursor: pointer;
      `;
      
      const image = document.createElement('img');
      image.src = img.url;
      image.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      `;
      
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '✕';
      closeButton.style.cssText = `
        position: absolute;
        top: 20px;
        right: 30px;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.3s;
      `;
      
      closeButton.addEventListener('mouseenter', () => {
        closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
      });
      
      closeButton.addEventListener('mouseleave', () => {
        closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
      });
      
      const fileInfo = document.createElement('div');
      fileInfo.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 14px;
        text-align: center;
      `;
      fileInfo.innerHTML = `
        <div><strong>${img.filename || `Event Image ${index + 1}`}</strong></div>
        <div>Existing File</div>
        <div>Stored in System</div>
      `;
      
      modal.appendChild(image);
      modal.appendChild(closeButton);
      modal.appendChild(fileInfo);
      document.body.appendChild(modal);
      
      // Close modal on click
      const closeModal = () => {
        if (modal && modal.parentNode) {
          document.body.removeChild(modal);
        }
      };
      
      modal.addEventListener('click', closeModal);
      closeButton.addEventListener('click', closeModal);
      
      // Close on escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          closeModal();
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);
      
    } catch (error) {
      console.error('Error previewing existing image:', error);
      showAlert.error('❌ Failed to preview image. Please try again.');
    }
  };

  const handlePreviewExistingLetter = (letter) => {
    try {
      const letterUrl = letter.url || letter.cloudinaryUrl;
      
      if (!letterUrl) {
        showAlert.error('❌ Letter URL not found. Cannot preview.');
        return;
      }

      if (letterUrl.includes('.pdf') || letter.type === 'application/pdf') {
        // For PDFs, open in new tab
        window.open(letterUrl, '_blank');
      } else {
        // For images, show preview modal
        const modal = document.createElement('div');
        modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.9);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          cursor: pointer;
        `;
        
        const img = document.createElement('img');
        img.src = letterUrl;
        img.style.cssText = `
          max-width: 90%;
          max-height: 90%;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;
        
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.style.cssText = `
          position: absolute;
          top: 20px;
          right: 30px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.3s;
        `;
        
        closeButton.addEventListener('mouseenter', () => {
          closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        });
        
        closeButton.addEventListener('mouseleave', () => {
          closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        });
        
        const fileInfo = document.createElement('div');
        fileInfo.style.cssText = `
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 10px 20px;
          border-radius: 20px;
          font-size: 14px;
          text-align: center;
        `;
        fileInfo.innerHTML = `
          <div><strong>${letter.filename || letter.name || 'Government Approval Letter'}</strong></div>
          <div>${letter.format || 'Document'}</div>
          <div>✅ Existing File</div>
        `;
        
        modal.appendChild(img);
        modal.appendChild(closeButton);
        modal.appendChild(fileInfo);
        document.body.appendChild(modal);
        
        // Close modal on click
        const closeModal = () => {
          if (modal && modal.parentNode) {
            document.body.removeChild(modal);
          }
        };
        
        modal.addEventListener('click', closeModal);
        closeButton.addEventListener('click', closeModal);
        
        // Close on escape key
        const handleEscape = (e) => {
          if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
          }
        };
        document.addEventListener('keydown', handleEscape);
      }
      
    } catch (error) {
      console.error('Error previewing existing letter:', error);
      showAlert.error('❌ Failed to preview letter. Please try again.');
    }
  };

  const handlePreviewLetter = (file) => {
    try {
      if (file.type === 'application/pdf') {
        // For PDFs, open in new tab
        const url = file.uploaded && file.cloudinaryUrl ? file.cloudinaryUrl : URL.createObjectURL(file);
        window.open(url, '_blank');
      } else {
        // For images, show preview modal
        const imageUrl = file.uploaded && file.cloudinaryUrl ? file.cloudinaryUrl : URL.createObjectURL(file);
        
        const modal = document.createElement('div');
        modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.9);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          cursor: pointer;
        `;
        
        const image = document.createElement('img');
        image.src = imageUrl;
        image.style.cssText = `
          max-width: 90%;
          max-height: 90%;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;
        
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.style.cssText = `
          position: absolute;
          top: 20px;
          right: 30px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.3s;
        `;
        
        closeButton.addEventListener('mouseenter', () => {
          closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        });
        
        closeButton.addEventListener('mouseleave', () => {
          closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        });
        
        const fileInfo = document.createElement('div');
        fileInfo.style.cssText = `
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 10px 20px;
          border-radius: 20px;
          font-size: 14px;
          text-align: center;
        `;
        fileInfo.innerHTML = `
          <div><strong>${file.name}</strong></div>
          <div>${formatFileSize(file.size)}</div>
          <div>${file.type}</div>
          <div>${file.uploaded ? '✅ Uploaded' : '⏳ Pending Upload'}</div>
        `;
        
        modal.appendChild(image);
        modal.appendChild(closeButton);
        modal.appendChild(fileInfo);
        document.body.appendChild(modal);
        
        // Close modal on click
        const closeModal = () => {
          if (modal && modal.parentNode) {
            document.body.removeChild(modal);
          }
          if (!file.uploaded) {
            URL.revokeObjectURL(imageUrl);
          }
        };
        
        modal.addEventListener('click', closeModal);
        closeButton.addEventListener('click', closeModal);
        
        // Close on escape key
        const handleEscape = (e) => {
          if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
          }
        };
        document.addEventListener('keydown', handleEscape);
      }
      
    } catch (error) {
      console.error('Error previewing letter:', error);
      showAlert.error('❌ Failed to preview letter. Please try again.');
    }
  };

  const handleImageUpload = async (file) => {
    const fileName = file.name;
    
    // Initialize upload progress and status
    onUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
    onUploadStatus(prev => ({ ...prev, [fileName]: 'uploading' }));
    
    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'events/images');

      // Upload to Cloudinary via backend
      const response = await axiosInstance.post('/api/events/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(prev => ({ ...prev, [fileName]: progress }));
        }
      });

      if (response.data.success) {
        // Mark upload as successful
        onUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
        onUploadStatus(prev => ({ ...prev, [fileName]: 'completed' }));
        
        // Add uploaded file info to form data
        setFormData(prev => {
          const newEventImages = [...(prev.eventImages || []), {
            ...file,
            name: fileName, // Explicitly set the name property
            cloudinaryUrl: response.data.url,
            cloudinaryId: response.data.publicId,
            uploaded: true
          }];
          return {
      ...prev,
            eventImages: newEventImages
          };
        });

        showAlert.success(`✅ ${fileName} uploaded successfully!`);
        
        // Clear upload states after success
        setTimeout(() => {
          onUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileName];
            return newProgress;
          });
          onUploadStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[fileName];
            return newStatus;
          });
        }, 2000);

      } else {
        throw new Error(response.data.message || 'Upload failed');
      }

    } catch (error) {
      console.error(`❌ Image upload failed for ${fileName}:`, error);
      
      // Mark upload as failed
      onUploadStatus(prev => ({ ...prev, [fileName]: 'error' }));
      onUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
      
      // Enhanced error categorization and user guidance
      const errorInfo = categorizeUploadError(error, fileName);
      
      onUploadError(fileName, errorInfo.message);
      showAlert.error(`❌ ${fileName}: ${errorInfo.message}`);
      
      // Log detailed error for debugging
      console.error(`Upload error details for ${fileName}:`, {
        status: error.response?.status,
        message: error.message,
        category: errorInfo.category,
        suggestion: errorInfo.suggestion
      });
    }
  };

  const handleLetterChange = async (e) => {
    const file = e.target.files[0];
    
    if (!file) return;

    // Enhanced letter file validation
    const validationResult = validateLetterFile(file);
    
    if (!validationResult.isValid) {
      showAlert.error(`❌ ${validationResult.errorMessage}`);
      e.target.value = '';
      return;
    }

    // Show success message for valid file
    showAlert.success(`✅ ${file.name} validated successfully! Starting upload...`);

    // Start upload
    await handleLetterUpload(file);
    
    // Clear the file input
    e.target.value = '';
  };

  // Enhanced letter file validation with comprehensive checks
  const validateLetterFile = (file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

    // File size validation
    if (file.size > maxSize) {
      return {
        isValid: false,
        errorMessage: `File size (${formatFileSize(file.size)}) exceeds 10MB limit`
      };
    }

    // File type validation
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        errorMessage: `Invalid file type (${file.type}). Allowed: Images (JPEG, PNG, GIF, WebP) and PDF files`
      };
    }

    // File name validation
    if (file.name.length > 100) {
      return {
        isValid: false,
        errorMessage: `File name too long (max 100 characters)`
      };
    }

    // Check for suspicious file extensions
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const suspiciousExtensions = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js'];
    if (suspiciousExtensions.includes(fileExtension)) {
      return {
        isValid: false,
        errorMessage: `File type not allowed for security reasons`
      };
    }

    // Check if file is empty
    if (file.size === 0) {
      return {
        isValid: false,
        errorMessage: `File appears to be empty`
      };
    }

    return { isValid: true, errorMessage: '' };
  };

  const handleLetterUpload = async (file) => {
    const fileName = file.name;
    
    // Initialize upload progress and status
    onUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
    onUploadStatus(prev => ({ ...prev, [fileName]: 'uploading' }));
    
    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'events/letters');

      // Upload to Cloudinary via backend
      const response = await axiosInstance.post('/api/events/upload-letter', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(prev => ({ ...prev, [fileName]: progress }));
        }
      });

      if (response.data.success) {
        // Mark upload as successful
        onUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
        onUploadStatus(prev => ({ ...prev, [fileName]: 'completed' }));
        
        // Set the uploaded file
        const uploadedFile = {
          ...file,
          cloudinaryUrl: response.data.url,
          cloudinaryId: response.data.publicId,
          uploaded: true
        };
        
        setNewLetterFile(uploadedFile);
        setLetterFile(uploadedFile);
        
        // Update form data with the uploaded letter
        setFormData(prev => ({
          ...prev,
          govtApprovalLetter: uploadedFile
        }));
        
        // Debug: Log the uploaded file data
        console.log('Letter uploaded successfully:', uploadedFile);
        console.log('Current formData after letter upload:', formData);

        showAlert.success(`✅ ${fileName} uploaded successfully!`);
        
        // Clear upload states after success
        setTimeout(() => {
          onUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileName];
            return newProgress;
          });
          onUploadStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[fileName];
            return newStatus;
          });
        }, 2000);

      } else {
        throw new Error(response.data.message || 'Upload failed');
      }

    } catch (error) {
      console.error(`❌ Letter upload failed for ${fileName}:`, error);
      
      // Mark upload as failed
      onUploadStatus(prev => ({ ...prev, [fileName]: 'error' }));
      onUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
      
      // Enhanced error categorization and user guidance
      const errorInfo = categorizeUploadError(error, fileName);
      
      onUploadError(fileName, errorInfo.message);
      showAlert.error(`❌ ${fileName}: ${errorInfo.message}`);
      
      // Log detailed error for debugging
      console.error(`Letter upload error details for ${fileName}:`, {
        status: error.response?.status,
        message: error.message,
        category: errorInfo.category,
        suggestion: errorInfo.suggestion
      });
    }
  };

  const handleProceed = (e) => {
    e.preventDefault();
    
    // Check if time slots are enabled and validate volunteer allocation
    if (formData.timeSlotsEnabled && formData.timeSlots && formData.timeSlots.length > 0 && !formData.unlimitedVolunteers) {
      if (remainingVolunteers < 0) {
        // Show error and prevent proceeding
        showAlert(`❌ Cannot proceed: You have over-allocated ${Math.abs(remainingVolunteers)} volunteers. Please adjust your category limits before continuing.`, 'error');
        return;
      }
    }
    
    // Clear editing state before proceeding to ensure accurate validation
    setEditingCategory(null);
    onNext();
  };

  // Helper to handle appending new files
  const handleAddImages = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    // Enhanced file validation with better feedback
    const validationResults = validateImageFiles(files);
    
    if (validationResults.invalidFiles.length > 0) {
      const errorMessage = `❌ Additional file validation failed:\n${validationResults.invalidFiles.join('\n')}`;
      showAlert.warning(errorMessage);
    }

    if (validationResults.validFiles.length === 0) {
      e.target.value = '';
      return;
    }

    // Show success message for valid files
    if (validationResults.validFiles.length > 0) {
      const fileNames = validationResults.validFiles.map(f => f.name).join(', ');
      showAlert.success(`✅ ${validationResults.validFiles.length} additional image(s) validated: ${fileNames}`);
    }

    // Start upload for each valid file
    for (const file of validationResults.validFiles) {
      await handleImageUpload(file);
    }

    // Clear the file input
    e.target.value = '';
  };

  const handleRemoveNewImage = (idx) => {
    const removedImage = formData.eventImages[idx];
    setFormData(prev => ({
      ...prev,
      eventImages: prev.eventImages.filter((_, i) => i !== idx)
    }));
    
    if (removedImage) {
      showAlert(`🗑️ Image removed: ${removedImage.name}`, 'info');
    }
  };

  const handleRemoveNewLetter = async () => {
    if (newLetterFile) {
      try {
        // If the file was uploaded to Cloudinary, delete it from there too
        if (newLetterFile.uploaded && newLetterFile.cloudinaryId) {
          try {
            // Show loading state for the letter
            setNewLetterFile(prev => prev ? { ...prev, isDeleting: true } : null);

            // Call the existing Cloudinary deletion utility through a simple endpoint
            const response = await axiosInstance.post('/api/events/delete-cloudinary-file', {
              publicId: newLetterFile.cloudinaryId,
              fileName: newLetterFile.name
            });

            if (response.status === 200) {
              // Format-specific success message
              const fileType = newLetterFile.type || '';
              let fileTypeText = 'Government approval letter';
              
              if (fileType.startsWith('image/')) {
                fileTypeText = 'Image document';
              } else if (fileType === 'application/pdf') {
                fileTypeText = 'PDF document';
              } else if (fileType.startsWith('text/')) {
                fileTypeText = 'Text document';
              }
              
              showAlert.success(`🗑️ ${fileTypeText} removed from Cloudinary: ${newLetterFile.name}`);
            } else {
              showAlert.warning(`⚠️ Document removed from form but Cloudinary cleanup failed: ${newLetterFile.name}`);
            }
          } catch (error) {
            console.warn('Failed to delete document from Cloudinary, but removed from form:', error);
            showAlert.warning(`⚠️ Document removed from form but Cloudinary cleanup failed: ${newLetterFile.name}`);
          } finally {
            // Clear loading state
            setNewLetterFile(prev => prev ? { ...prev, isDeleting: false } : null);
          }
        } else {
          // File wasn't uploaded yet, just show removal message
          const fileType = newLetterFile.type || '';
          let fileTypeText = 'Government approval letter';
          
          if (fileType.startsWith('image/')) {
            fileTypeText = 'Image document';
          } else if (fileType === 'application/pdf') {
            fileTypeText = 'PDF document';
          } else if (fileType.startsWith('text/')) {
            fileTypeText = 'Text document';
          }
          
          showAlert.info(`🗑️ ${fileTypeText} removed: ${newLetterFile.name}`);
        }
      } catch (error) {
        console.error('Error removing document:', error);
        showAlert.error(`❌ Error removing document: ${error.message}`);
      }
    }
    
    // Clean up all states
    setNewLetterFile(null);
    setLetterFile(null);
    
    // Clear the letter from form data
    setFormData(prev => ({
      ...prev,
      govtApprovalLetter: null
    }));
    
    // Clear upload progress and status for this file
    if (newLetterFile?.name) {
      onUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[newLetterFile.name];
        return newProgress;
      });
      onUploadStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[newLetterFile.name];
        return newStatus;
      });
      onUploadError(newLetterFile.name, null);
    }
    
    // Clear the file input more reliably
    const fileInputs = document.querySelectorAll('input[type="file"][accept="image/*,application/pdf"]');
    fileInputs.forEach(input => {
      if (input.files && input.files.length > 0) {
        input.value = '';
      }
    });
  };

  const handleRemoveImage = async (index) => {
    const removedFile = formData.eventImages[index];
    if (removedFile) {
      try {
        // If the file was uploaded to Cloudinary, delete it from there too
        if (removedFile.uploaded && removedFile.cloudinaryId) {
          try {
            // Show loading state for this specific image
            setFormData(prev => ({
              ...prev,
              eventImages: prev.eventImages.map((img, idx) => 
                idx === index ? { ...img, isDeleting: true } : img
              )
            }));

            // Call the existing Cloudinary deletion utility through a simple endpoint
            const response = await axiosInstance.post('/api/events/delete-cloudinary-file', {
              publicId: removedFile.cloudinaryId,
              fileName: removedFile.name
            });

            if (response.status === 200) {
              showAlert.success(`🗑️ Image removed from Cloudinary: ${removedFile.name}`);
            } else {
              showAlert.warning(`⚠️ Image removed from form but Cloudinary cleanup failed: ${removedFile.name}`);
            }
          } catch (error) {
            console.warn('Failed to delete from Cloudinary, but removed from form:', error);
            showAlert.warning(`⚠️ Image removed from form but Cloudinary cleanup failed: ${removedFile.name}`);
          } finally {
            // Clear loading state
            setFormData(prev => ({
              ...prev,
              eventImages: prev.eventImages.map((img, idx) => 
                idx === index ? { ...img, isDeleting: false } : img
              )
            }));
          }
        } else {
          // File wasn't uploaded yet, just show removal message
          showAlert.info(`🗑️ Image removed: ${removedFile.name}`);
        }
        
        // Remove from form data
        setFormData(prev => ({
          ...prev,
          eventImages: prev.eventImages.filter((_, i) => i !== index)
        }));

        // Clear upload states for this file
        if (removedFile.name) {
          onUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[removedFile.name];
            return newProgress;
          });
          onUploadStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[removedFile.name];
            return newStatus;
          });
          onUploadError(removedFile.name, null); // Clear error
        }
        
      } catch (error) {
        console.error('🔍 DEBUG: Error removing image:', error);
        showAlert.error(`❌ Error removing image: ${error.message}`);
        
        // Still remove from form data even if Cloudinary deletion fails
        setFormData(prev => ({
          ...prev,
          eventImages: prev.eventImages.filter((_, i) => i !== index)
        }));
      }
    }
  };

  const clearUploadError = (fileName) => {
    onUploadError(fileName, null);
    showAlert.success(`✅ Upload error cleared for ${fileName}`);
  };

  return (
    <Box component="form" onSubmit={handleProceed} sx={{ p: 3, bgcolor: "white", borderRadius: 2, boxShadow: 3 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        Step 1: Event Details
      </Typography>

      {!selectedOrgId && (
        <FormControl fullWidth margin="normal">
          <InputLabel>Select Organization</InputLabel>
          <Select
            name="organization"
            value={formData.organization}
            onChange={handleChange}
            required
            label="Select Organization"
          >
            {organizationOptions.map((org) => (
              <MenuItem key={org._id} value={org._id}>
                {org.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <TextField fullWidth margin="normal" name="title" label="Event Name" value={formData.title} onChange={handleChange} required />
      <TextField fullWidth margin="normal" multiline rows={3} name="description" label="Event Description" value={formData.description} onChange={handleChange} />
      
      {/* --- NEW LOCATION SECTION --- */}
      <Box mt={2} mb={2}>
        <Typography variant="subtitle1" gutterBottom sx={{ mb: 1 }}>
          Event Location
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Search for a location or click on the map to set the exact coordinates. The address will be automatically filled.
        </Typography>
        <LocationPicker
          value={formData.mapLocation} // Pass the mapLocation object
          onChange={handleLocationChange}
        />
         <TextField 
          fullWidth 
          margin="normal" 
          name="location"
          label="Location (Simple Text)" 
          value={formData.location || ''} 
          onChange={handleChange}
          helperText="A simple text description of the location (e.g., 'Near Central Park')."
        />
      </Box>
      {/* --- END NEW LOCATION SECTION --- */}

      <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
        <TextField fullWidth type="datetime-local" name="startDateTime" label="Start Date & Time" InputLabelProps={{ shrink: true }} value={formData.startDateTime} onChange={handleChange} required />
        <TextField fullWidth type="datetime-local" name="endDateTime" label="End Date & Time" InputLabelProps={{ shrink: true }} value={formData.endDateTime} onChange={handleChange} required min={formData.startDateTime || undefined} />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
        <TextField
          fullWidth
          type="number"
          name="maxVolunteers"
          label="Max Volunteers"
          value={formData.maxVolunteers}
          onChange={handleMaxVolunteersChange}
          disabled={formData.unlimitedVolunteers}
          inputProps={{ min: 1 }}
        />
        <FormControlLabel
          control={<Checkbox checked={formData.unlimitedVolunteers} onChange={handleChange} name="unlimitedVolunteers" />}
          label="Unlimited"
        />
      </Box>

      {/* Volunteer Allocation Status */}
      {formData.timeSlotsEnabled && formData.timeSlots && formData.timeSlots.length > 0 && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Volunteer Allocation Status
          </Typography>
          
          {formData.unlimitedVolunteers ? (
            <Chip 
              label="Unlimited volunteers - no allocation limits" 
              color="success" 
              variant="outlined"
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip 
                label={`Remaining: ${remainingVolunteers} volunteers`}
                color={remainingVolunteers < 0 ? 'error' : remainingVolunteers < 10 ? 'warning' : 'success'}
                variant="outlined"
              />
              {allocationError && (
                <Alert severity="error" sx={{ flexGrow: 1 }}>
                  {allocationError}
                </Alert>
              )}
            </Box>
          )}
        </Box>
      )}

      <FormControl fullWidth margin="normal">
        <InputLabel>Event Type</InputLabel>
        <Select name="eventType" value={formData.eventType} onChange={handleChange} label="Event Type">
          {eventTypes.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box mt={2}>
        <Typography variant="subtitle1" gutterBottom>
          Equipment Needed
        </Typography>
        <FormGroup row>
          {equipmentOptions.map((item) => (
            <FormControlLabel
              key={item}
              control={
                <Checkbox
                  name="equipmentNeeded"
                  value={item}
                  checked={formData.equipmentNeeded.includes(item)}
                  onChange={handleChange}
                />
              }
              label={item}
            />
          ))}
        </FormGroup>
      </Box>

      <TextField fullWidth margin="normal" name="otherEquipment" label="Other Equipment" value={formData.otherEquipment} onChange={handleChange} />
      <TextField fullWidth multiline rows={2} margin="normal" name="instructions" label="Additional Instructions" value={formData.instructions} onChange={handleChange} />

      <Box mt={2}>
        <FormControlLabel control={<Checkbox checked={formData.groupRegistration} onChange={handleChange} name="groupRegistration" />} label="Enable Group Registration" />
      </Box>

      <Box mt={2}>
        <FormControlLabel control={<Checkbox checked={formData.recurringEvent} onChange={handleChange} name="recurringEvent" />} label="Recurring Event?" />
      </Box>

      {formData.recurringEvent && (
        <Box mt={2}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            Recurring Event Settings
          </Typography>
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Recurring Type</InputLabel>
            <Select name="recurringType" value={formData.recurringType} onChange={handleChange} label="Recurring Type">
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>

          {formData.recurringType === "weekly" && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Day of the Week</InputLabel>
              <Select name="recurringValue" value={formData.recurringValue} onChange={handleChange} label="Day of the Week">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                  <MenuItem key={day} value={day}>
                    {day}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {formData.recurringType === "monthly" && (
            <TextField
              fullWidth
              margin="normal"
              type="number"
              name="recurringValue"
              label="Day of the Month (e.g. 1 for 1st)"
              value={formData.recurringValue}
              onChange={handleChange}
              inputProps={{ min: 1, max: 31 }}
            />
          )}

          <TextField
            fullWidth
            margin="normal"
            type="date"
            name="recurringEndDate"
            label="Series End Date (Optional)"
            value={formData.recurringEndDate}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: new Date().toISOString().split('T')[0] }}
          />

          <TextField
            fullWidth
            margin="normal"
            type="number"
            name="recurringMaxInstances"
            label="Maximum Instances (Optional)"
            value={formData.recurringMaxInstances}
            onChange={handleChange}
            inputProps={{ min: 1, max: 100 }}
            helperText="Leave empty for unlimited instances"
          />

          <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="body2" color="textSecondary">
              <strong>How it works:</strong> When this event completes, a new instance will be automatically created 
              with the same details but on the next scheduled date. Each instance will have independent volunteer 
              registrations, but the organizer team will remain the same.
            </Typography>
          </Box>
        </Box>
      )}

      <Box mt={2}>
        <Typography variant="subtitle1" gutterBottom>
          Event Images (optional) - Limit: 5
        </Typography>
        
        {/* Upload Guidance */}
        <Box mb={2} p={2} bgcolor="info.light" borderRadius={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2" color="info.contrastText">
              💡 Upload Tips & Guidelines
            </Typography>
            <Box
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.7rem',
                fontWeight: 'bold',
                color: 'white',
                backgroundColor: 'info.main'
              }}
            >
              MAX: 5
            </Box>
          </Box>
          {getUploadGuidance('image').tips.map((tip, index) => (
            <Typography key={index} variant="caption" color="info.contrastText" display="block">
              {tip}
            </Typography>
          ))}
          <Typography variant="caption" color="info.contrastText" sx={{ mt: 1, fontStyle: 'italic' }}>
            💭 Pro tip: {getUploadGuidance('image').recommendations[0]}
          </Typography>
        </Box>
        

        

        


        {/* Upload Progress Indicator */}
        {isUploading && uploadProgress && typeof uploadProgress === 'object' && Object.keys(uploadProgress).length > 0 && (
          <Box mb={2} p={2} bgcolor="info.light" borderRadius={1}>
            <Typography variant="body2" color="info.contrastText" gutterBottom>
              📤 Uploading files... Please wait before proceeding
            </Typography>
            {uploadProgress && typeof uploadProgress === 'object' && Object.entries(uploadProgress).map(([fileName, progress]) => (
              <Box key={fileName} mt={1}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="caption" color="info.contrastText">
                    {fileName}
                  </Typography>
                  <Typography variant="caption" color="info.contrastText">
                    {progress}%
                  </Typography>
                </Box>
                <Box 
                  sx={{ 
                    width: '100%', 
                    height: 8, 
                    bgcolor: 'info.main', 
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}
                >
                  <Box 
                    sx={{ 
                      width: `${progress}%`, 
                      height: '100%', 
                      bgcolor: 'white',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {/* Enhanced Upload Errors with Recovery Options */}
        {uploadErrors && typeof uploadErrors === 'object' && Object.keys(uploadErrors).length > 0 && (
          <Box mb={2} p={2} bgcolor="error.light" borderRadius={1}>
            <Typography variant="body2" color="error.contrastText" gutterBottom>
              ❌ Upload errors detected. Please resolve before proceeding:
            </Typography>
            {Object.entries(uploadErrors)
              .filter(([fileName, error]) => fileName && error) // Filter out invalid entries
              .map(([fileName, error]) => {
              // Determine file type for recovery options
              const fileType = fileName.includes('.pdf') || fileName.includes('letter') ? 'letter' : 'image';
              
              // Smart error categorization based on error message
              const getErrorCategory = (errorMsg) => {
                // Safety check for undefined/null error messages
                if (!errorMsg || typeof errorMsg !== 'string') {
                  return 'unknown';
                }
                
                const msg = errorMsg.toLowerCase();
                if (msg.includes('size') || msg.includes('large') || msg.includes('mb')) return 'size';
                if (msg.includes('format') || msg.includes('type') || msg.includes('invalid')) return 'validation';
                if (msg.includes('network') || msg.includes('connection')) return 'network';
                if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
                if (msg.includes('permission') || msg.includes('denied')) return 'permission';
                if (msg.includes('authentication') || msg.includes('login')) return 'authentication';
                if (msg.includes('server') || msg.includes('500') || msg.includes('502')) return 'server';
                if (msg.includes('rate') || msg.includes('too many')) return 'rate_limit';
                return 'unknown';
              };
              
              const errorCategory = getErrorCategory(error);
              
              return (
                <Box key={fileName} mt={2} p={2} bgcolor="error.main" borderRadius={1}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" color="white" gutterBottom>
                        <strong>📁 {fileName}</strong>
                      </Typography>
                      <Typography variant="caption" color="white" display="block">
                        ❌ {error}
                      </Typography>
                    </Box>
                    
                    {/* Action Buttons */}
                    <Box display="flex" gap={1}>
                      <Button
                        size="small"
                        color="primary"
                        variant="contained"
                        onClick={() => handleRetryUpload(fileName, fileType)}
                        sx={{ 
                          minWidth: 'auto', 
                          px: 1,
                          backgroundColor: 'white',
                          color: 'primary.main',
                          '&:hover': {
                            backgroundColor: 'grey.100'
                          }
                        }}
                        title="Retry Upload"
                      >
                        🔄 Retry
                      </Button>
                      <Button
                        size="small"
                        color="secondary"
                        variant="contained"
                        onClick={() => handleFileOptimization(fileName, fileType)}
                        sx={{ 
                          minWidth: 'auto', 
                          px: 1,
                          backgroundColor: 'white',
                          color: 'secondary.main',
                          '&:hover': {
                            backgroundColor: 'grey.100'
                          }
                        }}
                        title="Get Optimization Tips"
                      >
                        🛠️ Optimize
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        variant="contained"
                        onClick={() => clearUploadError(fileName)}
                        sx={{ 
                          minWidth: 'auto', 
                          px: 1,
                          backgroundColor: 'white',
                          color: 'error.main',
                          '&:hover': {
                            backgroundColor: 'grey.100'
                          }
                        }}
                        title="Clear Error"
                      >
                        ✕ Clear
                      </Button>
                    </Box>
                  </Box>
                  
                  {/* Recovery Steps */}
                  <Box mt={2} p={2} bgcolor="rgba(255,255,255,0.1)" borderRadius={1}>
                    <Typography variant="caption" color="white" gutterBottom display="block">
                      💡 Recovery Steps:
                    </Typography>
                    <Box component="ul" sx={{ margin: 0, paddingLeft: 2, color: 'white' }}>
                      {getErrorRecoverySteps(errorCategory, fileName).slice(0, 2).map((step, index) => (
                        <Box component="li" key={index} sx={{ fontSize: '0.75rem', marginBottom: 0.5 }}>
                          {step}
                        </Box>
                      ))}
                    </Box>
                    <Typography variant="caption" color="white" sx={{ fontSize: '0.7rem', fontStyle: 'italic' }}>
                      Click "Optimize" for more detailed tips and "Retry" to attempt upload again.
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
        
        {/* Initial Image Upload Button */}
        {(!formData.eventImages || formData.eventImages.length === 0) && (
          <Button
            variant="outlined"
            component="label"
            sx={{ mb: 2 }}
            startIcon={<span>📷</span>}
          >
            Upload Event Images
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handleImageChange}
            />
          </Button>
        )}
        
        {/* Enhanced Existing Images */}
        {existingImages.length > 0 && (
          <Box mb={2}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              🖼️ Existing Images ({existingImages.length})
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={2}>
              {existingImages.map((img, index) => {
                // Handle Cloudinary structure
                if (typeof img === 'object' && img.url) {
                  const isDeleting = img.isDeleting || false;
                  
                  return (
                    <Box 
                      key={index} 
                      sx={{
                        position: 'relative',
                        border: '2px solid',
                        borderColor: isDeleting ? 'error.main' : 'info.main',
                        borderRadius: 2,
                        p: 1,
                        minWidth: 120,
                        backgroundColor: isDeleting ? 'error.light' : 'background.paper',
                        opacity: isDeleting ? 0.7 : 1,
                        '&:hover': {
                          boxShadow: 2,
                          transform: isDeleting ? 'none' : 'scale(1.02)',
                          transition: 'all 0.2s ease'
                        }
                      }}
                    >
                      {/* Status Badge */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          color: 'white',
                          backgroundColor: isDeleting ? 'error.main' : 'info.main',
                          zIndex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5
                        }}
                      >
                        {isDeleting ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            🗑️
                          </>
                        ) : (
                          '📁'
                        )}
                      </Box>

                      {/* Deletion Loading Overlay */}
                      {isDeleting && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(255, 0, 0, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 3
                          }}
                        >
                          <Box sx={{ textAlign: 'center', color: 'white' }}>
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                border: '3px solid rgba(255,255,255,0.3)',
                                borderTopColor: 'white',
                                animation: 'spin 1s linear infinite',
                                mb: 1,
                                '@keyframes spin': {
                                  '0%': { transform: 'rotate(0deg)' },
                                  '100%': { transform: 'rotate(360deg)' }
                                }
                              }}
                            />
                            <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}>
                              Deleting...
                            </Typography>
                          </Box>
                        </Box>
                      )}

                      {/* Image Preview */}
                      <Box
                        sx={{
                          width: 120,
                          height: 120,
                          borderRadius: 1,
                          overflow: 'hidden',
                          mb: 1,
                          cursor: 'pointer',
                          '&:hover': {
                            opacity: 0.8
                          }
                        }}
                        onClick={() => !isDeleting && handlePreviewExistingImage(img, index)}
                        style={{ cursor: isDeleting ? 'not-allowed' : 'pointer' }}
                      >
                      <img 
                        src={img.url} 
                        alt={img.filename || `Event Image ${index + 1}`} 
                          width="100%"
                          height="100%"
                          style={{ objectFit: 'cover' }} 
                        />
                      </Box>

                      {/* File Information */}
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography 
                          variant="caption" 
                          color="textSecondary" 
                          sx={{ 
                            display: 'block',
                            fontWeight: 'medium',
                            wordBreak: 'break-word',
                            lineHeight: 1.2
                          }}
                        >
                          {img.filename ? 
                            (img.filename.length > 20 ? img.filename.substring(0, 20) + '...' : img.filename) :
                            `Event Image ${index + 1}`
                          }
                        </Typography>
                        
                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                          Existing File
                        </Typography>

                        {/* Deletion Progress Indicator */}
                        {isDeleting && (
                          <Box sx={{ mb: 1, mt: 1 }}>
                            <Box
                              sx={{
                                width: '100%',
                                height: 6,
                                bgcolor: 'grey.300',
                                borderRadius: 3,
                                overflow: 'hidden',
                                position: 'relative'
                              }}
                            >
                              <Box
                                sx={{
                                  width: '100%',
                                  height: '100%',
                                  bgcolor: 'error.main',
                                  borderRadius: 3,
                                  background: 'linear-gradient(90deg, #f44336 0%, #ff9800 50%, #f44336 100%)',
                                  backgroundSize: '200% 100%',
                                  animation: 'shimmer 1.5s ease-in-out infinite',
                                  '@keyframes shimmer': {
                                    '0%': { backgroundPosition: '200% 0' },
                                    '100%': { backgroundPosition: '-200% 0' }
                                  }
                                }}
                              />
                            </Box>
                            <Typography variant="caption" color="error.main" sx={{ fontSize: '0.65rem', mt: 0.5, fontWeight: 'bold' }}>
                              🗑️ Deleting from Cloudinary...
                            </Typography>
                          </Box>
                        )}

                        {/* Action Buttons */}
                        <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                          <Button 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                            onClick={() => handlePreviewExistingImage(img, index)}
                            sx={{ minWidth: 'auto', px: 1, fontSize: '0.7rem' }}
                            title="Preview Image"
                            disabled={isDeleting}
                          >
                            👁️
                          </Button>
                      <Button 
                        size="small" 
                        color="error" 
                        variant="outlined"
                        onClick={() => onRemoveExistingImage(img)}
                        sx={{ minWidth: 'auto', px: 1, fontSize: '0.7rem' }}
                        title="Remove Image"
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <CircularProgress size={12} color="inherit" />
                            <span style={{ fontSize: '0.6rem' }}>Deleting...</span>
                          </Box>
                        ) : (
                          '🗑️'
                        )}
                      </Button>
                        </Box>
                      </Box>
                    </Box>
                  );
                }
                return null;
              })}
            </Box>
          </Box>
        )}
        
        {/* Enhanced New Uploads Preview */}
        {Array.isArray(formData.eventImages) && formData.eventImages.length > 0 && (
          <Box mb={2}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              📸 New Images ({formData.eventImages.length})
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={2}>
              {formData.eventImages.filter(file => file && file.name).map((file, idx) => (
                <Box 
                  key={idx} 
                  sx={{
                    position: 'relative',
                    border: '2px solid',
                    borderColor: file.uploaded ? 'success.main' : 
                                uploadProgress && uploadProgress[file.name] !== undefined ? 'info.main' :
                                uploadErrors && uploadErrors[file.name] ? 'error.main' : 'grey.300',
                    borderRadius: 2,
                    p: 1,
                    width: 150,
                    backgroundColor: 'background.paper',
                    boxShadow: 1,
                    '&:hover': {
                      boxShadow: 3,
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s ease'
                    }
                  }}
                >
                  {/* Status Badge */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      color: 'white',
                      backgroundColor: file.uploaded ? 'success.main' : 
                                      uploadProgress && uploadProgress[file.name] !== undefined ? 'info.main' :
                                      uploadErrors && uploadErrors[file.name] ? 'error.main' : 'grey.400',
                      zIndex: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}
                  >
                    {file.uploaded ? '✅' : 
                     uploadProgress && uploadProgress[file.name] !== undefined ? '⏳' :
                     uploadErrors && uploadErrors[file.name] ? '❌' : '📁'}
                  </Box>

                  {/* Image Preview */}
                  <Box
                    sx={{
                      width: '100%',
                      height: 120,
                      borderRadius: 1,
                      overflow: 'hidden',
                      mb: 1,
                      cursor: 'pointer',
                      position: 'relative',
                      backgroundColor: 'grey.100',
                      '&:hover': {
                        opacity: file.uploaded ? 0.8 : 1
                      }
                    }}
                    onClick={() => file.uploaded && handlePreviewImage(file, idx)}
                  >
                    <img
                      src={file.uploaded && file.cloudinaryUrl ? file.cloudinaryUrl : URL.createObjectURL(file)}
                    alt={`Upload Preview ${idx + 1}`}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        opacity: (!file.uploaded && uploadProgress && uploadProgress[file.name] !== undefined) ? 0.7 : 1
                      }}
                    />
                    
                    {/* Upload Overlay */}
                    {!file.uploaded && uploadProgress && uploadProgress[file.name] !== undefined && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0, 0, 0, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Box sx={{ textAlign: 'center', color: 'white' }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              border: '3px solid rgba(255,255,255,0.3)',
                              borderTopColor: 'white',
                              animation: 'spin 1s linear infinite',
                              mb: 1,
                              '@keyframes spin': {
                                '0%': { transform: 'rotate(0deg)' },
                                '100%': { transform: 'rotate(360deg)' }
                              }
                            }}
                          />
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            {uploadProgress[file.name]}%
                  </Typography>
                        </Box>
                      </Box>
                    )}

                    {/* Deletion Loading Overlay */}
                    {file.isDeleting && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(255, 0, 0, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 3
                        }}
                      >
                        <Box sx={{ textAlign: 'center', color: 'white' }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              border: '3px solid rgba(255,255,255,0.3)',
                              borderTopColor: 'white',
                              animation: 'spin 1s linear infinite',
                              mb: 1,
                              '@keyframes spin': {
                                '0%': { transform: 'rotate(0deg)' },
                                '100%': { transform: 'rotate(360deg)' }
                              }
                            }}
                          />
                          <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}>
                            Deleting...
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>

                  {/* File Information */}
                  <Box sx={{ textAlign: 'center', px: 0.5 }}>
                    <Typography 
                      variant="caption" 
                      color="textPrimary" 
                      sx={{ 
                        display: 'block',
                        fontWeight: 'medium',
                        wordBreak: 'break-word',
                        lineHeight: 1.2,
                        mb: 0.5
                      }}
                    >
                      {file.name && file.name.length > 18 ? file.name.substring(0, 18) + '...' : (file.name || 'Unknown File')}
                    </Typography>
                    
                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem', mb: 1, display: 'block' }}>
                      {getFileTypeIcon(file.type || '')} {formatFileSize(file.size || 0)}
                    </Typography>

                    {/* Upload Progress Bar */}
                    {!file.uploaded && uploadProgress && uploadProgress[file.name] !== undefined && (
                      <Box sx={{ mb: 1 }}>
                        <Box
                          sx={{
                            width: '100%',
                            height: 6,
                            bgcolor: 'grey.300',
                            borderRadius: 3,
                            overflow: 'hidden'
                          }}
                        >
                          <Box
                            sx={{
                              width: `${uploadProgress[file.name]}%`,
                              height: '100%',
                              bgcolor: 'info.main',
                              transition: 'width 0.3s ease',
                              borderRadius: 3
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color="info.main" sx={{ fontSize: '0.65rem', mt: 0.5 }}>
                          Uploading... {uploadProgress[file.name]}%
                        </Typography>
                      </Box>
                    )}

                    {/* Deletion Progress Indicator */}
                    {file.isDeleting && (
                      <Box sx={{ mb: 1 }}>
                        <Box
                          sx={{
                            width: '100%',
                            height: 6,
                            bgcolor: 'grey.300',
                            borderRadius: 3,
                            overflow: 'hidden',
                            position: 'relative'
                          }}
                        >
                          <Box
                            sx={{
                              width: '100%',
                              height: '100%',
                              bgcolor: 'error.main',
                              borderRadius: 3,
                              background: 'linear-gradient(90deg, #f44336 0%, #ff9800 50%, #f44336 100%)',
                              backgroundSize: '200% 100%',
                              animation: 'shimmer 1.5s ease-in-out infinite',
                              '@keyframes shimmer': {
                                '0%': { backgroundPosition: '200% 0' },
                                '100%': { backgroundPosition: '-200% 0' }
                              }
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color="error.main" sx={{ fontSize: '0.65rem', mt: 0.5, fontWeight: 'bold' }}>
                          🗑️ Deleting from Cloudinary...
                        </Typography>
                      </Box>
                    )}

                    {/* Error Message */}
                    {uploadErrors && uploadErrors[file.name] && (
                      <Typography variant="caption" color="error.main" sx={{ fontSize: '0.65rem', mb: 1, display: 'block' }}>
                        Upload failed
                      </Typography>
                    )}

                    {/* Success Message */}
                    {file.uploaded && (
                      <Typography variant="caption" color="success.main" sx={{ fontSize: '0.65rem', mb: 1, display: 'block' }}>
                        ✓ Upload complete
                      </Typography>
                    )}

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      {/* Preview button - only for uploaded images */}
                      {file.uploaded && (
                        <Button 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                          onClick={() => handlePreviewImage(file, idx)}
                          sx={{ minWidth: 'auto', px: 1, fontSize: '0.7rem' }}
                          title="Preview Image"
                        >
                          👁️
                        </Button>
                      )}
                      
                      {/* Cancel button - only for uploading images */}
                      {!file.uploaded && uploadProgress && uploadProgress[file.name] !== undefined && (
                        <Button 
                          size="small" 
                          color="warning" 
                          variant="outlined"
                          onClick={() => handleCancelUpload(file.name, idx)}
                          sx={{ minWidth: 'auto', px: 1, fontSize: '0.7rem' }}
                          title="Cancel Upload"
                        >
                          ⏹️
                        </Button>
                      )}
                      
                      {/* Retry button - only for failed uploads */}
                      {uploadErrors && uploadErrors[file.name] && (
                        <Button 
                          size="small" 
                          color="info" 
                          variant="outlined"
                          onClick={() => handleRetryUpload(file.name, 'image')}
                          sx={{ minWidth: 'auto', px: 1, fontSize: '0.7rem' }}
                          title="Retry Upload"
                        >
                          🔄
                        </Button>
                      )}
                      
                      {/* Remove button - for uploaded images or failed uploads */}
                      {(file.uploaded || (uploadErrors && uploadErrors[file.name])) && (
                  <Button 
                    size="small" 
                    color="error" 
                    variant="outlined"
                          onClick={() => handleRemoveImage(idx)}
                          sx={{ minWidth: 'auto', px: 1, fontSize: '0.7rem' }}
                          title="Remove Image"
                          disabled={file.isDeleting}
                        >
                          {file.isDeleting ? (
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <CircularProgress size={12} color="inherit" />
                              <span style={{ fontSize: '0.6rem' }}>Deleting...</span>
                            </Box>
                          ) : (
                            '🗑️'
                          )}
                  </Button>
                      )}
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        
        {/* Add More Images Button - Only show if there are already images and under limit */}
        {Array.isArray(formData.eventImages) && formData.eventImages.length > 0 && formData.eventImages.length < 5 && (
          <Button
            variant="outlined"
            component="label"
            sx={{ mt: 1 }}
            startIcon={<span>➕</span>}
          >
            Add More Images
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={e => {
                handleAddImages(e);
                e.target.value = null; // Reset input after handling
              }}
            />
          </Button>
        )}
        
        {/* Image Limit Reached Message */}
        {Array.isArray(formData.eventImages) && formData.eventImages.length >= 5 && (
          <Box 
            sx={{ 
              mt: 1, 
              p: 2, 
              bgcolor: 'warning.light', 
              borderRadius: 1, 
              border: '1px solid',
              borderColor: 'warning.main'
            }}
          >
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Typography variant="body2" color="warning.main" sx={{ fontWeight: 'bold' }}>
                🚫 Image Upload Limit Reached
              </Typography>
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  color: 'white',
                  backgroundColor: 'warning.main'
                }}
              >
                5/5
              </Box>
            </Box>
            <Typography variant="body2" color="warning.contrastText" gutterBottom>
              You have reached the maximum limit of 5 event images. 
              Remove some existing images to upload new ones.
            </Typography>
          </Box>
        )}
      </Box>

      <Box mt={2}>
        <Typography variant="subtitle1" gutterBottom>
          Govt Approval Letter (Image/PDF) - Limit: 1
        </Typography>
        
        {/* Upload Guidance */}
        <Box mb={2} p={2} bgcolor="info.light" borderRadius={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2" color="info.contrastText">
              💡 Upload Tips & Guidelines
            </Typography>
            <Box
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.7rem',
                fontWeight: 'bold',
                color: 'white',
                backgroundColor: 'info.main'
              }}
            >
              MAX: 1
            </Box>
          </Box>
          {getUploadGuidance('letter').tips.map((tip, index) => (
            <Typography key={index} variant="caption" color="info.contrastText" display="block">
              {tip}
            </Typography>
          ))}
          <Typography variant="caption" color="info.contrastText" sx={{ mt: 1, fontStyle: 'italic' }}>
            💭 Pro tip: {getUploadGuidance('letter').recommendations[0]}
          </Typography>
        </Box>
        

        

        
        {/* Enhanced Existing Letter Display */}
        {existingLetter && (
          <Box 
            sx={{
              border: '2px solid',
              borderColor: existingLetter.isDeleting ? 'error.main' : 'info.main',
              borderRadius: 2,
              p: 2,
              mb: 2,
              backgroundColor: existingLetter.isDeleting ? 'error.light' : 'background.paper',
              opacity: existingLetter.isDeleting ? 0.7 : 1,
              '&:hover': {
                boxShadow: 1,
                transition: 'all 0.2s ease'
              },
              position: 'relative'
            }}
          >
            {/* Deletion Progress Overlay */}
            {existingLetter.isDeleting && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(255, 0, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                  borderRadius: 1
                }}
              >
                <Box sx={{ textAlign: 'center', color: 'white' }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      border: '3px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                      animation: 'spin 1s linear infinite',
                      mb: 1,
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' }
                      }
                    }}
                  />
                  <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
                    Deleting...
                  </Typography>
                </Box>
              </Box>
            )}
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box sx={{ flex: 1 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="body2" color="info.main" sx={{ fontWeight: 'bold' }}>
                    📁 Existing Letter Available
                  </Typography>
                  <Box
                    sx={{
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      color: 'white',
                      backgroundColor: existingLetter.isDeleting ? 'error.main' : 'info.main',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}
                  >
                    {existingLetter.isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        DELETING
                      </>
                    ) : (
                      'STORED'
                    )}
                  </Box>
                </Box>
                
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  📄 {existingLetter?.filename || existingLetter?.name || 'Government Approval Letter'}
                </Typography>
                
                <Typography variant="caption" color="textSecondary" display="block">
                  💾 This letter is already stored in the system
                </Typography>
              </Box>

              {/* Action Buttons */}
              <Box display="flex" flexDirection="column" gap={1}>
                <Button 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                  onClick={() => handlePreviewExistingLetter(existingLetter)}
                  disabled={existingLetter.isDeleting}
                  sx={{ 
                    minWidth: 'auto', 
                    px: 1,
                    opacity: existingLetter.isDeleting ? 0.5 : 1,
                    cursor: existingLetter.isDeleting ? 'not-allowed' : 'pointer'
                  }}
                  title={existingLetter.isDeleting ? "Deleting..." : "View Letter"}
                >
                  👁️ View
                </Button>
                <Button 
                  size="small" 
                  color="error" 
                  variant="outlined"
                  onClick={onRemoveExistingLetter}
                  sx={{ minWidth: 'auto', px: 1, fontSize: '0.7rem' }}
                  title="Remove Letter"
                  disabled={existingLetter.isDeleting}
                >
                  {existingLetter.isDeleting ? (
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <CircularProgress size={12} color="inherit" />
                      <span style={{ fontSize: '0.6rem' }}>Deleting...</span>
                    </Box>
                  ) : (
                    '🗑️ Remove'
                  )}
                </Button>
              </Box>
            </Box>
          </Box>
        )}
        
                {/* Enhanced Letter Upload Card */}
        {(newLetterFile || (formData.govtApprovalLetter && !existingLetter)) && (
          <Box 
            sx={{
              border: '2px solid',
              borderColor: (() => {
                const currentLetter = newLetterFile || formData.govtApprovalLetter;
                if (currentLetter.uploaded) return 'success.main';
                if (uploadProgress && uploadProgress[currentLetter.name] !== undefined) return 'info.main';
                if (uploadErrors && uploadErrors[currentLetter.name]) return 'error.main';
                return 'grey.300';
              })(),
              borderRadius: 2,
              p: 2,
              mb: 2,
              backgroundColor: 'background.paper',
              boxShadow: 1,
              position: 'relative',
              '&:hover': {
                boxShadow: 3,
                transform: 'translateY(-1px)',
                transition: 'all 0.2s ease'
              }
            }}
          >
            {/* Deletion Loading Overlay */}
            {(newLetterFile || formData.govtApprovalLetter)?.isDeleting && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(255, 0, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 3,
                  borderRadius: 2
                }}
              >
                <Box sx={{ textAlign: 'center', color: 'error.main' }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      border: '3px solid rgba(244, 67, 54, 0.3)',
                      borderTopColor: 'error.main',
                      animation: 'spin 1s linear infinite',
                      mb: 1,
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' }
                      }
                    }}
                  />
                  <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
                    Deleting from Cloudinary...
            </Typography>
                </Box>
              </Box>
            )}
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ flex: 1, mr: 2 }}>
                {/* Status Header */}
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography 
                    variant="body2" 
                    color={(() => {
                      const currentLetter = newLetterFile || formData.govtApprovalLetter;
                      if (currentLetter.uploaded) return 'success.main';
                      if (uploadProgress && uploadProgress[currentLetter.name] !== undefined) return 'info.main';
                      if (uploadErrors && uploadErrors[currentLetter.name]) return 'error.main';
                      return 'warning.main';
                    })()} 
                    sx={{ fontWeight: 'bold' }}
                  >
                    {(() => {
                      const currentLetter = newLetterFile || formData.govtApprovalLetter;
                      if (currentLetter.uploaded) return '✅ Letter Uploaded';
                      if (uploadProgress && uploadProgress[currentLetter.name] !== undefined) return '⏳ Uploading Letter';
                      if (uploadErrors && uploadErrors[currentLetter.name]) return '❌ Upload Failed';
                      return '📄 Letter Ready';
                    })()}
                  </Typography>
                  
                  <Box
                    sx={{
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      color: 'white',
                      backgroundColor: (() => {
                        const currentLetter = newLetterFile || formData.govtApprovalLetter;
                        if (currentLetter.uploaded) return 'success.main';
                        if (uploadProgress && uploadProgress[currentLetter.name] !== undefined) return 'info.main';
                        if (uploadErrors && uploadErrors[currentLetter.name]) return 'error.main';
                        return 'warning.main';
                      })()
                    }}
                  >
                    {(() => {
                      const currentLetter = newLetterFile || formData.govtApprovalLetter;
                      if (currentLetter.uploaded) return 'COMPLETED';
                      if (uploadProgress && uploadProgress[currentLetter.name] !== undefined) return 'UPLOADING';
                      if (uploadErrors && uploadErrors[currentLetter.name]) return 'FAILED';
                      return 'READY';
                    })()}
                  </Box>
                </Box>
                
                {/* File Information */}
                <Typography variant="body2" color="textPrimary" gutterBottom sx={{ fontWeight: 'medium' }}>
                  📄 {(newLetterFile || formData.govtApprovalLetter)?.name && (newLetterFile || formData.govtApprovalLetter).name.length > 30 ? (newLetterFile || formData.govtApprovalLetter).name.substring(0, 30) + '...' : ((newLetterFile || formData.govtApprovalLetter)?.name || 'Unknown File')}
                </Typography>
                
                <Box display="flex" gap={2} mb={1}>
                  <Typography variant="caption" color="textSecondary">
                    📏 {formatFileSize((newLetterFile || formData.govtApprovalLetter)?.size || 0)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    📋 {getFileTypeIcon((newLetterFile || formData.govtApprovalLetter)?.type || '')} {(newLetterFile || formData.govtApprovalLetter)?.type || 'Unknown'}
                  </Typography>
                </Box>

                {/* Upload Progress */}
                {!(newLetterFile || formData.govtApprovalLetter)?.uploaded && uploadProgress && uploadProgress[(newLetterFile || formData.govtApprovalLetter)?.name] !== undefined && (
                  <Box sx={{ mt: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="caption" color="info.main" sx={{ fontWeight: 'medium' }}>
                        Uploading... {uploadProgress[(newLetterFile || formData.govtApprovalLetter)?.name]}%
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: '100%',
                        height: 8,
                        bgcolor: 'grey.300',
                        borderRadius: 4,
                        overflow: 'hidden'
                      }}
                    >
                      <Box
                        sx={{
                          width: `${uploadProgress[(newLetterFile || formData.govtApprovalLetter)?.name]}%`,
                          height: '100%',
                          bgcolor: 'info.main',
                          transition: 'width 0.3s ease',
                          borderRadius: 4
                        }}
                      />
                    </Box>
                  </Box>
                )}

                {/* Deletion Progress Indicator */}
                {(newLetterFile || formData.govtApprovalLetter)?.isDeleting && (
                  <Box sx={{ mt: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="caption" color="error.main" sx={{ fontWeight: 'bold' }}>
                        🗑️ Deleting from Cloudinary...
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: '100%',
                        height: 8,
                        bgcolor: 'grey.300',
                        borderRadius: 4,
                        overflow: 'hidden',
                        position: 'relative'
                      }}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          bgcolor: 'error.main',
                          borderRadius: 4,
                          background: 'linear-gradient(90deg, #f44336 0%, #ff9800 50%, #f44336 100%)',
                          backgroundSize: '200% 100%',
                          animation: 'shimmer 1.5s ease-in-out infinite',
                          '@keyframes shimmer': {
                            '0%': { backgroundPosition: '200% 0' },
                            '100%': { backgroundPosition: '-200% 0' }
                          }
                        }}
                      />
                    </Box>
                  </Box>
                )}

                {/* Error Message */}
                {uploadErrors && uploadErrors[(newLetterFile || formData.govtApprovalLetter)?.name] && (
                  <Typography variant="caption" color="error.main" sx={{ fontWeight: 'medium', mt: 1, display: 'block' }}>
                    ❌ {uploadErrors[(newLetterFile || formData.govtApprovalLetter)?.name] || 'Upload failed'}
                  </Typography>
                )}

                {/* Success Message */}
                {(newLetterFile || formData.govtApprovalLetter)?.uploaded && (
                  <Typography variant="caption" color="success.main" sx={{ fontWeight: 'medium', mt: 1, display: 'block' }}>
                    ✓ Upload completed successfully
                  </Typography>
                )}
              </Box>

              {/* Action Buttons */}
              <Box display="flex" flexDirection="column" gap={1} alignItems="end">
                {/* Preview button - only for uploaded letters */}
                {(newLetterFile || formData.govtApprovalLetter)?.uploaded && (
                  <Button 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                    onClick={() => handlePreviewLetter(newLetterFile || formData.govtApprovalLetter)}
                    sx={{ minWidth: 'auto', px: 1, fontSize: '0.75rem' }}
                    title="Preview Letter"
                  >
                    👁️ Preview
                  </Button>
                )}
                
                {/* Cancel button - only for uploading letters */}
                {!(newLetterFile || formData.govtApprovalLetter)?.uploaded && uploadProgress && uploadProgress[(newLetterFile || formData.govtApprovalLetter)?.name] !== undefined && (
                  <Button 
                    size="small" 
                    color="warning" 
                    variant="outlined"
                    onClick={() => handleCancelLetterUpload((newLetterFile || formData.govtApprovalLetter)?.name)}
                    sx={{ minWidth: 'auto', px: 1, fontSize: '0.75rem' }}
                    title="Cancel Upload"
                  >
                    ⏹️ Cancel
                  </Button>
                )}
                
                {/* Retry button - only for failed uploads */}
                {uploadErrors && uploadErrors[(newLetterFile || formData.govtApprovalLetter)?.name] && (
                  <Button 
                    size="small" 
                    color="info" 
                    variant="outlined"
                    onClick={() => handleRetryUpload((newLetterFile || formData.govtApprovalLetter)?.name, 'letter')}
                    sx={{ minWidth: 'auto', px: 1, fontSize: '0.75rem' }}
                    title="Retry Upload"
                  >
                    🔄 Retry
                  </Button>
                )}
                
                {/* Remove button - for uploaded letters or failed uploads */}
                {((newLetterFile || formData.govtApprovalLetter)?.uploaded || (uploadErrors && uploadErrors[(newLetterFile || formData.govtApprovalLetter)?.name])) && (
            <Button 
              size="small" 
              color="error" 
              variant="outlined"
              onClick={handleRemoveNewLetter}
                    sx={{ minWidth: 'auto', px: 1, fontSize: '0.75rem' }}
                    title="Remove Letter"
                    disabled={(newLetterFile || formData.govtApprovalLetter)?.isDeleting}
                  >
                    {(newLetterFile || formData.govtApprovalLetter)?.isDeleting ? (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <CircularProgress size={14} color="inherit" />
                        <span style={{ fontSize: '0.7rem' }}>Deleting...</span>
                      </Box>
                    ) : (
                      '🗑️ Remove'
                    )}
            </Button>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {/* Letter Upload Progress */}
        {isUploading && uploadProgress && typeof uploadProgress === 'object' && (newLetterFile || formData.govtApprovalLetter)?.name && uploadProgress[(newLetterFile || formData.govtApprovalLetter)?.name] && (
          <Box mb={2} p={2} bgcolor="info.light" borderRadius={1}>
            <Typography variant="body2" color="info.contrastText" gutterBottom>
              📤 Uploading letter: {(newLetterFile || formData.govtApprovalLetter)?.name}
            </Typography>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="caption" color="info.contrastText">
                Progress
              </Typography>
              <Typography variant="caption" color="info.contrastText">
                {uploadProgress[(newLetterFile || formData.govtApprovalLetter)?.name]}%
              </Typography>
            </Box>
            <Box 
              sx={{ 
                width: '100%', 
                height: 8, 
                bgcolor: 'info.main', 
                borderRadius: 4,
                overflow: 'hidden'
              }}
            >
              <Box 
                sx={{ 
                  width: `${uploadProgress[(newLetterFile || formData.govtApprovalLetter)?.name]}%`, 
                  height: '100%', 
                  bgcolor: 'white',
                  transition: 'width 0.3s ease'
                }}
              />
            </Box>
          </Box>
        )}

        {/* Enhanced Letter Upload Errors with Recovery Options */}
        {uploadErrors && typeof uploadErrors === 'object' && (newLetterFile || formData.govtApprovalLetter)?.name && uploadErrors[(newLetterFile || formData.govtApprovalLetter)?.name] && (
          <Box mb={2} p={2} bgcolor="error.light" borderRadius={1}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="error.contrastText" gutterBottom>
                  ❌ Upload error: {uploadErrors[(newLetterFile || formData.govtApprovalLetter)?.name]}
                </Typography>
                <Typography variant="caption" color="error.contrastText" display="block">
                  📄 File: {(newLetterFile || formData.govtApprovalLetter)?.name}
                </Typography>
              </Box>
              
              {/* Action Buttons */}
              <Box display="flex" gap={1}>
                <Button
                  size="small"
                  color="primary"
                  variant="contained"
                  onClick={() => handleRetryUpload((newLetterFile || formData.govtApprovalLetter)?.name, 'letter')}
                  sx={{ 
                    minWidth: 'auto', 
                    px: 1,
                    backgroundColor: 'white',
                    color: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'grey.100'
                    }
                  }}
                  title="Retry Upload"
                >
                  🔄 Retry
                </Button>
                <Button
                  size="small"
                  color="secondary"
                  variant="contained"
                  onClick={() => handleFileOptimization((newLetterFile || formData.govtApprovalLetter)?.name, 'letter')}
                  sx={{ 
                    minWidth: 'auto', 
                    px: 1,
                    backgroundColor: 'white',
                    color: 'secondary.main',
                    '&:hover': {
                      backgroundColor: 'grey.100'
                    }
                  }}
                  title="Get Optimization Tips"
                >
                  🛠️ Optimize
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="contained"
                  onClick={() => clearUploadError((newLetterFile || formData.govtApprovalLetter)?.name)}
                  sx={{ 
                    minWidth: 'auto', 
                    px: 1,
                    backgroundColor: 'white',
                    color: 'error.main',
                    '&:hover': {
                      backgroundColor: 'grey.100'
                    }
                  }}
                  title="Clear Error"
                >
                  ✕ Clear
                </Button>
              </Box>
            </Box>
            
            {/* Recovery Steps */}
            <Box mt={2} p={2} bgcolor="rgba(255,255,255,0.1)" borderRadius={1}>
              <Typography variant="caption" color="error.contrastText" gutterBottom display="block">
                💡 Recovery Steps:
              </Typography>
              <Box component="ul" sx={{ margin: 0, paddingLeft: 2, color: 'error.contrastText' }}>
                {getErrorRecoverySteps('unknown', (newLetterFile || formData.govtApprovalLetter)?.name).slice(0, 2).map((step, index) => (
                  <Box component="li" key={index} sx={{ fontSize: '0.75rem', marginBottom: 0.5 }}>
                    {step}
                  </Box>
                ))}
              </Box>
              <Typography variant="caption" color="error.contrastText" sx={{ fontSize: '0.7rem', fontStyle: 'italic' }}>
                Click "Optimize" for more detailed tips and "Retry" to attempt upload again.
              </Typography>
            </Box>
          </Box>
        )}
        
        {/* File Upload Input */}
        {newLetterFile || existingLetter || formData.govtApprovalLetter ? (
          <Box 
            sx={{ 
              mt: 2, 
              p: 2, 
              bgcolor: 'warning.light', 
              borderRadius: 1, 
              border: '1px solid',
              borderColor: 'warning.main'
            }}
          >
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Typography variant="body2" color="warning.contrastText" sx={{ fontWeight: 'bold' }}>
                📋 Letter Upload Limit Reached
              </Typography>
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  color: 'white',
                  backgroundColor: 'warning.main'
                }}
              >
                MAX: 1
              </Box>
            </Box>
            <Typography variant="body2" color="warning.contrastText" gutterBottom>
              You have already uploaded a government approval letter. 
              {(newLetterFile || formData.govtApprovalLetter) ? ' You can remove it to upload a different one.' : ' This letter is already stored in the system.'}
            </Typography>
            <Typography variant="caption" color="warning.contrastText" sx={{ fontStyle: 'italic' }}>
              💡 To upload a new letter, first remove the current one using the "Remove" button above.
            </Typography>
          </Box>
        ) : (
          <>
        <input 
          type="file" 
          name="govtApprovalLetter"
          accept="image/*,application/pdf" 
          onChange={handleLetterChange}
          style={{ marginTop: '8px' }}
        />
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              Upload a government approval letter (Images or PDF, max 10MB). Limit: 1 letter per event.
        </Typography>
          </>
        )}
      </Box>

      <TimeSlotBuilder
        timeSlotsEnabled={formData.timeSlotsEnabled || false}
        setTimeSlotsEnabled={(enabled) => setFormData(prev => ({ ...prev, timeSlotsEnabled: enabled }))}
        timeSlots={formData.timeSlots || []}
        setTimeSlots={(slots) => setFormData(prev => ({ ...prev, timeSlots: slots }))}
        remainingVolunteers={remainingVolunteers}
        unlimitedVolunteers={formData.unlimitedVolunteers}
        allocationError={allocationError}
        editingCategory={editingCategory}
        setEditingCategory={setEditingCategory}
        readOnly={readOnly}
      />

      <Button 
        type="submit" 
        variant="contained" 
        color="primary" 
        fullWidth 
        sx={{ mt: 3 }}
        disabled={
          (formData.timeSlotsEnabled && !formData.unlimitedVolunteers && remainingVolunteers < 0) ||
          isUploading ||
          (uploadErrors && typeof uploadErrors === 'object' && Object.keys(uploadErrors).length > 0)
        }
      >
        {isUploading ? '⏳ Uploading files...' : 'Proceed to Questionnaire →'}
      </Button>
      
      {/* Helper text for disabled button */}
      {formData.timeSlotsEnabled && !formData.unlimitedVolunteers && remainingVolunteers < 0 && (
        <Typography variant="body2" color="error" sx={{ mt: 1, textAlign: 'center' }}>
          ⚠️ Cannot proceed: You have over-allocated {Math.abs(remainingVolunteers)} volunteers. 
          Please adjust your category limits above before continuing.
        </Typography>
      )}

      {/* Helper text for upload issues */}
      {isUploading && (
        <Typography variant="body2" color="info" sx={{ mt: 1, textAlign: 'center' }}>
          ⏳ Please wait for file uploads to complete before proceeding
        </Typography>
      )}

      {uploadErrors && typeof uploadErrors === 'object' && Object.keys(uploadErrors).length > 0 && (
        <Typography variant="body2" color="error" sx={{ mt: 1, textAlign: 'center' }}>
          ❌ Please resolve file upload errors before proceeding
        </Typography>
      )}
    </Box>
  );
}
