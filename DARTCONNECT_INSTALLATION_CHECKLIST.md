# DartConnect Integration - Installation Checklist

## Pre-Installation

- [ ] Backup your current database
- [ ] Review the [Architecture Document](DARTCONNECT_ARCHITECTURE.md)
- [ ] Read the [Quick Start Guide](DARTCONNECT_QUICKSTART.md)
- [ ] Have Supabase project credentials ready
- [ ] Node.js installed (v16+)
- [ ] npm or yarn installed

## Step-by-Step Installation

### Part 1: Database Setup (5 minutes)

- [ ] **1.1** Open Supabase Dashboard
- [ ] **1.2** Navigate to SQL Editor
- [ ] **1.3** Open `backend/migration_add_dartconnect_integration.sql`
- [ ] **1.4** Copy entire file contents
- [ ] **1.5** Paste into Supabase SQL Editor
- [ ] **1.6** Click "Run" button
- [ ] **1.7** Verify success message (no errors)
- [ ] **1.8** Check tables were created:
  - [ ] `pending_match_results`
  - [ ] `match_watch_codes`
  - [ ] `match_score_history`
- [ ] **1.9** Verify functions were created:
  - [ ] `match_dartconnect_players()`
  - [ ] `auto_accept_pending_result()`
- [ ] **1.10** Verify tournament columns added:
  - [ ] `dartconnect_integration_enabled`
  - [ ] `dartconnect_auto_accept_scores`
  - [ ] `dartconnect_require_manual_approval`

### Part 2: Scraper Setup (3 minutes)

- [ ] **2.1** Navigate to `dartconnect-scraper` folder
  ```bash
  cd dartconnect-scraper
  ```
- [ ] **2.2** Install dependencies
  ```bash
  npm install
  ```
- [ ] **2.3** Verify `.env` file exists
- [ ] **2.4** Confirm Supabase credentials in `.env`:
  - [ ] `SUPABASE_URL` is correct
  - [ ] `SUPABASE_ANON_KEY` is correct
- [ ] **2.5** Test scraper (optional):
  ```bash
  node enhanced-scraper.js
  ```
  Should show usage instructions

### Part 3: Frontend Build (2 minutes)

- [ ] **3.1** Navigate to frontend folder
  ```bash
  cd frontend
  ```
- [ ] **3.2** Install new dependencies (if needed)
  ```bash
  npm install
  ```
- [ ] **3.3** Build the application
  ```bash
  npm run build
  ```
- [ ] **3.4** Verify no build errors
- [ ] **3.5** (Optional) Test locally
  ```bash
  npm run dev
  ```

### Part 4: Test the Integration (10 minutes)

- [ ] **4.1** Create or open a test tournament
- [ ] **4.2** Navigate to Settings
- [ ] **4.3** Find "DartConnect Integration" section
- [ ] **4.4** Toggle "Enable DartConnect Integration" → ON
- [ ] **4.5** Click "Save Settings"
- [ ] **4.6** Verify settings saved successfully
- [ ] **4.7** Create a test match on DartConnect
- [ ] **4.8** Get the watch code (e.g., ABC123)
- [ ] **4.9** Get your tournament ID from URL
- [ ] **4.10** Run the scraper:
  ```bash
  cd dartconnect-scraper
  node enhanced-scraper.js ABC123 <your-tournament-id>
  ```
- [ ] **4.11** Verify scraper started successfully
- [ ] **4.12** Play a quick test match on DartConnect
- [ ] **4.13** Verify scraper detects completion
- [ ] **4.14** Check Match Results Manager for pending result
- [ ] **4.15** Click "Approve & Apply"
- [ ] **4.16** Verify match updated in tournament
- [ ] **4.17** Check standings were updated

### Part 5: Configure for Production

- [ ] **5.1** Decide on auto-accept strategy:
  - [ ] Auto-accept enabled (faster, requires exact names)
  - [ ] Manual approval only (safer, more control)
  - [ ] Hybrid (recommended)
- [ ] **5.2** Update tournament settings accordingly
- [ ] **5.3** Test with real player names
- [ ] **5.4** Verify confidence scores are accurate
- [ ] **5.5** Train staff on Match Results Manager
- [ ] **5.6** Create watch code tracking system
- [ ] **5.7** Test multiple concurrent scrapers
- [ ] **5.8** Document your specific workflow

## Verification Checklist

### Database
- [ ] All tables created without errors
- [ ] Functions execute successfully
- [ ] RLS policies applied
- [ ] Indexes created for performance
- [ ] Tournament columns added

### Scraper
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Can connect to DartConnect
- [ ] Can connect to Supabase
- [ ] Detects match completion
- [ ] Creates pending results

### Frontend
- [ ] No build errors
- [ ] DartConnect Settings component visible
- [ ] Match Results Manager accessible
- [ ] Can view pending results
- [ ] Can approve/reject results
- [ ] Settings save correctly

### Integration
- [ ] End-to-end test successful
- [ ] Approved results update matches
- [ ] Standings recalculate automatically
- [ ] Auto-accept works (if enabled)
- [ ] Audit trail logs all changes
- [ ] No data loss or corruption

## Troubleshooting

### Issue: Database migration failed

**Symptoms:** Error messages in SQL Editor

**Solutions:**
- [ ] Check for syntax errors in migration file
- [ ] Verify you have admin permissions
- [ ] Try running sections individually
- [ ] Check Supabase logs for detailed error

### Issue: Scraper won't start

**Symptoms:** Error when running `node enhanced-scraper.js`

**Solutions:**
- [ ] Verify Node.js is installed: `node --version`
- [ ] Reinstall dependencies: `npm install`
- [ ] Check `.env` file exists and is correct
- [ ] Verify Supabase credentials
- [ ] Check internet connection

### Issue: No matching scheduled match found

**Symptoms:** Pending result shows 0% confidence

**Solutions:**
- [ ] Verify player names match exactly
- [ ] Check match is scheduled, not completed
- [ ] Confirm correct tournament ID
- [ ] Try creating test match with exact names
- [ ] Check database for scheduled matches

### Issue: Auto-accept not working

**Symptoms:** High-confidence results not auto-applying

**Solutions:**
- [ ] Verify auto-accept enabled in settings
- [ ] Check confidence score ≥ 90%
- [ ] Confirm match was found
- [ ] Check require_manual_approval is false
- [ ] Review Supabase logs for errors

### Issue: Frontend not showing new components

**Symptoms:** DartConnect Settings or Match Results Manager missing

**Solutions:**
- [ ] Clear browser cache
- [ ] Rebuild frontend: `npm run build`
- [ ] Check browser console for errors
- [ ] Verify route is correct
- [ ] Check component imports in App.tsx

## Rollback Plan

If you need to rollback the installation:

### Rollback Database
```sql
-- Remove tables
DROP TABLE IF EXISTS match_score_history;
DROP TABLE IF EXISTS match_watch_codes;
DROP TABLE IF EXISTS pending_match_results;

-- Remove functions
DROP FUNCTION IF EXISTS match_dartconnect_players;
DROP FUNCTION IF EXISTS auto_accept_pending_result;

-- Remove columns
ALTER TABLE tournaments 
  DROP COLUMN IF EXISTS dartconnect_integration_enabled,
  DROP COLUMN IF EXISTS dartconnect_auto_accept_scores,
  DROP COLUMN IF EXISTS dartconnect_require_manual_approval;

ALTER TABLE scraper_sessions
  DROP COLUMN IF EXISTS tournament_id,
  DROP COLUMN IF EXISTS linked_match_id,
  DROP COLUMN IF EXISTS match_completed,
  DROP COLUMN IF EXISTS result_submitted;
```

### Rollback Frontend
```bash
git checkout HEAD -- frontend/src/types/index.ts
git checkout HEAD -- frontend/src/services/api.ts
git checkout HEAD -- frontend/src/App.tsx
rm frontend/src/pages/MatchResultsManager.tsx
rm frontend/src/components/DartConnectSettings.tsx
rm frontend/src/styles/MatchResultsManager.css
rm frontend/src/styles/DartConnectSettings.css
npm run build
```

## Post-Installation

- [ ] Update your internal documentation
- [ ] Train tournament directors on new features
- [ ] Create a watch code tracking system
- [ ] Monitor first few tournaments closely
- [ ] Collect feedback from users
- [ ] Adjust auto-accept settings as needed
- [ ] Review audit logs regularly

## Support Resources

- 📖 [Full Documentation](DARTCONNECT_INTEGRATION_GUIDE.md)
- ⚡ [Quick Start](DARTCONNECT_QUICKSTART.md)
- 🏗️ [Architecture](DARTCONNECT_ARCHITECTURE.md)
- 📋 [Implementation Summary](DARTCONNECT_IMPLEMENTATION_SUMMARY.md)

## Success Criteria

Installation is successful when:
- [ ] Database migration completed without errors
- [ ] Scraper can monitor DartConnect matches
- [ ] Pending results appear in Match Results Manager
- [ ] Results can be approved/rejected
- [ ] Approved results update tournament standings
- [ ] Auto-accept works (if enabled)
- [ ] No errors in browser console
- [ ] No errors in Supabase logs
- [ ] Full end-to-end test passes

## Estimated Time

- Database setup: ~5 minutes
- Scraper setup: ~3 minutes
- Frontend build: ~2 minutes
- Testing: ~10 minutes
- Configuration: ~5 minutes
- **Total: ~25 minutes**

## Support

If you encounter issues not covered in this checklist:

1. Check all documentation files
2. Review Supabase logs
3. Check scraper console output
4. Verify environment variables
5. Test with simplified scenario
6. Check GitHub issues

---

Last Updated: January 27, 2026
