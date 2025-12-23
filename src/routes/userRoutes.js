const express = require('express');
const { 
    registerUser, 
    loginUser, 
    getProfile, 
    getUserById,
    getAllUsers,
    updateProfile, 
    changePassword, 
    deleteUser 
} = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes (require authentication)
router.get('/profile', authMiddleware, getProfile);
router.get('/', authMiddleware, getAllUsers);
router.get('/:id', authMiddleware, getUserById);
router.put('/:id', authMiddleware, updateProfile);
router.patch('/password', authMiddleware, changePassword);
router.delete('/:id', authMiddleware, deleteUser);

module.exports = router;