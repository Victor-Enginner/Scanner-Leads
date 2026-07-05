import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { scans, payments } from "@/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { city, state, niche, phone } = await req.json();

    if (!city || !state || !niche || !phone) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const userId = session.user.id;

    // Search for an unused payment credit for this operator
    const unusedPayments = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.userId, userId),
          isNull(payments.scanId),
          eq(payments.status, "succeeded")
        )
      )
      .limit(1);

    let activePayment = unusedPayments[0];

    // Fallback: If no credit is found and Stripe secret key is mock or missing, generate a test credit
    if (!activePayment) {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      const isMockEnabled = !stripeKey || stripeKey.includes("mock");

      if (isMockEnabled) {
        console.log("[CreateScanAPI] Auto-creating mock payment credit for test user:", userId);
        const mockPi = `mock_pi_${Date.now()}_${Math.random().toString(36).substring(4, 8)}`;
        const newPayments = await db
          .insert(payments)
          .values({
            userId,
            stripePaymentIntentId: mockPi,
            amount: 9700,
            currency: "BRL",
            status: "succeeded",
          })
          .returning();
        activePayment = newPayments[0];
      } else {
        return NextResponse.json(
          { error: "Nenhum crédito de varredura disponível. Adquira na Landing Page." },
          { status: 402 } // Payment Required
        );
      }
    }

    // Insert scan session in the database
    const fullCity = `${city} - ${state}`;
    const newScans = await db
      .insert(scans)
      .values({
        userId,
        city: fullCity,
        niche,
        status: "pending",
        pricePaid: activePayment.amount,
        stripePaymentIntentId: activePayment.stripePaymentIntentId,
      })
      .returning();

    const createdScan = newScans[0];

    // Link the payment credit to the new scan to consume it
    await db
      .update(payments)
      .set({ scanId: createdScan.id })
      .where(eq(payments.id, activePayment.id));

    return NextResponse.json({ scanId: createdScan.id });

  } catch (err) {
    console.error("[CreateScanAPI] Scan creation crashed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch user scans ordered by date desc
    const userScans = await db
      .select()
      .from(scans)
      .where(eq(scans.userId, userId))
      .orderBy(sql`${scans.createdAt} DESC`);

    return NextResponse.json(userScans);

  } catch (err) {
    console.error("[GetScansAPI] Error fetching scans", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
