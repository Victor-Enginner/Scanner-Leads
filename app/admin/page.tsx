"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  ShieldAlert, 
  Loader2, 
  Radar, 
  Users, 
  DollarSign, 
  MapPin, 
  Target, 
  RefreshCw, 
  Trash2, 
  Play, 
  Activity,
  ArrowLeft,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface MetricStats {
  totalUsers: number;
  totalScans: number;
  totalLeads: number;
  totalRevenue: number;
}

interface RankedItem {
  name: string;
  count: number;
}

interface RecentPayment {
  id: string;
  amount: number;
  createdAt: string;
  userEmail: string;
}

interface QueueScan {
  id: string;
  city: string;
  niche: string;
  status: "pending" | "processing" | "completed" | "failed";
  totalLeadsFound: number;
  highPriorityCount: number;
  createdAt: string;
  userEmail: string;
  userName: string;
}

function AdminContent() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"metrics" | "queue">("metrics");
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [queueLoading, setQueueLoading] = useState(true);
  
  // States for API data
  const [metrics, setMetrics] = useState<MetricStats | null>(null);
  const [topCities, setTopCities] = useState<RankedItem[]>([]);
  const [topNiches, setTopNiches] = useState<RankedItem[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [scansQueue, setScansQueue] = useState<QueueScan[]>([]);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Fetch metrics data
  const fetchMetrics = async () => {
    setMetricsLoading(true);
    try {
      const response = await fetch("/api/admin/metrics");
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
        setTopCities(data.topCities || []);
        setTopNiches(data.topNiches || []);
        setRecentPayments(data.recentPayments || []);
      } else {
        toast.error("Erro ao carregar métricas operacionais.");
      }
    } catch (err) {
      console.error("[AdminPage] Metrics fetch failed", err);
    } finally {
      setMetricsLoading(false);
    }
  };

  // Fetch scans queue data
  const fetchQueue = async () => {
    setQueueLoading(true);
    try {
      const response = await fetch("/api/admin/scans");
      if (response.ok) {
        const data = await response.json();
        setScansQueue(data);
      } else {
        toast.error("Erro ao carregar fila de varreduras.");
      }
    } catch (err) {
      console.error("[AdminPage] Queue fetch failed", err);
    } finally {
      setQueueLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === "authenticated" && session?.user?.role === "admin") {
      fetchMetrics();
      fetchQueue();
    }
  }, [authStatus, session]);

  // Execute scan actions (delete / reset)
  const handleScanAction = async (scanId: string, action: "delete" | "reset") => {
    setActionInProgress(scanId);
    try {
      const response = await fetch("/api/admin/scans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scanId, action }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Ação concluída com sucesso.");
        // Refresh both tables to update status
        fetchMetrics();
        fetchQueue();
      } else {
        toast.error(data.error || "Falha ao executar ação.");
      }
    } catch (err) {
      console.error("[AdminPage] Action crashed", err);
      toast.error("Erro ao conectar com servidor.");
    } finally {
      setActionInProgress(null);
    }
  };

  // 1. Loading State
  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-[#04070a] flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-3 text-xs text-primary">
          <Loader2 className="size-8 animate-spin" />
          <span>AUTENTICANDO OPERADOR DE SEGURANÇA...</span>
        </div>
      </div>
    );
  }

  // 2. Access Denied State (Not logged in or Role != admin)
  const isAdmin = session?.user && session.user.role === "admin";
  if (!isAdmin) {
    return (
      <main className="min-h-screen w-full flex flex-col justify-center items-center px-4 bg-[#04070a] font-mono text-slate-300">
        <div className="w-full max-w-[400px] border border-red-500 glow-red bg-black/60 p-6 rounded-lg text-center space-y-5">
          <ShieldAlert className="size-12 text-red-500 mx-auto animate-pulse" />
          <div className="space-y-1">
            <h1 className="text-sm font-bold uppercase text-red-500 tracking-wider">Acesso Negado [Erro 403]</h1>
            <p className="text-[10px] text-slate-500 uppercase leading-relaxed font-sans pt-1">
              Esta área do sistema é de acesso restrito a administradores. Suas credenciais não possuem o nível de autorização necessário.
            </p>
          </div>
          <Button onClick={() => router.push("/dashboard")} className="w-full text-[10px]">
            RETORNAR AO DASHBOARD
          </Button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#04070a] font-mono flex flex-col text-slate-300">
      {/* Top Header Navigation */}
      <header className="border-b border-red-950 bg-[#070c14] py-4 px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-red-500 tracking-widest uppercase flex items-center gap-1.5">
            <ShieldAlert className="size-4 animate-pulse text-red-500" /> 
            NEXUS SCAN // CONSOLE ADMINISTRATIVO
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <Button 
            onClick={() => router.push("/dashboard")}
            variant="ghost" 
            size="xs" 
            className="h-7 text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-800"
          >
            <ArrowLeft className="size-3.5 mr-1" /> Painel Geral
          </Button>
        </div>
      </header>

      {/* Admin Panel split grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Sidebar Panel */}
        <aside className="space-y-4">
          <Card className="border-red-950/40 bg-[#070c14]/40">
            <CardHeader className="py-4 border-b border-red-950/20">
              <CardTitle className="text-xs text-slate-500 uppercase tracking-wider">Módulos de Controle</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-1">
              <Button
                onClick={() => setActiveTab("metrics")}
                variant={activeTab === "metrics" ? "default" : "ghost"}
                className="w-full justify-start text-xs font-semibold py-4 hover:bg-red-950/10 hover:text-red-400"
              >
                <Activity className="size-4 mr-2" /> Métricas & Finanças
              </Button>
              <Button
                onClick={() => setActiveTab("queue")}
                variant={activeTab === "queue" ? "default" : "ghost"}
                className="w-full justify-start text-xs font-semibold py-4 hover:bg-red-950/10 hover:text-red-400"
              >
                <Radar className="size-4 mr-2" /> Fila de Varreduras
              </Button>
            </CardContent>
          </Card>
        </aside>

        {/* Content Modules */}
        <main className="md:col-span-3 space-y-6">
          
          {/* ================= TAB 1: METRICS & FINANCE ================= */}
          {activeTab === "metrics" && (
            <div className="space-y-6">
              {/* Stats Counters Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-red-950/20 bg-[#070c14]/25">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-[9px] uppercase text-slate-500 flex items-center gap-1 font-bold">
                      <DollarSign className="size-3 text-red-500" /> Faturamento Total
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <span className="text-xl font-bold text-foreground font-mono">
                      {metricsLoading ? "..." : `R$ ${metrics?.totalRevenue},00`}
                    </span>
                  </CardContent>
                </Card>

                <Card className="border-red-950/20 bg-[#070c14]/25">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-[9px] uppercase text-slate-500 flex items-center gap-1 font-bold">
                      <Radar className="size-3 text-red-500" /> Varreduras Totais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <span className="text-xl font-bold text-foreground font-mono">
                      {metricsLoading ? "..." : metrics?.totalScans}
                    </span>
                  </CardContent>
                </Card>

                <Card className="border-red-950/20 bg-[#070c14]/25">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-[9px] uppercase text-slate-500 flex items-center gap-1 font-bold">
                      <Users className="size-3 text-red-500" /> Usuários Ativos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <span className="text-xl font-bold text-foreground font-mono">
                      {metricsLoading ? "..." : metrics?.totalUsers}
                    </span>
                  </CardContent>
                </Card>

                <Card className="border-red-950/20 bg-[#070c14]/25">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-[9px] uppercase text-slate-500 flex items-center gap-1 font-bold">
                      <Database className="size-3 text-red-500" /> Leads Mapeados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <span className="text-xl font-bold text-foreground font-mono">
                      {metricsLoading ? "..." : metrics?.totalLeads}
                    </span>
                  </CardContent>
                </Card>
              </div>

              {/* Cache Breakdowns & Rankings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cities Cache Ranking */}
                <Card className="border-red-950/20 bg-[#070c14]/25">
                  <CardHeader className="py-4 border-b border-red-950/10">
                    <CardTitle className="text-[10px] uppercase text-red-500 flex items-center gap-1 font-bold">
                      <MapPin className="size-3.5" /> Top 5 Cidades Mapeadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-xs">
                    {metricsLoading ? (
                      <Loader2 className="size-4 animate-spin text-red-500 mx-auto my-4" />
                    ) : topCities.length === 0 ? (
                      <div className="text-center text-slate-500 py-4 uppercase text-[10px]">Sem dados disponíveis</div>
                    ) : (
                      topCities.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b border-red-950/10 pb-2">
                          <span className="font-semibold text-slate-300 truncate max-w-[200px]">{item.name}</span>
                          <span className="text-red-500 font-bold font-mono">{item.count} varreduras</span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Niches Cache Ranking */}
                <Card className="border-red-950/20 bg-[#070c14]/25">
                  <CardHeader className="py-4 border-b border-red-950/10">
                    <CardTitle className="text-[10px] uppercase text-red-500 flex items-center gap-1 font-bold">
                      <Target className="size-3.5" /> Top 5 Nichos Varridos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-xs">
                    {metricsLoading ? (
                      <Loader2 className="size-4 animate-spin text-red-500 mx-auto my-4" />
                    ) : topNiches.length === 0 ? (
                      <div className="text-center text-slate-500 py-4 uppercase text-[10px]">Sem dados disponíveis</div>
                    ) : (
                      topNiches.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b border-red-950/10 pb-2">
                          <span className="font-semibold text-slate-300 truncate max-w-[200px]">{item.name}</span>
                          <span className="text-red-500 font-bold font-mono">{item.count} varreduras</span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Payments Log */}
              <Card className="border-red-950/20 bg-[#070c14]/25">
                <CardHeader className="py-4 border-b border-red-950/10">
                  <CardTitle className="text-[10px] uppercase text-red-500 font-bold">Log de Transações Recentes</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {metricsLoading ? (
                    <Loader2 className="size-5 animate-spin text-red-500 mx-auto my-4" />
                  ) : recentPayments.length === 0 ? (
                    <div className="text-center text-slate-500 py-4 uppercase text-[10px]">Nenhum pagamento registrado</div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {recentPayments.map((pay) => (
                        <div key={pay.id} className="p-3 border border-red-950/10 bg-black/20 rounded flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-300">{pay.userEmail}</span>
                            <span className="text-[9px] text-slate-500 block uppercase">
                              {new Date(pay.createdAt).toLocaleDateString("pt-BR")} às {new Date(pay.createdAt).toLocaleTimeString("pt-BR", {hour: "2-digit", minute:"2-digit"})}
                            </span>
                          </div>
                          <span className="text-red-500 font-bold font-mono text-sm">
                            R$ {pay.amount},00
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ================= TAB 2: SCANS QUEUE QUEUE ================= */}
          {activeTab === "queue" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-red-950/20 pb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-red-500">Fila Global de Varreduras</h2>
                <Button 
                  onClick={fetchQueue}
                  variant="outline" 
                  size="xs"
                  className="h-8 border-red-950 hover:bg-red-950/10 text-[10px]"
                  disabled={queueLoading}
                >
                  <RefreshCw className={`size-3.5 mr-1 ${queueLoading ? "animate-spin text-red-500" : ""}`} /> Atualizar Fila
                </Button>
              </div>

              {queueLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-xs text-red-500">
                  <Loader2 className="size-8 animate-spin" />
                  <span>CARREGANDO PROTOCOLOS DE EXECUÇÃO...</span>
                </div>
              ) : scansQueue.length === 0 ? (
                <div className="py-16 border border-dashed border-red-950/20 rounded text-center text-slate-500 uppercase text-[10px]">
                  Nenhuma varredura executada na plataforma.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {scansQueue.map((scan) => {
                    const isProcessing = scan.status === "processing" || scan.status === "pending";
                    const isCompleted = scan.status === "completed";
                    const isFailed = scan.status === "failed";
                    const isPerforming = actionInProgress === scan.id;

                    return (
                      <Card key={scan.id} className="border-red-950/20 bg-[#070c14]/25">
                        <CardHeader className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-950/10 bg-black/15">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="font-bold text-slate-200">{scan.niche}</span>
                              <span className="text-slate-600">•</span>
                              <span className="font-semibold text-red-500">{scan.city}</span>
                            </div>
                            <div className="text-[9px] text-slate-500 flex flex-wrap gap-x-3 gap-y-1 font-mono uppercase">
                              <span>Operador: {scan.userEmail} ({scan.userName || "N/A"})</span>
                              <span>•</span>
                              <span>Data: {new Date(scan.createdAt).toLocaleDateString("pt-BR")}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isProcessing && (
                              <Badge className="bg-primary/5 text-primary border-primary animate-pulse text-[9px] font-bold">
                                RUNNING
                              </Badge>
                            )}
                            {isCompleted && (
                              <Badge className="bg-emerald-950/20 text-emerald-400 border-emerald-500/20 text-[9px] font-bold">
                                COMPLETED
                              </Badge>
                            )}
                            {isFailed && (
                              <Badge className="bg-red-950/20 text-red-400 border-red-500/20 text-[9px] font-bold">
                                FAILED
                              </Badge>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="p-4 flex items-center justify-between gap-4 text-xs">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[10px] uppercase font-mono text-slate-400">
                            <div>Leads Mapeados: <span className="text-slate-200 font-bold">{scan.totalLeadsFound}</span></div>
                            <div>Oportunidades Quentes: <span className="text-red-500 font-bold">{scan.highPriorityCount}</span></div>
                          </div>

                          {/* Action Buttons for Queue */}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleScanAction(scan.id, "reset")}
                              disabled={isPerforming}
                              variant="outline"
                              size="xs"
                              className="h-8 border-red-950 hover:bg-red-950/10 text-[9px]"
                            >
                              {isPerforming && actionInProgress === scan.id ? (
                                <Loader2 className="size-3 animate-spin text-red-500" />
                              ) : (
                                <Play className="size-3 text-emerald-400 mr-1" />
                              )}
                              REINICIAR
                            </Button>
                            
                            <Button
                              onClick={() => handleScanAction(scan.id, "delete")}
                              disabled={isPerforming}
                              variant="ghost"
                              size="xs"
                              className="h-8 hover:bg-red-950/20 hover:text-red-400 text-[9px]"
                            >
                              <Trash2 className="size-3 text-red-400 mr-1" />
                              DELETAR
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#04070a] flex items-center justify-center font-mono text-red-500 text-xs gap-3">
        <Loader2 className="size-8 animate-spin" />
        <span>INICIALIZANDO CONSOLE DE OPERAÇÕES...</span>
      </div>
    }>
      <AdminContent />
    </Suspense>
  );
}
