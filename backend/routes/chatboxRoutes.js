const express = require('express');
const router = express.Router();
const { protect, requireOrganizer } = require('../middlewares/authMiddleware');
const chatboxController = require('../controllers/chatboxController');
const { chatUpload } = require('../middlewares/upload');

// GET /api/chatbox/events/:eventId/messages
router.get('/events/:eventId/messages', protect, chatboxController.getMessages);

// POST /api/chatbox/upload
router.post('/upload', protect, chatUpload.single('file'), chatboxController.uploadFile);

// PATCH /api/chatbox/messages/:messageId/pin
router.patch('/messages/:messageId/pin', protect, requireOrganizer, chatboxController.pinMessage);

module.exports = router; 