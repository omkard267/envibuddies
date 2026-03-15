const express = require('express');
const router = express.Router();
const { checkReportEligibility, generateEventReport, getEventReport } = require('../controllers/reportController');
const { protect } = require('../middlewares/authMiddleware');

// Check if event is eligible for report generation
router.get('/eligibility/:eventId', protect, checkReportEligibility);

// Generate AI report for an event
router.post('/generate/:eventId', protect, generateEventReport);

// Get generated report
router.get('/:eventId', protect, getEventReport);

module.exports = router;
