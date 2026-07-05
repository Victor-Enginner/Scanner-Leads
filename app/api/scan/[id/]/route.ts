import { NextResponse } from "next/server";
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
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const scanId = params.id;
    const userId = session.user.id;

    // 1. Fetch scan verifying ownership
    const scanList = await db
      .select()
      .from(scans)
      .where(and(eq(scans.id, scanId), eq(scans.userId, userId)))
      .limit(1);

    const scan = scanList[0];
    if (!scan) {
      return NextResponse.json({ error: "Varredura não localizada" }, { status: 404 });
    }

    // 2. Fetch leads ordered by score desc
    const leadList = await db
      .select()
      .from(leads)
      .where(eq(leads.scanId, scanId))
      .orderBy(desc(leads.opportunityScore));

    const formattedLeads = leadList.map((lead) => {
      // Calculate priority on the fly
      let priority = "NAO_PRIORITARIO";
      if (lead.opportunityScore >= 80) {
        priority = "ALTA";
      } else if (lead.opportunityScore >= 60) {
        priority = "MEDIA";
      } else if (lead.opportunityScore >= 40) {
        priority = "BAIXA";
      }

      return {
        ...lead,
        priority,
        whatsappNumber: lead.phone,
        formattedAddress: lead.address,
        pitchMessage: lead.whatsappMessage,
      };
    });

    return NextResponse.json({ scan, leads: formattedLeads });

  } catch (err) {
    console.error("[ScanDetailAPI] Error fetching scan details", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
