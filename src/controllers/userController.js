const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const { validateRegistration, validateLogin } = require('../utils/validation');
const { NotFoundError, AuthenticationError, ValidationError } = require('../utils/errorHandler');

// Register a new user
exports.registerUser = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        
        // Validate input
        validateRegistration(username, email, password);
        
        // Create new user (password will be hashed by model pre-save hook)
        const newUser = new User({ username, email, password });
        await newUser.save();
        
        res.status(201).json({ 
            success: true,
            message: 'User registered successfully',
            data: {
                username: newUser.username,
                email: newUser.email
            }
        });
    } catch (error) {
        next(error);
    }
};

// Login user
exports.loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        validateLogin(email, password);
        
        // Find user
        const user = await User.findOne({ email });
        
        // Verify password - use generic error to prevent user enumeration
        const isMatch = user ? await user.comparePassword(password) : false;
        
        if (!user || !isMatch) {
            throw new AuthenticationError('Invalid email or password');
        }
        
        // Generate token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1h' }
        );
        
        res.status(200).json({ 
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get current user profile
exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};

// Get user by ID
exports.getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};

// Get all users (paginated)
exports.getAllUsers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 100); // Max 100 items per page
        const skip = (page - 1) * limit;
        
        const users = await User.find()
            .select('-password')
            .limit(limit)
            .skip(skip)
            .sort({ createdAt: -1 });
        
        const total = await User.countDocuments();
        
        res.status(200).json({
            success: true,
            data: {
                users,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalUsers: total,
                    limit
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Update user profile
exports.updateProfile = async (req, res, next) => {
    try {
        const { username, email } = req.body;
        const userId = req.params.id;
        
        // Check if user is updating their own profile
        if (req.user.id !== userId) {
            throw new AuthenticationError('You can only update your own profile');
        }
        
        const updateData = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        
        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });
    } catch (error) {
        next(error);
    }
};

// Change password
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            throw new ValidationError('Current password and new password are required');
        }
        
        const user = await User.findById(req.user.id);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            throw new AuthenticationError('Current password is incorrect');
        }
        
        // Validate new password
        const { isValidPassword } = require('../utils/validation');
        if (!isValidPassword(newPassword)) {
            throw new ValidationError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character');
        }
        
        // Update password
        user.password = newPassword;
        await user.save();
        
        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Delete user account
exports.deleteUser = async (req, res, next) => {
    try {
        const userId = req.params.id;
        
        // Check if user is deleting their own account
        if (req.user.id !== userId) {
            throw new AuthenticationError('You can only delete your own account');
        }
        
        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};