# CGC Tournament Manager - User Manual
## Complete Guide with Instructions and Screenshots

**Version 1.0.0**  
**Last Updated: January 25, 2026**

---

## Table of Contents

1. [Installation](#installation)
2. [Getting Started](#getting-started)
3. [Dashboard Overview](#dashboard-overview)
4. [Creating a Tournament](#creating-a-tournament)
5. [Player Registration](#player-registration)
6. [Tournament Setup & Configuration](#tournament-setup--configuration)
7. [Group Stage Management](#group-stage-management)
8. [Board Manager](#board-manager)
9. [Knockout Bracket](#knockout-bracket)
10. [Scoring Matches](#scoring-matches)
11. [Standings & Scoreboard](#standings--scoreboard)
12. [Email Notifications](#email-notifications)
13. [Tournament Display](#tournament-display)
14. [Settings & Advanced Features](#settings--advanced-features)
15. [Troubleshooting](#troubleshooting)
16. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Installation

### System Requirements
- **Operating System:** Windows 10 or later (64-bit)
- **RAM:** 4 GB minimum (8 GB recommended)
- **Storage:** 500 MB free space
- **Internet Connection:** Required for database access and email notifications

### Installation Steps

**📸 Screenshot Location: `screenshots/01-installation/`**

1. **Download the Installer**
   - Extract `CGC-Tournament-Manager-v1.0.0-Windows.zip`
   - You should see three files:
     - `CGC Tournament Manager-Setup-1.0.0.exe` (installer)
     - `README.txt` (quick instructions)
     - `LICENSE.txt` (software license)

2. **Run the Installer**
   - Double-click `CGC Tournament Manager-Setup-1.0.0.exe`
   - Windows may show a security warning: "Unknown Publisher"
   - Click **"More info"** → **"Run anyway"**

3. **Installation Wizard**
   - Choose installation directory (default: `C:\Users\[YourName]\AppData\Local\Programs\cgc-tournament-manager`)
   - Select whether to create desktop shortcut
   - Click **Install**

4. **Launch the Application**
   - Use desktop shortcut or Start Menu
   - First launch may take 10-15 seconds

**📸 Screenshot 1:** Installation wizard welcome screen  
**📸 Screenshot 2:** Windows SmartScreen bypass steps  
**📸 Screenshot 3:** Installation directory selection  
**📸 Screenshot 4:** Application launching for first time

---

## Getting Started

### First Launch

**📸 Screenshot Location: `screenshots/02-getting-started/`**

When you launch CGC Tournament Manager for the first time:

1. **Sign In Screen**
   - If you don't have an account, click **"Don't have an account? Sign Up"**
   - Enter your email and create a secure password
   - Check your email for verification (may take 1-2 minutes)

2. **Forgot Password**
   - Click **"Forgot password?"** below the password field
   - Enter your email address
   - Check email for password reset link
   - Link expires in 1 hour

**📸 Screenshot 5:** Sign-in screen  
**📸 Screenshot 6:** Sign-up form  
**📸 Screenshot 7:** Forgot password modal

### User Interface Overview

The application uses a dark theme with orange accents (#ff6b35) for better visibility in tournament venues.

**Main Navigation Elements:**
- **Top Bar:** Tournament name and navigation tabs
- **Side Navigation:** Quick access to all tournament sections
- **Action Buttons:** Large, touch-friendly buttons for key actions

**📸 Screenshot 8:** Main dashboard with labeled UI elements

---

## Dashboard Overview

The Dashboard is your command center for managing all tournaments.

**📸 Screenshot Location: `screenshots/03-dashboard/`**

### Dashboard Sections

1. **Filter Tabs**
   - **Active:** Ongoing tournaments (default view)
   - **Completed:** Finished tournaments
   - **Archived:** Tournaments moved to archive

2. **Tournament Cards**
   Each card displays:
   - Tournament name and description
   - Game type (Singles/Doubles)
   - Player/Team count
   - Status (Setup, In Progress, Completed)
   - Quick actions: Open, Archive, Delete

3. **Statistics**
   - Total tournaments
   - Active tournaments
   - Total players across all tournaments

4. **Create Tournament Button**
   - Large **"+ Create Tournament"** button at top-right
   - Opens tournament creation wizard

**📸 Screenshot 9:** Dashboard with multiple tournament cards  
**📸 Screenshot 10:** Filter tabs (Active/Completed/Archived)  
**📸 Screenshot 11:** Tournament card details and actions

### Dashboard Actions

**Creating a New Tournament:**
1. Click **"+ Create Tournament"**
2. Fill in tournament details (see next section)

**Opening a Tournament:**
1. Click anywhere on a tournament card
2. Opens tournament management interface

**Archiving a Tournament:**
1. Click **"Archive"** on tournament card
2. Confirm archiving
3. Find in **"Archived"** tab to restore later

**Deleting a Tournament:**
1. Click **"Delete"** on tournament card
2. Confirm deletion (⚠️ **Warning:** This cannot be undone!)
3. All players, matches, and scores are permanently deleted

**📸 Screenshot 12:** Delete confirmation dialog

---

## Creating a Tournament

**📸 Screenshot Location: `screenshots/04-tournament-creation/`**

### Tournament Setup Wizard

When you click **"Create Tournament"**, a wizard guides you through setup:

#### Step 1: Basic Information

**📸 Screenshot 13:** Tournament creation form

**Required Fields:**
- **Tournament Name:** e.g., "Spring Championships 2026"
- **Description:** Brief overview of the event
- **Game Type:** 
  - **Singles:** Individual players compete
  - **Doubles:** Teams of 2 compete

**Optional Fields:**
- **Start Date:** When tournament begins
- **Location:** Venue name and address
- **Registration Price:** Entry fee (e.g., $10.00)
- **Registration Enabled:** Toggle to open/close registration

#### Step 2: Tournament Structure

**📸 Screenshot 14:** Tournament structure options

**Format Selection:**
- **Round Robin Only:** All players face each other in groups
- **Round Robin + Knockout:** Group stage followed by single-elimination
- **Knockout Only:** Direct single-elimination bracket

**Group Configuration:**
- **Number of Groups:** 2-16 groups
- **Players per Group:** 2-12 players per group
- **Players Advancing:** Top 1, 2, or 3 players per group advance to knockout

#### Step 3: Scoring Rules

**📸 Screenshot 15:** Scoring rules configuration

**Match Format:**
- **Best of 3:** First to 2 legs wins
- **Best of 5:** First to 3 legs wins
- **Best of 7:** First to 4 legs wins
- **Best of 9:** First to 5 legs wins
- **Custom:** Define your own format

**Points System:**
- **Win:** 3 points (default)
- **Loss:** 0 points (default)
- **Tie:** 1 point (default)

**Tiebreaker Rules:**
1. Head-to-head record
2. Leg differential (+/-)
3. Total legs won
4. Coin flip (manual)

#### Step 4: Review & Create

**📸 Screenshot 16:** Tournament summary before creation

Review all settings and click **"Create Tournament"**

**📸 Screenshot 17:** Tournament created successfully

---

## Player Registration

**📸 Screenshot Location: `screenshots/05-registration/`**

### Registration Methods

#### Method 1: Manual Entry (Tournament Organizer)

1. **Navigate to Participants Tab**
   - Click **"👥 Participants"** in tournament navigation
   
   **📸 Screenshot 18:** Participants tab with player list

2. **Add Player**
   - Click **"+ Add Player"** button
   - Enter player information:
     - **Name:** Player's full name
     - **Email:** Optional (required for email notifications)
     - **Team ID:** Required for doubles (e.g., "Team A")
   - Click **"Add"**

   **📸 Screenshot 19:** Add player modal

3. **Mark as Paid**
   - Toggle **"Paid"** switch next to player name
   - Paid players appear with green checkmark ✅
   - Unpaid players appear with orange icon ⚠️

   **📸 Screenshot 20:** Player list showing paid/unpaid status

#### Method 2: Public Registration Link

1. **Enable Registration**
   - Go to **"📋 Setup Info"** tab
   - Toggle **"Registration Enabled"** to ON
   - Set registration close date/time

   **📸 Screenshot 21:** Registration settings enabled

2. **Share Registration Link**
   - Copy the public registration URL
   - Format: `https://[your-site]/register/[tournament-id]`
   - Share via email, social media, or QR code

   **📸 Screenshot 22:** Public registration form (player view)

3. **Players Self-Register**
   - Players fill out their information
   - Automatically added to participant list
   - Marked as unpaid by default

### Managing Participants

**📸 Screenshot Location: `screenshots/05-registration/`**

**Bulk Actions:**
- **Check-in All:** Mark all players as present
- **Mark All Paid:** Update payment status for all
- **Export List:** Download participant list as CSV

**Individual Actions:**
- **Edit:** Modify player information
- **Delete:** Remove player from tournament
- **Send Email:** Send individual notification

**📸 Screenshot 23:** Participant management controls  
**📸 Screenshot 24:** Player details edit modal

### Doubles Tournament - Team Management

**📸 Screenshot 25:** Doubles team pairing

For doubles tournaments:
1. **Assign Team IDs**
   - Each pair must have matching Team ID
   - Example: Player 1 & Player 2 both have "Team Alpha"

2. **Solo Players**
   - Players without Team ID appear as individuals
   - System treats each as a separate "team"

3. **Team Display**
   - Teams shown as "Player A & Player B"
   - Team count displayed separately from player count

**📸 Screenshot 26:** Doubles team list view

---

## Tournament Setup & Configuration

**📸 Screenshot Location: `screenshots/06-setup-config/`**

### Setup Info Tab (📋)

This tab contains all tournament metadata and rules.

#### Tournament Details

**📸 Screenshot 27:** Tournament details section

- **Name & Description:** Edit tournament information
- **Start Date:** Tournament start time
- **Location:** Venue information
- **Registration Price:** Entry fee amount
- **Registration Status:** Open/Closed toggle

#### Scoring Configuration

**📸 Screenshot 28:** Scoring rules section

- **Match Format:** Best of X legs
- **Play Style:** Round-robin, Knockout, or Both
- **Points System:** Win/Loss/Tie point values
- **Legs per Match:** Number of legs to play

#### Advanced Settings

**📸 Screenshot 29:** Advanced tournament settings

- **Tiebreaker Rules:** Priority order for breaking ties
- **Board Assignment:** Automatic or manual
- **Email Notifications:** Enable/disable automated emails
- **Scoring Mode:** Legs vs Sets

### Group Configuration Tab (⚙️)

**📸 Screenshot Location: `screenshots/06-setup-config/`**

This is where you organize players into groups and configure the bracket.

#### Player Seeding

**📸 Screenshot 30:** Player seeding interface

1. **Drag & Drop Seeding**
   - Players listed by registration order
   - Drag players up/down to change seed ranking
   - Seed #1 is strongest player, #2 second strongest, etc.

2. **Professional Seeding**
   - Click **"Apply Professional Seeding"**
   - System distributes strong players evenly across groups
   - Based on snake draft algorithm

   **📸 Screenshot 31:** Professional seeding applied

#### Group Generation

**📸 Screenshot 32:** Group generation controls

1. **Set Group Parameters**
   - **Number of Groups:** 2, 4, 8, or custom
   - **Players per Group:** Balanced distribution

2. **Generate Groups**
   - Click **"Generate Groups"**
   - System creates balanced groups based on seeding
   - Review group assignments

   **📸 Screenshot 33:** Generated groups preview

3. **Manual Adjustments**
   - Drag players between groups if needed
   - Keep groups balanced (equal or ±1 player)

#### Board Assignment

**📸 Screenshot 34:** Board assignment per group

1. **Add Boards**
   - Click **"+ Add Board"**
   - Enter board numbers (e.g., 1, 2, 3...)

2. **Assign to Groups**
   - Use dropdown to assign boards to groups
   - Multiple boards per group recommended for 6+ players
   - Example: Group A uses Boards 1-2, Group B uses Boards 3-4

**📸 Screenshot 35:** Board assignment interface

**Board Assignment Tips:**
- Small groups (2-3 players): 1 board
- Medium groups (4-6 players): 2 boards
- Large groups (7+ players): 3+ boards

---

## Group Stage Management

**📸 Screenshot Location: `screenshots/07-group-stage/`**

The Group Stage tab (🎯) is where round-robin matches are scheduled and scored.

### Creating the Group Stage

1. **Navigate to Group Stage Tab**
   - Click **"🎯 Group Stage"** in navigation

2. **Configure Match Format**
   **📸 Screenshot 36:** Match format selection
   
   - **Match Format:** Best of 3, 5, 7, 9, or custom
   - **Play Style:** Round Robin
   - **Legs per Match:** Number of legs for best-of format

3. **Create Group Stage**
   - Click **"Create Group Stage Matches"**
   - System generates all round-robin matches
   - Each player faces every other player in their group once

   **📸 Screenshot 37:** Group stage creation confirmation

### Match Schedule Display

**📸 Screenshot 38:** Group stage match schedule

The schedule shows:
- **Group Name:** A, B, C, etc.
- **Match Number:** Sequential within group
- **Players:** Player 1 vs Player 2
- **Board Assignment:** Which board to use
- **Status:** Pending, In Progress, Completed
- **Score:** Final legs won (e.g., 2-0, 2-1)

### Scoring a Match

**📸 Screenshot Location: `screenshots/07-group-stage/`**

1. **Click Match Card**
   - Opens scoring modal

   **📸 Screenshot 39:** Match scoring modal

2. **Enter Scores**
   - Use large **+** buttons to increment legs won
   - Use **-** buttons to decrement if mistake
   - Score shown in real-time: "Player A: 2 | Player B: 1"

3. **Mark as In Progress** (Optional)
   - Click **"Mark In Progress"**
   - Select board number
   - Enables board call emails

4. **Complete Match**
   - Click **"Complete Match"**
   - Automatically updates standings
   - Match card turns green ✅

   **📸 Screenshot 40:** Completed match display

### Match Management

**📸 Screenshot 41:** Match actions menu

**Actions per Match:**
- **Edit Score:** Modify completed match score
- **Delete Match:** Remove match from schedule
- **Reset:** Clear score and return to pending
- **Send Board Call:** Email players their board assignment

### Group Standings

**📸 Screenshot 42:** Live group standings table

Automatically updated after each match:
- **Rank:** 1st, 2nd, 3rd, etc.
- **Player Name:** With team info if doubles
- **Wins/Losses:** Match record
- **Legs For/Against:** Total legs won and lost
- **Leg Differential:** +/- difference
- **Points:** Based on W-L record

**Tiebreaker Indicators:**
- 🏆 Head-to-head winner shown if tied on points

**📸 Screenshot 43:** Tiebreaker visualization

### Completing Group Stage

1. **Complete All Matches**
   - All matches must show green checkmark ✅
   - Progress bar: "48/48 matches completed"

   **📸 Screenshot 44:** Group stage completion progress

2. **Review Final Standings**
   - Verify all groups have correct rankings
   - Check for any ties needing manual resolution

3. **Proceed to Knockout**
   - System automatically enables knockout bracket configuration
   - See next section: Knockout Bracket

---

## Board Manager

**📸 Screenshot Location: `screenshots/08-board-manager/`**

The Board Manager (🎲) is your command center for assigning players to physical dartboards.

### Board Manager Overview

**📸 Screenshot 45:** Board Manager main screen

The Board Manager displays:
- All boards in use
- Current match on each board
- Match status (Pending, In Progress, Completed)
- Quick actions to call players

### Adding Boards

**📸 Screenshot 46:** Add board interface

1. **Click "+ Add Board"**
2. **Enter Board Number:** 1, 2, 3, etc.
3. **Optional: Add Location:** "Main Room", "Side Area"
4. **Click "Create"**

### Assigning Matches to Boards

**📸 Screenshot 47:** Board assignment dropdown

**Automatic Assignment:**
- System uses rotation formula: `(matchIndex + round) % boards + 1`
- Distributes matches evenly across available boards

**Manual Assignment:**
1. Click match card
2. Select board from dropdown
3. Click **"Assign to Board X"**

### Board Call Feature

**📸 Screenshot 48:** Board call in action

When a match is marked "In Progress":
1. **System Identifies Match**
   - Match assigned to specific board
   - Players identified by email

2. **Email Sent Automatically**
   - Subject: "🎯 Board Call - [Tournament Name]"
   - Body: "Your match is ready on Board X"
   - Includes opponent name and match details

   **📸 Screenshot 49:** Board call email (player view)

3. **Board Status Updates**
   - Board shows "In Progress" status
   - Timer starts (optional feature)

### Board Display View

**📸 Screenshot 50:** Board display screen (projector view)

Large-screen display for venue:
- Shows all boards in grid layout
- Current match on each board
- Player names in large font
- Color-coded by status:
  - 🟢 Green: In progress
  - 🟡 Yellow: Pending
  - ⚫ Grey: Completed

---

## Knockout Bracket

**📸 Screenshot Location: `screenshots/09-knockout-bracket/`**

The Knockout Bracket (🏆) displays the single-elimination playoff tree.

### Generating the Bracket

#### Step 1: Configure Knockout Settings

**📸 Screenshot 51:** Knockout configuration panel

After group stage completion:
1. **Navigate to Group Stage Tab**
2. **Scroll to Knockout Configuration**
3. **Set Parameters:**
   - **Match Format:** Best of 3, 5, 7, 9
   - **Players Advancing:** Top 1, 2, or 3 per group
   - **Seeding Method:** Group winners seeded #1, runners-up #2, etc.

   **📸 Screenshot 52:** Knockout match format selection

#### Step 2: Generate Bracket

1. **Click "🏆 Start Knockout Bracket"**
2. **System Processes:**
   - Pulls top X players from each group
   - Seeds players by group performance
   - Creates single-elimination bracket
   - Generates all matches

   **📸 Screenshot 53:** Bracket generation in progress

3. **Navigate to Knockout Bracket Tab**
   - Click **"🏆 Knockout Bracket"** in navigation

### Bracket Display Modes

**📸 Screenshot Location: `screenshots/09-knockout-bracket/`**

#### Bracket View (Tree Layout)

**📸 Screenshot 54:** Full bracket tree view

- Visual tournament tree structure
- All rounds displayed horizontally
- Rounds labeled: Round 1, Quarter Finals, Semi Finals, Final
- Winner paths shown with connecting lines
- Match status color-coded:
  - ⚫ Grey: Not started
  - 🟡 Yellow: In progress
  - 🟢 Green: Completed

**Bracket Navigation:**
- Scroll horizontally to see all rounds
- Click match to open scoring modal
- Zoom in/out for better view (Ctrl + Mouse Wheel)

#### List View (Table Layout)

**📸 Screenshot 55:** Knockout matches list view

- All matches in chronological order
- Grouped by round
- Shows: Players, Board, Score, Status
- Better for mobile devices or small screens

**Toggle Button:** Top-right corner switches between views

### Scoring Knockout Matches

**📸 Screenshot Location: `screenshots/09-knockout-bracket/`**

1. **Click Match in Bracket**
   - Opens scoring modal

   **📸 Screenshot 56:** Knockout match scoring modal

2. **Enter Scores**
   - Use **+/-** buttons to adjust legs won
   - Format: "Best of 5 - First to 3"
   - Current score displayed: "Player A: 3 | Player B: 1"

3. **Mark as In Progress** (Optional)
   - Select board number
   - Sends board call emails to both players

   **📸 Screenshot 57:** Board selection for knockout match

4. **Complete Match**
   - Click **"Complete Match"**
   - Winner automatically advances to next round
   - Match turns green in bracket ✅
   - Next match populated with winner's name

   **📸 Screenshot 58:** Winner advancing in bracket

### Round Labels

**📸 Screenshot 59:** Round labels in bracket

The system automatically labels rounds based on participants:
- **64+ players:** "Round of 64", "Round of 32"
- **32 players:** "Round of 32", "Round of 16"
- **16 players:** "Round of 16", "Quarter Finals"
- **8 players:** "Quarter Finals", "Semi Finals"
- **4 players:** "Semi Finals", "Final"

### Championship

**📸 Screenshot 60:** Championship match display

When the final match is completed:
1. **Champion Declared**
   - Confetti animation 🎉
   - Winner name displayed in large text
   - Trophy icon 🏆

2. **Tournament Marked Complete**
   - Status changes to "Completed"
   - Appears in "Completed" tab on dashboard

   **📸 Screenshot 61:** Tournament completion screen

---

## Scoring Matches

**📸 Screenshot Location: `screenshots/10-scoring/`**

### Scoring Interface

**📸 Screenshot 62:** Universal scoring modal

The scoring modal is consistent across group stage and knockout:

**Top Section:**
- Match title: "Group A - Match 1" or "Quarter Final 1"
- Board assignment dropdown
- Match format reminder: "Best of 5 - First to 3"

**Player Sections:**
- **Player 1 (Left):**
  - Name and seed/group info
  - Large score display
  - **+** button: Increment legs won
  - **-** button: Decrement legs won

- **Player 2 (Right):**
  - Same layout as Player 1
  - Mirror design for clarity

**Bottom Actions:**
- **Mark In Progress:** Start match and send board calls
- **Complete Match:** Finalize score and update standings
- **Cancel:** Close without saving

### Scoring Workflow

**📸 Screenshot 63:** Scoring step-by-step

1. **Player Wins First Leg**
   - Click **+** under Player 1
   - Score: "Player 1: 1 | Player 2: 0"

2. **Player 2 Wins Second Leg**
   - Click **+** under Player 2
   - Score: "Player 1: 1 | Player 2: 1"

3. **Continue Until Winner Determined**
   - Best of 3: First to 2 wins
   - Best of 5: First to 3 wins
   - Score automatically validates

4. **Correct Mistakes**
   - Click **-** to reduce leg count
   - No negative scores allowed

5. **Complete Match**
   - Click **"Complete Match"**
   - Confirmation toast: "Match completed successfully ✅"

   **📸 Screenshot 64:** Match completion confirmation

### Undo/Edit Completed Match

**📸 Screenshot 65:** Edit completed match

If you need to fix a score:
1. **Click Completed Match**
2. **Edit Score:** Use +/- buttons
3. **Update Match:** Click "Complete Match" again
4. Standings recalculated automatically

---

## Standings & Scoreboard

**📸 Screenshot Location: `screenshots/11-standings/`**

### Scoreboard Tab (📊)

The Scoreboard displays live tournament standings and statistics.

**📸 Screenshot 66:** Scoreboard main view

#### Tab Navigation

Three tabs available:
1. **Group Standings:** Round-robin group rankings
2. **Knockout Standings:** Playoff bracket performance
3. **Tournament Standings:** Overall tournament rankings

### Group Standings View

**📸 Screenshot 67:** Group standings detailed view

**Display Per Group:**
- Group name (A, B, C...)
- Player rankings (1st, 2nd, 3rd...)
- **Statistics:**
  - **W-L:** Win-loss record
  - **Legs For:** Total legs won
  - **Legs Against:** Total legs lost
  - **Differential:** +/- leg difference
  - **Points:** Total points earned
  - **Qualifying:** ✅ if advancing to knockout

**Color Coding:**
- 🟢 Green: Qualifying position
- 🟡 Yellow: Bubble (just outside qualifying)
- ⚫ Grey: Eliminated

**📸 Screenshot 68:** Qualifying indicators

### Knockout Standings View

**📸 Screenshot 69:** Knockout standings table

Shows playoff performance:
- **Player Name**
- **Phase Reached:** Winner, Finalist, Semi-Finals, Quarter Finals, Round 1, etc.
- **Knockout Record:** W-L in playoff matches
- **Total Legs:** Legs won in knockout
- **Average:** Legs per match average

**Sorting:**
- Ordered by furthest round reached
- Ties broken by knockout record

**📸 Screenshot 70:** Knockout phase indicators

### Tournament Standings (Overall)

**📸 Screenshot 71:** Overall tournament standings

Combined view of entire tournament:
- **Rank:** Overall placement (1st, 2nd, 3rd...)
- **Player Name**
- **Stage:** Group Stage, Knockout, or Both
- **Total Record:** Combined W-L across all stages
- **Total Points:** Combined points earned
- **Phase Reached:** Highest achievement

**Final Rankings:**
- Champion: 🏆 1st place
- Runner-up: 🥈 2nd place
- Semi-finalists: 🥉 3rd-4th place
- Continuing down the bracket

**📸 Screenshot 72:** Final tournament rankings

### Live Updates

**📸 Screenshot 73:** Real-time standing updates

Standings update automatically when:
- Match is completed
- Score is edited
- Match is deleted

**Refresh Button:**
- Click 🔄 to manually refresh data
- Useful if multiple organizers are scoring

---

## Email Notifications

**📸 Screenshot Location: `screenshots/12-email-notifications/`**

CGC Tournament Manager can send automated email notifications to players.

### Email Types

#### 1. Board Call Emails

**📸 Screenshot 74:** Board call email template

**Sent When:** Match is marked "In Progress"

**Email Contains:**
- Tournament name
- Player name (personalized)
- Board number assignment
- Opponent name
- Match details (round, format)
- Call to action: "Proceed to Board X"

**Example:**
```
Subject: 🎯 Board Call - Spring Championships 2026

Hello John Smith,

Your match is ready to begin. Please proceed to your assigned board.

━━━━━━━━━━━━━━━━━
YOUR BOARD ASSIGNMENT
Board 3
━━━━━━━━━━━━━━━━━

YOUR MATCH
Quarter Final 2
John Smith vs Jane Doe
Best of 5 - First to 3

Good luck! 🎯
```

**📸 Screenshot 75:** Actual board call email in inbox

#### 2. Registration Confirmation

**📸 Screenshot 76:** Registration confirmation email

**Sent When:** Player registers via public link

**Email Contains:**
- Tournament name and details
- Registration confirmation
- Payment instructions (if applicable)
- Tournament start time and location
- Contact information

#### 3. Password Reset

**📸 Screenshot 77:** Password reset email

**Sent When:** User clicks "Forgot password?"

**Email Contains:**
- Password reset link (expires in 1 hour)
- Security notice
- Instructions

### Configuring Email Settings

**📸 Screenshot Location: `screenshots/12-email-notifications/`**

Emails are sent via your configured SMTP server (Supabase Auth + Resend).

**To configure:**
1. Go to Supabase Dashboard
2. Navigate to: **Project Settings** → **Auth** → **SMTP Settings**
3. Enter Resend API credentials:
   - **Host:** smtp.resend.com
   - **Port:** 465
   - **Username:** resend
   - **Password:** [Your Resend API Key]
   - **Sender Email:** verified email address

**📸 Screenshot 78:** SMTP configuration (Supabase dashboard)

### Email Requirements

**For players to receive emails:**
- Email address must be entered during registration
- Email must be valid and deliverable
- Player must consent to receive notifications (implied by providing email)

**Email Delivery:**
- Typically delivers within 1-2 seconds
- Check spam folder if not received
- Maximum 100 emails per day on free tier

**📸 Screenshot 79:** Email delivery status

---

## Tournament Display

**📸 Screenshot Location: `screenshots/13-tournament-display/`**

The Tournament Display (📺) is a large-screen view designed for projectors and TVs at the venue.

### Accessing Display View

**📸 Screenshot 80:** Display view button location

1. **Navigate to Any Tournament Tab**
2. **Click "📺 Display" in Top Menu**
3. **Display Opens in Full Screen**

Alternatively:
- Direct URL: `https://[your-site]/display/[tournament-id]`

### Display Features

**📸 Screenshot 81:** Tournament display full view

**Top Section:**
- **Tournament Logo/Name:** Large and prominent
- **Current Time:** Live clock
- **Stage Indicator:** "Group Stage" or "Knockout Stage"

**Main Content:**
Automatically rotates between:
1. **Current Matches** (30 seconds)
   - Shows matches in progress
   - Board assignments
   - Players names in large font

2. **Standings** (30 seconds)
   - Current group standings or knockout bracket
   - Top players highlighted

3. **Upcoming Matches** (20 seconds)
   - Next matches to be played
   - Board assignments

**📸 Screenshot 82:** Current matches display  
**📸 Screenshot 83:** Standings display  
**📸 Screenshot 84:** Upcoming matches display

### Display Customization

**📸 Screenshot 85:** Display settings

**Settings Available:**
- **Rotation Speed:** 10s, 20s, 30s, 60s
- **Content to Show:** Choose which sections to display
- **Theme:** Light or Dark mode
- **Font Size:** Small, Medium, Large, Extra Large

**Access Settings:**
- Press **ESC** to exit full screen
- Click **⚙️ Settings** in corner
- Adjust preferences
- Click **Apply**

### Board-Specific Display

**📸 Screenshot 86:** Single board display

For individual board screens:
1. **Access Display View**
2. **Press "B" Key**
3. **Select Board Number**
4. **Display Shows Only That Board's Matches**

Perfect for mounting tablets/screens at each board.

---

## Settings & Advanced Features

**📸 Screenshot Location: `screenshots/14-settings/`**

### Tournament Settings

**📸 Screenshot 87:** Settings page overview

Access via **"⚙️ Settings"** tab in tournament navigation.

#### General Settings

**📸 Screenshot 88:** General settings section

- **Tournament Visibility:** Public or Private
- **Allow Late Registration:** Enable/disable mid-tournament registration
- **Require Email:** Make email mandatory for registration
- **Allow Team Changes:** Permit doubles pairs to switch partners

#### Email Notification Settings

**📸 Screenshot 89:** Email notification toggles

- **Enable Board Calls:** Send email when match starts
- **Enable Registration Confirmations:** Send email when player registers
- **Enable Match Reminders:** Send email 15 minutes before match
- **Daily Digest:** Send summary email to organizers

#### Advanced Options

**📸 Screenshot 90:** Advanced settings

- **Match Timeout:** Auto-forfeit if match not started in X minutes
- **Scoring Mode:** Legs vs Sets
- **Show Player Rankings:** Display seed numbers publicly
- **Enable Live Scoring:** Real-time score updates (future feature)

### User Account Settings

**📸 Screenshot 91:** User account settings

Access via profile icon (top-right corner):

- **Profile Information:**
  - Name
  - Email
  - Profile picture

- **Password Management:**
  - Change password
  - Enable two-factor authentication (future feature)

- **Notification Preferences:**
  - Email notifications
  - Push notifications (future feature)

- **Sign Out:** Log out of application

**📸 Screenshot 92:** Profile dropdown menu

### Data Export

**📸 Screenshot 93:** Export data options

Export tournament data for archival or analysis:

1. **Navigate to Settings Tab**
2. **Click "Export Data"**
3. **Select Format:**
   - **CSV:** Player lists, match results, standings
   - **JSON:** Complete tournament data structure
   - **PDF:** Printable bracket and standings (future feature)

4. **Download File**

**📸 Screenshot 94:** Export confirmation dialog

### Backup & Restore

**📸 Screenshot 95:** Backup options

**Automatic Backups:**
- All data stored in cloud database (Supabase)
- Automatic replication and backups
- No action required from user

**Manual Backup:**
1. Export tournament data (see above)
2. Save file to safe location
3. To restore: Contact support with backup file

---

## Troubleshooting

**📸 Screenshot Location: `screenshots/15-troubleshooting/`**

### Common Issues

#### 1. Cannot Sign In

**📸 Screenshot 96:** Sign-in error message

**Symptoms:**
- "Invalid email or password" error
- Account locked message

**Solutions:**
- ✅ Verify email and password are correct
- ✅ Check for caps lock
- ✅ Use "Forgot password?" to reset
- ✅ Check email for verification link (new accounts)

#### 2. Email Notifications Not Sending

**📸 Screenshot 97:** Email error notification

**Symptoms:**
- Board calls not received by players
- "Email failed to send" error

**Solutions:**
- ✅ Verify player has valid email address
- ✅ Check SMTP settings in Supabase (admin only)
- ✅ Verify Resend API key is active
- ✅ Check spam folder
- ✅ Confirm email sender is verified

**📸 Screenshot 98:** Email configuration check

#### 3. Matches Not Appearing

**📸 Screenshot 99:** Empty match list

**Symptoms:**
- Group stage tab shows no matches
- "No matches found" message

**Solutions:**
- ✅ Verify groups have been generated (Group Configuration tab)
- ✅ Click "Create Group Stage Matches" button
- ✅ Ensure players are marked as paid
- ✅ Refresh the page (Ctrl + R)

#### 4. Scores Not Saving

**📸 Screenshot 100:** Score save error

**Symptoms:**
- Score reverts after closing modal
- "Failed to update match" error

**Solutions:**
- ✅ Check internet connection
- ✅ Verify you clicked "Complete Match" button
- ✅ Check for database connection errors
- ✅ Try logging out and back in
- ✅ Clear browser cache (Ctrl + Shift + Delete)

#### 5. Application Won't Launch

**📸 Screenshot 101:** Application launch error

**Symptoms:**
- Exe file won't open
- Windows error message
- Application crashes on startup

**Solutions:**
- ✅ Right-click exe → Run as Administrator
- ✅ Uninstall and reinstall application
- ✅ Check Windows Defender isn't blocking (Windows Security → App & browser control)
- ✅ Verify internet connection (required for database access)
- ✅ Update Windows to latest version

**📸 Screenshot 102:** Windows Defender bypass

#### 6. Bracket Not Generating

**📸 Screenshot 103:** Bracket generation error

**Symptoms:**
- "Failed to generate bracket" error
- Knockout tab is empty

**Solutions:**
- ✅ Verify ALL group stage matches are completed (100%)
- ✅ Confirm knockout configuration is set (match format, advancing players)
- ✅ Check that sufficient players are advancing (minimum 4 for bracket)
- ✅ Try refreshing page and generating again
- ✅ Check for tied players needing tiebreaker resolution

### Error Messages

**📸 Screenshot Location: `screenshots/15-troubleshooting/`**

#### "RLS Policy Violation"

**📸 Screenshot 104:** RLS policy error

**Meaning:** Database security rules preventing action  
**Solution:** Contact administrator - RLS policies need updating

#### "401 Unauthorized"

**📸 Screenshot 105:** Unauthorized error

**Meaning:** Session expired or not logged in  
**Solution:** Log out and log back in

#### "Network Error"

**📸 Screenshot 106:** Network error

**Meaning:** Cannot connect to database  
**Solution:** Check internet connection, verify Supabase is accessible

#### "Too Many Requests (429)"

**📸 Screenshot 107:** Rate limit error

**Meaning:** Too many API calls in short time  
**Solution:** Wait 1 minute and try again

### Getting Help

**Support Options:**
1. **Check This Manual:** Most issues covered in troubleshooting section
2. **GitHub Issues:** Report bugs at [your-github-repo]/issues
3. **Email Support:** [your-support-email]
4. **Discord Community:** [your-discord-invite] (if applicable)

**When Reporting Issues:**
- 📸 Include screenshots of error messages
- 📝 Describe steps that led to issue
- 💻 Specify Windows version and application version
- 🌐 Note if issue occurs online or offline

---

## Keyboard Shortcuts

**📸 Screenshot Location: `screenshots/16-shortcuts/`**

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + N` | Create new tournament |
| `Ctrl + S` | Save current changes |
| `Ctrl + R` | Refresh current view |
| `Ctrl + P` | Print current page |
| `Ctrl + F` | Search/filter |
| `Esc` | Close modal/dialog |
| `F11` | Toggle full screen |
| `Ctrl + Q` | Sign out |

### Navigation Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt + D` | Go to Dashboard |
| `Alt + T` | Go to Participants |
| `Alt + G` | Go to Group Stage |
| `Alt + K` | Go to Knockout Bracket |
| `Alt + S` | Go to Standings |
| `Alt + B` | Go to Board Manager |

### Scoring Shortcuts (when modal open)

| Shortcut | Action |
|----------|--------|
| `+` or `=` | Increment Player 1 score |
| `-` or `_` | Decrement Player 1 score |
| `]` | Increment Player 2 score |
| `[` | Decrement Player 2 score |
| `Enter` | Complete match |
| `Esc` | Cancel without saving |

### Display View Shortcuts

| Shortcut | Action |
|----------|--------|
| `F` | Toggle full screen |
| `B` | Board-specific view |
| `N` | Next slide |
| `P` | Previous slide |
| `Space` | Pause auto-rotation |
| `R` | Reset to first slide |
| `Esc` | Exit display view |

**📸 Screenshot 108:** Keyboard shortcuts reference card

---

## Appendix

### Screenshot Checklist

To complete this manual, take screenshots of the following:

**Installation (screenshots/01-installation/):**
- [ ] Screenshot 1: Installation wizard welcome
- [ ] Screenshot 2: Windows SmartScreen bypass
- [ ] Screenshot 3: Installation directory selection
- [ ] Screenshot 4: Application first launch

**Getting Started (screenshots/02-getting-started/):**
- [ ] Screenshot 5: Sign-in screen
- [ ] Screenshot 6: Sign-up form
- [ ] Screenshot 7: Forgot password modal
- [ ] Screenshot 8: Main dashboard UI overview

**Dashboard (screenshots/03-dashboard/):**
- [ ] Screenshot 9: Dashboard with tournament cards
- [ ] Screenshot 10: Filter tabs
- [ ] Screenshot 11: Tournament card details
- [ ] Screenshot 12: Delete confirmation dialog

**Tournament Creation (screenshots/04-tournament-creation/):**
- [ ] Screenshot 13: Tournament creation form
- [ ] Screenshot 14: Tournament structure options
- [ ] Screenshot 15: Scoring rules configuration
- [ ] Screenshot 16: Tournament summary
- [ ] Screenshot 17: Creation success message

**Registration (screenshots/05-registration/):**
- [ ] Screenshot 18: Participants tab
- [ ] Screenshot 19: Add player modal
- [ ] Screenshot 20: Paid/unpaid status
- [ ] Screenshot 21: Registration settings
- [ ] Screenshot 22: Public registration form
- [ ] Screenshot 23: Participant management
- [ ] Screenshot 24: Edit player modal
- [ ] Screenshot 25: Doubles team pairing
- [ ] Screenshot 26: Team list view

**Setup & Configuration (screenshots/06-setup-config/):**
- [ ] Screenshot 27: Tournament details
- [ ] Screenshot 28: Scoring rules
- [ ] Screenshot 29: Advanced settings
- [ ] Screenshot 30: Player seeding
- [ ] Screenshot 31: Professional seeding applied
- [ ] Screenshot 32: Group generation controls
- [ ] Screenshot 33: Generated groups preview
- [ ] Screenshot 34: Board assignment per group
- [ ] Screenshot 35: Board assignment interface

**Group Stage (screenshots/07-group-stage/):**
- [ ] Screenshot 36: Match format selection
- [ ] Screenshot 37: Group stage creation
- [ ] Screenshot 38: Match schedule
- [ ] Screenshot 39: Match scoring modal
- [ ] Screenshot 40: Completed match
- [ ] Screenshot 41: Match actions menu
- [ ] Screenshot 42: Group standings table
- [ ] Screenshot 43: Tiebreaker visualization
- [ ] Screenshot 44: Completion progress

**Board Manager (screenshots/08-board-manager/):**
- [ ] Screenshot 45: Board Manager main
- [ ] Screenshot 46: Add board interface
- [ ] Screenshot 47: Board assignment dropdown
- [ ] Screenshot 48: Board call in action
- [ ] Screenshot 49: Board call email
- [ ] Screenshot 50: Board display screen

**Knockout Bracket (screenshots/09-knockout-bracket/):**
- [ ] Screenshot 51: Knockout configuration
- [ ] Screenshot 52: Match format selection
- [ ] Screenshot 53: Bracket generation
- [ ] Screenshot 54: Full bracket tree
- [ ] Screenshot 55: List view
- [ ] Screenshot 56: Knockout scoring modal
- [ ] Screenshot 57: Board selection
- [ ] Screenshot 58: Winner advancing
- [ ] Screenshot 59: Round labels
- [ ] Screenshot 60: Championship match
- [ ] Screenshot 61: Tournament completion

**Scoring (screenshots/10-scoring/):**
- [ ] Screenshot 62: Universal scoring modal
- [ ] Screenshot 63: Scoring step-by-step
- [ ] Screenshot 64: Match completion confirmation
- [ ] Screenshot 65: Edit completed match

**Standings (screenshots/11-standings/):**
- [ ] Screenshot 66: Scoreboard main view
- [ ] Screenshot 67: Group standings detailed
- [ ] Screenshot 68: Qualifying indicators
- [ ] Screenshot 69: Knockout standings
- [ ] Screenshot 70: Knockout phase indicators
- [ ] Screenshot 71: Overall standings
- [ ] Screenshot 72: Final rankings
- [ ] Screenshot 73: Real-time updates

**Email Notifications (screenshots/12-email-notifications/):**
- [ ] Screenshot 74: Board call email template
- [ ] Screenshot 75: Board call in inbox
- [ ] Screenshot 76: Registration confirmation
- [ ] Screenshot 77: Password reset email
- [ ] Screenshot 78: SMTP configuration
- [ ] Screenshot 79: Email delivery status

**Tournament Display (screenshots/13-tournament-display/):**
- [ ] Screenshot 80: Display button location
- [ ] Screenshot 81: Display full view
- [ ] Screenshot 82: Current matches display
- [ ] Screenshot 83: Standings display
- [ ] Screenshot 84: Upcoming matches display
- [ ] Screenshot 85: Display settings
- [ ] Screenshot 86: Single board display

**Settings (screenshots/14-settings/):**
- [ ] Screenshot 87: Settings page overview
- [ ] Screenshot 88: General settings
- [ ] Screenshot 89: Email toggles
- [ ] Screenshot 90: Advanced settings
- [ ] Screenshot 91: User account settings
- [ ] Screenshot 92: Profile dropdown
- [ ] Screenshot 93: Export data options
- [ ] Screenshot 94: Export confirmation
- [ ] Screenshot 95: Backup options

**Troubleshooting (screenshots/15-troubleshooting/):**
- [ ] Screenshot 96: Sign-in error
- [ ] Screenshot 97: Email error
- [ ] Screenshot 98: Email config check
- [ ] Screenshot 99: Empty match list
- [ ] Screenshot 100: Score save error
- [ ] Screenshot 101: Launch error
- [ ] Screenshot 102: Windows Defender bypass
- [ ] Screenshot 103: Bracket generation error
- [ ] Screenshot 104: RLS policy error
- [ ] Screenshot 105: Unauthorized error
- [ ] Screenshot 106: Network error
- [ ] Screenshot 107: Rate limit error

**Shortcuts (screenshots/16-shortcuts/):**
- [ ] Screenshot 108: Shortcuts reference card

---

## Quick Reference Card

### Tournament Setup Checklist

- [ ] Create tournament with name and details
- [ ] Set game type (Singles/Doubles)
- [ ] Configure scoring rules
- [ ] Add players via manual entry or registration link
- [ ] Mark players as paid
- [ ] Seed players (drag to reorder or use professional seeding)
- [ ] Generate groups
- [ ] Add and assign boards to groups
- [ ] Create group stage matches
- [ ] Complete all group matches
- [ ] Configure knockout settings
- [ ] Generate knockout bracket
- [ ] Complete knockout matches
- [ ] Declare champion 🏆

### Common Tasks

**Add a Player:**
Participants tab → + Add Player → Fill form → Add

**Score a Match:**
Click match card → Use +/- buttons → Complete Match

**Send Board Call:**
Click match → Mark In Progress → Select board → Confirm

**View Standings:**
Standings tab → Choose Group/Knockout/Tournament tab

**Generate Bracket:**
Group Stage tab (after all matches complete) → Configure Knockout → Start Knockout Bracket

**Export Data:**
Settings tab → Export Data → Choose format → Download

---

## Version History

**v1.0.0 (January 25, 2026)**
- Initial release
- Full tournament management system
- Group stage and knockout bracket support
- Email notifications
- Board manager
- Windows desktop application
- Public registration portal

---

## Credits & License

**CGC Tournament Manager**  
© 2026 CGC Darts  

**License:** MIT License (see LICENSE.txt)

**Built with:**
- React + TypeScript
- Supabase (Database)
- Electron (Desktop wrapper)
- Resend (Email service)

**Support:** [your-email]  
**Website:** [your-website]  
**GitHub:** [your-github-repo]

---

**End of User Manual**

*For the latest version of this manual and additional resources, visit [your-documentation-site]*
