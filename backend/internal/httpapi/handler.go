// Package httpapi exposes the calculator over a JSON HTTP API.
package httpapi

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"calculator/internal/calculator"
)

const maxBodyBytes = 1 << 10

type calculateRequest struct {
	Operation string `json:"operation"`
	// Pointers distinguish a missing operand from an explicit 0.
	A *float64 `json:"a"`
	B *float64 `json:"b"`
}

type calculateResponse struct {
	Result float64 `json:"result"`
}

type errorResponse struct {
	Error apiError `json:"error"`
}

type apiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// NewHandler returns the API routes.
func NewHandler(logger *slog.Logger) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, logger, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("POST /api/v1/calculate", calculate(logger))
	// TODO: JSON bodies for 404 and 405 (ServeMux answers them in plain text).
	return mux
}

func calculate(logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
		dec := json.NewDecoder(r.Body)
		dec.DisallowUnknownFields()

		var req calculateRequest
		if err := dec.Decode(&req); err != nil {
			writeError(w, logger, http.StatusBadRequest, "INVALID_JSON", "request body must be a JSON object with operation, a and b")
			return
		}
		// TODO: unary operations (square root) will not require b.
		if req.A == nil || req.B == nil {
			writeError(w, logger, http.StatusBadRequest, "MISSING_OPERAND", "operands a and b are required")
			return
		}

		result, err := calculator.Calculate(req.Operation, *req.A, *req.B)
		switch {
		case errors.Is(err, calculator.ErrUnknownOperation):
			writeError(w, logger, http.StatusBadRequest, "UNKNOWN_OPERATION", err.Error())
			return
		case err != nil:
			// TODO: map domain errors (division by zero, overflow) to specific codes.
			writeError(w, logger, http.StatusUnprocessableEntity, "INVALID_OPERATION", err.Error())
			return
		}
		writeJSON(w, logger, http.StatusOK, calculateResponse{Result: result})
	}
}

func writeError(w http.ResponseWriter, logger *slog.Logger, status int, code, message string) {
	writeJSON(w, logger, status, errorResponse{Error: apiError{Code: code, Message: message}})
}

func writeJSON(w http.ResponseWriter, logger *slog.Logger, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		logger.Error("write response", "err", err)
	}
}
