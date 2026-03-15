const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const recurringEventController = require('../controllers/recurringEventController');

// Get all recurring series for the current user
router.get('/series', protect, recurringEventController.getUserRecurringSeries);

// Get series details with all instances
router.get('/series/:seriesId', protect, recurringEventController.getSeriesDetails);

// Create next instance in a series
router.post('/series/:seriesId/next-instance', protect, recurringEventController.createNextInstance);

// Update series status (active, paused, completed, cancelled)
router.patch('/series/:seriesId/status', protect, recurringEventController.updateSeriesStatus);

// Delete/cancel series
router.delete('/series/:seriesId', protect, recurringEventController.deleteSeries);

// Get series statistics
router.get('/series/:seriesId/stats', protect, recurringEventController.getSeriesStats);

// Generate AI summaries for series instances
router.post('/series/:seriesId/generate-summaries', protect, recurringEventController.generateSummaries);

module.exports = router; 