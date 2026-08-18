"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings, Trash2, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ConfiguracoesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWipeData = async () => {
    setIsDeleting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/historico/limpar', {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Erro desconhecido ao limpar banco de dados");

      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000); // Hide success message after 5 seconds
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-10 max-w-5xl mx-auto px-4 w-full">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-8 border border-white/10 bg-white/[0.02] backdrop-blur-3xl shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <Settings className="w-48 h-48 text-white" />
        </div>
        <div className="relative z-10 flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center">
            Configurações <span className="text-primary ml-2">do Sistema</span>
          </h1>
          <p className="text-slate-400 text-lg font-light max-w-2xl">
            Gerencie as preferências globais e a integridade da base de dados do motor de promoções.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* Danger Zone Card */}
        <Card className="border-red-500/20 bg-red-950/10 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50"></div>
          <CardHeader className="border-b border-red-500/10 pb-4 bg-red-500/[0.02]">
            <CardTitle className="text-xl font-bold text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Zona de Perigo
            </CardTitle>
            <CardDescription className="text-slate-400 text-base">
              Ações destrutivas que afetam permanentemente o banco de dados.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <h3 className="text-lg font-bold text-slate-200 mb-1">Apagar Todo o Histórico</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Esta ação irá <strong className="text-red-400">excluir permanentemente</strong> todas as planilhas processadas, SKUs, campanhas e todo o histórico de aprovações/reprovações do Supabase. Use isto para limpar testes antigos antes de ir para produção.
              </p>
            </div>
            
            <Button 
              onClick={() => setIsModalOpen(true)}
              variant="destructive" 
              className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 px-6 py-6 rounded-xl transition-all shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)]"
            >
              <Trash2 className="w-5 h-5 mr-2" />
              Zerar Banco de Dados
            </Button>
          </CardContent>
        </Card>

        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 animate-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 font-medium">Histórico excluído com sucesso! O banco de dados está limpo.</span>
          </div>
        )}

      </div>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0d1424] border border-red-500/30 rounded-3xl shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-400"></div>
            
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              
              <h3 className="text-2xl font-bold text-white">Você tem certeza absoluta?</h3>
              <p className="text-slate-400 text-sm">
                Isso apagará dezenas ou centenas de registros do banco de dados instantaneamente. Esta ação <strong>não pode ser desfeita</strong>.
              </p>
              
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-left">
                  <strong>Erro:</strong> {error}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/5 bg-white/[0.02] flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 border-white/10 text-slate-300 hover:bg-white/5"
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleWipeData}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                {isDeleting ? "Apagando..." : "Sim, Excluir Tudo"}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
