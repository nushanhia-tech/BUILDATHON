# BUILDATHON

Next.js (App Router, TypeScript, Tailwind) app with Supabase as the database.

## Stack
- **Next.js 16** (App Router, Server Actions)
- **Supabase** (Postgres) via `@supabase/supabase-js`
- **Vercel** for deployment

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. In Supabase, open **SQL Editor** and run `supabase/schema.sql`.
3. Copy the env template and fill in your project values (Project Settings > API):
   ```bash
   cp .env.example .env.local
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```

## Deploy to Vercel

1. Import this GitHub repo in Vercel.
2. Add the environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Project Settings > Environment Variables.
3. Deploy. Every push to `main` redeploys.

## Notes
The RLS policies in `supabase/schema.sql` allow public read and insert for demo purposes. Tighten them before storing real user data.
