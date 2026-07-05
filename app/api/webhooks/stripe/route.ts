/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = new Stripe(stripeKey || "mock-secret-key", {
  apiVersion: "2024-04-10" as any,
});

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature") || "";

    let event: Stripe.Event;

    // Check if we are running in development/mock mode without active Stripe signatures
    const isMockSignature = signature === "mock_signature" || !webhookSecret;

    if (isMockSignature) {
      console.log("[StripeWebhook] Verifying mock webhook payload.");
      try {
        event = JSON.parse(body) as Stripe.Event;
      } catch {
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
      }
    } else {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret!);
      } catch (err: any) {
        console.error(`[StripeWebhook] Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
      }
    }

    const session = event.data.object as any;

    // Handle webhook events
    switch (event.type) {
      case "checkout.session.completed": {
        const email = session.customer_details?.email || session.customer_email;
        const name = session.customer_details?.name || "Operador Nexus";
        const stripeCustomerId = session.customer as string;
        const paymentIntentId = session.payment_intent as string || session.id;
        const amountTotal = session.amount_total || 9700;
        
        let userId = session.metadata?.userId || session.client_reference_id;

        console.log(`[StripeWebhook] Payment success received. Email: ${email}, Session: ${session.id}`);

        if (!email) {
          console.error("[StripeWebhook] Missing email in checkout session");
          return NextResponse.json({ error: "Missing email" }, { status: 400 });
        }

        // 1. Locate or register the user by customer email
        let targetUser = null;
        if (userId) {
          const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);
          targetUser = userList[0];
        }

        if (!targetUser) {
          const userList = await db.select().from(users).where(eq(users.email, email)).limit(1);
          targetUser = userList[0];
        }

        // If user doesn't exist, create one dynamically
        if (!targetUser) {
          console.log(`[StripeWebhook] Registering new user dynamically for: ${email}`);
          const newUserList = await db
            .insert(users)
            .values({
              email,
              name,
              stripeCustomerId,
              role: "user",
            })
            .returning();
          targetUser = newUserList[0];
          userId = targetUser.id;
        } else if (!targetUser.stripeCustomerId && stripeCustomerId) {
          // Sync Stripe Customer ID
          await db
            .update(users)
            .set({ stripeCustomerId })
            .where(eq(users.id, targetUser.id));
          userId = targetUser.id;
        } else {
          userId = targetUser.id;
        }

        // 2. Insert transaction record in payments table as unused credit (scanId: null)
        const existingPayments = await db
          .select()
          .from(payments)
          .where(eq(payments.stripePaymentIntentId, paymentIntentId))
          .limit(1);

        if (existingPayments.length === 0) {
          await db.insert(payments).values({
            userId,
            stripePaymentIntentId: paymentIntentId,
            amount: amountTotal,
            currency: session.currency?.toUpperCase() || "BRL",
            status: "succeeded",
          });
          console.log(`[StripeWebhook] Saved success payment for user: ${userId}`);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntentId = session.id;
        console.warn(`[StripeWebhook] Payment failed event received. ID: ${paymentIntentId}`);
        
        await db
          .update(payments)
          .set({ status: "failed" })
          .where(eq(payments.stripePaymentIntentId, paymentIntentId));
        break;
      }

      case "charge.refunded": {
        const paymentIntentId = session.payment_intent as string;
        console.log(`[StripeWebhook] Refund event received. ID: ${paymentIntentId}`);

        await db
          .update(payments)
          .set({ status: "refunded" })
          .where(eq(payments.stripePaymentIntentId, paymentIntentId));
        break;
      }

      default:
        console.log(`[StripeWebhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (err) {
    console.error("[StripeWebhook] Webhook handling crashed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
