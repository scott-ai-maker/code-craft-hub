# Code Craft Hub - Complete Documentation

## Project Overview

This is a Node.js REST API service for managing users with comprehensive authentication, authorization, and user management capabilities.

**Tech Stack:**
- Node.js + Express.js
- MongoDB + Mongoose
- JWT (JSON Web Tokens)
- bcrypt (password hashing)
- Nodemailer (email notifications)

---

## Architecture Overview

### Directory Structure

```
src/
├── app.js                 # Main application entry point
├── config/
│   ├── app.js            # Express app initialization
│   ├── db.js             # MongoDB connection
│   ├── jwt.js            # JWT configuration
│   ├── server.js         # Server middleware setup
│   └── swagger.js        # API documentation
├── controllers/
│   └── userController.js # User business logic handlers
├── middleware/
│   ├── authMiddleware.js       # JWT authentication
│   ├── authorize.js            # Role-based authorization
│   ├── errorMiddleware.js      # Error handling
│   └── validateObjectId.js     # MongoDB ID validation
├── models/
│   ├── userModel.js            # User schema and methods
│   └── refreshTokenModel.js    # Refresh token persistence
├── routes/
│   └── userRoutes.js     # API route definitions
├── services/
│   └── userService.js    # Business logic utilities
├── tests/
│   ├── *.test.js         # Unit tests
│   └── integration/      # Integration tests
└── utils/
    ├── email.js          # Email sending utilities
    ├── errorHandler.js   # Custom error classes
    ├── logger.js         # Application logging
    ├── validateEnv.js    # Environment validation
    └── validation.js     # Input validation utilities
```

---

## Core Components

### 1. Application Entry Point (`app.js`)

Initializes the Express server with:
- Environment validation
- Database connection
- Middleware configuration
- Route setup
- Graceful shutdown handling

**Key Functions:**
- `startServer()` - Starts the application
- `stopServer()` - Gracefully shuts down
- `shutdown()` - Handles SIGTERM/SIGINT signals

### 2. Configuration (`config/`)

#### `server.js` - Express Middleware Setup
Configures:
- **Security**: Helmet (headers), rate limiting, CORS
- **Logging**: Morgan for HTTP request logging
- **Protection**: NoSQL sanitization, XSS protection
- **Parsing**: JSON and URL-encoded request parsing

**Rate Limiting:**
- General API: 100 requests per 15 minutes
- Auth endpoints: 5 requests per 15 minutes

#### `db.js` - MongoDB Connection
Establishes and maintains MongoDB connection using Mongoose.

#### `swagger.js` - API Documentation
Generates OpenAPI/Swagger documentation for all endpoints.

### 3. Models (`models/`)

#### `userModel.js` - User Schema
**Fields:**
- `username` - Unique, alphanumeric
- `email` - Unique, lowercase
- `password` - Hashed with bcrypt
- `role` - One of: user, admin, moderator
- `isVerified` - Email verification status
- `verificationToken` - For email verification
- `passwordResetToken` - For password reset
- `deletedAt` - For soft deletion

**Key Methods:**
- `comparePassword()` - Verify password during login
- `generateVerificationToken()` - Create email verification token
- `generatePasswordResetToken()` - Create password reset token
- `softDelete()` - Soft delete user (data retention)
- `restore()` - Restore soft-deleted user

**Query Helpers:**
- `notDeleted()` - Exclude soft-deleted users
- `onlyDeleted()` - Get only deleted users

### 4. Controllers (`controllers/userController.js`)

Handles all user-related API operations:

#### Authentication Endpoints
- **registerUser()** - Create new user account
- **loginUser()** - Authenticate user and generate tokens
- **verifyEmail()** - Verify email with token
- **resendVerification()** - Resend verification email
- **forgotPassword()** - Request password reset
- **resetPassword()** - Reset password with token

#### Profile Management
- **getProfile()** - Get current user's profile
- **getUserById()** - Get specific user by ID
- **getAllUsers()** - List all users (paginated)
- **updateProfile()** - Update username/email
- **changePassword()** - Change user's password
- **deleteUser()** - Soft delete user account

#### Token Management
- **refreshToken()** - Get new access token
- **logout()** - Revoke single refresh token
- **revokeAllTokens()** - Logout from all devices

#### Admin Operations
- **updateUserRole()** - Change user's role
- **getAllUsersAdmin()** - Admin user listing with filters
- **restoreUser()** - Restore deleted user
- **permanentlyDeleteUser()** - Permanent deletion

### 5. Middleware (`middleware/`)

#### `authMiddleware.js`
- Verifies JWT tokens in Authorization header
- Extracts and attaches user info to request
- Handles token expiration and invalid tokens

**Format:** `Authorization: Bearer <token>`

#### `authorize.js`
- Role-based access control (RBAC)
- Checks if user has required role(s)
- Usage: `authorize('admin', 'moderator')`

#### `validateObjectId.js`
- Validates MongoDB ObjectId format
- Prevents invalid ID errors early

#### `errorMiddleware.js`
- Centralized error handling
- Consistent error responses

### 6. Utilities (`utils/`)

#### `validation.js`
**Validators:**
- `isValidEmail()` - Email format validation
- `isValidPassword()` - Password strength validation (8+ chars, mixed case, number, special char)
- `isValidUsername()` - Username format (3-20 chars, alphanumeric + underscore)
- `validateRegistration()` - All registration fields
- `validateLogin()` - Login credentials

#### `errorHandler.js`
**Custom Error Classes:**
- `AppError` - Base error class
- `ValidationError` (400) - Input validation failures
- `AuthenticationError` (401) - Auth failures
- `NotFoundError` (404) - Resource not found
- `ConflictError` (409) - Duplicate/conflict errors

**Error Handler Middleware:**
- Logs all errors with context
- Handles Mongoose errors (duplicate keys, validation)
- Handles JWT errors
- Returns consistent error responses

#### `email.js`
Sends transactional emails:
- `sendVerificationEmail()` - Email verification
- `sendWelcomeEmail()` - Welcome after verification
- `sendPasswordResetEmail()` - Password reset link

#### `logger.js`
Winston-based logging:
- Logs errors, warnings, and info messages
- Different formats for production and development
- Log files stored in `/logs` directory

---

## Security Features

### 1. Authentication
- **JWT Tokens**: Short-lived access tokens (15 minutes)
- **Refresh Tokens**: Long-lived tokens (7 days), stored in database
- **Password Hashing**: bcrypt with 10 salt rounds
- **Email Verification**: Required before login

### 2. Authorization
- **Role-Based Access Control (RBAC)**:
  - `user` - Regular user
  - `admin` - Full access
  - `moderator` - Limited admin capabilities

### 3. Protection Against Common Attacks
- **CORS**: Whitelist allowed origins
- **Rate Limiting**: Prevent brute force attacks
- **Helmet**: Security headers (CSP, HSTS, etc.)
- **NoSQL Injection**: Sanitize query operators
- **XSS (Cross-Site Scripting)**: Sanitize user input
- **CSRF**: Handled by frontend token management

### 4. Password Security
Requirements:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (@$!%*?&)

### 5. Soft Deletion
- User data retained for compliance
- Deleted users excluded from normal queries
- Admins can restore or permanently delete

---

## API Endpoints

### Authentication Routes

#### Register User
```
POST /api/users/register
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### Login
```
POST /api/users/login
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
Response:
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": { ... }
  }
}
```

#### Verify Email
```
GET /api/users/verify-email/:token
```

#### Resend Verification
```
POST /api/users/resend-verification
{
  "email": "john@example.com"
}
```

#### Refresh Token
```
POST /api/users/refresh-token
{
  "refreshToken": "..."
}
```

#### Logout
```
POST /api/users/logout
{
  "refreshToken": "..."
}
```

#### Logout from All Devices
```
POST /api/users/logout-all
Headers: Authorization: Bearer <token>
```

#### Forgot Password
```
POST /api/users/forgot-password
{
  "email": "john@example.com"
}
```

#### Reset Password
```
POST /api/users/reset-password/:token
{
  "newPassword": "NewPass123!"
}
```

### User Profile Routes

#### Get Current Profile
```
GET /api/users/profile
Headers: Authorization: Bearer <token>
```

#### Get User by ID
```
GET /api/users/:id
```

#### Get All Users (Paginated)
```
GET /api/users?page=1&limit=10
```

#### Update Profile
```
PUT /api/users/:id
Headers: Authorization: Bearer <token>
{
  "username": "new_username",
  "email": "newemail@example.com"
}
```

#### Change Password
```
POST /api/users/:id/change-password
Headers: Authorization: Bearer <token>
{
  "currentPassword": "CurrentPass123!",
  "newPassword": "NewPass123!"
}
```

#### Delete Account
```
DELETE /api/users/:id
Headers: Authorization: Bearer <token>
```

### Admin Routes

#### Get All Users (Admin)
```
GET /api/users/admin/users?page=1&limit=10&role=user&includeDeleted=false
Headers: Authorization: Bearer <token>
Requires: admin role
```

#### Update User Role
```
PUT /api/users/:id/role
Headers: Authorization: Bearer <token>
{
  "role": "admin"
}
Requires: admin role
```

#### Restore User
```
POST /api/users/:id/restore
Headers: Authorization: Bearer <token>
Requires: admin role
```

#### Permanently Delete User
```
DELETE /api/users/:id/permanent
Headers: Authorization: Bearer <token>
Requires: admin role
```

---

## Token Management

### Access Token
- **Lifetime**: 15 minutes
- **Usage**: Include in Authorization header for API requests
- **Payload**: User ID, email, role

### Refresh Token
- **Lifetime**: 7 days
- **Storage**: Database
- **Usage**: Exchange for new access token
- **Security**: Rotated on each refresh for extra security

### Token Rotation
When refreshing:
1. Old refresh token is revoked
2. New refresh token is issued
3. Prevents token reuse attacks

---

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/user-management

# JWT
JWT_SECRET=your-secret-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@example.com

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/app.log
```

---

## Error Handling

### Response Format
```json
{
  "success": false,
  "error": "Error message",
  "details": ["Additional details"]
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized / Authentication Failed
- `403` - Forbidden / Insufficient Permissions
- `404` - Not Found
- `409` - Conflict / Duplicate Entry
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## Best Practices

1. **Always use HTTPS in production**
2. **Keep JWT_SECRET secure** - Use strong, random string
3. **Regularly rotate tokens** - Implement token expiration
4. **Log security events** - Track authentication attempts
5. **Validate all inputs** - Client-side and server-side
6. **Use environment variables** - Never hardcode secrets
7. **Test thoroughly** - Unit and integration tests
8. **Monitor rate limits** - Prevent abuse
9. **Keep dependencies updated** - Security patches
10. **Implement proper error handling** - Don't expose internals

---

## Testing

Run all tests:
```bash
npm test
```

Run with coverage:
```bash
npm run test:coverage
```

Test files are located in `src/tests/` and cover:
- Unit tests for utilities and models
- Integration tests for API endpoints
- Middleware testing
- Error handling scenarios

---

## Development

### Start Development Server
```bash
npm run dev
```

### Start Production Server
```bash
npm start
```

### View API Documentation
Navigate to: `http://localhost:5000/api-docs`

---

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check MONGO_URI environment variable
   - Verify MongoDB service is running
   - Check network connectivity

2. **Email Sending Failed**
   - Verify SMTP credentials
   - Check firewall/port access
   - Enable "Less secure apps" for Gmail

3. **Token Expired Error**
   - Use refresh token to get new access token
   - Check token expiration time

4. **Rate Limit Exceeded**
   - Wait 15 minutes for limit reset
   - Use different IP address for testing

---

## Performance Considerations

- **Database Indexes**: Ensure indexes on frequently queried fields
- **Pagination**: Always paginate user listings
- **Caching**: Implement caching for frequently accessed data
- **Connection Pooling**: MongoDB connection pooling is enabled
- **Load Balancing**: Deploy multiple instances for scalability

---

## License

MIT

---

## Support

For issues or questions, refer to the API documentation at `/api-docs` endpoint.
