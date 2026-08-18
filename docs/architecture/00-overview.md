# Architecture: WeRent Backend

**Version:** 1.0 | **Date:** 2026-08-16
**Author:** Architect AI
**Repo:** `Revou-Fornax-Eagle/werent-backend` (backend) + `Revou-Fornax-Eagle/werent` (frontend)

---

## 1. Context & Goals

### Problem Statement
WeRent is a clothing rental e-commerce application. The Product Detail Page (PDP) needs two data-backed features:

1. **Review Count (Epic RP-00)** — show total review count per product, updated in real-time when a new review is posted.
2. **Overall Fitting (Epic RP-04)** — aggregate per-reviewer fit feedback ("runs small" / "true to size" / "runs large") into a single overall fit assessment with an underlying distribution, exposed via API.

### Project Type
**Academic/Portfolio project** (RevoU Fornax Eagle team project) — prioritizes clarity, testability, and working demo over extreme scale.

### Constraints
| Constraint | Detail |
|------------|--------|
| Timeline | Project milestone (RP-04 sprint) |
| Team | Small student team (multi-repo: FE + BE) |
| Budget | Free tier (local dev, optional free hosting) |
| Stack | NestJS + Prisma ORM + PostgreSQL (user-confirmed) |

---

## 2. PRD (Product Requirements) — Backend Scope

Derived from GitHub issues: #9, #10, #14, #15, #16.

| # | Feature | Priority | Issue | Description |
|---|---------|----------|-------|-------------|
| F1 | Review Count Aggregation | P0 | #9 | Count reviews per product, expose via product detail API. Explicit `0` when none. |
| F2 | Real-time Review Count Update | P0 | #10 | Emit event (WebSocket) when a review is created; payload = product ID + updated count. |
| F3 | Fit Feedback Data Model | P0 | #14 | Schema + validation for per-reviewer fit feedback (RUNS_SMALL / TRUE_TO_SIZE / RUNS_LARGE) linked to review record. |
| F4 | Overall Fit Assessment Algorithm | P0 | #15 | Aggregate individual fit feedback into one overall assessment + distribution. "No data" flag when zero responses. |
| F5 | Fit Assessment & Distribution API | P0 | #16 | Expose overall fit assessment + distribution through product detail API, incl. no-data flag. |

### Non-Functional Requirements
| Category | Requirement |
|----------|-------------|
| API Style | REST (JSON) + WebSocket (Socket.io) for real-time |
| Response Format | Uniform `{ success, data, error, meta }` envelope |
| Validation | Class-validator DTOs on all inputs; whitelist fit values |
| Real-time | Socket.io gateway, event name `review_count_updated` |
| DB | PostgreSQL via Prisma ORM, migrations versioned |
| Testing | Unit (service) + e2e (module) for aggregation & count |
| Performance | Product detail request P95 < 300ms (local) |

---

## 3. Features Breakdown (WAJIB — Detail per Feature)

### F1: Review Count Aggregation (P0) — Issue #9
| Aspect | Detail |
|--------|--------|
| **User Story** | Sebagai user PDP, saya ingin melihat jumlah review, sehingga saya bisa menilai popularitas produk. |
| **Input** | `productId` (path param) |
| **Output** | `reviewCount: number` (0 eksplisit saat belum ada review) |
| **Business Rules** | Count hanya review yang valid (soft-deleted excluded). Return `0` bukan `null` saat kosong. |
| **Error Cases** | Product tidak ada → 404 NOT_FOUND |
| **Dependencies** | Product entity exists |
| **Tech Notes** | `prisma.review.count({ where: { productId } })` — single aggregate query |

### F2: Real-time Review Count Update (P0) — Issue #10
| Aspect | Detail |
|--------|--------|
| **User Story** | Sebagai user PDP, saya ingin count update live tanpa refresh saat review baru masuk. |
| **Input** | Socket connection ke `review-count/{productId}` room |
| **Output** | Event `review_count_updated` → `{ productId, reviewCount }` |
| **Business Rules** | Event di-emit hanya setelah review berhasil dibuat (transaction commit). Client join room per product. |
| **Error Cases** | Socket putus → client fallback: re-join + refetch count |
| **Dependencies** | F1 (count logic), Review create flow |
| **Tech Notes** | NestJS `@WebSocketGateway` + `@SubscribeMessage('joinProductRoom')`; emit ke room |

### F3: Fit Feedback Data Model (P0) — Issue #14
| Aspect | Detail |
|--------|--------|
| **User Story** | Sebagai reviewer, saya ingin memberikan feedback ukuran produk. |
| **Input** | `fitFeedback?: 'RUNS_SMALL' \| 'TRUE_TO_SIZE' \| 'RUNS_LARGE'` (optional) |
| **Output** | Persisted field pada Review record |
| **Business Rules** | Allowed values hanya 3 enum. Nullable (review boleh tanpa fit feedback). Harus tervalidasi. |
| **Error Cases** | Value tidak valid → 400 VALIDATION_ERROR |
| **Dependencies** | Review entity |
| **Tech Notes** | Prisma `enum FitFeedback`, column nullable pada `Review` |

### F4: Overall Fit Assessment Algorithm (P0) — Issue #15
| Aspect | Detail |
|--------|--------|
| **User Story** | Sebagai user dengan body-type concern, saya ingin tahu bagaimana produk fit di mayoritas pengguna. |
| **Input** | Kumpulan `fitFeedback` dari semua review product |
| **Output** | `{ assessment: FitFeedback \| null, distribution: { RUNS_SMALL: n, TRUE_TO_SIZE: n, RUNS_LARGE: n }, totalResponses: n, hasData: boolean }` |
| **Business Rules** | Aggregasi **majority vote**. Tie-break: tie yang melibatkan `TRUE_TO_SIZE` → `TRUE_TO_SIZE`; tie lain (mis. `RUNS_SMALL` vs `RUNS_LARGE`) → `null` (no consensus). `hasData=false` saat `totalResponses=0`. Distribution selalu dihitung dari semua response. |
| **Error Cases** | Tidak ada response → `assessment: null, hasData: false` (bukan error) |
| **Dependencies** | F3 (data ada) |
| **Tech Notes** | `groupBy` di Prisma atau map di service; pure function → unit-test friendly |

### F5: Fit Assessment & Distribution API (P0) — Issue #16
| Aspect | Detail |
|--------|--------|
| **User Story** | Sebagai FE, saya ingin satu endpoint yang menyediakan semua info fit untuk PDP. |
| **Input** | `productId` (path param) |
| **Output** | Product detail + `reviewCount` + `fitAssessment` (assessment, distribution, totalResponses, hasData) |
| **Business Rules** | Digabung ke product detail API (bukan endpoint terpisah) agar FE 1 request. `hasData=false` dipakai FE untuk empty-state CTA (#13). |
| **Error Cases** | Product tidak ada → 404 |
| **Dependencies** | F1 (count), F4 (algorithm) |
| **Tech Notes** | Service meng-orkestrasi: product lookup → count → fit aggregation |
