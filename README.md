# Equipment Log

Diesel generator and fire pump (diesel + electric) nameplate register and
recurring test/run log, in one place.

## Quick reference

- **Live app:** https://unique-kelpie-89a72a.netlify.app
- **This repo:** https://github.com/carrera416/Equipment-Log-Fire-Pump-and-Generator
- **Deploy is manual** — pushing to GitHub does *not* update the live site by
  itself. To publish a change:
  1. `npm run build` (produces a `dist/` folder)
  2. Go to https://app.netlify.com/sites/unique-kelpie-89a72a/deploys
  3. Drag the **contents** of `dist/` (not the zipped folder, not a partial
     selection — all of it in one drop: `assets/`, `icons/`, `pdf-templates/`,
     `index.html`, `manifest.webmanifest`, `registerSW.js`, `sw.js`, the
     `workbox-*.js` file) onto the drop zone, and wait for it to show
     "Published" before reloading the site.
  4. Once live, the app self-updates any already-open tabs/installed copies
     within about a minute — no need to tell people to hard-refresh.
- **Supabase project:** get the URL + anon key from the Supabase dashboard →
  Project Settings → API (or copy them from the `.env` file on whichever
  computer you set up first — `.env` isn't committed to this repo, so each
  computer needs its own copy; see step 2 below).

## Working on this from a second computer

```
git clone https://github.com/carrera416/Equipment-Log-Fire-Pump-and-Generator.git equipment-log
cd equipment-log
npm install
cp .env.example .env   # then fill in the Supabase URL + anon key, see above
npm run dev
```

That's the whole setup — everything else (Supabase project, live site,
Netlify config) is already shared/hosted, so a second computer just needs the
code plus its own `.env`.

This is a Vite + React app backed by Supabase (Postgres + Storage + Auth).
Sign-in is required — anyone with an account (created by an admin in the
Supabase dashboard, no public self-signup) can read/write the shared log.

Three equipment types, each with its own table and its own log history:

- **Diesel Generators** — nameplate + air-permit fields (PTO number, K-12
  proximity, max annual/monthly hours) matching "Emergency Engine Operating
  Log Template.xlsx" (a Bay Area Air District permit-compliance log combined
  with an NFPA 110 maintenance checklist), log entries are the 41-item
  checklist from that sheet.
- **Diesel Fire Pumps** — pump/driver nameplate data matching California CCR
  Title 19 / NFPA 25 Form AES 5.1, log entries are the full 68-item weekly
  inspection/test/maintenance checklist from that form.
- **Electric Fire Pumps** — pump/driver/controller nameplate data matching
  Form AES 5.3, log entries are the full 37-item monthly checklist from that
  form.

The three checklists (`DIESEL_GENERATOR_CHECKLIST`, `DIESEL_FIRE_PUMP_CHECKLIST`,
`ELECTRIC_FIRE_PUMP_CHECKLIST` in [`src/lib/constants.js`](src/lib/constants.js))
are transcribed item-by-item from the source documents, including each
item's number/type and its reference or acceptable-range text, so entries
can be cross-checked against the original form. For the generator checklist,
items 1 ("Record Date of Test / Operation") and 8 ("Test Performed By") from
the spreadsheet are folded into the log entry's top-level Date and
Technician fields rather than duplicated as checklist rows — everything else
(items 2-7, 9-43) is there. Each log entry stores its checklist answers as a
single JSON blob rather than one column per item — see `responses` on
`diesel_generator_logs` / `diesel_fire_pump_logs` / `electric_fire_pump_logs`
in the migration. The fire pump forms' itemized "Deficiencies and Comments"
sub-table (with Item/Date/Riser columns) is simplified here to one free-text
"Deficiencies / Comments" field per visit.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), create a free project.
2. In the SQL Editor, run
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   This creates all six tables (three asset tables + three log tables), the
   `unit-photos` storage bucket, and locks all of it down to signed-in users
   only.
3. In Project Settings → API, copy the **Project URL** and **anon public**
   key.
4. Create accounts for your team: Authentication → Users → **Add user** →
   set an email and a temporary password. There's no public sign-up screen
   in the app — accounts are admin-created only.
5. To force someone to set their own password on first login (recommended
   for any temporary password you hand out), run this in the SQL Editor
   after creating them:
   ```sql
   update auth.users
   set raw_user_meta_data = raw_user_meta_data || '{"must_change_password": true}'::jsonb
   where email = 'person@example.com';
   ```
   They'll be prompted to set a new password immediately after their first
   sign-in, before they can see the app.

## 2. Configure the app

```
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the values from
step 1.

## 3. Deploy the AI nameplate-extraction function

The "Read Nameplate with AI" button (in the Add/Edit form, once a photo is
attached) calls a Supabase Edge Function
(`supabase/functions/extract-nameplate`) that holds a Gemini API key
server-side — it's never shipped to the browser. Gemini (not Anthropic) was
chosen here specifically because its Flash models have a genuinely free tier
(roughly 15 requests/min, 1,500/day as of 2026) with no billing setup
required — get a key at [Google AI Studio](https://aistudio.google.com/apikey)
with just a Google account.

Unlike a fixed nameplate layout, this function is field-list driven: the
client sends whichever fields are marked `aiReadable: true` on the current
equipment type in [`src/lib/constants.js`](src/lib/constants.js) (pump specs
for fire pumps, engine/fuel specs for generators), and the prompt is built
from that list — so adding an `aiReadable` field there is enough to have the
AI extract it too, no edge function changes needed.

**Option A — Supabase CLI** (if you have it installed and logged in):
```
supabase link --project-ref your-project-ref
supabase secrets set GEMINI_API_KEY=AIza...
supabase functions deploy extract-nameplate --no-verify-jwt
```
`--no-verify-jwt` keeps the function reachable with just the anon key — the
app's own login screen is what actually gates access, not this function (the
function also independently checks for a valid session as defense in depth).

**Option B — Dashboard**: Project → Edge Functions → Create a new function
named `extract-nameplate`, paste in the contents of
[`supabase/functions/extract-nameplate/index.ts`](supabase/functions/extract-nameplate/index.ts),
then add `GEMINI_API_KEY` under Edge Functions → Secrets. Set the function's
"Enforce JWT verification" toggle off.

Without this step, everything else in the app works — only "Read Nameplate
with AI" will fail (with a toast saying so; manual data entry is unaffected).

## 4. Run it locally

```
npm install
npm run dev
```

## 5. Build & deploy

See **Quick reference** at the top of this file for the exact steps to
publish to the live site.

## Notes on auth

Login is required, but there's no per-row ownership — any signed-in user can
add, edit, or delete any unit or log entry, and there's no public sign-up
(accounts are created by an admin via the Supabase dashboard).

## Adding fields or a fourth equipment type

Each equipment type's asset fields and log fields are declared in
[`src/lib/constants.js`](src/lib/constants.js) (`EQUIPMENT_TYPES`) — the form
UI is generated from that config, so adding a field there plus the matching
column in a new migration is normally enough; no UI code changes needed. Mark
a field `aiReadable: true` if it's actual nameplate data (manufacturer,
model, serial, ratings) — those are the fields "Read Nameplate with AI" will
try to fill in. Leave permit/administrative fields (unit tag, location,
install date, PTO number, etc.) unmarked since they aren't printed on the
equipment itself.
