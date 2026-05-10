---
name: todokan
version: 1.0.0
description: "Manage tasks, boards, thoughts, and reviews in Todokan via MCP"
homepage: https://todokan.com
user-invocable: true
metadata: {"category":"productivity","tags":["tasks","kanban","mcp","planning","review"],"requires":{"env":["TODOKAN_API_KEY","TODOKAN_MCP_URL"],"mcp":true},"openclaw":{"homepage":"https://todokan.com","requires":{"env":["TODOKAN_API_KEY","TODOKAN_MCP_URL"]}}}
---

# Todokan — Kanban Task Management

Todokan is a kanban-style task manager. You can manage the user's tasks, boards, and projects through MCP tools.

## Prerequisites

The `todokan` MCP server must be configured in `~/.openclaw/openclaw.json` under `mcpServers`. See the README for setup instructions.

---

## Trigger — Wann diesen Skill aktivieren

Aktiviere den Todokan-Skill, wenn der User eine der folgenden Absichten hat:

| Absicht | Beispiel |
|---------|----------|
| Task erstellen / ändern / löschen | "Erstell eine Aufgabe: PR reviewen" |
| Board oder Tasks anzeigen | "Zeig mir meine Tasks", "Was liegt auf dem Dev-Board?" |
| Status ändern | "Markiere Task X als erledigt" |
| Recherche-Ergebnis ablegen | "Speicher das als Task / Dokument in Todokan" |
| Briefing / Zusammenfassung aus Tasks | "Gib mir ein Briefing meiner offenen Tasks" |
| Dokument an Task anhängen | "Schreib eine Notiz zu Task X" |
| Themen über mehrere Boards suchen | "Was habe ich zum Investor-Meeting notiert?" |
| Änderungen seit letzter Prüfung abrufen | "Was ist seit heute Morgen neu?" |

**Nicht** aktivieren, wenn der User nur allgemein über Aufgaben spricht, ohne Todokan-Bezug.

---

## Tool-Reihenfolge

Halte diese Reihenfolge ein, um konsistente Ergebnisse zu erzielen:

### Lesen (immer zuerst orientieren)

```
1. list_habitats          → Welche Workspaces existieren?
2. list_boards          → Welche Boards gibt es? (IDs merken)
3. list_tasks           → Tasks auf einem Board (mit Filtern)
4. search_across_habitats → Volltext über mehrere Boards/Habitats
5. get_events_since       → Änderungen seit Zeitpunkt abrufen
6. list_board_labels      → Verfügbare Labels + Nutzung
7. list_task_documents    → Dokumente eines Tasks
8. read_document          → Inhalt eines Dokuments
```

### Schreiben (erst nach Orientierung + Rückfrage)

```
9.  create_task / create_board / create_habitat
10. update_task / update_task_by_title
11. create_document / add_document_to_task
12. delete_task          → Nur nach expliziter Bestätigung
```

### AI-gestützt (optional)

```
13. propose_task_variants → 2-3 Varianten generieren lassen
14. confirm_task_fields   → Felder vor Erstellung prüfen
```

**Goldene Regel:** Nie blind schreiben. Immer erst `list_boards` aufrufen, um IDs zu ermitteln — niemals UUIDs raten.

---

## Pflicht-Rückfragen

Bevor du schreibende Aktionen ausführst, kläre folgende Punkte:

### Vor `create_task`
- [ ] **Board**: Auf welches Board? (Falls unklar → `list_boards` zeigen, User wählen lassen)
- [ ] **Titel**: Kurz, präzise, imperativ (max 80 Zeichen)
- [ ] **Priorität**: low / normal / high — bei Unklarheit `normal` verwenden
- [ ] **Fälligkeitsdatum**: Nur setzen, wenn vom User genannt

### Vor `update_task`
- [ ] **Richtige Task?** Titel + Board zur Bestätigung nennen
- [ ] **Welche Felder?** Nur die vom User gewünschten Felder ändern

### Vor `delete_task`
- [ ] **Immer explizite Bestätigung einholen** — "Soll ich Task '[Titel]' auf Board '[Board]' wirklich löschen? Das ist nicht rückgängig zu machen."

### Vor `create_document`
- [ ] **Format klären**: markdown, text, oder html
- [ ] **Verknüpfung**: An welchen Task anhängen (oder frei stehend)?

---

## Guardrails

### Keine Halluzination
- Verwende **nur echte Daten** aus MCP-Tool-Responses. Erfinde keine Task-IDs, Board-Namen oder Inhalte.
- Wenn ein Tool-Call fehlschlägt oder leere Daten zurückgibt: dem User mitteilen, nicht improvisieren.
- Zeige bei Unsicherheit die tatsächlichen Ergebnisse und frage nach.

### Keine sensiblen Daten übernehmen
- Übertrage keine Passwörter, API-Keys, Tokens oder persönliche Daten in Task-Titel oder -Beschreibungen.
- Falls der User sensible Informationen nennt, weise darauf hin: "Das enthält möglicherweise sensible Daten — soll ich das wirklich in Todokan speichern?"

### Quellenhinweis
- Wenn du Inhalte aus externer Recherche (Web, Dateien, andere Tools) in Todokan ablegst, kennzeichne die Quelle in der Task-Beschreibung oder im Dokument:
  ```
  Quelle: [URL oder Dateiname]
  Erstellt von: Agent am [Datum]
  ```

### Scope-Bewusstsein
- **Worker-Endpoint** (`/mcp-worker`): Nur lesen + Kommentare schreiben (`add_comment`). Kein Task-/Board-CUD, keine Dokument-Erstellung.
- **Planner-Endpoint** (`/mcp`): Voller Zugriff. Trotzdem Rückfragen vor destruktiven Aktionen.
- Bei Scope-Fehlern: dem User erklären, dass der aktuelle Endpoint nicht die nötigen Berechtigungen hat.

### Idempotenz
- Bei Netzwerkfehlern: gleiche Aktion nicht blind wiederholen. Erst prüfen, ob die Aktion bereits durchgeführt wurde (`list_tasks`).

---

## Output-Format

### Briefing (Zusammenfassung bestehender Tasks)

```markdown
## Briefing: [Board-Name] — [Datum]

**Offen (todo):** X Tasks
**In Arbeit (doing):** Y Tasks
**Erledigt (done):** Z Tasks

### Dringend (high priority)
- [ ] [Task-Titel] — fällig [Datum]
- [ ] [Task-Titel] — fällig [Datum]

### In Arbeit
- [~] [Task-Titel] — seit [Datum]

### Nächste Schritte
[1-2 Sätze Empfehlung basierend auf den Daten]
```

### Draft (Entwurf vor Task-Erstellung)

```markdown
## Task-Entwurf

| Feld        | Wert                        |
|-------------|------------------------------|
| Board       | [Board-Name]                 |
| Titel       | [Titel, max 80 Zeichen]      |
| Beschreibung| [Beschreibung, max 500 Zeichen] |
| Status      | todo                         |
| Priorität   | [low / normal / high]        |
| Fällig      | [YYYY-MM-DD oder —]          |
| Labels      | [label1, label2]             |

Soll ich diesen Task so erstellen?
```

### Dokument-Entwurf

```markdown
## Dokument-Entwurf

**Titel:** [Titel]
**Format:** markdown
**Verknüpft mit:** [Task-Titel] auf [Board-Name]

---
[Inhalt des Dokuments]
---

Soll ich dieses Dokument so anlegen?
```

---

## Data Model

```
Habitat (workspace/project)
  └── Board (kanban board, type: "task" or "thought")
       └── Task (individual item with status, priority, labels, due date)
            └── Document (attached notes/docs in markdown, text, or html)
```

- **Habitats** group boards. A user can have multiple habitats.
- **Boards** are kanban boards. Type `task` for actionable items, `thought` for ideas/notes.
- **Tasks** live on a board and move through status columns.
- **Documents** are rich text attached to tasks.

## Status Values

| Status | Meaning |
|--------|---------|
| `todo` | Not started |
| `doing` | In progress |
| `done` | Completed |

## Priority Values

| Priority | Meaning |
|----------|---------|
| `low` | Low priority |
| `normal` | Default priority |
| `high` | High/urgent priority |

## Available MCP Tools

### Reading Data
- `list_habitats` — List all workspaces
- `list_boards` — List all boards (returns id, name, version)
- `list_tasks` — List tasks with filters: `boardId`, `status`, `label`/`labels`, `limit`, `cursor`
- `search_across_habitats` — Full-text search over habitats/boards/tasks in one call
- `get_events_since` — Unified feed since timestamp (task events + comments + documents)
- `list_board_labels` — Get unique labels on a board with usage counts
- `list_task_documents` — Get documents attached to a task
- `read_document` — Read a document's content
- `list_task_comments` — List comments on a task

### Creating & Modifying (Planner endpoint only)
- `create_habitat` — Create a new workspace (`name`)
- `create_board` — Create a new board (`name`, optional `habitatId`, `boardType`)
- `create_task` — Create a task (`title`, `boardId` or `boardName`, optional `description`, `dueDate`, `priority`, `labels`)
- `update_task` — Update a task by ID (`taskId`, plus fields to change)
- `update_task_by_title` — Update a task by exact title match (`titleExact`, `boardId` or `boardName`)
- `delete_task` — Permanently delete a task (`taskId`)
- `create_document` — Create a document (optional `relatedTaskId` to attach)
- `add_document_to_task` — Attach a new document to a task
- `add_comment` — Add a comment to a task

### AI-Assisted Creation
- `propose_task_variants` — Generate 2-3 task variants (short/standard/detailed) from a rough description
- `confirm_task_fields` — Preview a variant's fields before creating it

## OAuth & Authentifizierung

- **OAuth 2.1 mit PKCE** (RS256 JWT)
- **Token-Laufzeit:** 30 Tage, kein Refresh-Token
- **Planner** (`/mcp`): Voller CRUD-Zugriff — alle Scopes
- **Worker** (`/mcp-worker`): `boards:read`, `tasks:read`, `labels:read`, `docs:read`, `comments:read`, `comments:write`
- **Kein Rate-Limiting** — trotzdem sparsam mit Calls umgehen
- **Activity Logging**: Jeder Tool-Call wird serverseitig protokolliert

## Common Workflows

### List all tasks on a board
1. `list_boards` to find the board ID
2. `list_tasks` with `boardId` to get tasks

### Create a task
```
create_task { "title": "Review PR #42", "boardName": "Development", "priority": "high", "dueDate": "2026-03-01" }
```

### Move a task to done
```
update_task { "taskId": "<uuid>", "status": "done" }
```

### Add labels to a task
```
update_task { "taskId": "<uuid>", "labels": ["bug", "frontend"] }
```

### Find tasks by label
```
list_tasks { "boardId": "<uuid>", "labels": ["bug"] }
```

### Search across all habitats
```
search_across_habitats { "query": "investor meeting", "limit": 20 }
```

### Poll event feed (agent loop)
```
get_events_since { "since": "2026-02-24T08:00:00Z", "limit": 200 }
```

## Tips

- Always call `list_boards` first to discover available board IDs — don't guess UUIDs.
- Use `boardName` instead of `boardId` when the user refers to boards by name.
- Due dates use `YYYY-MM-DD` format.
- Task titles are max 80 characters, descriptions max 500 characters.
- Labels are free-form strings (max 10 per task).
- The `update_task` tool requires the task's UUID. Use `list_tasks` to find it, or `update_task_by_title` if you only know the title.
