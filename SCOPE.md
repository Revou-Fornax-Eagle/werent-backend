# WeRent Backend — Scope & Task Division

> Repo: `Revou-Fornax-Eagle/werent-backend` (fresh, dimulai dari kosong)
> Blueprint acuan: `docs/architecture/` (PRD, system design, DB schema, API contract, ADR, threat model)

---

## Pembagian Kerja (Issue → Owner → Status)

| Issue | Fitur | Epic | Status | Owner |
|-------|-------|------|--------|-------|
| [#9](https://github.com/Revou-Fornax-Eagle/werent/issues/9) | Review Count Aggregation | RP-00 | ✅ **DONE** | @satria |
| [#10](https://github.com/Revou-Fornax-Eagle/werent/issues/10) | Real-time Review Count (Socket.io) | RP-00 | ✅ **DONE** | @satria |
| [#14](https://github.com/Revou-Fornax-Eagle/werent/issues/14) | Fit Feedback Data Model | RP-04 | ⏳ **PENDING** | tim |
| [#15](https://github.com/Revou-Fornax-Eagle/werent/issues/15) | Fit Assessment Algorithm | RP-04 | ⏳ **PENDING** | tim |
| [#16](https://github.com/Revou-Fornax-Eagle/werent/issues/16) | Fit Assessment & Distribution API | RP-04 | ⏳ **PENDING** | tim |

---

## Apa yang SUDAH dikerjakan (#9 + #10)

### Epic RP-00 — Review Count (selesai)

- `GET /api/products/:productId` → `{ product, reviewCount }`
  - `reviewCount` dihitung `count({ where: { productId, isDeleted: false } })`
  - Return `0` eksplisit saat belum ada review (bukan null/undefined)
  - Produk tidak ada → `404 NOT_FOUND`
- `POST /api/reviews` → `201 { review, reviewCount }`
  - Validasi DTO: `productId` (uuid), `userId` (uuid), `rating` (int 1–5), `title` (3–100), `body` (10–2000)
  - Duplikat `(userId, productId)` → `409 CONFLICT`
  - User/product tidak ada → `404`
- WebSocket (Socket.io):
  - Room: `product:{productId}`
  - Event client → server: `joinProductRoom`, `leaveProductRoom`
  - Event server → client: `review_count_updated` → `{ productId, reviewCount }`
  - Emit **post-commit**, count dibaca fresh dari DB

---

## Apa yang BELUM dikerjakan (jatah tim)

> ⚠️ **Jangan sampai ada yang mengerjakan ini di luar koordinasi** — ini sengaja dikosongkan agar tiap anggota tim punya bagian.

### Epic RP-04 — Fit Assessment (untuk tim)

| Issue | Yang perlu dikerjakan | Referensi docs |
|-------|----------------------|----------------|
| #14 | Tambah enum `FitFeedback` (`RUNS_SMALL` / `TRUE_TO_SIZE` / `RUNS_LARGE`), field nullable `fitFeedback` di model `Review`, index `@@index([productId, fitFeedback])`, migration, validasi DTO `@IsEnum` | `database/01-schema.md` §2, `api-contracts/01-standard.md` §4 |
| #15 | Buat `src/fit/` module: `fit.service.ts` (pure function majority vote + tie-break), `fit.types.ts` (`FitAssessment`, `FitDistribution`) | `api-contracts/01-standard.md` §5, `backend/02-adr-changelog.md` ADR-001 |
| #16 | Tambah `fitAssessment` di response `GET /api/products/:productId` (assessment + distribution + totalResponses + hasData) | `api-contracts/01-standard.md` §2.1, `00-overview.md` F5 |

### Aturan tie-break (ADR-001 — WAJIB diikuti)

- Tie yang melibatkan `TRUE_TO_SIZE` → `TRUE_TO_SIZE` (netral/konservatif)
- Tie `RUNS_SMALL` vs `RUNS_LARGE` (tanpa `TRUE_TO_SIZE`) → `null` (no consensus)
- `totalResponses === 0` → `{ assessment: null, hasData: false }`
- Distribution selalu dihitung dari semua response (exclude `isDeleted: true`)

### Catatan arsitektur yang masih berlaku

- **Auth** (`userId` dari body) bersifat **SEMENTARA** — ADR-004, diganti JWT saat auth epic
- **Rate limiting** POST /reviews — TODO, belum dipasang (lihat threat model §1 DoS)
- **`GET /api/reviews/product/:productId`** (list paginated) — di luar scope #9/#10/#14/#15/#16, belum dibuat

---

## Git Flow

```
main (utama) ──► dev (staging) ──► feature/* (branch kerja tiap orang)
```

- Tiap orang kerja di branch `feature/*` sendiri
- Merge ke `dev` (staging) setelah fitur selesai + test PASS
- `dev` → `main` setelah review

---

## Tech Stack (PINNED — jangan diubah)

Node 20 · NestJS ^10.4 · TypeScript ^5.6 · Prisma ^5.22 · PostgreSQL 16 · Socket.io ^4.7 · class-validator ^0.14 · Jest ^29

---

## Aturan Implementasi (WAJIB)

- Layer separation: `controller → service → repository` (controller TIDAK sentuh Prisma; gateway panggil service, bukan DB)
- Response envelope: sukses `{ success, data, meta }`, error `{ success, error: { code, message, details } }`
- Error codes standar: `VALIDATION_ERROR(400)`, `UNAUTHORIZED(401)`, `FORBIDDEN(403)`, `NOT_FOUND(404)`, `CONFLICT(409)`, `RATE_LIMITED(429)`, `INTERNAL_ERROR(500)`
- Clean code: kebab-case files, PascalCase classes, camelCase methods, tanpa nama variabel pendek (`payload` bukan `p`)
- File ≤ 450 baris
- Jalankan `arch-verify --precommit` sebelum commit
