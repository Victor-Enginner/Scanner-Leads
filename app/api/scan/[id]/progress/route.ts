import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scans, leads } from "@/lib/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const scanId = params.id;

    if (!scanId) {
      return NextResponse.json({ error: "Missing scan ID" }, { status: 400 });
    }

    // Fetch the scan
    const scanList = await db.select().from(scans).where(eq(scans.id, scanId)).limit(1);
    const scan = scanList[0];

    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    // Count how many leads have been analyzed (whatsappMessage is not null)
    const analyzedList = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(eq(leads.scanId, scanId), isNotNull(leads.whatsappMessage)));

    const processedCount = Number(analyzedList[0]?.count || 0);

    // Calculate percentage
    let progressPercent = 0;
    if (scan.status === "completed") {
      progressPercent = 100;
    } else if (scan.totalLeadsFound > 0) {
      progressPercent = Math.min(
        Math.round((processedCount / scan.totalLeadsFound) * 100),
        99
      );
    }

    return NextResponse.json({
      scanId,
      status: scan.status,
      city: scan.city,
      niche: scan.niche,
      totalLeadsFound: scan.totalLeadsFound,
      processedLeadsCount: processedCount,
      progressPercent,
      highPriorityCount: scan.highPriorityCount,
      createdAt: scan.createdAt,
      completedAt: scan.completedAt,
    });

  } catch (err) {
    console.error("[ScanProgress] Error checking progress status", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
