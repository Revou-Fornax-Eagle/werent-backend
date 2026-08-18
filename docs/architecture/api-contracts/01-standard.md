# API Contracts: WeRent Backend

**Version:** 1.0 | **Date:** 2026-08-16
**Author:** Architect AI

---

## 1. Standard Response Format

### Success
```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [{ "field": "fitFeedback", "message": "fitFeedback must be one of RUNS_SMALL, TRUE_TO_SIZE, RUNS_LARGE" }]
  }
}
```

### Error Codes
| Code | HTTP | When |
|------|------|------|
| VALIDATION_ERROR | 400 | Invalid input / bad enum |
| UNAUTHORIZED | 401 | No/invalid token |
| FORBIDDEN | 403 | No permission |
| NOT_FOUND | 404 | Product/review not found |
| CONFLICT | 409 | Duplicate review (user+product) |
| INTERNAL_ERROR | 500 | Unexpected server error |

---

## 2. Endpoints

### 2.1 GET `/api/products/:productId`
Product detail incl. review count + fit assessment. **(Issues #9, #16 — main PDP endpoint)**

**Response 200**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "0f3c1b2a-...",
      "name": "Kemeja Linen Oversize",
      "description": "...",
      "category": "men",
      "price": 85000,
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-08-01T00:00:00.000Z"
    },
    "reviewCount": 12,
    "fitAssessment": {
      "assessment": "TRUE_TO_SIZE",
      "distribution": {
        "RUNS_SMALL": 2,
        "TRUE_TO_SIZE": 8,
        "RUNS_LARGE": 2
      },
      "totalResponses": 12,
      "hasData": true
    }
  },
  "meta": {}
}
```

**Edge case — no reviews at all (issue #9: explicit 0; issue #15/16: no-data flag)**
```json
{
  "success": true,
  "data": {
    "product": { "...": "..." },
    "reviewCount": 0,
    "fitAssessment": {
      "assessment": null,
      "distribution": { "RUNS_SMALL": 0, "TRUE_TO_SIZE": 0, "RUNS_LARGE": 0 },
      "totalResponses": 0,
      "hasData": false
    }
  },
  "meta": {}
}
```

**Errors:** 404 NOT_FOUND (product missing)

---

### 2.2 POST `/api/reviews`
Create a review (optional fit feedback). **(Issue #14 — data model + validation)**

**Request body**
```json
{
  "productId": "0f3c1b2a-...",
  "userId": "u-123",
  "rating": 5,
  "title": "Bagus!",
  "body": "Ukurannya pas di badan saya.",
  "fitFeedback": "TRUE_TO_SIZE"
}
```
`fitFeedback` optional: `"RUNS_SMALL" | "TRUE_TO_SIZE" | "RUNS_LARGE" | null`

**Response 201**
```json
{
  "success": true,
  "data": {
    "review": {
      "id": "r-456",
      "productId": "0f3c1b2a-...",
      "userId": "u-123",
      "rating": 5,
      "title": "Bagus!",
      "body": "Ukurannya pas di badan saya.",
      "fitFeedback": "TRUE_TO_SIZE",
      "createdAt": "2026-08-16T10:00:00.000Z",
      "updatedAt": "2026-08-16T10:00:00.000Z"
    },
    "reviewCount": 13
  },
  "meta": {}
}
```

**Errors:**
| Code | When |
|------|------|
| 400 VALIDATION_ERROR | rating > 5, fitFeedback invalid, missing fields |
| 404 NOT_FOUND | productId / userId doesn't exist |
| 409 CONFLICT | review already exists for (userId, productId) |

**Side effect:** emits WebSocket event `review_count_updated` → `{ productId, reviewCount }`

---

### 2.3 GET `/api/reviews/product/:productId`
List reviews for a product (with pagination).

**Query params:** `page=1&per_page=10`

**Response 200**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "r-456",
        "userId": "u-123",
        "rating": 5,
        "title": "Bagus!",
        "body": "Ukurannya pas.",
        "fitFeedback": "TRUE_TO_SIZE",
        "createdAt": "2026-08-16T10:00:00.000Z"
      }
    ]
  },
  "meta": { "page": 1, "per_page": 10, "total": 12 }
}
```

---

### 2.4 GET `/health`
Health check (DB connectivity).

**Response 200**
```json
{
  "success": true,
  "data": { "status": "ok", "db": "up" },
  "meta": {}
}
```

---

## 3. WebSocket (Socket.io) — Issue #10

### Client → Server
```js
// Join room for real-time updates on a product
socket.emit('joinProductRoom', { productId: '0f3c1b2a-...' });

// Leave (optional, on unmount)
socket.emit('leaveProductRoom', { productId: '0f3c1b2a-...' });
```

### Server → Client
```json
// Emitted after a review is created (post-commit)
{
  "event": "review_count_updated",
  "payload": { "productId": "0f3c1b2a-...", "reviewCount": 13 }
}
```

### Reconnection & Fallback
- Client listens `connect` → re-join all subscribed rooms → refetch count via GET API
- Client fallback: if socket unavailable (e.g. `connect_error`), poll `GET /api/products/:id` or refetch on window focus

---

## 4. DTO Validation Rules

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `productId` | string | ✅ (POST /reviews) | uuid format |
| `userId` | string | ✅ (POST /reviews) | uuid format |
| `rating` | number | ✅ | int, min 1, max 5 |
| `title` | string | ✅ | min 3, max 100 |
| `body` | string | ✅ | min 10, max 2000 |
| `fitFeedback` | enum | ❌ (nullable) | one of RUNS_SMALL / TRUE_TO_SIZE / RUNS_LARGE |

---

## 5. Fit Aggregation Contract (pure function — issue #15)

```ts
type FitDistribution = {
  RUNS_SMALL: number;
  TRUE_TO_SIZE: number;
  RUNS_LARGE: number;
};

type FitAssessment = {
  assessment: FitFeedback | null;      // majority vote; null if no data
  distribution: FitDistribution;       // counts per value
  totalResponses: number;              // total with fit feedback
  hasData: boolean;                    // totalResponses > 0
};
```

### Algorithm (majority vote)
1. Count each `fitFeedback` value among reviews (excluding soft-deleted).
2. `totalResponses = RUNS_SMALL + TRUE_TO_SIZE + RUNS_LARGE`
3. If `totalResponses === 0` → `{ assessment: null, hasData: false }`
4. `assessment` = value with highest count.
5. **Tie-break** (deterministic):
   - A tie that includes `TRUE_TO_SIZE` → resolves to `TRUE_TO_SIZE` (neutral/conservative).
   - A tie between `RUNS_SMALL` and `RUNS_LARGE` (no `TRUE_TO_SIZE`) → `null` (no consensus). Distribution is still returned.

### Example
```
Input:  [RUNS_SMALL, TRUE_TO_SIZE, TRUE_TO_SIZE, RUNS_LARGE, TRUE_TO_SIZE]
Output: { assessment: 'TRUE_TO_SIZE', distribution: { RUNS_SMALL: 1, TRUE_TO_SIZE: 3, RUNS_LARGE: 1 }, totalResponses: 5, hasData: true }
```
