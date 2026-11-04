// Package calculator implements the arithmetic operations exposed by the API.
// It has no knowledge of HTTP so it can be tested in isolation.
package calculator

import (
	"errors"
	"fmt"
	"math"
)

var (
	ErrUnknownOperation    = errors.New("unknown operation")
	ErrInvalidOperandCount = errors.New("invalid operand count")
	ErrDivisionByZero      = errors.New("division by zero")
	ErrNegativeSquareRoot  = errors.New("square root of a negative number")
	// ErrNonFiniteResult covers overflow and undefined results such as 0^-1 or (-8)^0.5.
	ErrNonFiniteResult = errors.New("result is not a finite number")
)

type operation struct {
	arity int
	// apply receives b = 0 for unary operations.
	apply func(a, b float64) (float64, error)
}

// operations is the registry of supported operations, keyed by the name used in the API.
var operations = map[string]operation{
	"add":      {arity: 2, apply: func(a, b float64) (float64, error) { return a + b, nil }},
	"subtract": {arity: 2, apply: func(a, b float64) (float64, error) { return a - b, nil }},
	"multiply": {arity: 2, apply: func(a, b float64) (float64, error) { return a * b, nil }},
	"divide":   {arity: 2, apply: divide},
	"power":    {arity: 2, apply: func(a, b float64) (float64, error) { return math.Pow(a, b), nil }},
	"sqrt":     {arity: 1, apply: sqrt},
	// percentage is "a percent of b": percentage(20, 150) = 30.
	"percentage": {arity: 2, apply: func(a, b float64) (float64, error) { return a * b / 100, nil }},
}

// Calculate applies the named operation to its operands.
func Calculate(op string, operands ...float64) (float64, error) {
	o, ok := operations[op]
	if !ok {
		return 0, fmt.Errorf("%w: %q", ErrUnknownOperation, op)
	}
	if len(operands) != o.arity {
		return 0, fmt.Errorf("%w: %q takes %d operand(s), got %d", ErrInvalidOperandCount, op, o.arity, len(operands))
	}

	var b float64
	if o.arity == 2 {
		b = operands[1]
	}
	result, err := o.apply(operands[0], b)
	if err != nil {
		return 0, err
	}
	if math.IsInf(result, 0) || math.IsNaN(result) {
		return 0, ErrNonFiniteResult
	}
	if result == 0 {
		return 0, nil // normalizes -0, which would otherwise be encoded as "-0"
	}
	return result, nil
}

func divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, ErrDivisionByZero
	}
	return a / b, nil
}

func sqrt(a, _ float64) (float64, error) {
	if a < 0 {
		return 0, ErrNegativeSquareRoot
	}
	return math.Sqrt(a), nil
}
