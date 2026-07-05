export interface PresenceResult {
  isResponsive: boolean;
  title?: string;
  description?: string;
  isPlaceholder: boolean;
  hasInstagram: boolean;
  hasFacebook: boolean;
  instagramUrl?: string;
  facebookUrl?: string;
}

export class DigitalPresenceChecker {
  /**
   * Pings a URL and inspects response codes and meta headers to verify it's responsive.
   * Scans page body to search for linked social profiles (Instagram/Facebook).
   */
  static async checkWebsite(url: string): Promise<PresenceResult> {
    if (!url) {
      return { isResponsive: false, isPlaceholder: false, hasInstagram: false, hasFacebook: false };
    }

    // Standardize URL protocol
    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `http://${targetUrl}`;
    }

    try {
      // Fetch with timeout to prevent serverless hang
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const res = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      clearTimeout(id);

      if (!res.ok) {
        return { isResponsive: false, isPlaceholder: false, hasInstagram: false, hasFacebook: false };
      }

      const html = await res.text();
      
      // Extract page title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : undefined;

      // Extract meta description
      const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) || 
                          html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
      const description = descMatch ? descMatch[1].trim() : undefined;

      // Check for placeholder keywords (common domain parking templates)
      const placeholderKeywords = [
        "domain is for sale",
        "comprar este domínio",
        "domain parking",
        "go daddy",
        "hostgator",
        "under construction",
        "em construção",
        "site em manutenção",
      ];
      const htmlLower = html.toLowerCase();
      const isPlaceholder = placeholderKeywords.some((kw) => htmlLower.includes(kw)) ||
                            (title && placeholderKeywords.some((kw) => title.toLowerCase().includes(kw)));

      // Discover linked Instagram/Facebook profiles from website links
      const instagramMatch = html.match(/href=["'](https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_\-\.]+)/i);
      const facebookMatch = html.match(/href=["'](https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9_\-\.]+)/i);

      return {
        isResponsive: true,
        title,
        description,
        isPlaceholder: !!isPlaceholder,
        hasInstagram: !!instagramMatch,
        hasFacebook: !!facebookMatch,
        instagramUrl: instagramMatch ? instagramMatch[1] : undefined,
        facebookUrl: facebookMatch ? facebookMatch[1] : undefined,
      };
    } catch (err) {
      console.warn(`[PresenceChecker] Failed pinging website URL: ${targetUrl}`, err);
      return { isResponsive: false, isPlaceholder: false, hasInstagram: false, hasFacebook: false };
    }
  }

  /**
   * Helper to inspect if the listed website is actually just a social media profile.
   */
  static isSocialLink(url: string): { isSocial: boolean; type?: "instagram" | "facebook" } {
    if (!url) return { isSocial: false };
    const urlLower = url.toLowerCase();
    if (urlLower.includes("instagram.com") || urlLower.includes("instagr.am")) {
      return { isSocial: true, type: "instagram" };
    }
    if (urlLower.includes("facebook.com") || urlLower.includes("fb.me")) {
      return { isSocial: true, type: "facebook" };
    }
    return { isSocial: false };
  }

  /**
   * Standardizes and formats Brazilian phone numbers.
   * Formats into international E.164 and localized WhatsApp format: +55 (XX) XXXXX-XXXX
   */
  static validatePhone(phone: string): string | null {
    if (!phone) return null;

    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, "");

    // Strip leading 0
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }

    // Prefix Brazilian country code if missing
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = "55" + cleaned;
    }

    // Check valid length (+55 + DDD + 8 or 9 digits)
    if (cleaned.length < 12 || cleaned.length > 13) {
      // Fallback: return cleaned digits if it doesn't fit standard size
      return cleaned.length > 8 ? cleaned : null;
    }

    const country = cleaned.substring(0, 2); // 55
    const ddd = cleaned.substring(2, 4); // XX
    const rest = cleaned.substring(4); // XXXXXXXX or XXXXXXXXX

    if (rest.length === 9) {
      return `+${country} (${ddd}) ${rest.substring(0, 5)}-${rest.substring(5)}`;
    } else {
      return `+${country} (${ddd}) ${rest.substring(0, 4)}-${rest.substring(4)}`;
    }
  }
}
