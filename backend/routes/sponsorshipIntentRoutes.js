const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { multiUpload } = require('../middlewares/upload');
const sponsorshipIntentController = require('../controllers/sponsorshipIntentController');

// Protected routes (require authentication)
router.use(protect);

// Application submission (now protected)
router.post('/apply', sponsorshipIntentController.submitIntent);

// Application management
router.get('/organization/:organizationId', sponsorshipIntentController.getOrganizationIntents);
router.get('/user/me', sponsorshipIntentController.getUserIntents);
router.get('/:id', sponsorshipIntentController.getIntentById);
router.put('/:id', sponsorshipIntentController.updateIntent);
router.delete('/:id', sponsorshipIntentController.deleteIntent);

// Application review (admin routes)
router.patch('/:id/review', sponsorshipIntentController.reviewIntent);
router.post('/:id/communication', sponsorshipIntentController.addCommunication);

// Utility routes (admin only)
router.post('/cleanup-orphaned', sponsorshipIntentController.cleanupOrphanedIntents);

module.exports = router; 