/**
 * MongoDB Database Connection
 * 
 * Establishes connection to MongoDB using Mongoose
 * Handles connection errors and provides logging
 */

const mongoose = require('mongoose');

/**
 * Connects to MongoDB database
 * 
 * Uses connection string from MONGODB_URI environment variable.
 * On success: Logs confirmation message
 * On failure: Logs error and exits process with code 1
 * 
 * @async
 * @returns {Promise<void>}
 * @throws {Error} Connection error from MongoDB
 * 
 * @example
 * const connectDB = require('./config/db');
 * await connectDB();
 */
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected successfully.');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1);
    }
};

module.exports = connectDB;