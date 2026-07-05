import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { scans, leads, payments, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Security check: restrict endpoint to users with "admin" role
    if (!session || !session.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    // 1. Fetch count metrics
    const allUsers = await db.select().from(users);
    const allScans = await db.select().from(scans);
    const allPayments = await db.select().from(payments).where(eq(payments.status, "succeeded"));
    
    // Fetch only IDs for leads to avoid memory overhead
    const allLeads = await db.select({ id: leads.id }).from(leads);

    // 2. Aggregate metrics
    const totalUsers = allUsers.length;
    const totalScans = allScans.length;
    const totalLeads = allLeads.length;
    const totalRevenueCents = allPayments.reduce((acc, curr) => acc + curr.amount, 0);
    const totalRevenue = Math.round(totalRevenueCents / 100);

    // 3. Compile city and niche statistics
    const citiesCount: Record<string, number> = {};
    const nichesCount: Record<string, number> = {};

    allScans.forEach((scan) => {
      citiesCount[scan.city] = (citiesCount[scan.city] || 0) + 1;
      nichesCount[scan.niche] = (nichesCount[scan.niche] || 0) + 1;
    });

    const topCities = Object.entries(citiesCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topNiches = Object.entries(nichesCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 4. Fetch recent payments mapped with user emails
    const recentPaymentsRaw = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        createdAt: payments.createdAt,
        userId: payments.userId,
      })
      .from(payments)
      .orderBy(desc(payments.createdAt))
      .limit(6);

    const recentPayments = recentPaymentsRaw.map((pay) => {
      const user = allUsers.find((u) => u.id === pay.userId);
      return {
        id: pay.id,
        amount: Math.round(pay.amount / 100),
        createdAt: pay.createdAt,
        userEmail: user?.email || "operador-deletado@nexus.net",
      };
    });

    return NextResponse.json({
      metrics: {
        totalUsers,
        totalScans,
        totalLeads,
        totalRevenue,
      },
      topCities,
      topNiches,
      recentPayments,
    });

  } catch (err) {
    console.error("[AdminMetricsAPI] Error aggregating metrics", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
