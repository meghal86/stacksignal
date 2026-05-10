# Email Inbound Cron

Run every 15 minutes to check for new emails and notify the user.

## Steps

1. Run: `python3 ~/.openclaw/workspace/skills/email-resend/scripts/inbound.py`

2. Check the output for "New:" keyword - if found, there are new emails

3. Read the pending emails from: `~/.openclaw/workspace/memory/email-resend-inbound-notified.json`
   - Parse the `pending_ids` object

4. For each pending email, send a notification:
   - **Target:** Use the OpenClaw context to determine the notification channel
   - If running as cron job, use the cron job's configured delivery target
   - If running interactively, use the session's channel/target from context
   - Default: Send to the user who invoked the cron or the default notification channel
   
   Format:
   ```
   📬 New Email

   **From:** [from email]
   **Subject:** [subject]
   **Date:** [date]

   Reply to acknowledge
   ```

5. After notifying, acknowledge the emails by updating the JSON file:
   - Move each notified email from `pending_ids` to `acknowledged_ids`

6. Reply with "✅ Email check complete: X new emails notified" when done.

## Note on Notification Target

**Do not hardcode notification destinations.** Use:
- OpenClaw context (channel, chat_id, thread_id) from the cron job or session
- Environment variables if needed (e.g., NOTIFICATION_CHAT_ID, NOTIFICATION_THREAD_ID)
- Default to the invoking user's context