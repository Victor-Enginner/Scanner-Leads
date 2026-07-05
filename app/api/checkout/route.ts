/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const isMockMode = !stripeKey || stripeKey.includes("mock") || stripeKey === "";

// Safe initialization of Stripe client
const stripe = new Stripe(stripeKey || "mock-secret-key", {
  apiVersion: "2024-04-10" as any,
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    const host = req.headers.get("origin") || "http://localhost:3000";

    if (isMockMode) {
      console.log("[CheckoutAPI] Running in MOCK mode. Redirecting directly to thank you page.");
      const mockSessionId = `mock_session_${Date.now()}_${Math.random().toString(36).substring(4, 9)}`;
      
      // Return mock URL that redirects directly to thank you page
      return NextResponse.json({
        url: `${host}/obrigado?session_id=${mockSessionId}&mock=true`,
      });
    }

    // Build Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "pix"],
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: "Varredura Individual - NEXUS SCAN",
              description: "Varredura completa de radar para 1 Cidade + 1 Nicho no Google Maps",
              images: ["https://nexusscan.com.br/banner-checkout.png"],
            },
            unit_amount: 9700, // R$ 97,00 in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${host}/obrigado?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${host}/`,
      ...(userEmail ? { customer_email: userEmail } : {}),
      client_reference_id: userId || undefined,
      metadata: {
        userId: userId || "",
        productName: "NEXUS_SCAN_SCAN",
      },
    });

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "Failed to create checkout session url" }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutSession.url });

  } catch (err) {
    console.error("[CheckoutAPI] Checkout error", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
