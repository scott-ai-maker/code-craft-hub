const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'PORT'];

/**
 * Validates that all required environment variables are present
 * @throws {Error} If any required environment variables are missing
 */
const validateEnv = () => {
    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // Additional validation for specific variables
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        console.warn('WARNING: JWT_SECRET should be at least 32 characters long for security');
    }
    
    if (process.env.PORT && isNaN(parseInt(process.env.PORT))) {
        throw new Error('PORT must be a valid number');
    }
    
    console.log('✓ Environment variables validated successfully');
};

module.exports = validateEnv;
