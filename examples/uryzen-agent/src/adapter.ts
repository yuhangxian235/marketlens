// Adapter: UryzenBetIntent[] → AgentProposal[]
//
// Bridges the INDEPENDENT Agent output into MarketLens format.
// Agent knows nothing about AgentProposal.
// MarketLens knows nothing about UryzenBetIntent.

import type { UryzenBetIntent } from "./types.js";
import type { AgentProposal, AgentPlannerEvidence } from "@marketlens/batch-policy";

const AGENT_ID = "uryzen-prediction-agent-v1" as const;
const ACTOR_ADDRESS = "0xdEAd000000000000000000000000000000000001" as const;

export function adaptToAgentProposals(intents: UryzenBetIntent[]): AgentProposal[] {
  return intents.map((intent, idx) => {
    const proposalId = `uryzen-${intent.agentRunId}-${idx}`;

    const plannerEvidence: AgentPlannerEvidence = {
      planner: "@marketlens/agent-planner",
      strategy: "MOMENTUM",
      snapshot_id: intent.agentRunId,
      signal_bps: 3000,
      deterministic: true,
    };

    return {
      proposal_id: proposalId,
      agent_id: AGENT_ID,
      actor_address: ACTOR_ADDRESS,
      generated_at: intent.generatedAt,
      market_id: String(intent.onChainEventId),
      market_question: `Uryzen event ${intent.onChainEventId}: ${intent.outcomeLabel}`,
      capability: "buy_position",
      outcome: "YES",
      requested_amount: intent.amountWei,
      max_payment: intent.amountWei,
      min_stake: "1",
      rationale: intent.rationale,
      policy_reference: "uryzen-default-policy-v1",
      source_type: "SYNTHETIC_AGENT_PROPOSAL",
      planner_evidence: plannerEvidence,
    };
  });
}
