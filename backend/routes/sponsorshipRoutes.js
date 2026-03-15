const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const sponsorshipController = require('../controllers/sponsorshipController');

// Public routes (for viewing sponsorships)
router.get('/organization/:organizationId', sponsorshipController.getOrganizationSponsorships);
router.get('/event/:eventId', sponsorshipController.getEventSponsorships);
router.get('/stats', sponsorshipController.getSponsorshipStats);

// Protected routes (require authentication)
router.use(protect);

// Sponsorship management
router.post('/', sponsorshipController.createSponsorship);
router.get('/:id', sponsorshipController.getSponsorshipById);
router.put('/:id', sponsorshipController.updateSponsorship);
router.delete('/:id', sponsorshipController.deleteSponsorship);

// Sponsorship workflow
router.patch('/:id/approve', sponsorshipController.approveSponsorship);
router.patch('/:id/reject', sponsorshipController.rejectSponsorship);
router.patch('/:id/activate', sponsorshipController.activateSponsorship);
router.patch('/:id/complete', sponsorshipController.completeSponsorship);

module.exports = router; 