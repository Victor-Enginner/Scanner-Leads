"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { 
  Radar, 
  Map, 
  FileSpreadsheet, 
  FileText, 
  User, 
  LogOut, 
  PlusCircle, 
  Calendar, 
  TrendingUp, 
  Loader2, 
  ShieldAlert,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Scan {
  id: string;
  city: string;
  niche: string;
  status: "pending" | "processing" | "completed" | "failed";
  totalLeadsFound: number;
  highPriorityCount: number;
  pricePaid: number;
  createdAt: string;
  completedAt?: string;
  reportUrl?: string;
  progressPercent?: number; // client-side calculated
}

function DashboardContent() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialScanId = searchParams.get("scan_id");
  const autoStart = searchParams.get("start") === "true";

  const [activeTab, setActiveTab] = useState<"scans" | "profile">("scans");
  const [scansList, setScansList] = useState<Scan[]>([]);
  const [isLoadingScans, setIsLoadingScans] = useState(true);
  const [processingScans, setProcessingScans] = useState<Record<string, boolean>>({});

  // Use a ref to track which scans are currently processing to avoid duplicate triggers
  const processingRef = useRef<Record<string, boolean>>({});

  // 1. Fetch user scans on mount
  const fetchScans = async (silent = false) => {
    if (!silent) setIsLoadingScans(true);
    try {
      const response = await fetch("/api/scan");
      if (response.ok) {
        const data = await response.json();
        
        // Initialize client progress percentage based on status
        const formattedData = data.map((scan: Scan) => ({
          ...scan,
          progressPercent: scan.status === "completed" ? 100 : 0,
        }));
        
        setScansList(formattedData);

        // Check if we need to auto-trigger processing loops for active scans
        formattedData.forEach((scan: Scan) => {
          if (
            (scan.status === "pending" || scan.status === "processing") && 
            !processingRef.current[scan.id]
          ) {
            triggerBatchProcessing(scan.id);
          }
        });

      } else {
        toast.error("Erro ao carregar varreduras.");
      }
    } catch (err) {
      console.error("[Dashboard] Error fetching scans", err);
    } finally {
      if (!silent) setIsLoadingScans(false);
    }
  };

  useEffect(() => {
    if (authStatus === "authenticated") {
      fetchScans();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);

  // 2. Trigger auto-start scan parameter from URL query
  useEffect(() => {
    if (initialScanId && autoStart && scansList.length > 0) {
      const targetScan = scansList.find((s) => s.id === initialScanId);
      if (targetScan && (targetScan.status === "pending" || targetScan.status === "processing")) {
        if (!processingRef.current[initialScanId]) {
          triggerBatchProcessing(initialScanId);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialScanId, autoStart, scansList]);

  // 3. Batch processing loop handler (Vercel-safe execution)
  const triggerBatchProcessing = async (scanId: string) => {
    if (processingRef.current[scanId]) return; // already running
    
    processingRef.current[scanId] = true;
    setProcessingScans((prev) => ({ ...prev, [scanId]: true }));
    console.log(`[Dashboard] Starting background batch loop for scan: ${scanId}`);

    let errorCount = 0;
    const maxErrors = 3;

    const runBatch = async () => {
      try {
        const response = await fetch("/api/scan/process", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ scanId }),
        });

        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}`);
        }

        const data = await response.json();

        // Update local scan state in state list
        setScansList((prevList) => 
          prevList.map((scan) => {
            if (scan.id === scanId) {
              return {
                ...scan,
                status: data.status,
                progressPercent: data.progress || (data.status === "completed" ? 100 : 0),
                totalLeadsFound: data.total || scan.totalLeadsFound,
                highPriorityCount: data.highPriorityCount || scan.highPriorityCount,
              };
            }
            return scan;
          })
        );

        if (data.status === "processing") {
          // If still processing, wait 1 second and execute next batch
          setTimeout(runBatch, 1000);
        } else {
          // Done (completed or failed)
          console.log(`[Dashboard] Scan batch loop finished for: ${scanId}. Status: ${data.status}`);
          processingRef.current[scanId] = false;
          setProcessingScans((prev) => ({ ...prev, [scanId]: false }));
          
          if (data.status === "completed") {
            toast.success(`Varredura concluída! Encontrados ${data.highPriorityCount} leads prioritários.`);
          } else {
            toast.error("A varredura falhou. Verifique os logs.");
          }
          // Refresh lists to sync finalized dates and report URLs
          fetchScans(true);
        }

      } catch (err) {
        console.error(`[Dashboard] Batch loop error on scan ${scanId}:`, err);
        errorCount++;

        if (errorCount >= maxErrors) {
          console.error(`[Dashboard] Stopping batch loop for ${scanId} after ${maxErrors} consecutive errors.`);
          processingRef.current[scanId] = false;
          setProcessingScans((prev) => ({ ...prev, [scanId]: false }));
          
          setScansList((prevList) => 
            prevList.map((scan) => {
              if (scan.id === scanId) {
                return { ...scan, status: "failed" };
              }
              return scan;
            })
          );
          toast.error("Erro no processamento da varredura. Interrompido.");
        } else {
          // Retry after delay
          setTimeout(runBatch, 2500);
        }
      }
    };

    runBatch();
  };

  const handleCreateNewScan = async () => {
    // Redirect user to Stripe session creator
    try {
      toast.info("Iniciando transação...");
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Erro ao iniciar checkout.");
      }
    } catch {
      toast.error("Erro ao conectar com servidor de pagamentos.");
    }
  };

  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-[#04070a] flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-3 text-sm text-primary">
          <Loader2 className="size-8 animate-spin" />
          <span>AUTENTICANDO OPERADOR...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#04070a] font-mono flex flex-col text-slate-300">
      {/* Dashboard Top bar */}
      <header className="border-b border-border bg-[#070c14] py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-primary tracking-widest uppercase">
            NEXUS SCAN // DASHBOARD
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="hidden sm:inline text-slate-500 font-semibold">{session?.user?.email}</span>
          <Button 
            onClick={() => signOut({ callbackUrl: "/" })}
            variant="ghost" 
            size="xs" 
            className="h-7 hover:text-red-400 border border-transparent hover:border-red-950"
          >
            <LogOut className="size-3.5 mr-1" /> Sair
          </Button>
        </div>
      </header>

      {/* Main split grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation panel */}
        <aside className="space-y-4">
          <Card className="border-border bg-[#070c14]/60">
            <CardHeader className="py-4 border-b border-border/30">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Painel do Operador</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-1">
              <Button
                onClick={() => setActiveTab("scans")}
                variant={activeTab === "scans" ? "default" : "ghost"}
                className="w-full justify-start text-xs font-semibold py-4"
              >
                <Radar className="size-4 mr-2" /> Minhas Varreduras
              </Button>
              <Button
                onClick={() => setActiveTab("profile")}
                variant={activeTab === "profile" ? "default" : "ghost"}
                className="w-full justify-start text-xs font-semibold py-4"
              >
                <User className="size-4 mr-2" /> Meu Perfil
              </Button>
            </CardContent>
            <CardFooter className="p-3 border-t border-border/30">
              <Button
                onClick={handleCreateNewScan}
                className="w-full py-4 text-[10px]"
                disabled={Object.values(processingScans).some(Boolean)}
              >
                <PlusCircle className="size-3.5 mr-1.5" /> NOVA VARREDURA
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-border bg-[#070c14]/40 hidden md:block">
            <CardHeader className="py-3.5">
              <CardTitle className="text-[10px] uppercase text-muted-foreground">Sistema de Suporte</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 text-[10px] space-y-1 leading-relaxed">
              <p>Email: contato@nexusscan.com.br</p>
              <p>Instagram: @engenheiro.ai</p>
            </CardContent>
          </Card>
        </aside>

        {/* Contents area */}
        <main className="md:col-span-3 space-y-4">
          {activeTab === "scans" && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Minhas Varreduras</h2>
                <Button 
                  onClick={() => fetchScans(false)}
                  variant="outline" 
                  size="xs"
                  className="h-8 font-mono text-[10px]"
                  disabled={isLoadingScans}
                >
                  <RefreshCw className={`size-3.5 mr-1 ${isLoadingScans ? "animate-spin" : ""}`} /> Atualizar
                </Button>
              </div>

              {isLoadingScans ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-xs text-primary">
                  <Loader2 className="size-8 animate-spin" />
                  <span>BUSCANDO REGISTROS DE RADAR...</span>
                </div>
              ) : scansList.length === 0 ? (
                <Card className="border-border border-dashed py-16 text-center">
                  <CardHeader className="flex flex-col items-center gap-3">
                    <Radar className="size-12 text-muted-foreground/30 animate-pulse" />
                    <CardTitle className="text-sm">Nenhuma Varredura Localizada</CardTitle>
                    <CardDescription className="max-w-xs mx-auto text-xs font-sans">
                      Você ainda não realizou nenhuma varredura de radar. Adquira crédito e comece a mapear oportunidades!
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="justify-center">
                    <Button onClick={handleCreateNewScan} size="sm">
                      ADQUIRIR CRÉDITO DE VARREDURA
                    </Button>
                  </CardFooter>
                </Card>
              ) : (
                <div className="space-y-4">
                  {scansList.map((scan) => {
                    const isProcessing = scan.status === "processing" || scan.status === "pending";
                    const isFailed = scan.status === "failed";
                    const isCompleted = scan.status === "completed";
                    
                    return (
                      <Card 
                        key={scan.id} 
                        className={`border-border hover:border-primary/20 transition-all duration-300 ${
                          isProcessing ? "border-primary/40 shadow-[0_0_15px_rgba(0,240,255,0.02)]" : ""
                        }`}
                      >
                        <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/20 bg-black/10">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-foreground">{scan.niche}</span>
                              <span className="text-[10px] text-muted-foreground">•</span>
                              <span className="text-xs font-semibold text-primary">{scan.city}</span>
                            </div>
                            <div className="text-[9px] text-muted-foreground flex items-center gap-1.5">
                              <Calendar className="size-3" />
                              <span>{new Date(scan.createdAt).toLocaleDateString("pt-BR")} às {new Date(scan.createdAt).toLocaleTimeString("pt-BR", {hour: "2-digit", minute:"2-digit"})}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Badges */}
                            {isProcessing && (
                              <Badge className="bg-primary/5 text-primary border-primary animate-pulse text-[9px] font-bold">
                                🛸 PROCESSANDO
                              </Badge>
                            )}
                            {isCompleted && (
                              <Badge className="bg-emerald-950/20 text-emerald-400 border-emerald-500/20 text-[9px] font-bold">
                                ✓ CONCLUÍDO
                              </Badge>
                            )}
                            {isFailed && (
                              <Badge className="bg-red-950/20 text-red-400 border-red-500/20 text-[9px] font-bold">
                                ❌ FALHOU
                              </Badge>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="p-4 sm:p-5 space-y-4">
                          {/* Processing Progress Bar */}
                          {isProcessing && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Loader2 className="size-3 animate-spin text-primary" /> Analisando presença digital dos leads...
                                </span>
                                <span className="text-primary font-bold">{scan.progressPercent || 0}%</span>
                              </div>
                              <div className="w-full bg-[#0a1320] h-2 rounded overflow-hidden border border-primary/10">
                                <div 
                                  className="bg-primary h-full transition-all duration-300 shadow-[0_0_8px_#00f0ff]"
                                  style={{ width: `${scan.progressPercent || 0}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Completed stats */}
                          {isCompleted && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-[10px] uppercase">
                              <div className="p-2.5 border border-border/50 bg-black/10 rounded">
                                <span className="text-slate-500 block text-[8px]">Leads Encontrados</span>
                                <span className="text-foreground font-bold text-sm">{scan.totalLeadsFound}</span>
                              </div>
                              <div className="p-2.5 border border-primary/20 bg-primary/5 rounded">
                                <span className="text-primary block text-[8px] font-bold">Oportunidades Quentes</span>
                                <span className="text-primary font-black text-sm flex items-center gap-1">
                                  {scan.highPriorityCount} <TrendingUp className="size-3.5" />
                                </span>
                              </div>
                              <div className="p-2.5 border border-border/50 bg-black/10 rounded col-span-2 sm:col-span-1">
                                <span className="text-slate-500 block text-[8px]">Custo Varredura</span>
                                <span className="text-foreground font-bold text-sm">R$ {Math.round(scan.pricePaid / 100)},00</span>
                              </div>
                            </div>
                          )}

                          {isFailed && (
                            <div className="p-3 bg-red-950/10 border border-red-500/10 rounded text-[10px] text-red-400 font-sans leading-relaxed">
                              O radar encontrou uma falha de conexão com a base do Google Maps ou excedeu a cota do scraper. A transação foi marcada para re-análise. Se necessário, contate o suporte.
                            </div>
                          )}
                        </CardContent>

                        {isCompleted && (
                          <CardFooter className="p-4 sm:p-5 pt-0 flex flex-wrap gap-2 border-t border-border/10 mt-3 pt-3">
                            <Button 
                              onClick={() => router.push(`/mapa/${scan.id}`)}
                              size="xs" 
                              className="text-[10px] flex items-center gap-1 py-3 px-3.5"
                            >
                              <Map className="size-3.5 text-primary" /> VER NO MAPA INTERATIVO
                            </Button>
                            
                            <Button 
                              variant="outline"
                              size="xs" 
                              className="text-[10px] flex items-center gap-1 py-3 px-3.5 border-border hover:border-slate-600"
                              onClick={() => window.open(`/api/scan/${scan.id}/download/excel`, "_blank")}
                            >
                              <FileSpreadsheet className="size-3.5 text-emerald-400" /> PLANILHA EXCEL
                            </Button>
                            <Button 
                              variant="outline"
                              size="xs" 
                              className="text-[10px] flex items-center gap-1 py-3 px-3.5 border-border hover:border-slate-600"
                              onClick={() => router.push(`/dashboard/scan/${scan.id}/report`)}
                            >
                              <FileText className="size-3.5 text-red-400" /> PDF DETALHADO
                            </Button>
                          </CardFooter>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "profile" && (
            <Card className="border-border bg-[#070c14]/40 font-mono">
              <CardHeader className="border-b border-border/30">
                <CardTitle className="text-xs text-primary uppercase font-bold tracking-wider">Perfil do Operador</CardTitle>
                <CardDescription className="text-[10px]">Credenciais ativas do sistema</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-xs font-mono">
                <div className="space-y-1 border-b border-border/20 pb-3">
                  <span className="text-slate-500 uppercase text-[9px] block">Identificação</span>
                  <span className="text-foreground font-semibold">{session?.user?.name || "Operador Nexus"}</span>
                </div>
                <div className="space-y-1 border-b border-border/20 pb-3">
                  <span className="text-slate-500 uppercase text-[9px] block">E-mail Cadastrado</span>
                  <span className="text-foreground">{session?.user?.email}</span>
                </div>
                <div className="space-y-1 border-b border-border/20 pb-3">
                  <span className="text-slate-500 uppercase text-[9px] block">Cargo/Role</span>
                  <span className="text-primary font-bold uppercase">{session?.user?.role || "user"}</span>
                </div>
              </CardContent>
              <CardFooter className="p-6 border-t border-border/30 flex justify-between items-center">
                <div className="flex items-center gap-2 text-[9px] text-[#94a3b8]">
                  <ShieldAlert className="size-4 text-primary" />
                  CONEXÃO PROTOCOLADA
                </div>
                <Button 
                  onClick={() => signOut({ callbackUrl: "/" })}
                  variant="ghost" 
                  size="xs"
                  className="h-8 text-[10px] hover:text-red-400 border border-transparent hover:border-red-950"
                >
                  <LogOut className="size-3.5 mr-1" /> Encerrar Sessão
                </Button>
              </CardFooter>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#04070a] flex items-center justify-center font-mono text-primary text-xs gap-3">
        <Loader2 className="size-8 animate-spin" />
        <span>CARREGANDO SISTEMA...</span>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
