# WeRent Backend — backend-eagle

Backend API untuk **WeRent** (aplikasi rental pakaian / clothing rental e-commerce).

> **Status:** fresh repo — baru implement **Epic RP-00 (Review Count)**, yaitu issue #9 + #10.
> Epic RP-04 (Fit Assessment, issue #14 #15 #16) **belum dikerjakan** — jatah anggota tim lain.

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

## 🔒 Dukungan Fit Assessment (#14 #15 #16)

Epic RP-04 (fit feedback data model, fit assessment algorithm, dan fit API) **belum dikerjakan** di repo ini — sengaja dikosongkan untuk pembagian kerja tim. Blueprint lengkap tersedia secara lokal (tidak di-push ke repo).
