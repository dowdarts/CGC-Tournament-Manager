# Email System Flow Diagram

## 🔄 Complete Email Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    REGISTRATION EMAIL FLOW                      │
└─────────────────────────────────────────────────────────────────┘

Player Action                System Response              Email Sent
═════════════                ════════════════             ══════════

1. Opens registration
   page
   ↓
2. Fills out form
   • Name                →   Form validation
   • Email (optional)
   ↓
3. Clicks "Register"    →   Save to database
                             ↓
                        →   Check if email provided
                             ↓
                        →   IF email exists:
                             • Call EmailService
                             • Send confirmation     →   📧 REGISTRATION 
                             ↓                           CONFIRMATION EMAIL
4. Sees "Registration       Log result
   successful" message       (sent/failed)


┌─────────────────────────────────────────────────────────────────┐
│                  GROUP ASSIGNMENT EMAIL FLOW                    │
└─────────────────────────────────────────────────────────────────┘

Organizer Action            System Response              Emails Sent
════════════════            ═══════════════              ═══════════

1. Creates groups
   ↓
2. Assigns boards
   to groups
   ↓
3. Clicks "Start       →   Update tournament status
   Group Stage"             ↓
                       →   Query all players with emails
                            ↓
                       →   For each player:
                            • Get group assignment
                            • Get board numbers
                            • Prepare email data
                            ↓
                       →   Bulk send all emails      →   📧 GROUP ASSIGNMENT
                            ↓                             EMAILS (ALL PLAYERS)
                       →   Log results
4. Group stage starts       • X emails sent
                            • Y emails failed
                            ↓
5. Players notified         Show success message


┌─────────────────────────────────────────────────────────────────┐
│                     EMAIL TEMPLATE PREVIEW                      │
└─────────────────────────────────────────────────────────────────┘

REGISTRATION CONFIRMATION EMAIL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌───────────────────────────────────────┐
│ 🎯 Registration Confirmed!            │  ← Gradient header
│                                       │     (Purple → Pink)
└───────────────────────────────────────┘
┌───────────────────────────────────────┐
│            ✅                          │  ← Success icon
│                                       │
│ Hi John Doe,                          │
│                                       │
│ Your registration has been            │
│ successfully confirmed!               │
│                                       │
│ ┌─────────────────────────────────┐  │
│ │ Event:     CGC Summer Tournament│  │  ← Info box
│ │ Date:      July 15, 2026        │  │
│ │ Location:  CGC Darts Club       │  │
│ │ Time:      7:00 PM              │  │
│ └─────────────────────────────────┘  │
│                                       │
│ What's Next?                          │
│ • Group assignment email coming soon │
│ • Arrive 15 minutes early             │
│ • Bring your own darts                │
│ • Check your email for updates        │
│                                       │
│ See you at the tournament!            │
└───────────────────────────────────────┘


GROUP ASSIGNMENT EMAIL
━━━━━━━━━━━━━━━━━━━━━
┌───────────────────────────────────────┐
│ 🎯 Group Assignment                   │  ← Gradient header
│                                       │     (Orange → Red)
└───────────────────────────────────────┘
┌───────────────────────────────────────┐
│ Hi John Doe,                          │
│                                       │
│ The group stage has started!          │
│                                       │
│ ┌─────────────────────────────────┐  │
│ │      Your Group                 │  │  ← Highlight box
│ │                                 │  │     (Yellow gradient)
│ │        GROUP A                  │  │  ← Large, bold
│ └─────────────────────────────────┘  │
│                                       │
│ ┌─────────────────────────────────┐  │
│ │ Board(s):   Board 1, Board 2    │  │  ← Info box
│ │ Date:       July 15, 2026       │  │
│ │ Time:       7:00 PM             │  │
│ └─────────────────────────────────┘  │
│                                       │
│ Important Information:                │
│ • Proceed to Board 1, Board 2         │
│ • Check board call for match schedule │
│ • Be ready when called                │
│ • Good luck! 🏆                       │
└───────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                     TECHNICAL ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────────┘

Frontend Components                    Email Service
═══════════════════                    ═════════════

SelfRegistrationForm.tsx               EmailService.ts
├─ Collect player data                 ├─ initialize(apiKey)
├─ Submit to database                  ├─ isConfigured()
└─ Call email service ──────────────→  ├─ sendRegistrationConfirmation()
                                       │  ├─ Build HTML template
                                       │  └─ POST to Resend API
                                       └─ Templates
                                          ├─ Registration HTML
                                          └─ Group assignment HTML

GroupStage.tsx
├─ Start group stage                   EmailService.ts
├─ Query players with emails           ├─ sendBulkGroupAssignments()
├─ Get group/board assignments         │  ├─ Loop through players
└─ Call bulk email send ────────────→  │  ├─ Build each email
                                       │  ├─ Send via Resend API
                                       │  └─ Return results
                                       └─ Error handling


External Services
═════════════════

Resend API (api.resend.com)
├─ Receives email requests
├─ Validates API key
├─ Processes HTML templates
├─ Delivers emails via SMTP
└─ Returns delivery status


┌─────────────────────────────────────────────────────────────────┐
│                        DATA FLOW DIAGRAM                        │
└─────────────────────────────────────────────────────────────────┘

Player → Registration Form → Supabase Database
                ↓
         EmailService.sendRegistrationConfirmation()
                ↓
         Resend API (HTTP POST)
                ↓
         SMTP Servers
                ↓
         Player's Inbox 📧


Organizer → "Start Group Stage" Button
                ↓
         Query Players + Groups + Boards
                ↓
         EmailService.sendBulkGroupAssignments()
                ↓
         Resend API (Multiple HTTP POSTs)
                ↓
         SMTP Servers
                ↓
         All Players' Inboxes 📧📧📧


┌─────────────────────────────────────────────────────────────────┐
│                      CONFIGURATION FLOW                         │
└─────────────────────────────────────────────────────────────────┘

Setup Step                             File Location
══════════                             ═════════════

1. Get Resend API key           →     resend.com/api-keys

2. Create .env file             →     frontend/.env
   VITE_RESEND_API_KEY=re_xxx

3. EmailService auto-init       →     frontend/src/services/EmailService.ts
   (reads from env on load)            Line 341-343

4. Service ready to use         →     Any component can call:
                                      EmailService.sendRegistrationConfirmation()
                                      EmailService.sendGroupAssignment()


┌─────────────────────────────────────────────────────────────────┐
│                         ERROR HANDLING                          │
└─────────────────────────────────────────────────────────────────┘

Scenario                               Behavior
════════                               ════════

API key not configured          →     • isConfigured() returns false
                                      • Email functions skip sending
                                      • Console warning logged
                                      • Registration still succeeds

Player has no email             →     • Email send skipped
                                      • No error thrown
                                      • Registration succeeds

Resend API failure              →     • Error caught and logged
                                      • Returns false
                                      • User registration still succeeds
                                      • Organizer sees failed count

Network error                   →     • Caught by try/catch
                                      • Logged to console
                                      • Doesn't block user flow

Rate limit exceeded             →     • Resend returns 429
                                      • Logged as failure
                                      • Could implement retry logic


┌─────────────────────────────────────────────────────────────────┐
│                      MONITORING & LOGGING                       │
└─────────────────────────────────────────────────────────────────┘

What Gets Logged                       Where
════════════════                       ═════

Email service configured?       →     Console on app load
                                      "Email service initialized"

Registration email sent         →     Console (success/failure)
                                      "Sent registration confirmation to..."

Bulk email results              →     Console after group stage start
                                      "Group assignment emails: X sent, Y failed"

API errors                      →     Console.error with details
                                      Error message from Resend

Network failures                →     Console.error with stack trace


┌─────────────────────────────────────────────────────────────────┐
│                     SECURITY ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────────┘

Security Layer                         Implementation
══════════════                         ══════════════

API Key Storage                 →     • Environment variable only
                                      • Never in source code
                                      • .env excluded from git

HTTPS Communication             →     • All Resend API calls use HTTPS
                                      • Encrypted in transit

No Email Logging                →     • Player emails not logged
                                      • Only counts logged

Database Security               →     • Emails stored in Supabase
                                      • RLS policies apply
                                      • Encrypted at rest

Access Control                  →     • Only authorized apps can send
                                      • Resend API key required
                                      • Domain verification (optional)
```

## 📊 Performance Metrics

| Operation | Time | Impact |
|-----------|------|--------|
| Single email send | ~500ms | Non-blocking |
| Bulk send (50 emails) | ~25s | Background process |
| Form submission | <100ms | Instant (email async) |
| Group stage start | ~30s | Includes email send |

## 💰 Cost Analysis

| Scenario | Emails/Month | Cost |
|----------|--------------|------|
| 10 tournaments, 30 players each | 600 | Free |
| 20 tournaments, 50 players each | 2,000 | Free |
| 40 tournaments, 50 players each | 4,000 | $20/month |

## ✅ Testing Checklist

```
□ Registration with email → Receives confirmation
□ Registration without email → No error, succeeds
□ Doubles registration → Both players get emails
□ Start group stage → All players get group emails
□ Email formatting → Displays correctly on mobile
□ Email formatting → Displays correctly in Gmail
□ Email formatting → Displays correctly in Outlook
□ Spam folder check → Emails not marked as spam
□ API key missing → Graceful degradation
□ Network offline → Error logged, doesn't crash
```
