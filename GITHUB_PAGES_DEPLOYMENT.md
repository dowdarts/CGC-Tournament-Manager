# GitHub Pages Deployment for CGC Tournament Manager

## Overview
This tournament manager includes a live scoreboard that can be hosted on GitHub Pages for external display (e.g., projection on TVs, external monitors).

## Setup Instructions

### 1. Build the Application for GitHub Pages

```bash
cd frontend
npm run build
```

### 2. Configure Vite for GitHub Pages

The `vite.config.ts` is already configured with the correct base path for GitHub Pages deployment.

### 3. Deploy to GitHub Pages

#### Option A: Manual Deployment

```bash
# Build the project
cd frontend
npm run build

# The build output is in frontend/dist
# Copy this to your gh-pages branch or use gh-pages package
```

#### Option B: Automated Deployment (Recommended)

Install gh-pages package:
```bash
cd frontend
npm install --save-dev gh-pages
```

Add deployment scripts to `frontend/package.json`:
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

Deploy:
```bash
npm run deploy
```

### 4. Enable GitHub Pages

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select the `gh-pages` branch
4. Click **Save**
5. Your scoreboard will be available at: `https://dowdarts.github.io/CGC-Tournament-Manager/`

### 5. Access the Scoreboard

Once deployed, you can access the scoreboard at:
```
https://dowdarts.github.io/CGC-Tournament-Manager/tournament/{tournament-id}/scoreboard
```

**Full-Screen Mode**: Add `?fullscreen=true` to hide navigation:
```
https://dowdarts.github.io/CGC-Tournament-Manager/tournament/{tournament-id}/scoreboard?fullscreen=true
```

## Scoreboard Features

- **Live Match Updates**: Automatically refreshes every 10 seconds
- **Real-time Scores**: Shows current leg scores and match duration
- **Board Assignments**: Displays which board each match is on
- **Match Queue**: Shows upcoming matches
- **Recent Results**: Displays recently completed matches with winners
- **Clean Display**: Perfect for projection on external monitors or TVs

## Configuration for Production

### Supabase Configuration

Ensure your Supabase URL and anon key are configured in `frontend/src/services/supabase.ts`:

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';
```

### Environment Variables

Create a `.env.production` file in the `frontend` directory:

```env
VITE_SUPABASE_URL=https://pfujbgwgsxuhgvmeatjh.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Usage Tips

### For Tournament Organizers

1. **Open the scoreboard on a dedicated device** (tablet, laptop, or TV)
2. **Navigate to the Scoreboard tab** within your tournament
3. **Optionally project to external display** for spectators
4. **The scoreboard auto-updates** - no manual refresh needed

### For External Display

1. **Deploy to GitHub Pages** using the instructions above
2. **Open the scoreboard URL** on the display device
3. **Use fullscreen mode** for clean display (`F11` in most browsers)
4. **Consider auto-refresh browser extension** for reliability

## Customization

### Update Refresh Interval

Edit `frontend/src/pages/Scoreboard.tsx`:

```typescript
const interval = setInterval(loadScoreboardData, 10000); // 10 seconds
```

Change `10000` to your preferred interval in milliseconds.

### Styling

The scoreboard uses a dark theme optimized for projection. To customize:

- Edit colors in `frontend/src/pages/Scoreboard.tsx`
- Modify animations in the `<style>` tag at the bottom of the component
- Adjust font sizes for different screen sizes

## Troubleshooting

### Scoreboard Not Updating

1. Check browser console for errors
2. Verify Supabase connection
3. Ensure tournament ID in URL is correct
4. Check that matches exist and are in-progress

### GitHub Pages 404 Error

1. Ensure GitHub Pages is enabled in repository settings
2. Verify the `gh-pages` branch exists
3. Check that `base` is correctly set in `vite.config.ts`
4. Wait a few minutes after deployment

### CORS Issues

If you encounter CORS errors:
1. Check Supabase URL configuration
2. Verify anon key is correct
3. Ensure Supabase project allows requests from GitHub Pages domain

## Maintenance

- **Keep dependencies updated**: `npm update`
- **Monitor Supabase usage**: Check quotas and limits
- **Test after updates**: Verify scoreboard still works after changes
- **Backup configuration**: Keep `.env` files secure

## Support

For issues or questions:
- Check the main project README
- Review Supabase documentation
- Verify GitHub Pages configuration
