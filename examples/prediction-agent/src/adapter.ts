// Adapter: PredictionAgentIntent[] → AgentProposal[]
//
// This adapter bridges the INDEPENDENT Agent output format
// into MarketLens' native AgentProposal format.
//
// The Agent does NOT know about AgentProposal.
// MarketLens does NOT know about PredictionAgentIntent.
//
// The adapter is the ONLY coupling point.

import type { PredictionAgentIntent } from "./types.js";
import type { AgentProposal, AgentPlannerEvidence } from "@marketlens/batch-policy";

const ACTOR_ADDRESS = "0xdEAd000000000000000000000000000000000000" as const;
const AGENT_ID = "prediction-market-agent-v1" as const;

export function adaptToAgentProposals(
  intents: PredictionAgentIntent[],
): AgentProposal[] {
  return intents.map((intent, idx) => {
    const proposalId = `prop-${intent.agentRunId}-${idx}`;

    const plannerEvidence: AgentPlannerEvidence = {
      planner: "@marketlens/agent-planner",
      strategy: "MOMENTUM",
      snapshot_id: intent.agentRunId,
      signal_bps: Math.round(intent.requestedAmount ? 3000 : 0), // 30% signal strength
      deterministic: true,
    };

    const proposal: AgentProposal = {
      proposal_id: proposalId,
      agent_id: AGENT_ID,
      actor_address: ACTOR_ADDRESS,
      generated_at: intent.generatedAt,
      market_id: intent.marketId,
      market_question: `Prediction market: ${intent.marketId}`,
      capability: "buy_position",
      outcome: intent.outcome,
      requested_amount: intent.requestedAmount,
      max_payment: intent.requestedAmount, // Agent's own max = requested
      min_stake: "1", // minimum 1 unit
      rationale: `${intent.rationaleCode}: ${intent.signalDescription}`,
      policy_reference: `policy-default-v1`,
      source_type: "SYNTHETIC_AGENT_PROPOSAL",
      planner_evidence: plannerEvidence,
    };

    return proposal;
  });
}
