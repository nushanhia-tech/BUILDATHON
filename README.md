# നിള · Nila

**Built for the Overlooked.** A Malayalam-first, voice-first, mobile-first PWA for elderly people, people with mobility disabilities, Deaf / hard-of-hearing and blind / low-vision people.
_Technology that adapts to people, not people to technology._

Three portals chosen by role at login:

| Portal | Path      | For                                                                  |
| ------ | --------- | -------------------------------------------------------------------- |
| User   | `/app`    | The person being helped (mobile, big buttons, voice)                 |
| Family | `/family` | Family members linked **with the user's consent** (mobile + desktop) |
| Admin  | `/admin`  | Global modules, content, wheelchair approvals, stats (desktop)       |

Stack (all free tiers): Next.js App Router + React + TypeScript, Tailwind CSS v4, React Router, Supabase (Auth, Postgres, RLS, Storage, Realtime), Leaflet + OpenStreetMap + Nominatim, Web Speech API, Tesseract.js, TensorFlow.js (COCO-SSD), Web Audio / Vibration / Wake Lock / Canvas, Gemini (via a Vercel function only), web app manifest, Vercel.

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

| Variable                        | Where            | Notes                                                                   |
| ------------------------------- | ---------------- | ----------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | client           | Project URL                                                             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client           | anon public key (safe in the browser; RLS protects data)                |
| `GEMINI_API_KEY`                | **server only**  | <https://aistudio.google.com/apikey>. Never prefix with `NEXT_PUBLIC_`. |
| `GEMINI_MODEL`                  | server, optional | defaults to `gemini-2.5-flash`                                          |

### 1.3 Run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

Camera/mic need HTTPS or `localhost`. `/api/simplify` runs locally and on Vercel as a Next.js Route Handler.

### 1.4 Deploy to Vercel

1. Import the GitHub repo in Vercel (framework is **Next.js**; `vercel.json` selects it explicitly).
2. Add the env vars from 1.2 for **Production** (and Preview). `GEMINI_API_KEY` stays server-side — it's only read in `app/api/simplify/route.ts`.
3. Deploy. Open the URL on Android Chrome → menu → **Install app**.
4. In Supabase **Authentication → URL Configuration**, set the Site URL to your Vercel URL.

---

## 2. Demo accounts

Password for all: **`NilaDemo@123`** (also one-tap fill on the login page).

| Email              | Role   | Notes                                                                      |
| ------------------ | ------ | -------------------------------------------------------------------------- |
| `user@nila.demo`   | user   | **ഉമ്മ (Ummah)**, Simple Mode, 2 medicines, tasks, contacts, emergency card |
| `family@nila.demo` | family | **അബ്ദുൾ (Abdul)**, linked to Ummah with **full** access                     |
| `admin@nila.demo`  | admin  | Also owns the 10 DEMO wheelchairs as "Nila Demo Org (ഡെമോ)", verified      |

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

## 7. Next.js migration and Git workflow

Next.js owns the document, deployment, catch-all page and `/api/simplify` endpoint.
The existing React Router portals run inside a client-only boundary because camera,
speech, local storage and Leaflet require browser APIs. All existing deep links remain valid.
The manifest supports installation; the former Vite service-worker offline caching is
not included in this migration. An internet connection is required. Existing installations
should clear their previous site's service worker/cache before testing this version.

```bash
npm ci
npm run typecheck
npm run build
npm start
```

Git remote: `https://github.com/nushanhia-tech/BUILDATHON.git`.
Commit the lockfile; keep `.env.local` and server API keys out of Git.
Vercel should use the repository root and its default Next.js output directory.
After importing the repo, add the public Supabase URL/key and optional server-only
Gemini key to Vercel, then deploy. Set the deployed URL in Supabase Auth URL configuration.
Do not run the destructive demo schema against an existing production database.

Repository review: Nila includes medicine and task tracking, voice navigation,
vision/hearing assistance, wheelchair listings, consent-based family management,
and administrative controls. Supabase supplies authentication, relational data,
row-level access rules, storage and realtime updates. Sign-card SVGs are placeholders.
Live database access and Gemini require project credentials; a successful build alone
does not verify those integrations.

## 8. Phase 2 — additive installation

**Existing installation:** back up the database, then run the entire
[`supabase/phase2.sql`](supabase/phase2.sql) in Supabase **SQL Editor → New query**.
Run it as the project database owner, not through the browser API. It is a
transactional, additive migration and can be run again without resetting app data.
**Do not rerun `schema.sql` on an existing installation:** that original script deletes app data.
For a new project, run `schema.sql` once, then `phase2.sql`.

Deploy the updated `main` branch to Vercel after applying the migration. Keep:

- `NEXT_PUBLIC_SUPABASE_URL`: the project root, e.g. `https://PROJECT.supabase.co`, without `/rest/v1/`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: a publishable or legacy anon key, **never** a secret/service-role key.
- `GEMINI_API_KEY` and optional `GEMINI_MODEL`: server-only as before.

The migration creates private `voices` storage and public `story-images` storage,
adds RLS, trusted lifecycle/stock RPCs, family audit triggers and Realtime tables.
New service cards appear in the Admin Module Manager and shared service picker.
Existing users choose new services and expand each card to choose sub-features,
or apply a preset. The default language remains Malayalam.
Location consent is a separate choice: enabling a service or preset never grants GPS consent.

A daily cleanup function is included. Schedule it in **Supabase Cron** (as database owner):

```sql
select cron.schedule(
  'nila-cleanup-location', '0 2 * * *',
  $$select public.cleanup_location_pings();$$
);
```

Create this job once; enable the Cron extension first if needed. Location RLS hides
pings older than seven days even before cleanup. Low-water checks run while a User
or Family portal is open; there is no background notification server in this release.

### Phase 2 demo accounts and data

If `user@nila.demo` from the original schema exists, the migration adds:

| Email                 | Role      | Details                                                           |
| --------------------- | --------- | ----------------------------------------------------------------- |
| `volunteer@nila.demo` | volunteer | Verified NSS student; medicine pickup, tech help, hospital escort |
| `gov@nila.demo`       | gov_admin | Aggregate-only government dashboard                               |

Both use **`NilaDemo@123`**. Admin and government roles cannot be selected at signup.
Set real government roles manually as database owner:

```sql
update public.profiles set role = 'gov_admin' where id = 'ACCOUNT-UUID';
```

Seed data: 5 gallery people with labelled placeholder illustrations, 32 demo contacts
(4 per category), a Pattambi home zone (GPS sharing remains **off**), one demo medicine
with 4 units, 6 open help requests, 8 published stories (4 with synthetic English demo
voice and matching transcripts), and 60 demo surveys across Pattambi, Ongallur,
Muthuthala, Kulukkallur and Thiruvegappura. Demo setup does not overwrite real users.
The gallery's demo voice is synthetic English; replace it with the family's own
recording. Demo voices were generated with meSpeak/eSpeak; no real person's voice is used.
Surveys have an explicit `is_demo` flag, and the government dashboard labels demo results.

### Phase 2 demo script

1. Sign in as `user@nila.demo`. In Settings, rename Medicines to **ഉമ്മാന്റെ ഗുളിക**
   and choose an emoji. Save. Check Home and say that name to open the service.
   In Family → user → Customise, make another change and watch the preview before saving.
2. Enable the medicine **Stock alarm** sub-feature. The seeded four-unit medicine
   opens the stock alarm. Tap **Enable alarm sound** if autoplay was blocked.
   Acknowledge to snooze for one day, or add stock with **Add new stock**. Check the
   Family alerts screen and acknowledge the refill request there. Dose logging
   subtracts stock once even if a network request is retried.
3. Open Gallery. Tap a person, advance photos, listen to the name and demo voice.
   In Family → Gallery, upload photos, record a voice clip, and save a birthday.
   The memory game appears when enabled and at least three people exist.
4. Open Water, log a glass, undo it, set the goal and reminder interval, and check
   the weekly chart. Family can read progress and full-access family can change settings.
5. Open Location safety and read the consent explanation. Turn sharing on, keep
   the app open, and create a 100-metre zone. In Chrome DevTools **Sensors → Location**,
   move outside it, then back inside. Check the family map, trail and zone alerts.
   Stop sharing and confirm the family can no longer read GPS pings. A view-only
   family link requires the user's additional sharing permission; assist links
   do not receive location data.
6. Create a free-help request near Pattambi. Sign in as `volunteer@nila.demo`,
   confirm availability and skills, accept it, mark **On the way**, then complete
   with hours spent. Check that exact coordinates and phone appear only after
   acceptance. The requester can send a rating and thanks; Impact exports a PDF.
7. Create a story: record audio (speech transcription where supported), review and
   edit the transcript, add photos/descriptions, preview and submit. Sign in as
   admin to approve it. Check read-aloud, audio, transcript, reactions and moderated comments.
8. Sign in as `gov@nila.demo`. Filter by district, panchayat, ward, age, disability
   and need; inspect charts and the ward × need matrix. Export CSV/PDF. Confirm
   groups smaller than five display `<5`; suppressed percentages display `—`.

### Verification and limits

```bash
npm ci
npm run typecheck
npm run test:db
npm run test:demo
npm run build
```

Database tests execute PostgreSQL in PGlite, including RLS under authenticated
roles, stock retry idempotence, location consent/revocation, volunteer verification,
help transitions, anonymous feed masking, raw-survey denial and small-count suppression.
The demo test runs the original schema and the migration twice, with pgcrypto.
Browser checks were performed with mocked Supabase responses at mobile and desktop
widths; live Auth, Storage, GPS, speech and Realtime still need a check against the
configured Supabase project and actual devices.

- GPS requires HTTPS, permission, and the app open in the foreground. Browsers may
  suspend GPS in the background; dependable background tracking needs a native app
  or wearable. The location consent banner always offers Stop. Accuracy depends on GPS.
- Reminders, stock sound/flash and water checks require the app to be open. Browser
  notifications require permission and are not a background push service. Autoplay
  and Wake Lock depend on browser/device support. Acknowledged stock alerts snooze
  for a day; an empty stock has its own alert and warning at the scheduled dose time.
- Malayalam speech recognition and voices vary by browser/device. Every speech input
  has a text fallback. Audio recording needs microphone permission; stories require
  an editable text/transcript before submission. Uploaded audio is limited to 10 MB.
- Stock may be fractional for half-tablets. Days-left estimates use the configured
  units per dose and daily schedule; they never change prescribed instructions.
- Water goals are editable. Follow a clinician's fluid limit, especially for kidney
  or heart disease. Nila does not prescribe fluid intake.
- Public help descriptions must not contain private addresses. Public map coordinates
  are offset by 200–500 m; only the assigned volunteer sees precise request coordinates.
  Volunteers need admin verification for escort, transport and companionship requests.
- Anonymous stories hide the display name; content or photos can still identify someone.
  New story-image and audio paths do not encode the uploader's account ID.
  Gallery illustrations and synthetic demo clips are placeholders, not real family media.
- Government maps use approximate panchayat/ward positions for the demo areas,
  not surveyed individual coordinates. No map points are available for unknown
  areas until geographic reference data is supplied. The dashboard is for planning,
  not a statistically representative population survey. Platform signals are overall
  totals, separate from survey filters. Suppression is not a differential-privacy system.
- Certificates contain self-reported hours and are not official NSS/academic accreditation.
  PDF text is rendered through Canvas with bundled Noto Sans Malayalam to preserve shaping.
  The font's redistribution licence is in `public/fonts/LICENSE-Noto.txt`.
