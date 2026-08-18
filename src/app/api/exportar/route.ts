import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { columns, rows } = body;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rastreador');

    // Create header row
    const headers = ['SKU', 'MLB', ...columns];
    const headerRow = worksheet.addRow(headers);
    
    // Style headers
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data
    for (const skuGroup of rows) {
      for (const mlbGroup of skuGroup.mlbs) {
        const rowData: any[] = [skuGroup.sku, mlbGroup.mlb];
        
        for (const camp of columns) {
          const cellData = mlbGroup.campaigns[camp];
          if (!cellData) {
            rowData.push('-');
          } else {
            // Export the price and status
            const status = cellData.status_aprovacao === 'Aprovado' ? '✅ Aprovado' : '❌ Reprovado';
            rowData.push(`R$ ${cellData.preco_oferta.toFixed(2)} - ${status}`);
          }
        }
        
        const newRow = worksheet.addRow(rowData);
        
        newRow.eachCell((cell, colNumber) => {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (colNumber > 2 && cell.value !== '-') {
            // Se o texto contém Aprovado, pintar de verde suave
            if (String(cell.value).includes('Aprovado')) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } };
            } else {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE8E6' } };
            }
          }
        });
      }
    }

    // Auto-fit columns
    worksheet.columns.forEach((column, index) => {
      column.width = index < 2 ? 20 : 35;
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=rastreador_promocoes.xlsx',
      },
    });
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    return NextResponse.json({ error: "Falha ao exportar excel" }, { status: 500 });
  }
}
