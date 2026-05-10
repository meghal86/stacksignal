import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await req.json();

    if (!planId || !["builder", "pro"].includes(planId)) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }

    const priceId = planId === "builder" 
      ? process.env.NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID 
      : process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;

    if (!priceId) {
      return NextResponse.json({ error: "Price ID not configured" }, { status: 500 });
    }

    // 1. Get or create Stripe customer
    let dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      // Create user in DB if they don't exist yet (should have been created on first login)
      dbUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email!,
          creditsBalance: 3,
        },
      });
    }

    let stripeCustomerId = dbUser.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });
      stripeCustomerId = customer.id;
      
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }

    // 2. Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/dashboard?success=true`,
      cancel_url: `${req.headers.get("origin")}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
        planId,
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
