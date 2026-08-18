# WeRent Backend — backend-eagle

Backend API untuk **WeRent** (aplikasi rental pakaian / clothing rental e-commerce).

> **Status:** fresh repo — baru implement **Epic RP-00 (Review Count)**, yaitu issue #9 + #10.
> Epic RP-04 (Fit Assessment, issue #14 #15 #16) **belum dikerjakan** — lihat [SCOPE.md](SCOPE.md).

---

## ✨ Fitur (sudah diimplementasi)

| Issue | Fitur | Status |
|-------|-------|--------|
| [#9](https://github.com/Revou-Fornax-Eagle/werent/issues/9) | Review count aggregation | ✅ |
| [#10](https://github.com/Revou-Fornax-Eagle/werent/issues/10) | Real-time review count (Socket.io) | ✅ |

---

## 🛠️ Tech Stack

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| Runtime | Node.js | 20 (LTS) |
| Framework | NestJS | ^10.4 |
| Language | TypeScript | ^5.6 |
| ORM | Prisma | ^5.22 |
| Database | PostgreSQL | 16 |
| Real-time | Socket.io | ^4.7 |
| Validasi | class-validator + class-transformer | ^0.14 / ^0.5 |
| Testing | Jest + supertest | ^29 / ^7 |

---

## 🚀 Menjalankan

```bash
npm install
cp .env.example .env       # isi DATABASE_URL, PORT, CORS_ORIGINS
npx prisma migrate deploy   # terapkan migration
node_modules/.bin/ts-node prisma/seed.ts   # isi data contoh
npm run start:dev           # server di http://localhost:8000
```

---

## 📡 Endpoint

| Endpoint | Deskripsi |
|----------|-----------|
| `GET /api/products/:productId` | Product detail + `reviewCount` (issue #9) |
| `POST /api/reviews` | Buat review + emit real-time update (issue #9 #10) |
| `GET /health` | `{ status, db }` |

### WebSocket

| Arah | Event | Payload |
|------|-------|---------|
| Client → Server | `joinProductRoom` | `{ productId }` |
| Client → Server | `leaveProductRoom` | `{ productId }` |
| Server → Client | `review_count_updated` | `{ productId, reviewCount }` |

---

## 📐 Arsitektur

Blueprint lengkap ada di [`docs/architecture/`](docs/architecture/):
- PRD & scope: `00-overview.md`
- System design (C4): `01-system-design.md`
- Database schema: `database/01-schema.md`
- API contracts: `api-contracts/01-standard.md`
- Folder structure & aturan: `backend/01-folder-structure.md`
- ADR & changelog: `backend/02-adr-changelog.md`
- Threat model (STRIDE): `security/01-threat-model.md`

Pembagian kerja tim ada di [SCOPE.md](SCOPE.md).
