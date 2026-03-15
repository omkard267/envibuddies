const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');

// GET /api/resources
router.get('/', resourceController.getAllResources);

module.exports = router;
