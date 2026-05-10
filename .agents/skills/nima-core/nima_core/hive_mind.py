"""
NIMA Hive Mind — Proposal #7: Memory Entanglement
==================================================
Share memory context across agents and capture their results back to LadybugDB.

Two core functions:
1. Context injection  — before spawning a sub-agent, inject relevant memories
2. Result capture     — after a sub-agent finishes, persist its output as memory

Optional: Redis-based HiveBus for real-time agent-to-agent messaging.

Usage:
    from nima_core.hive_mind import HiveMind

    hive = HiveMind(db_path="~/.nima/memory/ladybug.lbug")

    # 1. Build enriched task for sub-agent
    enriched_task = hive.build_agent_context(
        task="Research transformer attention mechanisms",
        agent_name="researcher",
    )

    # 2. Spawn agent with enriched_task (your framework of choice)
    result = my_spawn_agent(enriched_task)

    # 3. Capture result back to memory
    hive.capture_agent_result(
        agent_label="researcher",
        result_summary=result[:500],
        model="gpt-4o",
        importance=0.8,
    )
"""

import json
import logging
import re
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

try:
    import real_ladybug as lb
    HAS_LADYBUG = True
except ImportError:
    HAS_LADYBUG = False


# ── Stop words for keyword extraction ─────────────────────────────────────────

_STOPWORDS = {
    "i", "me", "my", "we", "our", "you", "your", "he", "him", "his", "she",
    "her", "it", "its", "they", "them", "their", "what", "which", "who",
    "this", "that", "these", "those", "am", "is", "are", "was", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "a", "an",
    "the", "and", "but", "if", "or", "as", "at", "by", "for", "with", "into",
    "to", "from", "in", "on", "up", "not", "so", "can", "will", "just",
    "build", "please", "task", "test", "also", "some", "all", "then", "than",
}


def _extract_keywords(text: str, top_n: int = 5) -> List[str]:
    words = re.findall(r"\w+", text.lower())
    filtered = [w for w in words if w not in _STOPWORDS and len(w) > 2]
    counts: Dict[str, int] = {}
    for w in filtered:
        counts[w] = counts.get(w, 0) + 1
    return [k for k, _ in sorted(counts.items(), key=lambda x: x[1], reverse=True)[:top_n]]


class HiveMind:
    """
    Memory Entanglement — inject memory context into sub-agents and capture results.

    This is the foundational layer for multi-agent memory sharing:
    any agent can query relevant memories before starting and persist
    its output back to the shared memory store.
    """

    def __init__(
        self,
        db_path: Optional[str] = None,
        agent_name: str = "orchestrator",
        max_context_memories: int = 8,
        memory_types_to_query: Optional[List[str]] = None,
    ):
        """
        Args:
            db_path:                 LadybugDB path (.lbug). If None, context injection
                                     returns empty (graceful degradation).
            agent_name:              Name of the orchestrating agent (used in capture).
            max_context_memories:    Max memories to inject per task.
            memory_types_to_query:   Memory layers to search. Defaults to
                                     ["contemplation", "episodic", "semantic", "legacy_vsa"].
        """
        self.db_path = str(Path(db_path).expanduser()) if db_path else None
        self.agent_name = agent_name
        self.max_context_memories = max_context_memories
        self.memory_types_to_query = memory_types_to_query or [
            "contemplation", "episodic", "semantic", "legacy_vsa"
        ]

    # ── Context Injection ─────────────────────────────────────────────────────

    def query_memories(self, keywords: List[str], top_k: int = 10) -> List[Dict]:
        """Query LadybugDB for memories relevant to the given keywords."""
        if not HAS_LADYBUG or not self.db_path:
            return []
        if not Path(self.db_path).exists():
            logger.warning(f"LadybugDB not found: {self.db_path}")
            return []

        db = lb.Database(self.db_path)
        conn = lb.Connection(db)
        memories: List[Dict] = []
        seen_ids = set()

        # Strategy: per-keyword scans (no OR support in all LadybugDB versions)
        for kw in keywords[:3]:
            try:
                rows = conn.execute(
                    f"""MATCH (n:MemoryNode)
                        WHERE n.is_ghost = false
                          AND (n.text CONTAINS '{kw}' OR n.summary CONTAINS '{kw}')
                        RETURN n.id, n.text, n.summary, n.who, n.timestamp, n.importance, n.layer
                        LIMIT 5"""
                )
                for row in rows:
                    rid = int(row[0])
                    if rid in seen_ids:
                        continue
                    seen_ids.add(rid)
                    memories.append(
                        {
                            "id": rid,
                            "text": str(row[1] or ""),
                            "summary": str(row[2] or ""),
                            "who": str(row[3] or ""),
                            "timestamp": float(row[4] or 0),
                            "importance": float(row[5] or 0.5),
                            "layer": str(row[6] or ""),
                        }
                    )
            except Exception as e:
                logger.debug(f"Keyword query failed for '{kw}': {e}")
                continue

        # Sort by importance + recency
        memories.sort(key=lambda m: (m["importance"], m["timestamp"]), reverse=True)
        return memories[:top_k]

    def format_context_block(self, memories: List[Dict]) -> str:
        """Format a list of memory dicts into an injectable context block."""
        if not memories:
            return ""

        lines = ["## HIVE CONTEXT (from shared memory)", ""]
        for m in memories:
            ts = m.get("timestamp", 0)
            if ts:
                try:
                    date = datetime.fromtimestamp(float(ts) / 1000).strftime("%Y-%m-%d")
                except Exception:
                    date = "?"
            else:
                date = "?"
            text = m.get("summary") or m.get("text", "")[:200]
            who = m.get("who", "")
            who_str = f" [{who}]" if who and who not in ("self", "unknown", "") else ""
            lines.append(f"• [{date}]{who_str} {text}")

        lines.append("")
        return "\n".join(lines)

    def build_agent_context(
        self,
        task: str,
        agent_name: Optional[str] = None,
        max_memories: Optional[int] = None,
    ) -> str:
        """
        Build an enriched task string with memory context prepended.

        Args:
            task:         The task/prompt for the sub-agent.
            agent_name:   Override the agent label in the context header.
            max_memories: Override max context memories.

        Returns:
            The task string with a HIVE CONTEXT block prepended (or just
            the original task if no relevant memories found).
        """
        keywords = _extract_keywords(task, top_n=5)
        if not keywords:
            return task

        max_k = max_memories or self.max_context_memories
        memories = self.query_memories(keywords, top_k=max_k)
        context_block = self.format_context_block(memories)

        if not context_block:
            return task

        agent_label = agent_name or self.agent_name
        header = f"## HIVE CONTEXT for {agent_label}\n\n"
        return header + context_block + "## YOUR TASK\n\n" + task

    # ── Result Capture ────────────────────────────────────────────────────────

    def capture_agent_result(
        self,
        agent_label: str,
        result_summary: str,
        model: str = "unknown",
        importance: float = 0.7,
        layer: str = "episodic",
        extra: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Persist a sub-agent's result back to LadybugDB as a memory.

        Args:
            agent_label:     Name/label of the agent that produced the result.
            result_summary:  Summary of what the agent produced (≤500 chars recommended).
            model:           Model used by the agent.
            importance:      Memory importance (0–1).
            layer:           Memory layer to store in.
            extra:           Optional extra fields to include in the text.

        Returns:
            True if stored successfully, False otherwise.
        """
        if not HAS_LADYBUG or not self.db_path:
            logger.warning("LadybugDB not available — result not captured")
            return False
        if not Path(self.db_path).exists():
            return False

        now = datetime.now()
        ts_ms = int(now.timestamp() * 1000)
        text = (
            f"[Agent result: {agent_label}] [{model}] "
            f"[{now.strftime('%Y-%m-%d %H:%M')}] "
            + result_summary[:800]
        )
        if extra:
            text += " | " + json.dumps(extra)[:200]

        db = lb.Database(self.db_path)
        conn = lb.Connection(db)
        try:
            conn.execute(
                f"""CREATE (n:MemoryNode {{
                    text: '{_escape(text)}',
                    summary: '{_escape(result_summary[:200])}',
                    who: 'agent:{agent_label}',
                    timestamp: {ts_ms},
                    importance: {importance},
                    layer: '{layer}',
                    strength: {importance},
                    decay_rate: 0.01,
                    last_accessed: {ts_ms},
                    is_ghost: false,
                    dismissal_count: 0,
                    memory_type: 'agent_result'
                }})"""
            )
            conn.commit()
            logger.info(f"Captured result from agent:{agent_label} to LadybugDB")
            return True
        except Exception as e:
            logger.error(f"Failed to capture agent result: {e}")
            return False


# ── HiveBus (Redis pub/sub) — optional extra ──────────────────────────────────

class HiveBus:
    """
    Redis-backed message bus for real-time agent-to-agent communication.

    Requires: redis-py (`pip install redis`)
    Requires: a running Redis instance (e.g. `docker run -d -p 6379:6379 redis:alpine`)

    Usage:
        bus = HiveBus("my-agent", role="research", swarm_id="swarm-001")
        bus.broadcast("Starting research on transformers")
        bus.send_to_role("review", "Please review this draft: ...")
        for msg in bus.listen(timeout=60):
            print(msg)
    """

    CHANNEL_BROADCAST = "hive"

    def __init__(
        self,
        agent_id: str,
        role: str = "agent",
        swarm_id: Optional[str] = None,
        redis_url: str = "redis://localhost:6379",
    ):
        self.agent_id = agent_id
        self.role = role
        self.swarm_id = swarm_id
        self.redis_url = redis_url
        self._r = None

    def _redis(self):
        if self._r is None:
            try:
                import redis
                self._r = redis.from_url(self.redis_url, decode_responses=True)
            except ImportError:
                raise RuntimeError(
                    "redis-py not installed. Run: pip install redis"
                )
        return self._r

    def ping(self) -> bool:
        try:
            return self._redis().ping()
        except Exception:
            return False

    def _publish(self, channel: str, payload: dict):
        payload.setdefault("from_agent", self.agent_id)
        payload.setdefault("from_role", self.role)
        payload.setdefault("swarm_id", self.swarm_id)
        payload.setdefault("ts", datetime.utcnow().isoformat())
        self._redis().publish(channel, json.dumps(payload))

    def broadcast(self, content: str, msg_type: str = "broadcast"):
        self._publish(self.CHANNEL_BROADCAST, {"type": msg_type, "content": content})

    def send_to_role(self, role: str, content: str, msg_type: str = "direct"):
        self._publish(f"role:{role}", {"type": msg_type, "content": content, "to_role": role})

    def send_to_agent(self, agent_id: str, content: str, msg_type: str = "direct"):
        self._publish(f"agent:{agent_id}", {"type": msg_type, "content": content, "to_agent": agent_id})

    def send_result(self, content: str):
        """Publish a result to the swarm results channel."""
        if not self.swarm_id:
            raise ValueError("swarm_id required for send_result")
        self._publish(f"results:{self.swarm_id}", {"type": "result", "content": content})

    def listen(self, timeout: float = 60.0, channels: Optional[List[str]] = None):
        """
        Subscribe and yield incoming messages as dicts.
        Default channels: hive broadcast + this agent's role + agent-direct.
        """
        import time
        r = self._redis()
        subs = channels or [
            self.CHANNEL_BROADCAST,
            f"role:{self.role}",
            f"agent:{self.agent_id}",
        ]
        ps = r.pubsub()
        ps.subscribe(*subs)
        deadline = time.time() + timeout
        for message in ps.listen():
            if time.time() > deadline:
                break
            if message["type"] == "message":
                try:
                    yield json.loads(message["data"])
                except json.JSONDecodeError:
                    yield {"raw": message["data"]}

    def active_agents(self) -> List[str]:
        """Return agent IDs that have recently heartbeated."""
        r = self._redis()
        keys = r.keys("hive:heartbeat:*")
        return [k.replace("hive:heartbeat:", "") for k in keys]

    def heartbeat(self, ttl: int = 60):
        """Announce this agent is alive (auto-expires after ttl seconds)."""
        self._redis().setex(f"hive:heartbeat:{self.agent_id}", ttl, self.role)


def _escape(s: str) -> str:
    """Escape single quotes for Kuzu Cypher string literals."""
    return s.replace("'", "\\'").replace("\\", "\\\\")


# ── Standalone Hive Utilities (Proposal 07: Memory Entanglement) ──────────────

def capture_agent_result(
    agent_label: str,
    result_summary: str,
    model_used: str,
    db_path: str = None,
) -> None:
    """
    Store a sub-agent's result in LadybugDB with source_agent attribution.

    This is the core of Memory Entanglement — sub-agent outputs are tagged
    with their identity so the orchestrator (and future agents) can query
    "what did agent X find recently?"

    Args:
        agent_label:    Human-readable name (e.g. "research-agent", "code-review")
        result_summary: The agent's output (truncated to 2000 chars)
        model_used:     Model that produced the result (e.g. "gemini-3-flash")
        db_path:        Path to LadybugDB (default: NIMA_HOME/memory/ladybug.lbug)
    """
    import hashlib
    import time

    try:
        import real_ladybug as lb
    except ImportError:
        print("[nima-hive] real_ladybug not available — cannot capture agent result", flush=True)
        return

    nima_home = os.environ.get("NIMA_HOME", os.path.expanduser("~/.nima"))
    db_path = db_path or os.path.join(nima_home, "memory", "ladybug.lbug")

    db   = lb.Database(db_path)
    conn = lb.Connection(db)

    try:
        conn.execute("LOAD VECTOR")
    except Exception:
        pass

    # Get next ID
    try:
        res    = conn.execute("MATCH (n:MemoryNode) RETURN max(n.id) AS max_id")
        max_id = 0
        for row in res:
            max_id = row[0] or 0
        new_id = int(max_id) + 1
    except Exception:
        new_id = int(time.time())

    # Deterministic hash-based embedding (no numpy required)
    content_hash = hashlib.sha256(result_summary.encode()).digest()
    seed_bytes   = content_hash[:4]
    seed         = int.from_bytes(seed_bytes, "big")
    import random as _rnd
    rng = _rnd.Random(seed)
    embedding = [rng.gauss(0, 1) for _ in range(512)]

    now_ms  = int(time.time() * 1000)
    content = result_summary[:2000]

    try:
        conn.execute("""
            CREATE (n:MemoryNode {
                id:           $id,
                who:          $who,
                text:         $text,
                summary:      $summary,
                layer:        $layer,
                fe_score:     $fe_score,
                source_agent: $source_agent,
                model:        $model,
                timestamp:    $timestamp,
                strength:     $strength,
                is_ghost:     $is_ghost,
                embedding:    $embedding
            })
        """, {
            "id":           new_id,
            "who":          f"agent:{agent_label}",
            "text":         content,
            "summary":      result_summary[:200],
            "layer":        "output",
            "fe_score":     0.7,
            "source_agent": agent_label,
            "model":        model_used,
            "timestamp":    now_ms,
            "strength":     1.0,
            "is_ghost":     False,
            "embedding":    embedding,
        })

        # Link to 3 most recent memories (co-occurrence edges)
        for offset in range(3):
            prev_id = int(max_id) - offset
            if prev_id > 0:
                try:
                    conn.execute("""
                        MATCH (a:MemoryNode {id: $aid}), (b:MemoryNode {id: $bid})
                        CREATE (a)-[:relates_to {relation: 'co_occurrence', weight: 1.0}]->(b)
                    """, {"aid": new_id, "bid": prev_id})
                except Exception:
                    pass

        print(f"[nima-hive] ✅ Captured {agent_label} → node {new_id}", flush=True)

    except Exception as e:
        print(f"[nima-hive] ❌ capture_agent_result failed: {e}", flush=True)
    finally:
        conn.close()


def get_swarm_status(db_path: str = None, hours: int = 24) -> dict:
    """
    Query LadybugDB for all sub-agent activity in the last N hours.

    Returns dict with count, agent_labels, and recent_activity.
    """
    try:
        import real_ladybug as lb
    except ImportError:
        return {"error": "real_ladybug not available", "count": 0}

    import time
    nima_home = os.environ.get("NIMA_HOME", os.path.expanduser("~/.nima"))
    db_path   = db_path or os.path.join(nima_home, "memory", "ladybug.lbug")

    cutoff_ms = int((time.time() - hours * 3600) * 1000)
    db   = lb.Database(db_path)
    conn = lb.Connection(db)

    try:
        res = conn.execute(f"""
            MATCH (n:MemoryNode)
            WHERE n.timestamp > {cutoff_ms} AND n.who STARTS WITH 'agent:'
            RETURN n.who, n.source_agent, n.timestamp
            ORDER BY n.timestamp DESC
        """)

        results = [
            {"who": row[0], "source_agent": row[1], "timestamp": row[2]}
            for row in res
        ]
        agents = sorted(set(r["who"] for r in results))

        return {
            "count":           len(results),
            "agent_labels":    agents,
            "recent_activity": results[:10],
        }
    except Exception as e:
        return {"error": str(e), "count": 0}
    finally:
        conn.close()


__all__ = ["HiveMind", "HiveBus", "capture_agent_result", "get_swarm_status"]


def _swarm_cli():
    """CLI: nima-swarm — show swarm status or capture a test result."""
    import argparse, json as _json
    parser = argparse.ArgumentParser(description="NIMA Swarm Status (Proposal 07)")
    parser.add_argument("--hours",   type=int,   default=24,  help="Lookback hours")
    parser.add_argument("--capture", nargs=3, metavar=("AGENT", "SUMMARY", "MODEL"),
                        help="Capture agent result: agent summary model")
    parser.add_argument("--db",      default=None, help="Path to LadybugDB")
    args = parser.parse_args()

    if args.capture:
        agent, summary, model = args.capture
        capture_agent_result(agent, summary, model, db_path=args.db)
    else:
        status = get_swarm_status(db_path=args.db, hours=args.hours)
        print(_json.dumps(status, indent=2, default=str))
