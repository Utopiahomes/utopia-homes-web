import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbook = await SpreadsheetFile.importXlsx(
  await FileBlob.load("C:/Users/Forti/Downloads/Utopia_Design_Quote_Pricing_Model_v1.xlsx"),
);

for (const [sheetId, range] of [
  ["Audit Calculator", "A4:E21"],
  ["Room Calculator", "A4:H29"],
  ["Whole Home Calc", "A4:F29"],
  ["Renovation Calc", "A4:F35"],
  ["Turnkey Calc", "A4:H30"],
]) {
  const region = await workbook.inspect({
    kind: "region",
    sheetId,
    range,
    maxChars: 18000,
    tableMaxRows: 40,
    tableMaxCols: 10,
    tableMaxCellChars: 500,
  });
  const formulas = await workbook.inspect({
    kind: "formula",
    sheetId,
    range,
    maxChars: 18000,
    options: { maxResults: 200 },
  });
  console.log(`\n=== ${sheetId} ${range} ===`);
  console.log(region.ndjson);
  console.log(formulas.ndjson);
}
