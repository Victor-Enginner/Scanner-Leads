/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Radar, 
  ArrowLeft, 
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Lead {
  id: string;
  businessName: string;
  category: string;
  formattedAddress: string;
  phone: string;
  whatsappNumber: string | null;
  hasWebsite: boolean;
  opportunityScore: number;
  priority: string;
  pitchMessage: string;
  latitude: number | null;
  longitude: number | null;
}

interface Scan {
  id: string;
  city: string;
  niche: string;
  status: string;
}

function MapaContent() {
  const params = useParams();
  const router = useRouter();
  const scanId = params.id as string;

  const [loadingData, setLoadingData] = useState(true);
  const [loadingLeaflet, setLoadingLeaflet] = useState(true);
  const [scan, setScan] = useState<Scan | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);

  const mapRef = useRef<any>(null);

  // 1. Fetch scan data and coordinates
  useEffect(() => {
    const fetchScanData = async () => {
      try {
        const response = await fetch(`/api/scan/${scanId}`);
        if (response.ok) {
          const data = await response.json();
          setScan(data.scan);
          // Filter only leads that have valid coordinates
          setLeads(data.leads || []);
        } else {
          toast.error("Varredura não localizada.");
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("[MapPage] Error fetching scan", err);
        toast.error("Erro ao carregar mapa.");
      } finally {
        setLoadingData(false);
      }
    };

    if (scanId) {
      fetchScanData();
    }
  }, [scanId, router]);

  // 2. Load Leaflet CDN script and styles dynamically to bypass Next.js SSR crashes
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if Leaflet is already loaded on window
    if ((window as any).L) {
      setLoadingLeaflet(false);
      return;
    }

    // 1. Add Leaflet CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);

    // 2. Add Leaflet JS
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    script.crossOrigin = "";
    script.async = true;

    script.onload = () => {
      console.log("[MapPage] Leaflet script loaded successfully.");
      setLoadingLeaflet(false);
    };

    document.body.appendChild(script);

    return () => {
      // Clean up script if unmounted
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // 3. Initialize map once Leaflet and Data are loaded
  useEffect(() => {
    if (loadingData || loadingLeaflet || !leads.length || typeof window === "undefined") return;

    const L = (window as any).L;
    if (!L) return;

    // Filter leads that have valid coords
    const mappedLeads = leads.filter((l) => l.latitude !== null && l.longitude !== null);

    if (mappedLeads.length === 0) {
      toast.info("Nenhum lead nesta varredura possui coordenadas geográficas válidas.");
      return;
    }

    // Calculate map center (average coordinates)
    const avgLat = mappedLeads.reduce((acc, curr) => acc + (curr.latitude || 0), 0) / mappedLeads.length;
    const avgLng = mappedLeads.reduce((acc, curr) => acc + (curr.longitude || 0), 0) / mappedLeads.length;

    // Initialize map container if not already initialized
    if (!mapRef.current) {
      mapRef.current = L.map("map-container", {
        zoomControl: true,
      }).setView([avgLat, avgLng], 14);

      // Add dark-mode themed openstreetmap tile layer
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapRef.current);
    }

    // Clear existing markers if re-rendering (represented as layer groups in Leaflet)
    // For simplicity, we just add markers. Next.js lifecycle handles recreation.
    mappedLeads.forEach((lead) => {
      if (lead.latitude === null || lead.longitude === null) return;

      // Select pin color based on priority
      const pinColorClass = 
        lead.priority === "ALTA" ? "bg-red-500 shadow-[0_0_12px_#ef4444]" :
        lead.priority === "MEDIA" ? "bg-amber-500 shadow-[0_0_12px_#f59e0b]" :
        "bg-slate-500 shadow-[0_0_8px_#64748b]";

      // Custom neon styled indicator pin
      const customIcon = L.divIcon({
        className: "custom-div-icon",
        html: `<div class="${pinColorClass} w-3.5 h-3.5 rounded-full border-2 border-[#04070a] transform hover:scale-125 transition-transform duration-200"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      // Prepare Whatsapp direct links
      const waLink = lead.whatsappNumber ? `https://wa.me/${lead.whatsappNumber}` : "#";

      // Popup HTML with embedded click triggers for copywriting clipboard copies
      const popupHtml = `
        <div class="font-mono text-[11px] text-slate-300 bg-[#070c14] border border-primary/20 rounded p-3 max-w-[230px] space-y-2.5">
          <div class="border-b border-primary/10 pb-1.5">
            <h4 class="font-bold text-slate-100 uppercase truncate">${lead.businessName}</h4>
            <span class="text-[9px] text-primary uppercase font-bold tracking-wider">${lead.category}</span>
          </div>
          <div class="space-y-1">
            <p>Score: <span class="font-bold text-primary">${lead.opportunityScore} PTS</span></p>
            <p class="text-[9px] text-slate-400 leading-normal truncate">${lead.formattedAddress}</p>
          </div>
          <div class="pt-1.5 flex gap-2 border-t border-primary/5">
            <button onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(lead.pitchMessage)}')).then(() => alert('Mensagem copiada para a Área de Transferência!'))" class="bg-primary text-slate-950 font-bold px-2 py-1.5 rounded text-[9px] uppercase cursor-pointer hover:bg-primary/90 flex-1 text-center font-mono">
              Copiar Copy
            </button>
            ${lead.whatsappNumber ? `
              <a href="${waLink}" target="_blank" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-1.5 rounded text-[9px] uppercase text-center font-mono flex items-center justify-center gap-1">
                WhatsApp
              </a>
            ` : ""}
          </div>
        </div>
      `;

      // Instantiate Leaflet marker and bind popup
      L.marker([lead.latitude, lead.longitude], { icon: customIcon })
        .addTo(mapRef.current)
        .bindPopup(popupHtml, {
          closeButton: false,
          className: "cyberpunk-leaflet-popup"
        });
    });

  }, [loadingData, loadingLeaflet, leads]);

  const isLoading = loadingData || loadingLeaflet;

  return (
    <div className="min-h-screen bg-[#04070a] font-mono flex flex-col relative text-slate-300">
      {/* Dynamic Leaflet Popup custom global overrides */}
      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          background: #070c14 !important;
          border: 1px solid rgba(0, 240, 255, 0.2) !important;
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.1) !important;
          border-radius: 4px !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          line-height: inherit !important;
        }
        .leaflet-popup-tip {
          background: #070c14 !important;
          border: 1px solid rgba(0, 240, 255, 0.2) !important;
        }
      `}</style>

      {/* Header toolbar */}
      <header className="border-b border-border bg-[#070c14]/90 py-3 px-6 flex items-center justify-between z-30 absolute top-0 left-0 right-0 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => router.push("/dashboard")} 
            variant="ghost" 
            size="xs"
            className="h-8 font-mono text-[10px]"
          >
            <ArrowLeft className="size-3.5 mr-1" /> Painel
          </Button>
          <span className="hidden sm:inline text-slate-500">|</span>
          <span className="text-xs font-black text-primary tracking-widest uppercase flex items-center gap-1">
            <Radar className="size-3.5 animate-pulse text-primary" /> 
            MAPA // {scan?.niche} em {scan?.city}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          <div className="flex items-center gap-1">
            <div className="size-2.5 rounded-full bg-red-500" /> <span>Alta</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="size-2.5 rounded-full bg-amber-500" /> <span>Média</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="size-2.5 rounded-full bg-slate-500" /> <span>Baixa</span>
          </div>
        </div>
      </header>

      {/* Loading Splash */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#04070a]/95 flex flex-col items-center justify-center z-40 gap-3 text-xs text-primary">
          <Loader2 className="size-8 animate-spin" />
          <span>PLOTAÇÃO DAS COORDENADAS DO MAPS...</span>
        </div>
      )}

      {/* Leaflet container */}
      <div className="flex-1 w-full h-full pt-14 relative z-10">
        <div id="map-container" className="w-full h-[calc(100vh-56px)] bg-[#04070a]" />
      </div>
    </div>
  );
}

export default function MapaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#04070a] flex items-center justify-center font-mono text-primary text-xs gap-3">
        <Loader2 className="size-8 animate-spin" />
        <span>INICIALIZANDO MAPAS GEOGRÁFICOS...</span>
      </div>
    }>
      <MapaContent />
    </Suspense>
  );
}
