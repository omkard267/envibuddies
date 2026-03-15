const express = require('express');
const router = express.Router();
const oauthController = require('../controllers/oauthController');
const { protect } = require('../middlewares/authMiddleware');

// Google OAuth callback
router.post('/google', oauthController.googleCallback);

// Complete OAuth registration
router.post('/complete-registration', oauthController.completeOAuthRegistration);

// Link OAuth to existing account
router.post('/link-account', oauthController.linkOAuthAccount);

// Unlink OAuth account (requires authentication)
router.post('/unlink-account', protect, oauthController.unlinkOAuthAccount);

// Check username availability
router.get('/check-username/:username', oauthController.checkUsername);

module.exports = router;
