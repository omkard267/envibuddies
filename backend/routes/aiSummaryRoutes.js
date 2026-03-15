const express = require('express');
const router = express.Router();
const { handleAiSummary } = require('../controllers/aiSummaryController');

router.post('/', handleAiSummary);

module.exports = router; 