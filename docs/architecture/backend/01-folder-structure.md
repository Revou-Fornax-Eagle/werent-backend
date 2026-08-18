# Backend Implementation: WeRent

**Version:** 1.0 | **Date:** 2026-08-16
**Author:** Architect AI

---

## 1. NestJS Project Layout

```
werent-backend/
├── prisma/
│   └── schema.prisma              # Data model (see database/01-schema.md)
├── src/
│   ├── main.ts                    # Bootstrap: ValidationPipe, CORS, Socket.io adapter
│   ├── app.module.ts              # Root module (imports all feature modules)
│   ├── prisma/
│   │   ├── prisma.module.ts       # @Global() PrismaModule
│   │   └── prisma.service.ts      # PrismaService extends PrismaClient
│   ├── common/
│   │   ├── enums/fit-feedback.enum.ts
│   │   ├── interceptors/response.interceptor.ts   # { success, data, error, meta } envelope
│   │   └── filters/http-exception.filter.ts        # uniform error body
│   ├── products/
│   │   ├── products.module.ts
│   │   ├── products.controller.ts     # GET /api/products/:productId
│   │   ├── products.service.ts        # product lookup + orchestration
│   │   ├── dto/get-product.params.ts
│   │   └── repository/product.repository.ts
│   ├── reviews/
│   │   ├── reviews.module.ts
│   │   ├── reviews.controller.ts      # POST /api/reviews, GET /api/reviews/product/:productId
│   │   ├── reviews.service.ts         # create, count, fit aggregation
│   │   ├── gateway/review.gateway.ts  # Socket.io
│   │   ├── dto/create-review.dto.ts
│   │   └── repository/review.repository.ts
│   └── fit/
│       ├── fit.module.ts
│       ├── fit.service.ts             # pure aggregation (majority vote)
│       └── fit.types.ts               # FitAssessment, FitDistribution
├── test/
│   ├── fit.service.spec.ts            # unit: aggregation algorithm
│   ├── reviews.controller.e2e-spec.ts # e2e: create review, count
│   └── products.e2e-spec.ts           # e2e: product detail response
├── .env.example                       # DATABASE_URL, PORT
├── .env                               # local only (gitignored)
├── docker-compose.yml                 # PostgreSQL 16
├── package.json
├── tsconfig.json
└── nest-cli.json
```

---

## 2. Feature-to-File Mapping

| Feature | Controller | Service | Repository | Key Methods |
|---------|-----------|---------|------------|-------------|
| F1 Review Count (#9) | reviews.controller | reviews.service | review.repository | `countByProduct(productId)` |
| F2 Real-time (#10) | — | reviews.service (emit) | — | `emitReviewCountUpdate()` |
| F3 Fit Feedback (#14) | reviews.controller | reviews.service | review.repository | `createWithFitFeedback(dto)` |
| F4 Fit Algorithm (#15) | — | fit.service | review.repository | `aggregate(feedbacks): FitAssessment` |
| F5 Fit API (#16) | products.controller | products.service | review.repository | `getProductDetail(productId)` |

### Per-Feature Detail

#### F1 Review Count (#9)
| File | Responsibility | Key Methods |
|------|---------------|-------------|
| reviews.service.ts | Count aggregation logic | `countByProduct(productId): Promise<number>` |
| review.repository.ts | DB query | `countByProduct(productId): Promise<number>` — `review.count({ where: { productId, isDeleted: false } })` |

#### F2 Real-time Update (#10)
| File | Responsibility | Key Methods |
|------|---------------|-------------|
| review.gateway.ts | Socket.io room management | `joinProductRoom(client, payload)`, `leaveProductRoom(client, payload)` |
| reviews.service.ts | Emit after commit | `emitReviewCountUpdate(productId)` — `server.to(room).emit('review_count_updated', ...)` |

#### F3 Fit Feedback Data Model (#14)
| File | Responsibility | Key Methods |
|------|---------------|-------------|
| create-review.dto.ts | Validation (whitelist enum) | `fitFeedback?: FitFeedback` with `@IsEnum(FitFeedback)` |
| review.repository.ts | Persist | `create(data)` — prisma.review.create |
| prisma/schema.prisma | DB enum + nullable column | `fitFeedback FitFeedback?` |

#### F4 Fit Assessment Algorithm (#15)
| File | Responsibility | Key Methods |
|------|---------------|-------------|
| fit.service.ts | Pure aggregation | `aggregate(fitFeedbacks: (FitFeedback|null)[]): FitAssessment` |
| fit.types.ts | Types | `FitAssessment`, `FitDistribution` |
| review.repository.ts | Fetch distribution | `groupByFitFeedback(productId): Promise<{fitFeedback, _count}[]>` |

#### F5 Fit Assessment & Distribution API (#16)
| File | Responsibility | Key Methods |
|------|---------------|-------------|
| products.controller.ts | HTTP endpoint | `getProductDetail(@Param('productId'))` |
| products.service.ts | Orchestration | product + reviewCount + fitAssessment |
| review.repository.ts | Count + distribution | `countByProduct`, `groupByFitFeedback` |

---

## 3. Layer Separation Rules (WAJIB)

```
Controller (HTTP only)  →  Service (business logic)  →  Repository (DB queries)
```

| Layer | Allowed | NOT Allowed |
|-------|---------|-------------|
| **Controller** | Parse params/body, validate DTO, call service, format response | ❌ DB queries, ❌ business logic |
| **Service** | Business rules, orchestration, transactions, emit events | ❌ HTTP, ❌ raw SQL |
| **Repository** | Prisma queries, filters, joins | ❌ business logic, ❌ HTTP |
| **DTO** | Shape + validation decorators | ❌ logic |
| **Gateway** | Socket rooms, emit events | ❌ DB access (call service) |

---

## 4. Clean Code Rules (WAJIB)

- **No short/meaningless names**: `p`→`product`, `d`→`data`, `h`→`handler`
  - Idiomatic exceptions: `ctx`, `req`, `res`, `err`, `db`, `id`, `i/j/k`
- **File size ≤ 450 lines** — split at service/repository level
- **No mixed layers** — a file is either controller, service, or repository
- **DTO validation** on every endpoint (global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`)
- **Enum as source of truth** — `FitFeedback` enum in `common/enums` mirrors Prisma enum; DTO imports from there
- **Naming**: files `kebab-case` (`create-review.dto.ts`), classes `PascalCase`, methods `camelCase`

---

## 5. Key Implementation Notes

### 5.1 Global response envelope
Use an interceptor (`ResponseInterceptor`) wrapping controller output:
```ts
{ success: true, data: result, meta: {} }
```
Exceptions → filter producing `{ success: false, error: { code, message, details } }`

### 5.2 Socket.io wiring
- `main.ts`: `app.useWebSocketAdapter(new IoAdapter(app))`
- Gateway uses `@WebSocketGateway({ cors: true, namespace: '/' })`
- Room convention: `product:${productId}`
- `emitReviewCountUpdate` called from `reviews.service.create()` **after** successful DB commit

### 5.3 Transaction safety
`create()` runs in a transaction so review insert + (count read) stay consistent. Emit is outside txn (post-commit).

### 5.4 Validation pipe
```ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
```

### 5.5 Fit aggregation is a **pure function**
No DB/HTTP dependency → trivially unit-testable with a static input array.

---

## 6. Test Plan

### F1 Review Count (#9)
| # | Scenario | Type | Input | Expected |
|---|----------|------|-------|----------|
| TC1 | Happy path | Unit | product with 5 reviews | count = 5 |
| TC2 | Zero reviews | Unit | product, no reviews | count = 0 (explicit, not null) |
| TC3 | Soft-deleted excluded | Unit | 5 active + 2 deleted | count = 5 |

### F4 Fit Algorithm (#15)
| # | Scenario | Type | Input | Expected |
|---|----------|------|-------|----------|
| TC1 | Majority true-to-size | Unit | [T,T,T,S,L] | assessment TRUE_TO_SIZE, hasData true |
| TC2 | Majority runs-small | Unit | [S,S,L] | assessment RUNS_SMALL |
| TC3 | Tie-break | Unit | [S,L] | TRUE_TO_SIZE (tie-break wins) |
| TC4 | No data | Unit | [] | assessment null, hasData false, all zeros |

### F3/F5 API (#14, #16) — e2e
| # | Scenario | Type | Input | Expected |
|---|----------|------|-------|----------|
| TC1 | Create review happy path | e2e | valid dto | 201 + review + reviewCount |
| TC2 | Invalid fitFeedback | e2e | fitFeedback: "BIG" | 400 VALIDATION_ERROR |
| TC3 | Duplicate (user,product) | e2e | same pair twice | 409 CONFLICT |
| TC4 | Product detail no-data | e2e | product w/o reviews | reviewCount 0, hasData false |
| TC5 | Product detail with data | e2e | seeded reviews | assessment + distribution correct |
| TC6 | Product not found | e2e | random id | 404 NOT_FOUND |

### Architecture Compliance Tests
- [ ] All endpoints return `{ success, data, error, meta }`
- [ ] Error codes use standard set (400/401/403/404/409/500)
- [ ] Layer separation: controller never touches Prisma directly
- [ ] Pagination on list endpoints: `meta: { page, per_page, total }`
