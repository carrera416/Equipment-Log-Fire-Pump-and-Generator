export const LOCATION_OPTIONS = [
  "Santa Clara Gateway", "Santa Clara Square", "Coronado", "McCarthy",
  "Sunnyvale", "First Point", "Silicon Valley Center",
];

export const TEST_RESULT_OPTIONS = ["Pass", "Fail"];

// Overall visit result on a checklist-based log entry (fire pumps, generators).
// Per-item results within the checklist use CHECK_OPTIONS below.
export const CHECK_OPTIONS = ["Pass", "Fail", "N/A"];

export const YES_NO_OPTIONS = ["Yes", "No"];
export const OPERATION_REASON_OPTIONS = ["Test", "Emergency", "Other"];

// Nameplate + air-permit fields for a diesel generator, matching the header
// box on "Emergency Engine Operating Log Template.xlsx" (a Bay Area Air
// District permit-compliance log combined with an NFPA 110 maintenance
// checklist) plus the usual manufacturer/model/serial identification.
const DIESEL_GENERATOR_ASSET_FIELDS = [
  { name: "unitTag", label: "Unit Tag", required: true },
  { name: "location", label: "Property", datalist: "LOCATION_OPTIONS" },
  { name: "ptoNumber", label: "Equipment # (PTO No.)" },
  { name: "k12Within500ft", label: "K-12 School/Daycare Within 500'", type: "select", options: "YES_NO_OPTIONS" },
  { name: "maxAnnualMaintenanceHours", label: "Max Annual Maintenance/Testing Hours" },
  { name: "maxAnnualTotalOperationHours", label: "Max Annual Total Operation Hours" },
  { name: "maxMonthlyMaintenanceHours", label: "Max Monthly Maintenance/Testing Hours" },
  { name: "manufacturer", label: "Manufacturer" },
  { name: "model", label: "Model" },
  { name: "serial", label: "Serial", mono: true },
  { name: "engineManufacturer", label: "Engine Manufacturer" },
  { name: "engineModel", label: "Engine Model" },
  { name: "kwRating", label: "kW Rating" },
  { name: "voltage", label: "Voltage" },
  { name: "fuelTankCapacityGal", label: "Fuel Tank Capacity (gal)" },
  { name: "dateInstalled", label: "Date Installed", type: "date" },
  { name: "notes", label: "Notes", multiline: true, span: 2 },
];

// Top-level fields on a generator log entry. Item 1 ("Record Date of Test /
// Operation") and item 8 ("Test Performed By") from the source spreadsheet
// are folded into `logDate` and `technician` here rather than duplicated in
// the checklist below.
const DIESEL_GENERATOR_LOG_FIELDS = [
  { name: "logDate", label: "Date", type: "date", required: true },
  { name: "technician", label: "Test Performed By" },
  { name: "overallResult", label: "Overall Result", type: "select", options: "TEST_RESULT_OPTIONS" },
  { name: "notes", label: "Deficiencies / Comments", multiline: true, span: 2 },
];

// Checklist items transcribed from "Emergency Engine Operating Log
// Template.xlsx" (Emergency Engine Log-Final sheet), items 2-7 and 9-43 —
// item 1 (date) and item 8 (technician) are covered by the top-level fields
// above. Each item's `ref` holds the sheet's "RANGE" column (the acceptable
// value/range a technician checks the reading against).
export const DIESEL_GENERATOR_CHECKLIST = [
  { id: "2", section: "Required by Air Permit (Generator & Fire Pump)", type: "I", label: "Record Engine Run Start Time", ref: "Start time, am/pm", valueType: "reading", unit: "" },
  { id: "3", section: "Required by Air Permit (Generator & Fire Pump)", type: "I", label: "Record Engine Stop Time", ref: "End time, am/pm", valueType: "reading", unit: "" },
  { id: "4", section: "Required by Air Permit (Generator & Fire Pump)", type: "I", label: "Reason for Operation", ref: "Test, Emergency, Other", valueType: "select", options: "OPERATION_REASON_OPTIONS" },
  { id: "5", section: "Required by Air Permit (Generator & Fire Pump)", type: "I", label: "Record Prestart Run-Time Reading", ref: "From non-resettable meter (##.#)", valueType: "reading", unit: "hrs" },
  { id: "6", section: "Required by Air Permit (Generator & Fire Pump)", type: "I", label: "Record Post Run-Time Reading", ref: "From non-resettable meter (##.#)", valueType: "reading", unit: "hrs" },
  { id: "7", section: "Required by Air Permit (Generator & Fire Pump)", type: "I", label: "Subtract Difference Between Post and Pre Run-Time Reading", ref: "Run time difference", valueType: "reading", unit: "hrs" },
  { id: "9", section: "Generator Maintenance Checklist", type: "I", label: "Check Crankcase Engine Oil Level", ref: "As indicated on dipstick", valueType: "check" },
  { id: "10", section: "Generator Maintenance Checklist", type: "I", label: "Verify Fuel Level - Main Tank", ref: "Min 2/3 full", valueType: "check" },
  { id: "11", section: "Generator Maintenance Checklist", type: "I", label: "Verify Fuel Level - Day Tank (If Applicable)", ref: "Min 2/3 full", valueType: "check" },
  { id: "12", section: "Generator Maintenance Checklist", type: "I", label: "Verify Fuel Pump Operation (If Applicable)", ref: "Operational", valueType: "check" },
  { id: "13", section: "Generator Maintenance Checklist", type: "I", label: "Check Cooling System (Radiator) Water Level", ref: "Full", valueType: "check" },
  { id: "14", section: "Generator Maintenance Checklist", type: "I", label: "Verify Water Jacket Heater Operation", ref: "Operational", valueType: "check" },
  { id: "15", section: "Generator Maintenance Checklist", type: "I", label: "Inspect Hoses and Belts for Cracking and Wear", ref: "Good/Fair/Poor", valueType: "check" },
  { id: "16", section: "Generator Maintenance Checklist", type: "I", label: "Inspect Electrical Control Panel", ref: "No burn marks/loose wires", valueType: "check" },
  { id: "17", section: "Generator Maintenance Checklist", type: "I", label: "Inspect Battery Terminals", ref: "No corrosion", valueType: "check" },
  { id: "18", section: "Generator Maintenance Checklist", type: "I", label: "Check Battery Electrolyte Level", ref: "Full", valueType: "check" },
  { id: "19", section: "Generator Maintenance Checklist", type: "I", label: "Check Battery Specific Gravity (Monthly)", ref: "1.250 - 1.750", valueType: "reading", unit: "SG" },
  { id: "20", section: "Generator Maintenance Checklist", type: "I", label: "Record Battery Voltage (12VDC or 24VDC)", ref: "13.3-13.6 / 26.6-27.2", valueType: "reading", unit: "VDC" },
  { id: "21", section: "Generator Maintenance Checklist", type: "I", label: "Check Battery Indicator Lamps", ref: "On", valueType: "check" },
  { id: "22", section: "Generator Maintenance Checklist", type: "I", label: "Check Alarm Pilot Indicator Lamps", ref: "Off (test)", valueType: "check" },
  { id: "23", section: "Generator Maintenance Checklist", type: "T", label: "Transfer Switch Test - Monthly (NFPA 110), Run Under Load for 30 Min", ref: "Auto-start by tripping ATS breaker", valueType: "check" },
  { id: "24", section: "Generator Maintenance Checklist", type: "I", label: "Transfer Time After Power Loss", ref: "0-10 seconds", valueType: "reading", unit: "sec" },
  { id: "25", section: "Generator Maintenance Checklist", type: "I", label: "Estimated Cranking Time", ref: "0-10 seconds", valueType: "reading", unit: "sec" },
  { id: "26", section: "Generator Maintenance Checklist", type: "I", label: "Estimated Seconds to Reach Running Speed", ref: "0-10 seconds", valueType: "reading", unit: "sec" },
  { id: "27", section: "Generator Maintenance Checklist", type: "I", label: "Record Hertz", ref: "60", valueType: "reading", unit: "Hz" },
  { id: "28", section: "Generator Maintenance Checklist", type: "I", label: "Record Voltage - Phase 1/2/3", ref: "480/480/480", valueType: "reading", unit: "V" },
  { id: "29", section: "Generator Maintenance Checklist", type: "I", label: "Record Amperage - Phase 1/2/3", ref: "00/00/00", valueType: "reading", unit: "A" },
  { id: "30", section: "Generator Maintenance Checklist", type: "I", label: "Water Temperature Reading", ref: "170°F - 190°F", valueType: "reading", unit: "°F" },
  { id: "31", section: "Generator Maintenance Checklist", type: "I", label: "Record Oil Pressure Reading", ref: "40-70 PSI", valueType: "reading", unit: "PSI" },
  { id: "32", section: "Generator Maintenance Checklist", type: "I", label: "Record Fuel Pressure Reading", ref: "Not below 30 PSI", valueType: "reading", unit: "PSI" },
  { id: "33", section: "Generator Maintenance Checklist", type: "I", label: "Record Motor RPM's", ref: "", valueType: "reading", unit: "RPM" },
  { id: "34", section: "Generator Maintenance Checklist", type: "I", label: "Verify Adequate Air-Flow Through Radiator", ref: "No blockage in fins", valueType: "check" },
  { id: "35", section: "Generator Maintenance Checklist", type: "I", label: "Check for Unusual Noises, Heat, and Vibrations", ref: "None", valueType: "check" },
  { id: "36", section: "Generator Maintenance Checklist", type: "I", label: "Check Excessive Exhaust Smoke", ref: "Not \"thick black\"", valueType: "check" },
  { id: "37", section: "Generator Maintenance Checklist", type: "I", label: "Check Exhaust System for Leaks or Damage", ref: "Good/Fair/Poor", valueType: "check" },
  { id: "38", section: "Generator Maintenance Checklist", type: "I", label: "Drain Exhaust Condensate Trap (If Applicable)", ref: "Yes/No", valueType: "check" },
  { id: "39", section: "Generator Maintenance Checklist", type: "I", label: "Inspect for Leaks of Any Kind", ref: "No water, oil, or fuel leaks", valueType: "check" },
  { id: "40", section: "Generator Maintenance Checklist", type: "I", label: "Diesel Particulate Filter Back-Pressure (If Applicable)", ref: "", valueType: "reading", unit: "PSI" },
  { id: "41", section: "Generator Maintenance Checklist", type: "I", label: "Transfer Time After Power Restore", ref: "0-10 mins", valueType: "reading", unit: "min" },
  { id: "42", section: "Generator Maintenance Checklist", type: "I", label: "General Shutdown Check", ref: "No problems - OK", valueType: "check" },
  { id: "43", section: "Generator Maintenance Checklist", type: "M", label: "Reset Controls to Automatic Position", ref: "\"Auto\"", valueType: "check" },
];

// Fire pump asset fields mirror the "Pump and Driver Information" box on the
// California CCR Title 19 / NFPA 25 inspection forms (AES 5.1 diesel weekly,
// AES 5.3 electric monthly). Diesel has no electrical driver ratings but
// adds fuel tank capacity; electric has no fuel tank but adds motor/FLA/
// voltage/service factor.
const FIRE_PUMP_ASSET_FIELDS_BASE = [
  { name: "unitTag", label: "Pump #", required: true },
  { name: "location", label: "Building / Address", datalist: "LOCATION_OPTIONS" },
  { name: "manufacturer", label: "Pump Manufacturer" },
  { name: "model", label: "Pump Model" },
  { name: "serial", label: "Pump Serial #", mono: true },
  { name: "ratedRpm", label: "Rated RPM" },
  { name: "controllerManufacturer", label: "Controller Mfr." },
  { name: "controllerModel", label: "Controller Model" },
  { name: "controllerSerial", label: "Controller S/N", mono: true },
  { name: "maxSuctionPressurePsi", label: "Max Suction Pressure (psi)" },
  { name: "maxPsiShutoff", label: "Max PSI (Shutoff)" },
  { name: "ratedCapacityGpm", label: "Rated Capacity (gpm)" },
  { name: "ratedPressurePsi", label: "Rated Pressure (psi)" },
  { name: "overloadCapacityGpm", label: "150% Rated Capacity (gpm)" },
  { name: "overloadPressurePsi", label: "Rated Pressure @ Rated Capacity (psi)" },
  { name: "driverManufacturer", label: "Driver Mfr." },
  { name: "driverModel", label: "Driver Model" },
  { name: "driverRatedRpm", label: "Driver Rated RPM" },
];

const ELECTRIC_FIRE_PUMP_ASSET_FIELDS = [
  ...FIRE_PUMP_ASSET_FIELDS_BASE,
  { name: "fullLoadAmp", label: "Full Load Amp (FLA)" },
  { name: "ratedVoltage", label: "Rated Voltage" },
  { name: "serviceFactor", label: "Service Factor (SF)" },
  { name: "dateInstalled", label: "Date Installed", type: "date" },
  { name: "notes", label: "Notes", multiline: true, span: 2 },
];

const DIESEL_FIRE_PUMP_ASSET_FIELDS = [
  ...FIRE_PUMP_ASSET_FIELDS_BASE,
  { name: "fuelTankCapacityGal", label: "Fuel Tank Capacity (gal)" },
  { name: "dateInstalled", label: "Date Installed", type: "date" },
  { name: "notes", label: "Notes", multiline: true, span: 2 },
];

// Top-level fields on every checklist-based log entry (fire pumps), on top
// of the itemized checklist below.
const FIRE_PUMP_LOG_FIELDS = [
  { name: "logDate", label: "Date", type: "date", required: true },
  { name: "technician", label: "Technician / Contractor" },
  { name: "overallResult", label: "Overall Result", type: "select", options: "TEST_RESULT_OPTIONS" },
  { name: "notes", label: "Deficiencies / Comments", multiline: true, span: 2 },
];

// Checklist items transcribed from Form AES 5.3 ("Electric Fire Pump —
// Monthly", CCR Title 19 / NFPA 25 Table 8.1.2 & 8.1.1.2 reference). Each
// item's `id` matches the form's item number so entries can be cross-
// referenced against a paper/PDF copy if needed.
export const ELECTRIC_FIRE_PUMP_CHECKLIST = [
  { id: "1.1", section: "Fire Pump Start/Stop Pressures", type: "T", label: "Fire Pump Start Pressure", ref: "8.3.2.8(1)(f)", valueType: "reading", unit: "psi" },
  { id: "1.2", section: "Fire Pump Start/Stop Pressures", type: "T", label: "Fire Pump Stop Pressure", ref: "8.3.2.8(1)(f)", valueType: "reading", unit: "psi" },
  { id: "1.3", section: "Fire Pump Start/Stop Pressures", type: "T", label: "Pressure Maintenance Pump Start Pressure", ref: "8.3.2.8(1)(g)", valueType: "reading", unit: "psi" },
  { id: "1.4", section: "Fire Pump Start/Stop Pressures", type: "T", label: "Pressure Maintenance Pump Stop Pressure", ref: "8.3.2.8(1)(g)", valueType: "reading", unit: "psi" },
  { id: "1.5", section: "Pump House", type: "I", label: "Pump House Heating and Ventilating Louvers", ref: "8.2.2(1)(a)(b)", valueType: "check" },
  { id: "1.6", section: "Fire Pump System", type: "I", label: "Control Valves - Identification Sign", ref: "13.3.1", valueType: "check" },
  { id: "1.7", section: "Fire Pump System", type: "I", label: "Control Valves - Inspection", ref: "13.3.2", valueType: "check" },
  { id: "1.8", section: "Fire Pump System", type: "I", label: "Pump Suction, Discharge & Bypass Valves Open", ref: "8.2.2(2)(a)", valueType: "check" },
  { id: "1.9", section: "Fire Pump System", type: "I", label: "Normally Closed Valves are Closed (Test Header/Venturi Meter)", ref: "8.2.2(2)(g), 13.3.2.2", valueType: "check" },
  { id: "1.10", section: "Fire Pump System", type: "I", label: "Valve Supervisory Devices", ref: "5.2.5", valueType: "check" },
  { id: "1.11", section: "Fire Pump System", type: "I", label: "Piping is Free of Leaks", ref: "8.2.2(2)(b)", valueType: "check" },
  { id: "1.12", section: "Fire Pump System", type: "I", label: "Suction Reservoir is Full", ref: "8.2.2(2)(e)", valueType: "check" },
  { id: "1.13", section: "Fire Pump System", type: "I", label: "Suction Line Pressure Gauge Reading within Acceptable Range", ref: "8.2.2(2)(c)", valueType: "check" },
  { id: "1.13r", section: "Fire Pump System", type: "I", label: "Suction Pressure Reading", ref: "8.2.2(2)(c)", valueType: "reading", unit: "psi" },
  { id: "1.14", section: "Fire Pump System", type: "I", label: "System Line Pressure Gauge Reading within Acceptable Range", ref: "8.2.2(2)(d)", valueType: "check" },
  { id: "1.14r", section: "Fire Pump System", type: "I", label: "System Pressure Reading", ref: "8.2.2(2)(d)", valueType: "reading", unit: "psi" },
  { id: "1.15", section: "Fire Pump System", type: "I", label: "Wet Pit Suction Screens Unobstructed and in Place", ref: "8.2.2(2)(f)", valueType: "check" },
  { id: "1.16", section: "Fire Pump System", type: "I", label: "Verify Pump Packing Glands for Slight Discharge (Pump Not Running)", ref: "8.2.2(2)(h)", valueType: "check" },
  { id: "1.17", section: "Fire Pump System", type: "T", label: "Pump Operation (No Flow - 10 min.)", ref: "8.3.2.3", valueType: "check" },
  { id: "1.18", section: "Fire Pump System", type: "I", label: "Observe Time for Motor to Accelerate to Full Speed", ref: "8.3.2.8(2)(a)", valueType: "reading", unit: "sec" },
  { id: "1.19", section: "Fire Pump System", type: "I", label: "Check Pump Packing Glands for Slight Discharge (Pump Running)", ref: "8.3.2.8(1)(b)", valueType: "check" },
  { id: "1.20", section: "Fire Pump System", type: "I", label: "Suction Pressure Gauge Reading (Pump Running)", ref: "8.3.2.8(1)(a)", valueType: "reading", unit: "psi" },
  { id: "1.21", section: "Fire Pump System", type: "I", label: "Discharge Pressure Gauge Reading (Pump Running)", ref: "8.3.2.8(1)(a)", valueType: "reading", unit: "psi" },
  { id: "1.22", section: "Fire Pump System", type: "I", label: "Pressure Readings Acceptable", ref: "", valueType: "check" },
  { id: "1.23", section: "Fire Pump System", type: "I", label: "Adjust Gland Nuts if Necessary", ref: "8.3.2.8(1)(c)", valueType: "check" },
  { id: "1.24", section: "Fire Pump System", type: "I", label: "Check for Unusual Noise or Vibration", ref: "8.3.2.8(1)(d)", valueType: "check" },
  { id: "1.25", section: "Fire Pump System", type: "I", label: "Check Packing Boxes, Bearings, or Pump Casing for Overheating", ref: "8.3.2.8(1)(e)", valueType: "check" },
  { id: "1.26", section: "Fire Pump System", type: "I", label: "Circulation Relief Valve Operating Properly (No Flow)", ref: "8.3.3.2(1)(a), 13.5.7.1.1", valueType: "check" },
  { id: "1.27", section: "Fire Pump System", type: "I", label: "Record Time Controller is on First Step (Reduced Voltage or Reduced Current Starting)", ref: "8.3.2.8(3)(b)", valueType: "reading", unit: "sec" },
  { id: "1.28", section: "Fire Pump System", type: "I", label: "Record Time Pump Runs After Starting (Automatic Stop Controllers)", ref: "8.3.2.8(2)(c)", valueType: "reading", unit: "min" },
  { id: "1.29", section: "Electrical System Conditions", type: "I", label: "Controller \"Power On\" Power Light is Illuminated", ref: "8.2.2(3)(a)", valueType: "check" },
  { id: "1.30", section: "Electrical System Conditions", type: "I", label: "Engine Generator Sets (Monthly)", ref: "NFPA 110", valueType: "check" },
  { id: "1.31", section: "Electrical System Conditions", type: "I", label: "Transfer Switch Pilot Light is Illuminated", ref: "8.2.2(3)(b)", valueType: "check" },
  { id: "1.32", section: "Electrical System Conditions", type: "I", label: "Isolating Switch is Closed - Standby (Emergency) Source", ref: "8.2.2(3)(c)", valueType: "check" },
  { id: "1.33", section: "Electrical System Conditions", type: "I", label: "Reverse Phase Alarm Pilot Light is Off, or, Normal Phase Rotation Pilot Light is On", ref: "8.2.2(3)(d)", valueType: "check" },
  { id: "1.34", section: "Electrical System Conditions", type: "I", label: "Oil Level in Vertical Motor Sight Glass is Within Acceptable Range", ref: "8.2.2(3)(e)", valueType: "check" },
  { id: "1.35", section: "Electrical System Conditions", type: "I", label: "Exercise Isolating Switch Circuit Breaker", ref: "Table 8.1.2", valueType: "check" },
  { id: "1.36", section: "Electrical System Conditions", type: "T", label: "Power to Pressure Maintenance (Jockey) Pump is Provided", ref: "8.2.2(3)(f)", valueType: "check" },
  { id: "1.37", section: "General Maintenance", type: "M", label: "System Returned to Service", ref: "4.5.3, 15.7", valueType: "check" },
];

// Checklist items transcribed from Form AES 5.1 ("Diesel Fire Pump —
// Weekly", CCR Title 19 / NFPA 25 Table 8.5.3 reference).
export const DIESEL_FIRE_PUMP_CHECKLIST = [
  { id: "1.1", section: "Fire Pump Start/Stop Pressures", type: "T", label: "Fire Pump Start Pressure", ref: "8.3.2.8(1)(f)", valueType: "reading", unit: "psi" },
  { id: "1.2", section: "Fire Pump Start/Stop Pressures", type: "T", label: "Fire Pump Stop Pressure", ref: "8.3.2.8(1)(f)", valueType: "reading", unit: "psi" },
  { id: "1.3", section: "Fire Pump Start/Stop Pressures", type: "T", label: "Pressure Maintenance Pump Start Pressure", ref: "8.3.2.8(1)(g)", valueType: "reading", unit: "psi" },
  { id: "1.4", section: "Fire Pump Start/Stop Pressures", type: "T", label: "Pressure Maintenance Pump Stop Pressure", ref: "8.3.2.8(1)(g)", valueType: "reading", unit: "psi" },
  { id: "1.5", section: "Pump House", type: "I", label: "Pump House Heating and Ventilating Louvers", ref: "8.2.2(1)(a)(b)", valueType: "check" },
  { id: "1.6", section: "Fire Pump System", type: "I", label: "Control Valves - Identification Sign", ref: "13.3.1", valueType: "check" },
  { id: "1.7", section: "Fire Pump System", type: "I", label: "Control Valves - Inspection", ref: "13.3.2", valueType: "check" },
  { id: "1.8", section: "Fire Pump System", type: "I", label: "Pump Suction, Discharge & Bypass Valves Open", ref: "8.2.2(2)(a)", valueType: "check" },
  { id: "1.9", section: "Fire Pump System", type: "I", label: "Normally Closed Valves are Closed (Test Header/Venturi Meter)", ref: "8.2.2(2)(g), 13.3.2.2", valueType: "check" },
  { id: "1.10", section: "Fire Pump System", type: "I", label: "Valve Supervisory Devices", ref: "5.2.5", valueType: "check" },
  { id: "1.11", section: "Fire Pump System", type: "M", label: "Control Valve Maintenance", ref: "13.3.4", valueType: "check" },
  { id: "1.12", section: "Fire Pump System", type: "I", label: "Piping is Free of Leaks", ref: "8.2.2(2)(b)", valueType: "check" },
  { id: "1.13", section: "Fire Pump System", type: "I", label: "Suction Reservoir is Full", ref: "8.2.2(2)(e)", valueType: "check" },
  { id: "1.14", section: "Fire Pump System", type: "I", label: "Suction Line Pressure Gauge Reading within Acceptable Range", ref: "8.2.2(2)(c)", valueType: "check" },
  { id: "1.14r", section: "Fire Pump System", type: "I", label: "Suction Pressure Reading", ref: "8.2.2(2)(c)", valueType: "reading", unit: "psi" },
  { id: "1.15", section: "Fire Pump System", type: "I", label: "System Line Pressure Gauge Reading within Acceptable Range", ref: "8.2.2(2)(d)", valueType: "check" },
  { id: "1.15r", section: "Fire Pump System", type: "I", label: "System Pressure Reading", ref: "8.2.2(2)(d)", valueType: "reading", unit: "psi" },
  { id: "1.16", section: "Fire Pump System", type: "I", label: "Wet Pit Suction Screens Unobstructed and in Place", ref: "8.2.2(2)(f)", valueType: "check" },
  { id: "1.17", section: "Fire Pump System", type: "I", label: "Verify Pump Packing Glands for Slight Discharge (Pump Not Running)", ref: "8.2.2(2)(h)", valueType: "check" },
  { id: "1.18", section: "Fire Pump System", type: "I", label: "Suction Pressure Gauge Reading (Pump Running)", ref: "8.3.2.8(1)(a)", valueType: "reading", unit: "psi" },
  { id: "1.19", section: "Fire Pump System", type: "I", label: "Discharge Pressure Gauge Reading (Pump Running)", ref: "8.3.2.8(1)(a)", valueType: "reading", unit: "psi" },
  { id: "1.20", section: "Fire Pump System", type: "I", label: "Check Pump Packing Glands for Slight Discharge (Pump Running)", ref: "8.3.2.8(1)(b)", valueType: "check" },
  { id: "1.21", section: "Fire Pump System", type: "I", label: "Adjust Gland Nuts if Necessary", ref: "8.3.2.8(1)(c)", valueType: "check" },
  { id: "1.22", section: "Fire Pump System", type: "I", label: "Check for Unusual Noise or Vibration", ref: "8.3.2.8(1)(d)", valueType: "check" },
  { id: "1.23", section: "Fire Pump System", type: "I", label: "Check Packing Boxes, Bearings, or Pump Casing for Overheating", ref: "8.3.2.8(1)(e)", valueType: "check" },
  { id: "1.24", section: "Fire Pump System", type: "I", label: "Circulation Relief Valve Operating Properly (No Flow)", ref: "8.3.3.2(1)(a)", valueType: "check" },
  { id: "1.25", section: "Fire Pump System", type: "I", label: "Pressure Relief Valve Operating Properly (No Flow)", ref: "8.3.3.2(1)(b)", valueType: "check" },
  { id: "1.26", section: "Fire Pump System", type: "I", label: "Pressure Relief Valve Operating Properly (Flowing)", ref: "8.3.3.3.1, 8.3.3.3.2, 13.5.7.2", valueType: "check" },
  { id: "1.27", section: "Fire Pump System", type: "I", label: "Observe Time for Engine to Crank", ref: "8.3.2.8(d)(a)", valueType: "reading", unit: "sec" },
  { id: "1.28", section: "Fire Pump System", type: "I", label: "Observe Time for Engine to Reach Running Speed", ref: "8.3.2.8(3)(b)", valueType: "reading", unit: "sec" },
  { id: "1.29", section: "Fire Pump System", type: "I", label: "Record Time Controller is on First Step (Reduced Voltage or Reduced Current Starting)", ref: "8.3.2.8(3)(b)", valueType: "reading", unit: "sec" },
  { id: "1.30", section: "Fire Pump System", type: "I", label: "Record Time Pump Runs After Starting (Automatic Stop Controllers)", ref: "8.3.2.8(2)(c)", valueType: "reading", unit: "min" },
  { id: "1.31a", section: "Fire Pump System", type: "I", label: "Engine Oil Pressure Gauge (While Running)", ref: "8.3.2.8(3)(c)", valueType: "reading", unit: "psi" },
  { id: "1.31b", section: "Fire Pump System", type: "I", label: "Speed Indicator Reading (While Running)", ref: "8.3.2.8(3)(c)", valueType: "reading", unit: "rpm" },
  { id: "1.31c", section: "Fire Pump System", type: "I", label: "Water Temperature (While Running)", ref: "8.3.2.8(3)(c)", valueType: "reading", unit: "°F" },
  { id: "1.31d", section: "Fire Pump System", type: "I", label: "Oil Temperature (While Running)", ref: "8.3.2.8(3)(c)", valueType: "reading", unit: "°F" },
  { id: "1.32", section: "Fire Pump System", type: "T", label: "Pump Operation (No Flow Condition - 30 min.)", ref: "8.3.2.4", valueType: "check" },
  { id: "1.33", section: "Fire Pump System", type: "I", label: "Record Any Abnormalities", ref: "8.3.2.8(3)(d)", valueType: "check" },
  { id: "1.34", section: "Electrical System Conditions", type: "I", label: "Controller \"Power On\" Power Light is Illuminated", ref: "8.2.2(3)(a)", valueType: "check" },
  { id: "1.35", section: "Electrical System Conditions", type: "I", label: "Transfer Switch Pilot Light is Illuminated", ref: "8.2.2(3)(b)", valueType: "check" },
  { id: "1.36", section: "Electrical System Conditions", type: "I", label: "Isolating Switch is Closed - Standby (Emergency) Source", ref: "8.2.2(3)(c)", valueType: "check" },
  { id: "1.37", section: "Electrical System Conditions", type: "I", label: "Electrical System: General Inspection", ref: "Table 8.1.2", valueType: "check" },
  { id: "1.38", section: "Electrical System Conditions", type: "I", label: "Reverse Phase Alarm Pilot Light is Off or Normal Phase Rotation Pilot Light is On", ref: "8.2.2(3)(d)", valueType: "check" },
  { id: "1.39", section: "Electrical System Conditions", type: "I", label: "Oil Level in Vertical Motor Sight Glass is Within Acceptable Range", ref: "8.2.2(3)(e)", valueType: "check" },
  { id: "1.40", section: "Electrical System Conditions", type: "I", label: "Power to Pressure Maintenance (Jockey) Pump is Provided", ref: "8.2.2(3)(f)", valueType: "check" },
  { id: "1.41", section: "Electrical System Conditions", type: "I", label: "Controller Selector Switch is in \"Auto\" Position", ref: "8.2.2(4)(b)", valueType: "check" },
  { id: "1.42", section: "Electrical System Conditions", type: "I", label: "Batteries (2) Voltage Readings are Within Acceptable Range", ref: "8.2.2(4)(c)", valueType: "check" },
  { id: "1.43", section: "Electrical System Conditions", type: "I", label: "Batteries (2) Charging Current Readings are Within Acceptable Range", ref: "8.2.2(4)(d)", valueType: "check" },
  { id: "1.44", section: "Electrical System Conditions", type: "I", label: "Batteries (2) Pilot Lights are On or Battery Failure (2) Lights are Off", ref: "8.2.2(4)(e)", valueType: "check" },
  { id: "1.45", section: "Electrical System Conditions", type: "I", label: "All Alarm Pilot Lights are Off", ref: "8.2.2(4)(f)", valueType: "check" },
  { id: "1.46", section: "Electrical System Conditions", type: "I", label: "Electrolyte Level in Batteries is Within Acceptable Range", ref: "8.2.2(4)(k), Table 8.1.2", valueType: "check" },
  { id: "1.47", section: "Electrical System Conditions", type: "I", label: "Battery Terminals are Free from Corrosion", ref: "8.2.2(4)(l)", valueType: "check" },
  { id: "1.48", section: "Electrical System Conditions", type: "I", label: "Cranking Voltage (9V on 12V System / 18V on 24V System)", ref: "Table 8.1.2", valueType: "reading", unit: "V" },
  { id: "1.49", section: "Diesel Engine System", type: "I", label: "Engine Running Time Meter is Reading", ref: "8.2.2(4)(g)", valueType: "reading", unit: "hrs" },
  { id: "1.50", section: "Diesel Engine System", type: "I", label: "Oil Level in Right Angle Gear Drive is within Acceptable Range", ref: "8.2.2(4)(h)", valueType: "check" },
  { id: "1.51", section: "Diesel Engine System", type: "I", label: "Cooling Water Level is within Acceptable Range", ref: "8.2.2(4)(j)", valueType: "check" },
  { id: "1.52", section: "Diesel Engine System", type: "I", label: "Water Jacket Heater is Operating", ref: "8.2.2(4)(m)", valueType: "check" },
  { id: "1.53", section: "Diesel Engine System", type: "I", label: "Fuel: Tank Level (Two-Thirds Full)", ref: "Table 8.1.2, 8.2.2(4)(a)", valueType: "check" },
  { id: "1.54", section: "Diesel Engine System", type: "I", label: "Fuel: Tank Float Switch", ref: "Table 8.1.2", valueType: "check" },
  { id: "1.55", section: "Diesel Engine System", type: "I", label: "Fuel: Solenoid Valve Operation", ref: "Table 8.1.2", valueType: "check" },
  { id: "1.56", section: "Diesel Engine System", type: "I", label: "Fuel: Flexible Hoses and Connectors", ref: "Table 8.1.2", valueType: "check" },
  { id: "1.57", section: "Diesel Engine System", type: "I", label: "Lubrication System: Oil level is within Acceptable Range", ref: "Table 8.1.2, 8.2.2(4)(i)", valueType: "check" },
  { id: "1.58", section: "Diesel Engine System", type: "I", label: "Cooling System: Level", ref: "Table 8.1.2", valueType: "check" },
  { id: "1.59", section: "Diesel Engine System", type: "I", label: "Cooling System: Adequate Cooling Water to Heat Exchanger", ref: "Table 8.1.2, 8.3.2.8(3)(e)", valueType: "check" },
  { id: "1.60", section: "Diesel Engine System", type: "I", label: "Cooling System: Water Pumps", ref: "Table 8.1.2", valueType: "check" },
  { id: "1.61", section: "Diesel Engine System", type: "I", label: "Cooling System: Condition of Flexible Hoses and Connections", ref: "Table 8.1.2", valueType: "check" },
  { id: "1.62", section: "Diesel Engine System", type: "I", label: "Cooling System: Jacket Water Heater", ref: "Table 8.1.2", valueType: "check" },
  { id: "1.63", section: "Diesel Engine System", type: "I", label: "Exhaust System: Leakage", ref: "Table 8.1.2", valueType: "check" },
  { id: "1.64", section: "Diesel Engine System", type: "M", label: "Control Maintenance", ref: "13.3.4", valueType: "check" },
  { id: "1.65", section: "Diesel Engine System", type: "M", label: "Fuel: Water in System", ref: "Table 8.1.2", valueType: "check" },
  { id: "1.66", section: "Diesel Engine System", type: "M", label: "Exhaust System: Drain Condensate Trap", ref: "Table 8.1.2", valueType: "check" },
  { id: "1.67", section: "Diesel Engine System", type: "M", label: "Lubrication System: Lube Oil Heater", ref: "Table 8.1.2", valueType: "check" },
  { id: "1.68", section: "General Maintenance", type: "M", label: "System Returned to Service", ref: "4.5.3, 15.7", valueType: "check" },
];

// Drives both the Supabase table names and the add/edit form for each
// equipment type. `assetFields` map straight to columns in
// supabase/migrations/0001_init.sql (camelCase here, snake_case there —
// db.js does the conversion). Fire pump types additionally carry a
// `checklist` — when present, the log entry form renders that itemized
// checklist (stored as a single `responses` jsonb column) instead of a
// handful of plain fields.
export const EQUIPMENT_TYPES = [
  {
    key: "diesel_generators",
    label: "Diesel Generators",
    singular: "Generator",
    logTable: "diesel_generator_logs",
    frequencyLabel: "Bi-Weekly",
    formNo: "Emergency Engine Operating Log",
    assetFields: DIESEL_GENERATOR_ASSET_FIELDS,
    logFields: DIESEL_GENERATOR_LOG_FIELDS,
    checklist: DIESEL_GENERATOR_CHECKLIST,
  },
  {
    key: "diesel_fire_pumps",
    label: "Diesel Fire Pumps",
    singular: "Fire Pump",
    logTable: "diesel_fire_pump_logs",
    frequencyLabel: "Weekly",
    formNo: "AES 5.1",
    assetFields: DIESEL_FIRE_PUMP_ASSET_FIELDS,
    logFields: FIRE_PUMP_LOG_FIELDS,
    checklist: DIESEL_FIRE_PUMP_CHECKLIST,
  },
  {
    key: "electric_fire_pumps",
    label: "Electric Fire Pumps",
    singular: "Fire Pump",
    logTable: "electric_fire_pump_logs",
    frequencyLabel: "Monthly",
    formNo: "AES 5.3",
    assetFields: ELECTRIC_FIRE_PUMP_ASSET_FIELDS,
    logFields: FIRE_PUMP_LOG_FIELDS,
    checklist: ELECTRIC_FIRE_PUMP_CHECKLIST,
  },
];

export const OPTION_LISTS = {
  LOCATION_OPTIONS, TEST_RESULT_OPTIONS, CHECK_OPTIONS,
  YES_NO_OPTIONS, OPERATION_REASON_OPTIONS,
};
