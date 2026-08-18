import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function DELETE(req: NextRequest) {
  try {
    // Delete all records by matching all IDs that are not null
    const { error } = await supabase
      .from('historico_promocoes')
      .delete()
      .not('id', 'is', null);

    if (error) {
      console.error("Erro ao limpar banco:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Banco de dados zerado com sucesso" });
  } catch (error) {
    console.error("Erro interno:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
