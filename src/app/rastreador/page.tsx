/* eslint-disable */
"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2, Calendar, Filter, X, CheckCircle2, XCircle, Info, Tag, Package, Flame, Download, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import curvaAData from "@/data/curva_a.json";

type Historico = {
  id: string;
  mlb: string;
  sku: string;
  campanha: string;
  preco_oferta: number;
  preco_tabela: number;
  status_aprovacao: string;
  data_processamento: string;
  reducao_tarifa: string;
  tipo_anuncio?: string;
};

type Catalogo = {
  mlb: string;
  sku: string;
  tipo_anuncio: string | null;
  preco_atual: number | null;
  comissao_atual: number | null;
  status: string | null;
};

export default function RastreadorMatrizPage() {
  const [data, setData] = useState<Historico[]>([]);
  const [catalogoData, setCatalogoData] = useState<Catalogo[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [onlyCurvaA, setOnlyCurvaA] = useState(false);
  const [onlySemCampanha, setOnlySemCampanha] = useState(false);
  
  // Popover state
  const [selectedCell, setSelectedCell] = useState<Historico | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [histRes, catRes] = await Promise.all([
        supabase.from('historico_promocoes').select('*').order('data_processamento', { ascending: false }),
        supabase.from('catalogo_ml').select('*')
      ]);

      if (histRes.error) console.error("Erro ao buscar histórico:", histRes.error);
      else setData(histRes.data || []);

      if (catRes.error && catRes.error.code !== "PGRST204") {
        console.error("Erro ao buscar catalogo:", catRes.error);
      } else if (catRes.data) {
        setCatalogoData(catRes.data);
      }
      
      setLoading(false);
    }
    fetchData();
  }, []);

  // Unique campaigns for filter
  const allCampaigns = useMemo(() => {
    const campaigns = new Set<string>();
    data.forEach(d => campaigns.add(d.campanha));
    return Array.from(campaigns).sort();
  }, [data]);

  // Unique periods
  const allPeriods = useMemo(() => {
    const periods = new Set<string>();
    data.forEach(d => {
      const parts = d.campanha.split(' | ');
      if (parts.length > 1) periods.add(parts[1]);
    });
    return Array.from(periods).sort();
  }, [data]);

  const togglePeriod = (per: string) => {
    setSelectedPeriods(prev => 
      prev.includes(per) ? prev.filter(p => p !== per) : [...prev, per]
    );
  };

  const toggleCampaign = (camp: string) => {
    setSelectedCampaigns(prev => 
      prev.includes(camp) ? prev.filter(c => c !== camp) : [...prev, camp]
    );
  };

  // Filtered Historico
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchSearch = searchTerm === "" || 
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.mlb.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchCampaign = selectedCampaigns.length === 0 || selectedCampaigns.includes(item.campanha);
      
      const parts = item.campanha.split(' | ');
      const period = parts.length > 1 ? parts[1] : null;
      const matchDate = selectedPeriods.length === 0 || (period && selectedPeriods.includes(period));

      const isCurvaA = curvaAData.skus.includes(item.sku) || curvaAData.mlbs.includes(item.mlb);
      const matchCurvaA = onlyCurvaA ? isCurvaA : true;

      return matchSearch && matchCampaign && matchDate && matchCurvaA;
    });
  }, [data, searchTerm, selectedCampaigns, selectedPeriods, onlyCurvaA]);

  // Pivot Data Grouping (Historico + Catalogo)
  const pivotData = useMemo(() => {
    const activeCampaigns = new Set<string>();
    filteredData.forEach(d => activeCampaigns.add(d.campanha));
    const columns = Array.from(activeCampaigns).sort();

    const skuMap = new Map<string, Map<string, { catalogo: Catalogo | null, campaigns: Record<string, Historico> }>>();

    const getMlbMap = (sku: string, mlb: string) => {
      if (!skuMap.has(sku)) skuMap.set(sku, new Map());
      const mlbMap = skuMap.get(sku)!;
      if (!mlbMap.has(mlb)) mlbMap.set(mlb, { catalogo: null, campaigns: {} });
      return mlbMap.get(mlb)!;
    };

    // Inserir histórico filtrado
    filteredData.forEach(item => {
      const entry = getMlbMap(item.sku, item.mlb);
      if (!entry.campaigns[item.campanha]) {
        entry.campaigns[item.campanha] = item;
      }
    });

    // Inserir catálogo (sujeito à busca textual)
    catalogoData.forEach(item => {
      const matchSearch = searchTerm === "" || 
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.mlb.toLowerCase().includes(searchTerm.toLowerCase());
      
      const isCurvaA = curvaAData.skus.includes(item.sku) || curvaAData.mlbs.includes(item.mlb);
      const matchCurvaA = onlyCurvaA ? isCurvaA : true;

      if (matchSearch && matchCurvaA) {
        const entry = getMlbMap(item.sku, item.mlb);
        entry.catalogo = item;
      }
    });

    // Formatar linhas e aplicar filtro de "Sem Campanha"
    let rows = Array.from(skuMap.entries()).map(([sku, mlbMap]) => {
      let mlbs = Array.from(mlbMap.entries()).map(([mlb, data]) => {
        const tipoAnuncio = data.catalogo?.tipo_anuncio || Object.values(data.campaigns)[0]?.tipo_anuncio || 'N/A';
        return {
          mlb,
          tipoAnuncio,
          precoAtual: data.catalogo?.preco_atual,
          comissaoAtual: data.catalogo?.comissao_atual,
          campaigns: data.campaigns
        };
      });

      if (onlySemCampanha) {
        mlbs = mlbs.filter(m => Object.keys(m.campaigns).length === 0);
      }

      return { sku, mlbs };
    }).filter(row => row.mlbs.length > 0);

    return { columns, rows };
  }, [filteredData, catalogoData, searchTerm, onlyCurvaA, onlySemCampanha]);

  const [exporting, setExporting] = useState(false);

  const exportToExcel = async () => {
    try {
      setExporting(true);
      const res = await fetch('/api/exportar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pivotData)
      });
      
      if (!res.ok) throw new Error('Falha ao exportar');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rastreador_promocoes_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(error);
      alert("Erro ao exportar a planilha");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10 max-w-[1600px] mx-auto px-4 w-full">
      
      <div className="rounded-xl p-6 border border-border bg-card shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col gap-2 w-full">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center">
            Matriz de <span className="text-primary ml-2">Promoções</span>
          </h1>
          <p className="text-muted-foreground text-base font-medium">
            Compare o histórico de campanhas de cada produto lado a lado.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => setOnlyCurvaA(!onlyCurvaA)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-semibold whitespace-nowrap transition-colors ${
              onlyCurvaA 
                ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' 
                : 'bg-card border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <Flame className={`w-4 h-4 ${onlyCurvaA ? 'text-amber-500' : 'text-muted-foreground'}`} />
            Apenas Curva A
          </button>
          
          <button
            onClick={() => setOnlySemCampanha(!onlySemCampanha)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-semibold whitespace-nowrap transition-colors ${
              onlySemCampanha 
                ? 'bg-rose-500/10 border-rose-500/50 text-rose-500' 
                : 'bg-card border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <EyeOff className={`w-4 h-4 ${onlySemCampanha ? 'text-rose-500' : 'text-muted-foreground'}`} />
            Sem Campanha
          </button>
          
          <button
            onClick={exportToExcel}
            disabled={exporting || pivotData.rows.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-foreground font-semibold whitespace-nowrap hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exportar XLS
          </button>
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm rounded-xl overflow-visible z-20">
        <div className="p-5 flex flex-col xl:flex-row gap-4">
          <div className="w-full xl:w-1/3 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Produto (SKU ou MLB)</label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Ex: PROB12345..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground"
              />
            </div>
          </div>
          
          <div className="w-full xl:w-1/3 space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Período de Vigência</label>
            <div className="flex flex-wrap gap-2">
              {allPeriods.length === 0 ? <span className="text-sm text-slate-600 py-2">Nenhum período detectado</span> : null}
              {allPeriods.map(per => (
                <button
                  key={per}
                  onClick={() => togglePeriod(per)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    selectedPeriods.length === 0 || selectedPeriods.includes(per)
                      ? 'bg-amber-500/20 border-amber-500/30 text-amber-500'
                      : 'bg-slate-800/50 border-white/5 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {per}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="w-full xl:w-1/3 space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filtrar Campanhas</label>
            <div className="flex flex-wrap gap-2">
              {allCampaigns.length === 0 ? <span className="text-sm text-slate-600 py-2">Carregando...</span> : null}
              {allCampaigns.map(camp => {
                const title = camp.split(' | ')[0];
                return (
                  <button
                    key={camp}
                    onClick={() => toggleCampaign(camp)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      selectedCampaigns.length === 0 || selectedCampaigns.includes(camp)
                        ? 'bg-primary/20 border-primary/30 text-primary'
                        : 'bg-slate-800/50 border-white/5 text-slate-500 hover:text-slate-300'
                    }`}
                    title={camp}
                  >
                    {title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-border bg-card shadow-sm rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : pivotData.rows.length === 0 ? (
          <div className="text-center py-32 text-muted-foreground">
            Nenhum produto encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent bg-muted/50">
                  <TableHead className="text-foreground font-semibold min-w-[180px] sticky left-0 bg-muted/50 z-10 border-r border-border">SKU</TableHead>
                  <TableHead className="text-foreground font-semibold min-w-[150px] sticky left-[180px] bg-muted/50 z-10 border-r border-border">MLB</TableHead>
                  <TableHead className="text-foreground font-semibold min-w-[120px] text-center border-r border-border">Preço Atual</TableHead>
                  <TableHead className="text-foreground font-semibold min-w-[100px] text-center border-r border-border">Comissão</TableHead>
                  {pivotData.columns.map(camp => {
                    const parts = camp.split(' | ');
                    const title = parts[0];
                    const vigencia = parts.length > 1 ? parts[1] : null;
                    return (
                      <TableHead key={camp} className="text-center min-w-[200px] border-l border-border p-3">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <div className="flex items-center gap-1.5 text-muted-foreground font-medium text-xs">
                            <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate max-w-[180px]" title={title}>{title}</span>
                          </div>
                          {vigencia && (
                            <div className="flex items-center gap-1 text-emerald-500 font-semibold text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              <Calendar className="w-3 h-3 shrink-0" />
                              {vigencia}
                            </div>
                          )}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pivotData.rows.map((skuGroup, skuIdx) => {
                  const isCurvaA = curvaAData.skus.includes(skuGroup.sku);
                  return (
                    <Fragment key={skuIdx}>
                      {skuGroup.mlbs.map((mlbGroup, mlbIdx) => (
                        <TableRow key={`${skuIdx}-${mlbIdx}`} className="border-b border-border hover:bg-muted/30 transition-colors">
                          {mlbIdx === 0 && (
                            <TableCell 
                              rowSpan={skuGroup.mlbs.length} 
                              className="sticky left-0 bg-background z-20 border-r border-b border-border shadow-[2px_0_8px_-4px_rgba(0,0,0,0.1)] align-top pt-4"
                            >
                              <div className="flex flex-col gap-1.5 items-start">
                                <span className="font-semibold text-foreground">{skuGroup.sku}</span>
                                {isCurvaA && (
                                  <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-amber-500/20">
                                    <Flame className="w-3 h-3" /> Curva A
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="sticky left-[180px] bg-background z-10 border-r border-border shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]">
                            <div className="flex flex-col gap-1 items-start">
                              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">{mlbGroup.mlb}</span>
                              {mlbGroup.tipoAnuncio && mlbGroup.tipoAnuncio !== "N/A" && (
                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                  mlbGroup.tipoAnuncio.toLowerCase().includes('premium') 
                                    ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20' 
                                    : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                }`}>
                                  {mlbGroup.tipoAnuncio}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold text-foreground border-r border-border">
                            {mlbGroup.precoAtual ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mlbGroup.precoAtual) : '-'}
                          </TableCell>
                          <TableCell className="text-center font-medium text-muted-foreground border-r border-border">
                            {mlbGroup.comissaoAtual ? `${mlbGroup.comissaoAtual}%` : '-'}
                          </TableCell>
                        
                        {pivotData.columns.map(camp => {
                          const cellData = mlbGroup.campaigns[camp];
                          if (!cellData) {
                            return <TableCell key={camp} className="text-center border-l border-border text-muted-foreground">-</TableCell>;
                          }
                          
                          const isApproved = cellData.status_aprovacao === "Aprovado";
                          
                          return (
                            <TableCell key={camp} className="text-center border-l border-border p-2">
                              <button 
                                onClick={() => setSelectedCell(cellData)}
                                className={`w-full py-2.5 px-3 rounded-lg border transition-all hover:scale-[1.02] flex flex-col items-center justify-center gap-1 shadow-sm ${
                                  isApproved 
                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-500/40' 
                                    : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 hover:border-red-300 dark:hover:border-red-500/40'
                                }`}
                              >
                                <span className={`text-sm font-bold ${isApproved ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cellData.preco_oferta)}
                                </span>
                                <div className="flex items-center gap-1 opacity-80">
                                  {isApproved ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Ver Info</span>
                                </div>
                              </button>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </Fragment>
                );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Detail Modal / Popover */}
      {selectedCell && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedCell(null)}>
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 bg-muted/30 border-b border-border flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-1">Detalhes da Oferta</h3>
                <p className="text-sm text-muted-foreground font-mono">{selectedCell.sku} • {selectedCell.mlb}</p>
              </div>
              <button onClick={() => setSelectedCell(null)} className="p-2 bg-background rounded-full hover:bg-muted text-muted-foreground transition-colors border border-border">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-background border border-border">
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Preço Ofertado</p>
                  <p className="text-xl font-bold text-primary">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedCell.preco_oferta)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-background border border-border">
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Preço Tabela</p>
                  <p className="text-xl font-bold text-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedCell.preco_tabela)}
                  </p>
                  {selectedCell.reducao_tarifa && selectedCell.reducao_tarifa !== "Não" && selectedCell.reducao_tarifa !== "0" && (
                    <div className="mt-2 pt-2 border-t border-border flex flex-col gap-0.5">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">Piso Aceitável (-5%)</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedCell.preco_tabela * 0.95)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-background border border-border">
                  <span className="text-sm text-muted-foreground">Status da Aprovação</span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                    selectedCell.status_aprovacao === 'Aprovado' 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                      : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                  }`}>
                    {selectedCell.status_aprovacao}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 rounded-lg bg-background border border-border">
                  <span className="text-sm text-muted-foreground">Campanha</span>
                  <span className="text-sm font-semibold text-foreground">{selectedCell.campanha}</span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-background border border-border">
                  <span className="text-sm text-muted-foreground">Data de Leitura</span>
                  <span className="text-sm font-semibold text-foreground">
                    {new Date(selectedCell.data_processamento).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-semibold">Rebate / Redução de Tarifa</span>
                  </div>
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                    {(() => {
                      const val = selectedCell.reducao_tarifa;
                      if (!val || val === "Não" || val === "0") return "Não";
                      if (val.includes('%')) return val;
                      const num = parseFloat(val.replace(',', '.'));
                      if (!isNaN(num)) {
                        if (num < 1) return `${Math.round(num * 100)}%`;
                        const preco = selectedCell.preco_oferta;
                        if (preco && preco > 0) {
                          return `${Math.round((num / preco) * 100)}%`;
                        }
                        return `R$ ${num.toFixed(2).replace('.', ',')}`;
                      }
                      return val;
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
