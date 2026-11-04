package httpapi

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCalculate(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantBody   string
	}{
		{"add", `{"operation":"add","a":2,"b":3}`, http.StatusOK, `{"result":5}`},
		{"explicit zero is a valid operand", `{"operation":"add","a":0,"b":0}`, http.StatusOK, `{"result":0}`},
		{"invalid json", `{"operation":`, http.StatusBadRequest, `"code":"INVALID_JSON"`},
		{"unknown field", `{"operation":"add","a":1,"b":2,"c":3}`, http.StatusBadRequest, `"code":"INVALID_JSON"`},
		{"operand as string", `{"operation":"add","a":"1","b":2}`, http.StatusBadRequest, `"code":"INVALID_JSON"`},
		{"missing operand", `{"operation":"add","a":1}`, http.StatusBadRequest, `"code":"MISSING_OPERAND"`},
		{"unknown operation", `{"operation":"modulo","a":1,"b":2}`, http.StatusBadRequest, `"code":"UNKNOWN_OPERATION"`},
		{"body too large", `{"operation":"add","a":1,"b":2,"pad":"` + strings.Repeat("x", maxBodyBytes) + `"}`, http.StatusBadRequest, `"code":"INVALID_JSON"`},
	}
	handler := NewHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))
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

func TestHealthz(t *testing.T) {
	handler := NewHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/healthz", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
}
