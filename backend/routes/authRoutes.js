const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const multer = require('multer');
const { protect } = require('../middlewares/authMiddleware');

// Custom middleware for volunteer signup (profile image only)
const volunteerSignupUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Only allow images for profile pictures
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for profile pictures.'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
}).single('profileImage');

// Custom middleware for organizer signup (profile image + government ID proof)
const organizerSignupUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'profileImage') {
      // Profile images: only images allowed
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for profile pictures.'), false);
      }
    } else if (file.fieldname === 'govtIdProof') {
      // Government ID proofs: images and PDFs allowed
      if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only image files and PDFs are allowed for government ID proofs.'), false);
      }
    } else {
      cb(new Error('Unexpected field name'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for all files
  }
}).fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'govtIdProof', maxCount: 1 },
]);

router.post('/signup-volunteer', volunteerSignupUpload, authController.signupVolunteer);
router.post('/signup-organizer', organizerSignupUpload, authController.signupOrganizer);
router.post('/login', authController.login);
router.post('/set-password', authController.setPassword);

// Password reset routes
router.post('/forgot-password', authController.forgotPassword);
router.get('/verify-reset-token/:token', authController.verifyResetToken);
router.post('/reset-password', authController.resetPassword);

// Test endpoint to check reset token state (for debugging)
router.get('/check-reset-token/:token', authController.checkResetToken);

// Token management routes
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/logout-all-devices', protect, authController.logoutAllDevices);

module.exports = router;
