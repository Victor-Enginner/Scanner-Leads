/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { 
  motion, 
  AnimatePresence, 
  useScroll, 
  useSpring, 
  useTransform, 
  useMotionTemplate 
} from "framer-motion";
import { 
  Loader2, 
  MapPin, 
  Target, 
  Sparkles, 
  Database,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PixelTracker, trackEvent } from "@/components/landing/pixel-tracker";
import {
  CHECKOUT_URL,
  PRODUCT_NAME,
  PRODUCT_PRICE,
  CTA_PRIMARY,
  SUPPORT_WHATSAPP_URL,
} from "@/lib/constants";

// -----------------------------------------------------------------
// 1. Text Animation Component: ScrambleIn (Entrance reveal)
// -----------------------------------------------------------------
function ScrambleIn({ text, delay, triggered }: { text: string; delay: number; triggered: boolean }) {
  const [displayedText, setDisplayedText] = useState("");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~|}{[]:;?><";

  useEffect(() => {
    if (!triggered) {
      setDisplayedText("");
      return;
    }

    const timeoutId = setTimeout(() => {
      let cursor = 0;
      const intervalId = setInterval(() => {
        cursor += 0.5;
        let result = "";
        for (let i = 0; i < text.length; i++) {
          if (text[i] === " ") {
            result += " ";
          } else if (i < cursor) {
            result += text[i];
          } else if (i < cursor + 3) {
            result += chars[Math.floor(Math.random() * chars.length)];
          } else {
            result += "";
          }
        }
        setDisplayedText(result);

        if (cursor >= text.length) {
          clearInterval(intervalId);
          setDisplayedText(text);
        }
      }, 25);

      return () => clearInterval(intervalId);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [triggered, text, delay]);

  return <span>{displayedText || "\u00A0"}</span>;
}

// -----------------------------------------------------------------
// 2. Text Animation Component: ScrambleText (Hover-driven)
// -----------------------------------------------------------------
function ScrambleText({ text, isHovered, className }: { text: string; isHovered: boolean; className?: string }) {
  const [displayedText, setDisplayedText] = useState(text);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~|}{[]:;?><";

  useEffect(() => {
    if (!isHovered) {
      setDisplayedText(text);
      return;
    }

    let cursor = 0;
    const intervalId = setInterval(() => {
      cursor += 0.25; // 4 frames per character
      let result = "";
      for (let i = 0; i < text.length; i++) {
        if (text[i] === " ") {
          result += " ";
        } else if (i < cursor) {
          result += text[i];
        } else {
          result += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      setDisplayedText(result);

      if (cursor >= text.length) {
        clearInterval(intervalId);
        setDisplayedText(text);
      }
    }, 25);

    return () => clearInterval(intervalId);
  }, [isHovered, text]);

  return <span className={className}>{displayedText}</span>;
}

// -----------------------------------------------------------------
// 3. SVG Logo: NexusScanLogo (4-fold rotationally symmetric shape)
// -----------------------------------------------------------------
function NexusScanLogo({ className = "size-5" }: { className?: string }) {
  const pathData = "M 1.5,23 L 1.5,33 C 1.5,38.5 6,43 11.5,43 L 16.5,43 C 22,43 26.5,38.5 26.5,33 Q 28,28 33,26.5 C 38.5,26.5 43,22 43,16.5 L 43,11.5 C 43,6 38.5,1.5 33,1.5 L 23,1.5 Q 12,12 1.5,23 Z";
  return (
    <svg viewBox="-50 -50 100 100" className={className} fill="currentColor">
      <path d={pathData} transform="rotate(0)" />
      <path d={pathData} transform="rotate(90)" />
      <path d={pathData} transform="rotate(180)" />
      <path d={pathData} transform="rotate(270)" />
    </svg>
  );
}

// -----------------------------------------------------------------
// 4. Hamburger Component: SquashHamburger
// -----------------------------------------------------------------
function SquashHamburger({ isOpen }: { isOpen: boolean }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
  }, []);

  const width = isMobile ? 15 : 18;
  const height = isMobile ? 10 : 12;
  const barHeight = isMobile ? 1.2 : 1.5;

  return (
    <div style={{ width, height }} className="relative flex flex-col justify-between cursor-pointer">
      <motion.span
        animate={isOpen ? { rotate: 45, y: (height - barHeight) / 2 } : { rotate: 0, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{ height: barHeight, width }}
        className="absolute top-0 left-0 bg-white origin-center"
      />
      <motion.span
        animate={isOpen ? { opacity: 0, scale: 0 } : { opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{ height: barHeight, width, y: (height - barHeight) / 2 }}
        className="absolute left-0 bg-white"
      />
      <motion.span
        animate={isOpen ? { rotate: -45, y: -(height - barHeight) / 2 } : { rotate: 0, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{ height: barHeight, width }}
        className="absolute bottom-0 left-0 bg-white origin-center"
      />
    </div>
  );
}

// -----------------------------------------------------------------
// MAIN COMPONENT: LandingPageContent
// -----------------------------------------------------------------
function LandingPageContent() {
  const router = useRouter();

  // Section references for scroll
  const section2Ref = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLDivElement>(null);
  const section4Ref = useRef<HTMLDivElement>(null);

  // States
  const [entranceComplete, setEntranceComplete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);
  const [menuButtonHovered, setMenuButtonHovered] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);
  const [link1Hovered, setLink1Hovered] = useState(false);
  const [link2Hovered, setLink2Hovered] = useState(false);
  const [link3Hovered, setLink3Hovered] = useState(false);
  
  // Mobile layout state
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Entrance timing
  useEffect(() => {
    const timer = setTimeout(() => {
      setEntranceComplete(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Mouse-scrub video seeks logic
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const targetTimeRef = useRef(0);
  const currentTimeRef = useRef(0);

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return;

    // Detect touch-only/mobile devices to prevent seek lag
    const isTouchDevice = () => {
      if (typeof window === "undefined") return false;
      return ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
    };

    if (isTouchDevice()) {
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.preload = "auto";
      video.play().catch((err) => console.log("Video autoPlay failed on touch device", err));
      return;
    }

    // Force load the metadata so video.duration is populated
    video.load();

    const handleMouseMove = (e: MouseEvent) => {
      if (!video.duration) return;
      const fraction = e.clientX / window.innerWidth;
      const sensitivity = 0.8;
      targetTimeRef.current = video.duration * fraction * sensitivity;
    };

    let animationFrameId: number;
    let localSeeking = false;

    const handleSeeking = () => { localSeeking = true; };
    const handleSeeked = () => { localSeeking = false; };

    video.addEventListener("seeking", handleSeeking);
    video.addEventListener("seeked", handleSeeked);

    const updateVideoTime = () => {
      if (video.duration) {
        // LERP: smooth calculation to follow the target time
        const diff = targetTimeRef.current - currentTimeRef.current;
        
        if (Math.abs(diff) > 0.01) {
          currentTimeRef.current += diff * 0.08; // 0.08 multiplier for fluid lag-free ease-out
          
          if (currentTimeRef.current < 0) currentTimeRef.current = 0;
          if (currentTimeRef.current > video.duration) currentTimeRef.current = video.duration;

          // Only seek if the decoder has completed the previous seek event
          if (!localSeeking) {
            video.currentTime = currentTimeRef.current;
          }
        }
      }
      animationFrameId = requestAnimationFrame(updateVideoTime);
    };

    window.addEventListener("mousemove", handleMouseMove);
    animationFrameId = requestAnimationFrame(updateVideoTime);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      video.removeEventListener("seeking", handleSeeking);
      video.removeEventListener("seeked", handleSeeked);
    };
  }, []);

  // Cinematic Statement (Section 2) Scroll interpolation
  const { scrollYProgress: section2Scroll } = useScroll({
    target: section2Ref,
    offset: ["start end", "end start"],
  });

  const smoothSection2Progress = useSpring(section2Scroll, {
    stiffness: 15,
    damping: 32,
    mass: 1.8,
  });

  const yScaleValue = useTransform(smoothSection2Progress, [0, 1], [60, -120]);
  const opacityValue = useTransform(section2Scroll, [0.3, 0.5], [0, 1]);
  const transformTemplate = useMotionTemplate`rotateX(24deg) translateY(${yScaleValue}px) translateZ(15px)`;

  // Event handlers
  const handleScrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    setMenuOpen(false);
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleCheckoutClick = (location: string) => {
    trackEvent("InitiateCheckout", { 
      product: PRODUCT_NAME,
      price: PRODUCT_PRICE,
      location: location 
    });
    window.location.href = CHECKOUT_URL;
  };

  return (
    <div className="relative w-full overflow-hidden bg-black text-white selection:bg-white selection:text-black" style={{ fontFamily: '"Space Mono", monospace' }}>
      <PixelTracker />

      {/* ================================================================= */}
      {/* GLOBAL FIXED NAVBAR (z-50)                                        */}
      {/* ================================================================= */}
      <AnimatePresence>
        {entranceComplete && (
          <motion.nav 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed top-0 left-0 w-full h-20 flex items-center justify-between px-6 sm:px-10 z-50 pointer-events-none"
          >
            {/* Left Brand Area */}
            <div className="flex items-center gap-2 pointer-events-auto">
              {/* Logo Pill */}
              <motion.div
                onHoverStart={() => setLogoHovered(true)}
                onHoverEnd={() => setLogoHovered(false)}
                onClick={() => handleScrollTo({ current: document.body } as any)}
                animate={menuOpen && isMobile ? { width: 0, opacity: 0, paddingLeft: 0, paddingRight: 0 } : { width: "auto", opacity: 1 }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.22)" }}
                whileTap={{ scale: 0.98 }}
                className="h-9 sm:h-12 px-4 sm:px-5 bg-white/15 backdrop-blur-md rounded-[10px] sm:rounded-[14px] flex items-center gap-2 cursor-pointer border border-white/5 select-none shrink-0 overflow-hidden"
              >
                <NexusScanLogo className="size-4 sm:size-5 text-white" />
                <span className="text-[12px] sm:text-[16px] font-bold tracking-tight text-white uppercase font-mono">
                  <ScrambleText text="NEXUS SCAN" isHovered={logoHovered} />
                </span>
              </motion.div>

              {/* Expanding Menu Pill */}
              <motion.div
                animate={{ width: menuOpen ? (isMobile ? "100%" : 290) : (isMobile ? 36 : 48) }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                className="h-9 sm:h-12 bg-white/15 backdrop-blur-md rounded-[10px] sm:rounded-[14px] flex items-center relative border border-white/5 overflow-hidden"
              >
                {/* Hamburger container */}
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  onMouseEnter={() => setMenuButtonHovered(true)}
                  onMouseLeave={() => setMenuButtonHovered(false)}
                  className={`flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                    menuOpen 
                      ? "size-7 sm:size-9 rounded-[7px] sm:rounded-[11px] bg-white/10 hover:bg-white/20 ml-1.5" 
                      : "size-9 sm:size-12 rounded-[10px] sm:rounded-[14px]"
                  }`}
                >
                  <SquashHamburger isOpen={menuOpen} />
                </button>

                {/* Animated Links inside Expanding Pill */}
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 15 }}
                      transition={{ duration: 0.2, delay: 0.1 }}
                      className="flex items-center gap-4 ml-4 pr-6 shrink-0"
                    >
                      <button
                        onMouseEnter={() => setLink1Hovered(true)}
                        onMouseLeave={() => setLink1Hovered(false)}
                        onClick={() => handleScrollTo(section2Ref)}
                        className="text-[12px] sm:text-[14px] font-normal text-white/85 hover:text-white cursor-pointer"
                      >
                        <ScrambleText text="ABOUT" isHovered={link1Hovered} />
                      </button>
                      <button
                        onMouseEnter={() => setLink2Hovered(true)}
                        onMouseLeave={() => setLink2Hovered(false)}
                        onClick={() => handleScrollTo(section3Ref)}
                        className="text-[12px] sm:text-[14px] font-normal text-white/85 hover:text-white cursor-pointer"
                      >
                        <ScrambleText text="METRICS" isHovered={link2Hovered} />
                      </button>
                      <button
                        onMouseEnter={() => setLink3Hovered(true)}
                        onMouseLeave={() => setLink3Hovered(false)}
                        onClick={() => handleScrollTo(section4Ref)}
                        className="text-[12px] sm:text-[14px] font-normal text-white/85 hover:text-white cursor-pointer"
                      >
                        <ScrambleText text="TECH" isHovered={link3Hovered} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Right Action Area */}
            <div className="flex items-center gap-3 pointer-events-auto shrink-0">
              <motion.button
                onHoverStart={() => setBtnHovered(true)}
                onHoverEnd={() => setBtnHovered(false)}
                onClick={() => handleCheckoutClick("Navbar Button")}
                whileHover={{ scale: 1.03, backgroundColor: "#e2e2e6" }}
                whileTap={{ scale: 0.97 }}
                className="h-9 sm:h-12 px-5 sm:px-7 bg-white text-black rounded-full flex items-center justify-center cursor-pointer select-none font-bold"
              >
                <span className="text-[10px] sm:text-[13px] tracking-wide uppercase font-mono">
                  <ScrambleText text="ADQUIRIR" isHovered={btnHovered} />
                </span>
              </motion.button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* ================================================================= */}
      {/* SECTION 1: HERO (Video scrubbing on mousemove)                    */}
      {/* ================================================================= */}
      <section className="relative h-screen h-[100dvh] w-full flex flex-col justify-end overflow-hidden z-10">
        
        {/* Background video #1: paused, scrubbed by mouse */}
        <video 
          ref={heroVideoRef}
          playsInline
          muted
          loop
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
        >
          <source 
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_083515_290e5a10-0b95-41af-a5e2-32b6389baa4d.mp4" 
            type="video/mp4" 
          />
        </video>

        {/* 24x24 Dot Grid Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            opacity: 0.05
          }}
        />

        {/* Display Watermark Background Title (Anton SC) */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none z-10 leading-none tracking-[-0.04em] uppercase text-center w-full"
          style={{ 
            fontFamily: '"Anton SC", sans-serif',
            fontSize: "clamp(80px, 24vw, 420px)",
            opacity: 0.10,
          }}
        >
          <span 
            className="text-transparent"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(142,127,148,0) 0%, #8E7F94 70%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text"
            }}
          >
            RADAR INTEL
          </span>
        </div>

        {/* Foreground Content */}
        <AnimatePresence>
          {entranceComplete && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.0 }}
              className="relative w-full max-w-7xl mx-auto px-6 sm:px-10 pb-12 sm:pb-16 z-20"
            >
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
                
                {/* Left side: Heading & Description */}
                <div className="flex flex-col gap-4 max-w-xl">
                  <h1 className="text-white font-light leading-[0.95] tracking-[-0.03em] text-[clamp(32px,8vw,80px)] uppercase">
                    <ScrambleIn text="LOCAL" delay={200} triggered={entranceComplete} />
                    <br />
                    <ScrambleIn text="PROSPECTING" delay={500} triggered={entranceComplete} />
                  </h1>
                  
                  <motion.p 
                    initial={{ y: 25, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ 
                      duration: 0.9, 
                      delay: 0.2, 
                      ease: [0.215, 0.610, 0.355, 1.000] 
                    }}
                    className="text-[12px] sm:text-[14px] text-white/60 leading-relaxed max-w-md"
                  >
                    Desenvolvido na intersecção entre inteligência de dados locais e automação de funil. O Nexus Scan varre o Google Places da sua cidade em minutos, identifica digital gaps e gera abordagens personalizadas.
                  </motion.p>
                </div>

                {/* Right side: Secondary Scrambled Title */}
                <div className="flex flex-col gap-1 text-left md:text-right shrink-0">
                  <h2 className="text-white font-light leading-[0.95] tracking-[-0.03em] text-[clamp(32px,8vw,80px)] uppercase">
                    <ScrambleIn text="ONE" delay={700} triggered={entranceComplete} />
                    <br />
                    <ScrambleIn text="RADAR" delay={1000} triggered={entranceComplete} />
                  </h2>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ================================================================= */}
      {/* SECTION 2: CINEMATIC 3D PERSPECTIVE STATEMENT                     */}
      {/* ================================================================= */}
      <section 
        ref={section2Ref}
        className="relative h-screen h-[100dvh] w-full flex items-center justify-center overflow-hidden z-20 bg-black"
        style={{ perspective: "400px" }}
      >
        {/* Background video #2: autoplay, muted, loop */}
        <video 
          autoPlay
          playsInline
          muted
          loop
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 opacity-40"
        >
          <source 
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_092455_089c54f8-3b03-4966-9df1-e9746063d0ef.mp4" 
            type="video/mp4" 
          />
        </video>

        {/* Top Gradient Overlay to blend with Hero */}
        <div className="absolute top-0 left-0 w-full h-[180px] bg-gradient-to-b from-black to-transparent pointer-events-none z-10" />

        {/* 3D Rotated Statement text */}
        <motion.div
          style={{
            transform: transformTemplate,
            opacity: opacityValue
          }}
          className="relative max-w-5xl px-6 sm:px-12 text-center pointer-events-none z-20"
        >
          <p className="font-sans font-normal text-[20px] sm:text-[28px] md:text-[34px] lg:text-[40px] text-white leading-[1.35] tracking-[-0.02em] select-none">
            Um motor de prospecção automatizada baseado no mapeamento geográfico de mercados locais. O Nexus Scan traduz dados do Google Places em inteligência de agência. Cada oportunidade torna-se mensurável, estruturada e visível. Ruídos biológicos são filtrados em padrões de fechamento eficientes.
          </p>
        </motion.div>
      </section>

      {/* ================================================================= */}
      {/* SECTION 3: METRICS DATA GRID                                      */}
      {/* ================================================================= */}
      <section 
        ref={section3Ref}
        className="relative min-h-screen w-full flex items-center justify-center bg-black z-20 py-32"
      >
        {/* Background video #3: autoplay, muted, loop */}
        <video 
          autoPlay
          playsInline
          muted
          loop
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 opacity-30"
        >
          <source 
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_095810_ecea3dd2-fc5e-4e41-8696-4219290b6589.mp4" 
            type="video/mp4" 
          />
        </video>

        {/* Foreground Content */}
        <div className="relative max-w-6xl w-full mx-auto px-6 sm:px-10 z-10 flex flex-col items-center">
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1.2 }}
            className="text-white/40 text-[11px] sm:text-[13px] tracking-[0.2em] uppercase mb-20 text-center"
          >
            Performance Metrics
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-12 w-full text-center">
            
            {/* Metric 1 */}
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <span className="text-white text-[clamp(44px,8vw,80px)] font-light tracking-[-0.04em] leading-none">
                2.4s
              </span>
              <span className="text-white/40 text-[12px] sm:text-[14px] mt-4 tracking-wide font-mono uppercase">
                Latência de Varredura
              </span>
            </motion.div>

            {/* Metric 2 */}
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.25 }}
              className="flex flex-col items-center"
            >
              <span className="text-white text-[clamp(44px,8vw,80px)] font-light tracking-[-0.04em] leading-none">
                99.7%
              </span>
              <span className="text-white/40 text-[12px] sm:text-[14px] mt-4 tracking-wide font-mono uppercase">
                Acurácia de Mapeamento
              </span>
            </motion.div>

            {/* Metric 3 */}
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col items-center"
            >
              <span className="text-white text-[clamp(44px,8vw,80px)] font-light tracking-[-0.04em] leading-none">
                140K
              </span>
              <span className="text-white/40 text-[12px] sm:text-[14px] mt-4 tracking-wide font-mono uppercase">
                Empresas Auditadas
              </span>
            </motion.div>

          </div>

          {/* Pricing Trigger Widget */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.5 }}
            className="mt-28 flex flex-col items-center gap-4 text-center border border-white/10 bg-black/60 backdrop-blur-md p-6 max-w-md w-full"
          >
            <span className="text-[12px] tracking-widest text-white/50 uppercase">Plano Acesso Vitalício</span>
            <span className="text-2xl font-bold text-white">R$ {PRODUCT_PRICE}</span>
            <Button
              onClick={() => handleCheckoutClick("Metrics Widget")}
              className="w-full text-xs bg-white text-black font-bold uppercase tracking-wider"
            >
              {CTA_PRIMARY}
            </Button>
          </motion.div>

        </div>
      </section>

      {/* ================================================================= */}
      {/* SECTION 4: ADAPTIVE PROSPECTING / TECHNOLOGY                      */}
      {/* ================================================================= */}
      <section 
        ref={section4Ref}
        className="relative h-screen h-[100dvh] w-full flex flex-col justify-between overflow-hidden bg-black z-20 px-8 sm:px-12 md:px-16 py-12 sm:py-16"
      >
        {/* Background video #4: autoplay, muted, loop */}
        <video 
          autoPlay
          playsInline
          muted
          loop
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 opacity-35"
        >
          <source 
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_095750_32a52ce0-2005-45c9-9093-41f03fde9530.mp4" 
            type="video/mp4" 
          />
        </video>

        {/* Top Area */}
        <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-start gap-6 pt-16">
          <motion.h2 
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1.0 }}
            className="text-white font-light text-[clamp(28px,6vw,60px)] leading-[0.95] tracking-[-0.03em] uppercase"
          >
            ADAPTIVE
            <br />
            PROSPECTING
          </motion.h2>

          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.0, delay: 0.2 }}
            className="text-white/50 text-[12px] sm:text-[14px] leading-relaxed max-w-xs md:text-right md:pt-2"
          >
            O sistema mapeia o ecossistema digital da sua cidade em segundos. A partir daí, cada deficiência comercial é isolada e convertida em pitch.
          </motion.p>
        </div>

        {/* Bottom Technology Pillars */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 1.0, delay: 0.3 }}
          className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6 pb-4"
        >
          {/* Pillar 1 */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="flex flex-col"
          >
            <h3 className="text-white text-[13px] sm:text-[15px] font-normal mb-2 flex items-center gap-1.5 font-bold uppercase">
              <MapPin className="size-3.5 text-white" /> Cortical Map
            </h3>
            <p className="text-white/40 text-[11px] sm:text-[13px] leading-relaxed">
              Mapeamento geográfico em tempo real de negócios e gaps de site na sua região.
            </p>
          </motion.div>

          {/* Pillar 2 */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex flex-col"
          >
            <h3 className="text-white text-[13px] sm:text-[15px] font-normal mb-2 flex items-center gap-1.5 font-bold uppercase">
              <Target className="size-3.5 text-white" /> Isolation
            </h3>
            <p className="text-white/40 text-[11px] sm:text-[13px] leading-relaxed">
              Separação de clientes quentes sem presença online de grandes marcas consolidadas.
            </p>
          </motion.div>

          {/* Pillar 3 */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col"
          >
            <h3 className="text-white text-[13px] sm:text-[15px] font-normal mb-2 flex items-center gap-1.5 font-bold uppercase">
              <Sparkles className="size-3.5 text-white" /> Prediction
            </h3>
            <p className="text-white/40 text-[11px] sm:text-[13px] leading-relaxed">
              Score preditivo de interesse baseando-se no volume de buscas locais da categoria.
            </p>
          </motion.div>

          {/* Pillar 4 */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="flex flex-col"
          >
            <h3 className="text-white text-[13px] sm:text-[15px] font-normal mb-2 flex items-center gap-1.5 font-bold uppercase">
              <Database className="size-3.5 text-white" /> AI Copywriter
            </h3>
            <p className="text-white/40 text-[11px] sm:text-[13px] leading-relaxed">
              Geração de templates de WhatsApp customizados com foco nas falhas do prospecto.
            </p>
          </motion.div>
        </motion.div>

      </section>

      {/* ================================================================= */}
      {/* SECTION 5: ARCHITECTURE LAYERS (Pure Black)                       */}
      {/* ================================================================= */}
      <section className="relative min-h-screen w-full flex items-center justify-center bg-black z-20 py-32">
        <div className="max-w-3xl w-full mx-auto px-6 text-center">
          
          {/* Header Block */}
          <motion.div 
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.0 }}
            className="space-y-6"
          >
            <span className="text-white/40 text-[11px] sm:text-[13px] tracking-[0.2em] uppercase font-mono block">
              ARCHITECTURE
            </span>
            <h2 className="text-white font-light text-[clamp(24px,5vw,50px)] leading-[1.15] tracking-[-0.02em] uppercase">
              Três camadas.
              <br />
              Zero fricção.
            </h2>
            <p className="text-white/45 text-[13px] sm:text-[15px] leading-relaxed max-w-xl mx-auto font-mono">
              O módulo Crawler extrai os dados do Maps. O módulo Auditor isola as lacunas. O módulo Copywriter entrega pitches de alta conversão direto no console.
            </p>
          </motion.div>

          {/* Architecture Cards Stack */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.2, delay: 0.4 }}
            className="mt-20 flex flex-col items-center gap-4 w-full"
          >
            {/* Card 1 */}
            <div className="max-w-md w-full h-[72px] border border-white/10 rounded-none bg-[#0c0c0e]/50 backdrop-blur flex items-center justify-between px-6">
              <span className="text-white/30 text-[11px] tracking-[0.15em] uppercase font-mono">Layer 01</span>
              <span className="text-white text-[14px] sm:text-[16px] font-bold uppercase tracking-wider font-mono">CRAWL</span>
            </div>

            {/* Card 2 */}
            <div className="max-w-md w-full h-[72px] border border-white/10 rounded-none bg-[#0c0c0e]/50 backdrop-blur flex items-center justify-between px-6">
              <span className="text-white/30 text-[11px] tracking-[0.15em] uppercase font-mono">Layer 02</span>
              <span className="text-white text-[14px] sm:text-[16px] font-bold uppercase tracking-wider font-mono">AUDIT</span>
            </div>

            {/* Card 3 */}
            <div className="max-w-md w-full h-[72px] border border-white/10 rounded-none bg-[#0c0c0e]/50 backdrop-blur flex items-center justify-between px-6">
              <span className="text-white/30 text-[11px] tracking-[0.15em] uppercase font-mono">Layer 03</span>
              <span className="text-white text-[14px] sm:text-[16px] font-bold uppercase tracking-wider font-mono">CONVERT</span>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ================================================================= */}
      {/* SECTION 6: FOUNDER PROFILE DOSSIER (Pure Black)                   */}
      {/* ================================================================= */}
      <section 
        className="relative min-h-screen w-full flex items-center justify-center bg-black z-20 py-32 border-t border-white/10"
      >
        <div className="max-w-4xl w-full mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          
          {/* Left Block: Dossier Header */}
          <motion.div 
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.0 }}
            className="space-y-6"
          >
            <span className="text-white/40 text-[11px] sm:text-[13px] tracking-[0.2em] uppercase font-mono block">
              OPERATOR PROFILE // FOUNDER NODE
            </span>
            <h2 className="text-white font-light text-[clamp(28px,5vw,48px)] leading-[1.15] tracking-[-0.02em] uppercase">
              VICTOR BORSARI
            </h2>
            
            <div className="border border-white/10 p-5 space-y-4 font-mono text-[11px] sm:text-[12px] uppercase text-white/50 bg-[#0c0c0e]/30">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>ORIGEM:</span>
                <span className="text-white font-bold">FRANCA - SP // INTERIOR</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>CARGO:</span>
                <span className="text-white font-bold">AI ENGINEER / AGENTS DEV</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>CREDENCIAIS:</span>
                <span className="text-white font-bold">4X CERTIFICADOS EM IA</span>
              </div>
            </div>
          </motion.div>

          {/* Right Block: Dossier Description & Connect */}
          <motion.div 
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.0, delay: 0.2 }}
            className="space-y-8"
          >
            <p className="text-white/45 text-[13px] sm:text-[15px] leading-relaxed font-mono">
              Construindo a próxima geração de soluções inteligentes que conectam automação clássica e agentes generativos autônomos. Morador de Franca - SP, atua liderando a arquitetura do Nexus Scan para aproximar tecnologia de ponta de negócios reais.
            </p>

            <div className="pt-2">
              <motion.a 
                href="https://www.linkedin.com/in/victor-borsari-7216b6408/"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-6 py-4 border border-white/10 hover:border-white/30 bg-[#0c0c0e]/60 hover:bg-[#0c0c0e]/100 text-white font-bold text-xs uppercase tracking-wider font-mono"
              >
                <i className="bi bi-linkedin text-sm text-white/70" />
                CONECTAR NO LINKEDIN
              </motion.a>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ================================================================= */}
      {/* FOOTER LAYER (Half video / Half form grid)                        */}
      {/* ================================================================= */}
      <footer className="relative bg-black z-20 border-t border-white/10 w-full overflow-hidden">
        <div className="flex flex-col md:flex-row min-h-[400px]">
          
          {/* Left panel: Video #5 */}
          <div className="w-full md:w-1/2 h-[300px] md:h-auto relative overflow-hidden">
            <video 
              autoPlay
              playsInline
              muted
              loop
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
            >
              <source 
                src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_080203_fd7f4f85-3a86-4837-8192-85e7bfe68e75.mp4" 
                type="video/mp4" 
              />
            </video>
          </div>

          {/* Right panel: Description & Copy */}
          <div className="w-full md:w-1/2 flex flex-col justify-between p-10 sm:p-16 bg-[#0c0c0e]">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <NexusScanLogo className="size-5 text-white/70" />
                <span className="text-[14px] font-bold text-white/70 tracking-tight font-mono">NEXUS SCAN</span>
              </div>
              
              <p className="text-white/40 text-[13px] sm:text-[14px] leading-relaxed max-w-sm font-mono">
                A próxima evolução da prospecção local de clientes. Desenvolvido para freelancers e agências que recusam ser limitados por cold mails manuais.
              </p>

              <div className="pt-2">
                <a 
                  href={SUPPORT_WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-white/5 hover:border-white/20 bg-black/40 hover:bg-black/80 text-[10px] sm:text-[11px] text-white/60 hover:text-white transition-colors uppercase tracking-widest font-mono"
                >
                  <i className="bi bi-whatsapp text-[12px] text-emerald-400" />
                  SUPORTE WHATSAPP
                </a>
              </div>
            </div>

            <div className="text-white/25 text-[11px] mt-12 font-mono uppercase">
              &copy; 2026 Nexus Scan Labs. All rights reserved.
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center font-mono text-white text-xs gap-3">
        <Loader2 className="size-8 animate-spin" />
        <span>CONECTANDO COM O RADAR FUTURISTA...</span>
      </div>
    }>
      <LandingPageContent />
    </Suspense>
  );
}
