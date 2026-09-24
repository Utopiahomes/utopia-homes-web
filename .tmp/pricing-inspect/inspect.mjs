import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const source = "C:/Users/Forti/Downloads/Utopia_Design_Quote_Pricing_Model_v1.xlsx";
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(source));
const summary = await workbook.inspect({ kind: "workbook,sheet,table", maxChars: 18000, tableMaxRows: 20, tableMaxCols: 14, tableMaxCellChars: 180 });
console.log(summary.ndjson);
const sheets = await workbook.inspect({ kind: "sheet", include: "id,name", maxChars: 8000 });
console.log("SHEETS");
console.log(sheets.ndjson);
await fs.mkdir("previews", { recursive: true });
const names = [...sheets.ndjson.matchAll(/"name":"([^"]+)"/g)].map((match) => match[1]);
for (const name of names) {
  const region = await workbook.inspect({ kind: "region", sheetId: name, range: "A1:Z120", maxChars: 20000, tableMaxRows: 120, tableMaxCols: 26, tableMaxCellChars: 200 });
  console.log(`REGION:${name}`);
  console.log(region.ndjson);
  const formulas = await workbook.inspect({ kind: "formula", sheetId: name, range: "A1:Z120", maxChars: 12000, options: { maxResults: 300 } });
  console.log(`FORMULAS:${name}`);
  console.log(formulas.ndjson);
  const preview = await workbook.render({ sheetName: name, autoCrop: "all", scale: 1, format: "png" });
  const safeName = name.replace(/[^A-Za-z0-9_-]+/g, "-");
  await fs.writeFile(`previews/${safeName}.png`, new Uint8Array(await preview.arrayBuffer()));
}
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 300 }, summary: "formula error scan" });
console.log("ERRORS");
console.log(errors.ndjson);
