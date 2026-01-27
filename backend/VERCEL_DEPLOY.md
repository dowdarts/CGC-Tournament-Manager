# Deploy Email Server to Vercel (FREE)

## Steps:

1. **Install Vercel CLI** (optional, or use dashboard):
   ```bash
   npm install -g vercel
   ```

2. **Go to** https://vercel.com and sign up with GitHub

3. **Click "Add New" → "Project"**

4. **Import** your `dowdarts/CGC-Tournament-Manager` repository

5. **Configure:**
   - **Root Directory**: `backend`
   - **Framework Preset**: Other
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)

6. **Add Environment Variable:**
   - Key: `RESEND_API_KEY`
   - Value: `re_LHWNKYP4_7RzQTTZZMEWpuGxWLEV3PU5s`

7. **Click "Deploy"**

8. **Copy the URL** (will be like `https://your-project.vercel.app`)

9. **Update Registration Portal** with your deployed URL (I'll help with this)

## Test Your Deployment:

Visit: `https://your-project.vercel.app/health`

Should return: `{"status":"ok","message":"Email server running"}`
