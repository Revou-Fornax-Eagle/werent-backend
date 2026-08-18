# ADR & Changelog: WeRent Backend

**Version:** 1.0 | **Date:** 2026-08-16
**Author:** Architect AI

---

## ADR-001: Majority vote with tie-break for fit assessment

**Status:** Accepted

**Context:** Issue #15 requires aggregating per-reviewer fit feedback into a single overall assessment.

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| A. Majority vote | Simple, explainable, matches "what most people say" | Ties possible |
| B. Weighted distribution | More nuanced | Over-engineered for portfolio scope |
| C. Mean of ordinal mapping | Numeric output | Loses categorical semantics |

**Decision:** **A — Majority vote**, with a deterministic tie-break: a tie that includes `TRUE_TO_SIZE` resolves to `TRUE_TO_SIZE`; any other tie (e.g. `RUNS_SMALL` vs `RUNS_LARGE`) resolves to `null` ("no consensus").

**Rationale:** Most users would read "the majority of reviewers say X" naturally. `TRUE_TO_SIZE` wins ties because it is the neutral/conservative answer. When the only split is between `RUNS_SMALL` and `RUNS_LARGE` (no `TRUE_TO_SIZE` in the tie), picking either would be misleading, so the API returns `null` (no consensus) while still exposing the full distribution.

**Consequences:** Distribution counts always returned; `hasData=false` when zero responses.

---

## ADR-002: Fit feedback embedded in Review table (nullable enum)

**Status:** Accepted

**Context:** Issue #14 — where to store per-reviewer fit feedback.

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| A. Column on `reviews` | No join, simple | Column nullable |
| B. Separate `FitFeedback` table | Strict normalization | Extra join for every aggregation |

**Decision:** **A — nullable enum column `fitFeedback` on `reviews`.**

**Rationale:** 1:1 relationship with review; aggregation is a simple `groupBy`. No benefit from a separate table at this scale.

---

## ADR-003: Socket.io (not raw WebSocket) for real-time

**Status:** Accepted

**Context:** Issue #10 — real-time review count updates.

**Decision:** Socket.io with `@nestjs/websockets`.
**Rationale:** Auto-reconnection, rooms, fallback transport — free with NestJS integration. Raw WebSocket would require hand-rolling reconnection (issue #8 explicitly asks for reconnect handling).

---

## ADR-005: Soft-delete + unique constraint interaction (documented risk)

**Status:** Accepted (risk noted — no code change yet)

**Context:** `reviews` has `@@unique([userId, productId])` (idempotency, issue #9) **and** `isDeleted` soft-delete. There is currently no delete endpoint, but once one is added, a soft-deleted review still occupies its `(userId, productId)` slot, blocking re-review.

**Decision:** Document the risk now. When a delete feature lands, replace the plain unique constraint with a partial unique index (`WHERE isDeleted = false`) or a `(userId, productId, isDeleted)` key with a nullable `deletedAt`.

**Consequences:** No double-count today; the trap is flagged so it is not discovered at delete-feature time.

---

## ADR-006: Cascade delete on reviews

**Status:** Accepted (risk noted)

**Context:** `Review.product` and `Review.user` use `onDelete: Cascade`. Deleting a product/user hard-deletes all their reviews.

**Decision:** Acceptable for portfolio scope (no delete endpoints exist). Flagged: if review retention matters later, switch users/products to soft-delete and reviews to `onDelete: Restrict`.

---

## ADR-004: Temporary `userId` from body (auth deferred)

**Status:** Accepted (temporary)

**Context:** POST /reviews needs identity; auth not in current issue scope.

**Decision:** Accept `userId` in body for this sprint; **documented as temporary**. ADR to switch to JWT guard when auth epic exists.
**Risk:** Spoofing (medium) — mitigated by rate limiting; flagged in security threat model.

---

## Changelog

| Version | Date | Change | Reason |
|---------|------|--------|--------|
| 1.0 | 2026-08-16 | Initial architecture docs (overview, system design, database, API, backend, security, ADRs) | Design phase for issues #9, #10, #14, #15, #16 |
| 1.1 | 2026-08-17 | Correct tie-break spec (ADR-001) to match implementation (`null` for non-TTS ties); add ADR-005 (soft-delete trap) + ADR-006 (cascade delete); fix schema doc CHECK-constraint overstatement | Doc/code drift reconciliation after code review |

---

## Assumptions Log

| # | Assumption | Risk if Wrong | Valid Until |
|---|-----------|---------------|-------------|
| A1 | NestJS + Prisma + PostgreSQL confirmed by team | Complete redesign | Confirmed 2026-08-16 |
| A2 | Fit feedback is per-review (1:1), nullable | Schema change | PRD review |
| A3 | Auth out of scope; userId from body temporary | Security hole | Auth epic created |
| A4 | Tie-break preference acceptable to product | Different expected result | Product sign-off |
| A5 | Review is the only source of fit feedback (no separate size chart entry) | Missing data path | Product sign-off |
| A6 | Product/user seeding is a dev concern (seed script), not auth concern | No demo data | Seed script created |

---

## Handoff Checklist → build agent

- [ ] All P0 requirements covered (F1–F5) ✓
- [ ] Tech stack pinned (NestJS 10, Prisma 5, PG 16, Socket.io 4) ✓
- [ ] Prisma schema in `database/01-schema.md` — ready to transcribe ✓
- [ ] API contracts in `api-contracts/01-standard.md` ✓
- [ ] Fit aggregation algorithm specified with tie-break ✓
- [ ] Error format + pagination specified ✓
- [ ] STRIDE threat model documented ✓
- [ ] **Reminder for build:** run `arch-verify` before commit: `bash ~/.opencode/skills/arch-verify/arch-verify.sh --precommit`
