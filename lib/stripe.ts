import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is missing");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia" as any, // Using latest stable version
  typescript: true,
});

export const PLAN_CONFIGS = {
  FREE: {
    id: "free",
    name: "Free",
    credits: 3,
    priceId: null,
  },
  BUILDER: {
    id: "builder",
    name: "Builder",
    credits: 30,
    priceId: process.env.NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID,
  },
  PRO: {
    id: "pro",
    name: "Pro",
    credits: 100,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  },
};
