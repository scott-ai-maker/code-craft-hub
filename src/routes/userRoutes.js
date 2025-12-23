const express = require('express');
const { 
    registerUser, 
    loginUser, 
    getProfile, 
    getUserById,
    getAllUsers,
    updateProfile, 
    changePassword, 
    deleteUser,
    verifyEmail,
    resendVerification,
    refreshToken,
    logout,
    revokeAllTokens,
    updateUserRole,
    getAllUsersAdmin
} = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');
const validateObjectId = require('../middleware/validateObjectId');
const { authLimiter } = require('../config/server');

const router = express.Router();

// Public routes with strict rate limiting
router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', authLimiter, resendVerification);

// Protected routes (require authentication)
router.get('/profile', authMiddleware, getProfile);
router.post('/revoke-all-tokens', authMiddleware, revokeAllTokens);
router.get('/', authMiddleware, getAllUsers);
router.get('/:id', authMiddleware, validateObjectId('id'), getUserById);
router.put('/:id', authMiddleware, validateObjectId('id'), updateProfile);
router.patch('/password', authMiddleware, changePassword);
router.delete('/:id', authMiddleware, validateObjectId('id'), deleteUser);

// Admin-only routes
router.get('/admin/users', authMiddleware, authorize('admin'), getAllUsersAdmin);
router.patch('/:id/role', authMiddleware, authorize('admin'), validateObjectId('id'), updateUserRole);

// Moderator and Admin routes
router.delete('/admin/:id', authMiddleware, authorize('admin', 'moderator'), validateObjectId('id'), deleteUser);

module.exports = router;