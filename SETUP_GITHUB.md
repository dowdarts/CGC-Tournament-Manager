# CGC Tournament Manager - GitHub Setup

## Install Git First

Download and install Git from [git-scm.com](https://git-scm.com/download/win).

After installing, restart your terminal and run these commands:

## Initialize and Push to GitHub

```powershell
cd D:\CGC-Tournament-Manager

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: CGC Tournament Manager"

# Add GitHub remote
git remote add origin https://github.com/aadsstats/CGC-Tournament-Manager.git

# Create and switch to main branch
git branch -M main

# Push to GitHub
git push -u origin main
```

## If You Already Have Git Installed

If git is installed but not in PATH, you can use GitHub Desktop instead:

1. Download GitHub Desktop: [desktop.github.com](https://desktop.github.com/)
2. Open GitHub Desktop
3. Click "Add" → "Add Existing Repository"
4. Select folder: `D:\CGC-Tournament-Manager`
5. Publish repository to GitHub
6. Repository name: `CGC-Tournament-Manager`

## Enable GitHub Pages (After Push)

1. Go to: [repository Pages settings](https://github.com/aadsstats/CGC-Tournament-Manager/settings/pages)
2. Source: Deploy from a branch
3. Branch: `main`
4. Folder: `/registration-portal`
5. Click Save

Your registration portal URL will be [https://aadsstats.github.io/CGC-Tournament-Manager/](https://aadsstats.github.io/CGC-Tournament-Manager/).

## Alternative: Manual Upload

If you prefer not to use Git:

1. Go to: [repository home](https://github.com/aadsstats/CGC-Tournament-Manager)
2. Click "uploading an existing file"
3. Drag all folders/files from `D:\CGC-Tournament-Manager`
4. Commit directly to main branch
5. Then enable GitHub Pages as above

The registration portal will still work the same way!
