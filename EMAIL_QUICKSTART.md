# Email System Quick Start Guide

## 🚀 Get Email Notifications Working in 5 Minutes

### Step 1: Get Your Free API Key (2 minutes)

1. Go to **[https://resend.com](https://resend.com)**
2. Click **"Start Building"** or **"Sign Up"**
3. Create your account (email + password)
4. Verify your email address
5. Go to **[API Keys](https://resend.com/api-keys)**
6. Click **"+ Create API Key"**
7. Name it: `CGC Tournament Manager`
8. **Copy the key** (starts with `re_...`)
   - ⚠️ Save it now! You can't see it again

### Step 2: Configure Your App (1 minute)

1. **Open your project folder**:
   ```bash
   cd d:\CGC-Tournament-Manager\frontend
   ```

2. **Create `.env` file**:
   ```bash
   # Create new file called .env (no extension)
   # Or copy from .env.example
   ```

3. **Add your API key**:
   ```bash
   # Paste this into the .env file
   VITE_RESEND_API_KEY=re_your_actual_key_here
   ```

4. **Save the file**

### Step 3: Restart Your Dev Server (1 minute)

```bash
# Stop the current server (Ctrl+C if running)
# Then restart:
npm run dev
```

### Step 4: Test It! (1 minute)

1. **Open your browser**: `http://localhost:5173`
2. **Create a test tournament**
3. **Go to public registration page**
4. **Register with YOUR email address**
5. **Check your inbox** → You should see confirmation email!

## ✅ That's It!

You now have:
- ✅ Registration confirmation emails working
- ✅ Group assignment emails ready
- ✅ Professional HTML email templates
- ✅ 3,000 free emails per month

## 🎯 What Happens Now?

### When Players Register
```
Player submits form → Email sent automatically ✉️
```

### When You Start Group Stage
```
You click "Start Group Stage" → All players get group emails ✉️✉️✉️
```

## 🔧 Optional: Customize Sender Email

**Default sender**: `CGC Tournament <onboarding@resend.dev>`

**To use your own domain**:

1. **Add domain in Resend**:
   - Go to [Domains](https://resend.com/domains)
   - Click "Add Domain"
   - Enter your domain
   - Add DNS records (shown on screen)

2. **Update code**:
   - Open: `frontend/src/services/EmailService.ts`
   - Find line 127
   - Change to: `from: 'CGC Tournament <noreply@yourdomain.com>'`

## 📊 What You Get (Free Tier)

| Feature | Limit |
|---------|-------|
| Emails per month | 3,000 |
| Emails per day | 100 |
| Cost | **FREE** |

**That's enough for ~30 tournaments per month!**

## 🐛 Troubleshooting

### "Emails not sending"

1. **Check API key is correct**:
   ```bash
   # Open .env file
   # Make sure key starts with re_
   # No spaces or quotes
   ```

2. **Restart dev server**:
   ```bash
   Ctrl+C
   npm run dev
   ```

3. **Check browser console** (F12):
   - Look for email-related errors
   - Should see: "Email service initialized"

### "Email not in inbox"

1. **Check spam/junk folder** ← Most common!
2. **Wait 1-2 minutes** (sometimes delayed)
3. **Check Resend dashboard**:
   - Go to [Logs](https://resend.com/logs)
   - See if email was sent

### "API key error"

- Make sure you copied the full key
- Check for typos
- Generate new key if needed

## 📚 Need More Help?

- **Full Documentation**: See [EMAIL_SYSTEM_README.md](EMAIL_SYSTEM_README.md)
- **Visual Flow Diagram**: See [EMAIL_FLOW_DIAGRAM.md](EMAIL_FLOW_DIAGRAM.md)
- **Implementation Details**: See [EMAIL_IMPLEMENTATION_SUMMARY.md](EMAIL_IMPLEMENTATION_SUMMARY.md)

## 🎉 Success Indicators

You'll know it's working when:

✅ Browser console shows: `Email service initialized`
✅ Registration shows success message
✅ Email arrives in inbox within 30 seconds
✅ Email looks professional with tournament details
✅ Start Group Stage sends emails to all players

## 📧 Email Preview

### You'll Send This to Players:

**Registration Email**:
```
Subject: Registration Confirmed - CGC Summer Tournament

🎯 Registration Confirmed!
✅

Hi John Doe,

Your registration has been confirmed!

Event: CGC Summer Tournament
Date: July 15, 2026
Location: CGC Darts Club
Time: 7:00 PM

What's Next?
• Group assignment email coming soon
• Arrive 15 minutes early
• Bring your own darts

See you at the tournament!
```

**Group Assignment Email**:
```
Subject: Group Assignment - CGC Summer Tournament

🎯 Group Assignment

Hi John Doe,

The group stage has started!

YOUR GROUP
  GROUP A

Board(s): Board 1, Board 2
Date: July 15, 2026
Time: 7:00 PM

Good luck! 🏆
```

## 🔒 Security Note

- **Never commit** your `.env` file to git
- **Never share** your API key publicly
- **Keep** your API key secret
- `.env` is already in `.gitignore` ✅

## 💡 Pro Tips

1. **Test with your own email first** before using in production
2. **Check spam folder** on first send to "train" email providers
3. **Use Resend dashboard** to monitor delivery
4. **Save API key** in password manager
5. **Generate new key** if ever compromised

## ⏱️ Total Time: ~5 Minutes

```
2 min → Get API key
1 min → Configure .env
1 min → Restart server
1 min → Test
━━━━━━━━━━━━━━━━
5 min total
```

## ✨ You're All Set!

Now every player who registers will automatically receive:
1. **Instant confirmation** when they sign up
2. **Group assignment** when you start the tournament

No manual work required! 🎉

---

**Questions?** Check the full documentation or open an issue on GitHub!
