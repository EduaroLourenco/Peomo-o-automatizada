/* eslint-disable */
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { supabase } from '@/lib/supabase';

// Helper: Extrair texto limpo da célula
function extractText(val: any): string {
  if (val === null || val === undefined) return "";
  if (typeof val === 'string') return val;
  if (val.text) return String(val.text);
  if (val.richText) return val.richText.map((rt: any) => rt.text).join("");
  return String(val);
}

// Helper: Extrair número da célula, mesmo de fórmulas
function extractNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  if (val.result !== undefined) return Number(val.result);
  
  const text = extractText(val).replace(',', '.');
  const num = parseFloat(text);
  return isNaN(num) ? null : num;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const fileAnuncios = formData.get('fileAnuncios') as File | null;
    const filePrecos = formData.get('filePrecos') as File | null;

    if (!fileAnuncios && !filePrecos) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const catalogoMap = new Map<string, any>(); // mlb -> dados

    // Processar Planilha de Anúncios ML
    if (fileAnuncios) {
      const bufferAnuncios = Buffer.from(await fileAnuncios.arrayBuffer());
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(bufferAnuncios);
      const ws = wb.getWorksheet('Anúncios');

      if (ws) {
        // Encontrar o cabeçalho (geralmente linha 3 na aba "Anúncios")
        let headerRowIndex = -1;
        for (let i = 1; i <= 10; i++) {
          const rowValues = ws.getRow(i).values as any[];
          if (rowValues && rowValues.some(v => extractText(v).toLowerCase().includes("código do anúncio"))) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex !== -1) {
          const headerRow = ws.getRow(headerRowIndex).values as any[];
          const findCol = (terms: string[]) => headerRow.findIndex(v => {
            const s = extractText(v).toLowerCase().trim();
            return terms.some(t => s === t || s.includes(t));
          });

          const mlbCol = findCol(["código do anúncio", "item_id"]);
          const skuCol = findCol(["sku"]);
          const tipoCol = findCol(["tipo de anúncio", "listing_type"]);
          const statusCol = findCol(["estado", "status"]);

          if (mlbCol !== -1 && skuCol !== -1) {
            for (let i = headerRowIndex + 1; i <= ws.rowCount; i++) {
              const row = ws.getRow(i);
              const mlb = extractText(row.getCell(mlbCol).value).trim();
              if (!/^MLB\d+$/i.test(mlb)) continue;

              catalogoMap.set(mlb, {
                mlb,
                sku: extractText(row.getCell(skuCol).value).trim(),
                tipo_anuncio: tipoCol !== -1 ? extractText(row.getCell(tipoCol).value).trim() : null,
                status: statusCol !== -1 ? extractText(row.getCell(statusCol).value).trim() : 'Ativo'
              });
            }
          }
        }
      }
    }

    // Processar Planilha de Preço Ideal
    if (filePrecos) {
      const bufferPrecos = Buffer.from(await filePrecos.arrayBuffer());
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(bufferPrecos);
      const ws = wb.worksheets[0];

      let headerRowIndex = -1;
      for (let i = 1; i <= 5; i++) {
        const rowValues = ws.getRow(i).values as any[];
        if (rowValues && rowValues.some(v => extractText(v).toLowerCase().includes("código do anúncio"))) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex !== -1) {
        const headerRow = ws.getRow(headerRowIndex).values as any[];
        const findCol = (terms: string[]) => headerRow.findIndex(v => {
          const s = extractText(v).toLowerCase().trim();
          return terms.some(t => s === t || s.includes(t));
        });

        const mlbCol = findCol(["código do anúncio"]);
        const precoCol = findCol(["preço atual"]);
        const comissaoCol = findCol(["comissão negociada"]);

        if (mlbCol !== -1) {
          for (let i = headerRowIndex + 1; i <= ws.rowCount; i++) {
            const row = ws.getRow(i);
            const mlb = extractText(row.getCell(mlbCol).value).trim();
            if (!/^MLB\d+$/i.test(mlb)) continue;

            const precoAtual = precoCol !== -1 ? extractNumber(row.getCell(precoCol).value) : null;
            let comissaoAtual = comissaoCol !== -1 ? extractNumber(row.getCell(comissaoCol).value) : null;
            
            // Se for decimal menor que 1 (ex: 0.0946), converte pra porcentagem 9.46
            if (comissaoAtual !== null && comissaoAtual < 1 && comissaoAtual > 0) {
              comissaoAtual = parseFloat((comissaoAtual * 100).toFixed(2));
            }

            const existing = catalogoMap.get(mlb) || { mlb };
            if (precoAtual !== null) existing.preco_atual = precoAtual;
            if (comissaoAtual !== null) existing.comissao_atual = comissaoAtual;
            catalogoMap.set(mlb, existing);
          }
        }
      }
    }

    // Upsert no Supabase
    const entries = Array.from(catalogoMap.values());
    if (entries.length > 0) {
      // Upsert precisa que a constraint pk exista. 'mlb' será a PK.
      const { error } = await supabase.from('catalogo_ml').upsert(entries, { onConflict: 'mlb' });
      if (error) {
        console.error("Erro no upsert:", error);
        return NextResponse.json({ error: "Erro ao salvar no banco: " + error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, count: entries.length });
  } catch (error: any) {
    console.error("Erro no processamento do catálogo:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
