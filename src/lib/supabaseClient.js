import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env and fill them in. " +
    "Falling back to a placeholder client so the UI can still render; any Supabase call will fail until configured."
  );
}

// supabase-js validates the URL at construction time, so a placeholder keeps
// the client buildable without real credentials (network calls will just
// fail, which the app already handles with toasts/empty states).
export const supabase = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder-anon-key");
