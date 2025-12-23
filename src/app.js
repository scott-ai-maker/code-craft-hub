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

// Exported for testing to allow graceful shutdown
const stopServer = async () => {
    if (!server) return;
    await new Promise(resolve => server.close(resolve));
    await mongoose.connection.close();
};

const startServer = async () => {
    try {
        // Validate environment variables before starting
        validateEnv();
        
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
        
        app.use('/api/users', userRoutes);
        app.use(errorHandler);
        
        const PORT = process.env.PORT || 5000;
        server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
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
        
        // Force shutdown after 10 seconds
        setTimeout(() => {
            console.error('Forcing shutdown after timeout');
            process.exit(1);
        }, 10000);
    } else {
        process.exit(0);
    }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startServer();

module.exports = { startServer, stopServer };