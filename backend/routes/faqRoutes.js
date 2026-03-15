const express = require('express');
const router = express.Router();
const { getFaqs } = require('../controllers/faqController');

// @route   GET api/faqs
// @desc    Get all FAQs
// @access  Public
router.get('/', getFaqs);

module.exports = router; 