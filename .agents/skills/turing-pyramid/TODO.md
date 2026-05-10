# Turing Pyramid — Future Development

## ✅ COMPLETED

### ~~2. Cross-Need Impact~~ — DONE in v1.7.1

**Implemented:**
- 22 cross-need connections (on_action + on_deprivation)
- Float satisfaction (0.00-3.00)
- Protection: floor=0.5, ceiling=3.0, cooldown=4h
- Base needs isolation (security/integrity protected)
- Stress-tested with 18 cycles

**Files:**
- `assets/cross-need-impact.json` — connection matrix
- `scripts/apply-deprivation.sh` — cascade logic
- `scripts/mark-satisfied.sh` — on_action propagation

*Completed: 2026-02-25 06:09*

---

## v2.0 Ideas

### 1. Self-Feedback Loop (Adaptive Decay)

**Concept:** Decay rates auto-adjust based on how often need hits critical levels.

**Mechanism:**
- If need frequently drops to sat=0-1, decay_rate increases (slower decay)
- Goal: keep needs in sat=2-3 range on regular basis
- Small % adjustment per cycle, converges over N cycles

**Open Problem:**
- Adaptive decay may conflict with event scans
- If decay slows too much, we become insensitive to real events
- Need balance: decay adapts, but events still override

**Possible Solution:**
- Track `decay_drift` separately from base `decay_rate`
- Events always use scan result, decay_drift only affects time component
- Or: cap max decay_rate adjustment (e.g., ±50% of original)

---

### 2. Self-Upgrade Layer (Growth vs Homeostasis)

**Concept:** Separate layer for iterative progression, not just maintenance.

**Insight from Noosphere analysis:**
> "Turing Pyramid works at metabolic layer — keeping lights on.
> Missing: consciousness layer — making lights mean something."

**Key difference:**
- Homeostasis: return to baseline (sat=3)
- Growth: raise the baseline itself

**Possible Approaches:**
- Track `skill_level` or `capability_growth` over time
- "Meta-needs": learning rate, complexity tolerance, autonomy scope
- Milestone system: after N cycles at stable homeostasis, unlock new capabilities
- Integration with SELF.md observations

**Open Questions:**
- How to measure "growth" vs just "activity"?
- What counts as genuine progression?
- How to avoid Noosphere trap (imposing growth narrative vs discovering it)?

---

---

### 3. Curiosity (separate from Understanding)

**Concept:** understanding ≠ curiosity. Understanding is about knowledge gained, curiosity is about *wanting* to know.

**Why needed:**
- Current understanding tracks "did I learn?" 
- Missing: "do I want to explore?"
- Curiosity drives exploration, understanding rewards it

**Implementation ideas:**
- New need: curiosity (importance ~3-4, decay ~8-12h)
- Cross-need: curiosity ACTION → understanding +0.15
- Cross-need: understanding ACTION → curiosity +0.10 (learning sparks more questions)
- Actions: "follow a random interesting link", "ask a question nobody asked", "explore unknown territory"

**Open questions:**
- How to distinguish from understanding in scans?
- Does low curiosity = stagnation or contentment?

---

### 4. Stillness / Rest (intentional pause)

**Concept:** System currently rewards activity. But conscious rest ≠ deprivation.

**Problem:**
- All needs decay over time → constant pressure to act
- No way to say "I'm intentionally resting, not failing"
- Meditation, reflection, pause — these have value

**Possible approaches:**
- New need: stillness (low importance ~1-2, slow decay ~24-48h)
- Or: "rest mode" flag that pauses decay temporarily
- Or: certain actions satisfy multiple needs including implicit "rest"

**⚠️ Danger:**
- Could justify permanent passivity
- Need safeguard: stillness cannot be sole activity for >N cycles
- Or: stillness deprivation triggers after prolonged inactivity

**Design principle:** Rest as intentional choice, not as escape from action.

---

## Priority

1. ~~Cross-need impact~~ ✅ DONE
2. Self-feedback loop — useful but needs careful design  
3. Curiosity — concrete, implementable
4. Stillness/Rest — needs careful design to avoid passivity trap
5. Self-upgrade layer — most ambitious, needs more thinking

---

*Updated: 2026-02-25 06:13*
