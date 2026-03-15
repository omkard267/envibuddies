const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { sponsorMultiUpload } = require('../middlewares/upload');
const sponsorController = require('../controllers/sponsorController');

// Public routes (for browsing sponsors)
router.get('/', sponsorController.getAllSponsors);
router.get('/search', sponsorController.searchSponsors);
router.get('/:userId', sponsorController.getSponsorByUserId);

// Protected routes (require authentication)
router.use(protect);

// Sponsor profile management
router.post('/', sponsorMultiUpload, sponsorController.createSponsor);
router.get('/profile/me', sponsorController.getSponsorByUserId);
router.put('/:id', sponsorMultiUpload, sponsorController.updateSponsor);
router.delete('/:id', sponsorController.deleteSponsor);

// Sponsor statistics
router.get('/stats/me', sponsorController.getSponsorStats);

// Admin routes (for organization admins)
router.patch('/:sponsorId/verify', sponsorController.verifySponsor);

// Utility routes (for debugging and cleanup)
router.get('/debug/check-duplicates', sponsorController.checkDuplicateSponsors);

module.exports = router; 