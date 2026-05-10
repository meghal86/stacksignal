# Current Context

<!--
  Version-specific gotchas, behavioral changes, and active risk areas.

  Keep this file updated when upgrading OpenClaw versions.
  You can update it manually by reading the top 2 version sections of CHANGELOG.md,
  or automate it via a cron/sync script that detects changelog changes.

  Retention: Keep the 4 most recent version sections. Drop older ones to control file size.
  The "Foundational Gotchas" section is permanent and must be manually maintained.

  Last updated: 2026-02-25 (fork-manager sync @ b3f46f0e2)
  Source: CHANGELOG.md versions Unreleased + 2026.2.25 + 2026.2.24
-->

---

## Active Version

- Current: 2026.2.25 (Unreleased)
- Previous stable: 2026.2.24

---

## Foundational Gotchas (Folk Knowledge)

These are architectural traps that have no CHANGELOG entry. They exist since early codebase design and must be manually maintained.

1. **`loadConfig()` is synchronous with caching** -- First call reads disk (`fs.readFileSync`). Never call in hot paths. Use `clearConfigCache()` to invalidate.
2. **Route resolution uses `WeakMap` cache on config object** -- Spreading/cloning config causes cache miss. Pass config by reference.
3. **Session keys are hierarchical** -- Format: `agent:<id>:<channel>:<kind>:<peerId>[:thread:<threadId>]`. Functions like `isSubagentSessionKey()` depend on exact format.
4. **`agents/` <-> `auto-reply/` is bidirectional by design** -- Not a circular dependency bug. `agents/` provides runtime, `auto-reply/` orchestrates it.
5. **`pi-embedded-subscribe.ts` is a streaming state machine** -- Adding/removing events can break tool call parsing, block chunking, or reasoning block extraction.
6. **`VerboseLevel` enum values are persisted in sessions** -- Changing enum values in `auto-reply/thinking.ts` breaks session persistence.
7. **`channels/dock.ts` returns lightweight metadata** -- Must be updated when channel capabilities change, even though it doesn't import heavy channel code.
8. **`infra/outbound/deliver.ts` is dual-use** -- Used by both cron delivery AND message tool sends. Test both paths.
9. **File locking is required for stores** -- `sessions/` and `cron/` use file locking. Removing lock wrappers causes race conditions and data corruption.
10. **JSON5 vs JSON parsers** -- Config files are JSON5 (comments, trailing commas). Session files, cron store, auth profiles are strict JSON. Don't mix parsers.
11. **`config.patch` nesting trap** -- Patching `{"telegram":{"streamMode":"off"}}` writes to an ignored top-level key. Correct: `{"channels":{"telegram":{"streamMode":"off"}}}`. Always verify full nested structure.
12. **Telegram HTML formatting** -- `telegram/format.ts` converts Markdown to Telegram's limited HTML subset. Broken HTML fails silently.
13. **Discord 2000 char limit** -- `discord/chunk.ts` enforces limits with fence-aware splitting. Don't bypass the chunker.
14. **Signal styled text uses byte positions** -- Not character positions. Multi-byte chars shift ranges.
15. **WhatsApp target normalization** -- Converts between E.164, JID (`@s.whatsapp.net`), and display formats. Wrong format = silent failure.

---

## Recent Behavioral Changes (Unreleased - v2026.2.25)

### From Unreleased (v2026.2.25) -- Security webhook hardening + Model fallback fixes + Discord improvements

**Security fixes (webhook hardening):**

- **Nextcloud Talk** -- Reject unsigned webhook traffic before full body reads, reducing unauthenticated request-body exposure. Stop treating DM pairing-store entries as group allowlist senders.
- **IRC** -- Keep pairing-store approvals DM-only and out of IRC group allowlist authorization.
- **Microsoft Teams** -- Isolate group allowlist and command authorization from DM pairing-store entries.
- **LINE** -- Cap unsigned webhook body reads before auth/signature handling.

**Key behavioral fixes:**

- **Agents/Model fallback** -- Keep explicit text + image fallback chains reachable even when `agents.defaults.models` allowlists are present. Classify `model_cooldown` / `cooling down` errors as `rate_limit` so failover continues.
- **Followups/Routing** -- Allow same-channel fallback dispatch when explicit origin routing fails (while still blocking cross-channel fallback).
- **Agents/Model fallback** -- Continue fallback traversal on unrecognized errors when candidates remain.
- **Telegram/Markdown spoilers** -- Keep valid `||spoiler||` pairs while leaving unmatched trailing `||` as literal text.
- **Hooks/Inbound metadata** -- Include `guildId` and `channelName` in `message_received` metadata.
- **Discord/Component auth** -- Evaluate guild component interactions with command-gating authorizers.
- **Discord/Typing indicator** -- Prevent stuck typing indicators by sealing channel typing keepalive callbacks after idle/cleanup.
- **Slack/Inbound media fallback** -- Deliver file-only messages even when Slack media downloads fail.

---

### From v2026.2.24 -- Security hardening wave + Docker breaking + macOS Voice fixes

**⚠️ BREAKING CHANGES:**

- **Docker namespace-join blocked** -- Security/Sandbox now blocks Docker `network: "container:<id>"` namespace-join mode by default. To keep that behavior intentionally, set `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true` (break-glass).

**New features & changes:**

- **Auto-reply/Abort shortcuts** -- Further expanded to treat exact `do not do that` as a stop trigger while preserving strict standalone matching.
- **Security/Audit** -- Add `security.trust_model.multi_user_heuristic` to flag likely shared-user ingress.

**⚠️ Key behavioral fixes (watch for regressions):**

- **macOS/Voice wake routing** -- Default forwarded voice-wake transcripts to the `webchat` channel instead of ambiguous `last` routing.
- **macOS/Gateway launch** -- Prefer available `openclaw` binary before pnpm/node runtime fallback when resolving local gateway commands.
- **macOS/Voice input** -- Guard all audio-input startup paths against missing default microphones (Voice Wake, Talk Mode, Push-to-Talk, mic-level monitor, tester).
- **Gateway/Security** -- Enforce gateway auth for exact `/api/channels` plugin root path.
- **Security/Exec** -- Sanitize inherited host execution environment, canonicalize PATH handling, strip dangerous keys (`LD_*`, `DYLD_*`, `SSLKEYLOGFILE`).
- **Security/Hooks** -- Normalize hook session-key classification with trim/lowercase + Unicode NFKC folding.
- **Security/Voice Call** -- Add Telnyx webhook replay detection and canonicalize replay-key signature encoding.
- **Providers/OpenRouter/Auth profiles** -- Bypass auth-profile cooldown/disable windows for OpenRouter.
- **WhatsApp/Web reconnect** -- Treat close status `440` as non-retryable.
- **Onboarding/Telegram** -- Keep core-channel onboarding available when plugin registry population is missing.
- **Models/Bedrock auth** -- Normalize additional Bedrock provider aliases to canonical `amazon-bedrock`.
- **Subagent/Cron reliability** -- Honor `ANNOUNCE_SKIP` in `sessions_spawn` completion/direct announce flows, include `cron` in coding tool profile.
- **Discord/Proxy + reactions** -- Thread channel proxy fetch into inbound media/sticker downloads, wire `messages.statusReactions` into Discord reaction lifecycle.
- **Discord/Block streaming** -- Suppress only reasoning payloads instead of all `block` payloads.
- **Matrix/Read receipts** -- Send read receipts as soon as Matrix messages arrive.
- **Sandbox/FS bridge** -- Build canonical-path shell scripts with newline separators (not `; ` joins).
- **Routing/Session isolation** -- Harden followup routing, preserve queued overflow summary routing metadata.
- **Messaging tool dedupe** -- Treat originating channel metadata as authoritative for same-target sends.
- **Cron/Heartbeat delivery** -- Stop inheriting cached session `lastThreadId` for heartbeat-mode target resolution.
- **Security/Sandbox media** -- Restrict sandbox media tmp-path allowances to OpenClaw-managed tmp roots.
- **Config/Plugins** -- Treat stale removed `google-antigravity-auth` as compatibility warnings.
- **Security/Message actions** -- Enforce local media root checks for `sendAttachment` and `setGroupIcon`.
- **Zalo/Group policy** -- Enforce sender authorization, default runtime group behavior to fail-closed allowlist.
- **Security/Telegram** -- Enforce DM authorization before media download/write.
- **Security/Exec companion host** -- Forward canonical `system.run` display text to macOS exec host.
- **Security/Exec safe-bins** -- Limit default trusted directories to immutable system paths, require explicit opt-in for package-manager paths.

### From Unreleased (v2026.2.24) -- Security hardening wave + Telegram fixes + sessions resilience

**New features & changes:**

- **Auto-reply/Abort shortcuts** -- Expand standalone stop phrases (`stop openclaw`, `stop action`, `stop run`, `stop agent`, `please stop` and variants), accept trailing punctuation, add multilingual stop keywords (ES/FR/ZH/HI/AR/JP/DE/PT/RU) (#25103). Thanks @steipete and @vincentkoc.
- **Security/Audit** -- Add `security.trust_model.multi_user_heuristic` to flag likely shared-user ingress and clarify personal-assistant trust model with hardening guidance.

**⚠️ Key behavioral fixes (watch for regressions):**

- **Security/Workspace FS** -- Normalize `@`-prefixed paths before workspace-boundary checks, preventing path escape attempts.
- **Security/Native images** -- Enforce `tools.fs.workspaceOnly` for native prompt image auto-load.
- **Security/Exec approvals** -- Bind approval text to full argv, reject payload-only `rawCommand` mismatches.
- **Security/Sandbox** -- Canonicalize bind-mount source paths via existing-ancestor realpath.
- **Telegram/Media fetch** -- Prioritize IPv4 before IPv6 for broken IPv6 routing hosts.
- **Telegram/Replies** -- Retry with plain text when markdown renders empty, fail loud when both fail.
- **Sessions/Tool-result guard** -- Avoid synthetic entries for aborted/error turns.
- **Usage accounting** -- Parse Moonshot/Kimi `cached_tokens` fields.
- **Doctor/Sandbox** -- Clear actionable warning when Docker unavailable.
- **Config/Meta** -- Accept numeric `meta.lastTouchedAt` timestamps.
- **Auto-reply/Reset hooks** -- Guarantee /new and /reset emit hooks on early-return.
- **Hooks/Slug generator** -- Resolve from effective model.
- **Slack/DM routing** -- Treat D* as DM.
- **Models/Providers** -- Preserve explicit reasoning overrides.
- **Exec approvals** -- Bare allowlist `*` as true wildcard.
- **Gateway/Auth** -- Trusted-proxy can skip device pairing.
- **Agents/Tool dispatch** -- Await block-reply flush.
- **iOS/Signing** -- Improve scripts/ios-team-id.sh for Xcode 16+.
- **macOS/Menu bar** -- Prevent recursive submenu injection.
- **Control UI/Chat images** -- Safe open with opener isolation.
- **CLI/Doctor** -- Correct recovery hints.
- **Doctor/Plugins** -- Resolve by plugin manifest id.

### From v2026.2.23 -- Security hardening wave + Control UI origin enforcement + Kilocode provider

**⚠️ BREAKING CHANGES:**

- **Control UI origin enforcement** -- Non-loopback Control UI now requires explicit `gateway.controlUi.allowedOrigins` (full origins). Startup fails closed when missing unless `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`.
- **Browser SSRF policy default change** -- Defaults to trusted-network mode (`browser.ssrfPolicy.dangerouslyAllowPrivateNetwork=true` when unset). Canonical config key changed to `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`. `openclaw doctor --fix` migrates legacy key.
- **Channel `allowFrom` ID-only matching** -- `allowFrom` matching is now ID-only by default across channels. Mutable name/tag/email matching requires explicit `channels.<channel>.dangerouslyAllowNameMatching=true` (#24907).

**New features & changes:**
- **Kilocode provider** -- First-class `kilocode` provider support (auth, onboarding, implicit provider detection, model defaults, transcript/cache-ttl handling), default model `kilocode/anthropic/claude-opus-4.6` (#20212).
- **Sessions/Cron cleanup** -- `openclaw sessions cleanup` with per-agent store targeting, disk-budget controls (`session.maintenance.maxDiskBytes` / `highWaterBytes`), and safer transcript/archive cleanup + run-log retention (#24753).
- **Vercel AI Gateway** -- Claude shorthand model refs (`vercel-ai-gateway/claude-*`) auto-normalized to canonical Anthropic model ids (#23985).
- **Prompt caching docs** -- Dedicated reference covering `cacheRetention`, per-agent `params` merge, Bedrock/OpenRouter behavior, cache-ttl tuning.
- **Gateway/HSTS** -- Optional `gateway.http.securityHeaders.strictTransportSecurity` for direct HTTPS deployments.
- **Subagent default timeout** -- `agents.defaults.subagents.runTimeoutSeconds` configurable so `sessions_spawn` inherits a default timeout when omitted (#24594).
- **Multilingual abort keywords** -- Stop phrases now include ES/FR/ZH/HI/AR/JP/DE/PT/RU forms for emergency stop messages.

**⚠️ Key behavioral fixes (watch for regressions):**

- **Browser control startup** -- `src/browser/server.js` now loaded during browser-control startup so control listener starts reliably (#23974).
- **Onboarding probe token budgets** -- Raised for OpenAI/Anthropic compatibility checks to avoid false negatives (#24743).
- **WhatsApp DM routing** -- Only updates main-session last-route state when DM is bound to main session, preserving `dmScope` (#24949).
- **OpenRouter reasoning off** -- When thinking explicitly off, avoids injecting `reasoning.effort` so reasoning-required models can use provider defaults (#24863).
- **Discord threading recovery** -- Refetches thread metadata before resolving parent channel context for missing parent IDs (#24897).
- **Web UI i18n hydration** -- Saved locale translations loaded at startup, apply immediately without toggling (#24795).
- **Legacy plugin schemas** -- Fallback to permissive object schema when `toJSONSchema()` missing (#24933).
- **Abort phrases expanded** -- `stop openclaw`, `stop action`, `stop run`, `stop agent`, `please stop` + trailing punctuation + multilingual variants now caught.
- **Cron isolated sessions** -- Full prompt mode used so skills/extensions available during cron execution (#24944).
- **Discord reasoning suppressed** -- Reasoning/thinking-only payload blocks suppressed from Discord delivery (#24969).
- **Sessions reasoning persistence** -- `reasoningLevel: "off"` persisted explicitly instead of deleted (#24406, #24559).
- **Plugin config keys** -- Uses plugin manifest `id` instead of npm package name for config entry keys (#24796).
- **Synology Chat webhooks** -- Stale webhook routes deregistered before re-registering on restart (#24971).
- **Prompt builder safety** -- Safely extracts text from mixed content arrays to avoid malformed payloads (#24946).
- **WhatsApp selfChatMode** -- Honored in inbound access-control checks (#24738).
- **Workspace paths hardened** -- Null bytes stripped, undefined `.trim()` guarded (#24876, #24875).
- **WhatsApp final-only delivery** -- Suppresses tool/block/reasoning payload leakage, forces block streaming off (#24962).
- **Telegram SSRF** -- RFC2544 `198.18.0.0/15` blocked, explicit SSRF-policy opt-in for media downloads (#24982).
- **Channels reasoning suppression** -- Non-Telegram channels (WhatsApp, Web, etc.) no longer emit reasoning blocks as user-visible replies (#24991).
- **Browser/Chrome extension options** -- Validates relay `/json/version` payload shape and content type, clarifies relay port derivation (`gateway + 3`) (#22252).
- **Sessions/Model overrides** -- Stored sub-agent model overrides preserved when `agents.defaults.models` is empty (allow-any mode) (#21088).
- **Subagents/Registry** -- Orphaned restored runs (missing session/sessionId) pruned before retry/announce resume (#24244).
- **Subagents/Announce queue** -- Exponential backoff when queue-drain delivery fails (#24783).
- **Agents/Tool warnings** -- `sessions_send` relay errors suppressed from chat-facing warning payloads (#24740).
- **CLI/Doctor** -- Corrected stale recovery hints to use valid commands (`openclaw gateway status --deep`, `openclaw configure --section model`) (#24485).
- **DashScope developer role** -- Sends `system` instead of unsupported `developer` role on Qwen/DashScope APIs (#19130).
- **WhatsApp enabled key** -- `channels.whatsapp.enabled` now accepted in config validation (#24263).
- **ACP client hardening** -- Requires trusted core tool IDs, ignores untrusted `toolCall.kind`, scopes read auto-approval to working dir.

**🔒 Security hardening (13+ fixes shipping next npm release):**

- iOS deep links: require local confirmation before forwarding `openclaw://agent` requests.
- Voice Call: Twilio webhook replay handling with bounded dedupe + per-call turn-token matching.
- Export HTML: escape HTML tokens, sanitize data-URL MIME types, prevent stored XSS.
- Image tool: enforce `tools.fs.workspaceOnly` in sandbox for `image` path resolution.
- Sandbox: enforce `applyPatch.workspaceOnly` + `fs.workspaceOnly` in sandbox-mounted paths.
- Commands: sender-only matching for `commands.allowFrom`, blocking conversation-shaped identities.
- Config writes: block prototype keys in account-id normalization, own-key lookups.
- Channels: unified `dangerouslyAllowNameMatching` policy checks, multi-account audit scanning.
- Exec approvals: node-bound approvals (nodeId), cross-node replay rejection.
- Exec approvals: two-phase approval registration + wait-decision to prevent orphaned /approve flows.
- Exec approvals: canonical wrapper execution plans, fail closed on `env` wrapper usage, reject unknown short safe-bin flags.
- Exec approvals: busybox/toybox applet recognition, persist inner executables instead of multiplexer wrappers.
- Exec approvals: `autoAllowSkills` requires pathless invocations + trusted resolved-path matches.
- Shell env: removed trusted-prefix shell-path fallback, only trusts login shells explicitly in `/etc/shells`, defaults to `/bin/sh`.
- Safe-bins: reject unknown/ambiguous GNU long-option abbreviations, deny sort filesystem-dependent flags (`--random-source`, `-T`).
- Exec approvals: `autoAllowSkills` requires pathless invocations + trusted resolved-path matches.
- Exec approvals: busybox/toybox shell applet recognition, persist inner executables instead of multiplexer wrappers.

### From v2026.2.23 (Unreleased) -- Provider hardening + Moonshot expansion + compaction resilience

**⚠️ Key behavioral fixes (watch for regressions):**

- **Cache-ttl eligibility expanded** -- Moonshot/Kimi and ZAI/GLM providers (including OpenRouter refs) now eligible for `contextPruning.mode: "cache-ttl"`. Previously silently skipped (#24497).
- **web_search gains Kimi provider** -- `provider: "kimi"` with two-step tool flow echoing results before synthesis (#16616, #18822).
- **Moonshot video provider added** -- Native video understanding + refactored video execution honoring entry/config/provider baseUrl+header precedence (#12063).
- **Session keys canonicalized to lowercase** -- Mixed-case inbound session keys normalized; legacy case-variant entries migrated to single lowercase key (#9561).
- **Telegram reactions soft-fail** -- Policy/token/emoji/API errors no longer crash; accepts snake_case `message_id`; falls back to inbound message-id context (#20236, #21001).
- **Telegram polling offsets scoped to bot identity** -- Prevents cross-token offset bleed and overlapping pollers during restart (#10850, #11347).
- **Telegram reasoning suppression** -- `/reasoning off` now suppresses reasoning-only segments and blocks raw fallback resend of `<think>` text (#24626, #24518).
- **Auto-reasoning leakage prevention** -- Model-default thinking (e.g. `thinking=low`) keeps auto-reasoning disabled unless explicitly enabled (#24335, #24290).
- **Reasoning errors no longer trigger compaction** -- Provider reasoning-required errors correctly classified, not treated as context overflows (#24593).
- **HTTP 502/503/504 now failover-eligible** -- Fallback chains switch providers during upstream outages instead of retrying same target (#20999).
- **Compaction resilience trio:** (1) `agentDir` passed to manual `/compact` (#24133), (2) model metadata passed through embedded runtime for safeguard summarization (#3479), (3) compaction cancelled when summary generation fails, preserving history (#10711).
- **Bootstrap file caching** -- Snapshots cached per session key, cleared on reset/delete, reducing prompt-cache invalidations from in-session writes (#22220).
- **Inbound flags moved to user-context** -- Dynamic flags (reply/forward/thread/history) no longer in system metadata, preventing turn-by-turn cache invalidation (#21785).
- **Session reset hides auth labels** -- `/new` and `/reset` no longer expose API key prefixes in chat (#24384, #24409).
- **Per-agent params overrides** -- `params` merged on top of model defaults (including `cacheRetention`) for per-agent cache tuning (#17470, #17112).
- **Overflow detection expanded** -- Additional provider error shapes including `input length` + `max_tokens` variants, plus Chinese error patterns (#9951, #22855).
- **Anthropic OAuth beta skip** -- `context-1m-*` beta injection skipped for `sk-ant-oat-*` tokens, avoiding 401 failures (#10647, #20354).
- **Bedrock cache retention scoped** -- Non-Anthropic Bedrock models excluded from cache metadata; Anthropic-Claude refs get proper cacheRetention defaults (#20866, #22303).
- **OpenRouter reasoning_effort dedup** -- Conflicting top-level `reasoning_effort` removed when nested `reasoning.effort` injected (#24120).
- **Groq TPM not classified as overflow** -- Throttling errors no longer trigger overflow recovery (#16176).
- **Gateway WS flood guard** -- Repeated unauthorized request floods per connection now closed with sampled logging (#20168).
- **Gateway restart health** -- Child listener PIDs treated as owned by service runtime PID, preventing false stale-process kills (#24696).
- **Config write immutability** -- `unsetPaths` no longer mutates caller objects; prototype-key traversal blocked (#24134).
- **Slack group policy inheritance** -- Per-account `groupPolicy` defaults from provider-level schema, not hardcoded `allowlist` (#17579).

### From v2026.2.22 -- Massive security wave + Mistral provider + Synology Chat + auto-updater

**⚠️ BREAKING CHANGES:**

- **Tool-failure replies now hide raw error details by default** -- Detailed error suffixes require `/verbose on` or `/verbose full`.
- **CLI local onboarding sets `session.dmScope` to `per-channel-peer` by default** (#23468).
- **Device-auth `v1` signature REMOVED** -- Must use `v2` with `connect.challenge` nonce.
- **Channel streaming config unified** -- `channels.<channel>.streaming` enum (`off | partial | block | progress`). Legacy `streamMode` migrated by `openclaw doctor --fix`.
- **Security/Exec env: `HOME`, `ZDOTDIR`, `SHELLOPTS`, `PS4` blocked** in host exec env.
- **Security/Exec approvals: `allow-always` persists inner executable patterns** (#23276).
- **Security/Exec: sandbox host fails closed** -- No sandbox runtime = hard fail (#23398).
- **Security/Exec: wrapper transparency** -- Policy checks match effective executable, not wrapper binary.
- **Security/Exec: safe-bin profiles required** -- Generic fallback removed.
- **Security/Hooks: symlink-safe containment** -- Module paths must resolve within root via realpath.
- **Security/Agents: `ownerDisplaySecret` for owner-ID hashing** -- Gateway token fallback removed.
- **Security/SSRF: IPv4 guard expanded** -- RFC special-use ranges, IPv6 transitions blocked.
- **Security/Group policy: fail closed** -- Defaults to `allowlist` when config absent (#23367).
- **Security/Channels: `toolsBySender` explicit key types** -- `id:`, `e164:`, `username:`, `name:` required.
- **WhatsApp: `allowFrom` enforced** for outbound targets (#20108).
- **Google Antigravity REMOVED** -- Migrate to `google-gemini-cli`.

---

## Recent Gotchas (v2026.2.20 - v2026.2.21)

### From v2026.2.21

- **Telegram streaming simplified** -- `channels.telegram.streaming` (boolean). Legacy `streamMode` auto-mapped.
- **Subagent spawn depth default** -- `maxSpawnDepth=2` shared. Depth-1 orchestrator enabled by default.
- **`tools.exec.host` routing** -- `gateway` default when no sandbox runtime.
- **`alsoAllow`/`allow` in subagent tool config respected** -- Previously blocked by deny defaults (#23359).
- **Cron `maxConcurrentRuns` honored** -- Previously always serial (#11595).
- **Config arrays structurally compared** -- No false restart-required reloads (#23185).
- **`✅ Done.` default reply** -- Tool-only completions without final text get acknowledgement (#22834).
- **Tool-call name validation** -- Malformed tool names rejected before persistence (#23324).

### From v2026.2.20

- **Gateway auth defaults to token mode.** Auto-generated `gateway.auth.token` persisted on first start.
- **`hooks.token` must differ from `gateway.auth.token`** -- Startup validation rejects identical values.
- **YAML 1.2 core schema** -- `on`/`off`/`yes`/`no` are strings, not booleans.
- **Cron webhook SSRF-guarded** -- Private addresses, metadata endpoints blocked.
- **Browser relay requires gateway-token auth** on `/extension` and `/cdp`.
- **Control-plane RPCs rate-limited** -- 3/min per device+IP.
- **Plaintext `ws://` to non-loopback hosts blocked** -- Only `wss://` for remote WS.

---

## Recently Active High-Risk Areas

Modules appearing frequently in Unreleased through v2026.2.22:

| Module | Recent Activity | Risk |
| --- | --- | --- |
| Security | 13+ exec approval hardening fixes, iOS deep link auth, Twilio replay dedupe, export HTML XSS, sandbox workspace-only enforcement, commands sender-only matching, prototype-key blocking, shell env trusted-prefix removal, safe-bin long-option validation | CRITICAL |
| Agents/Compaction | agentDir scoping, model metadata pass-through, cancel on failure, overflow detection expanded (Chinese + input-length patterns) | HIGH |
| Agents/Reasoning | Auto-reasoning leakage prevention, reasoning-error classification, Telegram + Discord reasoning suppression, session persistence of reasoningLevel:off | HIGH |
| Providers | Kilocode first-class support, Moonshot/Kimi expansion (video, cache-ttl, web_search), DashScope developer role fix, Anthropic OAuth beta skip, Bedrock scoped cache, OpenRouter dedup + reasoning off, Groq TPM, Vercel AI Gateway | HIGH |
| Telegram | SSRF media opt-in, reactions soft-fail, polling offset scoping, reasoning suppression, media download error replies | HIGH |
| Gateway | Control UI origin enforcement (BREAKING), browser control startup, WS flood guard, restart health, HSTS headers, prompt builder safety | HIGH |
| WhatsApp | DM routing dmScope, selfChatMode, final-only delivery (suppress reasoning leakage), logging redaction, enabled key validation | HIGH |
| Sessions | Cleanup command + disk-budget controls, key canonicalization, reasoning persistence, auth label removal | MEDIUM |
| Discord | Threading parent recovery, reasoning block suppression | MEDIUM |
| Browser | SSRF policy default change (BREAKING), navigation guard | MEDIUM |
| Config | Plugin manifest id keys, immutable unsetPaths, prototype-key blocking, per-agent params override | MEDIUM |
| Webchat | Final payload direct apply, session routing preservation, label across rollovers | MEDIUM |

---

## Pre-PR Checklist Additions (Version-Specific)

These supplement the stable checklist in STABLE-PRINCIPLES.md:

```
[] If touching gateway auth: verify gateway.auth.mode explicitly. Ensure hooks.token != gateway.auth.token.
[] If touching device-auth: use v2 signature (connect.challenge nonce + device.nonce). v1 is REMOVED.
[] If touching security: run `openclaw security audit` and triage all findings first.
[] If using YAML frontmatter: use explicit true/false, not on/off/yes/no.
[] If touching cron webhooks: verify targets are publicly reachable HTTPS.
[] If installing plugins: use --pin flag. Record name, version, spec, integrity.
[] If touching canvas/A2UI: use scoped session capability URLs, not shared-IP auth.
[] If touching protocol schemas: recommend user runs pnpm protocol:gen:swift && pnpm protocol:check.
[] If touching config loading: test negative path for out-of-root $include and symlink escape.
[] If touching cron schedules: verify both expression and persisted schedule.staggerMs.
[] If touching channel streaming config: use channels.<channel>.streaming enum (off/partial/block/progress), NOT legacy streamMode.
[] If touching exec approvals/safeBins: test wrapper transparency -- policy must match effective executable.
[] If touching hooks transforms: verify module path resolves within root via realpath (symlink-safe containment).
[] If touching subagent tools: check alsoAllow/allow entries are not blocked by built-in deny defaults.
[] If touching config merge/patch: ensure no __proto__/constructor/prototype key traversal.
[] If touching group policy: verify fail-closed behavior when channels.<provider> config is absent.
[] If touching toolsBySender: use explicit sender-key types (id:, e164:, username:, name:).
[] If touching Telegram send/reply: verify dedupe is scoped to same-target sends only.
[] If touching exec safe-bins: explicit safe-bin profiles required in allowlist mode.
[] If touching media sandbox: verify container-workdir paths map correctly to host workspace roots.
[] If touching session keys: verify lowercase canonicalization; test mixed-case inputs.
[] If touching compaction: pass agentDir, verify model metadata available for safeguard summarization.
[] If touching reasoning/thinking: verify auto-reasoning stays disabled when not explicitly enabled; verify Discord + Telegram suppress reasoning-only blocks.
[] If touching provider failover: verify 502/503/504 routes through failover, not retry-same.
[] If touching cache-ttl: verify eligibility includes Moonshot/Kimi/ZAI/GLM providers.
[] If touching inbound metadata: flags belong in user-context, NOT system metadata.
[] If touching bootstrap files: verify per-session-key caching and clear on reset/delete.
[] If touching Control UI: verify `gateway.controlUi.allowedOrigins` set for non-loopback access.
[] If touching browser SSRF: canonical key is `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`. Legacy `allowPrivateNetwork` migrated by doctor --fix.
[] If touching plugin config: use plugin manifest `id` for config entry keys, not npm package name.
[] If touching WhatsApp delivery: verify block streaming forced off; no reasoning/thinking leakage in output.
[] If touching Telegram media: respect SSRF-policy opt-in for media downloads; RFC2544 range blocked by default.
[] If touching abort/stop phrases: test expanded set (stop openclaw, stop action, stop run, please stop) + trailing punctuation.
[] If touching cron sessions: verify full prompt mode for isolated cron runs (skills/extensions available).
[] If touching session maintenance: verify disk-budget controls (maxDiskBytes, highWaterBytes) for cleanup.
[] If touching allowFrom: matching is ID-only by default; mutable name matching requires dangerouslyAllowNameMatching=true.
[] If touching subagent spawn: runTimeoutSeconds can now be inherited from agents.defaults.subagents.runTimeoutSeconds.
[] If touching channel delivery: reasoning/thinking segments must be suppressed in the shared dispatch path for non-Telegram channels.
[] If touching autoAllowSkills: pathless invocations + trusted resolved-path matches required in allowlist mode.
[] If touching sessions_send: relay errors should be suppressed from chat-facing tool warnings.
```
