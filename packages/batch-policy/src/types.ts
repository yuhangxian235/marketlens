// Batch Policy Engine — Types
// MarketLens Phase 4A: Agent Batch Policy Firewall

export type Address = `0x${string}`;
export type Hex = `0x${string}`;
export type Outcome = "YES" | "NO" | "NOT_APPLICABLE";
export type Capability = "buy_position" | "claim_reward";
export type VerdictStatus = "PASS" | "BLOCKED" | "NOT_APPLICABLE";
export type BatchVerdict = "ELIGIBLE" | "PARTIALLY_ELIGIBLE" | "BLOCKED";
export type ExecutionMode = "ALL_OR_NOTHING" | "ALLOW_ELIGIBLE_ONLY";
export type SourceType = "SYNTHETIC_AGENT_PROPOSAL";

export interface AgentPlannerEvidence {
  planner: "@marketlens/agent-planner";
  strategy: "MOMENTUM" | "CONTRARIAN" | "CLAIM_INDEX";
  snapshot_id: string;
  signal_bps: number;
  deterministic: true;
}

export interface AgentProposal {
  proposal_id: string;
  agent_id: string;
  actor_address: Address;
  generated_at: string;
  market_id: string;
  market_question: string;
  capability: Capability;
  outcome: Outcome;
  requested_amount: string;
  max_payment: string;
  min_stake: string;
  rationale: string;
  policy_reference: string;
  source_type: SourceType;
  planner_evidence?: AgentPlannerEvidence;
}

export interface BatchPolicy {
  policy_id: string;
  max_actions: number;
  max_total_payment: string;
  max_payment_per_action: string;
  max_payment_per_market: string;
  allowed_capabilities: Capability[];
  allowed_outcomes: Outcome[];
  block_conflicting_outcomes_same_market: boolean;
  require_simulation_success: boolean;
  require_receipt: boolean;
  require_intent_match: boolean;
  fail_closed_on_missing_data: boolean;
  execution_mode: ExecutionMode;
}

export interface ActionCheckResult {
  rule: string;
  expected: string;
  actual: string;
  status: VerdictStatus;
  reason: string;
}

export interface BatchActionReceipt {
  receipt_version: string;
  proposal_id: string;
  agent_id: string;
  capability: Capability;
  market_id: string;
  outcome: Outcome;
  requested_amount: string;
  max_payment: string;
  min_stake: string;
  simulation_success: boolean;
  revert_reason?: string;
  moss_evidence: MossSimulationEvidence;
  intent_checks: ActionCheckResult[];
  action_policy_checks: ActionCheckResult[];
  action_level_verdict: VerdictStatus;
  batch_level_verdict?: VerdictStatus;
  final_verdict: VerdictStatus;
  verdict_reason: string;
  receipt_hash: string;
  unsigned: true;
  not_broadcast: true;
  source_boundaries: Record<string, string>;
}

export interface BatchPolicyCheck {
  rule: string;
  proposal_id?: string;
  expected: string;
  actual: string;
  status: VerdictStatus;
  reason: string;
}

export interface BatchVerificationReceipt {
  receipt_version: string;
  batch_id: string;
  policy_id: string;
  policy_hash: string;
  generated_at: string;
  execution_mode: ExecutionMode;
  proposed_count: number;
  action_pass_count: number;
  action_blocked_count: number;
  batch_blocked_count: number;
  eligible_count: number;
  final_blocked_count: number;
  signed_count: 0;
  broadcast_count: 0;
  total_proposed_payment: string;
  total_eligible_payment: string;
  payment_by_market: Record<string, string>;
  conflicting_outcomes: string[];
  proposal_order: string[];
  action_receipts: BatchActionReceipt[];
  batch_policy_checks: BatchPolicyCheck[];
  eligible_proposal_ids: string[];
  blocked_proposal_ids: string[];
  final_verdict: BatchVerdict;
  unsigned: true;
  not_broadcast: true;
  not_deployed_on_monad: true;
  limitations: string[];
  receipt_hash: string;
}

export interface UnsignedAllowlistAction {
  proposal_id: string;
  agent_id: string;
  capability: Capability;
  market_id: string;
  outcome: Outcome;
  requested_amount: string;
  action_receipt_hash: string;
}

export interface UnsignedAllowlistBlockedAction {
  proposal_id: string;
  action_level_verdict: VerdictStatus;
  batch_level_verdict?: VerdictStatus;
  verdict_reason: string;
  action_receipt_hash: string;
}

export interface UnsignedAllowlistArtifact {
  schema_version: "1.0.0";
  artifact_type: "UNSIGNED_ELIGIBLE_ACTION_ALLOWLIST";
  generated_at: string;
  batch_id: string;
  policy_id: string;
  policy_hash: string;
  policy_snapshot: BatchPolicy;
  source_batch_receipt_hash: string;
  eligible_count: number;
  blocked_count: number;
  signed_count: 0;
  broadcast_count: 0;
  eligible_actions: UnsignedAllowlistAction[];
  blocked_actions: UnsignedAllowlistBlockedAction[];
  boundaries: ["UNSIGNED", "NOT BROADCAST", "NOT DEPLOYED ON MONAD"];
  allowlist_hash: string;
}

export interface MossWarningEvidence {
  code: string;
  message: string;
}

export interface MossSimulationEvidence {
  engine: "@themoss/simulator";
  adapter: "@marketlens/moss-prediction-market";
  protocol: string;
  method: string;
  rpc_url: string;
  chain_id: number;
  trace_method: "debug_traceCall";
  trace_call_count: number;
  moss_trace_call_count: number;
  block_number_before: string;
  block_number_after: string;
  state_unchanged: boolean;
  transaction: {
    from: Address;
    to: Address;
    data: Hex;
    value: Hex;
  };
  reverted: boolean;
  revert_reason?: string;
  raw_revert_evidence?: {
    block_number: string;
    type: string;
    from: Address;
    to: Address;
    input: Hex;
    output: Hex;
    error: string;
    decoded_error?: {
      name: string;
      args: string[];
    };
  };
  warnings: MossWarningEvidence[];
  receipt?: {
    protocol: string;
    text: string;
    outcome: Record<string, unknown>;
    change_count: number;
  };
  gas: string | null;
  unsigned: true;
  not_broadcast: true;
}
