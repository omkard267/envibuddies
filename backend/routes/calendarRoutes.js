const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  getCalendarEvents,
  getCalendarEventDetails,
  getCalendarStats,
  addToCalendar,
  removeFromCalendar,
  checkCalendarStatus,
  getUserCalendarEvents
} = require('../controllers/calendarController');

// Get events for calendar view
router.get('/events', protect, getCalendarEvents);

// Get specific event details
router.get('/events/:eventId', protect, getCalendarEventDetails);

// Get calendar statistics
router.get('/stats', protect, getCalendarStats);

// Calendar management routes
router.post('/add/:eventId', protect, addToCalendar);
router.delete('/remove/:eventId', protect, removeFromCalendar);
router.get('/status/:eventId', protect, checkCalendarStatus);
router.get('/user-events', protect, getUserCalendarEvents);

module.exports = router; 