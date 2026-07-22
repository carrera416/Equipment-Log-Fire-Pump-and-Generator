import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const MAX_COLUMNS = 6;

function groupChecklist(checklist) {
  const sections = [];
  for (const item of checklist) {
    let section = sections.find((s) => s.name === item.section);
    if (!section) { section = { name: item.section, items: [] }; sections.push(section); }
    section.items.push(item);
  }
  return sections;
}

function formatValue(item, value) {
  if (!value) return "";
  if (item.valueType === "reading" || item.valueType === "text") {
    return item.unit ? `${value} ${item.unit}` : String(value);
  }
  return String(value);
}

// Builds a PDF laid out like the source checklist (Form AES 5.1/5.3 for fire
// pumps, the Emergency Engine Operating Log for generators): unit info up
// top, then one row per checklist item with one column per visit date —
// same shape as the paper form, most recent visits first (up to
// MAX_COLUMNS), oldest-selected on the left so dates read left-to-right.
export function exportLogsToPdf(type, unit, logs) {
  const selected = logs.slice(0, MAX_COLUMNS).slice().reverse();
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 32;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`${type.homeLabel || type.singular} — ${type.frequencyLabel || ""} Test Log`, margin, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Form Reference: ${type.formNo || "—"}  |  Generated ${new Date().toLocaleDateString()}`, margin, 44);

  const infoFields = type.assetFields.filter((f) => !f.multiline);
  const infoPairs = infoFields.map((f) => [f.label, unit[f.name] || "—"]);
  const infoRows = [];
  for (let i = 0; i < infoPairs.length; i += 3) {
    const row = [];
    for (let j = 0; j < 3; j++) {
      const pair = infoPairs[i + j];
      row.push(pair ? pair[0] : "", pair ? pair[1] : "");
    }
    infoRows.push(row);
  }

  autoTable(doc, {
    startY: 54,
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 2, textColor: 40 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 90 }, 1: { cellWidth: 120 },
      2: { fontStyle: "bold", cellWidth: 90 }, 3: { cellWidth: 120 },
      4: { fontStyle: "bold", cellWidth: 90 }, 5: { cellWidth: 120 },
    },
    body: infoRows,
    margin: { left: margin, right: margin },
  });

  const afterInfoY = doc.lastAutoTable.finalY + 10;

  const dateHead = selected.map((log) => log.logDate || "—");
  const techRow = ["", "Technician / Contractor", "", ...selected.map((log) => log.technician || "")];
  const resultRow = ["", "Overall Result", "", ...selected.map((log) => log.overallResult || "")];

  const head = [["#", "Item", "Ref", ...dateHead]];
  const body = [techRow, resultRow];

  const sections = groupChecklist(type.checklist || []);
  sections.forEach((section) => {
    body.push([{ content: section.name, colSpan: 3 + selected.length, styles: { fontStyle: "bold", fillColor: [237, 241, 243] } }]);
    section.items.forEach((item) => {
      body.push([
        item.id,
        item.label,
        item.ref || "",
        ...selected.map((log) => formatValue(item, (log.responses || {})[item.id])),
      ]);
    });
  });

  const dateColWidth = Math.max(50, (pageWidth - margin * 2 - 30 - 220) / Math.max(selected.length, 1));

  autoTable(doc, {
    startY: afterInfoY,
    head,
    body,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 3, valign: "middle" },
    headStyles: { fillColor: [43, 49, 56], textColor: 255, fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 190 },
      2: { cellWidth: 60 },
      ...Object.fromEntries(selected.map((_, i) => [3 + i, { cellWidth: dateColWidth, halign: "center" }])),
    },
    margin: { left: margin, right: margin },
  });

  const notesWithText = selected.filter((log) => log.notes && log.notes.trim());
  if (notesWithText.length > 0) {
    let y = doc.lastAutoTable.finalY + 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Deficiencies / Comments", margin, y);
    doc.setFont("helvetica", "normal");
    y += 12;
    notesWithText.forEach((log) => {
      const lines = doc.splitTextToSize(`${log.logDate}: ${log.notes}`, pageWidth - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 10 + 4;
    });
  }

  const fileSafeTag = (unit.unitTag || unit.location || "unit").replace(/[^a-z0-9]+/gi, "-");
  doc.save(`${type.key}-${fileSafeTag}-log.pdf`);
}
