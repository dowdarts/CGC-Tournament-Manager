# Enable Supabase Realtime for Player Updates

## What This Does
Enables real-time synchronization so when a player registers through the public portal, the tournament organizer's player list updates automatically without refreshing the page.

## How to Enable

### Option 1: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Open your project: **pfujbgwgsxuhgvmeatjh**
3. Click **Database** in the left sidebar
4. Click **Replication** tab
5. Find the **players** table in the list
6. Toggle **ON** the switch for the players table
7. The "Insert", "Update", and "Delete" events will be enabled automatically

### Option 2: SQL Command

Run this in the SQL Editor:

```sql
-- Enable realtime for players table
ALTER PUBLICATION supabase_realtime ADD TABLE players;
```

## Verify It's Working

1. Open Tournament Setup page in one browser tab
2. Open the Registration Portal (`/register/{tournament-id}`) in another tab (or on a tablet)
3. Register a new player through the portal
4. Watch the player appear instantly in the Tournament Setup page **without refreshing**

You should see a console log: `"New player registered: {player data}"`

## What Happens Behind the Scenes

1. **Player registers** through public portal
2. **Supabase inserts** player into database
3. **Real-time event fires** via websocket
4. **React component listens** to the event
5. **Player list updates** automatically in UI

## Technical Details

### Subscription Code (already implemented)
```typescript
// In TournamentSetup.tsx
const channel = supabase
  .channel(`tournament-${id}-players`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'players',
    filter: `tournament_id=eq.${id}`
  }, (payload) => {
    store.addPlayer(payload.new as Player);
  })
  .subscribe();
```

### Events Listened To
- **INSERT**: New player registered
- **UPDATE**: Player info changed (paid status, etc.)
- **DELETE**: Player removed from tournament

### Filtering
- Only listens to players for the current tournament (`filter: tournament_id=eq.{id}`)
- Won't receive updates from other tournaments

## Troubleshooting

**Player list not updating?**
1. Check that Realtime is enabled for `players` table in Supabase
2. Open browser console and look for connection messages
3. Verify websocket connection in Network tab

**Console shows errors?**
- Check Supabase URL and anon key in `.env.local`
- Verify table name is exactly `players` (case-sensitive)

**Multiple players appear?**
- This is normal if multiple tabs are open
- Each will receive the realtime update independently

## Performance Notes

- Realtime uses websockets (very efficient)
- Only sends changed data (not entire table)
- Automatically reconnects if connection drops
- No polling = no wasted API calls
