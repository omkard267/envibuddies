// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const User = require('../models/user');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Custom middleware for profile updates that handles both profile images and government ID proofs
const profileUpdateUpload = multer({
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

// Helper function to safely delete files
const deleteFile = (filePath, fileName) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.error(`Error deleting file ${fileName}:`, error);
  }
  return false;
};

// Get user counts for statistics - MUST BE BEFORE /:id route
router.get('/counts', async (req, res) => {
  try {
    const [volunteerCount, organizerCount] = await Promise.all([
      User.countDocuments({ role: 'volunteer' }),
      User.countDocuments({ role: 'organizer' })
    ]);
    
    res.json({
      volunteerCount,
      organizerCount
    });
  } catch (error) {
    console.error('❌ Error getting user counts:', error);
    res.status(500).json({ message: 'Failed to get user counts' });
  }
});

// Test route to verify API is working
router.get('/test', (req, res) => {
  res.json({ message: 'User routes are working!' });
});

// Cleanup invalid Cloudinary URLs (admin only)
router.post('/cleanup-cloudinary-urls', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only administrators can perform this action' 
      });
    }

    const axios = require('axios');
    
    // Function to check if Cloudinary URL is valid
    const checkCloudinaryUrl = async (url) => {
      try {
        const cloudinaryRegex = /https:\/\/res\.cloudinary\.com\/[^\/]+\/image\/upload\/v\d+\/[^\/]+\/[^\/]+\.(jpg|jpeg|png|gif|webp)/i;
        if (!cloudinaryRegex.test(url)) {
          return { valid: false, reason: 'Invalid URL format' };
        }

        if (url.length < 50 || url.length > 500) {
          return { valid: false, reason: 'Suspicious URL length' };
        }

        const response = await axios.head(url, {
          timeout: 5000,
          validateStatus: (status) => status < 500
        });

        if (response.status === 200) {
          return { valid: true };
        } else if (response.status === 404) {
          return { valid: false, reason: 'Image not found (404)' };
        } else {
          return { valid: false, reason: `HTTP ${response.status}` };
        }
      } catch (error) {
        if (error.code === 'ECONNABORTED') {
          return { valid: false, reason: 'Request timeout' };
        } else if (error.response) {
          return { valid: false, reason: `HTTP ${error.response.status}` };
        } else {
          return { valid: false, reason: error.message };
        }
      }
    };

    // Get users with profile images or govt ID proofs
    const users = await User.find({
      $or: [
        { profileImage: { $exists: true, $ne: null } },
        { govtIdProofUrl: { $exists: true, $ne: null } }
      ]
    });

    let stats = {
      total: users.length,
      profileImages: { checked: 0, valid: 0, cleaned: 0, errors: 0 },
      govtIdProofs: { checked: 0, valid: 0, cleaned: 0, errors: 0 },
      cleanedUsers: []
    };

    for (const user of users) {
      let userCleaned = false;

      // Check profile image
      if (user.profileImage) {
        stats.profileImages.checked++;
        const urlCheck = await checkCloudinaryUrl(user.profileImage);
        
        if (urlCheck.valid) {
          stats.profileImages.valid++;
        } else {
          await User.findByIdAndUpdate(user._id, {
            $unset: { profileImage: 1 }
          });
          stats.profileImages.cleaned++;
          userCleaned = true;
        }
      }

      // Check govt ID proof
      if (user.govtIdProofUrl) {
        stats.govtIdProofs.checked++;
        const urlCheck = await checkCloudinaryUrl(user.govtIdProofUrl);
        
        if (urlCheck.valid) {
          stats.govtIdProofs.valid++;
        } else {
          await User.findByIdAndUpdate(user._id, {
            $unset: { govtIdProofUrl: 1 }
          });
          stats.govtIdProofs.cleaned++;
          userCleaned = true;
        }
      }

      if (userCleaned) {
        stats.cleanedUsers.push({
          userId: user._id,
          username: user.username || user.name
        });
      }

      // Add delay to avoid overwhelming Cloudinary
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    res.json({
      success: true,
      message: 'Cloudinary URL cleanup completed',
      stats
    });

  } catch (error) {
    console.error('❌ Error during Cloudinary URL cleanup:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cleanup Cloudinary URLs',
      error: error.message 
    });
  }
});

router.get('/profile', protect, (req, res) => {
  res.json({ user: req.user });
});

// Check username availability
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ 
        available: false, 
        message: 'Username can only contain letters, numbers, and underscores' 
      });
    }

    // Check if username exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    
    res.json({ 
      available: !existingUser,
      message: existingUser ? 'Username already taken' : 'Username available'
    });
  } catch (error) {
    console.error('Username check error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search volunteers
router.get('/volunteers', protect, async (req, res) => {
  try {
    const { search } = req.query;
    let query = { role: 'volunteer' };
    
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { username: searchRegex },
        { email: searchRegex },
        { city: searchRegex }
      ];
    }
    
    const volunteers = await User.find(query)
      .select('name username email profileImage city role')
      .limit(20)
      .sort({ name: 1 });
    
    res.json(volunteers);
  } catch (error) {
    console.error('Error searching volunteers:', error);
    res.status(500).json({ message: 'Failed to search volunteers' });
  }
});

// Search organizers
router.get('/organizers', protect, async (req, res) => {
  try {
    const { search } = req.query;
    let query = { role: 'organizer' };
    
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { username: searchRegex },
        { email: searchRegex },
        { city: searchRegex },
        { position: searchRegex }
      ];
    }
    
    const organizers = await User.find(query)
      .select('name username email profileImage city role position')
      .limit(20)
      .sort({ name: 1 });
    
    res.json(organizers);
  } catch (error) {
    console.error('Error searching organizers:', error);
    res.status(500).json({ message: 'Failed to search organizers' });
  }
});

router.put('/profile', protect, profileUpdateUpload, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get current user data to check for existing files
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const updateData = { ...req.body };

    // Parse socials if sent as JSON string
    if (updateData.socials) {
      if (typeof updateData.socials === 'string') {
      try {
        updateData.socials = JSON.parse(updateData.socials);
      } catch (e) {
          console.error('Error parsing socials:', e);
          updateData.socials = {};
        }
      }
      // Ensure socials has the correct structure
      if (typeof updateData.socials === 'object' && updateData.socials !== null) {
        updateData.socials = {
          instagram: updateData.socials.instagram || '',
          linkedin: updateData.socials.linkedin || '',
          twitter: updateData.socials.twitter || '',
          facebook: updateData.socials.facebook || ''
        };
      } else {
        updateData.socials = {};
      }
    }

    // Handle username change
    if (updateData.username && updateData.username !== currentUser.username) {
      // Check if new username is available
      const existingUser = await User.findOne({ 
        username: updateData.username.toLowerCase(),
        _id: { $ne: userId } // Exclude current user
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
      
      // Convert username to lowercase
      updateData.username = updateData.username.toLowerCase();
    }

    // Handle email change
    if (updateData.email && updateData.email !== currentUser.email) {
      // Check if new email is available
      const existingUser = await User.findOne({ 
        email: updateData.email.toLowerCase(),
        _id: { $ne: userId } // Exclude current user
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
      
      // Convert email to lowercase
      updateData.email = updateData.email.toLowerCase();
    }

    // Remove uneditable fields
    delete updateData.organization; // Don't allow changing organization here
    delete updateData.role; // Don't allow changing role

    // Handle profile image upload
    if (req.files?.profileImage?.[0]) {
      // Delete old profile image from Cloudinary if it exists
      if (currentUser.profileImage && currentUser.profileImage.startsWith('http')) {
        const { deleteFromCloudinary, getFileInfoFromUrl } = require('../utils/cloudinaryUtils');
        const fileInfo = getFileInfoFromUrl(currentUser.profileImage);
        if (fileInfo && fileInfo.publicId) {
          await deleteFromCloudinary(fileInfo.publicId);
        }
      }
      
      // Upload new profile image to Cloudinary
      const { uploadToCloudinary } = require('../utils/cloudinaryUtils');
      const uploadResult = await uploadToCloudinary(req.files.profileImage[0], 'profiles');
      
      if (uploadResult.success) {
        updateData.profileImage = uploadResult.url;
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload profile image'
        });
      }
    } else if (req.body.removeProfileImage === 'true') {
      // Handle profile image removal from Cloudinary
      if (currentUser.profileImage && currentUser.profileImage.startsWith('http')) {
        const { deleteFromCloudinary, getFileInfoFromUrl } = require('../utils/cloudinaryUtils');
        const fileInfo = getFileInfoFromUrl(currentUser.profileImage);
        if (fileInfo && fileInfo.publicId) {
          await deleteFromCloudinary(fileInfo.publicId);
        }
      }
      updateData.profileImage = null;
    }
    
    if (req.files?.govtIdProof?.[0]) {
      // Delete old government ID proof from Cloudinary if it exists
      if (currentUser.govtIdProofUrl && currentUser.govtIdProofUrl.startsWith('http')) {
        const { deleteFromCloudinary, getFileInfoFromUrl } = require('../utils/cloudinaryUtils');
        const fileInfo = getFileInfoFromUrl(currentUser.govtIdProofUrl);
        if (fileInfo && fileInfo.publicId) {
          await deleteFromCloudinary(fileInfo.publicId);
        }
      }
      
      // Upload new government ID proof to Cloudinary
      const { uploadToCloudinary } = require('../utils/cloudinaryUtils');
      const uploadResult = await uploadToCloudinary(req.files.govtIdProof[0], 'documents');
      
      if (uploadResult.success) {
        updateData.govtIdProofUrl = uploadResult.url;
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload government ID proof'
        });
      }
    } else if (req.body.removeGovtIdProof === 'true') {
      // Handle government ID proof removal from Cloudinary
      if (currentUser.govtIdProofUrl && currentUser.govtIdProofUrl.startsWith('http')) {
        const { deleteFromCloudinary, getFileInfoFromUrl } = require('../utils/cloudinaryUtils');
        const fileInfo = getFileInfoFromUrl(currentUser.govtIdProofUrl);
        if (fileInfo && fileInfo.publicId) {
          await deleteFromCloudinary(fileInfo.publicId);
        }
      }
      updateData.govtIdProofUrl = null;
    }

    // Handle password update with hashing
    if (updateData.password) {
      const bcrypt = require('bcryptjs');
      updateData.password = await bcrypt.hash(updateData.password, 10);
    } else {
      delete updateData.password;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Profile update error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      updateData: updateData
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

// Public: Get user by ID (for organizer profile view)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -dateOfBirth');
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }
    
    // Check if user is deleted
    if (user.isDeleted) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'ACCOUNT_DELETED'
      });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Error fetching user by ID:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
