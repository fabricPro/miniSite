import * as XLSX from "xlsx";

const wb = XLSX.readFile("C:/Users/PC/NumuneAtilim/data/numune-dokuma.xlsx", {
  raw: true,
  sheets: ["NUMUNE ATILIM"],
});
const sheet = wb.Sheets["NUMUNE ATILIM"];
const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
  defval: null,
  raw: true,
});
console.log("Total rows:", rows.length);
if (rows.length > 0) {
  console.log("\n=== Column headers (keys of first non-empty row) ===");
  // Find first row that has actual data
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const r = rows[i];
    const keys = Object.keys(r);
    const nonNullKeys = keys.filter((k) => r[k] != null && r[k] !== "");
    if (nonNullKeys.length > 3) {
      console.log(`Row ${i + 2} (data):`, JSON.stringify(keys));
      console.log("Sample values:", JSON.stringify(r, null, 2).slice(0, 1500));
      break;
    }
  }
  console.log("\n=== Headers as printed in row 1 ===");
  console.log(Object.keys(rows[0]));
}
