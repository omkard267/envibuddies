// backend/routes/paymentRoutes.js

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes
router.use(protect);

// Create payment order for approved sponsorship
router.post('/create-order/:sponsorshipId', paymentController.createPaymentOrder);

// Verify payment after successful transaction
router.post('/verify/:sponsorshipId', paymentController.verifyPayment);

// Get payment status
router.get('/status/:sponsorshipId', paymentController.getPaymentStatus);

// Get payment configuration (public route)
router.get('/config', paymentController.getPaymentConfig);

// Refund payment (admin only)
router.post('/refund/:sponsorshipId', paymentController.refundPayment);

module.exports = router; 