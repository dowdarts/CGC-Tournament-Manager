# Screenshot Capture Guide
## Instructions for Creating User Manual Screenshots

This guide will help you capture all 108 screenshots needed for the user manual.

---

## Setup Before Capturing

### 1. Prepare Your System
- **Screen Resolution:** Set to 1920x1080 (Full HD) for consistent sizing
- **Browser Zoom:** Set to 100% (Ctrl + 0)
- **Window Size:** Maximize application window
- **Screenshot Tool:** Use Windows Snipping Tool (Windows + Shift + S) or Greenshot (free tool)
- **File Format:** Save as PNG for best quality

### 2. Create Screenshot Folders

Run this command in PowerShell to create all folders:

```powershell
cd "D:\CGC-Tournament-Manager\standalone-cgcdarts-tournament-manager-exe-program\CGC-Tournament-Manager-v1.0.0-Windows"

mkdir screenshots
cd screenshots

mkdir 01-installation
mkdir 02-getting-started
mkdir 03-dashboard
mkdir 04-tournament-creation
mkdir 05-registration
mkdir 06-setup-config
mkdir 07-group-stage
mkdir 08-board-manager
mkdir 09-knockout-bracket
mkdir 10-scoring
mkdir 11-standings
mkdir 12-email-notifications
mkdir 13-tournament-display
mkdir 14-settings
mkdir 15-troubleshooting
mkdir 16-shortcuts
```

### 3. Create Sample Tournament Data

Before taking screenshots, create a fully populated tournament with:
- 16-24 players
- 4 groups (A, B, C, D)
- Multiple completed matches
- Some in-progress matches
- Generated knockout bracket
- Sample boards (1-4)
- Various player emails for testing

---

## Screenshot Capture Instructions

### Folder 01: Installation (screenshots/01-installation/)

**Screenshot 1: Installation wizard welcome**
1. Double-click the installer exe
2. Wait for wizard to appear
3. Capture full wizard window
4. Save as: `01-installation-wizard-welcome.png`

**Screenshot 2: Windows SmartScreen bypass**
1. When SmartScreen appears, capture the warning
2. Then capture after clicking "More info"
3. Save as: `02-smartscreen-bypass-step1.png` and `02-smartscreen-bypass-step2.png`

**Screenshot 3: Installation directory selection**
1. Progress through wizard to directory selection
2. Capture full dialog showing default path
3. Save as: `03-installation-directory.png`

**Screenshot 4: Application first launch**
1. Launch app after installation
2. Capture loading screen or first window
3. Save as: `04-first-launch.png`

---

### Folder 02: Getting Started (screenshots/02-getting-started/)

**Screenshot 5: Sign-in screen**
1. Close app and reopen to see sign-in
2. Show clean sign-in form (no errors)
3. Save as: `05-signin-screen.png`

**Screenshot 6: Sign-up form**
1. Click "Don't have an account? Sign Up"
2. Show registration form
3. Save as: `06-signup-form.png`

**Screenshot 7: Forgot password modal**
1. From sign-in, click "Forgot password?"
2. Capture modal with email input
3. Save as: `07-forgot-password-modal.png`

**Screenshot 8: Main dashboard UI overview**
1. Log in successfully
2. Capture full dashboard with empty state
3. Use annotation tool to label key elements:
   - Create Tournament button
   - Filter tabs
   - Help icon
4. Save as: `08-dashboard-ui-overview.png`

---

### Folder 03: Dashboard (screenshots/03-dashboard/)

**Screenshot 9: Dashboard with tournament cards**
1. Create 3-4 sample tournaments
2. Capture dashboard showing all cards
3. Include different statuses (Active, Completed)
4. Save as: `09-dashboard-with-tournaments.png`

**Screenshot 10: Filter tabs**
1. Ensure cursor is near filter tabs (Active/Completed/Archived)
2. Capture top portion of dashboard
3. Save as: `10-filter-tabs.png`

**Screenshot 11: Tournament card details**
1. Zoom in on a single tournament card
2. Show all card elements (name, players, status, actions)
3. Save as: `11-tournament-card-details.png`

**Screenshot 12: Delete confirmation dialog**
1. Click Delete on a tournament
2. Capture confirmation modal
3. Save as: `12-delete-confirmation.png`

---

### Folder 04: Tournament Creation (screenshots/04-tournament-creation/)

**Screenshot 13: Tournament creation form**
1. Click "Create Tournament"
2. Show empty form with all fields visible
3. Save as: `13-tournament-creation-form.png`

**Screenshot 14: Tournament structure options**
1. Fill in name and description
2. Scroll to show game type and format selection
3. Save as: `14-tournament-structure-options.png`

**Screenshot 15: Scoring rules configuration**
1. Continue in same form
2. Scroll to scoring rules section
3. Show match format dropdown expanded
4. Save as: `15-scoring-rules-config.png`

**Screenshot 16: Tournament summary**
1. Fill out entire form
2. Scroll back to top showing all filled data
3. Save as: `16-tournament-summary.png`

**Screenshot 17: Creation success**
1. Click Create
2. Capture success message/toast notification
3. Or capture newly created tournament opened
4. Save as: `17-creation-success.png`

---

### Folder 05: Registration (screenshots/05-registration/)

**Screenshot 18: Participants tab**
1. Navigate to Participants (👥) tab
2. Show player list (add 5-10 sample players first)
3. Save as: `18-participants-tab.png`

**Screenshot 19: Add player modal**
1. Click "+ Add Player"
2. Capture modal with form fields
3. Save as: `19-add-player-modal.png`

**Screenshot 20: Paid/unpaid status**
1. In player list, show mix of paid ✅ and unpaid ⚠️ players
2. Zoom to show status indicators clearly
3. Save as: `20-paid-unpaid-status.png`

**Screenshot 21: Registration settings**
1. Go to Setup Info (📋) tab
2. Scroll to registration section
3. Show toggle and date picker
4. Save as: `21-registration-settings.png`

**Screenshot 22: Public registration form**
1. Copy public registration URL
2. Open in new browser window (incognito mode)
3. Capture public-facing registration form
4. Save as: `22-public-registration-form.png`

**Screenshot 23: Participant management**
1. Back in Participants tab
2. Show action buttons (Check-in All, Export, etc.)
3. Save as: `23-participant-management.png`

**Screenshot 24: Edit player modal**
1. Click edit icon on a player
2. Capture edit modal with filled data
3. Save as: `24-edit-player-modal.png`

**Screenshot 25: Doubles team pairing**
1. Create doubles tournament
2. Add players with Team IDs
3. Show team pairing interface
4. Save as: `25-doubles-team-pairing.png`

**Screenshot 26: Team list view**
1. Show team list with pairs displayed as "Player A & Player B"
2. Save as: `26-team-list-view.png`

---

### Folder 06: Setup & Configuration (screenshots/06-setup-config/)

**Screenshot 27: Tournament details**
1. Navigate to Setup Info (📋) tab
2. Show tournament details section
3. Save as: `27-tournament-details.png`

**Screenshot 28: Scoring rules**
1. Scroll to scoring configuration section
2. Show match format, points system
3. Save as: `28-scoring-rules.png`

**Screenshot 29: Advanced settings**
1. Scroll to advanced settings
2. Show tiebreaker rules, etc.
3. Save as: `29-advanced-settings.png`

**Screenshot 30: Player seeding**
1. Go to Group Configuration (⚙️) tab
2. Show player list with drag handles
3. Save as: `30-player-seeding.png`

**Screenshot 31: Professional seeding applied**
1. Click "Apply Professional Seeding"
2. Show players reordered with seed numbers
3. Save as: `31-professional-seeding.png`

**Screenshot 32: Group generation controls**
1. Show group configuration form
2. Number of groups, players per group
3. Save as: `32-group-generation-controls.png`

**Screenshot 33: Generated groups preview**
1. Click "Generate Groups"
2. Show groups A, B, C, D with players distributed
3. Save as: `33-generated-groups-preview.png`

**Screenshot 34: Board assignment per group**
1. Scroll to board management section
2. Show board input and assignment dropdowns
3. Save as: `34-board-assignment-per-group.png`

**Screenshot 35: Board assignment interface**
1. Add boards 1-4
2. Assign to different groups
3. Show full interface
4. Save as: `35-board-assignment-interface.png`

---

### Folder 07: Group Stage (screenshots/07-group-stage/)

**Screenshot 36: Match format selection**
1. Navigate to Group Stage (🎯) tab
2. Show match format configuration before creating matches
3. Save as: `36-match-format-selection.png`

**Screenshot 37: Group stage creation**
1. Click "Create Group Stage Matches"
2. Capture confirmation or progress indicator
3. Save as: `37-group-stage-creation.png`

**Screenshot 38: Match schedule**
1. Show full match schedule with multiple groups
2. Display matches in different states (pending, completed)
3. Save as: `38-match-schedule.png`

**Screenshot 39: Match scoring modal**
1. Click on a match to score
2. Capture scoring modal with +/- buttons
3. Save as: `39-match-scoring-modal.png`

**Screenshot 40: Completed match**
1. Complete a match
2. Show match card with green checkmark and final score
3. Save as: `40-completed-match.png`

**Screenshot 41: Match actions menu**
1. Hover/click on match to show actions
2. Capture actions (Edit, Delete, Reset)
3. Save as: `41-match-actions-menu.png`

**Screenshot 42: Group standings table**
1. Scroll to standings section
2. Show full standings table for one group
3. Save as: `42-group-standings-table.png`

**Screenshot 43: Tiebreaker visualization**
1. Create a tie scenario (2 players with same points)
2. Show tiebreaker indicator
3. Save as: `43-tiebreaker-visualization.png`

**Screenshot 44: Completion progress**
1. Show progress bar: "X/Y matches completed"
2. Capture when partially complete
3. Save as: `44-completion-progress.png`

---

### Folder 08: Board Manager (screenshots/08-board-manager/)

**Screenshot 45: Board Manager main**
1. Navigate to Board Manager (🎲) tab
2. Show all boards with current matches
3. Save as: `45-board-manager-main.png`

**Screenshot 46: Add board interface**
1. Click "+ Add Board"
2. Capture add board modal/form
3. Save as: `46-add-board-interface.png`

**Screenshot 47: Board assignment dropdown**
1. In match scoring modal, show board selection dropdown
2. Save as: `47-board-assignment-dropdown.png`

**Screenshot 48: Board call in action**
1. Mark match as "In Progress" and select board
2. Capture confirmation that board call was sent
3. Save as: `48-board-call-action.png`

**Screenshot 49: Board call email**
1. Check email inbox (use your email from a test player)
2. Open board call email
3. Capture full email content
4. Save as: `49-board-call-email.png`

**Screenshot 50: Board display screen**
1. Navigate to Display (📺) view
2. Show large-screen board display
3. Save as: `50-board-display-screen.png`

---

### Folder 09: Knockout Bracket (screenshots/09-knockout-bracket/)

**Screenshot 51: Knockout configuration**
1. Complete all group matches
2. Show knockout configuration panel in Group Stage tab
3. Save as: `51-knockout-configuration.png`

**Screenshot 52: Match format selection**
1. In knockout config, show format dropdown expanded
2. Save as: `52-knockout-format-selection.png`

**Screenshot 53: Bracket generation**
1. Click "Start Knockout Bracket"
2. Capture loading/processing state
3. Save as: `53-bracket-generation.png`

**Screenshot 54: Full bracket tree**
1. Navigate to Knockout Bracket (🏆) tab
2. Show full bracket tree view
3. Capture all rounds horizontally
4. Save as: `54-full-bracket-tree.png`

**Screenshot 55: List view**
1. Toggle to List View
2. Show matches in table format
3. Save as: `55-knockout-list-view.png`

**Screenshot 56: Knockout scoring modal**
1. Click match in bracket
2. Show scoring modal for knockout match
3. Save as: `56-knockout-scoring-modal.png`

**Screenshot 57: Board selection**
1. In knockout scoring, show board selection
2. Save as: `57-knockout-board-selection.png`

**Screenshot 58: Winner advancing**
1. Complete a knockout match
2. Show winner's name appearing in next round
3. Use arrows or highlighting to show progression
4. Save as: `58-winner-advancing.png`

**Screenshot 59: Round labels**
1. Zoom to show round labels (Quarter Finals, Semi Finals, Final)
2. Save as: `59-round-labels.png`

**Screenshot 60: Championship match**
1. Show final match (championship)
2. Save as: `60-championship-match.png`

**Screenshot 61: Tournament completion**
1. Complete final match
2. Capture winner announcement/confetti
3. Save as: `61-tournament-completion.png`

---

### Folder 10: Scoring (screenshots/10-scoring/)

**Screenshot 62: Universal scoring modal**
1. Open any match scoring modal
2. Show full modal with all elements labeled
3. Save as: `62-universal-scoring-modal.png`

**Screenshot 63: Scoring step-by-step**
1. Create 3-image sequence showing:
   - Initial state (0-0)
   - After first leg (1-0)
   - After second leg (1-1)
2. Save as: `63-scoring-step1.png`, `63-scoring-step2.png`, `63-scoring-step3.png`

**Screenshot 64: Match completion confirmation**
1. After clicking "Complete Match"
2. Capture success toast/notification
3. Save as: `64-match-completion-confirmation.png`

**Screenshot 65: Edit completed match**
1. Click on completed match to reopen
2. Show editable scores
3. Save as: `65-edit-completed-match.png`

---

### Folder 11: Standings (screenshots/11-standings/)

**Screenshot 66: Scoreboard main view**
1. Navigate to Standings/Scoreboard (📊) tab
2. Show main view with tabs
3. Save as: `66-scoreboard-main-view.png`

**Screenshot 67: Group standings detailed**
1. Click Group Standings tab
2. Show full standings table for all groups
3. Save as: `67-group-standings-detailed.png`

**Screenshot 68: Qualifying indicators**
1. Zoom in on standings showing qualifying positions (green)
2. Save as: `68-qualifying-indicators.png`

**Screenshot 69: Knockout standings**
1. Click Knockout Standings tab
2. Show knockout performance table
3. Save as: `69-knockout-standings.png`

**Screenshot 70: Knockout phase indicators**
1. Zoom to show "Finalist", "Semi-Finals", etc.
2. Save as: `70-knockout-phase-indicators.png`

**Screenshot 71: Overall standings**
1. Click Tournament Standings tab
2. Show combined overall rankings
3. Save as: `71-overall-standings.png`

**Screenshot 72: Final rankings**
1. Show completed tournament with 1st, 2nd, 3rd places
2. Include trophy icons
3. Save as: `72-final-rankings.png`

**Screenshot 73: Real-time updates**
1. Capture standings before and after completing a match
2. Use annotations to show what changed
3. Save as: `73-realtime-updates-before.png` and `73-realtime-updates-after.png`

---

### Folder 12: Email Notifications (screenshots/12-email-notifications/)

**Screenshot 74: Board call email template**
1. Open board call email
2. Show full email with formatting
3. Save as: `74-board-call-email-template.png`

**Screenshot 75: Board call in inbox**
1. Show email client inbox view with board call email
2. Save as: `75-board-call-in-inbox.png`

**Screenshot 76: Registration confirmation**
1. Complete public registration
2. Check email for confirmation
3. Capture full confirmation email
4. Save as: `76-registration-confirmation.png`

**Screenshot 77: Password reset email**
1. Use "Forgot password?" feature
2. Check email for reset link
3. Capture email
4. Save as: `77-password-reset-email.png`

**Screenshot 78: SMTP configuration**
1. Log into Supabase dashboard
2. Navigate to Auth → SMTP Settings
3. Capture configuration page (blur sensitive data)
4. Save as: `78-smtp-configuration.png`

**Screenshot 79: Email delivery status**
1. If app has email logs/status, capture that
2. Or show successful email delivery confirmation
3. Save as: `79-email-delivery-status.png`

---

### Folder 13: Tournament Display (screenshots/13-tournament-display/)

**Screenshot 80: Display button location**
1. In tournament view, show where Display (📺) button is
2. Use arrow annotation
3. Save as: `80-display-button-location.png`

**Screenshot 81: Display full view**
1. Click Display to open full-screen view
2. Capture full screen showing tournament info
3. Save as: `81-display-full-view.png`

**Screenshot 82: Current matches display**
1. Capture when display shows "Current Matches" section
2. Save as: `82-current-matches-display.png`

**Screenshot 83: Standings display**
1. Wait for rotation to standings
2. Capture standings in display view
3. Save as: `83-standings-display.png`

**Screenshot 84: Upcoming matches display**
1. Wait for rotation to upcoming matches
2. Capture upcoming section
3. Save as: `84-upcoming-matches-display.png`

**Screenshot 85: Display settings**
1. Access display settings (press ESC and find settings)
2. Capture settings panel
3. Save as: `85-display-settings.png`

**Screenshot 86: Single board display**
1. Filter display to single board
2. Show board-specific view
3. Save as: `86-single-board-display.png`

---

### Folder 14: Settings (screenshots/14-settings/)

**Screenshot 87: Settings page overview**
1. Navigate to Settings (⚙️) tab
2. Capture full settings page
3. Save as: `87-settings-page-overview.png`

**Screenshot 88: General settings**
1. Show general settings section
2. Save as: `88-general-settings.png`

**Screenshot 89: Email toggles**
1. Show email notification settings with toggles
2. Save as: `89-email-toggles.png`

**Screenshot 90: Advanced settings**
1. Scroll to advanced options
2. Capture advanced settings section
3. Save as: `90-advanced-settings.png`

**Screenshot 91: User account settings**
1. Click profile icon (top-right)
2. Show account dropdown/modal
3. Save as: `91-user-account-settings.png`

**Screenshot 92: Profile dropdown**
1. Show expanded profile menu
2. Capture options (Profile, Settings, Sign Out)
3. Save as: `92-profile-dropdown.png`

**Screenshot 93: Export data options**
1. Find export data button/section
2. Capture export dialog
3. Save as: `93-export-data-options.png`

**Screenshot 94: Export confirmation**
1. Click export
2. Capture confirmation or download prompt
3. Save as: `94-export-confirmation.png`

**Screenshot 95: Backup options**
1. If backup feature exists, capture it
2. Or capture export as backup method
3. Save as: `95-backup-options.png`

---

### Folder 15: Troubleshooting (screenshots/15-troubleshooting/)

For these, you'll need to trigger errors intentionally.

**Screenshot 96: Sign-in error**
1. Enter wrong password
2. Capture error message
3. Save as: `96-signin-error.png`

**Screenshot 97: Email error**
1. Try sending email without SMTP configured
2. Capture error notification
3. Save as: `97-email-error.png`

**Screenshot 98: Email config check**
1. Show where to verify email config
2. Save as: `98-email-config-check.png`

**Screenshot 99: Empty match list**
1. Before creating matches, show empty state
2. Capture "No matches found" message
3. Save as: `99-empty-match-list.png`

**Screenshot 100: Score save error**
1. Disconnect internet
2. Try to save score
3. Capture error
4. Save as: `100-score-save-error.png`

**Screenshot 101: Launch error**
1. If app fails to launch, capture error dialog
2. Or use generic Windows error dialog
3. Save as: `101-launch-error.png`

**Screenshot 102: Windows Defender bypass**
1. Show Windows Security warning about unknown app
2. Capture "Run anyway" steps
3. Save as: `102-windows-defender-bypass.png`

**Screenshot 103: Bracket generation error**
1. Try generating bracket without completing matches
2. Capture error message
3. Save as: `103-bracket-generation-error.png`

**Screenshot 104: RLS policy error**
1. If you've seen this error, capture it
2. Or create mock error message
3. Save as: `104-rls-policy-error.png`

**Screenshot 105: Unauthorized error**
1. Let session expire
2. Try action and capture 401 error
3. Save as: `105-unauthorized-error.png`

**Screenshot 106: Network error**
1. Disconnect internet
2. Try to load data
3. Capture network error
4. Save as: `106-network-error.png`

**Screenshot 107: Rate limit error**
1. If possible, trigger rate limit
2. Or create mock error
3. Save as: `107-rate-limit-error.png`

---

### Folder 16: Shortcuts (screenshots/16-shortcuts/)

**Screenshot 108: Shortcuts reference card**
1. Create a visual reference card in PowerPoint or Photoshop
2. List all keyboard shortcuts with icons
3. Make it print-friendly (8.5x11 or A4)
4. Save as: `108-shortcuts-reference-card.png`

---

## Screenshot Editing Tips

### Use Annotations
- **Arrow:** Point to specific UI elements
- **Box:** Highlight important areas
- **Text:** Label elements for clarity
- **Blur:** Hide sensitive data (emails, API keys)

### Recommended Tools
1. **Greenshot (Free):** Best for annotations
   - Download: https://getgreenshot.org/
   - Built-in annotation editor
   - Hotkey: Print Screen

2. **ShareX (Free):** Advanced features
   - Download: https://getsharex.com/
   - Auto-upload and annotation

3. **Snagit (Paid):** Professional tool
   - Best for creating step-by-step guides
   - Video capture capability

### Image Optimization
After capturing all screenshots:
```powershell
# Install ImageMagick (optional)
# Then batch convert to optimize size:
# mogrify -quality 85 -resize 1920x1080> *.png
```

---

## Creating the Final User Manual Package

### Step 1: Verify All Screenshots
Run this PowerShell script to check for missing screenshots:

```powershell
$folders = @(
    "01-installation",
    "02-getting-started",
    "03-dashboard",
    "04-tournament-creation",
    "05-registration",
    "06-setup-config",
    "07-group-stage",
    "08-board-manager",
    "09-knockout-bracket",
    "10-scoring",
    "11-standings",
    "12-email-notifications",
    "13-tournament-display",
    "14-settings",
    "15-troubleshooting",
    "16-shortcuts"
)

foreach ($folder in $folders) {
    $path = "D:\CGC-Tournament-Manager\standalone-cgcdarts-tournament-manager-exe-program\CGC-Tournament-Manager-v1.0.0-Windows\screenshots\$folder"
    $count = (Get-ChildItem -Path $path -Filter *.png).Count
    Write-Host "$folder : $count screenshots"
}
```

### Step 2: Generate PDF Version
You can convert the Markdown manual to PDF:

1. **Using VS Code:**
   - Install "Markdown PDF" extension
   - Open `CGC_TOURNAMENT_MANAGER_USER_MANUAL.md`
   - Right-click → "Markdown PDF: Export (pdf)"

2. **Using Pandoc (Command Line):**
   ```bash
   pandoc CGC_TOURNAMENT_MANAGER_USER_MANUAL.md -o CGC_TOURNAMENT_MANAGER_USER_MANUAL.pdf --toc
   ```

3. **Using Online Converter:**
   - https://www.markdowntopdf.com/
   - Upload MD file → Download PDF

### Step 3: Create Quick Start Guide
Extract key sections for a shorter 2-4 page quick start guide:
- Installation
- First Tournament Setup
- Basic Scoring
- Common Tasks

### Step 4: Package Everything
```powershell
# Create final distribution with manual
cd "D:\CGC-Tournament-Manager\standalone-cgcdarts-tournament-manager-exe-program\CGC-Tournament-Manager-v1.0.0-Windows"

# Copy files
Copy-Item "..\..\CGC_TOURNAMENT_MANAGER_USER_MANUAL.md" .
Copy-Item "..\..\CGC_TOURNAMENT_MANAGER_USER_MANUAL.pdf" .

# Update README to reference manual
```

---

## Estimated Time
- **Installation Screenshots:** 30 minutes
- **Feature Screenshots:** 3-4 hours
- **Error/Troubleshooting Screenshots:** 1 hour
- **Annotation and Editing:** 2 hours
- **Total:** ~7 hours

## Tips for Efficiency
1. **Use multiple test accounts** to capture emails
2. **Create template tournament** with sample data you can reset
3. **Batch similar screenshots** (all modals together, all dropdowns, etc.)
4. **Use consistent window sizing** throughout
5. **Save raw and annotated versions** separately

---

**Once complete, users will have a fully illustrated, professional user manual! 📚**
