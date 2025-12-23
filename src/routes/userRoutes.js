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
    resendVerification
} = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');
const { authLimiter } = require('../config/server');

const router = express.Router();

// Public routes with strict rate limiting
router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', authLimiter, resendVerification);

// Protected routes (require authentication)
router.get('/profile', authMiddleware, getProfile);
router.get('/', authMiddleware, getAllUsers);
router.get('/:id', authMiddleware, validateObjectId('id'), getUserById);
router.put('/:id', authMiddleware, validateObjectId('id'), updateProfile);
router.patch('/password', authMiddleware, changePassword);
router.delete('/:id', authMiddleware, validateObjectId('id'), deleteUser);

module.exports = router;