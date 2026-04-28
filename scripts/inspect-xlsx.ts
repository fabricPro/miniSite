// Quick inspector for missing-data xlsx — prints sheet names, headers, row counts, and first 3 rows of each sheet.
import * as XLSX from "xlsx";
import path from "node:path";

const FILE = path.resolve(process.argv[2] ?? "C:/Users/PC/NumuneAtilim/data/argeDATA.xlsx");
console.log("Reading:", FILE);

const wb = XLSX.readFile(FILE, { cellDates: false, raw: true });

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: null,
    raw: true,
  });
  console.log(`\n=== Sheet: "${sheetName}" — ${rows.length} rows ===`);
  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    console.log("Headers:", JSON.stringify(headers, null, 2));
    console.log("\nFirst 3 rows:");
    for (let i = 0; i < Math.min(3, rows.length); i++) {
      console.log(`Row ${i + 1}:`, JSON.stringify(rows[i], null, 2));
    }
    console.log("\nLast row:");
    console.log(JSON.stringify(rows[rows.length - 1], null, 2));
  }
}
