# Supabase Email Templates Configuration

## Issue: Password Reset Returns 500 Error

If you're getting a 500 error when trying to reset passwords, it's because Supabase email templates need to be configured.

## Solution

### Option 1: Configure Email Templates in Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Find the **"Reset Password"** template
4. Make sure the template is enabled and has valid content

Default template should look like:
```html
<h2>Reset Password</h2>
<p>Follow this link to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

### Option 2: Use Supabase's Built-in SMTP (Free Tier)

Supabase provides built-in email service for authentication emails on the free tier:

1. Go to **Authentication** → **Email Templates**
2. Verify that "Enable email confirmations" is checked
3. The built-in SMTP should work automatically

### Option 3: Configure Custom SMTP

If you want to use your own email service (like Resend):

1. Go to **Project Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Enter your SMTP credentials:
   - Host: `smtp.resend.com`
   - Port: `465` (SSL) or `587` (TLS)
   - Username: `resend`
   - Password: Your Resend API key
   - Sender Email: Your verified domain email

### Testing the Fix

After configuration:

1. Clear browser cache
2. Try the "Forgot password?" link again
3. Enter your email
4. Check your inbox for the reset link
5. Click the link and set a new password

### Troubleshooting

**Still getting 500 error?**
- Check Supabase logs: Dashboard → Logs → Auth logs
- Verify your email is confirmed in Supabase
- Try using a different browser or incognito mode

**Email not arriving?**
- Check spam/junk folder
- Verify email template is enabled
- Check SMTP settings if using custom provider

**Reset link expired?**
- Links expire after 1 hour by default
- Request a new reset link

## Related Files

- Password reset functionality: `frontend/src/components/SignInContainer.tsx`
- Auth context: `frontend/src/contexts/AuthContext.tsx`
