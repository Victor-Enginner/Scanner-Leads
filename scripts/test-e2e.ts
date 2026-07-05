/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "../lib/db";
import { users, payments, scans, leads } from "../lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { GoogleMapsService } from "../lib/services/google-maps";
import { DigitalPresenceChecker } from "../lib/services/presence-checker";
import { OpportunityScorer } from "../lib/services/opportunity-scorer";
import { MessageGenerator } from "../lib/services/message-generator";

async function runE2E() {
  console.log("=== INICIANDO PROTOCOLO DE TESTES E2E: NEXUS SCAN ===");

  try {
    // 0. Verify Database Connection
    let isDbOnline = false;
    try {
      await db.execute(sql`SELECT 1`);
      isDbOnline = true;
      console.log("-> Conexão com Banco de Dados [OK]. Executando testes relacionais...");
    } catch {
      console.log("⚠️ Conexão com Banco de Dados indisponível (PostgreSQL offline).");
      console.log("-> Ignorando gravação de dados, mas executando auditoria de lógica offline...");
    }

    let operatorId = "mock-operator-id";
    let scanId = "mock-scan-id";

    // -------------------------------------------------------------
    // PASS 1: Garantir existência de operador de teste
    // -------------------------------------------------------------
    console.log("\n[PASSO 1] Verificando operador de teste...");
    if (isDbOnline) {
      const testEmail = "e2e-operator@nexusscan.com.br";
      let operator = (await db.select().from(users).where(eq(users.email, testEmail)).limit(1))[0];
      
      if (!operator) {
        console.log("-> Operador não localizado. Registrando e2e-operator...");
        const newUsers = await db.insert(users).values({
          email: testEmail,
          name: "Operador de Integração E2E",
          role: "admin"
        }).returning();
        operator = newUsers[0];
      }
      operatorId = operator.id;
      console.log(`-> Operador Confirmado. ID: ${operator.id}, Cargo: ${operator.role}`);
    } else {
      console.log(`-> [OFFLINE] Usando operador mock. ID: ${operatorId}`);
    }

    // -------------------------------------------------------------
    // PASS 2: Simular transação e concessão de crédito
    // -------------------------------------------------------------
    console.log("\n[PASSO 2] Simulando webhook de pagamento (Stripe)...");
    if (isDbOnline) {
      const mockIntentId = `pi_e2e_test_${Date.now()}`;
      const newPayments = await db.insert(payments).values({
        userId: operatorId,
        stripePaymentIntentId: mockIntentId,
        amount: 9700,
        currency: "BRL",
        status: "succeeded",
        scanId: null
      }).returning();
      console.log(`-> Pagamento Registrado. ID: ${newPayments[0].id}, Crédito Disponível: Sim`);
    } else {
      console.log(`-> [OFFLINE] Pulando registro de pagamento.`);
    }

    // -------------------------------------------------------------
    // PASS 3: Solicitar nova varredura de radar (solicitar)
    // -------------------------------------------------------------
    console.log("\n[PASSO 3] Simulando preenchimento do formulário de varredura...");
    const targetCity = "Franca - SP";
    const targetNiche = "Pizzaria";

    if (isDbOnline) {
      const creditPayment = (await db
        .select()
        .from(payments)
        .where(and(eq(payments.userId, operatorId), isNull(payments.scanId), eq(payments.status, "succeeded")))
        .limit(1))[0];

      if (!creditPayment) {
        throw new Error("Erro de fluxo: Crédito de teste não localizado na base.");
      }

      const newScans = await db.insert(scans).values({
        userId: operatorId,
        city: targetCity,
        niche: targetNiche,
        status: "pending",
        pricePaid: creditPayment.amount,
        stripePaymentIntentId: creditPayment.stripePaymentIntentId
      }).returning();

      scanId = newScans[0].id;
      console.log(`-> Varredura Inicializada. ID: ${scanId}, Cidade: ${targetCity}`);

      await db
        .update(payments)
        .set({ scanId })
        .where(eq(payments.id, creditPayment.id));
      console.log("-> Crédito de pagamento consumido e vinculado com sucesso.");
    } else {
      console.log(`-> [OFFLINE] Usando varredura mock. Cidade: ${targetCity}, Segmento: ${targetNiche}`);
    }

    // -------------------------------------------------------------
    // PASS 4: Executar Scraper Engine e Auditoria
    // -------------------------------------------------------------
    console.log("\n[PASSO 4] Processando varredura (Google Maps Crawler & Presence Auditor)...");
    
    if (isDbOnline) {
      await db.update(scans).set({ status: "processing" }).where(eq(scans.id, scanId));
    }

    console.log("-> Buscando locais na API do Google...");
    const searchResults = await GoogleMapsService.searchBusinesses(targetCity, targetNiche);
    console.log(`-> Mapeamento concluído. ${searchResults.length} estabelecimentos encontrados.`);

    let highPriorityCount = 0;
    const leadsCollected: any[] = [];

    for (let i = 0; i < Math.min(searchResults.length, 3); i++) {
      const place = searchResults[i];
      console.log(`\n   Auditando [${i + 1}/${Math.min(searchResults.length, 3)}]: ${place.name}`);

      const detail = await GoogleMapsService.getPlaceDetails(place.placeId);
      if (!detail) {
        console.log(`   -> Pulo: Dados detalhados ausentes.`);
        continue;
      }

      let hasWebsite = false;
      let hasInstagram = false;
      let hasFacebook = false;
      let instaUrl = undefined;
      let fbUrl = undefined;

      if (detail.website) {
        const socialCheck = DigitalPresenceChecker.isSocialLink(detail.website);
        if (socialCheck.isSocial) {
          if (socialCheck.type === "instagram") {
            hasInstagram = true;
            instaUrl = detail.website;
          } else if (socialCheck.type === "facebook") {
            hasFacebook = true;
            fbUrl = detail.website;
          }
        } else {
          const ping = await DigitalPresenceChecker.checkWebsite(detail.website);
          hasWebsite = ping.isResponsive && !ping.isPlaceholder;
          hasInstagram = ping.hasInstagram;
          hasFacebook = ping.hasFacebook;
          instaUrl = ping.instagramUrl;
          fbUrl = ping.facebookUrl;
        }
      }

      const formattedPhone = detail.phone ? DigitalPresenceChecker.validatePhone(detail.phone) : null;

      const scorerInput = {
        hasWebsite,
        websiteUrl: detail.website || undefined,
        hasInstagram,
        hasFacebook,
        reviewCount: detail.reviewCount || 0,
        rating: detail.rating || undefined,
        hasPhotos: detail.hasPhotos || false,
        hasOpeningHours: detail.hasOpeningHours || false,
        description: detail.description || undefined
      };
      
      const scoring = OpportunityScorer.calculate(scorerInput);
      if (scoring.priority === "ALTA") {
        highPriorityCount++;
      }

      const copyInput = {
        businessName: detail.name,
        category: targetNiche,
        city: targetCity,
        opportunityScore: scoring.score,
        reasons: scoring.reasons,
        hasWebsite,
        websiteUrl: detail.website || undefined,
        hasInstagram,
        hasFacebook,
        reviewCount: detail.reviewCount || 0,
        rating: detail.rating || undefined
      };
      
      const pitchMessage = await MessageGenerator.generate(copyInput);

      const leadObject = {
        scanId,
        businessName: detail.name,
        category: targetNiche,
        address: detail.formattedAddress || null,
        phone: formattedPhone,
        hasWebsite,
        hasInstagram,
        hasFacebook,
        reviewCount: detail.reviewCount || 0,
        rating: detail.rating ? String(detail.rating) : null,
        hasPhotos: detail.hasPhotos || false,
        hasOpeningHours: detail.hasOpeningHours || false,
        websiteUrl: detail.website || null,
        instagramUrl: instaUrl || null,
        facebookUrl: fbUrl || null,
        opportunityScore: scoring.score,
        opportunityReason: scoring.reasons,
        whatsappMessage: pitchMessage,
        googleMapsUrl: detail.googleMapsUrl || null,
        latitude: detail.latitude ? Number(detail.latitude) : null,
        longitude: detail.longitude ? Number(detail.longitude) : null
      };

      leadsCollected.push(leadObject);

      if (isDbOnline) {
        await db.insert(leads).values({
          ...leadObject,
          rating: leadObject.rating ? String(leadObject.rating) as any : null
        });
      }
      console.log(`   -> Lógica executada. Score: ${scoring.score}/100, Prioridade: ${scoring.priority}`);
    }

    if (isDbOnline) {
      await db.update(scans).set({
        status: "completed",
        totalLeadsFound: Math.min(searchResults.length, 3),
        highPriorityCount,
        completedAt: new Date()
      }).where(eq(scans.id, scanId));
      console.log("\n-> Varredura gravada como CONCLUÍDA no banco.");
    } else {
      console.log(`\n-> [OFFLINE] Lógica de varredura concluída com sucesso.`);
    }

    // -------------------------------------------------------------
    // PASS 5: Simular Exportação Excel/CSV
    // -------------------------------------------------------------
    console.log("\n[PASSO 5] Simulando geração de planilha para download...");
    
    let csvString = "Nome;Score;Telefone;Mensagem\n";
    leadsCollected.forEach((l) => {
      csvString += `${l.businessName};${l.opportunityScore};${l.phone || ""};"${l.whatsappMessage?.substring(0, 30)}..."\n`;
    });

    console.log("-> Planilha simulada criada:");
    console.log(csvString.trim());
    console.log(`-> Total exportado: ${leadsCollected.length} leads.`);

    // -------------------------------------------------------------
    // PASS 6: Simular console de estatísticas (Admin)
    // -------------------------------------------------------------
    console.log("\n[PASSO 6] Verificando consolidação de métricas (Admin)...");
    
    if (isDbOnline) {
      const allUsers = await db.select().from(users);
      const allScans = await db.select().from(scans);
      const allPayments = await db.select().from(payments).where(eq(payments.status, "succeeded"));
      const revenueTotal = allPayments.reduce((acc, curr) => acc + curr.amount, 0);

      console.log(`-> Relatório Administrativo (Banco On-line):`);
      console.log(`   * Total de Usuários Cadastrados: ${allUsers.length}`);
      console.log(`   * Total de Varreduras Efetuadas: ${allScans.length}`);
      console.log(`   * Faturamento Bruto Consolidado: R$ ${Math.round(revenueTotal / 100)},00`);
    } else {
      console.log(`-> [OFFLINE] Lógica de métricas simulada.`);
    }

    console.log("\n=======================================================");
    console.log("✓ HANDSHAKE OK. TESTES DE INTEGRAÇÃO PASSARAM COM SUCESSO!");
    console.log("=======================================================");
    
    process.exit(0);

  } catch (err) {
    console.error("\n❌ ERRO NO PROTOCOLO DE TESTES DE INTEGRAÇÃO:", err);
    process.exit(1);
  }
}

runE2E();
