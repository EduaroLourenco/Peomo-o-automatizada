"use client";

import { useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, Loader2, FileArchive, FileX, Sparkles, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ProcessarPromocoesPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputFormat, setOutputFormat] = useState<"zip" | "xlsx">("zip");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (files.length === 0) {
      toast.error("Por favor, selecione ao menos um arquivo.");
      return;
    }

    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      files.forEach(file => formData.append("file", file));
      formData.append("format", outputFormat);

      const response = await fetch("/api/processar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Erro no servidor ao processar");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      if (outputFormat === "zip" && files.length > 1) {
        a.download = `promocoes_processadas.zip`;
      } else {
        a.download = `processado_${files[0].name}`;
      }
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success("Planilhas processadas com sucesso!");
      setFiles([]); 
    } catch (error: any) {
      toast.error(error.message || "Ocorreu um erro ao processar as planilhas.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-10 max-w-7xl mx-auto px-4 w-full">
      
      {/* Header Banner - Sleek AI Style */}
      <div className="rounded-xl p-6 border border-border bg-card shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col gap-2 w-full">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center">
            Processar <span className="text-primary ml-2">Promoções</span>
          </h1>
          <p className="text-muted-foreground text-base font-medium">
            Suba as planilhas do Mercado Livre e deixe o motor calcular a margem de segurança.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upload */}
        <div className="flex flex-col gap-8">
          <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-white/5 pb-6">
              <CardTitle className="flex items-center text-2xl font-bold text-white">
                <Upload className="mr-3 h-6 w-6 text-primary" /> Entrada de Dados
              </CardTitle>
              <CardDescription className="text-base text-slate-400">
                Selecione ou arraste múltiplas planilhas (.xlsx)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="grid w-full items-center gap-4">
                <label 
                  htmlFor="file-upload" 
                  className="group flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-2xl cursor-pointer border-white/10 bg-white/[0.01] transition-all duration-300 hover:bg-white/[0.03] hover:border-primary/50"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                    <div className="p-4 rounded-2xl bg-white/[0.03] text-primary mb-4 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300 border border-white/5">
                      <FileSpreadsheet className="w-8 h-8" />
                    </div>
                    <p className="mb-2 text-lg text-slate-300 font-medium">
                      <span className="text-primary">Clique</span> ou arraste os arquivos aqui
                    </p>
                    <p className="text-sm text-slate-500">Suporta múltiplos arquivos .xlsx</p>
                  </div>
                  <input 
                    id="file-upload" 
                    type="file" 
                    className="hidden" 
                    accept=".xlsx"
                    multiple
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              
              {files.length > 0 && (
                <div className="mt-8 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Arquivos na Fila ({files.length})</h3>
                  <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                    {files.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-slate-300 group transition-colors hover:bg-white/[0.04]">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileSpreadsheet className="h-5 w-5 text-primary opacity-80 shrink-0" />
                          <span className="truncate text-sm font-medium">{f.name}</span>
                        </div>
                        <button onClick={() => removeFile(idx)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                          <FileX className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Options & Submit */}
        <div className="flex flex-col gap-8">
          
          <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-white/5 pb-6">
              <CardTitle className="text-xl font-bold text-white">Configurações de Saída</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <p className="text-sm font-medium text-slate-400">Formato de Retorno</p>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setOutputFormat("zip")}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 ${outputFormat === 'zip' ? 'border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(14,165,233,0.15)]' : 'border-white/5 bg-white/[0.02] text-slate-500 hover:bg-white/[0.04]'}`}
                  >
                    <FileArchive className="w-6 h-6 mb-3" />
                    <span className="text-sm font-medium">Arquivo .ZIP</span>
                  </button>
                  <button 
                    onClick={() => setOutputFormat("xlsx")}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 ${outputFormat === 'xlsx' ? 'border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(14,165,233,0.15)]' : 'border-white/5 bg-white/[0.02] text-slate-500 hover:bg-white/[0.04]'}`}
                  >
                    <FileSpreadsheet className="w-6 h-6 mb-3" />
                    <span className="text-sm font-medium">Excel Único</span>
                  </button>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed mt-2">
                  {outputFormat === 'zip' 
                    ? "Ideal para múltiplas planilhas. Baixa um pacote compactado fácil de extrair." 
                    : "Junta todas as planilhas processadas em um só arquivo excel."}
                </p>
              </div>
            </CardContent>
            <CardFooter className="pt-2 pb-8 px-6">
              <Button 
                size="lg"
                className="w-full text-base h-14 rounded-xl font-semibold transition-all hover:scale-[1.02] bg-primary text-primary-foreground shadow-[0_4px_14px_0_rgba(14,165,233,0.39)] hover:shadow-[0_6px_20px_rgba(14,165,233,0.23)]" 
                disabled={files.length === 0 || isProcessing}
                onClick={handleProcess}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Iniciar Processamento"
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/20">
                <Database className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-semibold text-emerald-100 text-sm">Conexões Ativas</h4>
                <p className="text-xs text-emerald-500/80 mt-0.5">Google Sheets & Supabase</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
