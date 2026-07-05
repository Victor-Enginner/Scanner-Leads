import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scans, leads } from "@/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { GoogleMapsService } from "@/lib/services/google-maps";
import { DigitalPresenceChecker } from "@/lib/services/presence-checker";
import { OpportunityScorer } from "@/lib/services/opportunity-scorer";
import { MessageGenerator } from "@/lib/services/message-generator";

const BATCH_SIZE = 3; // Process 3 leads per request to stay under Vercel serverless timeout limits

export async function POST(req: Request) {
  try {
    const { scanId } = await req.json();

    if (!scanId) {
      return NextResponse.json({ error: "Missing scanId parameter" }, { status: 400 });
    }

    // Retrieve the scan session
    const scanList = await db.select().from(scans).where(eq(scans.id, scanId)).limit(1);
    const scan = scanList[0];

    if (!scan) {
      return NextResponse.json({ error: "Scan record not found" }, { status: 404 });
    }

    // --- STEP 1: INITIALIZE SCAN (FETCH PLACES FROM GOOGLE MAPS) ---
    if (scan.status === "pending") {
      console.log(`[ScanProcessor] Initializing scan ${scanId} for ${scan.niche} in ${scan.city}`);
      
      // Update status to processing immediately to avoid concurrent executions
      await db.update(scans).set({ status: "processing" }).where(eq(scans.id, scanId));

      const places = await GoogleMapsService.searchBusinesses(scan.city, scan.niche, 20);

      if (places.length === 0) {
        await db.update(scans).set({ status: "failed", completedAt: new Date() }).where(eq(scans.id, scanId));
        return NextResponse.json({
          status: "failed",
          message: "Nenhum estabelecimento encontrado no Google Maps para esta pesquisa.",
        });
      }

      // Write basic places to the leads table
      const leadsToInsert = places.map((place) => ({
        scanId: scan.id,
        businessName: place.name,
        category: scan.niche,
        address: place.formattedAddress,
        phone: place.phone,
        websiteUrl: place.website,
        rating: place.rating,
        reviewCount: place.reviewCount || 0,
        hasPhotos: place.hasPhotos,
        hasOpeningHours: place.hasOpeningHours,
        opportunityScore: 0,
        opportunityReason: [],
        hasWebsite: false,
        hasInstagram: false,
        hasFacebook: false,
      }));

      await db.insert(leads).values(leadsToInsert);

      // Update scan statistics
      await db
        .update(scans)
        .set({ totalLeadsFound: places.length })
        .where(eq(scans.id, scanId));

      return NextResponse.json({
        status: "processing",
        message: "Estabelecimentos carregados. Iniciando análise de presença...",
        progress: 0,
        total: places.length,
      });
    }

    // --- STEP 2: RUN ANALYSIS IN INCREMENTAL BATCHES ---
    if (scan.status === "processing") {
      // Find leads in this scan that haven't been analyzed yet (whatsappMessage is null)
      const unprocessedLeads = await db
        .select()
        .from(leads)
        .where(and(eq(leads.scanId, scanId), isNull(leads.whatsappMessage)))
        .limit(BATCH_SIZE);

      if (unprocessedLeads.length === 0) {
        // All analyzed, finalize scan
        return await finalizeScan(scanId, scan.totalLeadsFound);
      }

      console.log(`[ScanProcessor] Analyzing batch of ${unprocessedLeads.length} leads for scan ${scanId}`);

      for (const lead of unprocessedLeads) {
        try {
          let hasWebsite = false;
          let hasInstagram = false;
          let hasFacebook = false;
          let instaUrl = undefined;
          let fbUrl = undefined;

          // Check if website url is a redirection or social platform
          if (lead.websiteUrl) {
            const socialCheck = DigitalPresenceChecker.isSocialLink(lead.websiteUrl);
            
            if (socialCheck.isSocial) {
              if (socialCheck.type === "instagram") {
                hasInstagram = true;
                instaUrl = lead.websiteUrl;
              } else if (socialCheck.type === "facebook") {
                hasFacebook = true;
                fbUrl = lead.websiteUrl;
              }
            } else {
              // It's a standard URL, ping it to get responsiveness and meta details
              const ping = await DigitalPresenceChecker.checkWebsite(lead.websiteUrl);
              hasWebsite = ping.isResponsive && !ping.isPlaceholder;
              hasInstagram = ping.hasInstagram;
              hasFacebook = ping.hasFacebook;
              instaUrl = ping.instagramUrl;
              fbUrl = ping.facebookUrl;
            }
          }

          // Format BR phone number
          const formattedPhone = lead.phone 
            ? DigitalPresenceChecker.validatePhone(lead.phone) 
            : null;

          // Calculate opportunity score using Scorer criteria
          const scorerResult = OpportunityScorer.calculate({
            hasWebsite,
            websiteUrl: lead.websiteUrl || undefined,
            hasInstagram,
            hasFacebook,
            reviewCount: lead.reviewCount,
            rating: lead.rating || undefined,
            hasPhotos: lead.hasPhotos,
            hasOpeningHours: lead.hasOpeningHours,
            description: lead.address || "", // Fallback representation for profile details
          });

          // Generate personal B2B cold-outreach script with AI
          const whatsappMessage = await MessageGenerator.generate({
            businessName: lead.businessName,
            category: lead.category || undefined,
            city: scan.city,
            opportunityScore: scorerResult.score,
            reasons: scorerResult.reasons,
            hasWebsite,
            websiteUrl: lead.websiteUrl || undefined,
            hasInstagram,
            hasFacebook,
            reviewCount: lead.reviewCount,
            rating: lead.rating || undefined,
          });

          // Write analytical updates back to the lead record
          await db
            .update(leads)
            .set({
              hasWebsite,
              hasInstagram,
              hasFacebook,
              instagramUrl: instaUrl,
              facebookUrl: fbUrl,
              phone: formattedPhone || lead.phone,
              opportunityScore: scorerResult.score,
              opportunityReason: scorerResult.reasons,
              whatsappMessage,
            })
            .where(eq(leads.id, lead.id));

        } catch (err) {
          console.error(`[ScanProcessor] Error analyzing lead ${lead.id}`, err);
          // Write fallback values to prevent getting stuck in infinite processing loops
          await db
            .update(leads)
            .set({
              whatsappMessage: `Olá! Vi o perfil da ${lead.businessName} no Google. Gostaria de te enviar uma proposta para criação de site.`,
              opportunityScore: 10,
              opportunityReason: ["Erro no processamento automático da presença digital."],
            })
            .where(eq(leads.id, lead.id));
        }
      }

      // Count remaining unprocessed leads
      const remainingList = await db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(and(eq(leads.scanId, scanId), isNull(leads.whatsappMessage)));
      
      const remainingCount = Number(remainingList[0]?.count || 0);

      if (remainingCount === 0) {
        return await finalizeScan(scanId, scan.totalLeadsFound);
      }

      const processedCount = scan.totalLeadsFound - remainingCount;
      const progressPercent = Math.min(
        Math.round((processedCount / scan.totalLeadsFound) * 100),
        99
      );

      return NextResponse.json({
        status: "processing",
        progress: progressPercent,
        total: scan.totalLeadsFound,
        message: `Analisando presença digital... (${processedCount}/${scan.totalLeadsFound})`,
      });
    }

    // If it's already completed or failed, return final status
    return NextResponse.json({
      status: scan.status,
      progress: scan.status === "completed" ? 100 : 0,
      total: scan.totalLeadsFound,
    });

  } catch (err) {
    console.error("[ScanProcessor] Global route error", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * Finalizes the scan session: aggregates scoring stats and flags completed
 */
async function finalizeScan(scanId: string, totalLeads: number) {
  // Count how many leads are high priority (opportunityScore >= 80)
  const highPriorityList = await db
    .select({ count: sql<number>`count(*)` })
    .from(leads)
    .where(and(eq(leads.scanId, scanId), sql`opportunity_score >= 80`));
  
  const highPriorityCount = Number(highPriorityList[0]?.count || 0);

  await db
    .update(scans)
    .set({
      status: "completed",
      completedAt: new Date(),
      highPriorityCount,
    })
    .where(eq(scans.id, scanId));

  console.log(`[ScanProcessor] Scan ${scanId} completed. Found ${highPriorityCount} high priority leads.`);

  return NextResponse.json({
    status: "completed",
    progress: 100,
    total: totalLeads,
    highPriorityCount,
    message: "Varredura concluída com sucesso! Redirecionando...",
  });
}
