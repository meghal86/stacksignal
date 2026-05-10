import { inngest } from "../client";

/**
 * Weekly Newsletter Cron — Runs every Monday at 9:00 AM UTC
 * Triggers the newsletter/send API endpoint.
 */
export const weeklyNewsletter = inngest.createFunction(
  {
    id: "weekly-newsletter",
    triggers: [{ cron: "0 9 * * 1" }], // Every Monday at 9 AM UTC
  },
  async ({ step }) => {
    const result = await step.run("send-newsletter", async () => {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const apiKey = process.env.NEWSLETTER_API_KEY;

      if (!apiKey) {
        return { error: "NEWSLETTER_API_KEY not configured" };
      }

      const response = await fetch(`${baseUrl}/api/newsletter/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      return await response.json();
    });

    return result;
  }
);
