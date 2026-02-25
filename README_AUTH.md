# Authentication System Documentation

## Overview
The application uses PostgreSQL with JWT-based authentication. All user authentication is handled through a custom Express backend with secure password hashing using bcrypt.

## Features

### Backend (Express + PostgreSQL)
- **JWT Authentication**: Token-based authentication with 7-day expiry
- **Password Hashing**: Secure password storage using bcrypt (10 rounds)
- **User Profiles Table**: PostgreSQL table for user data
- **RESTful API**: Clean REST endpoints for all auth operations

### Frontend Integration
- **AuthContext**: React context managing authentication state
- **API Client**: Axios-like client with automatic token management
- **Protected Routes**: Automatic redirect for unauthenticated users
- **Profile Modal**: Display user information from authenticated session

## Database Schema

### user_profiles table
```sql
- id (uuid, primary key)
- email (text, unique)
- password_hash (text)
- full_name (text, optional)
- avatar_url (text, optional)
- bio (text, optional)
- created_at (timestamptz)
- updated_at (timestamptz)
```

## API Endpoints

### POST /api/auth/register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "token": "jwt_token_here"
}
```

### POST /api/auth/login
Login with existing credentials.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "token": "jwt_token_here"
}
```

### GET /api/auth/me
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "avatar_url": "https://...",
    "bio": "...",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### PUT /api/auth/profile
Update user profile (requires authentication).

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Request:**
```json
{
  "full_name": "John Doe",
  "avatar_url": "https://...",
  "bio": "Software developer"
}
```

### POST /api/auth/logout
Logout current user (requires authentication).

**Headers:**
```
Authorization: Bearer jwt_token_here
```

## Frontend Usage

### Sign Up
```typescript
const { signUp } = useAuth();
await signUp('user@example.com', 'password123');
```

### Sign In
```typescript
const { signIn } = useAuth();
await signIn('user@example.com', 'password123');
```

### Sign Out
```typescript
const { signOut } = useAuth();
await signOut();
```

### Get Current User
```typescript
const { user } = useAuth();
console.log(user?.email, user?.id);
```

## Security Features

1. **Password Hashing**: bcrypt with 10 salt rounds
2. **JWT Tokens**: Secure tokens with 7-day expiry
3. **Token Storage**: Tokens stored in localStorage (can be upgraded to httpOnly cookies)
4. **Password Validation**: Minimum 6 characters required
5. **CORS Protection**: Configurable CORS origins
6. **SQL Injection Prevention**: Parameterized queries with pg library

## Environment Variables

### Backend (.env in /backend)
```env
PORT=3001
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env in root)
```env
VITE_API_URL=http://localhost:3001/api
```

## Setup Instructions

### 1. Database Setup
Ensure PostgreSQL is running and create the database:
```bash
createdb your_database_name
```

### 2. Run Migrations
The user_profiles table should already exist from previous migrations.

### 3. Configure Environment
Copy and configure environment files:
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your DATABASE_URL and JWT_SECRET

# Frontend
cp .env.example .env
# Edit .env with your API URL
```

### 4. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ..
npm install
```

### 5. Start Servers
```bash
# Backend (in /backend)
npm run dev

# Frontend (in root)
npm run dev
```

## Testing

To test authentication:
1. Start both backend and frontend servers
2. Navigate to `/register`
3. Create a new account
4. Log out and log back in with credentials
5. Check profile modal for user information
6. Verify protected routes redirect when logged out

## Token Management

Tokens are stored in localStorage with key `auth_token`. The API client automatically:
- Adds the token to Authorization header for authenticated requests
- Removes the token on logout
- Handles token expiry (401/403 responses)

## Error Handling

Common error responses:
- `400`: Invalid request (missing fields, validation errors)
- `401`: Invalid credentials or missing token
- `403`: Invalid or expired token
- `404`: User not found
- `500`: Server error

## Security Best Practices

1. **Change JWT_SECRET**: Use a strong, random secret in production
2. **Use HTTPS**: Always use HTTPS in production
3. **Secure Token Storage**: Consider using httpOnly cookies instead of localStorage
4. **Password Requirements**: Enforce strong password policies
5. **Rate Limiting**: Add rate limiting to prevent brute force attacks
6. **Input Validation**: Validate and sanitize all inputs
7. **SQL Injection**: Always use parameterized queries

## Future Enhancements

Possible improvements:
- Password reset functionality
- Email verification
- Refresh token rotation
- Two-factor authentication (2FA)
- OAuth social login (Google, GitHub)
- Password strength requirements
- Account lockout after failed attempts
- Session management
- Token blacklist for logout
