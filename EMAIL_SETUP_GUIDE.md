# Email Server Setup Complete ✅

## The Problem
Your registration portal is getting **"Failed to fetch"** errors because browsers can't call the Resend API directly due to CORS (Cross-Origin Resource Sharing) restrictions.

## The Solution
I've created a serverless email proxy that your registration portal will use instead.

---

## 🚀 Deployment Steps (Takes 5 minutes)

### 1. Go to Vercel
Visit: https://vercel.com and sign up with your GitHub account

### 2. Create New Project
- Click **"Add New"** → **"Project"**
- Select your `dowdarts/CGC-Tournament-Manager` repository
- **IMPORTANT:** Set **Root Directory** to `backend`
- Leave everything else as default
- Click **"Deploy"**

### 3. Add Environment Variable
After deployment completes:
- Go to your project **Settings** → **Environment Variables**
- Add:
  - **Key:** `RESEND_API_KEY`
  - **Value:** `re_LHWNKYP4_7RzQTTZZMEWpuGxWLEV3PU5s`
- Click **"Save"**
- Click **"Redeploy"** (to apply the environment variable)

### 4. Get Your URL
Copy your deployment URL (looks like: `https://your-project-name.vercel.app`)

### 5. Test It Works
Visit: `https://your-project-name.vercel.app/health`

Should show: `{"status":"ok","message":"Email server running"}`

---

## 📝 Next Step

Once you have your Vercel URL, tell me:
**"My Vercel URL is: https://your-project-name.vercel.app"**

And I'll update your registration portal to use it!

---

## 💡 Why This Works
- Your registration portal (browser) → Your Vercel serverless function → Resend API
- The Vercel function runs on a server (not browser), so no CORS issues
- It's completely free and scales automatically
