"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, ArrowRight, Loader2, CheckCircle2, User, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SUPPORT_WHATSAPP_URL } from "@/lib/constants";

function ObrigadoContent() {
  const { data: session, status: authStatus } = useSession();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const isMock = searchParams.get("mock") === "true" || sessionId?.startsWith("mock_");

  const [webhookTriggered, setWebhookTriggered] = useState(false);
  const [isProcessingCredit, setIsProcessingCredit] = useState(false);

  // Auto-simulate webhook if running in mock checkout mode
  useEffect(() => {
    if (isMock && sessionId && !webhookTriggered && authStatus === "authenticated") {
      setWebhookTriggered(true);
      setIsProcessingCredit(true);

      const triggerMockWebhook = async () => {
        try {
          console.log("[ObrigadoPage] Simulating webhook payment event locally...");
          
          const mockEmail = session?.user?.email || "operador-teste@nexusscan.com.br";
          const mockName = session?.user?.name || "Operador Local";
          const mockUserId = session?.user?.id || "mock-user-id";

          const response = await fetch("/api/webhooks/stripe", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "stripe-signature": "mock_signature", // triggers mock webhook path
            },
            body: JSON.stringify({
              type: "checkout.session.completed",
              data: {
                object: {
                  id: sessionId,
                  customer_details: {
                    email: mockEmail,
                    name: mockName,
                  },
                  payment_intent: `pi_${sessionId}`,
                  amount_total: 9700,
                  currency: "brl",
                  metadata: {
                    userId: mockUserId,
                  },
                },
              },
            }),
          });

          if (response.ok) {
            console.log("[ObrigadoPage] Mock payment webhook verified successfully.");
            toast.success("Crédito de varredura ativado com sucesso (Simulação)!");
          } else {
            console.error("[ObrigadoPage] Mock webhook failed", await response.text());
            toast.error("Erro na simulação do webhook.");
          }
        } catch (err) {
          console.error("[ObrigadoPage] Webhook trigger error", err);
        } finally {
          setIsProcessingCredit(false);
        }
      };

      // Delay slightly to allow db consistency
      const timeoutId = setTimeout(triggerMockWebhook, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [isMock, sessionId, webhookTriggered, authStatus, session]);

  const isLoading = authStatus === "loading" || isProcessingCredit;

  return (
    <main className="scanlines scanline-effect min-h-screen w-full flex flex-col justify-center items-center px-4 py-12 bg-[#04070a] font-mono">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00f0ff03_1px,transparent_1px),linear-gradient(to_bottom,#00f0ff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="w-full max-w-[500px] relative z-10 space-y-6">
        {/* Success Header banner */}
        <div className="text-center">
          <CheckCircle2 className="size-16 text-primary mx-auto drop-shadow-[0_0_15px_rgba(0,240,255,0.5)] animate-bounce" />
          <h1 className="text-2xl font-black text-primary tracking-widest uppercase mt-4">
            PAGAMENTO CONFIRMADO
          </h1>
          <p className="text-xs text-muted-foreground uppercase mt-1 tracking-wider">
            Obrigado! Sua transação foi concluída com sucesso.
          </p>
        </div>

        {/* Card containing instructions */}
        <Card className="border-primary glow-cyan bg-[#070c14]/95 backdrop-blur-md">
          <CardHeader className="border-b border-primary/20 bg-primary/5 py-3.5 px-6">
            <CardTitle className="text-xs text-primary uppercase font-bold tracking-wider">
              [PROTOCOLO DE INICIALIZAÇÃO DE CRÉDITO]
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-6 px-6 space-y-5">
            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-sm text-slate-300">
                <Loader2 className="size-8 animate-spin text-primary" />
                <span>PROCESSANDO CRÉDITO DE VARREDURA...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Seu crédito para realizar a varredura de radar foi liberado no banco de dados. Siga os passos abaixo para iniciar a busca pelos alvos:
                </p>

                {/* Step indicators */}
                <div className="space-y-3">
                  {/* Step 1: Auth check */}
                  <div className="p-3 border border-border bg-black/30 rounded flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="size-4 text-primary" />
                      <span className="text-xs uppercase font-semibold">Passo 1: Autenticação</span>
                    </div>
                    {session ? (
                      <span className="text-[10px] uppercase font-bold text-primary flex items-center gap-1">
                        ✓ OPERADOR LOGADO
                      </span>
                    ) : (
                      <Link href="/login">
                        <Button size="xs" className="h-6 text-[9px]">
                          FAZER LOGIN <Key className="size-3 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>

                  {/* Step 2: Configure scan */}
                  <div className="p-3 border border-border bg-black/30 rounded flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-primary" />
                      <span className="text-xs uppercase font-semibold">Passo 2: Configuração</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase">
                      AGUARDANDO ALVOS
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  {session ? (
                    <Link href="/solicitar">
                      <Button className="w-full py-6 text-xs font-bold flex items-center justify-center gap-2">
                        CONFIGURAR VARREDURA <ArrowRight className="size-4 animate-pulse" />
                      </Button>
                    </Link>
                  ) : (
                    <div className="p-3 bg-amber-950/20 border border-amber-500/10 rounded text-[10px] text-amber-400 text-center uppercase tracking-wide">
                      ⚠️ Você precisa fazer login antes de configurar o scanner.
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="pb-6 pt-2 px-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] text-muted-foreground border-t border-primary/5">
            <span>Sessão: {sessionId ? `${sessionId.substring(0, 15)}...` : "N/A"}</span>
            <div className="flex items-center gap-3">
              {isMock && <span className="text-primary font-bold mr-2">MODO SIMULAÇÃO ATIVO</span>}
              <a 
                href={SUPPORT_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline uppercase font-bold tracking-wider"
              >
                Suporte WhatsApp
              </a>
            </div>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

export default function ObrigadoPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen w-full flex flex-col justify-center items-center bg-[#04070a] font-mono text-primary text-xs gap-3">
        <Loader2 className="size-8 animate-spin" />
        <span>CARREGANDO PROTOCOLO...</span>
      </main>
    }>
      <ObrigadoContent />
    </Suspense>
  );
}
