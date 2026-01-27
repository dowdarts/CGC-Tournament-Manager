# Deploy Registration Portal to GitHub Pages

## Overview


The registration portal is a standalone HTML file that can be hosted on GitHub Pages for free. It will have a permanent URL that works for all tournaments.

## Quick Setup

### 1. Create GitHub Repository


```bash
cd d:\CGC-Tournament-Manager\registration-portal
git init
git add index.html
git commit -m "Initial commit: Registration portal"
```

### 2. Create GitHub Repo Online


1. Go to <https://github.com/new>
2. Repository name: `tournament-registration-portal` (or any name)
3. Public repository
4. Don't initialize with README
5. Click "Create repository"

### 3. Push to GitHub


```bash
git remote add origin https://github.com/YOUR-USERNAME/tournament-registration-portal.git
git branch -M main
git push -u origin main
```

### 4. Enable GitHub Pages


1. Go to repository Settings
2. Click "Pages" in left sidebar
3. Source: Deploy from a branch
4. Branch: `main`
5. Folder: `/ (root)`
6. Click "Save"

### 5. Get Your URL


After a few minutes, your portal will be live at:

```text
https://YOUR-USERNAME.github.io/tournament-registration-portal/
```

## Configure the Portal

### Update Supabase Credentials


Edit `index.html` lines 281-282:

```javascript
const SUPABASE_URL = 'https://pfujbgwgsxuhgvmeatjh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_noZX7_xCvPZSqbQGfDsFMg_wRsuvLyB';
```

These are already set to your project values!

## How It Works

### Events Lobby

- Shows all tournaments where `registration_enabled = true`
- Filters to only show tournaments with `status = 'setup'`
- Displays tournament name, date, location, and game type
- Auto-refreshes every 30 seconds

### Registration Flow

1. User selects tournament from lobby
2. Portal shows registration form
3. Form adapts to Singles or Doubles based on tournament
4. User submits → data goes directly to Supabase
5. Real-time sync updates Tournament Manager instantly

## Tablet Setup

### At Registration Desk

1. **Open browser** on tablet
2. **Navigate** to your GitHub Pages URL
3. **Bookmark** the page
4. **Add to home screen** (optional)
5. Keep tablet charged and awake

### Best Practices

- Use a 10"+ tablet for better visibility
- Ensure stable Wi-Fi connection
- Disable sleep mode during event
- Have backup paper forms ready

## Update the Portal

### Make Changes

1. Edit `registration-portal/index.html`
2. Test locally by opening in browser
3. Commit and push:

```bash
cd d:\CGC-Tournament-Manager\registration-portal
git add index.html
git commit -m "Update portal"
git push
```

GitHub Pages will automatically update in 1-2 minutes.

## Tournament Manager Integration

### Enable Registration for a Tournament

1. Create new tournament in Tournament Manager
2. Check "Enable Self-Service Registration Portal"
3. Tournament will appear in portal lobby immediately

### Disable Registration

- Uncheck registration enabled in tournament settings
- Tournament disappears from lobby
- Already registered players remain

### Monitor Registrations

- Tournament Manager dashboard shows all players
- Real-time updates as people register
- Mark players as paid when they pay entry fee

## Custom Domain (Optional)

### Use Your Own Domain

1. Buy domain (e.g., `register.yourdartleague.com`)
2. Add CNAME file to repository:

```text
register.yourdartleague.com
```

Configure DNS:

- Type: CNAME
- Name: register
- Value: YOUR-USERNAME.github.io

Enable HTTPS in GitHub Pages settings

## Testing

### Test Locally First

1. Open `registration-portal/index.html` in browser
2. Should show "No Active Tournaments"
3. Create tournament with registration enabled
4. Refresh portal → tournament appears
5. Test registration for singles and doubles

### Test on Tablet

1. Open portal URL on actual tablet
2. Verify touch targets are large enough
3. Test landscape and portrait mode
4. Ensure keyboard doesn't cover inputs

## Troubleshooting

### Portal shows No Active Tournaments

- Check tournaments have `registration_enabled = true`
- Verify tournament status is `'setup'`
- Check Supabase credentials in index.html

### Registration not working

- Open browser console (F12)
- Check for errors
- Verify Supabase URL and key are correct
- Check network tab for failed requests

### Changes not appearing

- Wait 1-2 minutes for GitHub Pages to rebuild
- Hard refresh browser (Ctrl+F5)
- Check git push was successful

## Benefits of This Approach

✅ **Single URL** - Same link works for all tournaments
✅ **Always Available** - Hosted 24/7 on GitHub Pages (free)
✅ **No Deployment** - Just edit HTML and push
✅ **Multi-Tournament** - Support multiple events simultaneously
✅ **Real-Time** - Instant sync with Tournament Manager
✅ **Offline Backup** - Can save HTML file locally too
✅ **Professional** - Clean, modern interface
✅ **Mobile Optimized** - Works on any device
