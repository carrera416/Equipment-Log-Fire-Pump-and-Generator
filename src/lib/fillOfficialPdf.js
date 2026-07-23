import { PDFDocument } from "pdf-lib";
import { OFFICIAL_FORM_CONFIG } from "./officialPdfFields";

const CHECK_TO_PDF_VALUE = { Pass: "P", Fail: "F", "N/A": "N/A" };

// A field's own Pass/Fail/N/A option list occasionally differs by a stray
// space ("N/A" vs " N/A") between field groups on the same PDF, so match
// case/whitespace-insensitively against whatever the field actually offers
// rather than assuming one canonical string.
function selectCheckValue(form, fieldName, appValue) {
  const wanted = CHECK_TO_PDF_VALUE[appValue];
  if (!wanted) return;
  const dropdown = form.getDropdown(fieldName);
  const options = dropdown.getOptions();
  const match = options.find((o) => o.trim().toUpperCase() === wanted.toUpperCase());
  dropdown.select(match ?? wanted);
}

function setTextValue(form, fieldName, value) {
  if (value === undefined || value === null || value === "") return;
  form.getTextField(fieldName).setText(String(value));
}

export function officialFormAvailable(typeKey) {
  return Boolean(OFFICIAL_FORM_CONFIG[typeKey]);
}

// Fills the real state-form PDF template for a fire pump type with the
// unit's nameplate info and up to as many of its most recent log entries as
// the form has date columns for (oldest of the selected batch on the left,
// matching how the paper form fills in over time).
export async function fillOfficialPdf(type, unit, logs) {
  const config = OFFICIAL_FORM_CONFIG[type.key];
  if (!config) throw new Error(`No official form template for ${type.key}`);

  const res = await fetch(config.templateUrl);
  if (!res.ok) throw new Error(`Couldn't load form template (${res.status})`);
  const bytes = await res.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes);
  const form = pdfDoc.getForm();

  for (const [assetKey, fieldName] of Object.entries(config.headerFields)) {
    try {
      setTextValue(form, fieldName, unit[assetKey]);
    } catch {
      // template field missing/renamed -- skip rather than fail the export
    }
  }

  const columns = config.dateColumns;
  const sorted = [...logs].sort((a, b) => new Date(a.logDate) - new Date(b.logDate));
  const selected = sorted.slice(-columns.length);

  selected.forEach((log, i) => {
    for (const dateFieldName of columns[i]) {
      try {
        setTextValue(form, dateFieldName, log.logDate);
      } catch {
        // ignore
      }
    }
    const responses = log.responses || {};
    for (const item of type.checklist) {
      const field = config.checklistFields[item.id];
      if (!field) continue;
      const fieldName = field.names[i];
      if (!fieldName) continue;
      const value = responses[item.id];
      if (value === undefined || value === "") continue;
      try {
        if (field.kind === "check") {
          if (item.valueType === "check") selectCheckValue(form, fieldName, value);
          // readings mapped onto a check-only cell in the real form can't
          // be written faithfully -- leave blank rather than guess.
        } else {
          setTextValue(form, fieldName, value);
        }
      } catch {
        // unexpected field shape in this row -- skip just this cell
      }
    }
  });

  form.updateFieldAppearances();
  form.flatten();
  return pdfDoc.save();
}

export function downloadOfficialPdf(bytes, filename) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
