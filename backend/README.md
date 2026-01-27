# Dart Tournament Manager - Backend

Backend infrastructure documentation for the Dart Tournament Management application.

## Database Schema

The application uses Supabase (PostgreSQL) as the backend database.

### Tables

1. **tournaments** - Main tournament record
2. **players** - Player registration
3. **groups** - Group stage grouping
4. **matches** - Individual matches (group stage or knockout)
5. **boards** - Physical dartboard management
6. **board_notifications** - Email notification tracking

See `schema.sql` for complete SQL schema.

## Setup Instructions

### 1. Create Supabase Project

- Go to https://supabase.com
- Create a new project
- Copy your project URL and anon key

### 2. Initialize Database

1. In Supabase dashboard, go to SQL Editor
2. Create a new query
3. Copy the contents of `schema.sql`
4. Run the SQL to create all tables

### 3. Email Service Setup

For sending board call notifications, set up one of:

- **Resend** (recommended)
  - https://resend.com
  - Easy to integrate with Node.js/Edge Functions
  
- **SendGrid**
  - https://sendgrid.com
  - More traditional SMTP setup
  
- **Supabase Edge Functions** with email
  - Use Supabase's built-in serverless functions
  - Run email logic in a secure function

### 4. Environment Variables

Create `.env.local` in the frontend directory:

```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_BASE_URL=http://localhost:3000
```

## API Endpoints

### Tournaments
- `GET /tournaments` - List all tournaments
- `POST /tournaments` - Create new tournament
- `GET /tournaments/:id` - Get tournament details
- `PUT /tournaments/:id` - Update tournament

### Players
- `GET /tournaments/:id/players` - List players in tournament
- `POST /tournaments/:id/players` - Add player
- `PUT /players/:id` - Update player
- `DELETE /players/:id` - Remove player

### Matches
- `GET /tournaments/:id/matches` - List matches
- `POST /tournaments/:id/matches` - Create match
- `PUT /matches/:id` - Update match score
- `GET /groups/:id/matches` - Get group matches

### Boards
- `GET /tournaments/:id/boards` - List boards
- `POST /boards/:id/call-match` - Call match (send email)
- `PUT /boards/:id` - Update board status

## Real-time Features

Supabase provides real-time capabilities via WebSockets:

```typescript
// Example: Listen to board updates
supabase
  .from('boards')
  .on('*', payload => {
    console.log('Board updated:', payload);
  })
  .subscribe();
```

## Deployment

### For Windows Desktop App

The app will be distributed as:
1. **Development** - Run with `npm run dev`
2. **Build** - Production build with `npm run build`
3. **Package** - Electron/Tauri exe
4. **Install** - NSIS installer

The Supabase backend remains hosted in the cloud, while the frontend is packaged as a desktop application.

## Security Considerations

- ✅ Email is optional - no forced data collection
- ✅ Supabase provides row-level security policies
- ✅ Desktop app can work partially offline
- ⚠️ TODO: Implement tournament director authentication
- ⚠️ TODO: Add role-based access control (director, scorer, spectator)
