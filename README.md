# നിള · Nila

**Built for the Overlooked.** A Malayalam-first, voice-first, mobile-first PWA for elderly people, people with mobility disabilities, Deaf / hard-of-hearing and blind / low-vision people.
*Technology that adapts to people, not people to technology.*

Three portals chosen by role at login:

| Portal | Path | For |
|---|---|---|
| User | `/app` | The person being helped (mobile, big buttons, voice) |
| Family | `/family` | Family members linked **with the user's consent** (mobile + desktop) |
| Admin | `/admin` | Global modules, content, wheelchair approvals, stats (desktop) |

Stack (all free tiers): Vite + React + TypeScript, Tailwind CSS v4, React Router, Supabase (Auth, Postgres, RLS, Storage, Realtime), Leaflet + OpenStreetMap + Nominatim, Web Speech API, Tesseract.js, TensorFlow.js (COCO-SSD), Web Audio / Vibration / Wake Lock / Canvas, Gemini (via a Vercel function only), vite-plugin-pwa, Vercel.

---

## 1. Setup

### 1.1 Supabase project
1. Create a free project at <https://supabase.com> (pick the region closest to Kerala, e.g. Mumbai).
2. **Authentication → Providers → Email**: keep Email enabled. For a buildathon demo, turn **off** "Confirm email" so new signups can log in immediately.
3. **SQL Editor → New query** → paste the whole of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   - It creates every table, RLS policy, trigger, RPC, the `wheelchairs_public` / `profiles_public` views, the public **`photos` storage bucket** with its policies, Realtime publication entries, and all seed data (modules, sub-features, 20 sign cards, 10 quick phrases, helplines, 10 DEMO wheelchairs, 3 demo accounts).
   - It is **re-runnable** (it drops Nila's objects first — this wipes app data).
   - If you see a notice about `supabase_realtime`, enable Realtime under **Database → Publications** and re-run.
4. **Storage**: nothing to do — the `photos` bucket (public read, authenticated write into `<uid>/…`) is created by the SQL. Verify it exists under **Storage**.
5. **Project Settings → API**: copy the **Project URL** and **anon public key**.

### 1.2 Environment variables
Copy `.env.example` to `.env.local`:

| Variable | Where | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | client | Project URL |
| `VITE_SUPABASE_ANON_KEY` | client | anon public key (safe in the browser; RLS protects data) |
| `GEMINI_API_KEY` | **server only** | <https://aistudio.google.com/apikey>. Never prefix with `VITE_`. |
| `GEMINI_MODEL` | server, optional | defaults to `gemini-2.5-flash` |

### 1.3 Run locally
```bash
npm install
npm run dev          # http://localhost:5173
```
Camera/mic need HTTPS or `localhost`. `/api/simplify` only runs on Vercel (or `npx vercel dev`).

### 1.4 Deploy to Vercel
1. Import the GitHub repo in Vercel (framework auto-detects **Vite**; `vercel.json` sets the SPA rewrites and keeps `/api/*` for functions).
2. Add the env vars from 1.2 for **Production** (and Preview). `GEMINI_API_KEY` stays server-side — it's only read in `api/simplify.ts`.
3. Deploy. Open the URL on Android Chrome → menu → **Install app**.
4. In Supabase **Authentication → URL Configuration**, set the Site URL to your Vercel URL.

---

## 2. Demo accounts
Password for all: **`NilaDemo@123`** (also one-tap fill on the login page).

| Email | Role | Notes |
|---|---|---|
| `user@nila.demo` | user | **ഉമ്മ (Ummah)**, Simple Mode, 2 medicines, tasks, contacts, emergency card |
| `family@nila.demo` | family | **അബ്ദുൾ (Abdul)**, linked to Ummah with **full** access |
| `admin@nila.demo` | admin | Also owns the 10 DEMO wheelchairs as "Nila Demo Org (ഡെമോ)", verified |

All demo wheelchairs are flagged `is_demo` and show a **ഡെമോ / DEMO** badge. To make someone admin: `update profiles set role = 'admin' where id = '<uuid>';`

---

## 3. Three-portal demo script (≈5 min)
Use two windows: phone (or Chrome device mode) logged in as **user**, laptop as **family**, then **admin**.

**User (Ummah, phone)**
- [ ] Login → big Malayalam home: greeting, blue voice card, data-driven tiles, next-medicine banner.
- [ ] Tap 🔊 വായിച്ചുതരൂ — screen is read aloud.
- [ ] Say/type **"നാളെ ഡോക്ടറെ കാണണം"** → task created for tomorrow. Say **"കണ്ണട എവിടെ വെച്ചു"** → reads the memory note.
- [ ] Medicines → mark ✔️ കഴിച്ചു; 7-day history.
- [ ] Hearing → Talk bridge giant captions; quick phrase speaks; Sound alert flashes on a clap.
- [ ] Wheelchair → map/list sorted by km → open one → 🙋 എനിക്ക് വേണം (phone hidden until accepted).
- [ ] Family/SOS → 🆘 → confirm dialog (ശരി / വേണ്ട) → shows 112/108 + WhatsApp/SMS links.

**Family (Abdul, laptop)**
- [ ] `/family` card shows Ummah's check-in, doses, last SOS — and the SOS just sent arrives as a red banner (Realtime).
- [ ] ⚙️ App ക്രമീകരിക്കൂ → turn on **കണ്ണ് സഹായി**, move it up → watch the phone preview → Save → **Ummah's phone updates live** with toast "അബ്ദുൾ 'കണ്ണ് സഹായി' ചേർത്തു".
- [ ] Add a medicine; send a voice message; check Alerts.
- [ ] Back on the phone: Settings → Family links → change Abdul to **assist** → Abdul adds a task → Ummah sees "…ശരിയാണോ?" confirm card. Activity log lists every change.

**Admin (laptop)**
- [ ] Dashboard stats + module-usage chart (no medical data visible anywhere).
- [ ] Modules → disable "Wheelchair" globally → it disappears from every user's home live. Add "+ പുതിയ ബട്ടൺ" (e.g. a phone link).
- [ ] Wheelchairs → approval queue (the 10th demo listing) → Approve; map of all listings; verify org.
- [ ] Content → upload a real ISL sign image.

---

## 4. Sign-card images to replace
`public/signs/*.svg` are labelled **placeholders**. Replace each with a real ISL photo/illustration (same filename, or upload new ones in Admin → Content and delete the old card):

`01-namaskaram` നമസ്കാരം · `02-nanni` നന്ദി · `03-vellam` വെള്ളം · `04-bhakshanam` ഭക്ഷണം · `05-sahayam` സഹായം · `06-vedana` വേദന · `07-doctor` ഡോക്ടർ · `08-marunnu` മരുന്ന് · `09-amma` അമ്മ · `10-achan` അച്ഛൻ · `11-veedu` വീട് · `12-suchimuri` ശുചിമുറി · `13-urakkam` ഉറക്കം · `14-athe` അതെ · `15-alla` അല്ല · `16-nilkku` നിൽക്കൂ · `17-varu` വരൂ · `18-poku` പോകൂ · `19-santhosham` സന്തോഷം · `20-kshamikkanam` ക്ഷമിക്കണം

(If you use `.png`/`.jpg`, update `image_url` in `sign_cards`.) Source ISL signs from ISLRTC (<https://islrtc.nic.in>) respecting their licence.

---

## 5. Architecture notes
- **Customisation rule** (`src/lib/modules.ts`): visible modules = `modules.enabled_globally` ∩ `user_settings.enabled_modules`, ordered by `user_settings.module_order`; same for sub-features. Settings changes stream over Supabase Realtime (`useSettingsFor`).
- **Privacy / RLS** (`supabase/schema.sql`): users own their rows; family access via `family_level()` (view / assist / full); assist inserts are forced to `needs_confirmation = true` by trigger; admins have **no** policies on medical tables; wheelchair exact location + phone only via `get_request_contact()` after acceptance; public coordinates fuzzed 200–500 m by trigger; every family change → `activity_log` trigger.
- **Safety**: Simplify never gives dosing advice (server prompt + visible disclaimer); SOS is labelled "not an official emergency service" with 112/108; voice never sends SOS directly; no payments; "What's in front?" shows a white-cane disclaimer.
- Folders: `src/portals/{user,family,admin}`, `src/components/ui` (BigButton, ReadAloudButton, ConfirmDialog, FlashOverlay, VoiceInput…), `src/components/managers` (shared user/family CRUD), `src/lib` (supabase, tts, stt, voiceRouter, haversine, geo, i18n), `src/hooks` (useUserSettings, useRealtime, useCamera, useMic, useTTS, useSpeechRecognition).
- All UI strings live in `src/i18n/ml.ts` and `src/i18n/en.ts`.

## 6. Mobile testing notes
- Target: **Android + Chrome** over HTTPS. iOS Safari lacks SpeechRecognition (text fallback is shown) and the Vibration API (a note is shown).
- Malayalam TTS needs a Malayalam voice: Android → Settings → Text-to-speech → Google → install **Malayalam**. Otherwise en-IN is used.
- Sound alert and reminders work only while the tab is open (Wake Lock keeps the screen on where supported).
- First use of OCR / object detection downloads models (~10–20 MB); after that they're cached.
