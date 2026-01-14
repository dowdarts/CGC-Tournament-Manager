# Quick Setup Guide

## Push Main Project to GitHub

```bash
# Navigate to project root
cd D:\CGC-Tournament-Manager

# Initialize git (if not already done)
git init

# Add all files
git add .

# Initial commit
git commit -m "Initial commit: CGC Tournament Manager"

# Add remote
git remote add origin https://github.com/aadsstats/CGC-Tournament-Manager.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Deploy Registration Portal to GitHub Pages

### Option 1: Subdirectory in Main Repo (Recommended)

The registration portal is already in your repo at `registration-portal/index.html`.

1. Go to [GitHub Pages settings](https://github.com/aadsstats/CGC-Tournament-Manager/settings/pages)
2. **Source**: Deploy from a branch
3. **Branch**: `main`
4. **Folder**: `/registration-portal`
5. Click **Save**

Your portal will be live at [https://aadsstats.github.io/CGC-Tournament-Manager/](https://aadsstats.github.io/CGC-Tournament-Manager/).

### Option 2: Separate Repository (Alternative)

If you want a shorter URL like `aadsstats.github.io/registration/`:

```bash
# Create separate repo for portal
cd D:\CGC-Tournament-Manager\registration-portal

git init
git add index.html
git commit -m "Registration portal"

# Create new repo on GitHub named "registration" then:
git remote add origin https://github.com/aadsstats/registration.git
git branch -M main
git push -u origin main

# Enable GitHub Pages in that repo's settings
```

Portal URL will be [https://aadsstats.github.io/registration/](https://aadsstats.github.io/registration/).

## Update Portal Configuration

After deployment, update the portal with your GitHub Pages URL if needed.

## Test the Portal

1. Wait 1-2 minutes for GitHub Pages to build
2. Visit your portal URL
3. Should show "No Active Tournaments"
4. Create a tournament with "Enable Self-Service Registration" checked
5. Refresh portal → tournament should appear!

## Repository Structure

```text
CGC-Tournament-Manager/
├── frontend/              # Tournament Manager (React app)
├── backend/              # Database schemas & migrations
├── registration-portal/  # Standalone portal (GitHub Pages)
├── docs/                # Documentation
└── README.md
```

## Next Steps

1. **Push to GitHub** (commands above)
2. **Enable GitHub Pages** for registration portal
3. **Run database migrations** in Supabase
4. **Test everything** end-to-end

Your permanent registration portal URL will be ready in minutes! 🚀
