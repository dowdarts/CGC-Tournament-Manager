# Public Pages Deployment

## Available Public Pages

### 1. Tournament Display
**URL:** `https://dowdarts.github.io/CGC-Tournament-Manager/tournament-display`
- Live match updates
- In-progress matches with board numbers
- Upcoming matches from next round
- Completed match results
- Updates automatically

### 2. Public Standings Display
**URL:** `https://dowdarts.github.io/CGC-Tournament-Manager/standings-display`
- Live group standings for all groups
- Only shows tournaments with "Show Standings on Display" enabled
- Updates automatically every 30 seconds
- Real-time score updates
- Color-coded rankings (1st in orange, 2nd in light orange)

### 3. Registration Portal
**URL:** `https://dowdarts.github.io/CGC-Tournament-Manager/registration/`
- Public tournament lobby
- Player registration forms
- Tournament selection

## Deployment Process

Changes to the frontend are automatically deployed to GitHub Pages when pushed to the `main` branch via GitHub Actions.

### Manual Deployment Trigger

If automatic deployment doesn't run, you can manually trigger it:
1. Go to: https://github.com/dowdarts/CGC-Tournament-Manager/actions
2. Click on "Deploy to GitHub Pages" workflow
3. Click "Run workflow" button
4. Select the `main` branch
5. Click "Run workflow"

### Cache Clearing

If you don't see updates after deployment:
1. Hard refresh: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
2. Clear browser cache
3. Try incognito/private browsing mode

## How It Works

The deployment workflow:
1. Builds the Vite React app
2. Bundles all routes including the new `/standings-display`
3. Deploys to GitHub Pages
4. Updates typically take 2-5 minutes after push

Last updated: January 25, 2026
