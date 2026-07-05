export interface ScorerInput {
  hasWebsite: boolean;
  websiteUrl?: string;
  hasInstagram: boolean;
  hasFacebook: boolean;
  reviewCount: number;
  rating?: number;
  hasPhotos: boolean;
  hasOpeningHours: boolean;
  description?: string;
}

export interface ScorerResult {
  score: number;
  priority: "ALTA" | "MEDIA" | "BAIXA" | "NAO_PRIORITARIO";
  priorityLabel: string;
  priorityColor: string;
  priorityIcon: string;
  reasons: string[];
}

export class OpportunityScorer {
  /**
   * Calculates the opportunity score (0-100) based on digital footprint details
   */
  static calculate(input: ScorerInput): ScorerResult {
    let score = 0;
    const reasons: string[] = [];

    // 1. Website Presence Checks
    if (!input.hasWebsite || !input.websiteUrl) {
      if (input.hasInstagram && !input.hasFacebook) {
        score += 30;
        reasons.push("Não possui site oficial, apenas perfil no Instagram.");
      } else if (input.hasFacebook && !input.hasInstagram) {
        score += 25;
        reasons.push("Não possui site oficial, apenas página no Facebook.");
      } else if (input.hasInstagram && input.hasFacebook) {
        score += 20; // fallback if they have both but no website
        reasons.push("Sem site oficial, apenas links para redes sociais (Instagram + Facebook).");
      } else {
        score += 40;
        reasons.push("Sem site oficial ou presença digital em links estruturados.");
      }
    } else {
      // Double check if the websiteUrl is actually just a social media page listed as a website
      const urlLower = input.websiteUrl.toLowerCase();
      const isInsta = urlLower.includes("instagram.com") || urlLower.includes("instagr.am");
      const isFb = urlLower.includes("facebook.com") || urlLower.includes("fb.me");
      
      if (isInsta) {
        score += 30;
        reasons.push("O site cadastrado é apenas um link para o Instagram.");
      } else if (isFb) {
        score += 25;
        reasons.push("O site cadastrado é apenas um link para o Facebook.");
      }
    }

    // 2. Review count check
    if (input.reviewCount < 10) {
      score += 15;
      reasons.push("Pouca reputação online: menos de 10 avaliações no Google Maps.");
    }

    // 3. Rating score check (only if they have reviews)
    if (input.rating !== undefined && input.rating > 0 && input.rating < 3.5) {
      score += 10;
      reasons.push(`Classificação insatisfatória no Google: nota ${input.rating.toFixed(1)}.`);
    }

    // 4. Missing Profile Photo
    if (!input.hasPhotos) {
      score += 5;
      reasons.push("Perfil incompleto: sem fotos cadastradas no Google.");
    }

    // 5. Missing Description / Overview
    if (!input.description || input.description.trim() === "") {
      score += 5;
      reasons.push("Falta de descrição editorial ou resumo institucional no Maps.");
    }

    // 6. Missing Opening Hours
    if (!input.hasOpeningHours) {
      score += 5;
      reasons.push("Horário de funcionamento não cadastrado ou desatualizado.");
    }

    // Cap the score at 100
    const finalScore = Math.min(score, 100);

    // Determine priority
    let priority: ScorerResult["priority"] = "NAO_PRIORITARIO";
    let priorityLabel = "Não Prioritário";
    let priorityColor = "text-muted-foreground border-muted-foreground/30 bg-muted/5";
    let priorityIcon = "❌";

    if (finalScore >= 80) {
      priority = "ALTA";
      priorityLabel = "🔥 Alta Prioridade";
      priorityColor = "text-red-400 border-red-500/30 bg-red-950/10";
      priorityIcon = "🔥";
    } else if (finalScore >= 60) {
      priority = "MEDIA";
      priorityLabel = "⚡ Média Prioridade";
      priorityColor = "text-amber-400 border-amber-500/30 bg-amber-950/10";
      priorityIcon = "⚡";
    } else if (finalScore >= 40) {
      priority = "BAIXA";
      priorityLabel = "📊 Baixa Prioridade";
      priorityColor = "text-cyan-400 border-cyan-500/30 bg-cyan-950/10";
      priorityIcon = "📊";
    }

    return {
      score: finalScore,
      priority,
      priorityLabel,
      priorityColor,
      priorityIcon,
      reasons,
    };
  }
}
