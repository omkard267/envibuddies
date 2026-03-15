import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  IconButton,
  CircularProgress,
  Chip,
  Alert,
  LinearProgress,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import axiosInstance from '../../api/axiosInstance';
import { showAlert } from '../../utils/notifications';

const OrganizationDocumentUpload = ({ 
  onDocumentChange, 
  maxFileSize = 10 * 1024 * 1024, // 10MB
  folder = 'organizations/documents',
  disabled = false,
  existingDocument = null,
  acceptedTypes = "image/*,.pdf",
  title = "Document",
  documentType = "document" // logo, gstCertificate, panCard, ngoRegistration, letterOfIntent
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
  const [previewUrl, setPreviewUrl] = useState(existingDocument);
  const [uploadedDocument, setUploadedDocument] = useState(existingDocument ? {
    url: existingDocument,
    publicId: null,
    filename: 'existing-document',
    uploading: false,
    isExisting: true
  } : null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const fileInputRef = useRef(null);
  const lastCallbackRef = useRef(null);

  // Initialize component
  useEffect(() => {
    setInitialized(true);
  }, []);

  // Update parent component when document changes (only after initialization)
  useEffect(() => {
    if (!initialized) return;
    
    // Create a unique key for this callback to prevent infinite loops
    const callbackKey = `${uploadedDocument?.url || 'null'}-${uploadedDocument?.publicId || 'null'}-${uploading}-${uploadError}`;
    
    // Prevent calling the same callback multiple times
    if (lastCallbackRef.current === callbackKey) {
      return;
    }
    
    lastCallbackRef.current = callbackKey;
    
    if (uploadedDocument && uploadedDocument.url) {
      onDocumentChange({
        ...uploadedDocument,
        uploading: uploading
      });
    } else if (uploadedDocument === null && !existingDocument && !uploading && !uploadError) {
      // Only call onDocumentChange with null if:
      // 1. There was no existing document
      // 2. We're not currently uploading
      // 3. We're not in an upload error state
      // This prevents triggering removal state when component initializes with null or during upload errors
      onDocumentChange(null);
    }
  }, [uploadedDocument?.url, uploadedDocument?.publicId, uploading, initialized, existingDocument, uploadError, onDocumentChange]);

  // Reset error state when new file is selected
  const resetErrorState = () => {
    setUploadError(false);
    setUploadStatus('idle');
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Reset any previous error state
    resetErrorState();

    // Validate file type
    const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!isValidType) {
      showAlert.error('Please select an image or PDF file');
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      showAlert.error(`File size must be less than ${Math.round(maxFileSize / 1024 / 1024)}MB`);
      return;
    }

    // Create preview for images
    let preview = null;
    if (file.type.startsWith('image/')) {
      preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
    }

    setUploadStatus('uploading');
    setUploading(true);
    setUploadProgress(0);
    setUploadError(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      // Use organization-specific upload endpoint
      const response = await axiosInstance.post('/api/organizations/upload-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      if (response.data.success) {
        const documentData = {
          url: response.data.url,
          publicId: response.data.publicId,
          filename: response.data.filename,
          uploading: false
        };
        
        setUploadedDocument(documentData);
        setUploadStatus('success');
        
        showAlert.success(`✅ ${title} uploaded successfully!`);
        
        // Clean up preview URL after a delay
        if (preview) {
          setTimeout(() => {
            URL.revokeObjectURL(preview);
          }, 2000);
        }
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Document upload error:', error);
      setUploadStatus('error');
      setPreviewUrl(null);
      setUploadedDocument(null);
      setUploadError(true);
      showAlert.error(`❌ Failed to upload ${title.toLowerCase()}: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [maxFileSize, folder, title]);

  // Handle document removal confirmation
  const handleRemoveDocument = () => {
    setShowDeleteConfirm(true);
  };

  // Confirm document removal
  const confirmRemoveDocument = async () => {
    console.log('Starting document removal process...');
    setShowDeleteConfirm(false);
    setRemoving(true);
    
    try {
      // If we have a publicId, delete from Cloudinary first
      if (uploadedDocument && uploadedDocument.publicId) {
        console.log('Deleting from Cloudinary with publicId:', uploadedDocument.publicId);
        try {
          const response = await axiosInstance.post('/api/organizations/delete-document', {
            publicId: uploadedDocument.publicId
          });

          console.log('Cloudinary delete response:', response.data);

          if (response.data.success) {
            showAlert.success(`✅ ${title} removed from Cloudinary`);
          } else {
            console.warn('Failed to delete from Cloudinary:', response.data.message);
            showAlert.warning(`⚠️ ${title} removed locally but may still exist in Cloudinary`);
          }
        } catch (error) {
          console.error('Error deleting from Cloudinary:', error);
          showAlert.warning(`⚠️ ${title} removed locally but may still exist in Cloudinary`);
        }
      } else {
        console.log('No publicId found, skipping Cloudinary deletion');
      }

      console.log('Cleaning up local state...');
      // Clean up local state
      setPreviewUrl(null);
      setUploadedDocument(null);
      setUploadStatus('idle');
      
      console.log('Notifying parent component...');
      // Notify parent component that document has been removed
      onDocumentChange(null);
      
      showAlert.info(`${title} removed`);
      console.log('Document removal completed successfully');
    } catch (error) {
      console.error('Error removing document:', error);
      showAlert.error(`❌ Failed to remove ${title.toLowerCase()}`);
    } finally {
      console.log('Setting removing to false...');
      setRemoving(false);
    }
  };

  // Get file type icon
  const getFileIcon = () => {
    if (uploadedDocument && uploadedDocument.filename) {
      if (uploadedDocument.filename.toLowerCase().endsWith('.pdf')) {
        return <PdfIcon sx={{ fontSize: 40, color: '#ef4444' }} />;
      } else {
        return <ImageIcon sx={{ fontSize: 40, color: '#3b82f6' }} />;
      }
    }
    return <DescriptionIcon sx={{ fontSize: 40, color: '#6b7280' }} />;
  };

  // Get file type from URL
  const getFileTypeFromUrl = (url) => {
    if (!url) return 'unknown';
    if (url.toLowerCase().includes('.pdf')) return 'pdf';
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'image';
    return 'unknown';
  };

  // Handle preview loading
  const handlePreviewClick = () => {
    setPreviewLoading(true);
    setShowPreview(true);
    // Simulate loading for better UX
    setTimeout(() => setPreviewLoading(false), 500);
  };

  return (
    <Box>
      {/* Upload Area */}
      <Paper
        elevation={1}
        sx={{
          border: '2px dashed',
          borderColor: uploading ? '#3b82f6' : uploadedDocument ? '#10b981' : '#d1d5db',
          borderRadius: 3,
          p: 4,
          textAlign: 'center',
          backgroundColor: uploading ? '#eff6ff' : uploadedDocument ? '#f0fdf4' : '#f9fafb',
          transition: 'all 0.3s ease',
          cursor: disabled || uploading ? 'not-allowed' : 'pointer',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            borderColor: disabled || uploading ? '#d1d5db' : uploadedDocument ? '#10b981' : '#3b82f6',
            backgroundColor: disabled || uploading ? '#f9fafb' : uploadedDocument ? '#f0fdf4' : '#eff6ff',
            transform: disabled || uploading ? 'none' : 'translateY(-2px)',
            boxShadow: disabled || uploading ? 1 : 3,
          }
        }}
      >
        {/* Document Preview */}
        {previewUrl && (
          <Box sx={{ mb: 3, position: 'relative', display: 'inline-block' }}>
            <Box
              sx={{
                width: 140,
                height: 140,
                border: '4px solid',
                borderColor: uploadedDocument ? '#10b981' : '#3b82f6',
                borderRadius: 2,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8fafc',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 12px 35px rgba(0,0,0,0.2)',
                }
              }}
            >
              <img 
                src={previewUrl} 
                alt="Preview" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover' 
                }} 
              />
            </Box>
            {uploadedDocument && !uploading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  backgroundColor: '#10b981',
                  color: 'white',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 20 }} />
              </Box>
            )}
                         {!uploading && (
               <IconButton
                 onClick={handleRemoveDocument}
                 disabled={removing}
                 sx={{
                   position: 'absolute',
                   top: -8,
                   left: -8,
                   backgroundColor: '#ef4444',
                   color: 'white',
                   width: 36,
                   height: 36,
                   boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                   '&:hover': {
                     backgroundColor: '#dc2626',
                     transform: 'scale(1.1)',
                   },
                   '&:disabled': {
                     backgroundColor: '#9ca3af',
                     cursor: 'not-allowed',
                   },
                 }}
               >
                 {removing ? (
                   <CircularProgress size={16} sx={{ color: 'white' }} />
                 ) : (
                   <DeleteIcon sx={{ fontSize: 18 }} />
                 )}
               </IconButton>
             )}
          </Box>
        )}

        {/* Document Icon (when no preview) */}
        {!previewUrl && uploadedDocument && (
          <Box sx={{ mb: 3, position: 'relative', display: 'inline-block' }}>
            <Box
              sx={{
                width: 140,
                height: 140,
                border: '4px solid',
                borderColor: '#10b981',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f0fdf4',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 12px 35px rgba(0,0,0,0.2)',
                }
              }}
            >
              {getFileIcon()}
            </Box>
            {!uploading && (
              <>
                                 <IconButton
                   onClick={handleRemoveDocument}
                   disabled={removing}
                   sx={{
                     position: 'absolute',
                     top: -8,
                     left: -8,
                     backgroundColor: '#ef4444',
                     color: 'white',
                     width: 36,
                     height: 36,
                     boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                     '&:hover': {
                       backgroundColor: '#dc2626',
                       transform: 'scale(1.1)',
                     },
                     '&:disabled': {
                       backgroundColor: '#9ca3af',
                       cursor: 'not-allowed',
                     },
                   }}
                 >
                   {removing ? (
                     <CircularProgress size={16} sx={{ color: 'white' }} />
                   ) : (
                     <DeleteIcon sx={{ fontSize: 18 }} />
                   )}
                 </IconButton>
                                 <IconButton
                   onClick={handlePreviewClick}
                   disabled={removing}
                   sx={{
                     position: 'absolute',
                     top: -8,
                     right: -8,
                     backgroundColor: '#3b82f6',
                     color: 'white',
                     width: 36,
                     height: 36,
                     boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                     '&:hover': {
                       backgroundColor: '#1d4ed8',
                       transform: 'scale(1.1)',
                     },
                     '&:disabled': {
                       backgroundColor: '#9ca3af',
                       cursor: 'not-allowed',
                     },
                   }}
                 >
                   {previewLoading ? (
                     <CircularProgress size={16} sx={{ color: 'white' }} />
                   ) : (
                     <VisibilityIcon sx={{ fontSize: 18 }} />
                   )}
                 </IconButton>
              </>
            )}
          </Box>
        )}

        {/* Upload Progress */}
        {uploading && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, color: '#3b82f6', fontWeight: 600 }}>
              📤 Uploading {title.toLowerCase()}...
            </Typography>
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: '#e5e7eb',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
                }
              }}
            />
            <Typography variant="caption" sx={{ mt: 1, color: '#6b7280' }}>
              {uploadProgress}% complete
            </Typography>
          </Box>
        )}

        {/* Upload Status */}
        {uploadStatus === 'success' && !uploading && (
          <Box sx={{ mb: 3 }}>
            <Chip
              icon={<CheckCircleIcon />}
              label={`✅ ${title} uploaded successfully!`}
              color="success"
              variant="filled"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        )}

        {uploadStatus === 'error' && !uploading && (
          <Box sx={{ mb: 3 }}>
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                ❌ Upload failed. Please try again.
              </Typography>
            </Alert>
          </Box>
        )}

        {/* Upload Button */}
        {!previewUrl && !uploadedDocument && !uploading && (
          <Box>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={disabled}
            />
            <label onClick={() => {
              resetErrorState();
              fileInputRef.current?.click();
            }}>
              <Button
                component="span"
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                disabled={disabled}
                sx={{
                  borderColor: '#3b82f6',
                  color: '#3b82f6',
                  '&:hover': {
                    borderColor: '#1d4ed8',
                    backgroundColor: '#eff6ff',
                  }
                }}
              >
                📄 Choose {title}
              </Button>
            </label>
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#6b7280' }}>
              Images & PDFs up to {Math.round(maxFileSize / 1024 / 1024)}MB
            </Typography>
          </Box>
        )}

        {/* Drag & Drop Area */}
        {!previewUrl && !uploadedDocument && !uploading && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="textSecondary">
              or drag and drop a file here
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Document Preview Dialog */}
      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          📄 {title} Preview
        </DialogTitle>
        <DialogContent>
          {uploadedDocument && uploadedDocument.url && (
            <Box sx={{ textAlign: 'center' }}>
              {getFileTypeFromUrl(uploadedDocument.url) === 'image' ? (
                <img 
                  src={uploadedDocument.url} 
                  alt={title}
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '70vh', 
                    objectFit: 'contain' 
                  }} 
                />
              ) : (
                <Box sx={{ p: 4 }}>
                  <PdfIcon sx={{ fontSize: 80, color: '#ef4444', mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    PDF Document
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 3, color: '#6b7280' }}>
                    {uploadedDocument.filename || 'Document'}
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => window.open(uploadedDocument.url, '_blank')}
                    startIcon={<VisibilityIcon />}
                  >
                    Open in New Tab
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setShowPreview(false)}
            variant="outlined"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          🗑️ Remove {title}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to remove this {title.toLowerCase()}? This action cannot be undone.
          </Typography>
          {uploadedDocument && uploadedDocument.publicId && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                This will also delete the file from Cloudinary storage.
              </Typography>
            </Alert>
          )}
        </DialogContent>
                 <DialogActions sx={{ p: 2, pt: 0 }}>
           <Button
             onClick={() => setShowDeleteConfirm(false)}
             variant="outlined"
             disabled={removing}
           >
             Cancel
           </Button>
           <Button
             onClick={confirmRemoveDocument}
             variant="contained"
             color="error"
             disabled={removing}
             startIcon={removing ? <CircularProgress size={16} /> : null}
           >
             {removing ? 'Removing...' : `Remove ${title}`}
           </Button>
         </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrganizationDocumentUpload;
