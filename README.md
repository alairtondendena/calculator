# Calculator

Full-stack calculator: a Go JSON API and a React + TypeScript frontend.

> Work in progress. Sections marked `TODO` are not done yet.

## Project layout

```
backend/
  cmd/server/            HTTP server: config, timeouts, graceful shutdown
  internal/calculator/   Pure domain logic (no HTTP), registry of operations
  internal/httpapi/      Handlers, request validation, JSON errors
frontend/                Vite + React + TypeScript, tests with Vitest + Testing Library
```

## Requirements

- Go 1.27+
- Node.js 24+

## Setup and running

```sh
cd frontend && npm install && cd ..

make run-backend    # API on http://localhost:8080 (override with PORT)
make run-frontend   # UI on http://localhost:5173, proxies /api to the backend
```

TODO: Docker.

## Tests and coverage

```sh
make test       # go vet + go test -race, then vitest
make coverage   # backend/coverage.html and frontend/coverage/
```

TODO: coverage numbers.

## API

### `POST /api/v1/calculate`

```sh
curl -s -X POST localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"add","a":2,"b":3}'
# 200 {"result":5}
```

Errors share one shape:

```json
{"error": {"code": "UNKNOWN_OPERATION", "message": "unknown operation: \"modulo\""}}
```

| Status | Code | When |
| --- | --- | --- |
| 400 | `INVALID_JSON` | Malformed body, unknown fields, wrong types, body over 1 KiB |
| 400 | `MISSING_OPERAND` | `a` or `b` is missing (an explicit `0` is valid) |
| 400 | `UNKNOWN_OPERATION` | Operation not supported |
| 422 | `INVALID_OPERATION` | TODO: domain errors such as division by zero |

TODO: list of operations.

### `GET /healthz`

Returns `200 {"status":"ok"}`.

## Design decisions

- **Go standard library only** (`net/http` method routing, `encoding/json`, `log/slog`): the problem doesn't need a framework.
- **Domain separated from transport:** `internal/calculator` knows nothing about HTTP, so the arithmetic and its edge cases are tested in isolation.
- **One endpoint and a registry of operations:** validation lives in one place, and adding an operation is one entry in a map.
- **Strict input:** pointer fields tell a missing operand from `0`; unknown fields and oversized bodies are rejected.
- **The backend is the source of truth:** the frontend validates for fast feedback, but always displays the API's error.

TODO: assumptions (floating-point precision, percentage semantics) and what I would do with more time.

## AI usage

See [PROMPTS.md](PROMPTS.md).
