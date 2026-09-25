const TEMPLATE_URL = "/pdf-templates/generator-log.xlsx";
const LOG_COLUMNS = ["E", "F", "G", "H"]; // four log columns on the sheet

// Items 2-8 sit on sheet row N + 13; a section-header row pushes items 9-43 to N + 14.
const rowFor = (id) => Number(id) + (Number(id) <= 8 ? 13 : 14);

function displayValue(item, value) {
  if (value === undefined || value === null || value === "") return null;
  if (item.valueType === "check") return value === "Pass" ? "√" : value;
  return value;
}

// Fills the real Emergency Engine Operating Log spreadsheet with a generator's
// nameplate/permit info and its most recent log entries (oldest on the left).
export async function fillGeneratorSheet(type, unit, logs) {
  // Loaded on demand so the (large) spreadsheet library stays out of the main bundle.
  const { default: ExcelJS } = await import("exceljs");
  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) throw new Error(`Couldn't load sheet template (${res.status})`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await res.arrayBuffer());
  const ws = wb.worksheets[0];

  ws.getCell("A6").value = `Property : ${unit.location || ""}`;
  if (unit.k12Within500ft) ws.getCell("F6").value = unit.k12Within500ft;
  if (unit.ptoNumber) ws.getCell("H6").value = unit.ptoNumber;
  if (unit.maxAnnualMaintenanceHours) {
    ws.getCell("A8").value = `${ws.getCell("A8").text} ${unit.maxAnnualMaintenanceHours}`;
  }
  if (unit.maxAnnualTotalOperationHours) ws.getCell("H8").value = unit.maxAnnualTotalOperationHours;
  if (unit.maxMonthlyMaintenanceHours) {
    ws.getCell("A9").value = `${ws.getCell("A9").text} ${unit.maxMonthlyMaintenanceHours}`;
  }

  const sorted = [...logs].sort((a, b) => new Date(a.logDate) - new Date(b.logDate));
  const selected = sorted.slice(-LOG_COLUMNS.length);

  selected.forEach((log, i) => {
    const col = LOG_COLUMNS[i];
    const [y, m, d] = String(log.logDate || "").split("-");
    if (y) ws.getCell(`${col}14`).value = `${m}/${d}/${y}`;
    if (log.technician) ws.getCell(`${col}21`).value = log.technician;
    const responses = log.responses || {};
    for (const item of type.checklist) {
      const v = displayValue(item, responses[item.id]);
      if (v === null) continue;
      const cell = ws.getCell(`${col}${rowFor(item.id)}`);
      const num = Number(v);
      cell.value = item.valueType === "reading" && v !== "" && !Number.isNaN(num) ? num : v;
    }
  });

  return wb.xlsx.writeBuffer();
}

export function downloadSheet(buffer, filename) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
