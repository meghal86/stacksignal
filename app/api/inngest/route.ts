import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { performDeepAnalysis } from "@/inngest/functions/analyze";
import { dailySignalCron, batchAnalysis } from "@/inngest/functions/dailyCron";
import { weeklyNewsletter } from "@/inngest/functions/newsletter";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    performDeepAnalysis,
    dailySignalCron,
    batchAnalysis,
    weeklyNewsletter,
  ],
});
