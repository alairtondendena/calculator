# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Full-stack calculator: a Go JSON API (`backend/`, standard library only, no dependencies in `go.mod`) and a React + TypeScript frontend (`frontend/`, Vite, Vitest). README.md is the main project doc and holds the API reference, error table, design decisions and assumptions. Keep it in sync with behavior changes.

## Commands

Requirements: Go 1.27+, Node.js 24+, `make`. Run `cd frontend && npm install` once.

```sh
make run-backend     # API on :8080 (PORT overrides; STATIC_DIR, if set, serves a built frontend)
make run-frontend    # Vite on :5173, proxies /api to localhost:8080
make test            # go vet + go test -race ./... ; vitest run
make lint            # gofmt check, go vet, staticcheck (via go run, pinned), oxlint, tsc -b
# CI (.github/workflows/ci.yml) runs make lint, make test and docker build
make coverage        # regenerates coverage/ (only the .txt summaries are committed; README quotes the percentages)
docker compose up --build   # one container serving UI + API on :8080 (or make docker-run)
```

Single tests:

```sh
cd backend && go test -race -run 'TestCalculate/divide' ./internal/calculator
cd frontend && npx vitest run src/utils/validation.test.ts -t 'parseOperand'
```

## Architecture

- **One endpoint, registry-driven.** `POST /api/v1/calculate` takes `{operation, a, b?}`. `internal/calculator/calculator.go` holds an `operations` map of name → `{arity, apply}`; `Calculate` checks operand count against arity and rejects any `Inf`/`NaN` result in one place (and normalizes `-0` to `0`). The domain package has no HTTP knowledge.
- **Transport layer** (`internal/httpapi`): strict decoding (1 KiB limit answered with 413, `DisallowUnknownFields`, rejects trailing data, pointer fields to tell a missing operand from `0`), then maps domain sentinel errors to status + stable code through the `domainErrors` table. 400 means a malformed request, 422 means a well-formed request with an undefined result. Every error, including 404/405 under `/api/`, uses the JSON shape `{"error":{"code","message"}}`.
- **Same origin, no CORS.** In production the Go server serves the built frontend from `STATIC_DIR` (see Dockerfile: Vite build → static Go binary → distroless). In development, the Vite proxy does the same job.
- **Frontend mirrors the backend.** `src/` is split by role: `components/` (`Calculator`, `NumberField`) only render; `hooks/useCalculator.ts` holds form state, the API call and the error messages; `services/calculatorApi.ts` is the API client; `types/` holds shared types. `constants/operations.ts` duplicates the backend registry (names, arity) for the UI. `utils/validation.ts` validates input client-side for fast feedback and `utils/format.ts` rounds results to 12 significant digits for display only. The API stays the source of truth: `useCalculator` maps known error codes to friendly messages and falls back to the API message for others.
- **API contract.** `docs/openapi.yaml` (OpenAPI 3.1) documents the endpoint, schemas and every error code; it is written by hand, so keep it in sync with the handlers.

## Adding or changing an operation

It touches several places that must stay consistent: the `operations` map (plus any new sentinel error and its row in `domainErrors`), the `Operation` union in `frontend/src/types/calculator.ts`, `OPERATIONS` in `frontend/src/constants/operations.ts`, `ERROR_MESSAGES` in `frontend/src/hooks/useCalculator.ts` for new error codes, table-driven tests on both sides, the operation/error tables in README.md, and the `operation`/`code` enums and examples in `docs/openapi.yaml`.

## Testing conventions

Backend tests are table-driven: the domain package is tested on its own and the handlers through `httptest`. Frontend tests use Vitest + Testing Library, query by accessible role/label, and mock `fetch`. `cmd/server` has no unit tests on purpose and is excluded from coverage.
