# Code Review - Issues & Recommendations

## 🔴 Critical Security Issues (Fix Immediately)

### 1. Add JWT_SECRET to .env
**File:** `.env`
```bash
JWT_SECRET=your-very-long-random-secret-key-min-32-chars
NODE_ENV=development
```

### 2. Implement Rate Limiting
**Install:** `npm install express-rate-limit`
**File:** `src/config/server.js`
```javascript
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: { success: false, error: 'Too many login attempts. Please try again later.' }
});

// Apply to auth routes
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);
```

### 3. Configure CORS Properly
**File:** `src/config/server.js`
```javascript
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
```

### 4. Add Request Body Size Limits
**File:** `src/config/server.js`
```javascript
app.use(express.json({ limit: '10kb' })); // Replace bodyParser
```

### 5. Validate MongoDB ObjectIDs
**Create:** `src/middleware/validateObjectId.js`
```javascript
const mongoose = require('mongoose');
const { ValidationError } = require('../utils/errorHandler');

const validateObjectId = (paramName = 'id') => {
    return (req, res, next) => {
        const id = req.params[paramName];
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new ValidationError('Invalid ID format');
        }
        next();
    };
};

module.exports = validateObjectId;
```

## 🟡 High Priority Improvements

### 6. Add Helmet for Security Headers
**Install:** `npm install helmet`
**File:** `src/config/server.js`
```javascript
const helmet = require('helmet');
app.use(helmet());
```

### 7. Add Request Logging
**File:** `src/config/server.js`
```javascript
const morgan = require('morgan');
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}
```

### 8. Improve Login Error Messages
**File:** `src/controllers/userController.js`
```javascript
// Don't reveal if user exists
const user = await User.findOne({ email });
const isMatch = user ? await user.comparePassword(password) : false;

if (!user || !isMatch) {
    throw new AuthenticationError('Invalid email or password');
}
```

### 9. Add Environment Variable Validation
**Create:** `src/utils/validateEnv.js`
```javascript
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'PORT'];

const validateEnv = () => {
    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
};

module.exports = validateEnv;
```

### 10. Add Pagination Limits
**File:** `src/controllers/userController.js`
```javascript
const limit = Math.min(parseInt(req.query.limit) || 10, 100); // Max 100
```

### 11. Use Mongoose Timestamps
**File:** `src/models/userModel.js`
```javascript
const userSchema = new mongoose.Schema({
    // ... fields
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});
```

### 12. Add Health Check Endpoint
**File:** `src/app.js`
```javascript
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
```

### 13. Implement Graceful Shutdown
**File:** `src/app.js`
```javascript
let server;

const startServer = async () => {
    // ... existing code
    server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

// Graceful shutdown
const shutdown = async () => {
    console.log('Shutting down gracefully...');
    if (server) {
        server.close(() => {
            console.log('HTTP server closed');
            mongoose.connection.close(false, () => {
                console.log('MongoDB connection closed');
                process.exit(0);
            });
        });
    }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

## 🔵 Nice-to-Have Enhancements

### 14. Add Email Verification
- Send verification email on registration
- Add `isVerified` field to User model
- Require verification before login

### 15. Implement Refresh Tokens
- Add refresh token to login response
- Store refresh tokens in database
- Add endpoint to refresh access token

### 16. Add Role-Based Authorization Middleware
```javascript
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions'
            });
        }
        next();
    };
};
```

### 17. Add Data Sanitization
**Install:** `npm install express-mongo-sanitize xss-clean`
```javascript
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(xss()); // Prevent XSS attacks
```

### 18. Add API Documentation
- Install Swagger: `npm install swagger-ui-express swagger-jsdoc`
- Document all endpoints
- Add example requests/responses

### 19. Implement Soft Delete
Instead of permanent deletion, add `isDeleted` flag

### 20. Add Password Reset Flow
- Forgot password endpoint
- Email password reset token
- Reset password endpoint

## Testing Recommendations

### Add Unit Tests
```javascript
// Example: src/tests/user.test.js
describe('User Registration', () => {
    it('should register a new user with valid data', async () => {
        // Test implementation
    });
    
    it('should reject weak passwords', async () => {
        // Test implementation
    });
});
```

### Add Integration Tests
- Test full API flows
- Test error scenarios
- Test authentication/authorization

## Performance Optimizations

1. **Add Database Indexes**
```javascript
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
```

2. **Add Redis for Session Management** (Optional)
3. **Implement Query Result Caching** (For heavy read operations)
4. **Add Compression Middleware**
```javascript
const compression = require('compression');
app.use(compression());
```

## Monitoring & Logging

1. **Add APM Tool** (New Relic, DataDog, etc.)
2. **Set up Error Tracking** (Sentry)
3. **Add Performance Metrics**
4. **Set up Log Aggregation** (ELK Stack, Splunk)

## Priority Order

**Immediate (This Week):**
- Issues #1, #2, #3, #4, #5 (Critical Security)
- Issues #6, #7, #8 (Security Headers, Logging, Error Messages)

**Short Term (Next 2 Weeks):**
- Issues #9-13 (Environment validation, pagination, health checks, graceful shutdown)
- Add ObjectId validation to routes
- Write basic tests

**Medium Term (Next Month):**
- Issues #14-20 (Email verification, refresh tokens, RBAC, documentation)
- Performance optimizations
- Comprehensive test suite

**Long Term:**
- Monitoring and logging infrastructure
- Advanced features (soft delete, audit logs, etc.)
