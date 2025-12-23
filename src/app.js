/**
 * Main Application Entry Point
 * 
 * This module initializes and starts the Express server with:
 * - Environment variable validation
 * - MongoDB connection
 * - Middleware setup
 * - Routes configuration
 * - Error handling
 * - Graceful shutdown management
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const initServer = require('./config/server');
const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./utils/errorHandler');
const validateEnv = require('./utils/validateEnv');
const { specs, swaggerUi } = require('./config/swagger');

let server;

/**
 * Gracefully stops the server and closes database connections
 * Used for testing and controlled shutdowns
 * 
 * @async
 * @returns {Promise<void>}
 */
const stopServer = async () => {
    if (!server) return;
    await new Promise(resolve => server.close(resolve));
    await mongoose.connection.close();
};

/**
 * Starts the Express server with all necessary configurations
 * 
 * Process:
 * 1. Validates required environment variables
 * 2. Initializes Express app with middleware
 * 3. Connects to MongoDB database
 * 4. Sets up API routes and health check endpoint
 * 5. Starts listening on configured port
 * 
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If environment variables are invalid or database connection fails
 */
const startServer = async () => {
    try {
        // Validate environment variables before starting
        validateEnv();
        
        // Initialize Express app with security middleware
        const app = initServer();
        
        // Connect to database before starting server
        await connectDB();
        
        /**
         * @swagger
         * /health:
         *   get:
         *     tags: [Health]
         *     summary: Health check endpoint
         *     description: Returns the health status of the server
         *     responses:
         *       200:
         *         description: Server is healthy
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 success:
         *                   type: boolean
         *                   example: true
         *                 message:
         *                   type: string
         *                   example: Server is healthy
         *                 timestamp:
         *                   type: string
         *                   format: date-time
         *                 uptime:
         *                   type: number
         *                   description: Server uptime in seconds
         */
        app.get('/health', (req, res) => {
            res.status(200).json({
                success: true,
                message: 'Server is healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });
        
        // API Documentation
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
            customCss: '.swagger-ui .topbar { display: none }',
            customSiteTitle: 'Code Craft Hub API Docs'
        }));
        
        // User API routes
        app.use('/api/users', userRoutes);
        
        // Global error handling middleware (must be last)
        app.use(errorHandler);
        
        // Start server on configured port
        const PORT = process.env.PORT || 5000;
        server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

/**
 * Gracefully shutdown the server
 * 
 * Process:
 * 1. Stops accepting new requests
 * 2. Closes HTTP server
 * 3. Closes MongoDB connection
 * 4. Forces shutdown after 10 seconds if connections don't close
 * 
 * Triggered by SIGTERM and SIGINT signals
 * 
 * @async
 * @returns {void}
 */
const shutdown = async () => {
    console.log('\nShutting down gracefully...');
    if (server) {
        server.close(async () => {
            console.log('HTTP server closed');
            try {
                await mongoose.connection.close();
                console.log('MongoDB connection closed');
                process.exit(0);
            } catch (error) {
                console.error('Error closing MongoDB connection:', error);
                process.exit(1);
            }
        });
        
        // Force shutdown after 10 seconds to prevent hanging
        setTimeout(() => {
            console.error('Forcing shutdown after timeout');
            process.exit(1);
        }, 10000);
    } else {
        process.exit(0);
    }
};

// Register graceful shutdown handlers for system signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the application
startServer();

// Export functions for testing purposes
module.exports = { startServer, stopServer };