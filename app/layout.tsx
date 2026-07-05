import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "NEXUS SCAN — Encontre clientes de site na sua cidade",
  description: "O NEXUS SCAN varre o Google Maps da sua cidade em minutos, encontra negócios sem site e entrega a mensagem de WhatsApp personalizada pronta para abordar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="pt-BR" 
      className={cn("dark scroll-smooth", geistSans.variable, geistMono.variable)} 
      style={{ colorScheme: "dark" }}
    >
      <body
        className="antialiased bg-[#04070a] text-[#e2e8f0] min-h-screen selection:bg-[#00f0ff]/30 selection:text-white"
        style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
