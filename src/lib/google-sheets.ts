/* eslint-disable */
import path from "path";
import fs from "fs";
import ExcelJS from "exceljs";
import { FormulaBaseData } from "./excel-surgeon";

export async function fetchFormulaBaseCompleta(): Promise<FormulaBaseData> {
  const filePath = path.join(process.cwd(), "Formula_Base.xlsx");

  if (!fs.existsSync(filePath)) {
    console.warn("ATENÇÃO: O arquivo Formula_Base.xlsx não foi encontrado na raiz do projeto.");
    throw new Error("O arquivo 'Formula_Base.xlsx' não foi encontrado na pasta principal do projeto. Por favor, adicione-o antes de processar.");
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const baseMlb = new Map();
  const precosSKU = new Map();
  const precosMLB = new Map();

  const sheetMlb = workbook.getWorksheet("Base MLB");
  const sheetPrecosSKU = workbook.getWorksheet("Base com preços");
  const sheetBoaForma = workbook.getWorksheet("Boa forma");

  // Parse Base MLB
  if (sheetMlb) {
    sheetMlb.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const sku = row.getCell(1).text?.trim();
      const tipo = row.getCell(2).text?.trim() || "";
      const padraoText = row.getCell(3).text?.trim() || "0";
      const padrao = parseFloat(padraoText.replace(',', '.')) || 0;
      
      if (sku) {
        baseMlb.set(sku, { tipo, padrao });
      }
    });
  }

  // Função utilitária para ler cabeçalhos
  const parseHeaders = (row: ExcelJS.Row, isPercentFormat: boolean) => {
    const cols: Record<number, number> = {};
    row.eachCell((cell, colNumber) => {
      if (colNumber <= 2) return; // Skip first two columns (e.g. SKU and empty)
      let val = parseFloat(cell.text?.replace(',', '.') || "0");
      if (!isNaN(val)) {
        if (isPercentFormat && val > 1) val /= 100;
        cols[colNumber] = Math.round(val * 1000) / 1000;
      }
    });
    return cols;
  };

  // Parse Base com precos
  if (sheetPrecosSKU) {
    const headerRow = sheetPrecosSKU.getRow(1);
    const cols = parseHeaders(headerRow, false);
    
    sheetPrecosSKU.eachRow((row, rowNumber) => {
      if (rowNumber <= 2) return; // Skip header and second row if needed (assuming data starts at 3 as per old logic)
      
      const sku = row.getCell(1).text?.trim();
      if (sku) {
        const skuData: Record<number, number> = {};
        for (const [colIdx, pct] of Object.entries(cols)) {
          const valText = row.getCell(parseInt(colIdx)).text?.trim() || "0";
          const val = parseFloat(valText.replace(',', '.'));
          if (!isNaN(val)) skuData[pct] = val;
        }
        precosSKU.set(sku, skuData);
      }
    });
  }

  // Parse Boa forma
  if (sheetBoaForma) {
    const headerRow = sheetBoaForma.getRow(1);
    const cols = parseHeaders(headerRow, true);
    
    sheetBoaForma.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      const mlb = row.getCell(1).text?.trim();
      if (mlb) {
        const mlbData: Record<number, number> = {};
        for (const [colIdx, pct] of Object.entries(cols)) {
          const valText = row.getCell(parseInt(colIdx)).text?.trim() || "0";
          const val = parseFloat(valText.replace(',', '.'));
          if (!isNaN(val)) mlbData[pct] = val;
        }
        precosMLB.set(mlb, mlbData);
      }
    });
  }

  return { baseMlb, precosSKU, precosMLB };
}
