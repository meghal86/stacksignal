---
name: to-do
description: Give your AI the power to act in the future. Schedule delayed prompts and one-off reminders that automatically wake the agent up at an exact moment to execute workflows, check systems, or send notifications.
metadata: {"clawdbot":{"emoji":"⏰","requires":{"bins":["node"]}}}
---

# SKILL: To-Do (Ephemeral Tasks)

Schedule one-off background tasks, delayed actions, and reminders. The system wakes up the agent at the exact scheduled time, executing the provided instruction with injected context (creation time, target time).
Cross-platform: relies on native OS schedulers (`at` for Linux/macOS, `schtasks` for Windows).

## Commands

### 1. Schedule a Task
```bash
node skills/to-do/to-do.js schedule "<YYYY-MM-DD HH:mm>" "<detailed_instruction>" "<user_id>" "<channel>" "<timezone>"
```

**Agent Rules for Scheduling & Self-Prompting:**
- **Time Calculation:** ALWAYS convert natural language requests (e.g., "tomorrow at 5pm") into an absolute timestamp (`YYYY-MM-DD HH:mm`) based on the user's local `<timezone>`.
- **The "Amnesia" Rule:** Your *future self* will wake up in a completely isolated session with ZERO memory of the current conversation. The `<detailed_instruction>` is a prompt from you to your future self.
- **Prompt Engineering for Yourself:** The instruction MUST be fully self-contained. Include the exact context, absolute file paths, URLs, or specify exactly which skills/tools the future agent will need to use.
- **ASK BEFORE SCHEDULING (Crucial):** If the user's request is vague (e.g., "Remind me to send the email" or "Check the server later"), DO NOT schedule it blindly. Stop and ask the user for the missing details: "Which email?", "To whom?", "What server IP?", "What exactly should I verify?". Refine the payload with the user *before* creating the task.
- **Dynamic Routing:** Inject the current session's `user_id`, `channel`, and `timezone` to ensure the payload routes back correctly when triggered.

*Example of a BAD instruction:*
> *"Remind him to push the code later."* (Future agent won't know who "him" is, what "code" repository, or what branch).

*Example of a GOOD instruction:*
> *"Check the 'backend-api' repository on GitHub. If there are pending PRs for the authentication module, send Alice a reminder via Slack to review them before the 5 PM deployment freeze. Quote the last deployment logs from /var/log/deploy.log."*

### 4. Agent Output Style (Markdown Template)
When confirming that a task was scheduled, you can respond naturally, but you **MUST include the following template** reflecting the exact parameters you programmed. This template uses a clean blockquote that contains the scheduled date/time in an inline-code block, followed by the exact instruction in italics.

*Format template:*
> `[Date, Time]`
> *[Exact instruction left for the future agent]*

*Example response to the user:*
Done! I have scheduled your reminder. Here is the exact instruction I left for my future self:
> `February 24, 10:50 AM`
> *Check the 'backend-api' repository on GitHub. If there are pending PRs...*

### 2. List Pending Tasks
```bash
node skills/to-do/to-do.js list
```
Returns a tabular view of pending tasks with their `<ID>`, scheduled execution time, and instruction snippet.

### 3. Delete a Task
```bash
node skills/to-do/to-do.js delete <ID>
```
Cancels a pending task. Always run `list` first to ensure you target the correct `<ID>`.