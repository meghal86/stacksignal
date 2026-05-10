# Configuration Guide — iron-dome.config.json

Full reference for all Iron Dome configuration options.

---

## Default Configuration

```json
{
  "trusted_channels": ["telegram", "terminal"],
  "kill_phrase": "full stop",
  "require_approval": ["email_send", "public_post", "api_write", "message_send"],
  "auto_approve": ["file_read", "file_write", "web_search", "web_fetch"],
  "pii_rules": {
    "never_output": ["addresses", "phone_numbers", "medical", "financial_details"],
    "aggregates_only": ["pupil_data", "staff_data"]
  },
  "audit_log": "logs/iron-dome.log",
  "alert_channel": "telegram",
  "sub_agent_restrictions": {
    "blocked_operations": ["email", "financial", "security", "credentials"],
    "sanitise_context": true
  }
}
```

---

## Options Reference

### `trusted_channels`
**Type:** `string[]`
**Default:** `["telegram", "terminal"]`

Channels that can issue instructions to the agent. All other sources are treated as data only.

Common values: `"telegram"`, `"terminal"`, `"whatsapp"`, `"slack"`, `"signal"`

```json
"trusted_channels": ["telegram", "terminal", "whatsapp"]
```

### `kill_phrase`
**Type:** `string`
**Default:** `"full stop"`

Phrase that immediately halts all agent actions when received via a trusted channel.

```json
"kill_phrase": "full stop"
```

### `require_approval`
**Type:** `string[]`
**Default:** `["email_send", "public_post", "api_write", "message_send"]`

Actions that require explicit approval before execution.

Available action types:
- `email_send` — sending email
- `public_post` — posting to public platforms
- `api_write` — write/modify operations on external APIs
- `message_send` — sending messages via any platform
- `file_delete` — deleting files
- `database_write` — database modifications
- `payment` — financial transactions

```json
"require_approval": ["email_send", "public_post", "api_write", "message_send", "payment"]
```

### `auto_approve`
**Type:** `string[]`
**Default:** `["file_read", "file_write", "web_search", "web_fetch"]`

Actions that can proceed without approval.

```json
"auto_approve": ["file_read", "file_write", "web_search", "web_fetch"]
```

### `pii_rules`
**Type:** `object`

Controls handling of personally identifiable information.

#### `pii_rules.never_output`
**Type:** `string[]`

Categories of PII that must never appear in agent output.

```json
"never_output": ["addresses", "phone_numbers", "medical", "financial_details", "national_id"]
```

#### `pii_rules.aggregates_only`
**Type:** `string[]`

Data categories where only aggregate summaries (counts, totals) can be output. Individual records require approval.

```json
"aggregates_only": ["pupil_data", "staff_data", "customer_data"]
```

### `audit_log`
**Type:** `string`
**Default:** `"logs/iron-dome.log"`

Path to the audit log file. Relative paths are resolved from the skill directory.

```json
"audit_log": "logs/iron-dome.log"
```

### `alert_channel`
**Type:** `string`
**Default:** `"telegram"`

Channel for sending security alerts and approval requests.

```json
"alert_channel": "telegram"
```

### `sub_agent_restrictions`
**Type:** `object`

Controls what sub-agents can and cannot do.

#### `sub_agent_restrictions.blocked_operations`
**Type:** `string[]`

Operations that sub-agents cannot perform.

```json
"blocked_operations": ["email", "financial", "security", "credentials"]
```

#### `sub_agent_restrictions.sanitise_context`
**Type:** `boolean`
**Default:** `true`

When true, strip potential injection content from context passed to sub-agents.

---

## Per-Agent Configuration

Different agents need different trust levels. Create agent-specific configs:

### High-trust agent (e.g. personal assistant)
```json
{
  "trusted_channels": ["telegram", "terminal", "whatsapp"],
  "auto_approve": ["file_read", "file_write", "web_search", "web_fetch", "message_send"],
  "require_approval": ["email_send", "public_post", "payment"]
}
```

### Low-trust agent (e.g. public-facing bot)
```json
{
  "trusted_channels": ["terminal"],
  "auto_approve": ["file_read", "web_search"],
  "require_approval": ["email_send", "public_post", "api_write", "message_send", "file_write", "file_delete"]
}
```

### School/office agent
```json
{
  "trusted_channels": ["telegram", "terminal"],
  "require_approval": ["email_send", "public_post", "api_write", "message_send"],
  "pii_rules": {
    "never_output": ["addresses", "phone_numbers", "medical", "financial_details", "national_id"],
    "aggregates_only": ["pupil_data", "staff_data"]
  }
}
```

---

## Environment Variable Override

The audit log path can be overridden at runtime:

```bash
IRON_DOME_LOG=/var/log/iron-dome.log bash scripts/audit.sh summary
```
