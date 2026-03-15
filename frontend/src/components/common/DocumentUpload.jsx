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
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import axiosInstance from '../../api/axiosInstance';
import toastNotification from '../../utils/toastNotification';

const DocumentUpload = ({ 
  onDocumentChange, 
  maxFileSize = 5 * 1024 * 1024, // 5MB
  folder = 'documents',
  disabled = false,
  existingDocument = null,
  acceptedTypes = "image/*,.pdf",
  title = "Document"
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
  const [previewUrl, setPreviewUrl] = useState(existingDocument);
  const [uploadedDocument, setUploadedDocument] = useState(existingDocument ? {
    url: existingDocument,
    publicId: null,
    filename: 'existing-document',
    uploading: false
  } : null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef(null);

  // Update parent component when document changes - only when we have actual document data
  useEffect(() => {
    if (uploadedDocument && uploadedDocument.url) {
      onDocumentChange({
        ...uploadedDocument,
        uploading: uploading
      });
    } else if (uploadedDocument === null) {
      // Only call onDocumentChange with null when we explicitly remove the document
      onDocumentChange(null);
    }
  }, [uploadedDocument?.url, uploadedDocument?.publicId, uploading]); // Remove onDocumentChange from dependencies

  // Handle file selection
  const handleFileSelect = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!isValidType) {
      toastNotification.error('Please select an image or PDF file');
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      toastNotification.error(`File size must be less than ${Math.round(maxFileSize / 1024 / 1024)}MB`);
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

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await axiosInstance.post('/api/events/upload-signup-document', formData, {
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
        
        toastNotification.success(`✅ ${title} uploaded successfully!`);
        
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
      toastNotification.error(`❌ Failed to upload ${title.toLowerCase()}: ${error.message}`);
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
    setShowDeleteConfirm(false);
    
    // If we have a publicId, delete from Cloudinary first
    if (uploadedDocument && uploadedDocument.publicId) {
      try {
        setUploading(true);
        const response = await axiosInstance.post('/api/events/delete-signup-file', {
          publicId: uploadedDocument.publicId
        });

        if (response.data.success) {
          toastNotification.success(`✅ ${title} removed from Cloudinary`);
        } else {
          console.warn('Failed to delete from Cloudinary:', response.data.message);
          toastNotification.warning(`⚠️ ${title} removed locally but may still exist in Cloudinary`);
        }
      } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        toastNotification.warning(`⚠️ ${title} removed locally but may still exist in Cloudinary`);
      } finally {
        setUploading(false);
      }
    }

    // Clean up local state
    setPreviewUrl(null);
    setUploadedDocument(null);
    setUploadStatus('idle');
    onDocumentChange(null);
    toastNotification.info(`${title} removed`);
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
                }}
              >
                <DeleteIcon sx={{ fontSize: 18 }} />
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
              <IconButton
                onClick={handleRemoveDocument}
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
                }}
              >
                <DeleteIcon sx={{ fontSize: 18 }} />
              </IconButton>
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
             <label onClick={() => fileInputRef.current?.click()}>
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
             disabled={uploading}
           >
             Cancel
           </Button>
           <Button
             onClick={confirmRemoveDocument}
             variant="contained"
             color="error"
             disabled={uploading}
             startIcon={uploading ? <CircularProgress size={16} /> : null}
           >
             {uploading ? 'Removing...' : `Remove ${title}`}
           </Button>
         </DialogActions>
       </Dialog>
     </Box>
   );
 };

export default DocumentUpload;
