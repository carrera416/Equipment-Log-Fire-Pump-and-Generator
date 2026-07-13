import { supabase } from "./supabaseClient.js";

const PHOTOS_BUCKET = "unit-photos";

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function camelToSnake(s) {
  return s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

function snakeToCamel(s) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] || "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function rowToRecord(row) {
  const record = {};
  for (const [key, value] of Object.entries(row)) {
    record[snakeToCamel(key)] = value;
  }
  return record;
}

function recordToRow(record) {
  const row = {};
  for (const [key, value] of Object.entries(record)) {
    row[camelToSnake(key)] = value === undefined ? null : value;
  }
  return row;
}

// ---- Asset (unit) records: diesel_generators / diesel_fire_pumps / electric_fire_pumps ----

export async function loadUnits(table) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("date_added", { ascending: false });
  if (error) {
    console.error(`loadUnits(${table}) failed`, error);
    return [];
  }
  return data.map(rowToRecord);
}

export async function upsertUnit(table, record) {
  const row = recordToRow(record);
  row.date_updated = new Date().toISOString();
  const { error } = await supabase.from(table).upsert(row);
  if (error) throw error;
}

export async function deleteUnit(table, id) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

export function newUnitId() {
  return uid();
}

// ---- Log entries: one child table per equipment type, FK'd to the unit ----

export async function loadLogs(logTable, unitId) {
  const { data, error } = await supabase
    .from(logTable)
    .select("*")
    .eq("unit_id", unitId)
    .order("log_date", { ascending: false });
  if (error) {
    console.error(`loadLogs(${logTable}) failed`, error);
    return [];
  }
  return data.map(rowToRecord);
}

export async function insertLog(logTable, record) {
  const row = recordToRow({ ...record, id: record.id || uid() });
  const { error } = await supabase.from(logTable).insert(row);
  if (error) throw error;
}

export async function deleteLog(logTable, id) {
  const { error } = await supabase.from(logTable).delete().eq("id", id);
  if (error) throw error;
}

// ---- Photos: shared bucket, objects keyed "<unitType>/<unitId>/<file>" ----

export async function loadPhotos(unitType, unitId) {
  const prefix = `${unitType}/${unitId}`;
  const { data: files, error } = await supabase.storage.from(PHOTOS_BUCKET).list(prefix);
  if (error || !files || files.length === 0) return [];
  const sorted = files.slice().sort((a, b) => a.name.localeCompare(b.name));
  const blobs = await Promise.all(
    sorted.map(async (f) => {
      const { data, error: dlError } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .download(`${prefix}/${f.name}`);
      if (dlError || !data) return null;
      return blobToDataUrl(data);
    })
  );
  return blobs.filter(Boolean);
}

export async function savePhotos(unitType, unitId, dataUrls) {
  await deletePhotos(unitType, unitId);
  const prefix = `${unitType}/${unitId}`;
  await Promise.all(
    dataUrls.map((dataUrl, i) => {
      const blob = dataUrlToBlob(dataUrl);
      const ext = blob.type === "image/png" ? "png" : "jpg";
      const path = `${prefix}/${String(i).padStart(3, "0")}-${uid()}.${ext}`;
      return supabase.storage.from(PHOTOS_BUCKET).upload(path, blob, {
        contentType: blob.type,
        upsert: true,
      });
    })
  );
}

export async function deletePhotos(unitType, unitId) {
  const prefix = `${unitType}/${unitId}`;
  const { data: files } = await supabase.storage.from(PHOTOS_BUCKET).list(prefix);
  if (files && files.length > 0) {
    await supabase.storage.from(PHOTOS_BUCKET).remove(files.map((f) => `${prefix}/${f.name}`));
  }
}
