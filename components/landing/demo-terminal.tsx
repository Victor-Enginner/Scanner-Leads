"use client";

import React, { useState, useEffect } from "react";
import { Terminal, Check, Loader2, Sparkles, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface DemoLead {
  name: string;
  niche: string;
  status: string;
  score: number;
  priority: "ALTA" | "MEDIA" | "NAO_PRIORITARIO";
  color: string;
}

const demoLeads: DemoLead[] = [
  { name: "Pizzaria Don Milano", niche: "Pizzaria", status: "Sem Site", score: 85, priority: "ALTA", color: "text-red-400 border-red-500/20 bg-red-950/10" },
  { name: "Studio Odontológico Dr. Arthur", niche: "Dentista", status: "Só Instagram (Sem Site)", score: 75, priority: "MEDIA", color: "text-amber-400 border-amber-500/20 bg-amber-950/10" },
  { name: "Oficina Mecânica Centro Automotivo", niche: "Mecânica", status: "Sem Site", score: 80, priority: "ALTA", color: "text-red-400 border-red-500/20 bg-red-950/10" },
  { name: "Salão de Beleza Concept Hair", niche: "Estética", status: "Site Temporário/Gofaddy", score: 90, priority: "ALTA", color: "text-red-400 border-red-500/20 bg-red-950/10" },
  { name: "Clínica Veterinária Pet Love", niche: "Pet Shop", status: "Tem Site Próprio", score: 25, priority: "NAO_PRIORITARIO", color: "text-slate-400 border-slate-500/20 bg-slate-900/10" },
];

export function DemoTerminal() {
  const [logs, setLogs] = useState<string[]>([]);
  const [leads, setLeads] = useState<DemoLead[]>([]);
  const [scanStep, setScanStep] = useState<"idle" | "searching" | "auditing" | "completed">("idle");
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    // Loop the scanner animation
    let active = true;
    
    const runCycle = async () => {
      if (!active) return;
      
      // Reset state
      setLogs([]);
      setLeads([]);
      setScanStep("searching");
      setScanProgress(0);
      
      const logQueue = [
        "SYS_RADAR: INICIANDO ANÁLISE EM Franca - SP...",
        "SYS_RADAR: CONECTANDO À GOOGLE PLACES API...",
        "SYS_RADAR: MAPEANDO ÁREA CENTRO-NORTE (RAIO: 5KM)...",
        "SYS_RADAR: 18 ESTABELECIMENTOS LOCALIZADOS.",
        "SYS_AUDIT: INICIANDO PROTOCOLO DE AUDITORIA DE PRESENÇA...",
      ];

      // Print initial log queue
      for (const log of logQueue) {
        if (!active) return;
        setLogs((prev) => [...prev, log]);
        await new Promise((r) => setTimeout(r, 650));
      }

      // Transition to auditing leads
      if (!active) return;
      setScanStep("auditing");

      // Audit leads one-by-one and print logs
      for (let i = 0; i < demoLeads.length; i++) {
        if (!active) return;
        const currentLead = demoLeads[i];
        
        // Update logs
        setLogs((prev) => [
          ...prev,
          `AUDIT: AUDITANDO [${currentLead.name}] -> WEBSITES/REDES...`,
        ]);
        await new Promise((r) => setTimeout(r, 700));

        if (!active) return;
        setLogs((prev) => [
          ...prev,
          `AUDIT: [${currentLead.name}] -> SCORE OPORTUNIDADE: ${currentLead.score}/100. Gravado.`,
        ]);

        // Add lead to dashboard list
        setLeads((prev) => [...prev, currentLead]);
        setScanProgress(Math.round(((i + 1) / demoLeads.length) * 100));
        
        await new Promise((r) => setTimeout(r, 600));
      }

      // Finish scan
      if (!active) return;
      setScanStep("completed");
      setLogs((prev) => [
        ...prev,
        "SYS_RADAR: VARREDURA CONCLUÍDA. RELATÓRIOS PDF/EXCEL GERADOS COM SUCESSO.",
        "SYS_RADAR: SISTEMA AGUARDANDO PRÓXIMA CIDADE...",
      ]);

      // Wait on completed state before restarting loop
      await new Promise((r) => setTimeout(r, 8000));
      if (active) {
        runCycle();
      }
    };

    runCycle();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="w-full border border-primary glow-cyan bg-[#070c14]/90 backdrop-blur-md rounded-lg overflow-hidden font-mono flex flex-col h-[480px] shadow-[0_0_30px_rgba(0,240,255,0.05)] select-none">
      {/* Terminal Title Bar */}
      <div className="bg-primary/5 border-b border-primary/20 py-2.5 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="size-4 text-primary animate-pulse" />
          <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
            nexus_scanner_runtime_console.exe
          </span>
        </div>
        <div className="flex items-center gap-3">
          {scanStep === "searching" || scanStep === "auditing" ? (
            <span className="text-[10px] text-amber-400 animate-pulse flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" /> SCANNING_RUNNING
            </span>
          ) : (
            <span className="text-[10px] text-[#00f0ff] flex items-center gap-1">
              <Check className="size-3" /> SYS_READY
            </span>
          )}
          <div className="flex gap-1">
            <div className="size-2 bg-red-500/80 rounded-full" />
            <div className="size-2 bg-yellow-500/80 rounded-full" />
            <div className="size-2 bg-[#00f0ff]/80 rounded-full" />
          </div>
        </div>
      </div>

      {/* Terminal Grid Splitter */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
        {/* Left Side: Console Logs & Progress */}
        <div className="border-b md:border-b-0 md:border-r border-primary/10 bg-black/50 p-4 flex flex-col justify-between overflow-hidden">
          <div className="space-y-1.5 overflow-y-auto max-h-[300px] text-[10px] text-slate-300 scrollbar-thin scrollbar-thumb-primary/10">
            {logs.map((log, index) => (
              <div key={index} className="flex gap-1.5 items-start">
                <span className="text-primary shrink-0">&gt;</span>
                <span className={cn(
                  log.startsWith("SYS_RADAR") ? "text-primary font-bold" :
                  log.startsWith("ERROR") ? "text-red-400" :
                  log.includes("SCORE") ? "text-amber-400" : "text-slate-300"
                )}>
                  {log}
                </span>
              </div>
            ))}
            <div className="text-primary animate-pulse text-[11px] font-bold terminal-cursor pt-1">
              {scanStep === "searching" ? "Carregando coordenadas do Maps..." :
               scanStep === "auditing" ? "Fazendo auditoria de site..." : "Aguardando nova requisição"}
            </div>
          </div>

          {/* Progress bar container */}
          <div className="border-t border-primary/10 pt-4 mt-2">
            <div className="flex items-center justify-between text-[10px] uppercase mb-1">
              <span className="text-muted-foreground">Progresso do Radar</span>
              <span className="text-primary font-bold">{scanProgress}%</span>
            </div>
            <div className="w-full bg-[#0a1320] h-2.5 rounded overflow-hidden border border-primary/20">
              <div
                className="bg-primary h-full transition-all duration-500 shadow-[0_0_10px_#00f0ff]"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2.5 text-[9px] text-muted-foreground uppercase">
              <span>Alvo: Franca - SP</span>
              <span>Nicho: Pizzarias</span>
            </div>
          </div>
        </div>

        {/* Right Side: Leads populating */}
        <div className="p-4 flex flex-col justify-between overflow-hidden bg-[#05090f]/75">
          <div className="flex items-center justify-between text-[10px] uppercase text-muted-foreground border-b border-primary/10 pb-2 mb-3">
            <span>Resultados Mapeados</span>
            <span className="text-primary">{leads.length} encontrados</span>
          </div>

          {/* List Container */}
          <div className="flex-1 overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-primary/10">
            {leads.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <MapPin className="size-8 text-primary/30 animate-bounce mb-2" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-relaxed">
                  Iniciando radar...<br />Varrendo base do Google Maps
                </p>
              </div>
            ) : (
              leads.map((lead, idx) => (
                <div
                  key={idx}
                  className="p-3 border border-primary/10 bg-black/30 rounded flex items-center justify-between hover:border-primary/30 hover:bg-black/50 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                >
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-foreground truncate max-w-[150px] md:max-w-[180px]">
                      {lead.name.split(" (")[0]}
                    </div>
                    <div className="text-[9px] text-muted-foreground flex gap-2 items-center">
                      <span className="font-mono">{lead.niche}</span>
                      <span className="size-1 bg-border rounded-full" />
                      <span className="text-amber-400 font-mono font-semibold">{lead.status}</span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] font-mono text-primary font-bold">
                      {lead.score} PTS
                    </span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider border",
                      lead.priority === "ALTA" ? "text-red-400 border-red-500/20 bg-red-950/10" :
                      lead.priority === "MEDIA" ? "text-amber-400 border-amber-500/20 bg-amber-950/10" :
                      "text-slate-400 border-slate-500/20 bg-slate-900/10"
                    )}>
                      {lead.priority}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="text-center text-[9px] text-muted-foreground uppercase mt-2 pt-2 border-t border-primary/10 flex justify-center items-center gap-1 font-mono">
            <Sparkles className="size-3 text-primary" />
            Esta é a tela de varredura real do scanner
          </div>
        </div>
      </div>
    </div>
  );
}
