import { createHash } from "node:crypto";
import {
  simulateMossProposal,
  type MossBatchSimulation,
} from "@marketlens/moss-prediction-market";
import type {
  ActionCheckResult,
  AgentProposal,
  BatchActionReceipt,
  BatchPolicy,
  BatchPolicyCheck,
  BatchVerificationReceipt,
  Capability,
  MossSimulationEvidence,
} from "./types.js";
import { canonicalJson } from "./canonical.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const DEFAULT_SOURCE_BOUNDARIES: Record<string, string> = {
  proposal: "SYNTHETIC AGENT PROPOSAL",
  moss_action: "REAL LOCAL ADAPTER",
  simulation: "REAL LOCAL debug_traceCall",
  receipt: "RUNTIME COMPUTED FROM MOSS EVIDENCE",
  intent_checks: "DETERMINISTIC RULES OVER MOSS RECEIPT",
  signing: "UNSIGNED",
  broadcast: "NOT BROADCAST",
  monad_deployment: "NOT DEPLOYED ON MONAD",
};

export interface VerificationOptions {
  rpcUrl?: string;
  generatedAt?: string;
  simulateProposal?: (
    proposal: AgentProposal,
    rpcUrl?: string,
  ) => Promise<MossBatchSimulation>;
}

export function hashCanonical(value: unknown): string {
  return `0x${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

function parseUnsignedInteger(value: string, field: string): bigint {
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new Error(`${field} must be a base-10 unsigned integer string`);
  }
  return BigInt(value);
}

function check(
  rule: string,
  expected: string,
  actual: string,
  passed: boolean,
  reason = "",
): ActionCheckResult {
  return {
    rule,
    expected,
    actual,
    status: passed ? "PASS" : "BLOCKED",
    reason: passed ? "" : reason || `${rule.toUpperCase()}_MISMATCH`,
  };
}

function simulationPassed(evidence: MossSimulationEvidence): boolean {
  return (
    evidence.moss_trace_call_count === 1 &&
    !evidence.reverted &&
    evidence.warnings.length === 0 &&
    evidence.receipt !== undefined &&
    evidence.state_unchanged
  );
}

function outcomeValue(
  evidence: MossSimulationEvidence,
  key: string,
): string {
  const value = evidence.receipt?.outcome[key];
  return value === undefined ? "" : String(value);
}

export function runIntentChecks(
  proposal: AgentProposal,
  evidence: MossSimulationEvidence,
): ActionCheckResult[] {
  const expectedMethod =
    proposal.capability === "buy_position" ? "buyPosition" : "claimReward";
  const expectedOperation = proposal.capability;
  const checks = [
    check(
      "moss_adapter_invoked",
      "@marketlens/moss-prediction-market",
      evidence.adapter,
      evidence.adapter === "@marketlens/moss-prediction-market" &&
        evidence.moss_trace_call_count === 1,
      "MOSS_ADAPTER_NOT_INVOKED",
    ),
    check(
      "moss_capability_matches",
      expectedMethod,
      evidence.method,
      evidence.protocol === "marketlens" && evidence.method === expectedMethod,
      "MOSS_CAPABILITY_MISMATCH",
    ),
    check(
      "simulation_not_reverted",
      "true",
      String(!evidence.reverted),
      !evidence.reverted,
      evidence.raw_revert_evidence?.decoded_error
        ? `SIMULATION_REVERTED:${evidence.raw_revert_evidence.decoded_error.name}`
        : `SIMULATION_REVERTED:${evidence.revert_reason ?? "unknown"}`,
    ),
    check(
      "moss_receipt_exists",
      "true",
      String(evidence.receipt !== undefined),
      evidence.receipt !== undefined,
      "MOSS_RECEIPT_MISSING",
    ),
    check(
      "simulation_warnings_empty",
      "0",
      String(evidence.warnings.length),
      evidence.warnings.length === 0,
      evidence.warnings[0]?.code ?? "SIMULATION_WARNING",
    ),
    check(
      "simulation_state_unchanged",
      evidence.block_number_before,
      evidence.block_number_after,
      evidence.state_unchanged,
      "SIMULATION_CHANGED_CHAIN_STATE",
    ),
    check(
      "receipt_operation_matches",
      expectedOperation,
      outcomeValue(evidence, "operation"),
      outcomeValue(evidence, "operation") === expectedOperation,
      "RECEIPT_OPERATION_MISMATCH",
    ),
    check(
      "receipt_market_matches",
      proposal.market_id,
      outcomeValue(evidence, "marketId"),
      outcomeValue(evidence, "marketId") === proposal.market_id,
      "RECEIPT_MARKET_MISMATCH",
    ),
  ];

  if (proposal.capability === "buy_position") {
    checks.push(
      check(
        "receipt_actor_matches",
        proposal.actor_address.toLowerCase(),
        outcomeValue(evidence, "wallet").toLowerCase(),
        outcomeValue(evidence, "wallet").toLowerCase() ===
          proposal.actor_address.toLowerCase(),
        "RECEIPT_ACTOR_MISMATCH",
      ),
      check(
        "receipt_outcome_matches",
        proposal.outcome,
        outcomeValue(evidence, "outcome"),
        outcomeValue(evidence, "outcome") === proposal.outcome,
        "RECEIPT_OUTCOME_MISMATCH",
      ),
      check(
        "receipt_amount_matches",
        proposal.requested_amount,
        outcomeValue(evidence, "amount"),
        outcomeValue(evidence, "amount") === proposal.requested_amount,
        "RECEIPT_AMOUNT_MISMATCH",
      ),
    );
  }
  return checks;
}

export function runActionPolicyChecks(
  proposal: AgentProposal,
  policy: BatchPolicy,
  evidence: MossSimulationEvidence,
): ActionCheckResult[] {
  const amount = parseUnsignedInteger(
    proposal.requested_amount,
    `${proposal.proposal_id}.requested_amount`,
  );
  const proposalMax = parseUnsignedInteger(
    proposal.max_payment,
    `${proposal.proposal_id}.max_payment`,
  );
  const perActionMax = parseUnsignedInteger(
    policy.max_payment_per_action,
    "policy.max_payment_per_action",
  );
  const checks = [
    check(
      "capability_allowed",
      policy.allowed_capabilities.join(","),
      proposal.capability,
      policy.allowed_capabilities.includes(proposal.capability as Capability),
      "CAPABILITY_NOT_ALLOWED",
    ),
    check(
      "outcome_allowed",
      policy.allowed_outcomes.join(","),
      proposal.outcome,
      policy.allowed_outcomes.includes(proposal.outcome),
      "OUTCOME_NOT_ALLOWED",
    ),
    check(
      "agent_payment_constraint",
      `<= ${proposal.max_payment}`,
      proposal.requested_amount,
      amount <= proposalMax,
      "AGENT_PAYMENT_CONSTRAINT_EXCEEDED",
    ),
    check(
      "payment_within_action_limit",
      `<= ${policy.max_payment_per_action}`,
      proposal.requested_amount,
      amount <= perActionMax,
      "PAYMENT_LIMIT_EXCEEDED",
    ),
    check(
      "simulation_required",
      "PASS",
      simulationPassed(evidence) ? "PASS" : "BLOCKED",
      !policy.require_simulation_success || simulationPassed(evidence),
      evidence.raw_revert_evidence?.decoded_error
        ? `SIMULATION_REVERTED:${evidence.raw_revert_evidence.decoded_error.name}`
        : `SIMULATION_REVERTED:${evidence.revert_reason ?? "missing evidence"}`,
    ),
  ];

  if (proposal.capability === "buy_position") {
    const minimum = parseUnsignedInteger(
      proposal.min_stake,
      `${proposal.proposal_id}.min_stake`,
    );
    checks.push(
      check(
        "minimum_stake_satisfied",
        `>= ${proposal.min_stake}`,
        proposal.requested_amount,
        amount >= minimum,
        "MINIMUM_STAKE_NOT_MET",
      ),
    );
  } else {
    checks.push(
      check(
        "claim_has_zero_payment",
        "0",
        proposal.requested_amount,
        amount === 0n,
        "CLAIM_PAYMENT_MUST_BE_ZERO",
      ),
    );
  }
  return checks;
}

function firstFailure(
  actionChecks: ActionCheckResult[],
  intentChecks: ActionCheckResult[],
): string | undefined {
  return [...actionChecks, ...intentChecks].find(
    (entry) => entry.status === "BLOCKED",
  )?.reason;
}

function traceFailureEvidence(
  proposal: AgentProposal,
  rpcUrl: string,
  reason: string,
): MossSimulationEvidence {
  return {
    engine: "@themoss/simulator",
    adapter: "@marketlens/moss-prediction-market",
    protocol: "marketlens",
    method: proposal.capability === "buy_position" ? "buyPosition" : "claimReward",
    rpc_url: rpcUrl,
    chain_id: 143,
    trace_method: "debug_traceCall",
    trace_call_count: 0,
    moss_trace_call_count: 0,
    block_number_before: "",
    block_number_after: "",
    state_unchanged: false,
    transaction: {
      from: proposal.actor_address,
      to: ZERO_ADDRESS,
      data: "0x",
      value: "0x0",
    },
    reverted: true,
    revert_reason: reason,
    warnings: [{ code: "TRACE_FAILED", message: reason }],
    gas: null,
    unsigned: true,
    not_broadcast: true,
  };
}

function batchCheck(
  rule: string,
  proposalId: string,
  expected: string,
  actual: string,
  passed: boolean,
  reason: string,
): BatchPolicyCheck {
  return {
    rule,
    proposal_id: proposalId,
    expected,
    actual,
    status: passed ? "PASS" : "BLOCKED",
    reason: passed ? "" : reason,
  };
}

export async function verifyBatch(
  proposals: AgentProposal[],
  policy: BatchPolicy,
  options: VerificationOptions = {},
): Promise<BatchVerificationReceipt> {
  if (!Number.isSafeInteger(policy.max_actions) || policy.max_actions < 0) {
    throw new Error("policy.max_actions must be a non-negative safe integer");
  }
  const rpcUrl = options.rpcUrl ?? "http://127.0.0.1:8546";
  const simulate = options.simulateProposal ?? simulateMossProposal;
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const seenIds = new Set<string>();
  for (const proposal of proposals) {
    if (seenIds.has(proposal.proposal_id)) {
      throw new Error(`Duplicate proposal_id: ${proposal.proposal_id}`);
    }
    seenIds.add(proposal.proposal_id);
  }

  const simulations = new Map<string, MossSimulationEvidence>();
  for (const proposal of proposals) {
    try {
      const evidence = await simulate(proposal, rpcUrl);
      simulations.set(proposal.proposal_id, evidence as MossSimulationEvidence);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      simulations.set(
        proposal.proposal_id,
        traceFailureEvidence(proposal, rpcUrl, reason),
      );
    }
  }

  const actionReceipts: BatchActionReceipt[] = proposals.map((proposal) => {
    const evidence = simulations.get(proposal.proposal_id);
    if (!evidence) throw new Error(`Missing evidence for ${proposal.proposal_id}`);
    const intentChecks = runIntentChecks(proposal, evidence);
    const actionPolicyChecks = runActionPolicyChecks(proposal, policy, evidence);
    const failed = firstFailure(
      actionPolicyChecks,
      policy.require_intent_match ? intentChecks : [],
    );
    return {
      receipt_version: "1.0.0",
      proposal_id: proposal.proposal_id,
      agent_id: proposal.agent_id,
      capability: proposal.capability,
      market_id: proposal.market_id,
      outcome: proposal.outcome,
      requested_amount: proposal.requested_amount,
      max_payment: proposal.max_payment,
      min_stake: proposal.min_stake,
      simulation_success: simulationPassed(evidence),
      revert_reason: evidence.revert_reason,
      moss_evidence: evidence,
      intent_checks: intentChecks,
      action_policy_checks: actionPolicyChecks,
      action_level_verdict: failed ? "BLOCKED" : "PASS",
      batch_level_verdict: failed ? "NOT_APPLICABLE" : undefined,
      final_verdict: failed ? "BLOCKED" : "PASS",
      verdict_reason: failed ?? "ACTION_POLICY_PASS",
      receipt_hash: "",
      unsigned: true,
      not_broadcast: true,
      source_boundaries: { ...DEFAULT_SOURCE_BOUNDARIES },
    };
  });

  const totalLimit = parseUnsignedInteger(
    policy.max_total_payment,
    "policy.max_total_payment",
  );
  const marketLimit = parseUnsignedInteger(
    policy.max_payment_per_market,
    "policy.max_payment_per_market",
  );
  const accepted: AgentProposal[] = [];
  const acceptedOutcomes = new Map<string, Set<string>>();
  const acceptedPayments = new Map<string, bigint>();
  const batchChecks: BatchPolicyCheck[] = [];
  const conflictingMarkets = new Set<string>();
  let acceptedTotal = 0n;

  for (const receipt of actionReceipts) {
    if (receipt.action_level_verdict !== "PASS") continue;
    const proposal = proposals.find(
      (entry) => entry.proposal_id === receipt.proposal_id,
    );
    if (!proposal) throw new Error(`Unknown receipt proposal ${receipt.proposal_id}`);
    const amount = parseUnsignedInteger(
      proposal.requested_amount,
      `${proposal.proposal_id}.requested_amount`,
    );
    const marketPayment = acceptedPayments.get(proposal.market_id) ?? 0n;
    const outcomes = acceptedOutcomes.get(proposal.market_id) ?? new Set<string>();
    const hasConflict =
      policy.block_conflicting_outcomes_same_market &&
      proposal.outcome !== "NOT_APPLICABLE" &&
      [...outcomes].some(
        (outcome) => outcome !== "NOT_APPLICABLE" && outcome !== proposal.outcome,
      );
    const checks = [
      batchCheck(
        "max_actions",
        proposal.proposal_id,
        `<= ${policy.max_actions}`,
        String(accepted.length + 1),
        accepted.length + 1 <= policy.max_actions,
        "BATCH_MAX_ACTIONS_EXCEEDED",
      ),
      batchCheck(
        "max_total_payment",
        proposal.proposal_id,
        `<= ${policy.max_total_payment}`,
        (acceptedTotal + amount).toString(),
        acceptedTotal + amount <= totalLimit,
        "BATCH_TOTAL_PAYMENT_EXCEEDED",
      ),
      batchCheck(
        "max_payment_per_market",
        proposal.proposal_id,
        `<= ${policy.max_payment_per_market}`,
        (marketPayment + amount).toString(),
        marketPayment + amount <= marketLimit,
        "BATCH_MARKET_PAYMENT_EXCEEDED",
      ),
      batchCheck(
        "block_conflicting_outcomes_same_market",
        proposal.proposal_id,
        "no conflict with earlier eligible action",
        hasConflict
          ? `${proposal.market_id}:${[...outcomes].join("|")} vs ${proposal.outcome}`
          : "none",
        !hasConflict,
        "BATCH_POLICY_CONFLICT",
      ),
    ];
    batchChecks.push(...checks);
    const failure = checks.find((entry) => entry.status === "BLOCKED");
    if (failure) {
      receipt.batch_level_verdict = "BLOCKED";
      receipt.final_verdict = "BLOCKED";
      receipt.verdict_reason = failure.reason;
      if (hasConflict) conflictingMarkets.add(proposal.market_id);
      continue;
    }
    receipt.batch_level_verdict = "PASS";
    receipt.final_verdict = "PASS";
    receipt.verdict_reason = "ELIGIBLE";
    accepted.push(proposal);
    acceptedTotal += amount;
    acceptedPayments.set(proposal.market_id, marketPayment + amount);
    outcomes.add(proposal.outcome);
    acceptedOutcomes.set(proposal.market_id, outcomes);
  }

  if (
    policy.execution_mode === "ALL_OR_NOTHING" &&
    actionReceipts.some((receipt) => receipt.final_verdict === "BLOCKED")
  ) {
    for (const receipt of actionReceipts) {
      if (receipt.action_level_verdict === "PASS") {
        receipt.batch_level_verdict = "BLOCKED";
        receipt.final_verdict = "BLOCKED";
        receipt.verdict_reason = "ALL_OR_NOTHING_BATCH_BLOCKED";
      }
    }
    accepted.length = 0;
    acceptedPayments.clear();
    acceptedTotal = 0n;
  }

  for (const receipt of actionReceipts) {
    const { receipt_hash: ignored, ...hashInput } = receipt;
    void ignored;
    receipt.receipt_hash = hashCanonical(hashInput);
  }

  const eligibleIds = actionReceipts
    .filter((receipt) => receipt.final_verdict === "PASS")
    .map((receipt) => receipt.proposal_id);
  const blockedIds = actionReceipts
    .filter((receipt) => receipt.final_verdict === "BLOCKED")
    .map((receipt) => receipt.proposal_id);
  const actionPassCount = actionReceipts.filter(
    (receipt) => receipt.action_level_verdict === "PASS",
  ).length;
  const batchBlockedCount = actionReceipts.filter(
    (receipt) => receipt.batch_level_verdict === "BLOCKED",
  ).length;
  const totalProposedPayment = proposals.reduce(
    (total, proposal) =>
      total +
      parseUnsignedInteger(
        proposal.requested_amount,
        `${proposal.proposal_id}.requested_amount`,
      ),
    0n,
  );
  const policyHash = hashCanonical(policy);
  const batchId = hashCanonical({
    policy_hash: policyHash,
    proposals,
  });
  const receiptWithoutHash = {
    receipt_version: "1.0.0",
    batch_id: batchId,
    policy_id: policy.policy_id,
    policy_hash: policyHash,
    generated_at: generatedAt,
    execution_mode: policy.execution_mode,
    proposed_count: proposals.length,
    action_pass_count: actionPassCount,
    action_blocked_count: proposals.length - actionPassCount,
    batch_blocked_count: batchBlockedCount,
    eligible_count: eligibleIds.length,
    final_blocked_count: blockedIds.length,
    signed_count: 0 as const,
    broadcast_count: 0 as const,
    total_proposed_payment: totalProposedPayment.toString(),
    total_eligible_payment: acceptedTotal.toString(),
    payment_by_market: Object.fromEntries(
      [...acceptedPayments.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([marketId, amount]) => [marketId, amount.toString()]),
    ),
    conflicting_outcomes: [...conflictingMarkets].sort(),
    proposal_order: proposals.map((proposal) => proposal.proposal_id),
    action_receipts: actionReceipts,
    batch_policy_checks: batchChecks,
    eligible_proposal_ids: eligibleIds,
    blocked_proposal_ids: blockedIds,
    final_verdict:
      eligibleIds.length === proposals.length
        ? ("ELIGIBLE" as const)
        : eligibleIds.length === 0
          ? ("BLOCKED" as const)
          : ("PARTIALLY_ELIGIBLE" as const),
    unsigned: true as const,
    not_broadcast: true as const,
    not_deployed_on_monad: true as const,
    limitations: [
      "SYNTHETIC AGENT PROPOSAL",
      "REAL LOCAL ANVIL SIMULATION — NOT MONAD",
      "UNSIGNED",
      "NOT BROADCAST",
      "NOT DEPLOYED ON MONAD",
    ],
  };

  return {
    ...receiptWithoutHash,
    receipt_hash: hashCanonical(receiptWithoutHash),
  };
}
