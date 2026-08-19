# WeRent Backend — backend-eagle

Backend API untuk **WeRent** (aplikasi rental pakaian / clothing rental e-commerce).

> **Status:** Epic RP-00 (Review Count, issue #9 + #10) dan data model fit feedback
> (issue #14) sudah diimplementasikan. Algorithm dan API fit (issue #15 + #16) belum dikerjakan.

---

## ✨ Fitur (sudah diimplementasi)

| Issue | Fitur | Status |
|-------|-------|--------|
| [#9](https://github.com/Revou-Fornax-Eagle/werent/issues/9) | Review count aggregation | ✅ |
| [#10](https://github.com/Revou-Fornax-Eagle/werent/issues/10) | Real-time review count (Socket.io) | ✅ |
| [#14](https://github.com/Revou-Fornax-Eagle/werent/issues/14) | Fit feedback data model + validation | ✅ |

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
| `POST /api/reviews` | Buat review dengan optional `fitFeedback` + emit real-time update (issue #9 #10 #14) |
| `GET /health` | `{ status, db }` |

### WebSocket

| Arah | Event | Payload |
|------|-------|---------|
| Client → Server | `joinProductRoom` | `{ productId }` |
| Client → Server | `leaveProductRoom` | `{ productId }` |
| Server → Client | `review_count_updated` | `{ productId, reviewCount }` |

---

## Dukungan Fit Assessment (#14 #15 #16)

- #14 — enum, kolom nullable, migration, persistence, dan validasi fit feedback: **selesai**.
- #15 — majority vote, tie-break, distribution, dan no-data flag: **belum dikerjakan**.
- #16 — fit assessment pada Product Detail API: **belum dikerjakan**.
