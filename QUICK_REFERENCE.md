# Quick Reference Guide

## Common Tasks

### 1. Register New User
```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### 2. Login User
```bash
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### 3. Get Current User Profile
```bash
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Update Profile
```bash
curl -X PUT http://localhost:5000/api/users/USER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "new_username",
    "email": "newemail@example.com"
  }'
```

### 5. Change Password
```bash
curl -X POST http://localhost:5000/api/users/USER_ID/change-password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "CurrentPass123!",
    "newPassword": "NewPass123!"
  }'
```

### 6. Refresh Access Token
```bash
curl -X POST http://localhost:5000/api/users/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### 7. Logout
```bash
curl -X POST http://localhost:5000/api/users/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### 8. Request Password Reset
```bash
curl -X POST http://localhost:5000/api/users/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'
```

### 9. Reset Password
```bash
curl -X POST http://localhost:5000/api/users/reset-password/RESET_TOKEN \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "NewPass123!"
  }'
```

---

## Code Documentation Quick Links

### Understanding User Authentication
**File**: `src/controllers/userController.js`
**Functions**: `registerUser()`, `loginUser()`, `verifyEmail()`

### Understanding Token Management
**File**: `src/controllers/userController.js`
**Functions**: `generateAccessToken()`, `generateRefreshToken()`, `refreshToken()`

### Understanding Error Handling
**File**: `src/utils/errorHandler.js`
**Classes**: `ValidationError`, `AuthenticationError`, `NotFoundError`, `ConflictError`

### Understanding Validation
**File**: `src/utils/validation.js`
**Functions**: `isValidEmail()`, `isValidPassword()`, `isValidUsername()`

### Understanding Security
**File**: `src/config/server.js`
**Features**: Helmet, Rate Limiting, CORS, NoSQL Injection Prevention, XSS Protection

---

## Key Concepts

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (@$!%*?&)

**Example Valid Passwords:**
- `SecurePass123!`
- `MyP@ssw0rd`
- `Test#123Abc`

### Username Requirements
- 3-20 characters
- Letters, numbers, and underscores only
- No spaces or special characters

**Example Valid Usernames:**
- `john_doe`
- `user123`
- `john_doe_123`

### Email Requirements
- Standard email format (RFC 5322 simplified)
- Must contain @ and domain

**Example Valid Emails:**
- `user@example.com`
- `john.doe@company.co.uk`

---

## HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid input/validation error |
| 401 | Unauthorized | Missing or invalid auth token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal error |

---

## Rate Limiting

### General API Endpoints
- **Limit**: 100 requests per 15 minutes
- **Per**: IP address
- **Response**: 429 Too Many Requests

### Authentication Endpoints
- **Limit**: 5 requests per 15 minutes
- **Per**: IP address
- **Endpoints**: /register, /login, /forgot-password

**Reset**: Limits reset after 15 minutes

---

## Token Lifetimes

| Token Type | Lifetime | Usage |
|------------|----------|-------|
| Access Token | 15 minutes | API authentication |
| Refresh Token | 7 days | Get new access token |
| Verification Token | 24 hours | Email verification |
| Reset Token | 1 hour | Password reset |

---

## User Roles

### User Role
- Default role for all new users
- Can manage own profile
- Cannot modify other users

### Moderator Role
- Limited admin capabilities
- Cannot change other admin roles

### Admin Role
- Full system access
- Can manage all users
- Can assign/change roles
- Cannot demote self

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid email or password" | Wrong credentials | Check email and password |
| "Email is already verified" | User already verified | Proceed to login |
| "Username is already taken" | Username exists | Choose different username |
| "Email already exists" | Email registered | Use different email or login |
| "Token expired" | Access token expired | Use refresh token to get new one |
| "Invalid or expired token" | Token is invalid/expired | Request new token |
| "Too many requests" | Rate limit exceeded | Wait 15 minutes |
| "Insufficient permissions" | User role too low | Admin role required |

---

## Environment Setup

### Required Environment Variables
```env
MONGO_URI=mongodb://localhost:27017/user-management
JWT_SECRET=your-very-secret-key-here
PORT=5000
NODE_ENV=development
```

### Optional Environment Variables
```env
ALLOWED_ORIGINS=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
LOG_LEVEL=debug
```

---

## Useful Commands

### Start Development Server
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Start Production Server
```bash
npm start
```

### View API Documentation
```
http://localhost:5000/api-docs
```

### Check Server Health
```bash
curl http://localhost:5000/health
```

---

## Debugging Tips

### Enable Verbose Logging
Set `LOG_LEVEL=debug` in environment variables

### Check MongoDB Connection
```javascript
// Run in Node REPL
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected'))
  .catch(err => console.log('Error:', err));
```

### Verify JWT Token
```bash
# Use jwt.io to decode token
# Copy token from Authorization header
# Paste into jwt.io debugger
```

### Test Email Sending
Set `SMTP_HOST` and other email variables, then test registration

### Monitor Logs
```bash
tail -f logs/app.log
```

---

## Security Checklist

- [ ] JWT_SECRET is strong and unique
- [ ] HTTPS is enabled in production
- [ ] CORS origins are whitelisted
- [ ] Rate limiting is active
- [ ] Email verification is required
- [ ] Passwords meet strength requirements
- [ ] Refresh tokens are stored securely
- [ ] Sensitive data is not logged
- [ ] Dependencies are up to date
- [ ] Regular security audits are scheduled

---

## Performance Optimization

### Database Indexes
Ensure these indexes exist:
- Users: `email`, `username`
- RefreshTokens: `token`, `userId`

### Query Optimization
- Always paginate user lists
- Use projection to exclude unnecessary fields
- Implement caching for frequently accessed data

### Load Testing
Use tools like `Apache JMeter` or `k6` to test endpoints:
```bash
# Example with k6
k6 run load-test.js
```

---

## Integration Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

async function loginUser(email, password) {
  const response = await axios.post('http://localhost:5000/api/users/login', {
    email,
    password
  });
  return response.data.data;
}

async function getProfile(accessToken) {
  const response = await axios.get('http://localhost:5000/api/users/profile', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data.data;
}
```

### Python
```python
import requests

def login_user(email, password):
    response = requests.post(
        'http://localhost:5000/api/users/login',
        json={'email': email, 'password': password}
    )
    return response.json()['data']

def get_profile(access_token):
    response = requests.get(
        'http://localhost:5000/api/users/profile',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    return response.json()['data']
```

---

## Support

For detailed information, see:
- **Full Documentation**: [DOCUMENTATION.md](DOCUMENTATION.md)
- **Update Summary**: [DOCUMENTATION_SUMMARY.md](DOCUMENTATION_SUMMARY.md)
- **API Docs**: http://localhost:5000/api-docs (when running)

---

## Changelog

**Version 1.0.0** - Initial Release
- User authentication with JWT
- Email verification
- Password reset functionality
- Role-based access control
- User profile management
- Admin user management
- Comprehensive documentation
