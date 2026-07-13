# Equipment Log

Diesel generator and fire pump (diesel + electric) nameplate register and
recurring test/run log, in one place.

This is a Vite + React app backed by Supabase (Postgres + Storage + Auth).
Sign-in is required — anyone with an account (created by an admin in the
Supabase dashboard, no public self-signup) can read/write the shared log.

Three equipment types, each with its own table and its own log history:

- **Diesel Generators** — nameplate + engine data, log entries track run
  hours, fuel level, oil/coolant checks, battery voltage, pass/fail.
- **Diesel Fire Pumps** — pump/driver nameplate data matching California CCR
  Title 19 / NFPA 25 Form AES 5.1, log entries are the full 68-item weekly
  inspection/test/maintenance checklist from that form.
- **Electric Fire Pumps** — pump/driver/controller nameplate data matching
  Form AES 5.3, log entries are the full 37-item monthly checklist from that
  form.

The two fire pump checklists (`DIESEL_FIRE_PUMP_CHECKLIST` and
`ELECTRIC_FIRE_PUMP_CHECKLIST` in
[`src/lib/constants.js`](src/lib/constants.js)) are transcribed item-by-item
from the official forms, including each item's number, I/T/M type, and NFPA
25 code reference, so entries can be cross-checked against a paper/PDF copy.
Each log entry stores its checklist answers as a single JSON blob rather
than one column per item — see `responses` on `diesel_fire_pump_logs` /
`electric_fire_pump_logs` in the migration. The itemized "Deficiencies and
Comments" sub-table from the paper form (with Item/Date/Riser columns) is
simplified here to one free-text "Deficiencies / Comments" field per visit.

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

## 3. Run it locally

```
npm install
npm run dev
```

## 4. Build & deploy

```
npm run build
```

Drag the `dist/` folder onto [Netlify Drop](https://app.netlify.com/drop), or
push `dist/` to GitHub Pages.

## Notes on auth

Login is required, but there's no per-row ownership — any signed-in user can
add, edit, or delete any unit or log entry, and there's no public sign-up
(accounts are created by an admin via the Supabase dashboard).

## Adding fields or a fourth equipment type

Each equipment type's asset fields and log fields are declared in
[`src/lib/constants.js`](src/lib/constants.js) (`EQUIPMENT_TYPES`) — the form
UI is generated from that config, so adding a field there plus the matching
column in a new migration is normally enough; no UI code changes needed.
