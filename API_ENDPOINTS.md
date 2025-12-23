# API Endpoints Documentation

Base URL: `http://localhost:5000/api/users`

## Public Endpoints (No Authentication Required)

### 1. Register User
- **POST** `/register`
- **Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "Password123!"
}
```
- **Response:** User data (without password)

### 2. Login User
- **POST** `/login`
- **Body:**
```json
{
  "email": "john@example.com",
  "password": "Password123!"
}
```
- **Response:** JWT token and user data

## Protected Endpoints (Require Authentication)

**Note:** Include token in Authorization header: `Bearer <token>`

### 3. Get Current User Profile
- **GET** `/profile`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Current user's profile data

### 4. Get All Users (Paginated)
- **GET** `/?page=1&limit=10`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `page` (optional, default: 1)
  - `limit` (optional, default: 10)
- **Response:** List of users with pagination info

### 5. Get User By ID
- **GET** `/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** User data for specified ID

### 6. Update User Profile
- **PUT** `/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "username": "new_username",
  "email": "newemail@example.com"
}
```
- **Note:** Users can only update their own profile
- **Response:** Updated user data

### 7. Change Password
- **PATCH** `/password`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```
- **Response:** Success message

### 8. Delete User Account
- **DELETE** `/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Note:** Users can only delete their own account
- **Response:** Success message

## Validation Rules

### Username
- 3-20 characters
- Alphanumeric and underscore only
- Must be unique

### Email
- Valid email format
- Must be unique

### Password
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common Error Codes
- **400** - Validation Error
- **401** - Authentication Error (invalid credentials, token expired, etc.)
- **404** - Resource Not Found
- **409** - Conflict (duplicate username/email)
- **500** - Server Error

## Example Usage

### Using curl

```bash
# Register
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Password123!"}'

# Login
TOKEN=$(curl -s -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}' \
  | jq -r '.data.token')

# Get Profile
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer $TOKEN"

# Update Profile
curl -X PUT http://localhost:5000/api/users/<user_id> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"updated_username"}'
```

## Features

✅ JWT-based authentication
✅ Password hashing with bcrypt
✅ Input validation
✅ Comprehensive error handling
✅ Pagination support
✅ Authorization (users can only modify their own data)
✅ Detailed error messages and logging
