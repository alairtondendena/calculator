package httpapi

import (
	"bytes"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func newTestHandler(t *testing.T, staticDir string) http.Handler {
	t.Helper()
	return NewHandler(slog.New(slog.NewTextHandler(io.Discard, nil)), staticDir)
}

func TestCalculate(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantBody   string
	}{
		{"add", `{"operation":"add","a":2,"b":3}`, http.StatusOK, `{"result":5}`},
		{"subtract", `{"operation":"subtract","a":2,"b":3}`, http.StatusOK, `{"result":-1}`},
		{"multiply", `{"operation":"multiply","a":2,"b":3}`, http.StatusOK, `{"result":6}`},
		{"divide", `{"operation":"divide","a":3,"b":2}`, http.StatusOK, `{"result":1.5}`},
		{"power", `{"operation":"power","a":2,"b":3}`, http.StatusOK, `{"result":8}`},
		{"sqrt without b", `{"operation":"sqrt","a":9}`, http.StatusOK, `{"result":3}`},
		{"percentage", `{"operation":"percentage","a":20,"b":150}`, http.StatusOK, `{"result":30}`},
		{"explicit zero is a valid operand", `{"operation":"add","a":0,"b":0}`, http.StatusOK, `{"result":0}`},
		{"invalid json", `{"operation":`, http.StatusBadRequest, `"code":"INVALID_JSON"`},
		{"empty body", ``, http.StatusBadRequest, `"code":"INVALID_JSON"`},
		{"trailing data", `{"operation":"add","a":1,"b":2} {}`, http.StatusBadRequest, `"code":"INVALID_JSON"`},
		{"unknown field", `{"operation":"add","a":1,"b":2,"c":3}`, http.StatusBadRequest, `"code":"INVALID_JSON"`},
		{"operand as string", `{"operation":"add","a":"1","b":2}`, http.StatusBadRequest, `"code":"INVALID_JSON"`},
		{"operand out of float64 range", `{"operation":"add","a":1e400,"b":2}`, http.StatusBadRequest, `"code":"INVALID_JSON"`},
		{"body too large", `{"operation":"add","a":1,"b":2,"pad":"` + strings.Repeat("x", maxBodyBytes) + `"}`, http.StatusRequestEntityTooLarge, `"code":"BODY_TOO_LARGE"`},
		{"trailing data past the limit", `{"operation":"add","a":1,"b":2}` + strings.Repeat(" ", maxBodyBytes), http.StatusRequestEntityTooLarge, `"code":"BODY_TOO_LARGE"`},
		{"missing a", `{"operation":"add","b":1}`, http.StatusBadRequest, `"code":"MISSING_OPERAND"`},
		{"missing b", `{"operation":"add","a":1}`, http.StatusBadRequest, `"code":"INVALID_OPERAND_COUNT"`},
		{"b on unary operation", `{"operation":"sqrt","a":9,"b":2}`, http.StatusBadRequest, `"code":"INVALID_OPERAND_COUNT"`},
		{"unknown operation", `{"operation":"modulo","a":1,"b":2}`, http.StatusBadRequest, `"code":"UNKNOWN_OPERATION"`},
		{"missing operation", `{"a":1,"b":2}`, http.StatusBadRequest, `"code":"UNKNOWN_OPERATION"`},
		{"division by zero", `{"operation":"divide","a":1,"b":0}`, http.StatusUnprocessableEntity, `"code":"DIVISION_BY_ZERO"`},
		{"sqrt of negative", `{"operation":"sqrt","a":-4}`, http.StatusUnprocessableEntity, `"code":"NEGATIVE_SQUARE_ROOT"`},
		{"overflow", `{"operation":"power","a":10,"b":400}`, http.StatusUnprocessableEntity, `"code":"NON_FINITE_RESULT"`},
	}
	handler := newTestHandler(t, "")
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/v1/calculate", strings.NewReader(tt.body))
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d (body: %s)", rec.Code, tt.wantStatus, rec.Body)
			}
			if got := rec.Header().Get("Content-Type"); got != "application/json" {
				t.Fatalf("Content-Type = %q, want application/json", got)
			}
			if !strings.Contains(rec.Body.String(), tt.wantBody) {
				t.Fatalf("body = %s, want it to contain %s", rec.Body, tt.wantBody)
			}
		})
	}
}

func TestRoutes(t *testing.T) {
	staticDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(staticDir, "index.html"), []byte("<h1>calculator</h1>"), 0o644); err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name       string
		staticDir  string
		method     string
		path       string
		wantStatus int
		wantBody   string
	}{
		{"healthz", "", http.MethodGet, "/healthz", http.StatusOK, `{"status":"ok"}`},
		{"wrong method on calculate", "", http.MethodGet, "/api/v1/calculate", http.StatusMethodNotAllowed, `"code":"METHOD_NOT_ALLOWED"`},
		{"unknown api route", "", http.MethodGet, "/api/v1/unknown", http.StatusNotFound, `"code":"NOT_FOUND"`},
		{"frontend served from static dir", staticDir, http.MethodGet, "/", http.StatusOK, "<h1>calculator</h1>"},
		{"api 404 stays JSON with static dir", staticDir, http.MethodGet, "/api/v1/unknown", http.StatusNotFound, `"code":"NOT_FOUND"`},
		{"no frontend without static dir", "", http.MethodGet, "/", http.StatusNotFound, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			newTestHandler(t, tt.staticDir).ServeHTTP(rec, httptest.NewRequest(tt.method, tt.path, nil))

			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d (body: %s)", rec.Code, tt.wantStatus, rec.Body)
			}
			if !strings.Contains(rec.Body.String(), tt.wantBody) {
				t.Fatalf("body = %s, want it to contain %s", rec.Body, tt.wantBody)
			}
		})
	}
}

func TestMethodNotAllowedSetsAllowHeader(t *testing.T) {
	rec := httptest.NewRecorder()
	newTestHandler(t, "").ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/calculate", nil))
	if got := rec.Header().Get("Allow"); got != http.MethodPost {
		t.Fatalf("Allow = %q, want %q", got, http.MethodPost)
	}
}

func TestRequestsAreLogged(t *testing.T) {
	var logs bytes.Buffer
	handler := NewHandler(slog.New(slog.NewTextHandler(&logs, nil)), "")
	handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/api/v1/unknown", nil))

	for _, want := range []string{"method=GET", "path=/api/v1/unknown", "status=404"} {
		if !strings.Contains(logs.String(), want) {
			t.Fatalf("log = %q, want it to contain %q", logs.String(), want)
		}
	}
}
