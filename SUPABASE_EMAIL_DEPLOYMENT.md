# Deploying Email Function to Supabase

## Quick Deploy (5 minutes)

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser - login with your Supabase account.

### Step 3: Link Your Project

```bash
cd d:\CGC-Tournament-Manager
supabase link --project-ref pfujbgwgsxuhgvmeatjh
```

### Step 4: Set Resend API Key Secret

```bash
supabase secrets set RESEND_API_KEY=re_U6XduPSC_8SDVYLkVr8bUHc4VcWUZjTvR
```

### Step 5: Deploy the Email Function

```bash
supabase functions deploy send-email
```

### Step 6: Test the Function

```bash
# Test from command line
curl -X POST \
  https://pfujbgwgsxuhgvmeatjh.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer sb_publishable_noZX7_xCvPZSqbQGfDsFMg_wRsuvLyB" \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"your@email.com\",\"subject\":\"Test\",\"html\":\"<p>Test email</p>\",\"type\":\"test\"}"
```

## ✅ That's It!

The email function is now deployed and will work from:
- ✅ Localhost development
- ✅ GitHub Pages registration portal
- ✅ Any deployed version of your app

## How It Works

```
Registration Form (GitHub Pages or Localhost)
         ↓
    EmailService.ts
         ↓
Supabase Edge Function (Cloud)
         ↓
    Resend API
         ↓
  Player's Email Inbox 📧
```

## Verify Deployment

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/pfujbgwgsxuhgvmeatjh/functions)
2. You should see `send-email` function listed
3. Click on it to view logs and usage

## Update GitHub Pages

After deploying the function, rebuild and deploy your GitHub Pages site:

```bash
cd registration-portal
npm run build
npm run deploy
```

## Troubleshooting

### Function not found
- Make sure you ran `supabase functions deploy send-email`
- Check the Supabase dashboard to confirm deployment

### 401 Unauthorized
- Verify the anon key in .env matches your Supabase project
- Check that RLS policies allow the function call

### Emails not sending
- Check Supabase function logs in dashboard
- Verify RESEND_API_KEY secret is set correctly
- Test with curl command above

## Local Development vs Production

The EmailService automatically works in both:
- **Local**: Uses Supabase Edge Function
- **Production (GitHub Pages)**: Uses same Supabase Edge Function

No code changes needed between environments!

## Alternative: If Supabase CLI Doesn't Work

You can also deploy via Supabase Dashboard:
1. Go to [Functions](https://supabase.com/dashboard/project/pfujbgwgsxuhgvmeatjh/functions)
2. Click "New Function"
3. Name it `send-email`
4. Copy/paste code from `supabase/functions/send-email/index.ts`
5. Add secret `RESEND_API_KEY` in Secrets section
6. Deploy

## Monitoring

View email logs in real-time:
```bash
supabase functions logs send-email
```

Or in the dashboard:
[Function Logs](https://supabase.com/dashboard/project/pfujbgwgsxuhgvmeatjh/functions/send-email/logs)
