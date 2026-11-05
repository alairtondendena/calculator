// Package httpapi exposes the calculator over a JSON HTTP API.
package httpapi

import (
	"encoding/json"
	"errors"
	"io"
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

// domainErrors maps calculator errors to responses. 400 means the request is
// wrong; 422 means it is well formed but the result is undefined.
var domainErrors = []struct {
	err    error
	status int
	code   string
}{
	{calculator.ErrUnknownOperation, http.StatusBadRequest, "UNKNOWN_OPERATION"},
	{calculator.ErrInvalidOperandCount, http.StatusBadRequest, "INVALID_OPERAND_COUNT"},
	{calculator.ErrDivisionByZero, http.StatusUnprocessableEntity, "DIVISION_BY_ZERO"},
	{calculator.ErrNegativeSquareRoot, http.StatusUnprocessableEntity, "NEGATIVE_SQUARE_ROOT"},
	{calculator.ErrNonFiniteResult, http.StatusUnprocessableEntity, "NON_FINITE_RESULT"},
}

// NewHandler returns the API routes. If staticDir is not empty, the files in it
// (the built frontend) are served at the root.
func NewHandler(logger *slog.Logger, staticDir string) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, logger, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("POST /api/v1/calculate", calculate(logger))
	// ServeMux answers unmatched routes in plain text; these keep API errors in JSON.
	mux.HandleFunc("/api/v1/calculate", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Allow", http.MethodPost)
		writeError(w, logger, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "use POST")
	})
	mux.HandleFunc("/api/", func(w http.ResponseWriter, _ *http.Request) {
		writeError(w, logger, http.StatusNotFound, "NOT_FOUND", "route not found")
	})
	if staticDir != "" {
		mux.Handle("/", http.FileServer(http.Dir(staticDir)))
	}
	return logRequests(logger, mux)
}

func calculate(logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
		dec := json.NewDecoder(r.Body)
		dec.DisallowUnknownFields()

		var req calculateRequest
		if err := decodeOne(dec, &req); err != nil {
			var tooLarge *http.MaxBytesError
			if errors.As(err, &tooLarge) {
				writeError(w, logger, http.StatusRequestEntityTooLarge, "BODY_TOO_LARGE", "request body must not exceed 1 KiB")
				return
			}
			writeError(w, logger, http.StatusBadRequest, "INVALID_JSON", "request body must be a single JSON object with operation, a and an optional b")
			return
		}
		if req.A == nil {
			writeError(w, logger, http.StatusBadRequest, "MISSING_OPERAND", "operand a is required")
			return
		}

		operands := []float64{*req.A}
		if req.B != nil {
			operands = append(operands, *req.B)
		}
		result, err := calculator.Calculate(req.Operation, operands...)
		if err != nil {
			writeCalculatorError(w, logger, err)
			return
		}
		writeJSON(w, logger, http.StatusOK, calculateResponse{Result: result})
	}
}

// decodeOne decodes exactly one JSON value; anything after it is an error.
func decodeOne(dec *json.Decoder, v any) error {
	if err := dec.Decode(v); err != nil {
		return err
	}
	switch err := dec.Decode(&struct{}{}); err {
	case io.EOF:
		return nil
	case nil:
		return errors.New("trailing data after the JSON value")
	default:
		return err
	}
}

func writeCalculatorError(w http.ResponseWriter, logger *slog.Logger, err error) {
	for _, de := range domainErrors {
		if errors.Is(err, de.err) {
			writeError(w, logger, de.status, de.code, err.Error())
			return
		}
	}
	logger.Error("unmapped calculator error", "err", err)
	writeError(w, logger, http.StatusInternalServerError, "INTERNAL_ERROR", "internal error")
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
