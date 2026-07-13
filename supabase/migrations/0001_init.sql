-- Equipment Log schema: diesel generators, diesel fire pumps, and electric
-- fire pumps, each as a separate asset table with its own recurring
-- test/run log table (FK'd back to the asset). Locked to signed-in users
-- from the start (no public signup — accounts are admin-created).

create table if not exists diesel_generators (
  id text primary key,
  unit_tag text not null default '',
  location text default '',
  manufacturer text default '',
  model text default '',
  serial text default '',
  engine_manufacturer text default '',
  engine_model text default '',
  kw_rating text default '',
  voltage text default '',
  fuel_tank_capacity_gal text default '',
  date_installed text default '',
  notes text default '',
  has_photo boolean not null default false,
  photo_count integer not null default 0,
  thumb text,
  date_added timestamptz not null default now(),
  date_updated timestamptz not null default now()
);

create table if not exists diesel_generator_logs (
  id text primary key,
  unit_id text not null references diesel_generators(id) on delete cascade,
  log_date text not null default '',
  technician text default '',
  run_hours text default '',
  fuel_level_pct text default '',
  oil_level_ok boolean,
  coolant_level_ok boolean,
  battery_voltage text default '',
  test_result text default '',
  notes text default '',
  created_at timestamptz not null default now()
);

-- Diesel and electric fire pump asset fields mirror the "Pump and Driver
-- Information" box on the California CCR Title 19 / NFPA 25 inspection
-- forms (AES 5.1 diesel weekly, AES 5.3 electric monthly).
create table if not exists diesel_fire_pumps (
  id text primary key,
  unit_tag text not null default '',
  location text default '',
  manufacturer text default '',
  model text default '',
  serial text default '',
  rated_rpm text default '',
  controller_manufacturer text default '',
  controller_model text default '',
  controller_serial text default '',
  max_suction_pressure_psi text default '',
  max_psi_shutoff text default '',
  rated_capacity_gpm text default '',
  rated_pressure_psi text default '',
  overload_capacity_gpm text default '',
  overload_pressure_psi text default '',
  driver_manufacturer text default '',
  driver_model text default '',
  driver_rated_rpm text default '',
  fuel_tank_capacity_gal text default '',
  date_installed text default '',
  notes text default '',
  has_photo boolean not null default false,
  photo_count integer not null default 0,
  thumb text,
  date_added timestamptz not null default now(),
  date_updated timestamptz not null default now()
);

-- Log entries store the full itemized checklist (per Form AES 5.1, ~68
-- items) as jsonb keyed by item id (e.g. "1.27") rather than one column per
-- item — see DIESEL_FIRE_PUMP_CHECKLIST in src/lib/constants.js for the
-- item list this is meant to hold.
create table if not exists diesel_fire_pump_logs (
  id text primary key,
  unit_id text not null references diesel_fire_pumps(id) on delete cascade,
  log_date text not null default '',
  technician text default '',
  overall_result text default '',
  responses jsonb not null default '{}',
  notes text default '',
  created_at timestamptz not null default now()
);

create table if not exists electric_fire_pumps (
  id text primary key,
  unit_tag text not null default '',
  location text default '',
  manufacturer text default '',
  model text default '',
  serial text default '',
  rated_rpm text default '',
  controller_manufacturer text default '',
  controller_model text default '',
  controller_serial text default '',
  max_suction_pressure_psi text default '',
  max_psi_shutoff text default '',
  rated_capacity_gpm text default '',
  rated_pressure_psi text default '',
  overload_capacity_gpm text default '',
  overload_pressure_psi text default '',
  driver_manufacturer text default '',
  driver_model text default '',
  driver_rated_rpm text default '',
  full_load_amp text default '',
  rated_voltage text default '',
  service_factor text default '',
  date_installed text default '',
  notes text default '',
  has_photo boolean not null default false,
  photo_count integer not null default 0,
  thumb text,
  date_added timestamptz not null default now(),
  date_updated timestamptz not null default now()
);

-- Per Form AES 5.3 (~37 items) — see ELECTRIC_FIRE_PUMP_CHECKLIST in
-- src/lib/constants.js.
create table if not exists electric_fire_pump_logs (
  id text primary key,
  unit_id text not null references electric_fire_pumps(id) on delete cascade,
  log_date text not null default '',
  technician text default '',
  overall_result text default '',
  responses jsonb not null default '{}',
  notes text default '',
  created_at timestamptz not null default now()
);

-- Single shared, private photo bucket. Objects are keyed
-- "<unitType>/<unitId>/<file>" (e.g. "diesel_generators/abc123/000-xyz.jpg").
-- Kept private (public: false) since the app only ever reads files via
-- supabase.storage.download(), an authenticated call — never a public URL.
insert into storage.buckets (id, name, public)
values ('unit-photos', 'unit-photos', false)
on conflict (id) do nothing;

-- Row Level Security: every table below gets the same four "authenticated
-- only" policies. There's no per-row ownership — any signed-in user can
-- add, edit, or delete any row.
do $$
declare
  t text;
begin
  foreach t in array array[
    'diesel_generators', 'diesel_generator_logs',
    'diesel_fire_pumps', 'diesel_fire_pump_logs',
    'electric_fire_pumps', 'electric_fire_pump_logs'
  ]
  loop
    execute format('alter table %I enable row level security', t);

    execute format('drop policy if exists "%s authenticated select" on %I', t, t);
    execute format(
      'create policy "%s authenticated select" on %I for select using (auth.role() = ''authenticated'')',
      t, t
    );

    execute format('drop policy if exists "%s authenticated insert" on %I', t, t);
    execute format(
      'create policy "%s authenticated insert" on %I for insert with check (auth.role() = ''authenticated'')',
      t, t
    );

    execute format('drop policy if exists "%s authenticated update" on %I', t, t);
    execute format(
      'create policy "%s authenticated update" on %I for update using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')',
      t, t
    );

    execute format('drop policy if exists "%s authenticated delete" on %I', t, t);
    execute format(
      'create policy "%s authenticated delete" on %I for delete using (auth.role() = ''authenticated'')',
      t, t
    );
  end loop;
end $$;

drop policy if exists "unit-photos authenticated select" on storage.objects;
create policy "unit-photos authenticated select" on storage.objects for select
  using (bucket_id = 'unit-photos' and auth.role() = 'authenticated');

drop policy if exists "unit-photos authenticated insert" on storage.objects;
create policy "unit-photos authenticated insert" on storage.objects for insert
  with check (bucket_id = 'unit-photos' and auth.role() = 'authenticated');

drop policy if exists "unit-photos authenticated update" on storage.objects;
create policy "unit-photos authenticated update" on storage.objects for update
  using (bucket_id = 'unit-photos' and auth.role() = 'authenticated') with check (bucket_id = 'unit-photos' and auth.role() = 'authenticated');

drop policy if exists "unit-photos authenticated delete" on storage.objects;
create policy "unit-photos authenticated delete" on storage.objects for delete
  using (bucket_id = 'unit-photos' and auth.role() = 'authenticated');
