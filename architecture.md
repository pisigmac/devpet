# DevPet Architecture

## System Overview
DevPet is a full-stack digital pet ecosystem that grows based on real coding habits. It combines a VS Code extension for real-time tracking, a web dashboard for visualization and social features, a Supabase backend for state management, and GitHub OAuth for commit history.

## Architecture Diagram

```
┌─────────────────┐         ┌──────────────────┐
│   VS Code Ext   │────────▶│   Supabase RT   │
│  (TypeScript)   │  WS/SSE │   (Postgres)     │
└─────────────────┘         └────────┬─────────┘
                                     │
┌─────────────────┐         ┌────────▼─────────┐
│  GitHub OAuth   │────────▶│  Edge Functions  │
│   (REST API)    │  HTTPS  │   (Deno/TS)      │
└─────────────────┘         └────────┬─────────┘
                                     │
┌─────────────────┐         ┌────────▼─────────┐
│  Cloudflare     │◀────────│   Web Dashboard  │
│   Pages         │  HTTPS  │   (Vite/React)   │
└─────────────────┘         └──────────────────┘
```

## Data Flow

1. **VS Code Extension** captures keystrokes, saves, git commits, language switches → sends to Supabase
2. **GitHub OAuth** fetches historical commit data, repo stats, language breakdown → processed by Edge Function
3. **XP Engine** (Edge Function) calculates evolution triggers, mood states, streak bonuses
4. **Web Dashboard** subscribes to real-time pet state changes via Supabase Realtime
5. **Social Hub** compares pets, manages friend invites, leaderboards

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Vite + React + TypeScript | Dashboard UI |
| Styling | Tailwind CSS + Framer Motion | Animations, glassmorphism |
| Backend | Supabase (Postgres) | Database, Auth, Realtime |
| Compute | Supabase Edge Functions | XP calculation, GitHub sync |
| Extension | VS Code API + TypeScript | IDE habit tracking |
| Hosting | Cloudflare Pages | Static site + Functions |
| External | GitHub OAuth + REST API | Commit history, repo data |

## Security Model
- Row Level Security (RLS) on all tables — users only see their own pet data
- Friend access granted via explicit `pet_friends` junction table
- GitHub token stored encrypted in Supabase `user_tokens` table
- VS Code extension uses Supabase anon key + user JWT
