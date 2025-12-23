const { ValidationError } = require('./errorHandler');

// Email validation
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Password validation (at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)
const isValidPassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

// Username validation (3-20 chars, alphanumeric and underscore)
const isValidUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
};

// Validate registration input
const validateRegistration = (username, email, password) => {
    const errors = [];

    if (!username || !email || !password) {
        throw new ValidationError('Username, email, and password are required');
    }

    if (!isValidUsername(username)) {
        errors.push('Username must be 3-20 characters long and contain only letters, numbers, and underscores');
    }

    if (!isValidEmail(email)) {
        errors.push('Invalid email format');
    }

    if (!isValidPassword(password)) {
        errors.push('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character');
    }

    if (errors.length > 0) {
        throw new ValidationError(errors.join('. '));
    }
};

// Validate login input
const validateLogin = (email, password) => {
    if (!email || !password) {
        throw new ValidationError('Email and password are required');
    }

    if (!isValidEmail(email)) {
        throw new ValidationError('Invalid email format');
    }
};

module.exports = {
    isValidEmail,
    isValidPassword,
    isValidUsername,
    validateRegistration,
    validateLogin
};