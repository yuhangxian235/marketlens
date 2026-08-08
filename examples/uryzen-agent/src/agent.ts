// Independent Uryzen Prediction Agent
//
// This Agent reads real Uryzen market data and generates bet intents.
// It has its OWN strategy and sizing logic.
// It does NOT know about MarketLens batch limits.
//
// Agent decision logic and MarketLens policy logic are SEPARATE.

import { randomUUID } from "node:crypto";
import type { UryzenMarket, UryzenBetIntent } from "./types.js";

export interface AgentConfig {
  /** Which outcome indices to bet on (e.g., [0, 1] = first two outcomes) */
  selectedOutcomeIndices: number[];
  /** Amount per bet in MON (decimal string, e.g., "0.3") */
  amountPerBetMon: string;
}

/**
 * Run the Uryzen prediction agent.
 *
 * Produces one bet intent per selected outcome.
 * The Agent only knows its own config — it does NOT know
 * MarketLens batch limit.
 */
export function runUryzenAgent(
  market: UryzenMarket,
  config: AgentConfig,
): UryzenBetIntent[] {
  const runId = `uryzen-agent-${randomUUID().slice(0, 8)}`;
  const generatedAt = new Date().toISOString();

  const intents: UryzenBetIntent[] = [];

  for (let i = 0; i < config.selectedOutcomeIndices.length; i++) {
    const outcomeIdx = config.selectedOutcomeIndices[i];
    const outcome = market.outcomes.find((o) => o.index === outcomeIdx);
    if (!outcome) continue;

    // Convert MON amount to wei (18 decimals)
    const amountMon = parseFloat(config.amountPerBetMon);
    const amountWei = BigInt(Math.floor(amountMon * 1e18));

    const intent: UryzenBetIntent = {
      agentRunId: runId,
      onChainEventId: market.onChainEventId,
      predictionIndex: outcomeIdx,
      outcomeLabel: outcome.label,
      amountMon: config.amountPerBetMon,
      amountWei: amountWei.toString(),
      rationale: `Agent selects outcome ${outcomeIdx} ("${outcome.label}") with ${config.amountPerBetMon} MON`,
      intentIndex: i,
      generatedAt,
    };

    intents.push(intent);
  }

  return intents;
}
