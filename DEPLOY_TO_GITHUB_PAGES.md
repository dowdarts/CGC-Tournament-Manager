# 🚀 Deploy Your Tournament Manager to GitHub Pages

This guide will help you deploy your CGC Tournament Manager as a live web app on GitHub Pages.

## Prerequisites

- GitHub account
- This repository pushed to GitHub
- Node.js installed locally (for testing)

## Step 1: Enable GitHub Pages

1. Go to your GitHub repository: `https://github.com/dowdarts/CGC-Tournament-Manager`
2. Click on **Settings** (top menu)
3. Scroll down to **Pages** (left sidebar)
4. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
   - (Don't select "Deploy from a branch" - we're using Actions)

## Step 2: Push Your Code

Make sure all your changes are committed and pushed to GitHub:

```powershell
git add .
git commit -m "Set up GitHub Pages deployment"
git push origin main
```

## Step 3: Watch the Deployment

1. Go to the **Actions** tab in your GitHub repository
2. You'll see a workflow called "Deploy to GitHub Pages" running
3. Wait for it to complete (usually 2-3 minutes)
4. Once complete, your site will be live at:
   ```
   https://dowdarts.github.io/CGC-Tournament-Manager/
   ```

## Step 4: Access Your Live App

Your tournament manager will be available at:
- **Main App**: `https://dowdarts.github.io/CGC-Tournament-Manager/`
- **Registration Portal**: `https://dowdarts.github.io/CGC-Tournament-Manager/registration/`
- **Live Scoreboard**: `https://dowdarts.github.io/CGC-Tournament-Manager/live.html`

## Automatic Updates

Every time you push to the `main` branch, GitHub Actions will automatically:
1. Build your app
2. Deploy it to GitHub Pages
3. Make it live within 2-3 minutes

## Manual Deployment (Alternative)

If you prefer to deploy manually:

```powershell
cd frontend
npm install
npm run build
npm run deploy
```

This will build and deploy directly from your machine.

## Testing Locally Before Deployment

Before pushing, test your build locally:

```powershell
cd frontend
npm run build
npm run preview
```

This will show you exactly what will be deployed.

## Troubleshooting

### Build Fails in GitHub Actions

Check the Actions tab for error messages. Common issues:
- Missing dependencies in `package.json`
- TypeScript errors
- Missing environment variables

### Page Shows 404

Make sure:
1. GitHub Pages is enabled in Settings
2. Source is set to "GitHub Actions"
3. The workflow completed successfully

### App Loads But Has Errors

Check browser console (F12). Common issues:
- Supabase connection (check your environment variables)
- CORS issues (configure Supabase to allow your GitHub Pages domain)

### Update Supabase CORS Settings

1. Go to Supabase Dashboard
2. Project Settings → API
3. Add to allowed origins:
   ```
   https://dowdarts.github.io
   ```

## What Gets Deployed

The GitHub Actions workflow automatically:
- ✅ Builds the React frontend
- ✅ Includes registration portal
- ✅ Includes live scoreboard
- ✅ Sets correct Supabase environment variables
- ✅ Optimizes for production

## Environment Variables

The deployment uses these environment variables (already configured in the workflow):
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase publishable key

These are safe to include in the workflow file as they're meant to be public (they're in the client-side code anyway).

## Custom Domain (Optional)

To use a custom domain:
1. Add a `CNAME` file to `frontend/public/` with your domain
2. Configure DNS with your domain provider
3. Enable "Enforce HTTPS" in GitHub Pages settings

## Need Help?

- Check the Actions tab for deployment logs
- Review browser console for runtime errors
- Verify Supabase connection and CORS settings
