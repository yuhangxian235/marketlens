export type AgentCapability = "buy_position" | "claim_reward";
export type AgentOutcome = "YES" | "NO" | "NOT_APPLICABLE";
export type MarketOutcome = Exclude<AgentOutcome, "NOT_APPLICABLE">;
export type PlannerStrategy = "MOMENTUM" | "CONTRARIAN" | "CLAIM_INDEX";

export interface ClaimIndexSignal {
  candidate: boolean;
  confidence_bps: number;
}

export interface LocalMarketSignal {
  market_id: string;
  question: string;
  status: "OPEN" | "RESOLVED_YES" | "RESOLVED_NO";
  reference_outcome: MarketOutcome;
  momentum_signal_bps: number;
  contrarian_signal_bps: number;
  momentum_stake_wei: string;
  contrarian_stake_wei: string;
  momentum_budget_wei: string;
  contrarian_budget_wei: string;
  minimum_stake_wei: string;
  claim_index?: ClaimIndexSignal;
}

export interface LocalMarketSnapshot {
  schema_version: string;
  snapshot_id: string;
  observed_at: string;
  agent_id: string;
  policy_reference: string;
  actors: {
    momentum: `0x${string}`;
    contrarian: `0x${string}`;
    claimant: `0x${string}`;
  };
  markets: LocalMarketSignal[];
}

export interface PlannerEvidence {
  planner: "@marketlens/agent-planner";
  strategy: PlannerStrategy;
  snapshot_id: string;
  signal_bps: number;
  deterministic: true;
}

export interface GeneratedAgentProposal {
  proposal_id: string;
  agent_id: string;
  actor_address: `0x${string}`;
  generated_at: string;
  market_id: string;
  market_question: string;
  capability: AgentCapability;
  outcome: AgentOutcome;
  requested_amount: string;
  max_payment: string;
  min_stake: string;
  rationale: string;
  policy_reference: string;
  source_type: "SYNTHETIC_AGENT_PROPOSAL";
  planner_evidence: PlannerEvidence;
}

export interface GenerateAgentProposalsInput {
  snapshot: LocalMarketSnapshot;
  generatedAt: string;
}
