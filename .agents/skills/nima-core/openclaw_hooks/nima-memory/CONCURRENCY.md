# NIMA Memory Concurrency & Locking Strategy

**Status:** Implemented ✅
**Date:** 2026-02-16
**Author:** Backend Architect Subagent

## Overview
NIMA Memory uses a hybrid concurrency model to handle high-throughput memory capture without race conditions or data corruption.

## 1. Atomic Initialization (Fix for Race Condition)
**Problem:** Multiple `agent_end` hooks firing simultaneously could trigger multiple database initializations, causing race conditions or errors.
**Solution:**
- Implemented `ensureInitialized()` using a Promise singleton pattern.
- Double-check locking: Check `initPromise` first, then create it if null.
- Retry logic with backoff ensures resilience against transient FS errors.

```javascript
// Singleton promise
let initPromise = null;

async function ensureInitialized() {
  if (initPromise) return initPromise;
  initPromise = (async () => { ... })();
  return initPromise;
}
```

## 2. Write Serialization (Fix for SQLite Contention)
**Problem:** SQLite in WAL mode allows multiple readers but only one writer. Concurrent `execPython` calls from multiple hooks caused `SQLITE_BUSY` errors or timeouts.
**Solution:**
- Implemented an in-memory **Write Queue** (`writeQueue`).
- `queuedWrite(op)` pushes operations to the queue and returns a Promise.
- `processQueue()` executes writes sequentially, ensuring only one Python process writes to the DB at a time.
- Uses `setImmediate` to yield to the event loop between writes while maintaining throughput.

## 3. Unique Turn IDs (Fix for Collision)
**Problem:** `turn_id` based solely on `Date.now()` caused collisions when multiple memories were captured in the same millisecond.
**Solution:**
- Added 4 bytes of randomness to the ID: `turn_${timestamp}_${randomHex}`.
- Added strict SQL constraint: `CREATE UNIQUE INDEX idx_nodes_turn_layer_unique ON memory_nodes(turn_id, layer)`.
- This guarantees data integrity at the database level.

## 4. Dual-Write Architecture
- **Primary:** SQLite (Graph + FTS5) with the above locking.
- **Secondary:** LadybugDB (Graph) via fire-and-forget or awaited dual-write.
- **Fallback:** Emergency JSON backup if both fail.

## Testing
- Verified via `test_concurrency.py`:
  - Unique constraint correctly rejects duplicates.
  - Concurrent writes (10 threads) succeed without corruption in WAL mode.
