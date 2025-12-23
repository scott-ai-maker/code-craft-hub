require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const initServer = require('./config/server');
const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./utils/errorHandler');
const validateEnv = require('./utils/validateEnv');

const startServer = async () => {
    try {
        // Validate environment variables before starting
        validateEnv();
        
        const app = initServer();
        
        // Connect to database before starting server
        await connectDB();
        
        app.use('/api/users', userRoutes);
        app.use(errorHandler);
        
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();