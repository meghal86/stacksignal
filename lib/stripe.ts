import Stripe from "stripe";

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key && process.env.NODE_ENV === "production") {
    console.warn("STRIPE_SECRET_KEY is missing in production");
  }
  return new Stripe(key || "sk_test_dummy", {
    apiVersion: "2024-12-18.acacia" as any,
    typescript: true,
  });
};

export const stripe = getStripe();

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
