package calculator

import (
	"errors"
	"testing"
)

func TestCalculate(t *testing.T) {
	tests := []struct {
		name    string
		op      string
		a, b    float64
		want    float64
		wantErr error
	}{
		{name: "add", op: "add", a: 2, b: 3, want: 5},
		{name: "add negatives", op: "add", a: -2, b: -3, want: -5},
		{name: "unknown operation", op: "modulo", a: 1, b: 1, wantErr: ErrUnknownOperation},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(tt.op, tt.a, tt.b)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("err = %v, want %v", err, tt.wantErr)
			}
			if got != tt.want {
				t.Fatalf("got %v, want %v", got, tt.want)
			}
		})
	}
}
