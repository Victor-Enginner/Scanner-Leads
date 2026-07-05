"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Printer, 
  ArrowLeft, 
  Loader2, 
  MapPin, 
  Target, 
  Calendar, 
  Globe, 
  Phone, 
  Check, 
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Lead {
  id: string;
  businessName: string;
  formattedAddress: string;
  whatsappNumber: string | null;
  hasWebsite: boolean;
  websiteUrl: string | null;
  hasInstagram: boolean;
  instagramUrl: string | null;
  hasFacebook: boolean;
  facebookUrl: string | null;
  opportunityScore: number;
  priority: string;
  pitchMessage: string;
}

interface Scan {
  id: string;
  city: string;
  niche: string;
  status: string;
  createdAt: string;
}

function ReportContent() {
  const params = useParams();
  const router = useRouter();
  const scanId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [scan, setScan] = useState<Scan | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const response = await fetch(`/api/scan/${scanId}`);
        if (response.ok) {
          const data = await response.json();
          setScan(data.scan);
          setLeads(data.leads);
        } else {
          console.error("[ReportPage] Failed to fetch data");
        }
      } catch (err) {
        console.error("[ReportPage] Error fetching data", err);
      } finally {
        setLoading(false);
      }
    };

    if (scanId) {
      fetchReportData();
    }
  }, [scanId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-3 text-xs">
          <Loader2 className="size-8 animate-spin text-primary" />
          <span>GERANDO RELATÓRIO EXECUTIVO...</span>
        </div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center font-mono p-4 text-center">
        <div className="space-y-4">
          <p className="text-xs uppercase font-bold text-red-400">Varredura não localizada.</p>
          <Button onClick={() => router.push("/dashboard")} size="sm">
            Voltar ao Painel
          </Button>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalLeads = leads.length;
  const highPriorityLeads = leads.filter(l => l.priority === "ALTA").length;
  const noWebsiteLeads = leads.filter(l => !l.hasWebsite).length;
  const digitalizationRate = totalLeads > 0 
    ? Math.round(((totalLeads - noWebsiteLeads) / totalLeads) * 100) 
    : 100;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-4 sm:p-8 font-sans print:p-0 print:bg-white print:text-black">
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            font-size: 12px !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-after: always;
          }
          .card-border {
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Floating Toolbar (no-print) */}
      <div className="no-print max-w-5xl mx-auto mb-6 flex items-center justify-between border-b border-slate-300 pb-4">
        <Button 
          onClick={() => router.push("/dashboard")} 
          variant="outline" 
          size="sm"
          className="text-xs font-mono"
        >
          <ArrowLeft className="size-4 mr-1.5" /> Voltar ao Painel
        </Button>

        <Button 
          onClick={() => window.print()}
          size="sm"
          className="text-xs font-mono bg-primary text-slate-950 font-bold hover:bg-primary/95"
        >
          <Printer className="size-4 mr-1.5" /> Salvar PDF / Imprimir
        </Button>
      </div>

      {/* Main Report Container */}
      <div className="max-w-5xl mx-auto space-y-8 bg-white p-6 sm:p-10 rounded-lg shadow-sm border border-slate-200 card-border print:border-none print:p-0 print:shadow-none">
        
        {/* Header Block */}
        <div className="border-b-2 border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase block">
              [ Relatório de Diagnóstico Digital ]
            </span>
            <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-900 tracking-tight leading-none">
              Auditoria de Negócios Locais
            </h1>
            <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-600">
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5 text-slate-500" /> {scan.city}
              </span>
              <span className="flex items-center gap-1">
                <Target className="size-3.5 text-slate-500" /> {scan.niche}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5 text-slate-500" /> {new Date(scan.createdAt).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>
          <div className="p-3 border-2 border-slate-800 rounded text-center shrink-0">
            <span className="text-[8px] font-mono font-bold text-slate-500 block uppercase">Grau de Digitalização</span>
            <span className="text-2xl font-black text-slate-800 font-mono">{digitalizationRate}%</span>
          </div>
        </div>

        {/* Executive Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 border border-slate-200 bg-slate-50 rounded card-border">
            <span className="text-[9px] font-mono font-bold text-slate-500 block uppercase">Negócios Analisados</span>
            <span className="text-xl font-bold text-slate-900 font-mono">{totalLeads}</span>
            <p className="text-[10px] text-slate-500 font-sans mt-1 leading-relaxed">
              Mapeados diretamente da base de dados geográfica do Google Maps.
            </p>
          </div>
          <div className="p-4 border border-slate-200 bg-slate-50 rounded card-border">
            <span className="text-[9px] font-mono font-bold text-slate-500 block uppercase">Sem Site Próprio</span>
            <span className="text-xl font-bold text-red-600 font-mono">{noWebsiteLeads}</span>
            <p className="text-[10px] text-slate-500 font-sans mt-1 leading-relaxed">
              Empresas que não possuem site ou possuem apenas perfis de redes sociais.
            </p>
          </div>
          <div className="p-4 border border-slate-200 bg-slate-50 rounded card-border">
            <span className="text-[9px] font-mono font-bold text-slate-500 block uppercase">Oportunidades de Alta Prioridade</span>
            <span className="text-xl font-bold text-amber-600 font-mono">{highPriorityLeads}</span>
            <p className="text-[10px] text-slate-500 font-sans mt-1 leading-relaxed">
              Negócios prioritários para abordagem comercial imediata.
            </p>
          </div>
        </div>

        {/* Diagnostic introduction */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono font-bold text-slate-800 uppercase tracking-wider">
            1. Análise Geral e Metodologia
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            Esta auditoria analisa a presença digital de estabelecimentos comerciais locais na cidade de **{scan.city}** para o segmento de **{scan.niche}**. A validação foi feita avaliando a existência de website institucional, indexação de metadados, responsividade mobile e links ativos para redes sociais (Instagram e Facebook). Um score de oportunidade (0 a 100) foi calculado onde pontuações elevadas indicam negócios que necessitam urgentemente de desenvolvimento web para otimizar suas conversões comerciais.
          </p>
        </div>

        {/* Leads Table */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono font-bold text-slate-800 uppercase tracking-wider">
            2. Lista de Alvos prioritários
          </h2>
          <div className="border border-slate-200 rounded overflow-hidden card-border">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-mono text-[9px] uppercase text-slate-500">
                  <th className="py-2.5 px-3">Empresa</th>
                  <th className="py-2.5 px-3">WhatsApp</th>
                  <th className="py-2.5 px-3 text-center">Site</th>
                  <th className="py-2.5 px-3 text-center">Instagram</th>
                  <th className="py-2.5 px-3 text-center">Facebook</th>
                  <th className="py-2.5 px-3 text-center">Score</th>
                  <th className="py-2.5 px-3 text-right">Prioridade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-semibold text-slate-800">{lead.businessName}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{lead.whatsappNumber || "N/A"}</td>
                    <td className="py-2 px-3 text-center">
                      {lead.hasWebsite ? (
                        <Check className="size-4 text-emerald-500 mx-auto" />
                      ) : (
                        <X className="size-4 text-red-500 mx-auto" />
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {lead.hasInstagram ? (
                        <Check className="size-4 text-emerald-500 mx-auto" />
                      ) : (
                        <X className="size-4 text-slate-300 mx-auto" />
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {lead.hasFacebook ? (
                        <Check className="size-4 text-emerald-500 mx-auto" />
                      ) : (
                        <X className="size-4 text-slate-300 mx-auto" />
                      )}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">{lead.opportunityScore}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                        lead.priority === "ALTA" ? "text-red-600 bg-red-50 border-red-200" :
                        lead.priority === "MEDIA" ? "text-amber-600 bg-amber-50 border-amber-200" :
                        "text-slate-500 bg-slate-50 border-slate-200"
                      }`}>
                        {lead.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Page break for printing to separate tables from detailed pitch lists */}
        <div className="page-break" />

        {/* Detailed approaches copy blocks */}
        <div className="space-y-5">
          <h2 className="text-xs font-mono font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
            3. Roteiros e Copys de Abordagem Personalizadas (WhatsApp)
          </h2>
          
          <div className="space-y-6">
            {leads.filter(l => l.priority === "ALTA" || l.priority === "MEDIA").map((lead) => (
              <div 
                key={lead.id} 
                className="p-5 border border-slate-200 rounded-lg bg-slate-50 card-border space-y-3 page-break-inside-avoid"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2 gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{lead.businessName}</h3>
                    <p className="text-[10px] text-slate-500 font-sans mt-0.5">{lead.formattedAddress}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider text-red-600 bg-red-50 border-red-200">
                      Score: {lead.opportunityScore} / 100
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono text-slate-600">
                  <div className="flex items-center gap-1">
                    <Globe className="size-3.5" /> Website: <span className="font-bold text-slate-700">{lead.hasWebsite ? "Sim" : "Ausente"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone className="size-3.5" /> Telefone: <span className="font-bold text-slate-700">{lead.whatsappNumber || "Não cadastrado"}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block">Script de Prospecção</span>
                  <div className="p-3 border border-slate-200 bg-white rounded font-sans text-xs text-slate-700 whitespace-pre-line leading-relaxed border-dashed">
                    {lead.pitchMessage}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-3 text-xs">
          <Loader2 className="size-8 animate-spin text-primary" />
          <span>INICIALIZANDO COMPONENTE DE RELATÓRIO...</span>
        </div>
      </div>
    }>
      <ReportContent />
    </Suspense>
  );
}
