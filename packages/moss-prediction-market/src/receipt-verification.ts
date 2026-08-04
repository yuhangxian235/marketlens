import type { CapabilityNode, JsonSafeValue, Receipt } from "@themoss/core";

function record(value: JsonSafeValue, label: string): Readonly<Record<string, JsonSafeValue>> {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`${label} must be a JSON object`);
  }
  return value as Readonly<Record<string, JsonSafeValue>>;
}

function requireMatch(
  field: string,
  actual: JsonSafeValue | undefined,
  expected: JsonSafeValue | undefined,
): void {
  if (actual !== expected) {
    throw new Error(
      `Receipt outcome does not match Capability params: ${field} expected ${String(
        expected,
      )}, received ${String(actual)}`,
    );
  }
}

/**
 * Moss Receipt handlers deliberately receive only Changes. This adapter-level
 * boundary check binds the parsed on-chain outcome back to the Capability that
 * produced the unsigned transaction, without changing Moss core.
 */
export function verifyPredictionMarketReceipt(
  capability: CapabilityNode,
  receipt: Receipt,
): Receipt {
  if (capability.protocol !== "marketlens") {
    throw new Error(`Unsupported Receipt verification protocol: ${capability.protocol}`);
  }

  const params = record(capability.params, "Capability params");
  const outcome = record(receipt.outcome, "Receipt outcome");

  switch (capability.method) {
    case "buyPosition":
      requireMatch("operation", outcome.operation, "buy_position");
      requireMatch("marketId", outcome.marketId, params.marketId);
      requireMatch("outcome", outcome.outcome, params.outcome);
      requireMatch("amount", outcome.amount, params.paymentWei);
      break;
    case "claimReward":
      requireMatch("operation", outcome.operation, "claim_reward");
      requireMatch("marketId", outcome.marketId, params.marketId);
      break;
    case "createMarket":
      requireMatch("operation", outcome.operation, "create_market");
      requireMatch("question", outcome.question, params.question);
      requireMatch("closesAt", outcome.closesAt, params.closesAt);
      break;
    default:
      throw new Error(`Unsupported marketlens Capability method: ${capability.method}`);
  }

  return receipt;
}
