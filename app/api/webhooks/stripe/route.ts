import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error(`Webhook signature verification failed: ${error.message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === "checkout.session.completed") {
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;

    if (!userId || !planId) {
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    const creditsToAdd = planId === "builder" ? 30 : 100;
    const plan = planId === "builder" ? "BUILDER" : "PRO";

    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: plan as any,
        creditsBalance: {
          increment: creditsToAdd,
        },
      },
    });
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    
    if (!(customer as Stripe.DeletedCustomer).deleted) {
      const userId = (customer as Stripe.Customer).metadata?.userId;
      
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: "FREE",
          },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
