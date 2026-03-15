const express = require('express');
const router = express.Router();
const { protect, requireActiveAccount, isAccountOwner } = require('../middlewares/authMiddleware');
const accountController = require('../controllers/accountController');
const { asyncHandler } = require('../utils/errorResponse');
const { check } = require('express-validator');

// Input validation for recovery requests
const recoveryValidation = [
  check('email', 'Please include a valid email').isEmail().normalizeEmail()
];

// Account recreation analysis
router.post('/recreation-analysis', accountController.handleAccountRecreation);

// Account deletion
router.delete('/', protect, accountController.deleteAccount);

// @route   POST /api/account/recovery/request
// @desc    Request an account recovery email
// @access  Public
router.post(
  '/recovery/request',
  recoveryValidation,
  asyncHandler(accountController.requestAccountRecovery)
);

// @route   POST /api/account/recovery/verify
// @desc    Verify recovery token and restore account
// @access  Public
router.post(
  '/recovery/verify',
  [
    check('token', 'Recovery token is required').notEmpty()
  ],
  asyncHandler(accountController.recoverAccount)
);

// @route   POST /api/account/cleanup
// @desc    Permanently delete accounts that were soft-deleted more than X days ago
// @access  Private/Admin
router.post(
  '/cleanup',
  protect,
  asyncHandler(accountController.cleanupDeletedAccounts)
);

module.exports = router;
