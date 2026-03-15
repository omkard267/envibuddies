import React, { useState } from 'react';
import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import MediaUploadComponent from './MediaUploadComponent';

const MediaUploadTest = () => {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [testResults, setTestResults] = useState([]);

  const handleMediaChange = (media) => {
    console.log('Media changed:', media);
    setMediaFiles(media);
    addTestResult('Media files updated', `Total files: ${media.length}`, 'info');
  };

  const handleSubmit = () => {
    console.log('Submitting with media:', mediaFiles);
    addTestResult('Submit clicked', `Attempting to submit ${mediaFiles.length} files`, 'info');
    // This would be the actual submission logic
    alert(`Submitting ${mediaFiles.length} media files`);
  };

  const addTestResult = (action, details, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, { action, details, type, timestamp }]);
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Media Upload Test Component
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Test Cloudinary Media Upload & Deletion
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          This component tests the complete media upload and deletion workflow with Cloudinary.
          Upload files, then try removing them to test the deletion functionality.
          Uses existing /api/events/delete-cloudinary-file endpoint.
        </Alert>
        
        <MediaUploadComponent
          onMediaChange={handleMediaChange}
          maxFiles={5}
          acceptedTypes="image/*,video/*"
          maxFileSize={10 * 1024 * 1024} // 10MB
          folder="events/questionnaire-media"
          disabled={false}
          existingMedia={mediaFiles}
        />
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          disabled={mediaFiles.length === 0}
        >
          Submit Test ({mediaFiles.length} files)
        </Button>
        
        <Button 
          variant="outlined" 
          onClick={() => {
            setMediaFiles([]);
            addTestResult('Clear all', 'All media files cleared', 'warning');
            console.log('Cleared media files');
          }}
        >
          Clear All
        </Button>

        <Button 
          variant="outlined" 
          onClick={clearTestResults}
        >
          Clear Test Results
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Current Media Files ({mediaFiles.length})
          </Typography>
          <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '300px' }}>
            {JSON.stringify(mediaFiles, null, 2)}
          </pre>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Test Results ({testResults.length})
          </Typography>
          <Box sx={{ maxHeight: '300px', overflow: 'auto' }}>
            {testResults.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No test results yet. Try uploading or removing files.
              </Typography>
            ) : (
              testResults.map((result, index) => (
                <Box key={index} sx={{ mb: 1, p: 1, border: '1px solid #e2e8f0', borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    {result.timestamp}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {result.action}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    {result.details}
                  </Typography>
                </Box>
              ))
            )}
          </Box>
        </Paper>
      </Box>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Testing Instructions
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <li>Upload multiple image/video files to test the upload functionality</li>
          <li>Check that progress bars appear during upload</li>
          <li>Verify that files appear in the media grid after upload</li>
          <li>Click on media files to test the preview functionality</li>
          <li>Click the delete button (🗑️) to test Cloudinary deletion</li>
          <li>Confirm deletion in the dialog that appears</li>
          <li>Check that files are removed from both the UI and Cloudinary</li>
          <li>Monitor the test results panel for detailed logs</li>
        </Box>
      </Paper>
    </Box>
  );
};

export default MediaUploadTest;
