/* eslint-disable */
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, CheckCircle2, Loader2, FileSpreadsheet, AlertCircle } from "lucide-react";

export default function CatalogoPage() {
  const [fileAnuncios, setFileAnuncios] = useState<File | null>(null);
  const [filePrecos, setFilePrecos] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{count: number} | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!fileAnuncios && !filePrecos) {
      setError("Selecione pelo menos uma planilha para enviar.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    if (fileAnuncios) formData.append("fileAnuncios", fileAnuncios);
    if (filePrecos) formData.append("filePrecos", filePrecos);

    try {
      const res = await fetch("/api/catalogo/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha ao enviar catálogo.");
      }

      setSuccess({ count: data.count });
      setFileAnuncios(null);
      setFilePrecos(null);
      
      // Reset inputs visually
      const inputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
      inputs.forEach(input => input.value = "");
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10 max-w-[1000px] mx-auto px-4 w-full">
      <div className="rounded-xl p-6 border border-border bg-card shadow-sm flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center">
          Atualizar <span className="text-primary ml-2">Catálogo ML</span>
        </h1>
        <p className="text-muted-foreground text-base font-medium">
          Envie a planilha de anúncios do Mercado Livre e a planilha de Preço Ideal para analisar todos os seus produtos no Rastreador.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upload Anúncios */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="text-blue-500 w-5 h-5" />
              Planilha de Anúncios ML
            </CardTitle>
            <CardDescription>
              A planilha exportada diretamente do Mercado Livre (ex: Anuncios-202X...).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground font-semibold">
                  {fileAnuncios ? fileAnuncios.name : "Clique para selecionar ou arraste"}
                </p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept=".xlsx, .xls"
                onChange={(e) => setFileAnuncios(e.target.files?.[0] || null)}
              />
            </label>
          </CardContent>
        </Card>

        {/* Upload Preços */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="text-amber-500 w-5 h-5" />
              Planilha de Preço Ideal
            </CardTitle>
            <CardDescription>
              O relatório do seu sistema com as comissões negociadas (ex: ReportIdealSalePrice...).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground font-semibold">
                  {filePrecos ? filePrecos.name : "Clique para selecionar ou arraste"}
                </p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept=".xlsx, .xls"
                onChange={(e) => setFilePrecos(e.target.files?.[0] || null)}
              />
            </label>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold">Catálogo atualizado com sucesso!</p>
            <p className="text-xs mt-1">{success.count} produtos registrados ou atualizados. Você já pode visualizar os dados cruzados na aba Rastreador.</p>
          </div>
        </div>
      )}

      <div className="flex justify-end mt-2">
        <Button 
          size="lg" 
          onClick={handleUpload} 
          disabled={loading || (!fileAnuncios && !filePrecos)}
          className="w-full md:w-auto text-base px-8 h-12 shadow-md hover:shadow-lg transition-all font-bold gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
          {loading ? "Processando e Salvando..." : "Atualizar Base de Dados"}
        </Button>
      </div>
    </div>
  );
}
