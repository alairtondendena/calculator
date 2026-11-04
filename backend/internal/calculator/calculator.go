// Package calculator implements the arithmetic operations exposed by the API.
// It has no knowledge of HTTP so it can be tested in isolation.
package calculator

import (
	"errors"
	"fmt"
)

// ErrUnknownOperation is returned when the operation name is not registered.
var ErrUnknownOperation = errors.New("unknown operation")

// Operation computes a result from its operands.
type Operation func(a, b float64) (float64, error)

// operations is the registry of supported operations, keyed by the name used in the API.
var operations = map[string]Operation{
	"add": func(a, b float64) (float64, error) { return a + b, nil },
	// TODO: subtract, multiply, divide (division by zero), optional ones.
}

// Calculate applies the named operation to a and b.
func Calculate(op string, a, b float64) (float64, error) {
	fn, ok := operations[op]
	if !ok {
		return 0, fmt.Errorf("%w: %q", ErrUnknownOperation, op)
	}
	return fn(a, b)
}
