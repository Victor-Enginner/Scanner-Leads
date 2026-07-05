"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  Radar, 
  MapPin, 
  Target, 
  Compass, 
  Phone, 
  MessageSquare, 
  Loader2, 
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Zod Schema for input validation
const scanFormSchema = z.object({
  city: z.string().min(2, "O nome da cidade deve ter pelo menos 2 caracteres."),
  state: z.string().length(2, "Selecione a UF (estado) com 2 letras."),
  niche: z.string().min(1, "Selecione um segmento/nicho de mercado."),
  radius: z.number().min(1).max(50),
  phone: z.string().min(10, "Insira um número de telefone com DDD válido."),
  comments: z.string().optional(),
});

type ScanFormValues = z.infer<typeof scanFormSchema>;

export default function SolicitarPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ScanFormValues>({
    resolver: zodResolver(scanFormSchema),
    defaultValues: {
      city: "",
      state: "",
      niche: "",
      radius: 5,
      phone: "",
      comments: "",
    },
  });

  const selectedRadius = watch("radius");
  const selectedNiche = watch("niche");
  const selectedState = watch("state");

  const onSubmit = async (values: ScanFormValues) => {
    setIsSubmitting(true);
    try {
      console.log("[SolicitarPage] Sending scan parameters to API:", values);
      
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Erro ao solicitar varredura.");
        return;
      }

      toast.success("Varredura criada! Inicializando radar...");
      router.push(`/dashboard?scan_id=${data.scanId}&start=true`);
    } catch (err) {
      console.error("[SolicitarPage] Form submission crashed", err);
      toast.error("Ocorreu um erro no servidor. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const niches = [
    { value: "Pizzaria", label: "Pizzarias e Fornerias" },
    { value: "Dentista", label: "Dentistas e Clínicas Odontológicas" },
    { value: "Oficina Mecânica", label: "Oficinas Mecânicas e Auto Centers" },
    { value: "Salão de Beleza", label: "Salões de Beleza e Barbearias" },
    { value: "Academia", label: "Academias e Box de Crossfit" },
    { value: "Pet Shop", label: "Pet Shops e Clínicas Veterinárias" },
    { value: "Clínica de Estética", label: "Estéticas e Clínicas de Beleza" },
    { value: "Restaurante", label: "Restaurantes e Lanchonetes" },
  ];

  const states = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", 
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", 
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ];

  return (
    <main className="scanlines scanline-effect min-h-screen w-full flex flex-col justify-center items-center px-4 py-8 bg-[#04070a] font-mono">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00f0ff03_1px,transparent_1px),linear-gradient(to_bottom,#00f0ff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="w-full max-w-[550px] relative z-10 space-y-6 my-8">
        <div className="text-center">
          <h1 className="text-2xl font-black text-primary tracking-widest uppercase">
            CONFIGURAR RADAR
          </h1>
          <p className="text-xs text-muted-foreground uppercase mt-1 tracking-wider">
            Defina o alvo geográfico e o segmento da varredura
          </p>
        </div>

        <Card className="border-primary glow-cyan bg-[#070c14]/95 backdrop-blur-md">
          <CardHeader className="border-b border-primary/20 bg-primary/5 py-3.5 px-6">
            <CardTitle className="text-xs text-primary uppercase font-bold tracking-wider flex items-center gap-2">
              <Compass className="size-4 animate-spin-slow text-primary" />
              [DEFINIÇÃO DE PARÂMETROS DO SCANNER]
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-6 px-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* City & State Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                    <MapPin className="size-3 text-primary" /> Cidade Alvo
                  </label>
                  <Input
                    {...register("city")}
                    placeholder="Ex: Franca"
                    className="border-primary/20 bg-black/40 text-primary placeholder-primary/20 focus-visible:border-primary/80 focus-visible:ring-primary/20 font-mono text-xs py-4 pl-3"
                  />
                  {errors.city && <p className="text-[10px] text-red-400 font-bold uppercase">{errors.city.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Estado (UF)</label>
                  <Select 
                    value={selectedState || ""} 
                    onValueChange={(val) => setValue("state", val as string, { shouldValidate: true })}
                  >
                    <SelectTrigger className="border-primary/20 bg-black/40 text-primary focus-visible:border-primary/80 focus-visible:ring-primary/20 font-mono text-xs py-4 h-9">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#070c14] border-primary/20 text-primary font-mono text-xs">
                      {states.map((st) => (
                        <SelectItem key={st} value={st} className="hover:bg-primary/10 hover:text-white">{st}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.state && <p className="text-[10px] text-red-400 font-bold uppercase">{errors.state.message}</p>}
                </div>
              </div>

              {/* Niche select */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                  <Target className="size-3 text-primary" /> Segmento / Nicho
                </label>
                <Select 
                  value={selectedNiche || ""} 
                  onValueChange={(val) => setValue("niche", val as string, { shouldValidate: true })}
                >
                  <SelectTrigger className="border-primary/20 bg-black/40 text-primary focus-visible:border-primary/80 focus-visible:ring-primary/20 font-mono text-xs py-4 h-9">
                    <SelectValue placeholder="Selecione o nicho do negócio..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#070c14] border-primary/20 text-primary font-mono text-xs">
                    {niches.map((n) => (
                      <SelectItem key={n.value} value={n.value} className="hover:bg-primary/10 hover:text-white">{n.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.niche && <p className="text-[10px] text-red-400 font-bold uppercase">{errors.niche.message}</p>}
              </div>

              {/* Radius slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  <span>Raio de Busca</span>
                  <span className="text-primary font-bold">{selectedRadius} KM</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={selectedRadius}
                  onChange={(e) => setValue("radius", Number(e.target.value))}
                  className="w-full h-1 bg-[#0a1320] rounded-lg appearance-none cursor-pointer accent-primary border border-primary/10"
                />
              </div>

              {/* Phone Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                  <Phone className="size-3 text-primary" /> Seu WhatsApp para Notificações
                </label>
                <Input
                  {...register("phone")}
                  placeholder="Ex: 16999998888"
                  className="border-primary/20 bg-black/40 text-primary placeholder-primary/20 focus-visible:border-primary/80 focus-visible:ring-primary/20 font-mono text-xs py-4 pl-3"
                />
                {errors.phone && <p className="text-[10px] text-red-400 font-bold uppercase">{errors.phone.message}</p>}
              </div>

              {/* Optional comments */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                  <MessageSquare className="size-3 text-primary" /> Observações Operacionais (Opcional)
                </label>
                <Textarea
                  {...register("comments")}
                  placeholder="Instruções de busca específicas..."
                  className="border-primary/20 bg-black/40 text-primary placeholder-primary/20 focus-visible:border-primary/80 focus-visible:ring-primary/20 font-mono text-xs py-3 h-20"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-6 text-xs font-bold flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-primary" />
                      INICIANDO PROTOCOLO...
                    </>
                  ) : (
                    <>
                      INICIAR VARREDURA DE RADAR <Radar className="size-4 text-primary animate-pulse" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>

          <CardFooter className="pb-6 pt-2 px-6 flex flex-col items-center gap-3 border-t border-primary/5">
            <div className="flex items-center gap-2 text-[9px] text-[#94a3b8] uppercase text-center justify-center leading-relaxed">
              <ShieldAlert className="size-4 text-primary shrink-0" />
              <span>
                Varredura de teste ativa (modo desenvolvedor). Créditos simulados automaticamente.
              </span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
