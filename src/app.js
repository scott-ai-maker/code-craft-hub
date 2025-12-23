require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const initServer = require('./config/server');
const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./utils/errorHandler');
const validateEnv = require('./utils/validateEnv');

let server;

const startServer = async () => {
    try {
        // Validate environment variables before starting
        validateEnv();
        
        const app = initServer();
        
        // Connect to database before starting server
        await connectDB();
        
        // Health check endpoint
        app.get('/health', (req, res) => {
            res.status(200).json({
                success: true,
                message: 'Server is healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });
        
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