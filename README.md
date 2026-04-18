# FocusQueue

FocusQueue is a lightweight personal focus board for tracking active experiments and their checkpoints.

## UI flow (overview-first)

- Sidebar: experiment listing with quick filter
- Main overview page: checkpoint cards across experiments
- Top controls: search, status filter, sort
- Click any checkpoint card: open checkpoint detail panel
- Floating `+` button: choose **Add experiment** or **Add checkpoint**

## Features

- Experiments: create, edit, delete
- Checkpoints: create, open detail, edit, delete
- Checkpoint fields: title, description, type (`one_time` / `recurring`), status, progress
- Progress slider with automatic save
- Responsive layout for desktop and mobile Safari
- Subtle toast feedback and empty states

## Tech stack

- React + Vite (JavaScript)
- Supabase (Postgres + API)

## Project structure

```txt
focusqueue/
  src/
    components/
      CheckpointCard.jsx
      CheckpointDetailPanel.jsx
      CheckpointFormModal.jsx
      ExperimentFormModal.jsx
      ExperimentSidebar.jsx
      Toast.jsx
    lib/
      supabase.js
    services/
      checkpoints.js
      experiments.js
    App.jsx
    main.jsx
    index.css
  supabase/
    schema.sql
  .env.example
  README.md
```

## Supabase setup (No-login personal quick mode)

1. Create a Supabase project.
2. Open **SQL Editor** and run [schema.sql](supabase/schema.sql).
3. From **Project Settings -> API**, copy:
   - Project URL
   - anon public key
4. Create root `.env` from `.env.example`:

```bash
cp .env.example .env
```

5. Fill values:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## If you already created tables earlier

Re-run [schema.sql](supabase/schema.sql). It includes a safe migration that adds `checkpoints.type` (`one_time` / `recurring`) for existing projects.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Security note

This setup is intentionally open for no-login personal use (anon role has broad access).
For safer deployment, switch to authenticated mode and user-scoped RLS.
