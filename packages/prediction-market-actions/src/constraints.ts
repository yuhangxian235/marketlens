import type {
  ConstraintCheck,
  ConstraintResult,
  MarketLensSimulationEnvelope,
  UserConstraints,
} from "./types.js";

function check(
  id: string,
  label: string,
  passed: boolean,
  expected: string,
  actual: string,
): ConstraintCheck {
  return { id, label, passed, expected, actual };
}

export function checkConstraints(
  constraints: UserConstraints,
  receipt: MarketLensSimulationEnvelope,
): ConstraintResult {
  const checks: ConstraintCheck[] = [
    check(
      "simulation-success",
      "Preview envelope completed",
      receipt.simulationSuccess,
      "true",
      String(receipt.simulationSuccess),
    ),
    check(
      "zero-warnings",
      "No simulator warnings",
      receipt.warnings.length === 0,
      "0",
      String(receipt.warnings.length),
    ),
    check(
      "sender",
      "Sender matches intent",
      receipt.sender.toLowerCase() === constraints.sender.toLowerCase(),
      constraints.sender,
      receipt.sender,
    ),
    check(
      "transaction-sender",
      "Unsigned transaction sender matches envelope",
      receipt.unsignedTransaction.from.toLowerCase() === receipt.sender.toLowerCase(),
      receipt.sender,
      receipt.unsignedTransaction.from,
    ),
  ];

  if (constraints.requiredOutcome !== undefined) {
    checks.push(
      check(
        "required-outcome",
        "Selected outcome matches",
        receipt.selectedOutcome === constraints.requiredOutcome,
        constraints.requiredOutcome,
        receipt.selectedOutcome ?? "missing",
      ),
    );
  }
  if (constraints.maxPaymentWei !== undefined) {
    const actual = BigInt(receipt.unsignedTransaction.value);
    checks.push(
      check(
        "payment-limit",
        "Payment is within maximum",
        actual <= constraints.maxPaymentWei,
        `<= ${constraints.maxPaymentWei}`,
        String(actual),
      ),
    );
  }
  if (constraints.minPositionUnits !== undefined) {
    const actual = BigInt(receipt.expectedPositionUnits ?? "0");
    checks.push(
      check(
        "minimum-position",
        "Position units meet minimum",
        actual >= constraints.minPositionUnits,
        `>= ${constraints.minPositionUnits}`,
        String(actual),
      ),
    );
  }

  if (receipt.operation === "buy_position") {
    checks.push(
      check(
        "payment-consistency",
        "Envelope payment matches transaction value",
        receipt.expectedPaymentWei === receipt.unsignedTransaction.value,
        receipt.unsignedTransaction.value,
        receipt.expectedPaymentWei ?? "missing",
      ),
    );
  }

  const transfer = receipt.nativeTransfers.find(
    (candidate) =>
      candidate.from.toLowerCase() === receipt.sender.toLowerCase() &&
      candidate.to.toLowerCase() === receipt.unsignedTransaction.to.toLowerCase(),
  );
  if (receipt.operation === "buy_position") {
    checks.push(
      check(
        "native-transfer",
        "Native transfer agrees with transaction value",
        transfer?.valueWei === receipt.unsignedTransaction.value,
        receipt.unsignedTransaction.value,
        transfer?.valueWei ?? "missing",
      ),
    );
    const event = receipt.emittedEvents.find(
      (candidate) => candidate.eventName === "PositionBought",
    );
    checks.push(
      check(
        "event-agreement",
        "PositionBought agrees with intent",
        event?.args.wallet?.toString().toLowerCase() === receipt.sender.toLowerCase() &&
          event?.args.marketId === receipt.marketId &&
          event?.args.outcome === receipt.selectedOutcome &&
          event?.args.amount === receipt.unsignedTransaction.value &&
          event?.args.amount === receipt.expectedPaymentWei &&
          event?.args.positionUnits === receipt.expectedPositionUnits,
        "wallet, market, outcome, amount, and units match",
        event === undefined ? "missing" : "matched mock fields",
      ),
    );
  }

  return {
    passed: checks.every((candidate) => candidate.passed),
    checks,
  };
}
