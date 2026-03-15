// backend/middleware/upload.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Organization storage - using Cloudinary (memory storage for Cloudinary upload)
const organizationStorage = multer.memoryStorage();

const organizationUpload = multer({ 
  storage: organizationStorage,
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs for all organization documents
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are allowed for organization documents.'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for organization documents
  }
});

// Event storage - using Cloudinary (memory storage for Cloudinary upload)
const eventStorage = multer.memoryStorage();

const eventUpload = multer({ 
  storage: eventStorage,
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs for event files
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are allowed for event files.'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for event files
  }
});

// Single file upload for event creation (images and letters)
const eventSingleUpload = multer({
  storage: eventStorage,
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs for event files
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are allowed for event files.'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for event files
  }
});

// For organization registration: support multiple files
const multiUpload = organizationUpload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'gstCertificate', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'ngoRegistration', maxCount: 1 },
  { name: 'letterOfIntent', maxCount: 1 },
]);

// Sponsor storage - using Cloudinary (memory storage for Cloudinary upload)
const sponsorStorage = multer.memoryStorage();

const sponsorUpload = multer({ 
  storage: sponsorStorage,
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs for sponsor documents
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are allowed for sponsor documents.'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for sponsor documents
  }
});

// For sponsor uploads: support logo and business documents
const sponsorMultiUpload = sponsorUpload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'gstCertificate', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'companyRegistration', maxCount: 1 },
]);

// Profile image storage - using Cloudinary (memory storage for Cloudinary upload)
// Only for profile images - images only
const profileImageStorage = multer.memoryStorage();

const profileImageUpload = multer({ 
  storage: profileImageStorage,
  fileFilter: (req, file, cb) => {
    // Allow only image files for profile pictures
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for profile pictures.'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for profile images
  }
});

// Government ID proof storage - using Cloudinary (memory storage for Cloudinary upload)
// For government ID proofs - images + PDFs
const govtIdStorage = multer.memoryStorage();

const govtIdUpload = multer({ 
  storage: govtIdStorage,
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs for government ID proofs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are allowed for government ID proofs.'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for government ID proofs
  }
});

// For profile uploads: support profile image and government ID proof
// Use separate upload middlewares for each file type
const profileMultiUpload = multer().fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'govtIdProof', maxCount: 1 },
]);

// For single profile image upload (for volunteer signup)
const profileSingleUpload = profileImageUpload.single('profileImage');

// For event uploads: support event images and government approval letter
const eventMultiUpload = eventUpload.fields([
  { name: 'eventImages', maxCount: 5 },
  { name: 'govtApprovalLetter', maxCount: 1 },
]);

// Chat storage - using Cloudinary (memory storage for Cloudinary upload)
const chatStorage = multer.memoryStorage();

const chatUpload = multer({ 
  storage: chatStorage,
  fileFilter: (req, file, cb) => {
    // Allow images, PDFs, and common document types for chat files
    if (file.mimetype.startsWith('image/') || 
        file.mimetype === 'application/pdf' ||
        file.mimetype === 'application/msword' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed for chat. Only images, PDFs, and common document types are allowed.'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for chat files
  }
});

// Completed Event storage - using Cloudinary (memory storage for Cloudinary upload)
const completedEventStorage = multer.memoryStorage();

const completedEventUpload = multer({ 
  storage: completedEventStorage,
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs for completed event media
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are allowed for completed event media.'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for completed event media
  }
});

module.exports = {
  organizationUpload,
  eventUpload,
  eventSingleUpload,
  profileImageUpload,
  govtIdUpload,
  multiUpload,
  eventMultiUpload,
  profileMultiUpload,
  profileSingleUpload,
  chatUpload,
  completedEventUpload,
  sponsorUpload,
  sponsorMultiUpload,
};
