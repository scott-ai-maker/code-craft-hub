/**
 * Input Validation Utilities
 * 
 * Provides validation functions for user registration, login, and other inputs.
 * Ensures data integrity and security by validating format and strength requirements.
 */

const { ValidationError } = require('./errorHandler');

/**
 * Email Validation
 * Checks if the provided email has valid format
 * 
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email format is valid, false otherwise
 * 
 * @example
 * isValidEmail('user@example.com') // true
 * isValidEmail('invalid-email') // false
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Password Validation
 * Checks if password meets security requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character (@$!%*?&)
 * 
 * @param {string} password - Password to validate
 * @returns {boolean} True if password meets all requirements, false otherwise
 * 
 * @example
 * isValidPassword('SecurePass123!') // true
 * isValidPassword('weak') // false
 */
const isValidPassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

/**
 * Username Validation
 * Checks if username meets requirements:
 * - 3-20 characters long
 * - Only alphanumeric characters and underscores
 * 
 * @param {string} username - Username to validate
 * @returns {boolean} True if username meets all requirements, false otherwise
 * 
 * @example
 * isValidUsername('john_doe') // true
 * isValidUsername('ab') // false (too short)
 * isValidUsername('john-doe') // false (hyphen not allowed)
 */
const isValidUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
};

/**
 * Registration Input Validation
 * Validates all fields required for user registration
 * 
 * @param {string} username - Username to validate
 * @param {string} email - Email to validate
 * @param {string} password - Password to validate
 * @returns {void}
 * @throws {ValidationError} If any field is invalid
 * 
 * @example
 * try {
 *   validateRegistration('john_doe', 'john@example.com', 'SecurePass123!');
 *   // Valid, function returns without error
 * } catch (error) {
 *   console.error(error.message); // Validation error details
 * }
 */
const validateRegistration = (username, email, password) => {
    const errors = [];

    // Check required fields
    if (!username || !email || !password) {
        throw new ValidationError('Username, email, and password are required');
    }

    // Validate username format
    if (!isValidUsername(username)) {
        errors.push('Username must be 3-20 characters long and contain only letters, numbers, and underscores');
    }

    // Validate email format
    if (!isValidEmail(email)) {
        errors.push('Invalid email format');
    }

    // Validate password strength
    if (!isValidPassword(password)) {
        errors.push('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character');
    }

    // Throw error with all validation messages if any validation fails
    if (errors.length > 0) {
        throw new ValidationError(errors.join('. '));
    }
};

/**
 * Login Input Validation
 * Validates email and password fields for login
 * 
 * @param {string} email - Email to validate
 * @param {string} password - Password to validate
 * @returns {void}
 * @throws {ValidationError} If any field is missing or invalid
 * 
 * @example
 * try {
 *   validateLogin('john@example.com', 'SecurePass123!');
 *   // Valid, function returns without error
 * } catch (error) {
 *   console.error(error.message);
 * }
 */
const validateLogin = (email, password) => {
    // Check required fields
    if (!email || !password) {
        throw new ValidationError('Email and password are required');
    }

    // Validate email format
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