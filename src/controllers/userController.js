const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const { validateRegistration, validateLogin } = require('../utils/validation');
const { NotFoundError, AuthenticationError } = require('../utils/errorHandler');

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
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        // Verify password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw new AuthenticationError('Invalid credentials');
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