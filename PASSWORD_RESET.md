# Password Reset Flow Documentation

## Overview
The password reset flow allows users to securely reset their password when forgotten. It uses time-limited, single-use tokens sent via email.

## Features
- **Forgot Password Endpoint**: Users request a password reset by providing their email
- **Email-Based Reset**: A password reset token is sent to the user's email address
- **Time-Limited Tokens**: Reset tokens expire after 1 hour
- **Secure Reset**: Passwords are hashed using bcrypt before storage
- **Session Invalidation**: All refresh tokens are revoked after password reset for security

## API Endpoints

### 1. Request Password Reset
**Endpoint:** `POST /api/users/forgot-password`

**Description:** Initiates password reset by sending an email with reset link

**Rate Limited:** Yes (5 requests per 15 minutes per IP)

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "error": "Email is required"
}
```

**Security Notes:**
- Returns generic message regardless of whether email exists (prevents user enumeration)
- If email sending fails, reset token is cleared from database
- Only one active reset token per user

### 2. Reset Password with Token
**Endpoint:** `POST /api/users/reset-password/:token`

**Description:** Reset password using the token from the email

**Request Parameters:**
- `token` (path param): The password reset token from the email link

**Request Body:**
```json
{
  "newPassword": "NewSecurePassword123!"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Password reset successfully. You have been logged out from all devices. Please log in with your new password."
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "error": "Invalid or expired password reset token"
}
```

**Response (Error - 422):**
```json
{
  "success": false,
  "error": "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"
}
```

## Password Requirements
Passwords must meet the following criteria:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (@$!%*?&)

Example valid passwords:
- `SecurePass123!`
- `MyP@ssw0rd`
- `Complex#Pass99`

## Database Schema

### New User Model Fields
```javascript
passwordResetToken: {
    type: String,
    // Hashed token stored in database
},
passwordResetExpires: {
    type: Date,
    // Token expiration time (1 hour from generation)
}
```

### Token Generation
- Token: 32 random bytes converted to hex string
- Storage: SHA256 hash of token is stored in database
- Expiration: 1 hour from generation

## User Flow Diagram

```
User                    Server                    Email
 |                        |                        |
 |---Forgot Password------>|                        |
 |                        |--Check Email Exists----->
 |                        |<-----Result-------------|
 |                        |                        |
 |                        |--Generate Token--------|
 |                        |--Hash & Store Token----|
 |                        |                        |
 |                        |--Send Reset Email----->|
 |                        |                        |---Email User--->|
 |                        |                        |                 |
 |<---Confirmation--------|                        |                 |
 |                        |                        |                 |
 |<--Reset Email + Token--|<---Email Sent---------|                 |
 |                        |                        |                 |
 |---Click Reset Link------->|                     |                 |
 |---Enter New Password--->| |                     |                 |
 |---Submit Form---------->| |                     |                 |
 |                        |--Verify Token---------|
 |                        |--Hash New Password----|
 |                        |--Update Password------|
 |                        |--Revoke All Tokens----|
 |                        |                        |
 |<---Success Message-----|                        |
 |                        |                        |
 |---Login with New Pass-->|                        |
 |<---New Tokens----------|                        |
```

## Example Usage

### 1. Request Password Reset
```bash
curl -X POST http://localhost:3000/api/users/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

### 2. Check Console/Email for Reset Token
The reset token will appear in:
- Email (production)
- Server console (development without email config)
- URL format: `http://localhost:3000/api/users/reset-password/{TOKEN}`

### 3. Reset Password
```bash
curl -X POST http://localhost:3000/api/users/reset-password/YOUR_TOKEN_HERE \
  -H "Content-Type: application/json" \
  -d '{"newPassword":"NewPassword123!"}'
```

### 4. Login with New Password
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"NewPassword123!"}'
```

## Security Considerations

1. **Token Security**
   - Tokens are hashed before storage
   - Only plain token is sent in email
   - Tokens expire after 1 hour
   - Each reset request generates a new token (old token invalidated)

2. **Password Security**
   - Passwords are hashed with bcrypt (10 salt rounds)
   - Password requirements enforced
   - Clear password validation

3. **Session Security**
   - All refresh tokens are revoked after password reset
   - User is effectively logged out from all devices
   - User must login again with new password

4. **Email Security**
   - Generic response message (prevents user enumeration)
   - Email not sent if reset token fails to generate
   - Reset tokens cleared if email sending fails

5. **Rate Limiting**
   - Forgot password endpoint is rate limited
   - 5 attempts per 15 minutes per IP address
   - Prevents brute force attacks

## Testing

### Test Script
Run the included test script to verify the flow:
```bash
node test-password-reset.js
```

The test will:
1. Register a test user
2. Request a password reset
3. Display the reset token from server console
4. Show how to use the reset endpoint

## Email Configuration

Password reset emails are sent using the following environment variables:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@code-craft-hub.com
BASE_URL=http://localhost:3000
```

### Development Mode
If email is not configured, reset links are logged to the console for testing.

## Error Handling

### Invalid Token Errors
- Token doesn't exist → Generic error message
- Token expired → Generic error message
- Token mismatched → Generic error message

### Password Validation Errors
- Too short → Specific validation error
- Missing requirements → Specific validation error

### User Not Found
- After token validation → Should not occur (token ensures user exists)

## Related Features
- [Email Verification Flow](./email-verification.md)
- [Authentication & JWT](./authentication.md)
- [Refresh Tokens](./refresh-tokens.md)

## Troubleshooting

### Password Reset Email Not Received
- Check email configuration in `.env`
- Check spam/junk folder
- Verify `BASE_URL` environment variable is correct
- Check server logs for email sending errors

### Token Expired Before Reset
- Tokens expire after 1 hour
- Request a new password reset
- Check if system time is correct

### Still Logged In After Reset
- New refresh tokens are issued on login
- Old tokens are revoked but still stored
- Clear local storage/cookies of old tokens

## Future Enhancements
- [ ] SMS-based password reset
- [ ] Backup codes for account recovery
- [ ] Password reset history/audit logs
- [ ] Temporary password generation option
- [ ] Multi-step verification process
