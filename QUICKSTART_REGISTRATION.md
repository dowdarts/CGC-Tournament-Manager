# Quick Start: Tournament Registration Enhancement

## 🚀 What's New?

Your tournament registration system now requires and displays:
- **Registration Price** - How much to enter
- **Registration Close Time** - Deadline for signups
- **Host Information** - Who's running the tournament
- **Player Counts** - Real-time checked-in vs registered
- **Venue Details** - Clear location information

## 📋 Step-by-Step Setup

### Step 1: Apply Database Migration
1. Open Supabase Dashboard → SQL Editor
2. Copy contents from: `backend/migration_add_registration_fields.sql`
3. Click **Run**
4. Verify: "Success. No rows returned"

### Step 2: Create/Edit Tournament
1. Go to Dashboard → Create New Tournament
2. Fill in **all required fields**:
   - Tournament Name (e.g., "Winter Championship 2025")
   - Date (calendar picker)
   - Start Time (e.g., 19:00)
   - **Registration Price** (e.g., 20.00)
   - **Registration Close Time** (e.g., day before at 11:59 PM)
   - Location/Venue (e.g., "The Local Pub")
   - Format (Group-Knockout, Round Robin, or Knockout)
   - Game Type (Singles or Doubles)
3. Enable "Public Registration Portal"
4. Click **Save Setup**

### Step 3: Share Registration Link
Your public registration URL:
```
https://yourdomain.com/registration-portal/{tournament-id}
```

Players will see:
- Beautiful tournament info banner
- Host name (from your profile)
- All tournament details
- Registration form below

## 🎨 What Players See

```
┌─────────────────────────────────────────────────┐
│          Winter Championship 2025                │
│            Hosted by John Smith                  │
├─────────────────────────────────────────────────┤
│ 📅 Date: Wednesday, January 15, 2025           │
│ 🕐 Start Time: 7:00 PM                          │
│ 📍 Venue: The Local Pub                         │
│ 💵 Entry Fee: $20.00                            │
│ 👥 Players: 12 checked in / 15 registered       │
│ ⚠️  Registration Closes: Jan 14, 11:59 PM       │
└─────────────────────────────────────────────────┘

[Registration Form Below]
```

## 🔍 Key Features

### Tournament Info Banner
- **Responsive Design** - Adapts to all screen sizes
- **Icon-Based UI** - Easy to scan information
- **Real-Time Counts** - Shows current registrations
- **Highlighted Deadline** - Registration close time in red

### Required Fields
All tournaments now require:
- ✅ Date (was optional)
- ✅ Start Time (was optional)
- ✅ Registration Price (new)
- ✅ Registration Close Time (new)
- ✅ Location/Venue (was optional)

### Data Flow
1. **Tournament Setup** → Saves all fields to database
2. **User Profile** → Links to host name display
3. **Player Data** → Calculates checked-in count
4. **Registration Portal** → Displays everything together

## 🛠️ Troubleshooting

### Issue: Host name shows "Tournament Host"
**Fix:** Make sure the tournament has a `user_id` assigned and that user has a `display_name` in `user_profiles`

### Issue: Player count shows 0/0
**Fix:** Players need to be added to the database. The count shows registered players (all) vs checked-in (paid=true)

### Issue: Old tournaments missing new fields
**Fix:** Edit old tournaments and add the registration price and close time

### Issue: Migration fails
**Fix:** 
1. Check if columns already exist: `SELECT * FROM tournaments LIMIT 1;`
2. If columns exist, migration already ran
3. If not, ensure you're running in correct Supabase project

## 📱 Mobile Responsive

The info banner automatically adjusts:
- **Desktop:** Multi-column grid layout
- **Tablet:** 2-column layout
- **Mobile:** Single column stack

## 🎯 Best Practices

1. **Set realistic deadlines** - Close registration 1-24 hours before start
2. **Price clearly** - Include what the fee covers (entry, food, prizes)
3. **Update profile** - Use a clear display name or organization name
4. **Test registration** - View your portal before sharing the link
5. **Monitor counts** - Check player numbers regularly

## 📄 Files Modified

- ✨ `TournamentInfoBanner.tsx` - NEW beautiful info component
- 📝 `BasicInfo.tsx` - Added price and close time fields
- 🔗 `PublicRegister.tsx` - Integrated banner and host lookup
- 📊 `types/index.ts` - Added new Tournament fields
- 🗄️ `migration_add_registration_fields.sql` - Database changes

## ✅ Testing Checklist

- [ ] Migration applied successfully
- [ ] New tournament created with all fields
- [ ] Registration portal shows banner
- [ ] Host name displays correctly
- [ ] Registration price shows as $XX.XX
- [ ] Registration close time formatted correctly
- [ ] Player count updates (0/0 initially)
- [ ] Mobile view looks good
- [ ] Form still works below banner

---

**Need Help?** Check `TOURNAMENT_REGISTRATION_ENHANCEMENT.md` for detailed documentation.
