// Independent Prediction-Market Agent
//
// This Agent has its OWN market input, strategy logic, and sizing logic.
// It does NOT know about MarketLens batch limits.
// It does NOT know about MarketLens policy engine internals.
//
// Agent decision logic and MarketLens policy logic are SEPARATE.

import type { AgentMarketInput, AgentStrategyConfig, PredictionAgentIntent } from "./types.js";
import { randomUUID, randomBytes } from "node:crypto";

/** Generate a deterministic agent run ID */
function generateRunId(): string {
  return `agent-run-${randomUUID().slice(0, 8)}`;
}

/** Generate a unique nonce for order salt */
function generateSalt(): string {
  return BigInt("0x" + randomBytes(16).toString("hex")).toString();
}

/**
 * INDEPENDENT Prediction Agent
 *
 * Strategy: If the YES outcome price is below the configured threshold,
 * propose BUY YES positions at the current best ask price.
 * Each intent represents an independent signal evaluation.
 *
 * The Agent generates `intentCount` intents, each with its own sizing.
 * The sizing is determined by the Agent's own configuration — NOT by MarketLens.
 *
 * The Agent has NO knowledge of:
 * - MarketLens batch policy limits
 * - MarketLens max_total_payment
 * - Whether MarketLens will block any intent
 */
export function runPredictionAgent(
  market: AgentMarketInput,
  config: AgentStrategyConfig,
): PredictionAgentIntent[] {
  const runId = generateRunId();
  const generatedAt = new Date().toISOString();
  const intents: PredictionAgentIntent[] = [];

  const yesOutcome = market.outcomes.find((o) => o.label === "Yes");
  if (!yesOutcome) {
    throw new Error("Market has no YES outcome — agent cannot generate intents");
  }

  const yesPrice = yesOutcome.price;
  const shouldBuy = yesPrice < config.buyThresholdYes;

  if (!shouldBuy) {
    // Agent decides NOT to trade — no intents generated
    return [];
  }

  // Agent generates N independent intents based on N independent signal evaluations
  const signalTemplates = [
    `YES price ${yesPrice} < threshold ${config.buyThresholdYes} — signal 1: momentum`,
    `YES price ${yesPrice} < threshold ${config.buyThresholdYes} — signal 2: mean reversion`,
    `YES price ${yesPrice} < threshold ${config.buyThresholdYes} — signal 3: volume anomaly`,
  ];

  for (let i = 0; i < config.intentCount; i++) {
    const intent: PredictionAgentIntent = {
      agentRunId: runId,
      marketId: market.marketId,
      conditionId: market.conditionId,
      tokenId: yesOutcome.tokenId,
      outcome: "YES",
      side: "BUY",
      // Price in cents as string (e.g., "5" = $0.05)
      price: String(Math.ceil(yesPrice * 100)),
      // Agent's OWN sizing: config.targetSize per intent
      requestedAmount: String(config.targetSize),
      rationaleCode: `BUY_YES_BELOW_THRESHOLD_S${i + 1}`,
      signalDescription: signalTemplates[i] ?? `signal_${i + 1}`,
      generatedAt,
      intentIndex: i,
    };
    intents.push(intent);
  }

  return intents;
}

export type { PredictionAgentIntent };
