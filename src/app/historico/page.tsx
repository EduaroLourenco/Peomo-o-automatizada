"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Loader2, Search, Filter, TrendingUp, CheckCircle2, XCircle, PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";

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
};

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

export default function HistoricoPage() {
  const [data, setData] = useState<Historico[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  useEffect(() => {
    async function fetchData() {
      const { data: historico, error } = await supabase
        .from('historico_promocoes')
        .select('*')
        .order('data_processamento', { ascending: false });

      if (error) {
        console.error("Erro ao buscar histórico:", error);
      } else {
        setData(historico || []);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  // Filtered Data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = item.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.mlb.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "Todos" || 
                            (statusFilter === "Aprovado" ? item.status_aprovacao === "Aprovado" : item.status_aprovacao !== "Aprovado");
      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, statusFilter]);

  // KPIs
  const totalItems = data.length;
  const approvedItems = data.filter(d => d.status_aprovacao === "Aprovado").length;
  const rejectedItems = totalItems - approvedItems;
  const approvalRate = totalItems > 0 ? ((approvedItems / totalItems) * 100).toFixed(1) : "0.0";

  // Chart Data: Status Pie
  const statusData = [
    { name: 'Aprovados', value: approvedItems },
    { name: 'Reprovados', value: rejectedItems }
  ];

  // Chart Data: Bar Chart (Items by Day)
  const barData = useMemo(() => {
    const map = new Map<string, { date: string, Aprovados: number, Reprovados: number }>();
    
    // Process backwards to keep chronological order if sorted desc
    [...data].reverse().forEach(d => {
      const dateStr = new Date(d.data_processamento).toLocaleDateString('pt-BR');
      if (!map.has(dateStr)) {
        map.set(dateStr, { date: dateStr, Aprovados: 0, Reprovados: 0 });
      }
      const entry = map.get(dateStr)!;
      if (d.status_aprovacao === "Aprovado") entry.Aprovados += 1;
      else entry.Reprovados += 1;
    });
    
    return Array.from(map.values()).slice(-10); // Last 10 days
  }, [data]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10 max-w-7xl mx-auto px-4 w-full">
      
      {/* Header Banner */}
      <div className="rounded-xl p-6 border border-border bg-card shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col gap-2 w-full">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center">
            Histórico de <span className="text-primary ml-2">Análises</span>
          </h1>
          <p className="text-muted-foreground text-base font-medium">
            Registro de todas as aprovações e reprovações do motor.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-32">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-32 text-slate-500 border border-white/5 rounded-3xl bg-white/[0.02]">
          Nenhum dado encontrado no histórico ainda.
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl rounded-2xl">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-medium">Anúncios Analisados</p>
                  <h3 className="text-3xl font-black text-white">{totalItems}</h3>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl rounded-2xl">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-medium">Taxa de Aprovação</p>
                  <h3 className="text-3xl font-black text-white">{approvalRate}%</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl rounded-2xl">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                  <XCircle className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-medium">Anúncios Reprovados</p>
                  <h3 className="text-3xl font-black text-white">{rejectedItems}</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pie Chart */}
            <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl rounded-2xl col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-primary" /> Distribuição Geral
                </CardTitle>
              </CardHeader>
              <CardContent className="h-64 flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0B1120', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl rounded-2xl col-span-1 lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" /> Volume Processado (Últimos 10 Dias)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <XAxis dataKey="date" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: '#0B1120', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="Aprovados" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="Reprovados" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Table with Filters */}
          <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Buscar por SKU ou MLB..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-slate-500" />
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-48 bg-slate-900/50 border border-white/10 rounded-xl py-2 px-4 text-sm text-slate-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer appearance-none"
                >
                  <option value="Todos">Todos os Status</option>
                  <option value="Aprovado">Apenas Aprovados</option>
                  <option value="Reprovado">Apenas Reprovados</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/5 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-medium h-12">Data</TableHead>
                    <TableHead className="text-slate-400 font-medium">Campanha</TableHead>
                    <TableHead className="text-slate-400 font-medium">MLB</TableHead>
                    <TableHead className="text-slate-400 font-medium">SKU</TableHead>
                    <TableHead className="text-slate-400 font-medium text-right">Preço Ofertado</TableHead>
                    <TableHead className="text-slate-400 font-medium text-right">Tabela Probel</TableHead>
                    <TableHead className="text-slate-400 font-medium text-center">Status Final</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow className="hover:bg-transparent border-0">
                      <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                        Nenhum resultado encontrado para os filtros atuais.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((row) => (
                      <TableRow key={row.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <TableCell className="text-slate-300 py-3">{new Date(row.data_processamento).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                        <TableCell className="text-slate-300 font-medium">{row.campanha}</TableCell>
                        <TableCell className="text-slate-400 text-xs font-mono bg-black/20 px-2 py-1 rounded inline-block mt-2">{row.mlb}</TableCell>
                        <TableCell className="text-slate-200 font-medium">{row.sku}</TableCell>
                        <TableCell className="text-slate-200 text-right font-medium">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.preco_oferta)}
                        </TableCell>
                        <TableCell className="text-slate-400 text-right font-medium">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.preco_tabela)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                            row.status_aprovacao === 'Aprovado' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {row.status_aprovacao === 'Aprovado' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                            {row.status_aprovacao === 'Aprovado' ? 'Aprovado' : 'Reprovado'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="p-4 border-t border-white/5 bg-black/20 text-center text-xs text-slate-500">
              Mostrando {filteredData.length} de {data.length} registros no total.
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
