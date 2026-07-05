import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { scans, leads, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// 1. GET: Fetch the global queue of all scans in the system
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const scansQueue = await db
      .select({
        id: scans.id,
        city: scans.city,
        niche: scans.niche,
        status: scans.status,
        totalLeadsFound: scans.totalLeadsFound,
        highPriorityCount: scans.highPriorityCount,
        createdAt: scans.createdAt,
        userEmail: users.email,
        userName: users.name,
      })
      .from(scans)
      .innerJoin(users, eq(scans.userId, users.id))
      .orderBy(desc(scans.createdAt));

    return NextResponse.json(scansQueue);

  } catch (err) {
    console.error("[AdminScansAPI] Error fetching scans queue", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 2. POST: Reset or Delete individual scans
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { scanId, action } = await req.json();

    if (!scanId || !action) {
      return NextResponse.json({ error: "Parâmetros ausentes" }, { status: 400 });
    }

    // Verify scan exists
    const scanList = await db.select().from(scans).where(eq(scans.id, scanId)).limit(1);
    const targetScan = scanList[0];

    if (!targetScan) {
      return NextResponse.json({ error: "Varredura não localizada" }, { status: 404 });
    }

    if (action === "delete") {
      console.log(`[AdminScansAPI] Deleting scan session: ${scanId}`);
      // Cascade deletes all leads automatically due to relational foreign key configuration
      await db.delete(scans).where(eq(scans.id, scanId));
      return NextResponse.json({ success: true, message: "Varredura deletada com sucesso." });
    } 
    
    if (action === "reset") {
      console.log(`[AdminScansAPI] Resetting scan session status to pending: ${scanId}`);
      
      // 1. Delete all existing leads scraped for this scan ID to clear cache
      await db.delete(leads).where(eq(leads.scanId, scanId));
      
      // 2. Update scan status and counters back to starting positions
      await db
        .update(scans)
        .set({
          status: "pending",
          totalLeadsFound: 0,
          highPriorityCount: 0,
          completedAt: null,
        })
        .where(eq(scans.id, scanId));

      return NextResponse.json({ success: true, message: "Varredura reiniciada com sucesso." });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });

  } catch (err) {
    console.error("[AdminScansAPI] Action execution failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
