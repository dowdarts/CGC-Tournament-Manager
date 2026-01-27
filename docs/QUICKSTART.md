# Quick Start Guide

## 5-Minute Setup

### 1. Install Node Dependencies

```bash
cd frontend
npm install
```

### 2. Create Supabase Project

- Go to https://supabase.com
- Sign up or log in
- Click "New Project"
- Create project (takes ~1 minute)
- Copy the following from Settings > API:
  - Project URL → `VITE_SUPABASE_URL`
  - Anon Public Key → `VITE_SUPABASE_ANON_KEY`

### 3. Initialize Database

1. In Supabase dashboard, go to "SQL Editor"
2. Click "New Query"
3. Copy entire contents of `backend/schema.sql`
4. Paste into query editor
5. Click "Run"
6. ✅ Database is ready!

### 4. Configure Environment

1. In `frontend` folder, copy file:

   ```bash
   cp .env.example .env.local
   ```

2. Edit `frontend/.env.local` and add your values:

   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-key-here
   VITE_API_BASE_URL=http://localhost:3000
   ```

### 5. Run Development Server

```bash
npm run dev
```

Browser will automatically open at [http://localhost:5173](http://localhost:5173)

---

## What's Already Built

✅ **Project Structure**

- Folders organized by function
- TypeScript configured
- Build tool (Vite) ready

✅ **Frontend**

- React app with routing
- State management (Zustand)
- Supabase client
- API service layer
- Dark theme UI

✅ **Database**

- PostgreSQL schema
- All tables created
- Relationships defined
- Performance indexes

✅ **Documentation**

- Development guide
- API documentation
- Database schema
- Original plan

---

## What's Left to Build

1. **Tournament Setup Screen** - Forms for tournament creation and player registration
2. **Group Stage Screen** - Show standings and match schedule
3. **Board Manager** - Command center for board assignments
4. **Scorer Interface** - Large buttons for match scoring
5. **Knockout Bracket** - Bracket visualization
6. **Analytics** - Statistics and leaderboards
7. **Settings** - Admin configuration

---

## Project Structure

```text
.
├── frontend/              ← React app (START HERE)
│   ├── src/
│   │   ├── pages/        (6 screens to implement)
│   │   ├── components/   (reusable UI components)
│   │   ├── services/     (API calls to Supabase)
│   │   ├── store/        (Zustand state)
│   │   └── types/        (TypeScript types)
│   ├── package.json      (npm install this)
│   └── vite.config.ts    (build configuration)
├── backend/              (Database documentation)
│   └── schema.sql        (RUN THIS IN SUPABASE)
└── docs/                 (Guides & documentation)
```

---

## Troubleshooting

### Port 5173 Already in Use

```bash
# Use different port
npm run dev -- --port 5174
```

### npm install fails

- Delete `node_modules` folder
- Delete `package-lock.json`
- Run `npm install` again

### Can't connect to Supabase

- Verify `.env.local` has correct URL and key
- Check Supabase project is "Active"
- Try using a fresh browser tab

### Database tables don't exist

- Go to Supabase SQL Editor
- Run the SQL from `backend/schema.sql`
- Verify each table appears in the UI

---

## Key Files to Know

| File | Purpose |
| ------ | --------- |
| `frontend/src/App.tsx` | Main app routing |
| `frontend/src/pages/*.tsx` | The 7 screens to build |
| `frontend/src/services/api.ts` | API calls |
| `frontend/src/store/tournament.ts` | Global state |
| `frontend/src/types/index.ts` | TypeScript definitions |
| `backend/schema.sql` | Database structure |
| `.env.example` | Environment variables |

---

## Next: Build Tournament Setup

See `docs/DEVELOPMENT.md` for detailed feature implementation guide.

```bash
# Start editing
frontend/src/pages/TournamentSetup.tsx
```

---

**Ready to build? Start with `npm run dev`! 🎯**
