/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect } from "react";

// Global tracking helper to trigger standard tracking pixels
export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window === "undefined") return;

  // Log in console for developer auditing
  console.log(`📡 [Analytics - ${eventName}]`, params || "");

  // Google Analytics 4
  if (typeof (window as any).gtag === "function") {
    (window as any).gtag("event", eventName, params);
  }

  // Meta Pixel (Facebook)
  if (typeof (window as any).fbq === "function") {
    if (eventName === "InitiateCheckout") {
      (window as any).fbq("track", "InitiateCheckout", params);
    } else if (eventName === "Purchase") {
      (window as any).fbq("track", "Purchase", params);
    } else {
      (window as any).fbq("trackCustom", eventName, params);
    }
  }

  // TikTok Pixel
  if (
    typeof (window as any).ttq === "object" &&
    typeof (window as any).ttq.track === "function"
  ) {
    (window as any).ttq.track(eventName, params);
  }
}

export function PixelTracker() {
  useEffect(() => {
    // 1. Trigger base PageView
    trackEvent("PageView", { url: window.location.pathname });

    // 2. Track Scroll Depth thresholds (25%, 50%, 75%, 90%)
    const trackedDepths = new Set<number>();

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      
      const totalScrollable = scrollHeight - clientHeight;
      if (totalScrollable <= 0) return;

      const scrollPercentage = Math.round((scrollTop / totalScrollable) * 100);

      const thresholds = [25, 50, 75, 90];
      for (const threshold of thresholds) {
        if (scrollPercentage >= threshold && !trackedDepths.has(threshold)) {
          trackedDepths.add(threshold);
          trackEvent("ScrollDepth", { 
            depth: `${threshold}%`,
            percentage: scrollPercentage 
          });
        }
      }
    };

    // Throttle scroll events slightly for performance optimization
    let scrollTimeout: NodeJS.Timeout | null = null;
    const throttledScroll = () => {
      if (!scrollTimeout) {
        scrollTimeout = setTimeout(() => {
          handleScroll();
          scrollTimeout = null;
        }, 150);
      }
    };

    window.addEventListener("scroll", throttledScroll);
    return () => {
      window.removeEventListener("scroll", throttledScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, []);

  return null; // Non-rendering component, mounts silently in layout root
}
export default PixelTracker;
