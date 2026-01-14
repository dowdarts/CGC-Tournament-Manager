# Dart Tournament Manager - Frontend

React + TypeScript + Vite project for the Dart Tournament Management application.

## Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Build

```bash
npm run build
```

Output will be in `dist/` folder.

## Environment Setup

1. Copy `.env.example` to `.env.local`
2. Update with your Supabase credentials:
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
   - `VITE_API_BASE_URL` - Backend API URL

## Project Structure

```
src/
├── components/       # Reusable React components
├── pages/           # Page components (routes)
├── services/        # API and external service integrations
├── store/           # Zustand state management
├── types/           # TypeScript type definitions
├── styles/          # Global CSS files
├── App.tsx          # Main App component
├── main.tsx         # Entry point
└── App.css          # Global styles
```

## Features Implemented

- [x] Project scaffolding with Vite + React + TypeScript
- [x] Routing setup with React Router
- [x] State management with Zustand
- [x] Supabase integration
- [x] Email service integration
- [x] Base styling (dark theme for pub visibility)
- [ ] Tournament Setup & Player Entry
- [ ] Group Stage (Round Robin)
- [ ] Board Manager
- [ ] Match Scoring
- [ ] Knockout Bracket
- [ ] Analytics & Leaderboard
- [ ] Admin Settings

## Technology Stack

- **Frontend Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Routing**: React Router v6
- **State Management**: Zustand
- **Backend**: Supabase (PostgreSQL + Auth)
- **API Client**: Axios
- **UI Icons**: Lucide React
- **Styling**: CSS (Tailwind ready)

## Future: Windows Desktop App

This will eventually be packaged as a Windows exe using:
- **Electron** or **Tauri** - for desktop packaging
- **NSIS** or **WiX** - for Windows installer
