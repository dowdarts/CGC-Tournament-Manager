# Automated Email System

## Overview

The CGC Tournament Manager now includes an automated email notification system that sends two types of emails to registered players:

1. **Registration Confirmation** - Sent immediately when a player registers
2. **Group Assignment** - Sent when the tournament organizer clicks "Start Group Stage"

## Features

### Registration Confirmation Email
Automatically sent when a player completes the registration form (if they provide an email):
- ✅ Confirms their registration
- ✅ Shows event name, date, location, and start time
- ✅ Provides next steps information
- ✅ Professional HTML template with tournament branding

### Group Assignment Email
Automatically sent to all registered players when group stage starts:
- ✅ Shows assigned group (e.g., "Group A", "Group B")
- ✅ Lists board numbers assigned to their group
- ✅ Includes event date and start time
- ✅ Important instructions and tips
- ✅ Eye-catching design optimized for mobile viewing

## Setup Instructions

### 1. Get a Resend API Key

Resend is a modern email service with a generous free tier (3,000 emails/month).

1. **Sign up for Resend**:
   - Go to [https://resend.com](https://resend.com)
   - Create a free account
   - Verify your email address

2. **Create an API key**:
   - Go to [API Keys](https://resend.com/api-keys)
   - Click "Create API Key"
   - Name it "CGC Tournament Manager"
   - Copy the API key (starts with `re_...`)

3. **Add your domain** (optional but recommended):
   - Go to [Domains](https://resend.com/domains)
   - Add and verify your domain
   - Update the `from` field in `EmailService.ts` (line 127)

### 2. Configure Environment Variables

Create a `.env` file in the `frontend` directory:

```bash
# frontend/.env
VITE_RESEND_API_KEY=re_your_api_key_here
```

**Important**: Add `.env` to your `.gitignore` to keep your API key secure:

```bash
# .gitignore
.env
.env.local
```

### 3. Update Sender Email (Optional)

If you verified a custom domain in Resend, update the sender email:

**File**: `frontend/src/services/EmailService.ts` (Line 127)

```typescript
from: 'CGC Tournament <noreply@yourdomain.com>', // Update with your domain
```

If using Resend's sandbox (free tier without domain verification):
```typescript
from: 'CGC Tournament <onboarding@resend.dev>',
```

### 4. Test the System

1. **Start the dev server**:
```bash
cd frontend
npm run dev
```

2. **Test registration confirmation**:
   - Create a test tournament
   - Go to the public registration page
   - Register with your email
   - Check your inbox for confirmation email

3. **Test group assignment**:
   - Add players with emails to tournament
   - Configure groups
   - Assign boards to groups
   - Click "Start Group Stage"
   - All players with emails should receive group assignment

## Email Templates

### Registration Confirmation Template

**Subject**: `Registration Confirmed - [Event Name]`

**Includes**:
- Tournament name
- Date and time
- Location
- Next steps checklist
- Professional gradient header design

### Group Assignment Template

**Subject**: `Group Assignment - [Event Name]`

**Includes**:
- Assigned group name (highlighted)
- Board number(s)
- Event details
- Important instructions
- Warm, encouraging tone

## Configuration Options

### Change Email Refresh/Retry Logic

The system sends emails asynchronously without blocking registration. To customize retry logic, edit `EmailService.ts`:

```typescript
// Add retry logic
static async sendEmailWithRetry(template: EmailTemplate, maxRetries = 3): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const success = await this.sendEmail(template);
    if (success) return true;
    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
  }
  return false;
}
```

### Customize Email Templates

Both email templates are in `EmailService.ts`:

- **Registration**: `getRegistrationConfirmationTemplate()` (Line 151)
- **Group Assignment**: `getGroupAssignmentTemplate()` (Line 245)

You can modify:
- Colors and styling
- Text content
- Logo/branding
- Layout structure

Example color change:
```typescript
// Change gradient colors
background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
```

### Add Custom Email Types

To add new email types (e.g., knockout bracket notification):

1. **Add template method**:
```typescript
private static getKnockoutBracketTemplate(data: KnockoutBracketData): string {
  return `<!-- Your HTML template -->`;
}
```

2. **Add public send method**:
```typescript
static async sendKnockoutBracket(email: string, data: KnockoutBracketData): Promise<boolean> {
  const template: EmailTemplate = {
    to: email,
    subject: `Knockout Bracket Ready - ${data.eventName}`,
    html: this.getKnockoutBracketTemplate(data),
  };
  return this.sendEmail(template);
}
```

## Troubleshooting

### Emails Not Sending

1. **Check if email service is configured**:
```typescript
console.log('Email configured:', EmailService.isConfigured());
```

2. **Check environment variable**:
```bash
echo $VITE_RESEND_API_KEY  # Should show your API key
```

3. **Check browser console** for errors:
```
Open DevTools → Console → Look for email-related errors
```

4. **Verify API key** is valid:
- Go to Resend dashboard
- Check API Keys section
- Make sure key is active and not expired

### Emails Going to Spam

1. **Verify your domain** in Resend (recommended)
2. **Add SPF/DKIM records** to your domain DNS
3. **Use a professional sender name** and email
4. **Avoid spam trigger words** in subject/content

### Rate Limiting

Resend free tier limits:
- 3,000 emails per month
- 100 emails per day

To handle rate limiting:
```typescript
// Add rate limit handling in sendEmail()
if (response.status === 429) {
  console.error('Rate limit exceeded');
  // Implement queue or delay
}
```

### Testing Without Sending Real Emails

For development, you can mock the email service:

```typescript
// Add to EmailService.ts
static async sendEmail(template: EmailTemplate): Promise<boolean> {
  if (import.meta.env.DEV && !import.meta.env.VITE_SEND_REAL_EMAILS) {
    console.log('Mock email:', template);
    return true; // Simulate success
  }
  // ... rest of code
}
```

Then in `.env`:
```bash
VITE_SEND_REAL_EMAILS=false  # For testing
```

## Production Checklist

Before deploying to production:

- [ ] Verify custom domain in Resend
- [ ] Add SPF/DKIM DNS records
- [ ] Update sender email to your domain
- [ ] Set production API key in environment
- [ ] Test with real email addresses
- [ ] Check spam folder placement
- [ ] Monitor Resend dashboard for deliverability
- [ ] Set up error logging/monitoring
- [ ] Review email content for accuracy
- [ ] Test unsubscribe flow (if needed)

## Privacy & Compliance

### Email Collection
- Emails are **optional** in registration form
- Players opt-in by providing their email
- Emails stored in Supabase `players` table

### Data Protection
- API keys stored in environment variables (never in code)
- No email data logged or exposed
- Emails sent via secure HTTPS to Resend

### GDPR Compliance (If Applicable)
1. Add privacy policy link to registration form
2. Provide unsubscribe mechanism
3. Allow players to request data deletion
4. Document data retention policies

## API Reference

### EmailService.initialize(apiKey)
Initialize the email service with Resend API key.

```typescript
EmailService.initialize('re_your_api_key');
```

### EmailService.isConfigured()
Check if email service is properly configured.

```typescript
if (EmailService.isConfigured()) {
  // Send emails
}
```

### EmailService.sendRegistrationConfirmation(email, data)
Send registration confirmation email.

```typescript
await EmailService.sendRegistrationConfirmation('player@example.com', {
  playerName: 'John Doe',
  eventName: 'CGC Summer Tournament',
  date: '2026-07-15',
  location: 'CGC Darts Club',
  startTime: '7:00 PM',
});
```

### EmailService.sendGroupAssignment(email, data)
Send group assignment email.

```typescript
await EmailService.sendGroupAssignment('player@example.com', {
  playerName: 'John Doe',
  eventName: 'CGC Summer Tournament',
  groupName: 'Group A',
  boardNumbers: 'Board 1, Board 2',
  date: '2026-07-15',
  startTime: '7:00 PM',
});
```

### EmailService.sendBulkGroupAssignments(assignments)
Send group assignment emails to multiple players.

```typescript
const results = await EmailService.sendBulkGroupAssignments([
  { email: 'player1@example.com', data: { ... } },
  { email: 'player2@example.com', data: { ... } },
]);

console.log(`Sent: ${results.sent}, Failed: ${results.failed}`);
```

## Cost Estimation

### Resend Free Tier
- **3,000 emails/month** - Free
- **100 emails/day** - Free

### Typical Usage
- Tournament with 50 players
- Registration confirmations: 50 emails
- Group assignments: 50 emails
- **Total per tournament**: ~100 emails

**You can run ~30 tournaments per month on free tier!**

### Paid Plans (If Needed)
- **Pro**: $20/month for 50,000 emails
- **Enterprise**: Custom pricing

## Support

### Resend Support
- Documentation: [https://resend.com/docs](https://resend.com/docs)
- API Reference: [https://resend.com/docs/api-reference](https://resend.com/docs/api-reference)
- Support: [support@resend.com](mailto:support@resend.com)

### Email Service Issues
If you encounter issues with the email system:
1. Check browser console for errors
2. Verify Resend dashboard for delivery status
3. Test with a different email address
4. Check spam/junk folders
5. Review this documentation

## Future Enhancements

Potential features to add:
- [ ] Email templates for knockout bracket assignments
- [ ] Match start notifications
- [ ] Tournament completion summary
- [ ] Player statistics report
- [ ] Email preferences (opt-in/opt-out)
- [ ] SMS notifications (via Twilio integration)
- [ ] Email scheduling (send at specific time)
- [ ] Attachment support (tournament rules PDF)
- [ ] Multi-language support
- [ ] Email analytics and tracking
