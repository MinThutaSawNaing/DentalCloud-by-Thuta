# Authentication & User Management Setup

This guide will help you set up authentication and user management for your Dental Management System.

## Prerequisites

1. Supabase project with database access
2. SQL Editor access in Supabase Dashboard

## Setup Steps

### 1. Create Users Table

Run the SQL script in `database/users_table.sql` in your Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `database/users_table.sql`
4. Execute the script

This will create:
- `users` table with username, password, role fields
- Indexes for performance
- Automatic timestamp updates
- Row Level Security (RLS) policies

### 2. Default Admin Credentials

The system automatically creates a default admin user on first load:
- **Username:** `admin`
- **Password:** `admin123`

**⚠️ Important:** Change the default admin password after first login for security!

### 3. User Roles

The system supports two user roles:

- **Admin:** Full access to all features including user management
- **Normal:** Standard access without user management capabilities

### 4. Features

#### Authentication
- Username and password login
- Number-based CAPTCHA (simple addition)
- Session management (24-hour sessions)
- Automatic logout on session expiry

#### User Management (Admin Only)
- Create new users
- Edit existing users (username, password, role)
- Delete users
- View all users with role badges

### 5. Security Notes

**Current Implementation:**
- Passwords are stored in plain text (for simplicity)
- Session stored in localStorage
- CAPTCHA is client-side only

**For Production:**
- Implement password hashing (bcrypt, argon2, etc.)
- Use secure session tokens (JWT)
- Implement server-side CAPTCHA validation
- Add rate limiting for login attempts
- Use HTTPS only
- Implement proper RLS policies in Supabase

### 6. Usage

1. **Login:**
   - Navigate to the app
   - Enter username and password
   - Solve the CAPTCHA (addition of two numbers)
   - Click "Sign In"

2. **User Management (Admin):**
   - Click on "Users" in the sidebar (only visible to admins)
   - Click "Add User" to create new users
   - Click edit icon to modify users
   - Click delete icon to remove users

3. **Logout:**
   - Click "Logout" button in the sidebar footer

### 7. Troubleshooting

**Issue: "Users table doesn't exist"**
- Solution: Run the SQL script from `database/users_table.sql`

**Issue: "Default admin not created"**
- Solution: The admin is created automatically on first app load. If it fails, check:
  - Users table exists
  - RLS policies allow inserts
  - Supabase connection is working

**Issue: "Cannot login"**
- Check username and password are correct
- Verify CAPTCHA answer is correct
- Check browser console for errors
- Verify Supabase connection

### 8. Database Schema

```sql
users
├── id (UUID, Primary Key)
├── username (VARCHAR, Unique, Not Null)
├── password (VARCHAR, Not Null)
├── role (VARCHAR, 'admin' | 'normal')
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

## Next Steps

After setup:
1. Login with default admin credentials
2. Create additional admin/normal users as needed
3. Change default admin password
4. Test user management features

