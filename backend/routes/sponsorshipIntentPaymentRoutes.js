// backend/routes/sponsorshipIntentPaymentRoutes.js

const express = require('express');
const router = express.Router();
const sponsorshipIntentPaymentController = require('../controllers/sponsorshipIntentPaymentController');
const { protect } = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes
router.use(protect);

// Create payment order for sponsorship intent
router.post('/create-order/:intentId', sponsorshipIntentPaymentController.createPaymentOrder);

// Verify payment for sponsorship intent
router.post('/verify/:intentId', sponsorshipIntentPaymentController.verifyPayment);

// Get payment status for sponsorship intent
router.get('/status/:intentId', sponsorshipIntentPaymentController.getPaymentStatus);

// New endpoints for handling failed verifications
router.post('/manual-verify/:intentId', sponsorshipIntentPaymentController.manualVerifyPayment);
router.get('/failed-verifications/:organizationId', sponsorshipIntentPaymentController.getFailedVerifications);

module.exports = router; 