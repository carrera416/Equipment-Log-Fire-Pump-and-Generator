import React, { useState, useEffect, useCallback } from "react";
import {
  Camera, Search, Plus, X, Trash2, AlertTriangle, Check,
  Image as ImageIcon, LogOut, ClipboardList, Sparkles, Loader2, RotateCw, FileDown,
} from "lucide-react";
import {
  loadUnits, upsertUnit, deleteUnit, newUnitId,
  loadLogs, insertLog, deleteLog,
  loadPhotos, savePhotos, deletePhotos,
} from "./lib/db.js";
import { EQUIPMENT_TYPES, OPTION_LISTS } from "./lib/constants.js";
import { supabase } from "./lib/supabaseClient.js";
import { extractFromPhoto } from "./lib/extractNameplate.js";
import { exportLogsToPdf } from "./lib/exportPdf.js";

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeImage(dataUrl, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width); width = maxDim;
      } else if (height >= width && height > maxDim) {
        width = Math.round((width * maxDim) / height); height = maxDim;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Rotates a dataURL image 90° clockwise per call (degrees is a multiple of 90).
function rotateImage(dataUrl, degrees) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const swap = degrees % 180 !== 0;
      const canvas = document.createElement("canvas");
      canvas.width = swap ? img.height : img.width;
      canvas.height = swap ? img.width : img.height;
      const ctx = canvas.getContext("2d");
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function isHeicFile(file) {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return type.includes("heic") || type.includes("heif") || /\.heic$|\.heif$/.test(name);
}

function emptyAssetForm(type) {
  const f = {};
  for (const field of type.assetFields) f[field.name] = field.type === "checkbox" ? false : "";
  return f;
}

function emptyLogForm(type) {
  const f = {};
  for (const field of type.logFields) {
    if (field.type === "checkbox") f[field.name] = false;
    else if (field.name === "logDate") f[field.name] = todayStr();
    else f[field.name] = "";
  }
  if (type.checklist) f.responses = {};
  return f;
}

function countChecklistFails(responses) {
  if (!responses) return 0;
  return Object.values(responses).filter((v) => v === "Fail").length;
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`el-toast el-toast-${toast.type}`}>
      {toast.type === "error" ? <AlertTriangle size={16} /> : <Check size={16} />}
      <span>{toast.message}</span>
    </div>
  );
}

function Field({ label, required, span, children }) {
  return (
    <div className="el-field" style={span === 2 ? { gridColumn: "1 / -1" } : undefined}>
      <label className="el-field-label">{label} {required && <span className="el-req">*</span>}</label>
      {children}
    </div>
  );
}

function FormField({ field, value, onChange, error }) {
  const id = `f-${field.name}`;
  if (field.type === "checkbox") {
    return (
      <div className="el-field" style={field.span === 2 ? { gridColumn: "1 / -1" } : undefined}>
        <label className="el-checkbox-row">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          {field.label}
        </label>
      </div>
    );
  }
  if (field.type === "select") {
    const options = OPTION_LISTS[field.options] || [];
    return (
      <Field label={field.label} required={field.required} span={field.span}>
        <select className="el-field-input" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>
    );
  }
  if (field.multiline) {
    return (
      <Field label={field.label} required={field.required} span={field.span}>
        <textarea
          className="el-field-input"
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
    );
  }
  return (
    <Field label={field.label} required={field.required} span={field.span}>
      {field.datalist && (
        <datalist id={id}>
          {(OPTION_LISTS[field.datalist] || []).map((o) => <option key={o} value={o} />)}
        </datalist>
      )}
      <input
        className={`el-field-input${field.mono ? " el-field-mono" : ""}${error ? " el-field-input-error" : ""}`}
        type={field.type || "text"}
        list={field.datalist ? id : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

function groupChecklist(checklist) {
  const sections = [];
  for (const item of checklist) {
    let section = sections.find((s) => s.name === item.section);
    if (!section) { section = { name: item.section, items: [] }; sections.push(section); }
    section.items.push(item);
  }
  return sections;
}

// Renders the itemized NFPA 25 / CCR Title 19 checklist for one log entry —
// "check" items get a Pass/Fail/N/A select, "reading" items a numeric input
// with the form's unit suffixed.
function ChecklistFields({ checklist, responses, onChange }) {
  const sections = groupChecklist(checklist);
  return (
    <div className="el-checklist">
      {sections.map((section) => (
        <div className="el-checklist-section" key={section.name}>
          <div className="el-checklist-section-title">{section.name}</div>
          {section.items.map((item) => (
            <div className="el-checklist-row" key={item.id}>
              <div className="el-checklist-row-label">
                <span className="el-checklist-item-id">{item.id}</span>
                <span className="el-checklist-item-type">{item.type}</span>
                <span>{item.label}</span>
                {item.ref && <span className="el-checklist-item-ref">{item.ref}</span>}
              </div>
              <div className="el-checklist-row-input">
                {item.valueType === "check" || item.valueType === "select" ? (
                  <select
                    className="el-field-input el-checklist-select"
                    value={responses[item.id] || ""}
                    onChange={(e) => onChange(item.id, e.target.value)}
                  >
                    <option value="">—</option>
                    {(item.valueType === "select" ? item.options : OPTION_LISTS.CHECK_OPTIONS).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <div className="el-checklist-reading">
                    <input
                      className="el-field-input"
                      type="text"
                      inputMode={item.valueType === "reading" ? "decimal" : "text"}
                      value={responses[item.id] || ""}
                      onChange={(e) => onChange(item.id, e.target.value)}
                    />
                    {item.unit && <span className="el-checklist-unit">{item.unit}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Read-only expansion of a saved log entry's checklist responses.
function ChecklistView({ checklist, responses }) {
  const answered = checklist.filter((item) => (responses[item.id] || "").toString().trim() !== "");
  if (answered.length === 0) return <div className="el-empty-sub">No checklist items recorded.</div>;
  return (
    <div className="el-checklist-view">
      {answered.map((item) => (
        <div className="el-checklist-view-row" key={item.id}>
          <span className="el-checklist-item-id">{item.id}</span>
          <span className="el-checklist-view-label">{item.label}</span>
          <span className={`el-checklist-view-value${responses[item.id] === "Fail" ? " el-checklist-view-fail" : ""}`}>
            {responses[item.id]}{item.unit ? ` ${item.unit}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AuthGate() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (session === undefined) {
    return (
      <div className="el-root">
        <style>{CSS}</style>
        <div className="el-loading-row" style={{ minHeight: "100vh" }}><span className="el-spinner el-spinner-dark" /></div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  if (session.user?.user_metadata?.must_change_password) {
    return <ForcePasswordChange />;
  }

  return <EquipmentLogApp userEmail={session.user?.email} />;
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Incorrect email or password" : error.message);
      setBusy(false);
    }
  }

  return (
    <div className="el-root">
      <style>{CSS}</style>
      <div className="el-login-wrap">
        <form className="el-login-card" onSubmit={handleSubmit}>
          <div className="el-brand-title" style={{ color: "var(--el-ink)" }}>Equipment Log</div>
          <div className="el-brand-subtitle" style={{ color: "var(--el-ink-muted)", marginBottom: 24 }}>Sign in to continue</div>
          <Field label="Email">
            <input
              className="el-field-input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </Field>
          <Field label="Password">
            <input
              className="el-field-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {error && <div className="el-login-error"><AlertTriangle size={14} /> {error}</div>}
          <button className="el-btn-accent el-login-submit" type="submit" disabled={busy}>
            {busy && <span className="el-spinner" />} Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

function ForcePasswordChange() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  return (
    <div className="el-root">
      <style>{CSS}</style>
      <div className="el-login-wrap">
        <form className="el-login-card" onSubmit={handleSubmit}>
          <div className="el-brand-title" style={{ color: "var(--el-ink)" }}>Set a New Password</div>
          <div className="el-brand-subtitle" style={{ color: "var(--el-ink-muted)", marginBottom: 24 }}>
            Choose a password only you know before continuing
          </div>
          <Field label="New Password">
            <input
              className="el-field-input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </Field>
          <Field label="Confirm Password">
            <input
              className="el-field-input"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </Field>
          {error && <div className="el-login-error"><AlertTriangle size={14} /> {error}</div>}
          <button className="el-btn-accent el-login-submit" type="submit" disabled={busy}>
            {busy && <span className="el-spinner" />} Set Password
          </button>
        </form>
      </div>
    </div>
  );
}

function EquipmentLogApp({ userEmail }) {
  const [screen, setScreen] = useState("home");
  const [activeKey, setActiveKey] = useState(EQUIPMENT_TYPES[0].key);
  const [pendingOpenUnitId, setPendingOpenUnitId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, []);

  const activeType = EQUIPMENT_TYPES.find((t) => t.key === activeKey);

  function goHome() {
    setScreen("home");
    setPendingOpenUnitId(null);
  }

  function goToType(key) {
    setScreen("type");
    setActiveKey(key);
    setPendingOpenUnitId(null);
  }

  function openUnitFromHome(key, unitId) {
    setActiveKey(key);
    setPendingOpenUnitId(unitId);
    setScreen("type");
  }

  return (
    <div className="el-root">
      <style>{CSS}</style>
      <div className="el-topbar">
        <div className="el-topbar-inner">
          <div className="el-topbar-row el-topbar-row-brand">
            <div>
              <div className="el-brand-title">Equipment Log</div>
              <div className="el-brand-subtitle">Generators &amp; Fire Pumps</div>
            </div>
            <div className="el-topbar-actions">
              <button className="el-btn-ghost-dark" onClick={() => supabase.auth.signOut()} title={userEmail}>
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          </div>
          <div className="el-tabs">
            <button
              className={`el-tab${screen === "home" ? " el-tab-active" : ""}`}
              onClick={goHome}
            >
              Home
            </button>
            {EQUIPMENT_TYPES.map((t) => (
              <button
                key={t.key}
                className={`el-tab${screen === "type" && t.key === activeKey ? " el-tab-active" : ""}`}
                onClick={() => goToType(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {screen === "home" ? (
        <HomeScreen onSelectUnit={openUnitFromHome} />
      ) : (
        <EquipmentSection
          key={activeType.key}
          type={activeType}
          showToast={showToast}
          pendingOpenUnitId={pendingOpenUnitId}
          onConsumedPendingOpen={() => setPendingOpenUnitId(null)}
        />
      )}
      <Toast toast={toast} />
    </div>
  );
}

function HomeScreen({ onSelectUnit }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all(
      EQUIPMENT_TYPES.map((type) => loadUnits(type.key).then((units) => units.map((unit) => ({ type, unit }))))
    ).then((groups) => {
      if (!active) return;
      const flat = groups.flat().sort((a, b) => homeBubbleLabel(a).localeCompare(homeBubbleLabel(b)));
      setEntries(flat);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const filtered = entries.filter(({ type, unit }) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [unit.unitTag, unit.location, type.homeLabel, unit.manufacturer, unit.model, unit.serial]
      .some((v) => (v || "").toLowerCase().includes(q));
  });

  return (
    <div className="el-page-body">
      <div className="el-search-wrap">
        <span className="el-search-icon"><Search size={16} /></span>
        <input
          className="el-search-input"
          placeholder="Search all equipment..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="el-count-line" style={{ marginTop: 18, marginBottom: 12 }}>
        {filtered.length} {filtered.length === 1 ? "Unit" : "Units"}
      </div>

      {loading ? (
        <div className="el-loading-row"><span className="el-spinner el-spinner-dark" /></div>
      ) : filtered.length === 0 ? (
        <div className="el-empty-state">
          <ClipboardList size={30} />
          <div className="el-empty-title">No equipment yet</div>
          <div className="el-empty-sub">Use the tabs above to add a generator or fire pump.</div>
        </div>
      ) : (
        <div className="el-bubble-row">
          {filtered.map(({ type, unit }) => (
            <button
              key={type.key + unit.id}
              className={`el-bubble el-bubble-${type.key}`}
              onClick={() => onSelectUnit(type.key, unit.id)}
            >
              {homeBubbleLabel({ type, unit })}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// "5451 - Fire Pump" when the unit tag alone doesn't say what it is, or just
// the tag as typed ("5451/5453/5455 Generator") when it already does.
function homeBubbleLabel({ type, unit }) {
  const tag = (unit.unitTag || unit.location || "Untitled").trim();
  if (tag.toLowerCase().includes(type.singular.toLowerCase())) return tag;
  return `${tag} - ${type.singular}`;
}

function EquipmentSection({ type, showToast, pendingOpenUnitId, onConsumedPendingOpen }) {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingUnit, setEditingUnit] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailUnit, setDetailUnit] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await loadUnits(type.key);
    setUnits(data);
    setLoading(false);
  }, [type.key]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!pendingOpenUnitId) return;
    const match = units.find((u) => u.id === pendingOpenUnitId);
    if (match) {
      setDetailUnit(match);
      onConsumedPendingOpen();
    }
  }, [units, pendingOpenUnitId, onConsumedPendingOpen]);

  const filtered = units.filter((u) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [u.unitTag, u.location, u.manufacturer, u.model, u.serial]
      .some((v) => (v || "").toLowerCase().includes(q));
  });

  function openAdd() {
    setEditingUnit(null);
    setModalOpen(true);
  }

  function openEdit(unit) {
    setEditingUnit(unit);
    setModalOpen(true);
  }

  return (
    <>
      <div className="el-page-body">
        <div className="el-search-wrap">
          <span className="el-search-icon"><Search size={16} /></span>
          <input
            className="el-search-input"
            placeholder={`Search ${type.label.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="el-toolbar-row">
          <div className="el-count-line">{filtered.length} {filtered.length === 1 ? type.singular : type.label}</div>
          <button className="el-btn-accent" onClick={openAdd}><Plus size={14} /> Add {type.singular}</button>
        </div>

        {loading ? (
          <div className="el-loading-row"><span className="el-spinner el-spinner-dark" /></div>
        ) : filtered.length === 0 ? (
          <div className="el-empty-state">
            <ClipboardList size={30} />
            <div className="el-empty-title">No {type.label.toLowerCase()} yet</div>
            <div className="el-empty-sub">Add the first one to start tracking nameplate data and test/run logs.</div>
          </div>
        ) : (
          <div className="el-grid">
            {filtered.map((u) => (
              <UnitCard key={u.id} unit={u} onClick={() => setDetailUnit(u)} />
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <UnitModal
          type={type}
          unit={editingUnit}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); refresh(); showToast(editingUnit ? "Saved changes" : "Added"); }}
          onDeleted={() => { setModalOpen(false); setDetailUnit(null); refresh(); showToast("Deleted"); }}
          showToast={showToast}
        />
      )}

      {detailUnit && (
        <DetailModal
          type={type}
          unit={units.find((u) => u.id === detailUnit.id) || detailUnit}
          onClose={() => setDetailUnit(null)}
          onEdit={() => { setDetailUnit(null); openEdit(units.find((u) => u.id === detailUnit.id) || detailUnit); }}
          showToast={showToast}
        />
      )}
    </>
  );
}

function UnitCard({ unit, onClick }) {
  return (
    <button className="el-card" onClick={onClick}>
      <div className="el-card-strip" />
      <div className="el-card-head">
        <div className="el-card-head-text">
          <div className="el-card-title">{unit.unitTag || "Untitled"}</div>
          {unit.location && <div className="el-card-location">{unit.location}</div>}
        </div>
        <div className="el-card-thumb">
          {unit.thumb ? <img src={unit.thumb} alt="" /> : <ImageIcon size={18} />}
        </div>
      </div>
      {(unit.manufacturer || unit.model || unit.serial) && (
        <div className="el-card-body">
          {(unit.manufacturer || unit.model) && (
            <div className="el-card-mfg">{[unit.manufacturer, unit.model].filter(Boolean).join(" · ")}</div>
          )}
          {unit.serial && <div className="el-card-serial">SN {unit.serial}</div>}
        </div>
      )}
    </button>
  );
}

function UnitModal({ type, unit, onClose, onSaved, onDeleted, showToast }) {
  const [form, setForm] = useState(() => {
    const base = emptyAssetForm(type);
    if (unit) for (const k of Object.keys(base)) base[k] = unit[k] ?? base[k];
    return base;
  });
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [unitTagError, setUnitTagError] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (unit?.hasPhoto) {
      loadPhotos(type.key, unit.id).then((dataUrls) => {
        if (active) setPendingPhotos(dataUrls.map((dataUrl) => ({ id: uid(), dataUrl, existing: true })));
      });
    }
    return () => { active = false; };
  }, [unit, type.key]);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    if (name === "unitTag") setUnitTagError(false);
  }

  async function handlePhotoChange(e) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setPhotoError(null);

    const heicFiles = files.filter(isHeicFile);
    const goodFiles = files.filter((f) => !isHeicFile(f));

    if (heicFiles.length > 0) {
      setPhotoError(
        "Some photos are in iPhone's HEIC format, which this app can't read directly. " +
        'Switch to Settings → Camera → Formats → "Most Compatible" on your iPhone, or take a ' +
        "screenshot of the photo and upload that instead."
      );
    }
    if (goodFiles.length === 0) { e.target.value = ""; return; }

    setPhotoLoading(true);
    try {
      const processed = await Promise.all(
        goodFiles.map(async (file) => {
          const raw = await fileToDataUrl(file);
          const full = await resizeImage(raw, 900, 0.75);
          return { id: uid(), dataUrl: full };
        })
      );
      setPendingPhotos((prev) => [...prev, ...processed]);
    } catch (err) {
      console.error("Photo processing failed", err);
      setPhotoError("Couldn't process one of those photos — try a standard JPEG or PNG.");
    } finally {
      setPhotoLoading(false);
      e.target.value = "";
    }
  }

  function removePhoto(photoId) {
    setPendingPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  async function rotatePhoto(photoId) {
    const photo = pendingPhotos.find((p) => p.id === photoId);
    if (!photo) return;
    const rotated = await rotateImage(photo.dataUrl, 90);
    setPendingPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, dataUrl: rotated } : p)));
  }

  async function handleAIExtract() {
    if (pendingPhotos.length === 0) return;
    const aiFields = type.assetFields.filter((f) => f.aiReadable);
    if (aiFields.length === 0) return;
    setAiLoading(true);
    setPhotoError(null);
    try {
      const extracted = await extractFromPhoto(pendingPhotos[0].dataUrl, aiFields, type.singular);
      setForm((f) => {
        const next = { ...f };
        aiFields.forEach((field) => {
          if (extracted[field.name] && !next[field.name]) next[field.name] = extracted[field.name];
        });
        return next;
      });
      showToast("Filled in fields from the photo — check them over", "success");
    } catch (err) {
      console.error("AI extract failed", err);
      setPhotoError("Couldn't read the nameplate automatically. Try a clearer, well-lit photo, or enter the fields by hand.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSave() {
    if (!form.unitTag.trim()) {
      setUnitTagError(true);
      showToast("Enter a Unit Tag before saving", "error");
      return;
    }
    setSaving(true);
    try {
      const isEdit = Boolean(unit);
      const id = isEdit ? unit.id : newUnitId();
      const hasPhoto = pendingPhotos.length > 0;

      if (hasPhoto) {
        await savePhotos(type.key, id, pendingPhotos.map((p) => p.dataUrl));
      } else if (isEdit && unit.hasPhoto) {
        await deletePhotos(type.key, id);
      }

      let thumb = null;
      if (hasPhoto) thumb = await resizeImage(pendingPhotos[0].dataUrl, 120, 0.5);

      const record = {
        ...form,
        id,
        hasPhoto,
        photoCount: pendingPhotos.length,
        thumb,
        dateAdded: isEdit ? unit.dateAdded : new Date().toISOString(),
      };
      await upsertUnit(type.key, record);
      onSaved();
    } catch (err) {
      console.error("Save failed", err);
      showToast("Couldn't save — try again", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteUnit(type.key, unit.id);
      if (unit.hasPhoto) await deletePhotos(type.key, unit.id);
      onDeleted();
    } catch (err) {
      console.error("Delete failed", err);
      showToast("Couldn't delete — try again", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="el-modal-overlay" onClick={onClose}>
      <div className="el-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="el-modal-head">
          <div className="el-modal-head-title">{unit ? `Edit ${type.singular}` : `Add ${type.singular}`}</div>
          <button className="el-modal-close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="el-modal-scroll">
          <div className="el-field">
            <label className="el-field-label">Photos</label>
            <div className="el-photo-grid">
              {pendingPhotos.map((p) => (
                <div key={p.id} className="el-photo-tile">
                  <img src={p.dataUrl} alt="" />
                  <button className="el-photo-rotate-btn" onClick={() => rotatePhoto(p.id)} title="Rotate"><RotateCw size={13} /></button>
                  <button className="el-photo-remove-btn" onClick={() => removePhoto(p.id)}><X size={13} /></button>
                </div>
              ))}
              <label className="el-photo-add-tile">
                <input
                  className="el-photo-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handlePhotoChange}
                  disabled={photoLoading}
                />
                {photoLoading ? <span className="el-spinner el-spinner-dark" /> : <Camera size={18} />}
                <span className="el-photo-placeholder-text">Add photo</span>
              </label>
            </div>
            {pendingPhotos.length > 0 && !photoLoading && type.assetFields.some((f) => f.aiReadable) && (
              <button className="el-ai-btn" onClick={handleAIExtract} disabled={aiLoading}>
                {aiLoading ? <Loader2 size={13} className="el-spin" /> : <Sparkles size={13} />}
                {aiLoading ? "Reading nameplate…" : "Read Nameplate with AI"}
              </button>
            )}
            {pendingPhotos.length > 1 && (
              <div className="el-banner el-banner-neutral">
                The first photo is treated as the nameplate for AI reading — reorder isn't supported, so remove and re-add if you want a different one first.
              </div>
            )}
            {photoError && <div className="el-banner el-banner-danger"><AlertTriangle size={14} /> {photoError}</div>}
          </div>

          <div className="el-form-grid">
            {type.assetFields.map((field) => (
              <FormField
                key={field.name}
                field={field}
                value={form[field.name]}
                onChange={(v) => setField(field.name, v)}
                error={field.name === "unitTag" && unitTagError}
              />
            ))}
          </div>

          {unit && (
            confirmDelete ? (
              <div className="el-delete-confirm-row">
                <span className="el-msg">Delete this {type.singular.toLowerCase()} and its logs? This can't be undone.</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="el-btn-text-muted" onClick={() => setConfirmDelete(false)}>Cancel</button>
                  <button className="el-btn-danger-solid" onClick={handleDelete} disabled={deleting}>
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            ) : (
              <button className="el-btn-delete-text" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={13} /> Delete {type.singular.toLowerCase()}
              </button>
            )
          )}
        </div>
        <div className="el-modal-footer">
          <button className="el-btn el-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="el-btn el-btn-save" onClick={handleSave} disabled={saving}>
            {saving && <span className="el-spinner" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ type, unit, onClose, onEdit, showToast }) {
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logFormOpen, setLogFormOpen] = useState(false);
  const [logForm, setLogForm] = useState(() => emptyLogForm(type));
  const [logSaving, setLogSaving] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState(null);

  const refreshLogs = useCallback(async () => {
    setLogsLoading(true);
    const data = await loadLogs(type.logTable, unit.id);
    setLogs(data);
    setLogsLoading(false);
  }, [type.logTable, unit.id]);

  useEffect(() => { refreshLogs(); }, [refreshLogs]);

  function setLogField(name, value) {
    setLogForm((f) => ({ ...f, [name]: value }));
  }

  function setResponse(itemId, value) {
    setLogForm((f) => ({ ...f, responses: { ...f.responses, [itemId]: value } }));
  }

  async function handleAddLog() {
    setLogSaving(true);
    try {
      await insertLog(type.logTable, { ...logForm, unitId: unit.id });
      setLogForm(emptyLogForm(type));
      setLogFormOpen(false);
      await refreshLogs();
      showToast("Log entry added");
    } catch (err) {
      console.error("Add log failed", err);
      showToast("Couldn't add log entry — try again", "error");
    } finally {
      setLogSaving(false);
    }
  }

  async function handleDeleteLog(logId) {
    try {
      await deleteLog(type.logTable, logId);
      await refreshLogs();
    } catch (err) {
      console.error("Delete log failed", err);
      showToast("Couldn't delete that entry — try again", "error");
    }
  }

  function handleExport() {
    try {
      exportLogsToPdf(type, unit, logs);
    } catch (err) {
      console.error("Export failed", err);
      showToast("Couldn't generate the PDF — try again", "error");
    }
  }

  const summaryFields = type.assetFields.filter((f) => f.name !== "notes");

  return (
    <div className="el-modal-overlay" onClick={onClose}>
      <div className={`el-modal-panel el-modal-panel-wide${type.checklist ? " el-modal-panel-xl" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="el-modal-head">
          <div>
            <div className="el-modal-head-title">{unit.unitTag}</div>
            {type.frequencyLabel && (
              <div className="el-modal-head-sub">{type.frequencyLabel} Test — Form {type.formNo}</div>
            )}
          </div>
          <button className="el-modal-close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="el-modal-scroll">
          <div className="el-detail-top">
            <div className="el-card-thumb el-card-thumb-lg">
              {unit.thumb ? <img src={unit.thumb} alt="" /> : <ImageIcon size={24} />}
            </div>
            <button className="el-btn-ghost-dark el-btn-ghost-light" onClick={onEdit}>Edit</button>
          </div>

          <div className="el-detail-grid">
            {summaryFields.map((f) => (
              unit[f.name] ? (
                <div className="el-detail-row" key={f.name}>
                  <div className="el-detail-label">{f.label}</div>
                  <div className={`el-detail-value${f.mono ? " el-field-mono" : ""}`}>{String(unit[f.name])}</div>
                </div>
              ) : null
            ))}
          </div>
          {unit.notes && (
            <div className="el-detail-row el-detail-row-notes">
              <div className="el-detail-label">Notes</div>
              <div className="el-detail-value">{unit.notes}</div>
            </div>
          )}

          <div className="el-log-section-head">
            <div className="el-section-heading">Test / Run Log</div>
            <div style={{ display: "flex", gap: 8 }}>
              {type.checklist && logs.length > 0 && (
                <button className="el-btn-ghost-dark el-btn-ghost-light" onClick={handleExport}>
                  <FileDown size={13} /> Export PDF
                </button>
              )}
              <button className="el-btn-accent" onClick={() => setLogFormOpen((v) => !v)}>
                <Plus size={13} /> Add Entry
              </button>
            </div>
          </div>

          {logFormOpen && (
            <div className="el-log-form">
              <div className="el-form-grid">
                {type.logFields.map((field) => (
                  <FormField
                    key={field.name}
                    field={field}
                    value={logForm[field.name]}
                    onChange={(v) => setLogField(field.name, v)}
                  />
                ))}
              </div>
              {type.checklist && (
                <ChecklistFields
                  checklist={type.checklist}
                  responses={logForm.responses}
                  onChange={setResponse}
                />
              )}
              <div className="el-log-form-actions">
                <button className="el-btn-text-muted" onClick={() => setLogFormOpen(false)}>Cancel</button>
                <button className="el-btn el-btn-save el-btn-inline" onClick={handleAddLog} disabled={logSaving}>
                  {logSaving && <span className="el-spinner" />} Save Entry
                </button>
              </div>
            </div>
          )}

          {logsLoading ? (
            <div className="el-loading-row"><span className="el-spinner el-spinner-dark" /></div>
          ) : logs.length === 0 ? (
            <div className="el-empty-sub" style={{ padding: "16px 0" }}>No log entries yet.</div>
          ) : (
            <div className="el-log-table-wrap">
              <table className="el-log-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Technician</th>
                    <th>Result</th>
                    {type.checklist ? <th>Fails</th> : <th>Notes</th>}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => {
                    const result = type.checklist ? l.overallResult : l.testResult;
                    const fails = type.checklist ? countChecklistFails(l.responses) : 0;
                    const expanded = expandedLogId === l.id;
                    return (
                      <React.Fragment key={l.id}>
                        <tr
                          className={type.checklist ? "el-log-row-clickable" : undefined}
                          onClick={type.checklist ? () => setExpandedLogId(expanded ? null : l.id) : undefined}
                        >
                          <td>{l.logDate}</td>
                          <td>{l.technician}</td>
                          <td>
                            {result && (
                              <span className={`el-chip${result === "Fail" ? " el-chip-danger" : ""}`}>{result}</span>
                            )}
                          </td>
                          {type.checklist ? (
                            <td>{fails > 0 ? <span className="el-chip el-chip-danger">{fails}</span> : "—"}</td>
                          ) : (
                            <td className="el-log-notes-cell">{l.notes}</td>
                          )}
                          <td>
                            <button className="el-log-delete-btn" onClick={(e) => { e.stopPropagation(); handleDeleteLog(l.id); }} title="Delete entry">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                        {type.checklist && expanded && (
                          <tr>
                            <td colSpan={5} className="el-log-expanded-cell">
                              {l.notes && (
                                <div className="el-log-expanded-notes"><strong>Deficiencies / Comments:</strong> {l.notes}</div>
                              )}
                              <ChecklistView checklist={type.checklist} responses={l.responses || {}} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const CSS = `
.el-root {
  --el-bg: #EFF0EB; --el-surface: #FFFFFF; --el-ink: #1B1D1E; --el-ink-muted: #6B6F72;
  --el-slate: #2B3138; --el-slate-soft: #3E454D; --el-slate-input: #3A4149; --el-slate-border: #4B535C;
  --el-accent: #E39A2D; --el-accent-deep: #B87A1C; --el-danger: #B23A34; --el-danger-soft: #F4E2E0;
  --el-success: #3F7D5C; --el-success-soft: #E3EEE7; --el-border: #DCDDD6; --el-border-strong: #C7C9C1;
  --el-chip-bg: #EDF1F3;
  --el-font-display: "Arial Narrow", system-ui, -apple-system, "Segoe UI", sans-serif;
  --el-font-body: system-ui, -apple-system, "Segoe UI", sans-serif;
  --el-font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  background: var(--el-bg); color: var(--el-ink); font-family: var(--el-font-body);
  min-height: 100vh;
}
.el-root button { font-family: inherit; cursor: pointer; }
.el-root input, .el-root select, .el-root textarea { font-family: inherit; }
.el-root img { max-width: 100%; display: block; }

.el-topbar { background: var(--el-slate); padding: 20px 20px 0; }
.el-topbar-inner { max-width: 1000px; margin: 0 auto; }
.el-topbar-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.el-brand-title { font-family: var(--el-font-display); font-weight: 900; font-size: 26px; letter-spacing: -0.02em; text-transform: uppercase; color: #fff; line-height: 1.1; }
.el-brand-subtitle { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #9CA3AC; margin-top: 2px; }
.el-topbar-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.el-btn-ghost-dark { display: inline-flex; align-items: center; gap: 6px; background: transparent; border: 1px solid var(--el-slate-border); color: #fff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 9px 12px; border-radius: 8px; white-space: nowrap; }
.el-btn-ghost-light { border-color: var(--el-border-strong); color: var(--el-ink); }
.el-btn-accent { display: inline-flex; align-items: center; gap: 6px; background: var(--el-accent); border: none; color: #fff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 9px 14px; border-radius: 8px; white-space: nowrap; }
.el-btn-accent:hover { background: var(--el-accent-deep); }

.el-tabs { display: flex; gap: 4px; margin-top: 18px; overflow-x: auto; }
.el-tab { flex-shrink: 0; background: transparent; border: none; border-bottom: 2px solid transparent; color: #9CA3AC; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 10px 14px; white-space: nowrap; }
.el-tab-active { color: #fff; border-bottom-color: var(--el-accent); }

.el-login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: var(--el-bg); }
.el-login-card { width: 100%; max-width: 360px; background: var(--el-surface); border: 1px solid var(--el-border); border-radius: 16px; padding: 28px 24px; }
.el-login-error { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: var(--el-danger); margin: -4px 0 16px; }
.el-login-submit { width: 100%; justify-content: center; margin-top: 4px; }

.el-search-wrap { position: relative; margin-top: 20px; }
.el-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #8A9099; pointer-events: none; display: flex; }
.el-search-input { width: 100%; background: var(--el-surface); border: 1px solid var(--el-border); color: var(--el-ink); border-radius: 8px; padding: 10px 12px 10px 34px; font-size: 14px; outline: none; box-sizing: border-box; }
.el-search-input:focus { border-color: var(--el-accent); }

.el-page-body { max-width: 1000px; margin: 0 auto; padding: 24px 20px 60px; }
.el-toolbar-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 18px; margin-bottom: 12px; }
.el-count-line { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--el-ink-muted); }
.el-section-heading { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--el-ink-muted); }

.el-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
@media (min-width: 640px) { .el-grid { grid-template-columns: 1fr 1fr; } }
@media (min-width: 960px) { .el-grid { grid-template-columns: 1fr 1fr 1fr; } }

.el-bubble-row { display: flex; flex-wrap: wrap; gap: 10px; }
.el-bubble { background: var(--el-surface); border: 1px solid var(--el-border); border-radius: 999px; padding: 12px 20px; font-size: 14px; font-weight: 700; color: var(--el-ink); box-shadow: 0 1px 2px rgba(0,0,0,0.04); transition: transform 0.12s ease, border-color 0.12s ease, background 0.12s ease; }
.el-bubble:hover { transform: translateY(-1px); }

.el-bubble-diesel_generators { background: #FBE7C6; border-color: #E7BE79; color: #8A5A17; }
.el-bubble-diesel_generators:hover { background: #F7D89E; border-color: #C99A44; }

.el-bubble-diesel_fire_pumps { background: var(--el-danger-soft); border-color: #E0AFAA; color: var(--el-danger); }
.el-bubble-diesel_fire_pumps:hover { background: #EECAC5; border-color: var(--el-danger); }

.el-bubble-electric_fire_pumps { background: #D9E7F8; border-color: #A6C4E8; color: #2A5C8A; }
.el-bubble-electric_fire_pumps:hover { background: #C3D9F2; border-color: #2A5C8A; }

.el-card { text-align: left; border-radius: 10px; overflow: hidden; background: var(--el-surface); border: 1px solid var(--el-border); box-shadow: 0 1px 2px rgba(0,0,0,0.04); position: relative; padding: 0; width: 100%; cursor: pointer; transition: transform 0.12s ease; }
.el-card:hover { transform: translateY(-2px); }
.el-card-strip { height: 4px; background: var(--el-accent); }
.el-card-head { display: flex; gap: 12px; padding: 18px 16px 14px; }
.el-card-head-text { flex: 1; min-width: 0; }
.el-card-title { font-family: var(--el-font-display); font-weight: 800; font-size: 19px; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.el-card-location { font-size: 12px; color: var(--el-ink-muted); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.el-card-thumb { flex-shrink: 0; width: 56px; height: 56px; border-radius: 6px; background: #F2F2ED; border: 1px solid var(--el-border); display: flex; align-items: center; justify-content: center; overflow: hidden; color: var(--el-ink-muted); }
.el-card-thumb img { width: 100%; height: 100%; object-fit: cover; }
.el-card-thumb-lg { width: 80px; height: 80px; }
.el-card-body { border-top: 1px solid var(--el-border); padding: 12px 16px 14px; }
.el-card-mfg { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.el-card-serial { font-family: var(--el-font-mono); font-size: 12px; color: var(--el-ink-muted); margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.el-chip { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 4px 8px; border-radius: 5px; background: var(--el-chip-bg); color: var(--el-slate-soft); }
.el-chip-danger { background: var(--el-danger-soft); color: var(--el-danger); }

.el-empty-state { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 72px 20px; border-radius: 14px; border: 1.5px dashed var(--el-border-strong); color: var(--el-ink-muted); }
.el-empty-title { font-family: var(--el-font-display); font-weight: 800; font-size: 17px; margin-top: 12px; color: var(--el-ink); }
.el-empty-sub { font-size: 14px; color: var(--el-ink-muted); margin-top: 4px; max-width: 320px; }
.el-loading-row { display: flex; align-items: center; justify-content: center; padding: 90px 0; }

.el-modal-overlay { position: fixed; inset: 0; background: rgba(27,29,30,0.55); display: flex; align-items: flex-end; justify-content: center; z-index: 50; }
@media (min-width: 640px) { .el-modal-overlay { align-items: center; } }
.el-modal-panel { width: 100%; max-width: 560px; background: var(--el-bg); border-radius: 18px 18px 0 0; overflow: hidden; display: flex; flex-direction: column; max-height: 92vh; }
.el-modal-panel-wide { max-width: 720px; }
.el-modal-panel-xl { max-width: 900px; }
@media (min-width: 640px) { .el-modal-panel { border-radius: 16px; } }
.el-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: var(--el-slate); flex-shrink: 0; }
.el-modal-head-title { font-family: var(--el-font-display); font-weight: 700; font-size: 15px; text-transform: uppercase; letter-spacing: 0.06em; color: #fff; }
.el-modal-head-sub { font-size: 11px; color: #9CA3AC; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.06em; }
.el-modal-close-btn { background: none; border: none; color: #fff; padding: 4px; display: flex; }
.el-modal-scroll { overflow-y: auto; padding: 20px; }
.el-modal-footer { flex-shrink: 0; padding: 16px 20px; display: flex; gap: 12px; border-top: 1px solid var(--el-border); background: var(--el-bg); }

.el-field { display: block; margin-bottom: 16px; }
.el-field-label { display: block; margin-bottom: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--el-ink-muted); font-family: var(--el-font-display); }
.el-field-label .el-req { color: var(--el-danger); }
.el-field-input { width: 100%; border: 1px solid var(--el-border); border-radius: 6px; padding: 10px 12px; font-size: 14px; color: var(--el-ink); background: var(--el-surface); outline: none; box-sizing: border-box; }
.el-field-input:focus { border-color: var(--el-accent); }
.el-field-input-error { border-color: var(--el-danger); }
.el-field-mono { font-family: var(--el-font-mono); }
.el-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
@media (max-width: 480px) { .el-form-grid { grid-template-columns: 1fr; } }
.el-checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--el-ink); padding: 10px 0; }
.el-checkbox-row input { width: 16px; height: 16px; accent-color: var(--el-accent); }

.el-photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; }
.el-photo-tile { position: relative; border-radius: 8px; overflow: hidden; border: 1px solid var(--el-border); background: var(--el-surface); aspect-ratio: 1 / 1; }
.el-photo-tile img { width: 100%; height: 100%; object-fit: cover; }
.el-photo-remove-btn { position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%; background: rgba(27,29,30,0.65); color: #fff; border: none; display: flex; align-items: center; justify-content: center; }
.el-photo-remove-btn:hover { background: var(--el-danger); }
.el-photo-rotate-btn { position: absolute; top: 4px; left: 4px; width: 22px; height: 22px; border-radius: 50%; background: rgba(27,29,30,0.65); color: #fff; border: none; display: flex; align-items: center; justify-content: center; }
.el-photo-rotate-btn:hover { background: var(--el-accent); }
.el-photo-add-tile { position: relative; border-radius: 8px; border: 2px dashed var(--el-border-strong); background: var(--el-surface); aspect-ratio: 1 / 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: var(--el-ink-muted); overflow: hidden; }
.el-photo-input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.el-photo-placeholder-text { font-size: 11px; color: var(--el-ink-muted); text-align: center; padding: 0 6px; }

.el-banner { margin-top: 8px; display: flex; align-items: flex-start; gap: 8px; padding: 9px 12px; border-radius: 8px; font-size: 12px; font-weight: 500; line-height: 1.4; }
.el-banner-danger { background: var(--el-danger-soft); color: var(--el-danger); }
.el-banner-neutral { background: var(--el-chip-bg); color: var(--el-slate-soft); }

.el-ai-btn { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; font-size: 12px; font-weight: 700; color: var(--el-accent-deep); background: none; border: 1px solid var(--el-accent); border-radius: 6px; padding: 6px 10px; }
.el-ai-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.el-spin { animation: el-spin 0.7s linear infinite; }

.el-btn { border-radius: 8px; font-size: 14px; font-weight: 700; padding: 11px; border: none; display: flex; align-items: center; justify-content: center; gap: 8px; flex: 1; }
.el-btn-inline { flex: none; padding: 9px 16px; }
.el-btn-cancel { background: var(--el-surface); border: 1px solid var(--el-border-strong); color: var(--el-ink); }
.el-btn-save { background: var(--el-accent); color: #fff; }
.el-btn-save:disabled { background: var(--el-border-strong); cursor: not-allowed; }
.el-btn-delete-text { display: inline-flex; align-items: center; gap: 5px; background: none; border: none; color: var(--el-danger); font-size: 12px; font-weight: 600; padding: 0; margin-top: 4px; }
.el-delete-confirm-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; border-radius: 8px; background: var(--el-danger-soft); margin-top: 4px; }
.el-delete-confirm-row .el-msg { font-size: 12px; color: var(--el-danger); }
.el-btn-text-muted { background: none; border: none; font-size: 12px; font-weight: 600; color: var(--el-ink-muted); padding: 9px 10px; }
.el-btn-danger-solid { background: var(--el-danger); color: #fff; border: none; font-size: 12px; font-weight: 700; padding: 6px 12px; border-radius: 6px; }

.el-detail-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.el-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
@media (max-width: 480px) { .el-detail-grid { grid-template-columns: 1fr; } }
.el-detail-row { padding: 8px 0; border-bottom: 1px solid var(--el-border); }
.el-detail-row-notes { grid-column: 1 / -1; }
.el-detail-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--el-ink-muted); }
.el-detail-value { font-size: 14px; margin-top: 2px; }

.el-log-section-head { display: flex; align-items: center; justify-content: space-between; margin: 24px 0 12px; padding-top: 16px; border-top: 1px solid var(--el-border); }
.el-log-form { background: var(--el-surface); border: 1px solid var(--el-border); border-radius: 10px; padding: 16px; margin-bottom: 16px; }
.el-log-form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.el-log-table-wrap { overflow-x: auto; border: 1px solid var(--el-border); border-radius: 8px; }
.el-log-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.el-log-table th, .el-log-table td { padding: 9px 12px; text-align: left; border-bottom: 1px solid var(--el-border); white-space: nowrap; }
.el-log-table th { background: var(--el-chip-bg); font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--el-ink-muted); }
.el-log-table tbody tr:last-child td { border-bottom: none; }
.el-log-notes-cell { white-space: normal; min-width: 160px; }
.el-log-delete-btn { background: none; border: none; color: var(--el-ink-muted); padding: 4px; display: flex; border-radius: 6px; }
.el-log-delete-btn:hover { color: var(--el-danger); background: var(--el-danger-soft); }
.el-log-row-clickable { cursor: pointer; }
.el-log-row-clickable:hover { background: var(--el-chip-bg); }
.el-log-expanded-cell { background: var(--el-chip-bg); white-space: normal; padding: 14px 16px !important; }
.el-log-expanded-notes { font-size: 13px; margin-bottom: 10px; }

.el-checklist { margin-top: 4px; margin-bottom: 12px; border-top: 1px solid var(--el-border); padding-top: 12px; }
.el-checklist-section { margin-bottom: 14px; }
.el-checklist-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--el-ink-muted); background: var(--el-chip-bg); padding: 6px 10px; border-radius: 6px; margin-bottom: 6px; }
.el-checklist-row { display: flex; align-items: center; gap: 10px; padding: 6px 4px; border-bottom: 1px solid var(--el-border); flex-wrap: wrap; }
.el-checklist-row:last-child { border-bottom: none; }
.el-checklist-row-label { flex: 1; min-width: 220px; font-size: 12.5px; color: var(--el-ink); display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
.el-checklist-item-id { font-family: var(--el-font-mono); font-size: 10px; font-weight: 700; color: var(--el-ink-muted); flex-shrink: 0; }
.el-checklist-item-type { font-size: 9px; font-weight: 700; background: var(--el-chip-bg); color: var(--el-slate-soft); padding: 1px 5px; border-radius: 4px; flex-shrink: 0; }
.el-checklist-item-ref { font-size: 10px; color: var(--el-ink-muted); flex-shrink: 0; }
.el-checklist-row-input { flex-shrink: 0; width: 140px; }
.el-checklist-select { padding: 6px 8px; font-size: 12px; }
.el-checklist-reading { display: flex; align-items: center; gap: 6px; }
.el-checklist-reading .el-field-input { padding: 6px 8px; font-size: 12px; }
.el-checklist-unit { font-size: 11px; color: var(--el-ink-muted); flex-shrink: 0; }

.el-checklist-view { display: flex; flex-direction: column; gap: 2px; }
.el-checklist-view-row { display: flex; align-items: baseline; gap: 8px; font-size: 12.5px; padding: 3px 0; }
.el-checklist-view-label { flex: 1; color: var(--el-ink); }
.el-checklist-view-value { font-weight: 700; color: var(--el-ink); }
.el-checklist-view-fail { color: var(--el-danger); }

.el-toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 10px; box-shadow: 0 4px 14px rgba(0,0,0,0.2); color: #fff; font-size: 14px; z-index: 60; max-width: 90vw; }
.el-toast-success { background: var(--el-slate); }
.el-toast-error { background: var(--el-danger); }

.el-spinner { width: 1em; height: 1em; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; display: inline-block; animation: el-spin 0.7s linear infinite; }
.el-spinner-dark { border: 2px solid rgba(0,0,0,0.15); border-top-color: var(--el-ink-muted); }
@keyframes el-spin { to { transform: rotate(360deg); } }
`;
