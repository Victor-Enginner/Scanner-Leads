"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Terminal, Mail, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  // Simulated Terminal Typing Effect on Load
  useEffect(() => {
    const logs = [
      "SYSTEM: INITIALIZING CORE_AUTH NODE...",
      "SYSTEM: SECURE PORT COMPATIBILITY VERIFIED [AES_256_GCM]",
      "SYSTEM: ESTABLISHING HANDSHAKE WITH NEXUS DATABASE...",
      "SYSTEM: SECURE SHIELD ACTIVE. READY FOR VISITOR...",
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setTerminalLogs((prev) => [...prev, logs[currentLogIndex]]);
        currentLogIndex++;
      } else {
        clearInterval(interval);
      }
    }, 450);

    return () => clearInterval(interval);
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Por favor, insira um endereço de e-mail.");
      return;
    }

    setIsLoadingEmail(true);
    try {
      setTerminalLogs((prev) => [
        ...prev,
        `USER_ACTION: REQUESTING MAGIC LINK FOR [${email}]...`,
      ]);

      const result = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        setTerminalLogs((prev) => [
          ...prev,
          `ERROR: AUTHENTICATION REQUEST FAILED. CODE: ${result.error}`,
        ]);
        toast.error("Erro ao enviar o link de acesso. Verifique seu e-mail.");
      } else {
        setTerminalLogs((prev) => [
          ...prev,
          "SYSTEM: MAGIC LINK DISPATCHED TO RETRIEVAL QUEUE.",
        ]);
        toast.success("Link de acesso enviado! Verifique sua caixa de entrada.");
        setEmail("");
      }
    } catch {
      toast.error("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoadingGoogle(true);
    try {
      setTerminalLogs((prev) => [
        ...prev,
        "USER_ACTION: INITIATING GOOGLE OAUTH SECURITY PROTOCOL...",
      ]);
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      toast.error("Erro ao conectar com Google. Tente novamente.");
      setIsLoadingGoogle(false);
    }
  };

  return (
    <main className="scanlines scanline-effect min-h-screen w-full flex flex-col justify-center items-center px-4 py-12 bg-[#04070a] font-mono select-none">
      {/* Background Matrix/Grid Aesthetic */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00f0ff05_1px,transparent_1px),linear-gradient(to_bottom,#00f0ff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="w-full max-w-[460px] relative z-10">
        {/* Glowing cyber header banner */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-primary tracking-widest uppercase drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]">
            NEXUS SCAN
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
            SISTEMA DE CAPTAÇÃO DE LEADS DE ALTA CONVERSÃO
          </p>
        </div>

        {/* Cyberpunk Terminal Window */}
        <Card className="border-primary glow-cyan bg-[#070c14]/90 backdrop-blur-md">
          <CardHeader className="border-b border-primary/20 bg-primary/5 py-3 px-5 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="size-4 text-primary animate-pulse" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                ACESSO_INTERFACE_v1.0.8
              </span>
            </div>
            <div className="flex gap-1.5">
              <div className="size-2 bg-red-500/80 rounded-full" />
              <div className="size-2 bg-yellow-500/80 rounded-full" />
              <div className="size-2 bg-[#00f0ff]/80 rounded-full" />
            </div>
          </CardHeader>

          {/* Terminal Console Logs */}
          <div className="p-4 bg-black/60 border-b border-primary/10 h-32 overflow-y-auto text-[10px] text-[#94a3b8] flex flex-col gap-1 select-text scrollbar-thin scrollbar-thumb-primary/20">
            {terminalLogs.map((log, idx) => (
              <div key={idx} className="flex gap-1 items-start leading-relaxed">
                <span className="text-[#00f0ff] shrink-0">&gt;&gt;</span>
                <span className={log.startsWith("ERROR") ? "text-red-400" : log.startsWith("USER_ACTION") ? "text-amber-400" : ""}>
                  {log}
                </span>
              </div>
            ))}
            <div className="text-primary animate-pulse text-[11px] font-bold mt-1 terminal-cursor">
              Aguardando credenciais
            </div>
          </div>

          <CardContent className="pt-6 px-6">
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5"
                >
                  <Mail className="size-3.5 text-primary" />
                  E-mail do Operador
                </label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="operador@nexusscan.net"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoadingEmail || isLoadingGoogle}
                    className="border-primary/30 bg-black/40 text-primary placeholder-primary/20 focus-visible:border-primary/80 focus-visible:ring-primary/20 font-mono text-sm py-5 pl-4 pr-10"
                  />
                  {isLoadingEmail && (
                    <div className="absolute right-3 top-3.5">
                      <Loader2 className="size-4 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoadingEmail || isLoadingGoogle}
                className="w-full py-5 text-xs font-bold"
              >
                {isLoadingEmail ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-2" />
                    SOLICITANDO ACESSO...
                  </>
                ) : (
                  "SOLICITAR ACESSO [MAGIC_LINK]"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-primary/10" />
              </div>
              <span className="relative bg-[#070c14] px-3 text-[10px] text-muted-foreground uppercase tracking-widest">
                OU AUTENTICAR VIA PROVEDOR
              </span>
            </div>

            {/* Google OAuth Login Button */}
            <Button
              type="button"
              variant="secondary"
              onClick={handleGoogleLogin}
              disabled={isLoadingEmail || isLoadingGoogle}
              className="w-full py-5 text-xs font-bold flex items-center justify-center gap-2"
            >
              {isLoadingGoogle ? (
                <Loader2 className="size-3.5 animate-spin text-secondary" />
              ) : (
                <svg className="size-4 mr-1 text-secondary fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-6.887 4.114-4.664 0-8.487-3.85-8.487-8.52S7.577 1.474 12.24 1.474c2.25 0 4.3.79 5.92 2.217l3.142-3.142C18.665.836 15.63 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c7.118 0 11.83-5.006 11.83-12.06 0-.817-.079-1.425-.22-2.135h-11.61z" />
                </svg>
              )}
              CONECTAR COM GOOGLE
            </Button>
          </CardContent>

          <CardFooter className="pb-6 pt-2 px-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px] text-[#94a3b8] uppercase">
              <ShieldCheck className="size-3.5 text-primary" />
              CONEXÃO CRIPTOGRAFADA SSL DE PONTA A PONTA
            </div>
          </CardFooter>
        </Card>

        {/* Security Warning Notice */}
        <div className="mt-4 p-3 bg-red-950/20 border border-red-500/10 rounded flex gap-2 items-start justify-center text-[10px] text-red-400 uppercase tracking-wide">
          <AlertCircle className="size-4 shrink-0 text-red-500" />
          <span>
            Aviso: O uso de credenciais não autorizadas acionará o protocolo de bloqueio de IP.
          </span>
        </div>
      </div>
    </main>
  );
}
