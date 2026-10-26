# Curious Club

React + Vite + Tailwind frontend (generated with Figma Make) backed directly by Supabase:
Postgres for data, Supabase Auth with Google for sign-in, Realtime for live interest counts.
There is no separate server; security is enforced in the database with Row Level Security.

## Setup

You need a Supabase project and a Google Cloud project. Nothing below is committed to git
except the placeholders in `.env.example`.

### 1. Create the database schema

In the Supabase Dashboard open **SQL Editor**, paste the contents of
`supabase/migrations/20261026120000_topics_and_votes.sql` and run it once.

(With the Supabase CLI instead: `supabase init`, `supabase link --project-ref <ref>`, `supabase db push`.)

### 2. Create Google OAuth credentials (Google Cloud Console)

1. **Google Auth Platform → Branding / Audience** (older UI: *APIs & Services → OAuth consent screen*):
   set the app name and support email. While the app is in *Testing*, add the Google accounts
   that may sign in as test users, or publish the app.
2. **Clients → Create client** (older UI: *Credentials → Create credentials → OAuth client ID*),
   type **Web application**:
   - **Authorized JavaScript origins**: every origin the app runs on, e.g. `http://localhost:8443`
     and your deployed site URL.
   - **Authorized redirect URIs**: `https://<your-project-ref>.supabase.co/auth/v1/callback`
     (Supabase shows this exact value as the *Callback URL* on its Google provider page).
3. Copy the **Client ID** and **Client secret**.

### 3. Configure Supabase Auth (Supabase Dashboard)

1. **Authentication → Sign In / Providers → Google**: enable it and paste the Client ID and
   Client secret. The secret stays in Supabase; it never goes in this repo or the browser.
2. **Authentication → URL Configuration**:
   - **Site URL**: your deployed site URL.
   - **Redirect URLs**: every place the app runs, e.g. `http://localhost:8443/**` and
     `https://your-site.example/**`. If the app's URL isn't listed, Supabase silently sends users
     to the Site URL after sign-in.

### 4. Configure the frontend

```bash
cp .env.example .env
```

Fill in `.env` from **Project Settings → API Keys** and **Data API**:

- `VITE_SUPABASE_URL`: `https://<your-project-ref>.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY`: the publishable key (`sb_publishable_…`) or the legacy `anon` key

Never use the `service_role` / secret key here: every `VITE_` variable is bundled into browser code.
Vite reads these at build time, so they must also be set wherever the production build runs.

```bash
pnpm install
pnpm dev
```

## Checks

```bash
pnpm exec tsc --noEmit
pnpm run build
```

`supabase/tests/policies.sql` exercises the constraints and RLS policies (impersonation, duplicate
topics and votes, editing other users' records, signed-out access). It runs inside a transaction
that is rolled back. Run it against a development database such as a local `supabase start`:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/policies.sql
```

## How it fits together

| Piece | Where |
| --- | --- |
| Tables, constraints, RLS, grants, realtime | `supabase/migrations/` |
| Supabase client (reads `VITE_` env vars) | `src/lib/supabase.ts` |
| Session restore, Google sign-in/out, OAuth callback errors | `src/lib/auth.ts` |
| Topic queries, voting, live refresh | `src/data/topics.ts` |
| UI | `src/App.tsx`, `src/components/` |

- **`topics`** and **`topic_votes`** (one vote per user per topic via a unique constraint).
  Titles are 1–120 characters, stored trimmed with single spaces, and unique ignoring case.
- Interest counts come from the **`topics_with_interest`** view, which counts vote rows. No stored
  counters. The view runs with the caller's permissions, so RLS applies to it.
- Adding a topic also records its creator's vote, in the same transaction (a trigger).
- Only signed-in users can read anything. Users can insert topics and votes only as themselves
  (`created_by` / `user_id` always come from the JWT), remove only their own votes, and cannot edit
  or delete anything else.
