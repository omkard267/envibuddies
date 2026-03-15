const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

// Get receipt by ID
router.get('/:receiptId', receiptController.getReceiptById);

// Get receipts by sponsorship
router.get('/sponsorship/:sponsorshipId', receiptController.getReceiptsBySponsorship);

// Get receipts by sponsor
router.get('/sponsor/:sponsorId', receiptController.getReceiptsBySponsor);

// Get receipts by organization
router.get('/organization/:organizationId', receiptController.getReceiptsByOrganization);

// Download receipt as PDF
router.get('/:receiptId/download', receiptController.downloadReceipt);

module.exports = router; 