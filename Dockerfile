# syntax=docker/dockerfile:1

# Build the frontend into static files.
FROM node:24-alpine AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Build a static Go binary.
FROM golang:1.27-alpine AS backend
WORKDIR /src
COPY backend/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /server ./cmd/server

# One container: the Go server serves the API and the built frontend (same origin, no CORS).
FROM gcr.io/distroless/static:nonroot
COPY --from=backend /server /server
COPY --from=frontend /app/dist /static
ENV PORT=8080 STATIC_DIR=/static
EXPOSE 8080
ENTRYPOINT ["/server"]
