export const LOCATION_OPTIONS = [
  "Santa Clara Gateway", "Santa Clara Square", "Coronado", "McCarthy",
  "Sunnyvale", "First Point", "Silicon Valley Center",
];

export const TEST_RESULT_OPTIONS = ["Pass", "Fail"];

// Drives both the Supabase table names and the add/edit form for each
// equipment type. `assetFields`/`logFields` map straight to columns in
// supabase/migrations/0001_init.sql (camelCase here, snake_case there —
// db.js does the conversion).
export const EQUIPMENT_TYPES = [
  {
    key: "diesel_generators",
    label: "Diesel Generators",
    singular: "Generator",
    logTable: "diesel_generator_logs",
    assetFields: [
      { name: "unitTag", label: "Unit Tag", required: true },
      { name: "location", label: "Location", datalist: "LOCATION_OPTIONS" },
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
    ],
    logFields: [
      { name: "logDate", label: "Date", type: "date", required: true },
      { name: "technician", label: "Technician" },
      { name: "runHours", label: "Run Hours" },
      { name: "fuelLevelPct", label: "Fuel Level (%)" },
      { name: "oilLevelOk", label: "Oil Level OK", type: "checkbox" },
      { name: "coolantLevelOk", label: "Coolant Level OK", type: "checkbox" },
      { name: "batteryVoltage", label: "Battery Voltage" },
      { name: "testResult", label: "Test Result", type: "select", options: "TEST_RESULT_OPTIONS" },
      { name: "notes", label: "Notes", multiline: true, span: 2 },
    ],
  },
  {
    key: "diesel_fire_pumps",
    label: "Diesel Fire Pumps",
    singular: "Fire Pump",
    logTable: "diesel_fire_pump_logs",
    assetFields: [
      { name: "unitTag", label: "Unit Tag", required: true },
      { name: "location", label: "Location", datalist: "LOCATION_OPTIONS" },
      { name: "manufacturer", label: "Manufacturer" },
      { name: "model", label: "Model" },
      { name: "serial", label: "Serial", mono: true },
      { name: "engineManufacturer", label: "Engine Manufacturer" },
      { name: "engineModel", label: "Engine Model" },
      { name: "ratedGpm", label: "Rated GPM" },
      { name: "ratedPsi", label: "Rated PSI" },
      { name: "fuelTankCapacityGal", label: "Fuel Tank Capacity (gal)" },
      { name: "dateInstalled", label: "Date Installed", type: "date" },
      { name: "notes", label: "Notes", multiline: true, span: 2 },
    ],
    logFields: [
      { name: "logDate", label: "Date", type: "date", required: true },
      { name: "technician", label: "Technician" },
      { name: "runHours", label: "Run Hours" },
      { name: "fuelLevelPct", label: "Fuel Level (%)" },
      { name: "oilLevelOk", label: "Oil Level OK", type: "checkbox" },
      { name: "coolantLevelOk", label: "Coolant Level OK", type: "checkbox" },
      { name: "batteryVoltage", label: "Battery Voltage" },
      { name: "churnPressurePsi", label: "Churn Pressure (PSI)" },
      { name: "testResult", label: "Test Result", type: "select", options: "TEST_RESULT_OPTIONS" },
      { name: "notes", label: "Notes", multiline: true, span: 2 },
    ],
  },
  {
    key: "electric_fire_pumps",
    label: "Electric Fire Pumps",
    singular: "Fire Pump",
    logTable: "electric_fire_pump_logs",
    assetFields: [
      { name: "unitTag", label: "Unit Tag", required: true },
      { name: "location", label: "Location", datalist: "LOCATION_OPTIONS" },
      { name: "manufacturer", label: "Manufacturer" },
      { name: "model", label: "Model" },
      { name: "serial", label: "Serial", mono: true },
      { name: "motorHp", label: "Motor HP" },
      { name: "voltage", label: "Voltage" },
      { name: "ratedGpm", label: "Rated GPM" },
      { name: "ratedPsi", label: "Rated PSI" },
      { name: "controllerManufacturer", label: "Controller Manufacturer" },
      { name: "controllerModel", label: "Controller Model" },
      { name: "dateInstalled", label: "Date Installed", type: "date" },
      { name: "notes", label: "Notes", multiline: true, span: 2 },
    ],
    logFields: [
      { name: "logDate", label: "Date", type: "date", required: true },
      { name: "technician", label: "Technician" },
      { name: "runMinutes", label: "Run Minutes" },
      { name: "churnPressurePsi", label: "Churn Pressure (PSI)" },
      { name: "controllerAlarmOk", label: "Controller Alarm OK", type: "checkbox" },
      { name: "testResult", label: "Test Result", type: "select", options: "TEST_RESULT_OPTIONS" },
      { name: "notes", label: "Notes", multiline: true, span: 2 },
    ],
  },
];

export const OPTION_LISTS = { LOCATION_OPTIONS, TEST_RESULT_OPTIONS };
