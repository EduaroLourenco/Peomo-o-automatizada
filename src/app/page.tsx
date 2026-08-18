"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, History, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col gap-10 animate-fade-in pb-10 max-w-7xl mx-auto px-4 w-full">
      <div className="relative overflow-hidden rounded-3xl p-8 md:p-14 mt-4 text-center border border-white/10 shadow-2xl bg-white/[0.02] backdrop-blur-3xl">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
          <Sparkles className="w-64 h-64 text-white animate-pulse" />
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 px-4 py-1.5 text-sm font-semibold transition-colors bg-primary/10 text-primary mb-8">
            <Sparkles className="w-4 h-4" /> Novo Sistema Probel Inteligente
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl leading-tight">
            Gestão Autônoma de <br className="hidden md:block"/> <span className="text-primary">Promoções</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mt-6 max-w-2xl font-light">
            Automatize o processamento de planilhas do Mercado Livre. O Motor de Inteligência aplica suas regras de negócio em milissegundos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-10">
            <Link href="/processar">
              <Button size="lg" className="rounded-xl shadow-[0_4px_14px_0_rgba(14,165,233,0.39)] hover:shadow-[0_6px_20px_rgba(14,165,233,0.23)] bg-primary text-primary-foreground hover-lift gap-2 font-semibold transition-all h-14 px-8 text-base">
                Começar agora <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/historico">
              <Button size="lg" variant="outline" className="rounded-full bg-white/50 dark:bg-black/50 backdrop-blur-sm hover-lift font-semibold">
                Ver Histórico
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-panel hover-lift border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-xl mb-2">Processamento Expresso</CardTitle>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Faça upload das planilhas com ou sem redução de tarifas. O sistema calculará comissões e margens automaticamente.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel hover-lift border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-xl mb-2">Conectado à Base</CardTitle>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Integração direta com sua planilha no Google Drive. Os preços são consultados em tempo real na hora de aprovar os produtos.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel hover-lift border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
              <History className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-xl mb-2">Controle Total</CardTitle>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Histórico detalhado salvando SKUs, MLBs e preços de todas as promoções que o produto participou.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
