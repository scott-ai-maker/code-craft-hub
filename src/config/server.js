/**
 * Express Server Configuration
 * 
 * Initializes Express application with all middleware for:
 * - Security (Helmet, rate limiting, CORS)
 * - Logging (Morgan)
 * - Data sanitization (NoSQL injection, XSS)
 * - Request parsing
 * 
 * @module config/server
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const logger = require('../utils/logger');

/**
 * General API Rate Limiter
 * 
 * Limits all API requests to prevent abuse:
 * - Window: 15 minutes
 * - Limit: 100 requests per IP
 * - Disabled during tests
 * 
 * @type {Function}
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: () => process.env.NODE_ENV === 'test',
});

/**
 * Strict Authentication Rate Limiter
 * 
 * Protects auth endpoints (login, register) from brute force attacks:
 * - Window: 15 minutes
 * - Limit: 5 requests per IP
 * - Counts both successful and failed attempts
 * - Disabled during tests
 * 
 * @type {Function}
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        success: false,
        error: 'Too many authentication attempts. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false, // Count successful requests
    skip: () => process.env.NODE_ENV === 'test',
});

/**
 * Initialize Express application with all security and utility middleware
 * 
 * Middleware order (important for functionality):
 * 1. Helmet - Security headers
 * 2. Morgan - HTTP request logging
 * 3. Rate limiting - Protection against abuse
 * 4. CORS - Cross-origin resource sharing
 * 5. NoSQL sanitization - Protection against injection attacks
 * 6. XSS sanitization - Protection against cross-site scripting
 * 7. Body parsers - JSON and URL-encoded request parsing
 * 
 * @returns {Express.Application} Configured Express application
 * 
 * @example
 * const app = initServer();
 * app.use('/api/users', userRoutes);
 * app.listen(3000);
 */
const initServer = () => {
    const app = express();
    
    /**
     * Security Headers with Helmet
     * 
     * Sets HTTP security headers:
     * - Content Security Policy (CSP) - prevent XSS
     * - HTTP Strict Transport Security (HSTS) - enforce HTTPS
     * - X-Frame-Options - prevent clickjacking
     * - X-Content-Type-Options - prevent MIME sniffing
     */
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
            },
        },
        hsts: {
            maxAge: 31536000, // 1 year in seconds
            includeSubDomains: true,
            preload: true
        }
    }));
    
    /**
     * Request Logging with Morgan
     * 
     * Production: Logs to Winston logger for persistence
     * Development: Logs to console with color coding
     */
    if (process.env.NODE_ENV === 'production') {
        // Production: Log to winston
        app.use(morgan('combined', {
            stream: {
                write: (message) => logger.info(message.trim())
            }
        }));
    } else {
        // Development: Colorized console output
        app.use(morgan('dev'));
    }
    
    /**
     * Apply general rate limiter to all API routes
     * Protects API from high volume requests
     */
    app.use('/api/', apiLimiter);
    
    /**
     * CORS Configuration
     * 
     * Allows requests from specified origins with credentials.
     * Configurable via ALLOWED_ORIGINS environment variable.
     * Default: http://localhost:3000
     */
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:3000'];
    
    const corsOptions = {
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps, Postman, or curl)
            if (!origin) return callback(null, true);
            
            if (allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        optionsSuccessStatus: 200,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization']
    };
    
    app.use(cors(corsOptions));
    
    /**
     * NoSQL Injection Prevention
     * 
     * Sanitizes data to prevent MongoDB injection attacks
     * by removing or replacing '$' and '.' characters in keys.
     */
    app.use(mongoSanitize({
        replaceWith: '_',
        onSanitize: ({ req, key }) => {
            logger.warn(`Sanitized NoSQL injection attempt: ${key} in ${req.method} ${req.path}`);
        },
    }));
    
    /**
     * XSS (Cross-Site Scripting) Prevention
     * 
     * Sanitizes all user input (body, query, params) to remove
     * potential malicious scripts and HTML tags.
     */
    app.use((req, res, next) => {
        // Sanitize request body
        if (req.body) {
            Object.keys(req.body).forEach(key => {
                if (typeof req.body[key] === 'string') {
                    req.body[key] = xss(req.body[key]);
                }
            });
        }
        
        // Sanitize query parameters
        if (req.query) {
            Object.keys(req.query).forEach(key => {
                if (typeof req.query[key] === 'string') {
                    req.query[key] = xss(req.query[key]);
                }
            });
        }
        
        // Sanitize URL parameters
        if (req.params) {
            Object.keys(req.params).forEach(key => {
                if (typeof req.params[key] === 'string') {
                    req.params[key] = xss(req.params[key]);
                }
            });
        }
        
        next();
    });
    
    /**
     * Body Parsing with Size Limits
     * 
     * Limits request body size to prevent DOS attacks:
     * - JSON: 10KB
     * - URL-encoded: 10KB
     */
    app.use(express.json({ limit: '10kb' }));
    app.use(express.urlencoded({ extended: true, limit: '10kb' }));
    
    return app;
};

module.exports = initServer;
module.exports.authLimiter = authLimiter;