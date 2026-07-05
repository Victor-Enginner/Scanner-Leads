"use client";

import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
}

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: "Funciona na minha cidade pequena?",
      answer: "Sim, funciona perfeitamente! Desde que a sua cidade tenha negócios cadastrados no Google Maps (como padarias, oficinas, clínicas, consultórios, etc.), o radar conseguirá varrer, classificar e gerar as mensagens prontas para você abordar.",
    },
    {
      question: "Isso é legal/permitido pela LGPD?",
      answer: "Totalmente legal. O NEXUS SCAN apenas automatiza a leitura de dados públicos disponibilizados pelos próprios negócios no Google Maps. Além disso, nós não fazemos disparos em massa automatizados — que é o que viola os termos do WhatsApp. Nós te entregamos as mensagens personalizadas prontas e você faz a abordagem manual e qualificada 1 a 1.",
    },
    {
      question: "Eu preciso saber programar ou usar alguma ferramenta complexa?",
      answer: "De forma alguma. O sistema é desenhado para não-programadores. Você apenas escolhe a cidade, o nicho, efetua o pagamento da varredura e recebe tudo pronto no seu painel: a planilha Excel formatada, o relatório PDF executivo de alta conversão, as mensagens prontas para copiar e o mapa interativo.",
    },
    {
      question: "Em quanto tempo recebo os meus leads após a varredura?",
      answer: "O processamento se inicia imediatamente após a confirmação do pagamento e da definição dos parâmetros (cidade/nicho). O processamento completo e a disponibilização dos relatórios no seu painel costumam levar menos de 15 minutos.",
    },
    {
      question: "Por que eu pagaria R$ 97 se posso pesquisar de graça na mão?",
      answer: "Pode pesquisar manualmente, sim. Mas para encontrar 100 negócios, entrar em cada perfil no Maps, verificar se têm site ou redes, caçar o telefone, validar, calcular o score, formatar uma planilha e criar mensagens de WhatsApp customizadas para cada um... você gastará facilmente mais de 10 horas de trabalho manual exaustivo. O seu tempo vale mais que R$ 9,70 por hora? Ter tudo pronto por R$ 97 é o melhor investimento no seu negócio.",
    },
    {
      question: "Posso revender a lista gerada?",
      answer: "Não é permitido revender as listas brutas em plataformas públicas. As listas geradas são para uso comercial exclusivo do comprador para prospecção de clientes próprios para seus serviços digitais (sites, tráfego pago, social media).",
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full space-y-3 font-mono">
      {faqs.map((faq, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={idx}
            className={cn(
              "border rounded transition-all duration-300 bg-card/40 backdrop-blur-sm",
              isOpen ? "border-primary glow-cyan" : "border-border hover:border-primary/30"
            )}
          >
            <button
              onClick={() => toggleFAQ(idx)}
              className="w-full flex items-center justify-between p-4 text-left text-sm font-semibold uppercase tracking-wider text-foreground select-none"
            >
              <span>{faq.question}</span>
              <span className="ml-4 shrink-0 text-primary">
                {isOpen ? <Minus className="size-4 animate-in fade-in zoom-in duration-300" /> : <Plus className="size-4 animate-in fade-in zoom-in duration-300" />}
              </span>
            </button>
            <div
              className={cn(
                "overflow-hidden transition-all duration-300 text-xs text-muted-foreground leading-relaxed",
                isOpen ? "max-h-[250px] p-4 pt-0 border-t border-border/40" : "max-h-0"
              )}
            >
              <p className="font-sans pt-3 text-slate-300">{faq.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
