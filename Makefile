.PHONY: test test-backend test-frontend lint coverage run-backend run-frontend docker-build docker-run

test: test-backend test-frontend

test-backend:
	cd backend && go vet ./... && go test -race ./...

test-frontend:
	cd frontend && npm test

lint:
	cd backend && test -z "$$(gofmt -l .)" && go vet ./... && go run honnef.co/go/tools/cmd/staticcheck@v0.8.2 ./...
	cd frontend && npm run lint && npx tsc -b

# cmd/server only wires configuration and shutdown; it is checked by running the server, not unit tests.
coverage:
	mkdir -p coverage
	cd backend && go test -race -coverprofile=../coverage/backend.out ./internal/... \
		&& go tool cover -func=../coverage/backend.out > ../coverage/backend.txt \
		&& go tool cover -html=../coverage/backend.out -o ../coverage/backend.html \
		&& rm ../coverage/backend.out
	cat coverage/backend.txt
	cd frontend && npm run coverage

run-backend:
	cd backend && go run ./cmd/server

run-frontend:
	cd frontend && npm run dev

docker-build:
	docker build -t calculator .

docker-run: docker-build
	docker run --rm -p 8080:8080 calculator
