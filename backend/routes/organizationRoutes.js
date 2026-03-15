// backend/routes/organizationRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const orgCtrl = require('../controllers/organizationController');
const { multiUpload, organizationUpload } = require('../middlewares/upload');
const Organization = require('../models/organization');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUtils');

// Get organization count for statistics
router.get('/count', async (req, res) => {
  try {
    const organizationCount = await Organization.countDocuments();
    res.json({ organizationCount });
  } catch (error) {
    console.error('❌ Error getting organization count:', error);
    res.status(500).json({ message: 'Failed to get organization count' });
  }
});

// Register a new organization (organizer creates it)
router.post('/register', protect, multiUpload, orgCtrl.registerOrganization);

// Get the organization created by the current user
router.get('/my', protect, orgCtrl.getMyOrganization);

// Get all organizations the current user is approved in
router.get('/approved', protect, orgCtrl.getApprovedOrganizations);

// Get all join requests made by current user
router.get('/my-requests', protect, orgCtrl.getMyRequests);

// Request to join an organization
router.post('/:id/join', protect, orgCtrl.joinOrganization);

// Approve a user to an organization team (only for admins)
router.patch('/:orgId/approve/:userId', protect, orgCtrl.approveTeamMember);

router.delete('/:orgId/reject/:userId', protect, orgCtrl.rejectTeamMember);

// Withdraw join request
router.delete('/:orgId/withdraw', protect, orgCtrl.withdrawJoinRequest);

// Get team members of an organization
router.get('/:id/team', protect, orgCtrl.getOrganizationTeam);

// Get all organizations (basic listing)
router.get('/', orgCtrl.getAllOrganizations);

// Update organization (only for creator or admin)
router.put('/:id', protect, multiUpload, orgCtrl.updateOrganization);

// Delete organization (only for creator or admin)
router.delete('/:id', protect, orgCtrl.deleteOrganization);

// Upload document for organization (single file)
router.post('/upload-document', protect, organizationUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const file = req.file;
    const folder = req.body.folder || 'organizations/documents';

    // Upload to Cloudinary
    const result = await uploadToCloudinary(file, folder);

    if (result.success) {
      res.json({
        success: true,
        url: result.url,
        publicId: result.publicId,
        filename: result.filename,
        format: result.format,
        size: result.size
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Upload failed'
      });
    }
  } catch (error) {
    console.error('❌ Organization document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during upload'
    });
  }
});

// Delete document from Cloudinary
router.post('/delete-document', protect, async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    const result = await deleteFromCloudinary(publicId);

    if (result.success) {
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Delete failed'
      });
    }
  } catch (error) {
    console.error('❌ Organization document delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during delete'
    });
  }
});

// Get organization by ID (excluding team)
// IMPORTANT: keep this as the last route to prevent conflicts
router.get('/:id', orgCtrl.getOrganizationById);

// @route   GET /api/organizations/user/:userId
router.get('/user/:userId', orgCtrl.getOrganizationsByUserId);

module.exports = router;
