/* eslint-disable */
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { supabase } from "@/lib/supabase";
import JSZip from "jszip";
import { fetchFormulaBaseCompleta } from "@/lib/google-sheets";
import { processItem } from "@/lib/excel-surgeon";
import { surgicallyEditExcel } from "@/lib/excel-xml";
import { generateReport, ReportItem } from "@/lib/report-generator";

// A utility to get column letter from 1-based index (e.g. 1 -> A, 2 -> B)
function getColLetter(colIdx: number): string {
  let letter = "";
  let temp = colIdx;
  while (temp > 0) {
    let remainder = (temp - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    temp = Math.floor((temp - remainder) / 26);
  }
  return letter;
}

// Extract rich text / objects cleanly
function extractText(val: any): string {
  if (val == null) return "";
  if (typeof val === "object") {
    if (val.richText) return val.richText.map((t: any) => t.text).join("");
    if (val.text) return val.text;
    if (val.result) return String(val.result);
    return JSON.stringify(val);
  }
  return String(val);
}

async function processSingleFile(file: File, formulaData: any, fileCampanha: string, extraDiscount: number = 0) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const reportItems: ReportItem[] = [];

  const workbook = new ExcelJS.Workbook();
  // Read purely to find indices and build updates
  await workbook.xlsx.load(buffer as any);
  
  let targetWorksheet: ExcelJS.Worksheet | null = null;
  let headerRowIndex = 0;

  for (const worksheet of workbook.worksheets) {
    let foundHeaders = [];
    for (let i = 1; i <= Math.min(100, worksheet.rowCount); i++) {
      const row = worksheet.getRow(i);
      const rowValues = row.values as any[];
      if (rowValues && rowValues.some(v => {
        const text = extractText(v).toLowerCase();
        return text === "item_id" || text === "sku" || text === "número do anúncio" || text === "código do anúncio";
      })) {
        foundHeaders.push(i);
      }
    }
    
    if (foundHeaders.length > 0) {
      headerRowIndex = foundHeaders[foundHeaders.length - 1]; // Pick the deepest header row (for merged headers)
      targetWorksheet = worksheet;
      break;
    }
  }

  if (!targetWorksheet || headerRowIndex === 0) {
    throw new Error(`Planilha ${file.name}: Coluna ITEM_ID/SKU/Número do anúncio não encontrada.`);
  }

  const headerRow = targetWorksheet.getRow(headerRowIndex).values as any[];
  
  // Encontrar colunas pelos nomes técnicos (inglês/português por garantia)
  const findCol = (terms: string[]) => headerRow.findIndex(v => {
    const s = extractText(v).toLowerCase().trim();
    return terms.some(t => s === t || s.includes(t));
  });

  const skuColIndex = findCol(["sku"]);
  const mlbColIndex = findCol(["item_id", "mlb", "número do anúncio", "código do anúncio"]);
  const originalPriceColIndex = findCol(["original_price", "preço original"]);
  
  // Achar preço final: algumas planilhas tem duas colunas "preço final" (uma pro ML, outra pra desconto extra). 
  // O indexOf/findIndex vai pegar a primeira, que geralmente é a que queremos editar.
  const finalPriceColIndex = findCol(["final_price", "preço final"]);
  const saleFeeColIndex = findCol(["sale_fee", "redução", "tarifa de venda"]);
  const actionColIndex = findCol(["action", "o que você quer fazer", "ação"]);
  const dateColIndex = findCol(["date", "data", "vigência"]);
  const tipoAnuncioColIndex = findCol(["tipo de anúncio", "listing_type", "tipo de anuncio"]);
  
  if (skuColIndex === -1 || mlbColIndex === -1 || finalPriceColIndex === -1 || actionColIndex === -1) {
    throw new Error(`Planilha ${file.name}: Faltam colunas obrigatórias. SKU(${skuColIndex}), MLB(${mlbColIndex}), PREÇO_FINAL(${finalPriceColIndex}), AÇÃO(${actionColIndex})`);
  }

  let localCampanha = fileCampanha;

  // Descobrir quais os termos de ação esperados (ex: "Participar" vs "Aplicar proposta")
  let positiveAction = "Participar";
  let negativeAction = "Não participar";
  
  // Lê a primeira linha de dados para pegar a validação de dados da coluna de ação e a Data
  const firstDataRow = targetWorksheet.getRow(headerRowIndex + 1);
  const actionValidation = firstDataRow.getCell(actionColIndex).dataValidation;
  
  if (actionValidation && actionValidation.formulae && actionValidation.formulae[0]) {
    // Ex: '"Aplicar proposta,Não aplicar"' -> ['Aplicar proposta', 'Não aplicar']
    const options = actionValidation.formulae[0].replace(/['"]/g, '').split(',');
    if (options.length >= 2) {
      positiveAction = options[0].trim();
      negativeAction = options[1].trim();
    }
  }

  const historyEntries = [];
  const xmlUpdates: { rowIndex: number, colLetter: string, value: string | number }[] = [];

  let isDateExtracted = false;

  for (let i = headerRowIndex + 1; i <= targetWorksheet.rowCount; i++) {
    const row = targetWorksheet.getRow(i);
    
    const rawMlb = extractText(row.getCell(mlbColIndex).value).trim();
    const rawSku = extractText(row.getCell(skuColIndex).value).trim();
    
    // "dados comecam na primeira linha cujo ITEM_ID casa com ^MLB\d+$"
    if (!/^MLB\d+$/i.test(rawMlb)) continue; 

    if (!isDateExtracted && dateColIndex !== -1) {
      const dataCampanha = extractText(row.getCell(dateColIndex).value).trim();
      if (dataCampanha && dataCampanha !== "Vigência") {
        localCampanha = `${localCampanha} | ${dataCampanha}`;
      }
      isDateExtracted = true;
    }

    // Se no primeiro data row (geralmente instrução) a validação não estava presente, 
    // tentamos pegar da primeira linha real de dados
    if (positiveAction === "Participar" && negativeAction === "Não participar") {
      const rowValidation = row.getCell(actionColIndex).dataValidation;
      if (rowValidation && rowValidation.formulae && rowValidation.formulae[0]) {
        const options = rowValidation.formulae[0].replace(/['"]/g, '').split(',');
        if (options.length >= 2) {
          positiveAction = options[0].trim();
          negativeAction = options[1].trim();
        }
      }
    }

    const sku = rawSku;
    const mlb = rawMlb;

    const fpStr = extractText(row.getCell(finalPriceColIndex).value).replace(',', '.');
    let finalPrice = fpStr ? parseFloat(fpStr) : null;
    
    const sfStr = saleFeeColIndex !== -1 ? extractText(row.getCell(saleFeeColIndex).value).replace(',', '.') : "";
    let saleFee = sfStr ? parseFloat(sfStr) : null;

    const opStr = originalPriceColIndex !== -1 ? extractText(row.getCell(originalPriceColIndex).value).replace(',', '.') : "";
    const originalPrice = opStr ? parseFloat(opStr) : null;

    const tipoAnuncio = tipoAnuncioColIndex !== -1 ? extractText(row.getCell(tipoAnuncioColIndex).value).trim() : "N/A";

    // Processar usando o novo motor matemático
    const result = processItem(mlb, sku, saleFee, finalPrice, originalPrice, formulaData, positiveAction, negativeAction, extraDiscount);

    // Preparar update XML
    const actionLetter = getColLetter(actionColIndex);
    xmlUpdates.push({ rowIndex: i, colLetter: actionLetter, value: result.action });

    // Se Caso B, reescrevemos o Final Price
    if (result.newPrice !== null) {
      const fpLetter = getColLetter(finalPriceColIndex);
      xmlUpdates.push({ rowIndex: i, colLetter: fpLetter, value: result.newPrice });
    }

    const tabela = result.tabelaCalculada || 0;
    const diferencaRS = finalPrice !== null ? finalPrice - tabela : null;
    let diferencaPerc = null;
    if (finalPrice !== null && tabela > 0) {
      diferencaPerc = (finalPrice - tabela) / tabela;
    }

    reportItems.push({
      campanha: localCampanha,
      mlb,
      sku,
      tipoCampanha: saleFee !== null && saleFee > 0 ? "Com Redução" : "Sem Redução",
      precoOriginal: originalPrice,
      precoOfertadoML: finalPrice,
      tarifaReduzida: saleFee,
      precoTabela: tabela,
      diferencaRS,
      diferencaPerc,
      status: result.action === "Aplicar proposta" || result.action === "Participar" ? "Aprovado" : "Reprovado",
      motivo: result.pendencia || "OK"
    });

    historyEntries.push({
      mlb,
      sku,
      campanha: localCampanha,
      preco_oferta: result.newPrice !== null ? result.newPrice : (finalPrice || 0),
      preco_tabela: tabela,
      status_aprovacao: result.action === "Aplicar proposta" || result.action === "Participar" ? "Aprovado" : "Reprovado (" + result.pendencia + ")",
      reducao_tarifa: sfStr || "Não",
      tipo_anuncio: tipoAnuncio
    });
  }

  if (historyEntries.length > 0) {
    const { error } = await supabase.from('historico_promocoes').insert(historyEntries);
    if (error) console.error("Erro ao inserir no Supabase:", error);
  }

  // Realizar edição cirúrgica no ZIP
  const surgicalBuffer = await surgicallyEditExcel(buffer, targetWorksheet.name, xmlUpdates);
  return { surgicalBuffer, reportItems };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("file") as File[];
    const format = formData.get("format") as string || "zip";
    const extraDiscountStr = formData.get("extraDiscount") as string || "0";
    const extraDiscount = parseFloat(extraDiscountStr);

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const formulaData = await fetchFormulaBaseCompleta();
    let allReportItems: ReportItem[] = [];

    if (format === "zip" || files.length > 1) {
      const zip = new JSZip();
      
      for (const file of files) {
        try {
          const fileCampanha = file.name.replace(/\.xlsx$/i, '');
          const { surgicalBuffer, reportItems } = await processSingleFile(file, formulaData, fileCampanha, extraDiscount);
          zip.file(`processado_${file.name}`, surgicalBuffer);
          allReportItems = [...allReportItems, ...reportItems];
        } catch (e: any) {
          console.error(`Erro processando ${file.name}:`, e);
          return NextResponse.json({ error: `Erro no arquivo ${file.name}: ${e.message}` }, { status: 400 });
        }
      }

      if (allReportItems.length > 0) {
        const reportBuffer = await generateReport(allReportItems);
        zip.file("Relatorio_Gerencial_Campanhas.xlsx", reportBuffer);
      }

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
      
      return new NextResponse(zipBuffer as any, {
        status: 200,
        headers: {
          "Content-Disposition": `attachment; filename="promocoes_processadas.zip"`,
          "Content-Type": "application/zip",
        },
      });
      
    } else {
      try {
        const file = files[0];
        const fileCampanha = file.name.replace(/\.xlsx$/i, '');
        const { reportItems } = await processSingleFile(file, formulaData, fileCampanha, extraDiscount);
        allReportItems = [...allReportItems, ...reportItems];
        
        const reportBuffer = await generateReport(allReportItems);

        return new NextResponse(reportBuffer as any, {
          status: 200,
          headers: {
            "Content-Disposition": `attachment; filename="Relatorio_Gerencial_Campanhas.xlsx"`,
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        });
      } catch (e: any) {
        console.error(`Erro processando ${files[0].name}:`, e);
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
    }

  } catch (error: any) {
    console.error("Erro interno no servidor:", error);
    return NextResponse.json({ error: "Erro interno: " + error.message }, { status: 500 });
  }
}
