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
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!uri) {
            throw new Error('MongoDB connection string is not defined');
        }

        await mongoose.connect(uri);
        if (process.env.NODE_ENV !== 'test') {
            console.log('MongoDB connected successfully.');
        }
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        if (process.env.NODE_ENV === 'test') {
            // Let the test runner handle the failure instead of exiting
            throw error;
        }
        process.exit(1);
    }
};

module.exports = connectDB;