import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { runDailySignalScan } from "@/inngest/functions/dailySignalScan";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { secret?: string; runNow?: boolean } | null;

  if (!process.env.ADMIN_SECRET || body?.secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (body.runNow === true) {
    const result = await runDailySignalScan();
    return NextResponse.json({ message: "Scan completed", ...result });
  }

  await inngest.send({
    name: "leaderboard/refresh.requested",
    data: { requestedAt: new Date().toISOString() },
  });

  return NextResponse.json({ message: "Scan triggered" });
}
