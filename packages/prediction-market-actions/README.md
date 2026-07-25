# Prediction-market action module

This module owns the stable application interface, constraint checker, and application Receipt
envelope.

Adapters:

- visible deterministic mock;
- source-pinned Moss.

The module prevents the UI from depending directly on an unstable upstream Moss interface.
The Moss adapter fails closed; the deterministic mock carries a visible `MOCK_ONLY` warning.
