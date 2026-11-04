package calculator

import (
	"errors"
	"math"
	"testing"
)

func TestCalculate(t *testing.T) {
	tests := []struct {
		name     string
		op       string
		operands []float64
		want     float64
		wantErr  error
	}{
		{name: "add", op: "add", operands: []float64{2, 3}, want: 5},
		{name: "add negatives", op: "add", operands: []float64{-2, -3}, want: -5},
		{name: "subtract", op: "subtract", operands: []float64{2, 5}, want: -3},
		{name: "multiply", op: "multiply", operands: []float64{-4, 2.5}, want: -10},
		{name: "divide", op: "divide", operands: []float64{7, 2}, want: 3.5},
		{name: "divide zero by a number", op: "divide", operands: []float64{0, 5}, want: 0},
		{name: "divide by zero", op: "divide", operands: []float64{1, 0}, wantErr: ErrDivisionByZero},
		{name: "divide zero by zero", op: "divide", operands: []float64{0, 0}, wantErr: ErrDivisionByZero},
		{name: "power", op: "power", operands: []float64{2, 10}, want: 1024},
		{name: "power with negative exponent", op: "power", operands: []float64{2, -2}, want: 0.25},
		{name: "power with fractional exponent", op: "power", operands: []float64{9, 0.5}, want: 3},
		{name: "zero to the power of zero", op: "power", operands: []float64{0, 0}, want: 1},
		{name: "zero to a negative power", op: "power", operands: []float64{0, -1}, wantErr: ErrNonFiniteResult},
		{name: "negative base with fractional exponent", op: "power", operands: []float64{-8, 0.5}, wantErr: ErrNonFiniteResult},
		{name: "sqrt", op: "sqrt", operands: []float64{16}, want: 4},
		{name: "sqrt of zero", op: "sqrt", operands: []float64{0}, want: 0},
		{name: "sqrt of negative", op: "sqrt", operands: []float64{-1}, wantErr: ErrNegativeSquareRoot},
		{name: "percentage", op: "percentage", operands: []float64{20, 150}, want: 30},
		{name: "fractional percentage", op: "percentage", operands: []float64{12.5, 80}, want: 10},
		{name: "overflow", op: "multiply", operands: []float64{math.MaxFloat64, 10}, wantErr: ErrNonFiniteResult},
		{name: "unknown operation", op: "modulo", operands: []float64{1, 1}, wantErr: ErrUnknownOperation},
		{name: "empty operation", op: "", operands: []float64{1, 1}, wantErr: ErrUnknownOperation},
		{name: "binary with one operand", op: "add", operands: []float64{1}, wantErr: ErrInvalidOperandCount},
		{name: "unary with two operands", op: "sqrt", operands: []float64{4, 2}, wantErr: ErrInvalidOperandCount},
		{name: "no operands", op: "add", wantErr: ErrInvalidOperandCount},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(tt.op, tt.operands...)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("err = %v, want %v", err, tt.wantErr)
			}
			if got != tt.want {
				t.Fatalf("got %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCalculateNormalizesNegativeZero(t *testing.T) {
	got, err := Calculate("multiply", 0, -1)
	if err != nil {
		t.Fatal(err)
	}
	if math.Signbit(got) {
		t.Fatalf("got -0, want 0")
	}
}
