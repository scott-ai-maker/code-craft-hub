const User = require('../models/userModel');
// Function to find user by ID
exports.findUserById = async (userId) => {
    return await User.findById(userId);
};
// src/utils/logger.js
const winston = require('winston');
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.Console()
    ]
});
module.exports = logger;