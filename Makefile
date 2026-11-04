.PHONY: test test-backend test-frontend coverage run-backend run-frontend docker-build docker-run

test: test-backend test-frontend

test-backend:
	cd backend && go vet ./... && go test -race ./...

test-frontend:
	cd frontend && npm test

coverage:
	cd backend && go test -race -coverprofile=coverage.out ./... && go tool cover -func=coverage.out && go tool cover -html=coverage.out -o coverage.html
	cd frontend && npm run coverage

run-backend:
	cd backend && go run ./cmd/server

run-frontend:
	cd frontend && npm run dev

docker-build:
	docker build -t calculator .

docker-run: docker-build
	docker run --rm -p 8080:8080 calculator
