import { inngest } from "../client";

export const performDeepAnalysis = inngest.createFunction(
  {
    id: "perform-deep-analysis",
    triggers: [{ event: "app/analyze.deep" }],
  },
  async ({ event }) => {
    return {
      received: true,
      data: event.data,
    };
  }
);
