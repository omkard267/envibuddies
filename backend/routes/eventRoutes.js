//backend/routes/eventRoutes.js
const { protect, requireOrganizer } = require('../middlewares/authMiddleware');
const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { eventMultiUpload, eventSingleUpload, completedEventUpload } = require('../middlewares/upload');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUtils');

const Event = require("../models/event");

// Get event count for statistics
router.get('/count', async (req, res) => {
  try {    
    const eventCount = await Event.countDocuments();
    res.json({ eventCount });
  } catch (error) {
    console.error('❌ Error getting event count:', error);
    res.status(500).json({ message: 'Failed to get event count' });
  }
});

// @route   POST /api/events/create
router.post( '/create', protect, eventMultiUpload, eventController.createEvent);

// @route   GET /api/events
router.get('/', eventController.getAllEvents);

// @route   GET /api/events/my-events
router.get('/my-events', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const Event = require('../models/event');
    // Find events where user is creator OR in organizerTeam
    const events = await Event.find({
      $or: [
        { createdBy: userId },
        { 'organizerTeam.user': userId }
      ]
    })
      .sort({ startDateTime: -1 })
      .populate('organization');
    // Remove duplicates (if any)
    const uniqueEvents = [];
    const seen = new Set();
    for (const event of events) {
      if (!seen.has(event._id.toString())) {
        uniqueEvents.push(event);
        seen.add(event._id.toString());
      }
    }
    res.status(200).json(uniqueEvents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/events/all-events
router.get('/all-events', protect, async (req, res) => {
  try {
    const events = await require('../models/event').find({})
      .sort({ startDateTime: -1 })
      .populate('organization');
    res.status(200).json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/events/batch - get details for multiple events by IDs
router.post("/batch", protect, async (req, res) => {
  try {
    const { eventIds } = req.body;
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return res.json([]);
    }
    const events = await Event.find({ _id: { $in: eventIds } }).populate('organization');
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get event by ID /api/events/:id
router.get('/:id', eventController.getEventById);
router.put('/:id', protect, eventMultiUpload, eventController.updateEvent);
router.delete('/:id', protect, eventController.deleteEvent);

// Complete questionnaire for an event
router.post('/:id/complete-questionnaire', protect, requireOrganizer, completedEventUpload.array('media', 10), eventController.completeQuestionnaire);

// Add creator certificate assignment
router.post('/:id/add-creator-certificate', protect, requireOrganizer, eventController.addCreatorCertificate);

// Handle event completion and create next recurring instance if needed
router.post('/:eventId/complete', protect, eventController.handleEventCompletion);

// Delete file from Cloudinary (for event creation process)
router.post('/delete-cloudinary-file', protect, eventController.deleteCloudinaryFile);

// @route   GET /api/events/organization/:orgId
router.get('/organization/:orgId', eventController.getEventsByOrganization);

// Get event time slots
router.get('/:id/timeSlots', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.json({
      timeSlotsEnabled: event.timeSlotsEnabled,
      timeSlots: event.timeSlots || []
    });
  } catch (error) {
    console.error('Error fetching event time slots:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/events/upcoming
router.get('/upcoming', eventController.getUpcomingEvents);

// @route   GET /api/events/created-by/:userId
router.get('/created-by/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // First check if the user account exists and is not deleted
    const User = require('../models/user');
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }
    
    if (user.isDeleted) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'ACCOUNT_DELETED'
      });
    }
    
    const events = await require('../models/event').find({ createdBy: userId })
      .sort({ startDateTime: -1 })
      .populate('organization');
    res.status(200).json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/events/by-organizer-and-org/:userId/:orgId
router.get('/by-organizer-and-org/:userId/:orgId', async (req, res) => {
  try {
    const { userId, orgId } = req.params;
    
    // First check if the user account exists and is not deleted
    const User = require('../models/user');
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }
    
    if (user.isDeleted) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'ACCOUNT_DELETED'
      });
    }
    
    const events = await require('../models/event').find({
      createdBy: userId,
      organization: orgId
    }).sort({ startDateTime: -1 }).populate('organization');
    res.status(200).json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Organizer joins an event as a team member
router.post('/:eventId/join-organizer', protect, requireOrganizer, eventController.joinAsOrganizer);

// Organizer leaves an event as organizer
router.post('/:eventId/leave-organizer', protect, requireOrganizer, eventController.leaveAsOrganizer);

// Organizer requests to join as organizer
router.post('/:eventId/request-join-organizer', protect, requireOrganizer, eventController.requestJoinAsOrganizer);
// Creator approves a join request
router.post('/:eventId/approve-join-request', protect, eventController.approveJoinRequest);
// Creator rejects a join request
router.post('/:eventId/reject-join-request', protect, eventController.rejectJoinRequest);

// Organizer withdraws join request
router.post('/:eventId/withdraw-join-request', protect, requireOrganizer, eventController.withdrawJoinRequest);

// Get the organizer team for an event
router.get('/:eventId/organizer-team', protect, eventController.getOrganizerTeam);

// PATCH /api/events/:eventId/organizer/:organizerId/attendance - mark attendance for an organizer
router.patch('/:eventId/organizer/:organizerId/attendance', protect, requireOrganizer, eventController.updateOrganizerAttendance);

// Get available slots for an event
router.get('/:id/slots', eventController.getEventSlots);

// Generate certificate for a user
router.post('/:eventId/generate-certificate', protect, eventController.generateCertificate);

// Remove volunteer from event (can re-register)
router.post('/:eventId/remove-volunteer', protect, eventController.removeVolunteer);

// Ban volunteer from event (cannot re-register)
router.post('/:eventId/ban-volunteer', protect, eventController.banVolunteer);

// Remove organizer from event (can re-join)
router.post('/:eventId/remove-organizer', protect, eventController.removeOrganizer);

// Ban organizer from event (cannot re-join)
router.post('/:eventId/ban-organizer', protect, eventController.banOrganizer);

// Unban volunteer from event (can re-register)
router.post('/:eventId/unban-volunteer', protect, eventController.unbanVolunteer);

// Unban organizer from event (can re-join)
router.post('/:eventId/unban-organizer', protect, eventController.unbanOrganizer);

// File upload endpoints for event creation (requires authentication)
router.post('/upload-image', protect, eventSingleUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const file = req.file;
    const folder = req.body.folder || 'events';

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
    console.error('❌ Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during upload'
    });
  }
});

// File upload endpoint for signup (no authentication required)
router.post('/upload-signup-image', eventSingleUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const file = req.file;
    const folder = req.body.folder || 'profiles';

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
    console.error('❌ Signup image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during upload'
    });
  }
});

// File upload endpoint for signup documents (no authentication required)
router.post('/upload-signup-document', eventSingleUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const file = req.file;
    const folder = req.body.folder || 'documents';

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
    console.error('❌ Signup document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during upload'
    });
  }
});

// Delete file from Cloudinary (no authentication required for signup)
router.post('/delete-signup-file', async (req, res) => {
  try {
    const { publicId } = req.body;
    
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    const { deleteFromCloudinary } = require('../utils/cloudinaryUtils');
    const result = await deleteFromCloudinary(publicId);

    if (result.success) {
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to delete file'
      });
    }
  } catch (error) {
    console.error('❌ Signup file deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during file deletion'
    });
  }
});

router.post('/upload-letter', protect, eventSingleUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const file = req.file;
    const folder = req.body.folder || 'events/letters';

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
      res.status(500).json({
        success: false,
        message: result.error || 'Upload failed'
      });
    }
  } catch (error) {
    console.error('❌ Letter upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during upload'
    });
  }
});



module.exports = router;
