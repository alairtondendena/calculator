# Prompt

AI tool: Claude Code (Claude Opus 5.5) in plan mode. The prompt below consolidates the requirements and constraints I gave the tool; the plan after it is the plan-mode output the implementation followed. I reviewed and approved the plan and its decisions, then reviewed every generated change before keeping it.

## The prompt

> Plan a full-stack calculator. Requirements:
>
> - Addition, subtraction, multiplication, division. Optional: exponentiation, square root, percentage.
> - Intuitive UI for entering input and displaying results, with input validation, error handling and basic mobile support.
> - Backend endpoints for the operations that validate input, handle edge cases (division by zero, invalid data) and return JSON.
> - Clean, readable, idiomatic code on both layers, with unit tests covering key functionality on both.
> - Documentation: setup instructions, API usage and design rationale. Optional: a Dockerfile for full-stack deployment.
> - Frontend in React with TypeScript; backend in Go.
>
> Cover every requirement, including the optional ones. Prefer the Go standard library and as few dependencies as possible. Give me: the architecture, the API contract with every error case, the decisions I need to confirm, phases that each leave the app working end to end, and how each phase is verified. Organize the frontend in the folder-by-role layout React developers expect, document the API with OpenAPI, and give one command each to run, test, lint and build; a single container for the whole app, started with Docker Compose; coverage reports anyone can read without running anything.

## The plan

### Context

Anyone cloning the repository should be able to run it, read the code and check correctness, edge cases, tests and clarity. The scope is small, so the plan favors a few deliberate decisions, documented, over breadth: one endpoint, a registry of operations, strict validation, and a consistent error contract.

### Decisions to confirm

| Decision | Choice | Alternative considered |
| --- | --- | --- |
| Endpoint shape | One `POST /api/v1/calculate` with `{operation, a, b?}` | A route per operation; rejected because every operation shares the same request and response |
| Percentage semantics | "`a` percent of `b`": `percentage(20, 150) = 30` | `a / 100` as a unary operation |
| Unary operations | `sqrt` takes only `a`; sending `b` is an error | Silently ignoring `b` |
| Number type | IEEE 754 float64; the API returns the exact value, the UI rounds to 12 significant digits for display | Decimal arithmetic; out of scope unless exact results matter (money) |
| Status codes | 400 when the request is wrong, 422 when it is well formed but the result is undefined | 400 for everything |
| UI style | A form (number, operation, number) | A keypad, which needs an expression parser |
| Deployment | One container: the Go server serves the built frontend, same origin, no CORS | Two containers behind a proxy |
| Coverage | Reports committed to `coverage/` and quoted in the README | Generated only in CI |

### Architecture

```
backend/
  cmd/server/            configuration (PORT, STATIC_DIR), timeouts, graceful shutdown
  internal/calculator/   domain: registry of operations and their edge cases, no HTTP
  internal/httpapi/      decoding, validation, error mapping, request logging, static files
frontend/src/
  components/            Calculator (form, layout styles), NumberField
  hooks/                 useCalculator: form state, validation, API call, error messages
  services/              calculatorApi: typed API client and ApiError
  constants/             operations shown in the UI (mirrors the backend registry)
  types/                 shared TypeScript types
  utils/                 input validation and result formatting
docs/openapi.yaml        API contract (OpenAPI 3.1)
Dockerfile               Node build -> static Go binary -> distroless non-root image
docker-compose.yml       one service: build and run the container on :8080
Makefile                 run-backend, run-frontend, test, lint, coverage, docker-run
```

The domain package owns the rules; the transport layer only decodes, maps errors and encodes. On the frontend, the hook owns state and side effects and the components only render. The backend keeps Go's package-by-responsibility layout rather than splitting handlers, middleware and config into packages, which would be ceremony at this size. The backend is the source of truth: the frontend validates for fast feedback but always shows the API result and errors.

### API contract

`POST /api/v1/calculate`, request `{"operation": string, "a": number, "b": number}` (`b` omitted for `sqrt`), response `{"result": number}`. Every error has the shape `{"error": {"code", "message"}}`; clients branch on `code`.

| Status | Code | When |
| --- | --- | --- |
| 400 | `INVALID_JSON` | Malformed body, trailing data, unknown fields, wrong types, numbers outside float64, body over 1 KiB |
| 400 | `MISSING_OPERAND` | `a` missing (an explicit `0` is valid) |
| 400 | `INVALID_OPERAND_COUNT` | `b` missing for a binary operation, or present for `sqrt` |
| 400 | `UNKNOWN_OPERATION` | Operation missing or not supported |
| 422 | `DIVISION_BY_ZERO` | `divide` with `b = 0` |
| 422 | `NEGATIVE_SQUARE_ROOT` | `sqrt` with `a < 0` |
| 422 | `NON_FINITE_RESULT` | Overflow, or undefined results such as `0 ^ -1` and `(-8) ^ 0.5` |
| 404 | `NOT_FOUND` | Unknown route under `/api/` |
| 405 | `METHOD_NOT_ALLOWED` | Non-POST on `/api/v1/calculate`, with `Allow: POST` |

`GET /healthz` returns `{"status":"ok"}`.

### Phase 0: scaffold, `add` end to end

- Go module with no dependencies; server with read, write and idle timeouts and graceful shutdown on SIGTERM; structured logs with `log/slog`.
- Vite + React + TypeScript app; the Vite dev server proxies `/api` to the Go server, so development is same origin too.
- `add` working from the form to the API, with a test on each layer; Makefile and README skeleton.
- Verify: `make test`, then add two numbers in the browser.

### Phase 1: backend domain

- `operations` map of name to `{arity, apply}` for all seven operations; `Calculate` checks the operand count against the arity.
- Sentinel errors for unknown operation, operand count, division by zero and negative square root.
- One central check rejects any `Inf` or `NaN` result instead of anticipating each overflow case; `-0` is normalized to `0`.
- Verify: table-driven tests for every operation and edge case (`0/0`, `0^0 = 1`, `0^-1`, `(-8)^0.5`, overflow, negative zero).

### Phase 2: backend HTTP

- Strict decoding: 1 KiB limit, `DisallowUnknownFields`, rejection of trailing data, pointer fields to tell a missing operand from `0`.
- One `domainErrors` table maps sentinel errors to status and code; unmapped errors become a logged 500.
- JSON 404 and 405 under `/api/`, so every API error has the same shape; request logging middleware; serve `STATIC_DIR` at `/` when set.
- Verify: `httptest` table tests for every row of the error table, plus routes, the `Allow` header and logging.

### Phase 3: frontend

- Folders by role: presentational `Calculator` and `NumberField` components (each with its own folder, styles next to the component), a `useCalculator` hook, an API client in `services/`, shared types, the operations list in `constants/`, and validation and formatting in `utils/`.
- All operations in a select; the second field is hidden for `sqrt` and `b` is omitted from the request.
- Per-field validation with a strict decimal pattern, so `1,5`, `0x10` and `Infinity` (which `Number()` would accept or misread) are rejected; errors clear when the input changes.
- The result shows the expression (`0.1 + 0.2 = 0.3`) with float64 noise hidden; known API codes get user-facing messages, others fall back to the API message; network failures and non-JSON responses are handled; the button is disabled while a request is in flight.
- Accessibility and mobile: labels, `aria-invalid`, `aria-describedby`, a live region for the result, 44 px touch targets, a single column up to 28 rem, light and dark color schemes, and the default keyboard on phones because the iOS decimal keypad has no minus sign.
- Verify: Vitest + Testing Library tests that query by role and label and mock `fetch`; headless Chrome screenshots at 360 px and 1280 px.

### Phase 4: Docker

- Multi-stage build: `npm ci` and `vite build`, a static Go binary (`CGO_ENABLED=0`, `-trimpath`), then a distroless non-root image (~17 MB) with `STATIC_DIR=/static`; `.dockerignore`; `docker-compose.yml` so `docker compose up --build` is the single entry point; `make docker-run` as an alternative.
- Verify: UI, assets and API answer from the container started by Compose, and `docker stop` exits cleanly.

### Phase 5: documentation, lint and coverage

- `docs/openapi.yaml` (OpenAPI 3.1): request and response schemas, every error code with an example, `/healthz`; validated with Redocly.
- README: quick start, local setup, every operation with an example, `curl` examples, the error table, design decisions, assumptions, layout, and what I would do with more time.
- `make lint`: gofmt, go vet, staticcheck (pinned), oxlint, `tsc -b`. `make coverage` writes the reports to `coverage/`; `cmd/server` only wires configuration and is excluded.
- Verify: every README example is run against the server and its documented output matches.

### Requirement coverage

| Requirement | Where |
| --- | --- |
| Four basic operations, plus power, square root and percentage | Phase 1 registry, Phase 3 select |
| Intuitive UI, validation, error handling | Phase 3 |
| Responsive design | Phase 3 layout and touch targets, checked by screenshots |
| Endpoints, edge cases, JSON | Phases 1 and 2, the API contract above |
| Clean, idiomatic code | Standard library, domain separated from transport, `make lint` |
| Unit tests on both layers | Table-driven Go tests; Vitest + Testing Library |
| Documentation | Phase 5 README and OpenAPI contract |
| Dockerfile | Phase 4, with Docker Compose |

### Out of scope

Expressions and chaining, authentication, persistence, rate limiting, CI, end-to-end tests with Playwright, a `GET /api/v1/operations` endpoint to stop mirroring the registry in the frontend, and generating the frontend types from the OpenAPI contract. The README lists these under "With more time".
