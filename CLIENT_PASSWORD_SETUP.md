# Client Portal Password Setup Flow

## Overview

This document describes the client invitation and password setup flow for the BillSense client portal.

## User Flow

### 1. Freelancer Invites Client

1. Freelancer navigates to **Clients** page
2. Clicks **"Invite to Portal"** button for a client
3. System sends invitation email to client's email address

### 2. Client Receives Invitation Email

**Email Subject**: "Welcome to Your Client Portal"

**Email Content**:
- Welcome message
- Clear instructions to set up password
- Call-to-action button: "Set Up Your Password"
- Fallback link for email clients that don't support buttons
- Security notice (link expires in 24 hours)

### 3. Client Clicks Invitation Link

- Client is redirected to: `https://billsense.netlify.app/client/setup-password`
- Supabase authenticates the user via the invitation token
- Session is established automatically

### 4. Client Sets Password

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**Features**:
- Real-time password strength indicator
- Visual checklist showing which requirements are met
- Password visibility toggle
- Confirm password field with validation

### 5. Success & Redirect

- Password is saved to Supabase Auth
- Success message is displayed
- Client is automatically redirected to `/client/dashboard`
- Client can now sign in with their email and password

---

## Technical Implementation

### Components

#### `ClientPasswordSetup.tsx`
Location: `src/components/ClientPortal/ClientPasswordSetup.tsx`

**Key Features**:
- Session detection and validation
- Password strength calculation (0-4 score)
- Real-time validation feedback
- Error handling for expired/invalid links
- Loading and success states
- Responsive design

**State Management**:
```typescript
- showPassword: boolean
- showConfirmPassword: boolean
- loading: boolean
- error: string
- success: boolean
- checkingSession: boolean
- hasSession: boolean
```

**Password Strength Algorithm**:
- +1 point for length >= 8
- +1 point for length >= 12
- +1 point for mixed case (upper + lower)
- +1 point for numbers
- +1 point for special characters
- Maximum score: 4 (Strong)

### Routing

**Route**: `/client/setup-password`
**Type**: Public (no authentication required)
**Component**: `ClientPasswordSetup`

Added in `App.tsx`:
```typescript
<Route path="/client/setup-password" element={<ClientPasswordSetup />} />
```

### Edge Function

**Function**: `invite-client-user`
**Location**: `supabase/functions/invite-client-user/index.ts`

**Changes Made**:

1. **Brevo Email Flow** (Custom Email Provider):
   ```typescript
   redirectTo: `${req.headers.get('origin') || Deno.env.get('SITE_URL')}/client/setup-password`
   ```

2. **Default Supabase Email**:
   ```typescript
   await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
     redirectTo: `${origin}/client/setup-password`,
     data: { invited_for_client: client_id }
   })
   ```

3. **Enhanced Email Template**:
   - Professional HTML styling
   - Clear call-to-action button
   - Better instructions
   - Security notices

---

## Configuration Required

### Supabase Dashboard Setup

**IMPORTANT**: You must configure Supabase to allow the new redirect URL.

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Under **Redirect URLs**, add:
   - `https://billsense.netlify.app/client/setup-password`
   - `http://localhost:5173/client/setup-password` (for development)
5. Click **Save**

**Without this configuration, invitation links will fail to redirect properly.**

### Environment Variables

No new environment variables are required. The edge function uses:
- `SUPABASE_URL` (existing)
- `SUPABASE_SERVICE_ROLE_KEY` (existing)
- `SITE_URL` (optional fallback)

---

## Error Handling

### Scenarios Handled

1. **No Active Session**
   - **Cause**: User accessed page directly without invitation link
   - **Handling**: Show error message with link to sign-in page
   - **Message**: "No active invitation found. Please check your email and click the invitation link."

2. **Expired Invitation Link**
   - **Cause**: Link was clicked after 24-hour expiration
   - **Handling**: Show error message suggesting to request new invitation
   - **Message**: "Your invitation link has expired. Please request a new invitation."

3. **Session Check Error**
   - **Cause**: Network issue or Supabase error
   - **Handling**: Show generic error with retry suggestion
   - **Message**: "Unable to verify your invitation. Please try clicking the invitation link again."

4. **Password Mismatch**
   - **Cause**: Password and confirm password don't match
   - **Handling**: Show inline error message
   - **Message**: "Passwords do not match"

5. **Weak Password**
   - **Cause**: Password doesn't meet requirements
   - **Handling**: Show specific requirement that failed
   - **Messages**: 
     - "Password must be at least 8 characters long"
     - "Password must contain at least one uppercase letter"
     - "Password must contain at least one lowercase letter"
     - "Password must contain at least one number"

6. **Update Failed**
   - **Cause**: Supabase API error
   - **Handling**: Show error message with retry option
   - **Message**: "Failed to set password. Please try again."

---

## Testing

### Manual Test Cases

#### Test 1: New Client Invitation
1. Create a new client in the system
2. Click "Invite to Portal"
3. Check email inbox for invitation
4. Click invitation link
5. Verify redirect to `/client/setup-password`
6. Enter valid password (meets all requirements)
7. Confirm password
8. Click "Set Password & Continue"
9. Verify success message
10. Verify redirect to `/client/dashboard`
11. Sign out
12. Sign in with email and new password
13. Verify successful login

**Expected Result**: ✅ All steps complete successfully

#### Test 2: Password Strength Indicator
1. Navigate to password setup page (with valid session)
2. Type password: "abc" → Strength: Weak (red)
3. Type password: "abcdefgh" → Strength: Fair (orange)
4. Type password: "Abcdefgh" → Strength: Good (yellow)
5. Type password: "Abcdefgh1" → Strength: Strong (green)

**Expected Result**: ✅ Strength indicator updates correctly

#### Test 3: Password Validation
1. Try password: "abc" → Error: "Password must be at least 8 characters long"
2. Try password: "abcdefgh" → Error: "Password must contain at least one uppercase letter"
3. Try password: "ABCDEFGH" → Error: "Password must contain at least one lowercase letter"
4. Try password: "Abcdefgh" → Error: "Password must contain at least one number"
5. Try password: "Abcdefgh1" → ✅ Valid

**Expected Result**: ✅ Validation messages appear correctly

#### Test 4: Expired/Invalid Link
1. Access `/client/setup-password` without invitation link
2. Verify error message appears
3. Verify "Go to Sign In" button works

**Expected Result**: ✅ Error handled gracefully

#### Test 5: Resend Invitation
1. For client who was already invited, click "Resend Invite"
2. Check email for new invitation
3. Click new link
4. Verify password setup works
5. Verify no duplicate accounts created

**Expected Result**: ✅ Resend works without issues

#### Test 6: Existing User
1. Invite a client who already has an account
2. Verify system handles gracefully
3. Verify they can still set/reset password

**Expected Result**: ✅ No errors, password can be updated

---

## Security Considerations

### Implemented Security Measures

1. **Invitation Link Expiration**
   - Links expire after 24 hours
   - Prevents unauthorized access to old links

2. **Password Requirements**
   - Enforced minimum complexity
   - Prevents weak passwords

3. **Session Validation**
   - Page checks for valid Supabase session
   - Prevents unauthorized access

4. **HTTPS Only**
   - All production traffic uses HTTPS
   - Prevents man-in-the-middle attacks

5. **Email Verification**
   - Invitation sent to verified email
   - Ensures correct recipient

### Best Practices

1. **Never share invitation links**
   - Links are single-use and time-limited
   - Sharing compromises security

2. **Use strong passwords**
   - Follow all password requirements
   - Consider using a password manager

3. **Keep email secure**
   - Invitation link grants account access
   - Protect email account with 2FA

---

## Troubleshooting

### Issue: "No active invitation found"

**Cause**: Accessed page without clicking invitation link

**Solution**: 
1. Check email for invitation
2. Click the "Set Up Your Password" button
3. If email not received, ask service provider to resend

### Issue: "Your invitation link has expired"

**Cause**: Link was clicked after 24 hours

**Solution**:
1. Contact service provider
2. Request new invitation
3. Click new link within 24 hours

### Issue: "Failed to set password"

**Cause**: Network error or Supabase issue

**Solution**:
1. Check internet connection
2. Try again
3. If persists, contact support

### Issue: Invitation email not received

**Possible Causes**:
- Email in spam folder
- Incorrect email address
- Email provider blocking

**Solution**:
1. Check spam/junk folder
2. Verify email address with service provider
3. Add sender to safe senders list
4. Request resend

### Issue: Password setup page shows error immediately

**Cause**: Supabase redirect URLs not configured

**Solution**:
1. Admin must configure Supabase Dashboard
2. Add redirect URLs (see Configuration section)
3. Try invitation link again

---

## Future Enhancements

### Potential Improvements

1. **Email Customization**
   - Company logo in email
   - Custom branding colors
   - Personalized greeting with client name

2. **Password Reset Flow**
   - Dedicated password reset page
   - Self-service password reset

3. **Two-Factor Authentication**
   - Optional 2FA for enhanced security
   - SMS or authenticator app

4. **Welcome Tour**
   - After password setup, show portal tour
   - Highlight key features

5. **Profile Completion**
   - Optional step to add phone, address
   - Improve client data

6. **Notification Preferences**
   - Let clients choose email notifications
   - Invoice alerts, project updates

---

## Support

### For Clients

If you have issues with the invitation or password setup:
1. Check your spam folder for the invitation email
2. Ensure you click the link within 24 hours
3. Contact your service provider for assistance

### For Administrators

If clients report issues:
1. Verify Supabase redirect URLs are configured
2. Check edge function logs for errors
3. Resend invitation if link expired
4. Verify client email address is correct

---

## Changelog

### Version 1.0.0 (2025-11-23)

**Added**:
- `ClientPasswordSetup.tsx` component
- Password strength indicator
- Real-time validation
- Enhanced email templates
- Comprehensive error handling

**Changed**:
- Invitation redirect URL from `/client/dashboard` to `/client/setup-password`
- Email subject and content for better clarity

**Fixed**:
- Issue where clients couldn't set password after invitation
- Missing password setup flow

---

## Related Documentation

- [Client Portal Overview](./CLIENT_PORTAL.md)
- [Authentication Flow](./AUTHENTICATION.md)
- [Supabase Configuration](./SUPABASE_SETUP.md)
- [Email Configuration](./EMAIL_SETUP.md)
