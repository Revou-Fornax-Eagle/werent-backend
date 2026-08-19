# WeRent Backend

Backend API untuk **WeRent**, aplikasi rental pakaian (clothing rental
e-commerce).

Project ini dibangun dengan NestJS, Prisma ORM, PostgreSQL, dan Socket.io. Fokus
fitur yang tersedia adalah pembuatan review, review count per produk, pembaruan
count secara real-time, serta overall fit assessment untuk Product Detail Page
(PDP).

> Repository ini hanya berisi backend. Repository frontend dan backlog fitur
> berada di [Revou-Fornax-Eagle/werent](https://github.com/Revou-Fornax-Eagle/werent).

---

## ✨ Fitur

| Issue | Fitur | Implementasi | Status |
|---|---|---|---|
| [#9](https://github.com/Revou-Fornax-Eagle/werent/issues/9) | Review count aggregation | Menghitung active review per produk dan mengembalikan <code>0</code> saat kosong | ✅ |
| [#10](https://github.com/Revou-Fornax-Eagle/werent/issues/10) | Real-time review count | Socket.io event <code>review_count_updated</code> setelah review dibuat | ✅ |
| [#14](https://github.com/Revou-Fornax-Eagle/werent/issues/14) | Fit feedback data model | Enum <code>RUNS_SMALL</code>, <code>TRUE_TO_SIZE</code>, dan <code>RUNS_LARGE</code> pada review | ✅ |
| [#15](https://github.com/Revou-Fornax-Eagle/werent/issues/15) | Overall fit assessment | Majority vote, deterministic tie-break, distribution, dan no-data flag | ✅ |
| [#16](https://github.com/Revou-Fornax-Eagle/werent/issues/16) | Fit assessment API | Informasi fit tersedia melalui Product Detail API | ✅ |

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| Runtime | Node.js 20 (recommended) |
| Framework | NestJS 10 |
| Language | TypeScript 5 |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Real-time | Socket.io 4 |
| Validation | class-validator + class-transformer |
| Testing | Jest + Supertest |

---

## 📁 Struktur Project

~~~text
werent-backend/
├── prisma/
│   ├── migrations/             # Versioned database migrations
│   ├── init-test-db.sql        # Membuat database werent_test saat first boot
│   ├── schema.prisma           # User, Product, Review, dan FitFeedback
│   └── seed.ts                 # Data demo lokal
├── src/
│   ├── common/                 # Enum, exception filter, response interceptor
│   ├── fit/                    # Overall fit assessment algorithm
│   ├── health/                 # Database health check
│   ├── prisma/                 # Global Prisma module dan service
│   ├── products/               # Product Detail API
│   ├── reviews/                # Create review, aggregation, dan WebSocket
│   ├── users/                  # User lookup repository
│   ├── app.module.ts           # Root application module
│   └── main.ts                 # Bootstrap HTTP, validation, CORS, Socket.io
├── test/                       # Unit dan end-to-end tests
├── .env.example               # Template environment variable
├── docker-compose.yml         # PostgreSQL lokal
└── package.json
~~~

---

## 🚀 Menjalankan Project

### Prasyarat

- Node.js 20 (recommended)
- npm
- Docker Desktop

### 1. Clone dan install dependency

~~~bash
git clone https://github.com/Revou-Fornax-Eagle/werent-backend.git
cd werent-backend
npm install
~~~

### 2. Siapkan environment

~~~bash
cp .env.example .env
~~~

Default dari <code>.env.example</code>:

~~~env
DATABASE_URL="postgresql://werent:werent@localhost:5432/werent?schema=public"
PORT=3000
CORS_ORIGINS="http://localhost:3000,http://localhost:3001"
~~~

| Variable | Kegunaan | Default lokal |
|---|---|---|
| <code>DATABASE_URL</code> | PostgreSQL connection string | Database <code>werent</code> di port 5432 |
| <code>PORT</code> | Port HTTP dan Socket.io backend | <code>3000</code> |
| <code>CORS_ORIGINS</code> | Origin frontend yang diizinkan untuk HTTP API, dipisahkan koma | localhost 3000 dan 3001 |

Jika frontend sudah memakai port 3000, ubah backend ke port lain, misalnya
<code>PORT=8000</code>, lalu gunakan URL tersebut pada API client dan Socket.io
client frontend.

### 3. Jalankan PostgreSQL

~~~bash
npm run db:up
docker compose ps
~~~

Docker Compose membuat database development <code>werent</code> dan database
end-to-end test <code>werent_test</code>. Keduanya menggunakan user/password
lokal <code>werent</code> / <code>werent</code>.

Database <code>werent_test</code> dibuat oleh init script saat volume PostgreSQL
pertama kali dibuat. Pastikan status container sudah <code>healthy</code> sebelum
menjalankan migration pada langkah berikutnya.

### 4. Generate Prisma Client dan terapkan migration

~~~bash
npm run prisma:generate
npm run prisma:deploy
~~~

Opsional, isi database dengan data demo:

~~~bash
npm run prisma:seed
~~~

> Seed menghapus data review, product, dan user lokal sebelum memasukkan data
> demo. Jangan jalankan terhadap database yang datanya perlu dipertahankan.

### 5. Jalankan backend

~~~bash
npm run start:dev
~~~

Server tersedia di <code>http://localhost:3000</code>, atau mengikuti nilai
<code>PORT</code> di file <code>.env</code>.

Untuk menjalankan production build secara lokal:

~~~bash
npm run build
npm run start:prod
~~~

Untuk menghentikan database tanpa menghapus volume:

~~~bash
docker compose stop db
~~~

---

## 📡 API Reference

Swagger/OpenAPI belum dikonfigurasi. Endpoint yang tersedia didokumentasikan di
bagian ini.

### Response envelope

Successful response:

~~~json
{
  "success": true,
  "data": {},
  "meta": {}
}
~~~

Error response:

~~~json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Bad Request Exception",
    "details": [
      { "message": "productId must be a valid UUID" }
    ]
  }
}
~~~

| Error code | HTTP status | Contoh kondisi |
|---|---:|---|
| <code>VALIDATION_ERROR</code> | 400 | Request body atau path parameter tidak valid |
| <code>NOT_FOUND</code> | 404 | Product atau user tidak ditemukan |
| <code>CONFLICT</code> | 409 | User sudah pernah mereview product yang sama |
| <code>INTERNAL_ERROR</code> | 500 | Error server yang tidak dikenali |

### Endpoint summary

| Method | Endpoint | Kegunaan |
|---|---|---|
| GET | <code>/health</code> | Memeriksa server dan koneksi database |
| GET | <code>/api/products/:productId</code> | Product detail, review count, dan fit assessment |
| POST | <code>/api/reviews</code> | Membuat review dan mengembalikan updated review count |

---

### GET /health

Memeriksa koneksi aplikasi ke PostgreSQL.

Response ketika database tersedia:

~~~json
{
  "success": true,
  "data": {
    "status": "ok",
    "db": "up"
  },
  "meta": {}
}
~~~

Jika aplikasi sudah berjalan tetapi query database kemudian gagal, endpoint
tetap merespons HTTP 200 dengan <code>success: true</code>, sedangkan field data
menjadi <code>{ "status": "degraded", "db": "down" }</code>. Monitoring perlu
memeriksa isi <code>data.status</code> atau <code>data.db</code>, bukan hanya HTTP
status.

---

### GET /api/products/:productId

Mengambil product detail beserta jumlah active review dan hasil agregasi fit.
<code>productId</code> harus berupa UUID.

Response dengan fit feedback:

~~~json
{
  "success": true,
  "data": {
    "product": {
      "id": "c874da6a-eb75-4a56-b49d-b3505c26f1b8",
      "name": "Kemeja Linen Oversize",
      "description": "Kemeja linen premium dengan potongan oversize.",
      "category": "men",
      "price": 85000,
      "createdAt": "2026-08-19T08:00:00.000Z",
      "updatedAt": "2026-08-19T08:00:00.000Z"
    },
    "reviewCount": 5,
    "fitAssessment": {
      "assessment": "TRUE_TO_SIZE",
      "distribution": {
        "RUNS_SMALL": 1,
        "TRUE_TO_SIZE": 3,
        "RUNS_LARGE": 1
      },
      "totalResponses": 5,
      "hasData": true
    }
  },
  "meta": {}
}
~~~

Response product yang belum memiliki review:

~~~json
{
  "success": true,
  "data": {
    "product": {
      "id": "c874da6a-eb75-4a56-b49d-b3505c26f1b8",
      "name": "Kemeja Linen Oversize",
      "description": "Kemeja linen premium dengan potongan oversize.",
      "category": "men",
      "price": 85000,
      "createdAt": "2026-08-19T08:00:00.000Z",
      "updatedAt": "2026-08-19T08:00:00.000Z"
    },
    "reviewCount": 0,
    "fitAssessment": {
      "assessment": null,
      "distribution": {
        "RUNS_SMALL": 0,
        "TRUE_TO_SIZE": 0,
        "RUNS_LARGE": 0
      },
      "totalResponses": 0,
      "hasData": false
    }
  },
  "meta": {}
}
~~~

Catatan:

- <code>reviewCount</code> selalu berupa number dan bernilai <code>0</code> saat kosong.
- Review dengan <code>isDeleted=true</code> tidak dihitung.
- Review tanpa <code>fitFeedback</code> tetap masuk review count, tetapi tidak masuk fit distribution.
- Product yang tidak ditemukan menghasilkan <code>404 NOT_FOUND</code>.

---

### POST /api/reviews

Membuat satu review baru. Satu user hanya dapat membuat satu review untuk setiap
product.

Request:

~~~json
{
  "productId": "c874da6a-eb75-4a56-b49d-b3505c26f1b8",
  "userId": "fb9be717-17d8-4e28-9cd7-e9f0c67c3c43",
  "rating": 5,
  "title": "Ukurannya pas",
  "body": "Bahannya nyaman dan ukurannya sesuai ekspektasi saya.",
  "fitFeedback": "TRUE_TO_SIZE"
}
~~~

Validation:

| Field | Tipe | Wajib | Aturan |
|---|---|---:|---|
| <code>productId</code> | string | ✅ | UUID |
| <code>userId</code> | string | ✅ | UUID |
| <code>rating</code> | number | ✅ | Integer 1–5 |
| <code>title</code> | string | ✅ | 3–100 karakter |
| <code>body</code> | string | ✅ | 10–2000 karakter |
| <code>fitFeedback</code> | enum/null | ❌ | <code>RUNS_SMALL</code>, <code>TRUE_TO_SIZE</code>, atau <code>RUNS_LARGE</code> |

Response 201:

~~~json
{
  "success": true,
  "data": {
    "review": {
      "id": "36a7795e-ef20-4149-b960-85f587acba21",
      "productId": "c874da6a-eb75-4a56-b49d-b3505c26f1b8",
      "userId": "fb9be717-17d8-4e28-9cd7-e9f0c67c3c43",
      "rating": 5,
      "title": "Ukurannya pas",
      "body": "Bahannya nyaman dan ukurannya sesuai ekspektasi saya.",
      "fitFeedback": "TRUE_TO_SIZE",
      "isDeleted": false,
      "createdAt": "2026-08-19T08:10:00.000Z",
      "updatedAt": "2026-08-19T08:10:00.000Z"
    },
    "reviewCount": 1
  },
  "meta": {}
}
~~~

Possible errors:

- <code>400 VALIDATION_ERROR</code>: request tidak valid atau terdapat field tambahan.
- <code>404 NOT_FOUND</code>: product atau user tidak ditemukan.
- <code>409 CONFLICT</code>: kombinasi user dan product sudah memiliki review.

Setelah review berhasil disimpan, backend menghitung ulang review count dari
database dan mengirim event WebSocket ke subscriber product tersebut.

---

## 🔌 WebSocket: Real-time Review Count

Socket.io memakai server dan port yang sama dengan HTTP API, namespace
<code>/</code>.

| Arah | Event | Payload |
|---|---|---|
| Client → Server | <code>joinProductRoom</code> | <code>{ "productId": "product-id" }</code> |
| Client → Server | <code>leaveProductRoom</code> | <code>{ "productId": "product-id" }</code> |
| Server → Client | <code>review_count_updated</code> | <code>{ "productId": "product-id", "reviewCount": 1 }</code> |

Contoh client:

~~~ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');
const productId = 'c874da6a-eb75-4a56-b49d-b3505c26f1b8';

socket.on('connect', () => {
  socket.emit('joinProductRoom', { productId }, (ack: unknown) => {
    console.log('Joined product room:', ack);
  });
});

socket.on('review_count_updated', (payload) => {
  console.log('Updated review count:', payload);
});
~~~

Client hanya menerima update untuk product room yang sudah diikuti. Event
dikirim setelah review berhasil dibuat; request yang gagal tidak memicu event.

> Saat ini <code>CORS_ORIGINS</code> hanya diterapkan pada HTTP API. Socket.io
> gateway masih memakai <code>cors: true</code>; batasi konfigurasi gateway
> sebelum deployment production.

---

## 📐 Fit Assessment

Fit assessment menggunakan jumlah active review yang memiliki
<code>fitFeedback</code>.

| Bagian | Perilaku |
|---|---|
| Distribution | Jumlah response untuk setiap enum, bukan persentase |
| Majority | Nilai dengan jumlah paling tinggi menjadi <code>assessment</code> |
| Tie-break | <code>TRUE_TO_SIZE &gt; RUNS_SMALL &gt; RUNS_LARGE</code> |
| Null feedback | Diabaikan dari distribution dan <code>totalResponses</code> |
| No data | <code>assessment: null</code>, semua distribution 0, dan <code>hasData: false</code> |
| Soft delete | Review yang dihapus tidak ikut aggregation |

Query aggregation dilakukan per product langsung melalui database, sehingga
feedback product lain tidak tercampur.

---

## 🧪 Testing dan Validasi

Pastikan PostgreSQL dari Docker Compose sedang berjalan sebelum menjalankan E2E.

~~~bash
# Unit tests
npm test -- --runInBand

# HTTP + database + WebSocket end-to-end tests
npm run test:e2e

# Compile production build
npm run build

# Additional static checks
npx tsc --noEmit --pretty false
npx prisma validate
~~~

Current test suite terdiri dari 12 unit tests dan 18 E2E tests. Cakupannya
meliputi:

- review count kosong, per product, dan soft-delete;
- create review, persistence, validation, duplicate, missing product/user;
- WebSocket subscription, payload, dan room isolation;
- fit majority, tie scenarios, null handling, dan no-data;
- product isolation dan active-review filtering;
- Product Detail API dengan serta tanpa fit data.

Script E2E menggunakan database lokal
<code>postgresql://werent:werent@localhost:5432/werent_test</code>, menerapkan
migration, lalu menjalankan test secara serial. E2E menghapus dan mengubah data
di database test selama berjalan; jangan arahkan perintah test yang setara ke
database development atau production.

Script <code>test:e2e</code> memakai syntax environment variable POSIX. Pada
Windows, jalankan Node.js dan npm dari dalam WSL, atau sesuaikan script memakai
tool lintas platform seperti <code>cross-env</code>.

---

## 🗂️ Data Seed

<code>prisma/seed.ts</code> membuat:

- 3 products;
- 6 users;
- 5 reviews untuk product pertama;
- distribusi fit: 1 <code>RUNS_SMALL</code>, 3 <code>TRUE_TO_SIZE</code>, dan
  1 <code>RUNS_LARGE</code>.

UUID dibuat ulang setiap kali seed dijalankan.

---

## 📐 Keputusan Arsitektur

| Keputusan | Implementasi |
|---|---|
| Review uniqueness | Unique constraint <code>(userId, productId)</code> |
| Review count | Query database per product; tidak menyimpan counter in-memory |
| Real-time update | Emit setelah create dan recount berhasil |
| Fit storage | Nullable enum langsung pada record review |
| Fit aggregation | Group-by database lalu majority vote di service |
| Soft delete | Count dan fit assessment hanya memakai <code>isDeleted=false</code> |
| Authentication | Belum menggunakan JWT; endpoint create menerima <code>userId</code> dari request body |

---

## 🔧 Troubleshooting

### Port backend bentrok dengan frontend

Ubah <code>PORT</code> di <code>.env</code>, misalnya:

~~~env
PORT=8000
~~~

### Database belum siap

~~~bash
docker compose ps
docker compose logs db
~~~

Tunggu sampai status PostgreSQL menjadi healthy, lalu jalankan kembali migration.

### Database werent_test tidak ditemukan

Init script hanya berjalan saat volume PostgreSQL pertama kali dibuat. Untuk
volume lama yang belum mempunyai test database:

~~~bash
docker compose exec db psql -U werent -d werent -c "CREATE DATABASE werent_test;"
~~~

### POST review menghasilkan 409

Constraint database hanya mengizinkan satu review per kombinasi user dan
product. Gunakan user atau product lain untuk request berikutnya.

### WebSocket tidak menerima event

Pastikan client:

1. memakai URL dan port backend yang benar;
2. sudah terhubung;
3. mengirim event <code>joinProductRoom</code> dengan product ID;
4. mendengarkan event <code>review_count_updated</code> sebelum review dibuat.
