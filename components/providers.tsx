"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster 
        theme="dark" 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: "#070c14",
            borderColor: "#1e293b",
            color: "#e2e8f0",
            fontFamily: "var(--font-geist-mono), monospace",
          },
        }}
      />
    </SessionProvider>
  );
}
