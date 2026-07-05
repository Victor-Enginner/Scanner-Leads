import fs from "fs";
import path from "path";
import { GoogleMapsService } from "../lib/services/google-maps";
import { DigitalPresenceChecker } from "../lib/services/presence-checker";
import { OpportunityScorer } from "../lib/services/opportunity-scorer";
import { MessageGenerator } from "../lib/services/message-generator";

// --- Custom Env Loader for Standalone Script (no dotenv dependency needed) ---
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const index = trimmed.indexOf("=");
        if (index > 0) {
          const key = trimmed.substring(0, index).trim();
          let val = trimmed.substring(index + 1).trim();
          // Remove wrapping quotes if present
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
          }
          process.env[key] = val;
        }
      }
    });
  }
}

async function runTest() {
  console.log("==================================================");
  console.log("⚡ NEXUS SCAN - INICIANDO VARREDURA DE TESTE");
  console.log("==================================================\n");

  loadEnv();

  const city = "Franca - SP";
  const niche = "Dentista";
  const limit = 3;

  console.log(`[PASSO 1/4] Procurando por "${niche}" em "${city}" (Limite: ${limit})...`);
  const places = await GoogleMapsService.searchBusinesses(city, niche, limit);
  console.log(`[OK] Encontrados ${places.length} estabelecimentos.\n`);

  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    console.log(`--------------------------------------------------`);
    console.log(`🎯 LEADS #${i + 1}: ${place.name}`);
    console.log(`--------------------------------------------------`);
    console.log(`📍 Endereço: ${place.formattedAddress || "Não informado"}`);
    console.log(`📞 Telefone original: ${place.phone || "Não informado"}`);
    console.log(`🌐 Website cadastrado: ${place.website || "Nenhum"}`);

    // Passo 2: Verificação de Presença Digital
    console.log(`\n[PASSO 2/4] Verificando presença digital...`);
    let hasWebsite = false;
    let hasInstagram = false;
    let hasFacebook = false;
    let instagramUrl = undefined;
    let facebookUrl = undefined;

    if (place.website) {
      const socialCheck = DigitalPresenceChecker.isSocialLink(place.website);
      if (socialCheck.isSocial) {
        if (socialCheck.type === "instagram") {
          hasInstagram = true;
          instagramUrl = place.website;
          console.log(`   [Info] O website cadastrado é um link direto do Instagram.`);
        } else if (socialCheck.type === "facebook") {
          hasFacebook = true;
          facebookUrl = place.website;
          console.log(`   [Info] O website cadastrado é um link direto do Facebook.`);
        }
      } else {
        console.log(`   [Info] Website real detectado. Fazendo auditoria de cabeçalho...`);
        const ping = await DigitalPresenceChecker.checkWebsite(place.website);
        hasWebsite = ping.isResponsive && !ping.isPlaceholder;
        hasInstagram = ping.hasInstagram;
        hasFacebook = ping.hasFacebook;
        instagramUrl = ping.instagramUrl;
        facebookUrl = ping.facebookUrl;
        console.log(`   - Respondendo (200 OK): ${ping.isResponsive ? "Sim" : "Não"}`);
        console.log(`   - É página temporária/placeholder: ${ping.isPlaceholder ? "Sim" : "Não"}`);
        console.log(`   - Contém link para Instagram no HTML: ${ping.hasInstagram ? "Sim" : "Não"}`);
        console.log(`   - Contém link para Facebook no HTML: ${ping.hasFacebook ? "Sim" : "Não"}`);
      }
    } else {
      console.log(`   [Info] Sem website cadastrado.`);
    }

    // Format phone
    const formattedPhone = place.phone ? DigitalPresenceChecker.validatePhone(place.phone) : null;
    console.log(`📞 Telefone formatado (WhatsApp): ${formattedPhone || "Inválido/Inexistente"}`);

    // Passo 3: Cálculo de Oportunidade
    console.log(`\n[PASSO 3/4] Calculando score de oportunidade...`);
    const scoreResult = OpportunityScorer.calculate({
      hasWebsite,
      websiteUrl: place.website || undefined,
      hasInstagram,
      hasFacebook,
      reviewCount: place.reviewCount || 0,
      rating: place.rating,
      hasPhotos: place.hasPhotos,
      hasOpeningHours: place.hasOpeningHours,
      description: place.description,
    });

    console.log(`📈 SCORE FINAL: ${scoreResult.score}/100`);
    console.log(`🏷️  Prioridade: ${scoreResult.priorityLabel}`);
    console.log(`📝 Motivos identificados:`);
    scoreResult.reasons.forEach((r) => console.log(`   - ${r}`));

    // Passo 4: Geração de Mensagem via IA (OpenAI)
    console.log(`\n[PASSO 4/4] Gerando mensagem persuasiva para WhatsApp...`);
    const whatsappMsg = await MessageGenerator.generate({
      businessName: place.name,
      category: niche,
      city,
      opportunityScore: scoreResult.score,
      reasons: scoreResult.reasons,
      hasWebsite,
      websiteUrl: place.website || undefined,
      hasInstagram,
      hasFacebook,
      reviewCount: place.reviewCount || 0,
      rating: place.rating,
    });

    console.log(`💬 CÓPIA DA ABORDAGEM:\n`);
    console.log(whatsappMsg);
    console.log(`--------------------------------------------------\n`);
  }

  console.log("==================================================");
  console.log("🚀 FIM DA VARREDURA DE TESTE");
  console.log("==================================================");
}

runTest().catch(console.error);
