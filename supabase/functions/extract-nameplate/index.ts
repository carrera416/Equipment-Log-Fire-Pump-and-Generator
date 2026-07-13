// Supabase Edge Function: proxies "Read Nameplate with AI" extraction to the
// Gemini API (free tier — no billing setup required). Holds GEMINI_API_KEY
// server-side (set via `supabase secrets set GEMINI_API_KEY=...`) so it
// never ships to the browser.
//
// Unlike Tag Log's extract-tag function (which has one fixed HVAC field
// list baked into its prompt), this one is field-list driven: the client
// sends the aiReadable fields for whichever equipment type is open —
// diesel generator, diesel fire pump, or electric fire pump each have a
// different nameplate layout — and the prompt is built from that list. See
// `aiReadable` on fields in src/lib/constants.js.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Base64 grows input size by ~4/3; 15MB of base64 text caps the source photo
// around 11MB, comfortably above any phone-camera nameplate shot.
const MAX_IMAGE_BASE64_LENGTH = 15 * 1024 * 1024;
const MAX_FIELDS = 40;

function buildPrompt(equipmentLabel: string, fields: { name: string; label: string }[]) {
  const fieldList = fields.map((f) => `${f.name} (${f.label})`).join(", ");
  const keyList = fields.map((f) => f.name).join(", ");
  return (
    `You are reading a photo of a nameplate on a piece of fire/life-safety ` +
    `equipment — specifically a ${equipmentLabel}. Extract these fields ONLY ` +
    `if they are clearly printed and legible on the nameplate: ${fieldList}. ` +
    `Do not guess, infer, or fill in a value you are not confident about — if ` +
    `a field is missing, blurry, cut off, or not present on this nameplate, ` +
    `leave it as an empty string "". It is better to leave a field blank than ` +
    `to put in a wrong or made-up value. Respond with ONLY a raw JSON object ` +
    `with exactly these keys: ${keyList} — no markdown, no code fences, no ` +
    `explanation, just the JSON object.`
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // Defense in depth: confirm the caller has a valid Supabase session even
    // if this function's verify_jwt setting is ever disabled at the platform
    // level (there's no config.toml pinning it, so it isn't guaranteed).
    const authHeader = req.headers.get("authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { image, mediaType, fields, equipmentLabel } = await req.json();
    if (!image || !mediaType) {
      return new Response(JSON.stringify({ error: "Missing image or mediaType" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    if (typeof image !== "string" || image.length > MAX_IMAGE_BASE64_LENGTH) {
      return new Response(JSON.stringify({ error: "Image too large" }), {
        status: 413,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    if (
      !Array.isArray(fields) ||
      fields.length === 0 ||
      fields.length > MAX_FIELDS ||
      !fields.every(
        (f) => f && typeof f.name === "string" && typeof f.label === "string"
      )
    ) {
      return new Response(JSON.stringify({ error: "Invalid fields list" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const prompt = buildPrompt(
      typeof equipmentLabel === "string" && equipmentLabel ? equipmentLabel : "piece of equipment",
      fields
    );

    const requestBody = JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mediaType, data: image } },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    // Gemini's free tier occasionally returns 503 "model overloaded" under load —
    // transient, so a couple of short retries clears most of them without the
    // user having to manually click the button again.
    let geminiRes: Response | undefined;
    let lastErrText = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      geminiRes = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: requestBody,
        }
      );
      if (geminiRes.ok) break;
      if (geminiRes.status !== 503 || attempt === 2) break;
      lastErrText = await geminiRes.text();
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }

    if (!geminiRes!.ok) {
      const errText = lastErrText || (await geminiRes!.text());
      return new Response(JSON.stringify({ error: `API error ${geminiRes!.status}: ${errText}` }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const data = await geminiRes.json();
    const finishReason = data.candidates?.[0]?.finishReason;
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p.text || "")
      .join("");
    const clean = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (parseErr) {
      return new Response(
        JSON.stringify({
          error: `Failed to parse model response (finishReason: ${finishReason}): ${String(parseErr)}`,
          rawTextLength: text.length,
        }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
