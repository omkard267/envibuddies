import React, { useState, useCallback, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  IconButton, 
  CircularProgress,
  Dialog,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import axiosInstance from '../../api/axiosInstance';
import toastNotification from '../../utils/toastNotification';

const MediaUploadComponent = ({ 
  onMediaChange, 
  maxFiles = 10, 
  acceptedTypes = "image/*,video/*",
  maxFileSize = 10 * 1024 * 1024, // 10MB
  folder = 'events/questionnaire-media',
  disabled = false,
  existingMedia = []
}) => {
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadStatus, setUploadStatus] = useState({});
  const [previewDialog, setPreviewDialog] = useState({ open: false, media: null });
  const [mediaFiles, setMediaFiles] = useState(existingMedia || []);
  const [removingFiles, setRemovingFiles] = useState(new Set());
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({ open: false, media: null, index: null });

  // Update mediaFiles when existingMedia prop changes
  useEffect(() => {
    setMediaFiles(existingMedia || []);
  }, [existingMedia]);

  // Handle file selection
  const handleFileSelect = useCallback(async (event) => {
    const files = Array.from(event.target.files);
    
    console.log('📁 File selection:', {
      selectedFiles: files.length,
      currentMediaFiles: mediaFiles.length,
      maxFiles
    });
    
    // Validate file count
    if (mediaFiles.length + files.length > maxFiles) {
      toastNotification.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (file.size > maxFileSize) {
        toastNotification.error(`${file.name} is too large. Maximum size is ${Math.round(maxFileSize / 1024 / 1024)}MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Add files to uploading state
    const newUploadingFiles = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // Upload each file to Cloudinary
    for (const uploadFile of newUploadingFiles) {
      await uploadFileToCloudinary(uploadFile);
    }
  }, [mediaFiles.length, maxFiles, maxFileSize, folder]);

  // Upload file to Cloudinary
  const uploadFileToCloudinary = async (uploadFile) => {
    const { id, file } = uploadFile;
    
    // Initialize progress and status
    setUploadProgress(prev => ({ ...prev, [id]: 0 }));
    setUploadStatus(prev => ({ ...prev, [id]: 'uploading' }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await axiosInstance.post('/api/events/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(prev => ({ ...prev, [id]: progress }));
        }
      });

      if (response.data.success) {
        // Mark as successful
        setUploadStatus(prev => ({ ...prev, [id]: 'success' }));
        setUploadProgress(prev => ({ ...prev, [id]: 100 }));

        // Add to media files
        const newMediaFile = {
          id: response.data.publicId,
          url: response.data.url,
          filename: response.data.filename,
          format: response.data.format,
          size: response.data.size,
          type: file.type,
          uploaded: true
        };

        setMediaFiles(prev => {
          const updatedMediaFiles = [...prev, newMediaFile];
          console.log('✅ Upload success:', {
            fileName: file.name,
            previousCount: prev.length,
            newCount: updatedMediaFiles.length,
            newMediaFile
          });
          onMediaChange(updatedMediaFiles);
          return updatedMediaFiles;
        });

        toastNotification.success(`✅ ${file.name} uploaded successfully!`);

        // Clean up after success
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== id));
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[id];
            return newProgress;
          });
          setUploadStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[id];
            return newStatus;
          });
        }, 2000);

      } else {
        throw new Error(response.data.message || 'Upload failed');
      }

    } catch (error) {
      console.error(`❌ Upload failed for ${file.name}:`, error);
      
      // Mark as error
      setUploadStatus(prev => ({ ...prev, [id]: 'error' }));
      
      toastNotification.error(`❌ Failed to upload ${file.name}: ${error.message}`);

      // Clean up after error
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.id !== id));
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[id];
          return newProgress;
        });
        setUploadStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[id];
          return newStatus;
        });
      }, 3000);
    }
  };

  // Show delete confirmation dialog
  const handleRemoveMedia = (index) => {
    const mediaToRemove = mediaFiles[index];
    setDeleteConfirmDialog({ open: true, media: mediaToRemove, index });
  };

  // Confirm and execute media removal
  const confirmRemoveMedia = async () => {
    const { media: mediaToRemove, index } = deleteConfirmDialog;
    const mediaId = mediaToRemove.id || mediaToRemove.publicId || index;
    
    // Close dialog
    setDeleteConfirmDialog({ open: false, media: null, index: null });
    
    // Add to removing state
    setRemovingFiles(prev => new Set(prev).add(mediaId));
    
    try {
      // If the media has a publicId (was uploaded to Cloudinary), delete it
      if (mediaToRemove.id || mediaToRemove.publicId) {
        const publicId = mediaToRemove.id || mediaToRemove.publicId;
        
        // Call backend to delete from Cloudinary using existing route
        await axiosInstance.post(`/api/events/delete-cloudinary-file`, {
          publicId,
          fileName: mediaToRemove.filename
        });
        
        toastNotification.success(`✅ ${mediaToRemove.filename} removed from Cloudinary`);
      } else {
        toastNotification.info('Media file removed');
      }
      
      // Remove from local state
      setMediaFiles(prev => {
        const newMediaFiles = prev.filter((_, i) => i !== index);
        console.log('🗑️ Remove success:', {
          fileName: mediaToRemove.filename,
          previousCount: prev.length,
          newCount: newMediaFiles.length,
          removedIndex: index
        });
        onMediaChange(newMediaFiles);
        return newMediaFiles;
      });
      
    } catch (error) {
      console.error('Error removing media from Cloudinary:', error);
      toastNotification.error(`❌ Failed to remove ${mediaToRemove.filename} from Cloudinary`);
      
      // Still remove from local state even if Cloudinary deletion fails
      setMediaFiles(prev => {
        const newMediaFiles = prev.filter((_, i) => i !== index);
        onMediaChange(newMediaFiles);
        return newMediaFiles;
      });
    } finally {
      // Remove from removing state
      setRemovingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(mediaId);
        return newSet;
      });
    }
  };

  // Cancel delete confirmation
  const cancelRemoveMedia = () => {
    setDeleteConfirmDialog({ open: false, media: null, index: null });
  };

  // Open preview dialog
  const handlePreview = (media) => {
    setPreviewDialog({ open: true, media });
  };

  // Close preview dialog
  const handleClosePreview = () => {
    setPreviewDialog({ open: false, media: null });
  };

  // Get file type icon
  const getFileTypeIcon = (type) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    return '📄';
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isUploading = uploadingFiles.length > 0;

  return (
    <Box>
      {/* Upload Button */}
      <Button
        variant="outlined"
        component="label"
        disabled={disabled || isUploading}
        startIcon={isUploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
        sx={{
          mb: 2,
          borderColor: '#3b82f6',
          color: '#3b82f6',
          '&:hover': {
            borderColor: '#2563eb',
            backgroundColor: '#eff6ff',
          },
          '&:disabled': {
            borderColor: '#9ca3af',
            color: '#9ca3af',
          },
        }}
      >
        {isUploading ? 'Uploading...' : `📁 Select Files (Max ${maxFiles})`}
        <input
          type="file"
          accept={acceptedTypes}
          multiple
          hidden
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
        />
      </Button>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#374151' }}>
            Uploading Files...
          </Typography>
          {uploadingFiles.map((uploadFile) => {
            const progress = uploadProgress[uploadFile.id] || 0;
            const status = uploadStatus[uploadFile.id] || 'uploading';
            
            return (
              <Box key={uploadFile.id} sx={{ mb: 1, p: 2, border: '1px solid #e2e8f0', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {status === 'success' ? (
                      <CheckCircleIcon sx={{ color: 'green', fontSize: 20 }} />
                    ) : status === 'error' ? (
                      <ErrorIcon sx={{ color: 'red', fontSize: 20 }} />
                    ) : (
                      <CircularProgress size={16} />
                    )}
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {uploadFile.name}
                    </Typography>
                    <Chip 
                      label={formatFileSize(uploadFile.size)} 
                      size="small" 
                      variant="outlined" 
                    />
                  </Box>
                </Box>
                
                <LinearProgress 
                  variant="determinate" 
                  value={progress} 
                  sx={{ 
                    height: 6, 
                    borderRadius: 3,
                    backgroundColor: '#e5e7eb',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: status === 'error' ? '#ef4444' : '#3b82f6',
                      borderRadius: 3,
                    }
                  }} 
                />
                
                <Typography variant="caption" sx={{ color: '#6b7280', mt: 0.5, display: 'block' }}>
                  {status === 'uploading' && `${Math.round(progress)}% complete`}
                  {status === 'success' && 'Upload completed'}
                  {status === 'error' && 'Upload failed'}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Media Files Grid */}
      {mediaFiles.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>
            Uploaded Media ({mediaFiles.length}/{maxFiles})
          </Typography>
          
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
            gap: 2 
          }}>
            {mediaFiles.map((media, index) => (
              <Box 
                key={media.id || index} 
                sx={{ 
                  position: 'relative',
                  border: '2px solid #e2e8f0',
                  borderRadius: 2,
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#3b82f6',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }
                }}
              >
                {/* Media Preview */}
                <Box 
                  sx={{ 
                    width: '100%', 
                    height: 120, 
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onClick={() => handlePreview(media)}
                >
                  {media.type?.startsWith('image/') ? (
                    <img
                      src={media.url}
                      alt={media.filename}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : media.type?.startsWith('video/') ? (
                    <video
                      src={media.url}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <Box sx={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f3f4f6',
                      color: '#6b7280',
                      fontSize: '2rem'
                    }}>
                      {getFileTypeIcon(media.type)}
                    </Box>
                  )}
                  
                  {/* Preview Overlay */}
                  <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                    '&:hover': {
                      opacity: 1,
                    }
                  }}>
                    <VisibilityIcon sx={{ color: 'white', fontSize: 24 }} />
                  </Box>
                </Box>

                {/* File Info */}
                <Box sx={{ p: 1 }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'block',
                      fontSize: '10px',
                      color: '#6b7280',
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {media.filename}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'block',
                      fontSize: '9px',
                      color: '#9ca3af',
                      textAlign: 'center'
                    }}
                  >
                    {formatFileSize(media.size)}
                  </Typography>
                </Box>

                {/* Remove Button */}
                <IconButton
                  size="small"
                  onClick={() => handleRemoveMedia(index)}
                  disabled={removingFiles.has(media.id || media.publicId || index)}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    backgroundColor: '#ef4444',
                    color: 'white',
                    width: 24,
                    height: 24,
                    '&:hover': {
                      backgroundColor: '#dc2626',
                    },
                    '&:disabled': {
                      backgroundColor: '#9ca3af',
                    },
                  }}
                >
                  {removingFiles.has(media.id || media.publicId || index) ? (
                    <CircularProgress size={14} sx={{ color: 'white' }} />
                  ) : (
                    <DeleteIcon sx={{ fontSize: 14 }} />
                  )}
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={previewDialog.open}
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          {previewDialog.media && (
            <>
              {previewDialog.media.type?.startsWith('image/') ? (
                <img
                  src={previewDialog.media.url}
                  alt={previewDialog.media.filename}
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                  }}
                />
              ) : previewDialog.media.type?.startsWith('video/') ? (
                <video
                  src={previewDialog.media.url}
                  controls
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: '70vh',
                  }}
                />
              ) : (
                <Box sx={{
                  width: '100%',
                  height: '50vh',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  fontSize: '3rem'
                }}>
                  {getFileTypeIcon(previewDialog.media.type)}
                </Box>
              )}
              
              <IconButton
                onClick={handleClosePreview}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.7)',
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            </>
          )}
        </DialogContent>
                 <DialogActions sx={{ p: 2 }}>
           <Button onClick={handleClosePreview}>Close</Button>
         </DialogActions>
       </Dialog>

       {/* Delete Confirmation Dialog */}
       <Dialog
         open={deleteConfirmDialog.open}
         onClose={cancelRemoveMedia}
         maxWidth="sm"
         fullWidth
       >
         <DialogContent sx={{ p: 3 }}>
           <Typography variant="h6" sx={{ mb: 2, color: '#ef4444' }}>
             🗑️ Delete Media
           </Typography>
           <Typography variant="body1" sx={{ mb: 3 }}>
             Are you sure you want to delete <strong>{deleteConfirmDialog.media?.filename}</strong>?
           </Typography>
           <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
             This action will permanently remove the file from Cloudinary and cannot be undone.
           </Typography>
         </DialogContent>
         <DialogActions sx={{ p: 3, pt: 0 }}>
           <Button onClick={cancelRemoveMedia} variant="outlined">
             Cancel
           </Button>
           <Button 
             onClick={confirmRemoveMedia} 
             variant="contained" 
             color="error"
             sx={{ 
               backgroundColor: '#ef4444',
               '&:hover': {
                 backgroundColor: '#dc2626',
               }
             }}
           >
             Delete Permanently
           </Button>
         </DialogActions>
       </Dialog>
     </Box>
   );
 };

export default MediaUploadComponent;
