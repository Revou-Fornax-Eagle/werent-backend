# Security: WeRent Backend

**Version:** 1.0 | **Date:** 2026-08-16
**Author:** Architect AI

---

## 1. Threat Model (STRIDE)

| Threat | Description | Risk | Mitigation |
|--------|-------------|------|------------|
| **S**poofing | Fake user creating review / emitting socket events | Med | Auth (JWT) on POST /reviews & socket handshake; validate `userId` from token, not body |
| **T**ampering | Modify review data / fitFeedback via request | High | DTO whitelist + `forbidNonWhitelisted`; Prisma enum DB constraint; immutable `userId` from auth |
| **R**epudiation | Reviewer denies posting | Low | CreatedAt + audit trail; (optional) review edit history |
| **I**nfo Disclosure | Enumerate products/users, leak review data | Med | UUID ids (not sequential); only expose needed fields in DTO/select; 404 on missing product |
| **D**oS | Socket flood, review spam, count amplification | Med | Rate limiting (throttler) on POST /reviews; socket connection limits; validate payload size |
| **E**levation of Privilege | User edits others' reviews | Med | Ownership check: only author can update/delete own review |

---

## 2. Auth Flow (recommended for scope)

> Note: Auth is **out of scope** for issues #9/#10/#14/#15/#16, but POST /reviews needs an identity. Recommend minimal JWT:

| Stage | Detail |
|-------|--------|
| Register/Login | (Future) JWT access token via `@nestjs/jwt` |
| Protect | `JwtAuthGuard` on `POST /api/reviews` + socket handshake (`@UseGuards` / middleware) |
| userId | Taken from `req.user.id` — **never** trusted from request body |

**Decision:** For this sprint, accept `userId` from body but **document** this as temporary; mark ADR to switch to JWT.

---

## 3. Input Validation (first line of defense)

| Endpoint | Validation |
|----------|-----------|
| POST /reviews | `rating` 1–5 int, `title` 3–100, `body` 10–2000, `fitFeedback` ∈ enum, `productId`/`userId` uuid |
| GET /products/:id | `productId` uuid format |
| All | Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` |

### Double-layer fit value enforcement
1. **DTO**: `@IsEnum(FitFeedback)` + optional
2. **DB**: Prisma enum column → invalid value = DB error

---

## 4. Security Checklist (per endpoint)

- [ ] **POST /reviews**
  - [ ] Rate limit (e.g. 10 req/min per user/IP) — `@nestjs/throttler`
  - [ ] Ownership enforced (auth)
  - [ ] No sensitive user data in response (no password/hash)
  - [ ] `productId` & `userId` validated as uuid
- [ ] **GET /products/:id**
  - [ ] Returns only public fields (no `isDeleted` internals, no internal user fields)
- [ ] **Socket**
  - [ ] Handshake auth (token query/header) — else reject join
  - [ ] Limit rooms per connection (max N subscriptions)
  - [ ] Validate `productId` format in `joinProductRoom`

---

## 5. Secrets & Config

| Item | Rule |
|------|------|
| `DATABASE_URL` | Only in `.env` (gitignored); provide `.env.example` |
| JWT secret | 32+ char random; rotate on rotation policy; never commit |
| CORS | Restrict to FE origin(s) in prod; allow localhost in dev |
| Prisma logs | Disable query logging in prod (avoid PII in logs) |

---

## 6. Compliance Notes (portfolio context)

- No PII beyond user email/name (minimal) — treat as personal data
- Review content is user-generated: sanitize output (escape HTML) to prevent stored XSS in FE rendering
- Rate limiting on write endpoints to prevent abuse in demo
