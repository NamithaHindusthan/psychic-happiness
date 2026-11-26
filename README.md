# TaskNest

A lightweight, private task manager for a small team (Android, Expo + Supabase).

- Setup, building the APK and installing it: **[docs/SETUP.md](docs/SETUP.md)**
- Database: `supabase/migrations/` (tables, invite-only sign-up, Row Level Security)
- Checks: `npm run check` (types, lint, unit tests) and `npm run test:db` (security rules against a real Postgres)

Stack: React Native (Expo SDK 58, Expo Router), React Query, Supabase (Postgres, Auth, Storage).
Secrets: only public keys are used in the app, supplied through `EXPO_PUBLIC_*` variables (see `.env.example`).
