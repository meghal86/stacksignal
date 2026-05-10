import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * POST /api/newsletter/send
 * 
 * Sends the weekly "3 Things NOT to Build" newsletter.
 * Called by Inngest cron or admin manually.
 * 
 * Body: { apiKey: string } — must match NEWSLETTER_API_KEY env var
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const apiKey = body.apiKey;

    // Simple API key auth for admin endpoints
    if (apiKey !== process.env.NEWSLETTER_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get last 7 days of analyses
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentAnalyses = await prisma.analysis.findMany({
      where: {
        createdAt: { gte: weekAgo },
        verdict: { not: null },
      },
      orderBy: { createdAt: "desc" },
      include: { target: true },
    });

    if (recentAnalyses.length === 0) {
      return NextResponse.json({ message: "No analyses this week, skipping newsletter" });
    }

    // Get top 3 SKIP signals
    const skipSignals = recentAnalyses
      .filter((a) => a.verdict === "SKIP")
      .slice(0, 3);

    // Get top BUILD signal
    const buildSignal = recentAnalyses.find((a) => a.verdict === "BUILD");

    // Get all subscribers
    const subscribers = await prisma.emailSubscriber.findMany();

    if (subscribers.length === 0) {
      return NextResponse.json({ message: "No subscribers yet" });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        message: "Resend not configured",
        wouldSendTo: subscribers.length,
        skipSignals: skipSignals.length,
        buildSignal: buildSignal ? 1 : 0,
      });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Generate newsletter HTML
    const skipSections = skipSignals.map((s) => `
      <div style="padding: 20px; border: 1px solid #E8E4DD; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-size: 20px; color: #1A1A1A; margin: 0; letter-spacing: -0.04em;">
            🔴 ${s.target?.displayName || s.rawInput}
          </h3>
          <span style="background: #1A1A1A; color: #F5F0E8; padding: 4px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;">SKIP</span>
        </div>
        <p style="color: #1A1A1A; opacity: 0.6; font-size: 14px; line-height: 1.6; margin: 0;">
          ${s.verdictReasoning || "Signal analysis recommends skipping this space."}
        </p>
        <a href="https://stacksignal.com/report/${s.slug}" style="color: #FF4800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; text-decoration: none; margin-top: 12px; display: inline-block;">
          Full Report →
        </a>
      </div>
    `).join("");

    const buildSection = buildSignal ? `
      <div style="padding: 24px; border: 2px solid #FF4800; background: rgba(255,72,0,0.03); margin-bottom: 24px;">
        <h3 style="font-size: 20px; color: #FF4800; margin: 0 0 12px 0; letter-spacing: -0.04em;">
          🟢 Hidden Opportunity: ${buildSignal.target?.displayName || buildSignal.rawInput}
        </h3>
        <p style="color: #1A1A1A; opacity: 0.7; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">
          ${buildSignal.verdictReasoning || "Our signals indicate this is a genuine opportunity."}
        </p>
        <a href="https://stacksignal.com/report/${buildSignal.slug}" style="background: #FF4800; color: white; padding: 12px 24px; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block;">
          See Full Analysis →
        </a>
      </div>
    ` : "";

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #F5F0E8; padding: 40px;">
        <h1 style="font-size: 28px; color: #1A1A1A; margin-bottom: 4px; letter-spacing: -0.04em;">STACKSIGNAL</h1>
        <div style="height: 3px; background: linear-gradient(90deg, #FF4800, #C5E600, #00B8A0); margin-bottom: 32px;"></div>
        
        <h2 style="font-size: 22px; color: #1A1A1A; margin-bottom: 8px; letter-spacing: -0.04em;">
          3 Things NOT to Build This Week
        </h2>
        <p style="color: #1A1A1A; opacity: 0.5; font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 32px;">
          Weekly Signal Report • ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>

        ${skipSections || '<p style="color: #1A1A1A; opacity: 0.4;">No skip signals this week — everything looks interesting.</p>'}

        ${buildSection}

        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E8E4DD;">
          <a href="https://stacksignal.com/leaderboard" style="color: #FF4800; font-size: 14px; text-decoration: none; letter-spacing: -0.02em;">
            View Full Leaderboard →
          </a>
        </div>

        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #E8E4DD;">
          <p style="color: #1A1A1A; opacity: 0.3; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em;">
            © 2026 StackSignal • Decision Compression for Founders
          </p>
        </div>
      </div>
    `;

    // Send to all subscribers (batch)
    let sent = 0;
    let failed = 0;

    for (const sub of subscribers) {
      try {
        await resend.emails.send({
          from: "StackSignal Weekly <signal@stacksignal.com>",
          to: sub.email,
          subject: `🔴 3 Things NOT to Build — Week of ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          html,
        });
        sent++;
      } catch (err) {
        console.error(`[newsletter] Failed to send to ${sub.email}:`, err);
        failed++;
      }
    }

    return NextResponse.json({
      message: "Newsletter sent",
      sent,
      failed,
      totalSubscribers: subscribers.length,
    });
  } catch (error) {
    console.error("[newsletter] Error:", error);
    return NextResponse.json(
      { error: "Failed to send newsletter" },
      { status: 500 }
    );
  }
}
