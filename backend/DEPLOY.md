# Email Server Deployment Guide

## Quick Deploy to Render.com (FREE)

1. **Go to**: https://render.com (sign up with GitHub)

2. **Click "New +"** → Select **"Web Service"**

3. **Connect your GitHub repository**: `dowdarts/CGC-Tournament-Manager`

4. **Configure:**
   - **Name**: `tournament-email-server`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: (leave empty)
   - **Start Command**: `node email-server.js`
   - **Plan**: `Free`

5. **Add Environment Variable:**
   - Click "Environment" tab
   - Add variable:
     - **Key**: `RESEND_API_KEY`
     - **Value**: Your actual Resend API key (from https://resend.com/api-keys)

6. **Click "Create Web Service"**

7. **Copy the URL** (will be like `https://tournament-email-server.onrender.com`)

8. **Update Registration Portal:**
   - Replace the Supabase edge function call with your new server URL
   - I'll help you update the code once you have the URL

## Test Your Server

Once deployed, test it:
```
https://your-server-url.onrender.com/health
```

Should return: `{"status":"ok","message":"Email server running"}`
