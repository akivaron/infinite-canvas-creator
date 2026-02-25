# Authentication System Documentation

## Overview
The application now uses Supabase authentication with email/password login. All user authentication is handled securely through Supabase's built-in auth system.

## Features

### Backend (Supabase)
- **Auth System**: Built-in Supabase authentication with email/password
- **User Profiles Table**: Automatic profile creation on signup
- **Row Level Security (RLS)**: Secure data access policies
- **Session Management**: Automatic session handling and refresh tokens

### Frontend Integration
- **AuthContext**: React context managing authentication state
- **Supabase Client**: Configured with auto-refresh and session persistence
- **Protected Routes**: Automatic redirect for unauthenticated users
- **Profile Modal**: Display user information from authenticated session

## Database Schema

### user_profiles table
```sql
- id (uuid, references auth.users)
- email (text)
- full_name (text, optional)
- avatar_url (text, optional)
- bio (text, optional)
- created_at (timestamptz)
- updated_at (timestamptz)
```

### RLS Policies
- Users can view their own profile
- Users can update their own profile
- Authenticated users can view other profiles
- Automatic profile creation on user signup

## Usage

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

1. **Password Hashing**: Handled automatically by Supabase
2. **Session Tokens**: Secure JWT tokens with auto-refresh
3. **RLS Policies**: Database-level security for all data access
4. **HTTPS Only**: All authentication requests over secure connections
5. **CORS Protection**: Proper CORS configuration for API requests

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## API Endpoints

All authentication is handled through the Supabase client library:
- Sign up: `supabase.auth.signUp()`
- Sign in: `supabase.auth.signInWithPassword()`
- Sign out: `supabase.auth.signOut()`
- Get user: `supabase.auth.getUser()`
- Get session: `supabase.auth.getSession()`

## Testing

To test authentication:
1. Start the development server
2. Navigate to `/register`
3. Create a new account
4. Log out and log back in with credentials
5. Check profile modal for user information
6. Verify protected routes redirect when logged out

## Migration from localStorage

The old localStorage-based authentication has been replaced with Supabase. Old user data in localStorage is not migrated automatically. Users will need to create new accounts.

## Troubleshooting

### Email confirmation disabled
Email confirmation is disabled by default in Supabase settings. Users can log in immediately after signing up.

### Session not persisting
Check that `persistSession: true` is set in Supabase client configuration.

### CORS errors
Ensure your frontend URL is added to Supabase's allowed origins in project settings.

## Future Enhancements

Potential additions:
- Password reset functionality
- Email verification (optional)
- Social authentication (Google, GitHub, etc.)
- Multi-factor authentication (MFA)
- User profile editing
- Avatar upload
