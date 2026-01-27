# Resend Email Setup - IMPORTANT

## Current Status: Testing Mode ⚠️

Your Resend API key (`re_U6XduPSC_8SDVYLkVr8bUHc4VcWUZjTvR`) is in **testing mode**.

### Testing Mode Limitations:
- ✅ Can send emails to: `cgcdarts@gmail.com` (your verified account email)
- ❌ Cannot send to other emails like: `dow1800@gmail.com`

### Error Message You'll See:
```
403 Forbidden: "You can only send testing emails to your own email address (cgcdarts@gmail.com). 
To send emails to other recipients, please verify a domain at resend.com/domains"
```

---

## Solution: Verify a Domain (For Production)

To send emails to any recipient, you need to verify a domain:

### Steps:
1. Go to: https://resend.com/domains
2. Click **"Add Domain"**
3. Enter your domain (e.g., `cgctournament.com` or any domain you own)
4. Add the DNS records shown (TXT, MX, etc.) to your domain's DNS settings
5. Wait for verification (usually 5-15 minutes)
6. Update sender in code from `onboarding@resend.dev` to `noreply@yourdomain.com`

### After Domain Verification:
Replace all instances of:
```typescript
from: 'CGC Tournament <onboarding@resend.dev>'
```

With:
```typescript
from: 'CGC Tournament <noreply@yourdomain.com>'
```

Files to update:
- `backend/email-server.js` (line 48)
- `supabase/functions/send-email/index.ts` (line 32)

---

## Alternative: Use a Free Email Service

If you don't have a domain, you can use:
- **EmailJS** (Free tier: 200 emails/month, no domain required)
- **SendGrid** (Free tier: 100 emails/day, requires sign-up verification)
- **Mailgun** (Free tier: 5,000 emails/month for 3 months)

---

## Current Configuration

### Local Development (localhost):
- Server: `http://localhost:3001/api/send-email`
- Sender: `CGC Tournament <onboarding@resend.dev>`
- Recipient: Must be `cgcdarts@gmail.com` until domain verified

### Production (GitHub Pages):
- Server: Supabase Edge Function
- Sender: `CGC Tournament <onboarding@resend.dev>`
- Recipient: Must be `cgcdarts@gmail.com` until domain verified

---

## Testing Right Now

✅ **Test email sent successfully!**
- Email ID: `aed19ccd-9511-4c4a-b386-0dd51981d678`
- To: `cgcdarts@gmail.com`
- Check your inbox!

### To Test in the App:
1. Register a player with email: `cgcdarts@gmail.com`
2. You should receive a registration confirmation email
3. Start group stage → you should receive group assignment email

---

## Rate Limits
- Free tier: **100 emails/day**, **3,000 emails/month**
- Current usage: 0/3,000 this month
- Rate limit: 2 emails per second

---

## Next Steps
1. ✅ Test with `cgcdarts@gmail.com` to verify system works
2. ⏳ Verify a domain if you want to send to any email address
3. ⏳ Deploy Supabase Edge Function for production
4. ⏳ Update frontend to handle email restrictions gracefully
