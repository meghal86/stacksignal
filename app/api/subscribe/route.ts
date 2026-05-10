import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const source = typeof body.source === "string" ? body.source : "homepage";
    const interests = Array.isArray(body.interests) ? body.interests : [];

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    // Check if already subscribed
    const existing = await prisma.emailSubscriber.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json({ 
        message: "You're already on the list! We'll keep you posted.",
        alreadySubscribed: true 
      });
    }

    // Create subscriber
    const subscriber = await prisma.emailSubscriber.create({
      data: {
        email,
        source,
        interests,
      },
    });

    // Send welcome email via Resend (if API key is configured)
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: "StackSignal <signal@stacksignal.com>",
          to: email,
          subject: "Welcome to StackSignal — Your Weekly Skip Report Starts Now",
          html: `
            <div style="font-family: 'Space Grotesk', sans-serif; max-width: 600px; margin: 0 auto; background: #F5F0E8; padding: 40px;">
              <h1 style="font-size: 32px; color: #1A1A1A; margin-bottom: 8px; letter-spacing: -0.04em;">STACKSIGNAL</h1>
              <div style="height: 4px; background: linear-gradient(90deg, #FF4800, #C5E600, #00B8A0); margin-bottom: 32px;"></div>
              
              <h2 style="font-size: 24px; color: #1A1A1A; margin-bottom: 16px;">You're in. Signal locked.</h2>
              
              <p style="color: #1A1A1A; opacity: 0.7; line-height: 1.6; margin-bottom: 24px;">
                Every week, you'll receive our <strong>"3 Things NOT to Build"</strong> newsletter — 
                the anti-hype analysis that tells you which trending tools are overhyped and which 
                are genuine opportunities.
              </p>
              
              <div style="background: #1A1A1A; color: #F5F0E8; padding: 24px; margin-bottom: 24px;">
                <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 12px; opacity: 0.5;">What you get:</p>
                <ul style="list-style: none; padding: 0; margin: 0;">
                  <li style="padding: 8px 0; border-bottom: 1px solid rgba(245,240,232,0.1);">🔴 3 tools you should SKIP this week (with data)</li>
                  <li style="padding: 8px 0; border-bottom: 1px solid rgba(245,240,232,0.1);">🟢 1 emerging opportunity most founders are missing</li>
                  <li style="padding: 8px 0;">📊 Signal scores from GitHub, npm, and market data</li>
                </ul>
              </div>
              
              <p style="color: #1A1A1A; opacity: 0.4; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">
                © 2026 StackSignal Engine — Decision Compression for Founders
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        // Don't fail the subscription if email sending fails
        console.error("[subscribe] Failed to send welcome email:", emailError);
      }
    }

    return NextResponse.json({
      message: "Welcome to StackSignal! Check your inbox for your first signal.",
      subscriberId: subscriber.id,
    });
  } catch (error) {
    console.error("[subscribe] Error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe. Please try again." },
      { status: 500 }
    );
  }
}
