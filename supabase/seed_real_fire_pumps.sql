-- One-time seed of the 6 real fire pumps from the nameplate PDFs you sent
-- (2755, 5451, 5453, 5455 Great America — electric; 2550, 2600 Great
-- America Way — diesel). Run this once in the Supabase SQL Editor after
-- 0001_init.sql. Safe to re-run — ids are fixed, upsert-style via ON
-- CONFLICT DO NOTHING, so running twice won't duplicate rows.

insert into electric_fire_pumps (
  id, unit_tag, location, manufacturer, model, serial, rated_rpm,
  controller_manufacturer, controller_model, controller_serial,
  max_suction_pressure_psi, max_psi_shutoff, rated_capacity_gpm, rated_pressure_psi,
  overload_capacity_gpm, overload_pressure_psi,
  driver_manufacturer, driver_model, driver_rated_rpm,
  full_load_amp, rated_voltage, service_factor
) values
  ('efp-2755-great-america-way', 'FP-1', '2755 Great America Way', 'Pentair', '4-383-9C', '13-2360890', '3500',
   'Eaton', 'FT30-30-A-L1-CX', 'NA',
   '116.5', '83.5', '3500', '75',
   '', '61.9',
   'NA', 'NA', '3540',
   '79.3', '400', '1.15'),
  ('efp-5451-great-america-pkwy', 'FP-1', '5451 Great America Parkway', 'Aurora', '4-383-9C', '24-2676427', '3500',
   'Eaton', '', '',
   '90', '86', '500', '75',
   '', '58.9',
   'WEG', '030360P3EFP284', '3545',
   '69.8', '460', '1.15'),
  ('efp-5453-great-america-pkwy', 'FP-1', '5453 Great America Parkway', 'Aurora', '4-383-9C', '12-2282036', '3500',
   'Eaton', 'FT30-30-D-L1', '16BV700E',
   '113', '87', '500', '75',
   '', '64.4',
   'US Motors', 'DC04', '3560',
   '79/34', '230/460', '1.15'),
  ('efp-5455-great-america-pkwy', 'FP-1', '5455 Great America Parkway', 'Aurora', '4-383-9C', '12-2285911', '3500',
   'Eaton', 'FT30-30-D-L1', '16BV226E',
   '114', '86', '500', '75',
   '', '63.7',
   'US Motors', 'DC04', '3560',
   '79/34', '230/460', '1.15')
on conflict (id) do nothing;

insert into diesel_fire_pumps (
  id, unit_tag, location, manufacturer, model, serial, rated_rpm,
  controller_manufacturer, controller_model, controller_serial,
  max_suction_pressure_psi, max_psi_shutoff, rated_capacity_gpm, rated_pressure_psi,
  overload_capacity_gpm, overload_pressure_psi,
  driver_manufacturer, driver_model, driver_rated_rpm,
  fuel_tank_capacity_gal
) values
  ('dfp-2550-great-america-way', 'FP-1', '2550 Great America Way', 'Aurora', '12FCM', '2367061-0', '1763',
   'Eaton', 'FD120-L1', '16BY255D',
   'NA', '191.2', '750', '168.9',
   '1125', '133',
   'Clarke', 'JU4H-UFAD5G', '',
   '165'),
  ('dfp-2600-great-america-way', 'FP-1', '2600 Great America Way', 'Aurora', '12FCM', '2367061-1', '1760',
   'Eaton', 'FD120-L1', '16BY255D',
   'NA', '190.1', '750', '168.9',
   '1125', '131',
   'Clarke', 'JU4H-UFAD5G', '',
   '165')
on conflict (id) do nothing;
