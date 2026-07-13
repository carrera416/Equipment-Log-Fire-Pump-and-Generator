import { supabase } from "./supabaseClient.js";

export async function extractFromPhoto(dataUrl, fields, equipmentLabel) {
  const base64 = dataUrl.split(",")[1];
  const mediaType = dataUrl.substring(dataUrl.indexOf(":") + 1, dataUrl.indexOf(";"));
  const { data, error } = await supabase.functions.invoke("extract-nameplate", {
    body: {
      image: base64,
      mediaType,
      fields: fields.map((f) => ({ name: f.name, label: f.label })),
      equipmentLabel,
    },
  });
  if (error) throw error;
  return data;
}
