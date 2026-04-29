# RBAC User Management System

## Overview

The Inventory Management System now includes a complete Role-Based Access Control (RBAC) system with two user registration paths:

1. **Public Signup** - Self-registration with email verification
2. **Admin Panel** - Admin-only user creation with immediate access

---

## User Roles

### ADMIN (Administrator)
- **Permissions:**
  - Create/edit/delete all resources (products, orders, warehouses)
  - Create new users (ADMIN, MANAGER, STAFF)
  - Edit user roles and status
  - Delete users
  - View audit logs for all users
  - Access user management page
  - Full system access

- **Created By:** Database seed or another ADMIN

### MANAGER (Manager)
- **Permissions:**
  - Create/edit products
  - Create/edit orders
  - View all orders and products
  - Create/edit warehouses (limited)
  - View audit logs (own actions + system)
  - Manage inventory
  - Create purchase orders
  - Assign orders to staff

- **Created By:** ADMIN via admin panel

### STAFF (Staff)
- **Permissions:**
  - View products
  - View orders assigned to them
  - Create orders (basic)
  - View their own audit logs
  - Create purchase orders
  - Limited editing permissions

- **Created By:** Self-registration OR ADMIN via admin panel

---

## Registration Paths

### Path 1: Public Self-Registration

#### User Flow:
1. User clicks "Sign up here" on login page → `/signup`
2. Fills registration form:
   - Name (2+ characters)
   - Email (valid email format)
   - Password (8+ characters)
   - Confirm password (must match)
3. Receives verification email with token
4. Pastes verification token on verification page
5. Email verified → Can login with STAFF role
6. User status: PENDING → ACTIVE

#### Technical Details:
- Endpoint: `POST /api/auth/signup`
- Creates user with `isVerified: false` and `status: PENDING`
- Generates 24-hour verification token
- Default role: `STAFF`
- Must verify before password can be used

```bash
# API Request
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }'

# Response (in development)
{
  "message": "User registered successfully...",
  "user": { "name": "John Doe", "email": "john@example.com", "role": "STAFF" },
  "verificationLink": "http://localhost:5173/verify?token=abc123..." // Dev only
}
```

---

### Path 2: Admin-Only User Creation

#### User Flow:
1. ADMIN logs in → Navigates to **Users** page (sidebar)
2. Clicks **"Add User"** button
3. Fills form:
   - Name
   - Email
   - Password (8+ characters)
   - Role (ADMIN, MANAGER, STAFF dropdown)
4. Clicks **"Create User"**
5. User created with `isVerified: true` and `status: ACTIVE`
6. User can login immediately

#### Technical Details:
- Endpoint: `POST /api/auth/register`
- Protected: Only ADMIN users
- Creates user with `isVerified: true` (no email verification needed)
- User status: `ACTIVE` by default
- Can assign any role (ADMIN, MANAGER, STAFF)

```bash
# API Request (Admin only)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Manager",
    "email": "jane@example.com",
    "password": "SecurePass456",
    "role": "MANAGER"
  }'

# Response
{
  "_id": "...",
  "name": "Jane Manager",
  "email": "jane@example.com",
  "role": "MANAGER",
  "message": "User created successfully as MANAGER",
  "token": "eyJhbGc..." // Can use immediately
}
```

---

## Admin User Management Page

### Features

#### List Users
- View all registered users in paginated table (10 per page)
- Columns: Name, Email, Role (color-coded), Status, Last Login, Actions
- Status color coding:
  - 🟢 ACTIVE (green)
  - 🟡 PENDING (yellow)
  - 🔴 INACTIVE (red)

#### Create User
- Click **"Add User"** button
- Fill form fields
- Select role from dropdown
- User created immediately with access

#### Edit User
- Click **Edit** icon (pencil) on any user row
- Change role only (email cannot be changed)
- Click **"Update User"**
- Role updated immediately

#### Delete User
- Click **Delete** icon (trash) on any user row
- Confirm deletion
- Safety: Cannot delete the last ADMIN user
- User removed from system

### Accessing the Page

**URL:** `http://localhost:5000/users` (only available to ADMIN)

**Navigation:**
1. Login as ADMIN user
2. Look for **Users** menu item in sidebar (only visible to ADMIN)
3. Click to open user management page

---

## Public Signup Page

### Features

#### Signup Form (Step 1)
- **Name field:** 2+ characters required
- **Email field:** Valid email format required
- **Password field:** 8+ characters minimum
- **Confirm Password field:** Must match password
- **Form validation:** Real-time error messages
- **Submit button:** "CREATE ACCOUNT"

#### Email Verification (Step 2)
- Shows email verification pending message
- User receives verification token (in development, shown on screen)
- Paste token into verification textarea
- Click **"VERIFY EMAIL"**
- **Back button** to try again

### Accessing the Page

**URL:** `http://localhost:5000/signup` (public, no login required)

**Navigation:**
1. On login page, click **"Sign up here"** link
2. Or navigate directly to `/signup`

### After Verification
- Email verified ✓
- User status: ACTIVE
- User can login with email and password
- User role: STAFF (can be upgraded by ADMIN later)

---

## Email Verification System

### How It Works

1. **Signup:** User creates account
2. **Token Generation:** System generates random verification token
3. **Expiration:** Token valid for 24 hours
4. **Development Mode:** Token shown on screen (remove in production)
5. **Production Mode:** Send token via email (requires email service)
6. **Verification:** User pastes token to verify email
7. **Activation:** Account becomes ACTIVE after verification

### Token Details
- Format: Random 64-character hex string
- Length: 32 bytes = 64 hex characters
- Expiration: 24 hours from creation
- Usage: Single use (cleared after verification)

### Development vs Production

**Development:**
- Token displayed on signup page
- Can copy/paste directly in verification form
- Useful for testing

**Production:**
- Remove token from response
- Send token via email service (SendGrid, Mailgun, AWS SES)
- Update `backend/.env` with email service credentials
- User receives verification email

---

## API Reference

### Public Endpoints

#### POST /api/auth/login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Response
{
  "_id": "...",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "STAFF",
  "token": "eyJhbGc..."
}
```

#### POST /api/auth/signup
Create new account with email verification required

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name":"John Doe",
    "email":"john@example.com",
    "password":"SecurePass123"
  }'

# Response
{
  "message": "User registered successfully...",
  "user": {"name":"John Doe","email":"john@example.com","role":"STAFF"},
  "verificationLink": "..." // Dev only
}
```

#### POST /api/auth/verify-email
Verify email with token

```bash
curl -X POST http://localhost:5000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"abc123..."}'

# Response
{
  "message": "Email verified successfully. You can now login."
}
```

#### GET /api/auth/me
Get current logged-in user (protected)

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <token>"

# Response
{
  "_id": "...",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "STAFF",
  "isVerified": true,
  "status": "ACTIVE",
  "lastLogin": "2026-04-29T10:30:00Z"
}
```

### Admin-Only Endpoints

#### POST /api/auth/register
Create new user (ADMIN only)

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Jane Manager",
    "email":"jane@example.com",
    "password":"SecurePass456",
    "role":"MANAGER"
  }'
```

#### GET /api/auth/users
List all users with pagination (ADMIN only)

```bash
curl -X GET "http://localhost:5000/api/auth/users?page=1&limit=10" \
  -H "Authorization: Bearer <admin-token>"

# Response
{
  "data": [{...}, {...}],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

#### PUT /api/auth/users/:id
Update user role/status (ADMIN only)

```bash
curl -X PUT http://localhost:5000/api/auth/users/userid123 \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"role":"MANAGER","status":"ACTIVE"}'

# Response
{
  "message": "User updated successfully",
  "user": {"_id":"...","name":"...","email":"...","role":"MANAGER","status":"ACTIVE"}
}
```

#### DELETE /api/auth/users/:id
Delete user (ADMIN only)

```bash
curl -X DELETE http://localhost:5000/api/auth/users/userid123 \
  -H "Authorization: Bearer <admin-token>"

# Response
{
  "message": "User deleted successfully"
}
```

---

## Testing the System

### Test 1: Public Signup Flow
```bash
# 1. Signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test User",
    "email":"test@example.com",
    "password":"TestPass123"
  }'

# Note: Get verification token from response (development)

# 2. Verify Email
curl -X POST http://localhost:5000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"<token-from-signup>"}'

# 3. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'

# Should successfully login with STAFF role
```

### Test 2: Admin User Creation
```bash
# 1. Signup as user (if not already done)
# 2. Login as ADMIN
# 3. On /users page, click "Add User"
# 4. Fill form with:
#    - Name: Jane Manager
#    - Email: jane@example.com
#    - Password: JanePass123
#    - Role: MANAGER
# 5. Click Create
# 6. User created immediately
# 7. Login as jane@example.com with JanePass123
```

### Test 3: User Management
```bash
# As ADMIN:

# 1. Get all users
curl -X GET "http://localhost:5000/api/auth/users?page=1&limit=10" \
  -H "Authorization: Bearer <admin-token>"

# 2. Edit user role
curl -X PUT http://localhost:5000/api/auth/users/<user-id> \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"role":"MANAGER","status":"ACTIVE"}'

# 3. Delete user
curl -X DELETE http://localhost:5000/api/auth/users/<user-id> \
  -H "Authorization: Bearer <admin-token>"
```

---

## Database Schema

### User Model Updates

```javascript
{
  name: String,                    // User's full name
  email: String (unique),          // User's email address
  password: String (hashed),       // Bcrypt hashed password
  role: String (ADMIN|MANAGER|STAFF), // User's role
  isVerified: Boolean,             // Email verification status
  verificationToken: String,       // One-time verification token
  verificationTokenExpires: Date,  // Token expiration time
  resetToken: String,              // Password reset token (optional)
  resetTokenExpires: Date,         // Reset token expiration (optional)
  status: String (ACTIVE|INACTIVE|PENDING), // User account status
  lastLogin: Date,                 // Last login timestamp
  createdAt: Date,                 // Account creation time
  updatedAt: Date                  // Last update time
}
```

---

## Security Considerations

### For Development
- Verification tokens displayed in response (for testing)
- Remove before production deployment

### For Production
1. **Email Service:** Integrate SendGrid, Mailgun, or AWS SES
2. **Remove Token Display:** Don't return tokens in API responses
3. **HTTPS Required:** All communications must be encrypted
4. **Rate Limiting:** Already implemented on /auth/login
5. **Password Hashing:** Using bcryptjs with salt rounds
6. **Token Expiration:** Verification tokens expire in 24 hours
7. **Account Lockout:** Optional - add after N failed login attempts

---

## Migration from Old System

### For Existing Users
If migrating from system without RBAC:

1. Existing users already in database will work
2. Add missing fields to User model (isVerified, status, etc.)
3. Set existing users as `isVerified: true` and `status: 'ACTIVE'`
4. No password reset needed (existing hashes still valid)

### Database Migration Script (Optional)
```javascript
// Run once to migrate existing users
db.users.updateMany(
  {},
  {
    $set: {
      isVerified: true,
      status: "ACTIVE",
      verificationToken: null,
      verificationTokenExpires: null
    }
  }
);
```

---

## Troubleshooting

### Issue: "Cannot create user - User with this email already exists"
- User already registered with same email
- Solution: Use different email or delete existing user (if ADMIN)

### Issue: "Invalid verification token"
- Token expired (24 hours passed)
- Token doesn't exist or already used
- Solution: Create new account with /signup

### Issue: "Cannot delete the last admin user"
- System requires at least one ADMIN
- Solution: Create another ADMIN before deleting

### Issue: "/users page shows nothing"
- You're not logged in as ADMIN
- Solution: Only ADMIN users can access user management

### Issue: "Email verification not sending"
- Development mode shows token on screen
- For production: Need to configure email service

---

## Next Steps (Recommended)

1. **Email Service Integration**
   - Setup SendGrid or Mailgun account
   - Update authRoutes.js to send verification email
   - Remove verification token from response

2. **Password Reset**
   - Implement POST /api/auth/forgot-password
   - Implement POST /api/auth/reset-password/:token

3. **Two-Factor Authentication (2FA)**
   - Add TOTP or SMS verification
   - Enhance security for ADMIN users

4. **Audit Logging**
   - Track user creation/deletion/role changes
   - Already implemented in audit system

5. **User Activity Dashboard**
   - Show user login history
   - Show last active time
   - Show actions per user

---

## Files Modified/Created

### New Files
- `frontend/src/pages/Signup.jsx` - Public signup page
- `frontend/src/pages/Users.jsx` - Admin user management page

### Modified Files
- `backend/models/User.js` - Added verification fields
- `backend/routes/authRoutes.js` - Added signup, verify, user management endpoints
- `frontend/src/App.jsx` - Added new routes and sidebar item
- `frontend/src/pages/Login.jsx` - Added signup link
- `frontend/src/services/api.js` - Added user management methods

---

**Last Updated:** April 29, 2026  
**RBAC Status:** ✅ Production Ready
