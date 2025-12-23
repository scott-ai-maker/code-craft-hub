const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validateRegistration, validateLogin } = require('../utils/validation');
const { NotFoundError, AuthenticationError, ValidationError } = require('../utils/errorHandler');
const { sendVerificationEmail, sendWelcomeEmail } = require('../utils/email');

// Register a new user
exports.registerUser = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        
        // Validate input
        validateRegistration(username, email, password);
        
        // Create new user (password will be hashed by model pre-save hook)
        const newUser = new User({ username, email, password });
        
        // Generate verification token
        const verificationToken = newUser.generateVerificationToken();
        await newUser.save();
        
        // Send verification email
        try {
            await sendVerificationEmail(email, username, verificationToken);
        } catch (emailError) {
            // Log error but don't fail registration
            console.error('Failed to send verification email:', emailError.message);
        }
        
        res.status(201).json({ 
            success: true,
            message: 'User registered successfully. Please check your email to verify your account.',
            data: {
                username: newUser.username,
                email: newUser.email,
                isVerified: newUser.isVerified,
                createdAt: newUser.createdAt,
                updatedAt: newUser.updatedAt
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
        
        // Check if email is verified
        if (!user.isVerified) {
            throw new AuthenticationError('Please verify your email before logging in. Check your inbox for the verification link.');
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
                    email: user.email,
                    isVerified: user.isVerified,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
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

// Verify email
exports.verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.params;
        
        if (!token) {
            throw new ValidationError('Verification token is required');
        }
        
        // Hash the token to match stored hash
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        
        // Find user with matching token and non-expired token
        const user = await User.findOne({
            verificationToken: hashedToken,
            verificationTokenExpires: { $gt: Date.now() },
        });
        
        if (!user) {
            throw new ValidationError('Invalid or expired verification token');
        }
        
        // Update user verification status
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();
        
        // Send welcome email
        try {
            await sendWelcomeEmail(user.email, user.username);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError.message);
        }
        
        res.status(200).json({
            success: true,
            message: 'Email verified successfully! You can now log in.',
            data: {
                username: user.username,
                email: user.email,
                isVerified: user.isVerified,
            }
        });
    } catch (error) {
        next(error);
    }
};

// Resend verification email
exports.resendVerification = async (req, res, next) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            throw new ValidationError('Email is required');
        }
        
        const user = await User.findOne({ email });
        
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        if (user.isVerified) {
            throw new ValidationError('Email is already verified');
        }
        
        // Generate new verification token
        const verificationToken = user.generateVerificationToken();
        await user.save();
        
        // Send verification email
        await sendVerificationEmail(email, user.username, verificationToken);
        
        res.status(200).json({
            success: true,
            message: 'Verification email sent. Please check your inbox.',
        });
    } catch (error) {
        next(error);
    }
};