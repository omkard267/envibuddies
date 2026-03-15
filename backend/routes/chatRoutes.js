const express = require('express');
const router = express.Router();
const { handleChat } = require('../controllers/chatController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/', protect, handleChat);

module.exports = router; 