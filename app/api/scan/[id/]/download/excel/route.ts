import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { scans, leads } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new Response("Não autorizado", { status: 401 });
    }

    const scanId = params.id;
    const userId = session.user.id;

    // 1. Fetch scan and verify ownership
    const scanList = await db
      .select()
      .from(scans)
      .where(and(eq(scans.id, scanId), eq(scans.userId, userId)))
      .limit(1);

    const scan = scanList[0];
    if (!scan) {
      return new Response("Varredura não localizada", { status: 404 });
    }

    if (scan.status !== "completed") {
      return new Response("Varredura ainda não foi concluída", { status: 400 });
    }

    // 2. Fetch all leads associated with this scan, ordered by opportunity score desc
    const leadList = await db
      .select()
      .from(leads)
      .where(eq(leads.scanId, scanId))
      .orderBy(desc(leads.opportunityScore));

    // Helper to escape values for CSV safety
    const csvEscape = (val: string | null | undefined): string => {
      if (val === null || val === undefined) return "";
      let str = String(val);
      // Remove any double quotes, replacing them with single quotes
      str = str.replace(/"/g, "'");
      // Replace line breaks with spaces
      str = str.replace(/\r?\n|\r/g, " ");
      // Wrap in double quotes if it contains semicolons or spaces
      if (str.includes(";") || str.includes(",") || str.includes(" ")) {
        return `"${str}"`;
      }
      return str;
    };

    // 3. Build CSV string
    // Standard Brazilian header: Semicolon separated values (CSV default in Portuguese OS locale)
    const headers = [
      "Nome da Empresa",
      "Segmento",
      "Score Oportunidade",
      "Prioridade",
      "Telefone WhatsApp",
      "Tem Website?",
      "Website URL",
      "Tem Instagram?",
      "Instagram URL",
      "Tem Facebook?",
      "Facebook URL",
      "Endereço Completo",
      "WhatsApp Link",
      "Mensagem Pronta WhatsApp"
    ];

    let csvContent = headers.join(";") + "\n";

    for (const lead of leadList) {
      // Calculate priority dynamically from the score
      let priority = "NAO_PRIORITARIO";
      if (lead.opportunityScore >= 80) {
        priority = "ALTA";
      } else if (lead.opportunityScore >= 60) {
        priority = "MEDIA";
      } else if (lead.opportunityScore >= 40) {
        priority = "BAIXA";
      }

      const cleanPhone = lead.phone ? lead.phone.replace(/\D/g, "") : "";
      const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : "";

      const row = [
        csvEscape(lead.businessName),
        csvEscape(lead.category),
        lead.opportunityScore,
        csvEscape(priority),
        csvEscape(lead.phone),
        lead.hasWebsite ? "SIM" : "NÃO",
        csvEscape(lead.websiteUrl),
        lead.hasInstagram ? "SIM" : "NÃO",
        csvEscape(lead.instagramUrl),
        lead.hasFacebook ? "SIM" : "NÃO",
        csvEscape(lead.facebookUrl),
        csvEscape(lead.address),
        csvEscape(waLink),
        csvEscape(lead.whatsappMessage),
      ];

      csvContent += row.join(";") + "\n";
    }

    // Prepend UTF-8 BOM (\ufeff) to make Excel in Windows open it in UTF-8 automatically
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const csvBuffer = Buffer.concat([bom, Buffer.from(csvContent, "utf-8")]);

    const sanitizedCityName = scan.city.replace(/[^a-zA-Z0-9]/g, "_");
    const sanitizedNiche = scan.niche.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `leads_${sanitizedNiche}_${sanitizedCityName}.csv`;

    return new Response(csvBuffer, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });

  } catch (err) {
    console.error("[CSVDownloadAPI] Error exporting CSV", err);
    return new Response("Erro interno no servidor", { status: 500 });
  }
}
