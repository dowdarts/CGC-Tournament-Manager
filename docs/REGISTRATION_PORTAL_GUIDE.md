# Self-Service Registration Portal Guide

## Overview

The self-service registration portal allows players to register themselves for tournaments using a tablet at the registration desk. This eliminates manual data entry by tournament organizers.

## Features

### Singles Tournaments

- Players enter their name and optional email
- One submission = one player registered

### Doubles Tournaments

- Players enter both team members' information
- Partner 1: Name + Email (optional)
- Partner 2: Name + Email (optional)
- Both players are automatically linked as a team
- One submission = two players registered as partners

## Setup Instructions

### 1. Create Tournament

1. Go to Tournament Setup
2. Fill in tournament details:

   - Name
   - Date
   - Location
   - Format (Group-Knockout, Round Robin, or Knockout)
   - **Game Type**: Select "Singles" or "Doubles (Teams of 2)"

### 2. Get Registration Link

After creating the tournament, you'll see a **Self-Service Registration Portal** card with:

- A unique URL for this tournament
- Copy button to copy the link
- Open button to preview the portal

### 3. Set Up Registration Tablet

1. Use any tablet with a web browser
2. Open the registration portal URL
3. Keep the browser open on the tablet
4. Place tablet at registration desk
5. Players can now register themselves!

## Registration Process (Player View)

### Singles Registration

1. Player opens the portal
2. Sees tournament name and date
3. Enters their full name (required)
4. Optionally enters email for match notifications
5. Clicks "Register"
6. Sees success message
7. Form clears, ready for next player

### Doubles Registration

1. Team opens the portal
2. Sees "Team Registration (Doubles)" heading
3. **Player 1** section:

   - Enters full name (required)
   - Optionally enters email

4. **Player 2** section:

   - Enters partner's full name (required)
   - Optionally enters partner's email

5. Clicks "Register Team"
6. Both players registered and linked as partners
7. Form clears, ready for next team

## Tournament Organizer View

### Monitoring Registrations

- All self-registered players appear in the Player List immediately
- Same list shows both manual and self-service registrations
- Mark players as paid when they pay entry fee
- Delete registrations if needed

### Doubles Teams

- Partners are automatically linked with matching `team_id`
- You can see both team members in the player list
- When creating groups, the system can keep partners together (future feature)

## Technical Details

### URL Structure

```text
http://localhost:5174/register/{tournament-id}
```

### Security Notes

- Portal is read-only for tournament details
- Only allows player registration (no editing/deleting)
- No authentication required (public access)
- Tournament ID is required in URL

### Production Deployment

When you deploy to GitHub Pages or a web server:

- The URL will be: `https://your-domain.com/register/{tournament-id}`
- Share this link via QR code, text message, or email
- Works on any device with a browser

## Best Practices

1. **Test First**: Open the portal yourself before event day
2. **Tablet Setup**:

   - Use a large tablet (10"+ recommended)
   - Ensure Wi-Fi connection is stable
   - Disable sleep mode
   - Keep charger connected

3. **Signage**: Add a sign at registration desk: "Self-Service Registration Available"
4. **Backup**: Have paper registration forms as backup
5. **Monitor**: Check the admin dashboard periodically to see new registrations

## Troubleshooting

### "Tournament not found" error

- Check the URL is correct
- Ensure tournament was created in the system

### Registration not appearing

- Check internet connection
- Refresh the admin dashboard
- Verify tournament ID matches

### Players can't see their previous registrations

- This is by design (privacy)
- Only organizers see the full player list
- Players should remember if they registered

## Future Enhancements

- Email confirmation after registration
- QR code generation for easy sharing
- Check-in system when players arrive
- View registration count without admin access
