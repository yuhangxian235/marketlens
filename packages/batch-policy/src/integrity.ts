import {
  generateAgentProposals,
  type LocalMarketSnapshot,
} from "@marketlens/agent-planner";
import { canonicalJson } from "./canonical.js";
import { hashCanonical } from "./engine.js";
import type {
  AgentProposal,
  BatchPolicy,
  BatchVerificationReceipt,
  MossSimulationEvidence,
} from "./types.js";

export interface BatchArtifactManifest {
  schema_version: string;
  generated_at: string;
  generator: string;
  proposal_generator: string;
  proposal_source: string;
  planner_snapshot_id: string;
  planner_deterministic: boolean;
  engine: string;
  moss_adapter: string;
  moss_simulator: string;
  environment: string;
  chain_id: number;
  trace_method: string;
  proposed_count: number;
  eligible_count: number;
  blocked_count: number;
  signed_count: number;
  broadcast_count: number;
  policy_hash: string;
  receipt_hash: string;
  unsigned: boolean;
  not_broadcast: boolean;
  not_deployed_on_monad: boolean;
}

export interface BatchArtifactSet {
  plannerSnapshot: LocalMarketSnapshot;
  fixturePolicy: BatchPolicy;
  publishedProposals: AgentProposal[];
  publishedPolicy: BatchPolicy;
  simulations: Record<string, MossSimulationEvidence>;
  receipt: BatchVerificationReceipt;
  manifest: BatchArtifactManifest;
}

export interface BatchArtifactVerification {
  check_count: number;
  proposal_count: number;
  action_receipt_count: number;
  simulation_count: number;
  policy_hash: string;
  receipt_hash: string;
  status: "VERIFIED";
}

export function verifyBatchArtifacts(
  artifacts: BatchArtifactSet,
): BatchArtifactVerification {
  let checkCount = 0;
  const verify = (condition: boolean, message: string): void => {
    checkCount += 1;
    if (!condition) throw new Error(`Batch artifact integrity failure: ${message}`);
  };
  const same = (left: unknown, right: unknown): boolean =>
    canonicalJson(left) === canonicalJson(right);

  const {
    plannerSnapshot,
    fixturePolicy,
    publishedProposals,
    publishedPolicy,
    simulations,
    receipt,
    manifest,
  } = artifacts;

  const plannedProposals = generateAgentProposals({
    snapshot: plannerSnapshot,
    generatedAt: plannerSnapshot.observed_at,
  });
  verify(
    same(plannedProposals, publishedProposals),
    "published proposals differ from runtime Agent Planner output",
  );
  verify(
    publishedProposals.every(
      (proposal) =>
        proposal.planner_evidence?.planner === "@marketlens/agent-planner" &&
        proposal.planner_evidence.snapshot_id === plannerSnapshot.snapshot_id &&
        proposal.planner_evidence.deterministic,
    ),
    "published proposals lack Agent Planner provenance",
  );
  verify(same(fixturePolicy, publishedPolicy), "published policy differs from fixture");

  const proposalIds = publishedProposals.map((proposal) => proposal.proposal_id);
  verify(new Set(proposalIds).size === proposalIds.length, "proposal IDs are not unique");
  verify(same(receipt.proposal_order, proposalIds), "proposal order differs from fixture");
  verify(receipt.action_receipts.length === proposalIds.length, "action receipt count mismatch");
  verify(
    same(
      receipt.action_receipts.map((action) => action.proposal_id),
      proposalIds,
    ),
    "action receipts are not in proposal order",
  );
  verify(
    same(Object.keys(simulations).sort(), [...proposalIds].sort()),
    "simulation IDs differ from proposal IDs",
  );

  const expectedPolicyHash = hashCanonical(fixturePolicy);
  verify(receipt.policy_hash === expectedPolicyHash, "policy hash mismatch");
  verify(receipt.policy_id === fixturePolicy.policy_id, "policy ID mismatch");
  verify(
    receipt.batch_id === hashCanonical({ policy_hash: expectedPolicyHash, proposals: publishedProposals }),
    "batch ID mismatch",
  );

  for (const action of receipt.action_receipts) {
    const proposal = publishedProposals.find(
      (candidate) => candidate.proposal_id === action.proposal_id,
    );
    verify(proposal !== undefined, `${action.proposal_id} has no proposal`);
    if (!proposal) continue;

    verify(action.agent_id === proposal.agent_id, `${action.proposal_id} agent mismatch`);
    verify(action.capability === proposal.capability, `${action.proposal_id} capability mismatch`);
    verify(action.market_id === proposal.market_id, `${action.proposal_id} market mismatch`);
    verify(action.outcome === proposal.outcome, `${action.proposal_id} outcome mismatch`);
    verify(
      action.requested_amount === proposal.requested_amount,
      `${action.proposal_id} amount mismatch`,
    );
    verify(action.unsigned && action.not_broadcast, `${action.proposal_id} safety flags mismatch`);
    verify(
      action.moss_evidence.engine === "@themoss/simulator" &&
        action.moss_evidence.adapter === "@marketlens/moss-prediction-market" &&
        action.moss_evidence.trace_method === "debug_traceCall" &&
        action.moss_evidence.moss_trace_call_count === 1,
      `${action.proposal_id} is not bound to one real Moss trace`,
    );
    verify(
      action.moss_evidence.block_number_before ===
        action.moss_evidence.block_number_after &&
        action.moss_evidence.state_unchanged,
      `${action.proposal_id} changed chain state`,
    );
    verify(
      same(simulations[action.proposal_id], action.moss_evidence),
      `${action.proposal_id} published simulation differs from action receipt`,
    );

    if (action.moss_evidence.reverted) {
      verify(
        action.moss_evidence.raw_revert_evidence !== undefined,
        `${action.proposal_id} revert lacks raw evidence`,
      );
      verify(
        action.action_level_verdict === "BLOCKED" && action.final_verdict === "BLOCKED",
        `${action.proposal_id} reverted but was not blocked`,
      );
    } else {
      verify(
        action.moss_evidence.receipt !== undefined,
        `${action.proposal_id} successful trace lacks Moss receipt`,
      );
    }

    const { receipt_hash: actionHash, ...actionHashInput } = action;
    verify(
      actionHash === hashCanonical(actionHashInput),
      `${action.proposal_id} receipt hash mismatch`,
    );
  }

  const eligibleIds = receipt.action_receipts
    .filter((action) => action.final_verdict === "PASS")
    .map((action) => action.proposal_id);
  const blockedIds = receipt.action_receipts
    .filter((action) => action.final_verdict === "BLOCKED")
    .map((action) => action.proposal_id);
  const actionPassCount = receipt.action_receipts.filter(
    (action) => action.action_level_verdict === "PASS",
  ).length;
  const batchBlockedCount = receipt.action_receipts.filter(
    (action) => action.batch_level_verdict === "BLOCKED",
  ).length;
  const totalProposedPayment = publishedProposals.reduce(
    (total, proposal) => total + BigInt(proposal.requested_amount),
    0n,
  );
  const eligibleProposals = publishedProposals.filter((proposal) =>
    eligibleIds.includes(proposal.proposal_id),
  );
  const totalEligiblePayment = eligibleProposals.reduce(
    (total, proposal) => total + BigInt(proposal.requested_amount),
    0n,
  );
  const paymentByMarket = Object.fromEntries(
    [...new Set(eligibleProposals.map((proposal) => proposal.market_id))]
      .sort()
      .map((marketId) => [
        marketId,
        eligibleProposals
          .filter((proposal) => proposal.market_id === marketId)
          .reduce((total, proposal) => total + BigInt(proposal.requested_amount), 0n)
          .toString(),
      ]),
  );

  verify(receipt.proposed_count === proposalIds.length, "proposed count mismatch");
  verify(receipt.eligible_count === eligibleIds.length, "eligible count mismatch");
  verify(receipt.final_blocked_count === blockedIds.length, "blocked count mismatch");
  verify(receipt.action_pass_count === actionPassCount, "action pass count mismatch");
  verify(
    receipt.action_blocked_count === proposalIds.length - actionPassCount,
    "action blocked count mismatch",
  );
  verify(receipt.batch_blocked_count === batchBlockedCount, "batch blocked count mismatch");
  verify(same(receipt.eligible_proposal_ids, eligibleIds), "eligible ID list mismatch");
  verify(same(receipt.blocked_proposal_ids, blockedIds), "blocked ID list mismatch");
  verify(
    receipt.total_proposed_payment === totalProposedPayment.toString(),
    "total proposed payment mismatch",
  );
  verify(
    receipt.total_eligible_payment === totalEligiblePayment.toString(),
    "total eligible payment mismatch",
  );
  verify(same(receipt.payment_by_market, paymentByMarket), "payment-by-market mismatch");
  verify(
    receipt.signed_count === 0 &&
      receipt.broadcast_count === 0 &&
      receipt.unsigned &&
      receipt.not_broadcast &&
      receipt.not_deployed_on_monad,
    "batch safety boundary mismatch",
  );
  verify(
    ["SYNTHETIC AGENT PROPOSAL", "UNSIGNED", "NOT BROADCAST", "NOT DEPLOYED ON MONAD"].every(
      (label) => receipt.limitations.includes(label),
    ),
    "required limitation labels are missing",
  );

  const { receipt_hash: receiptHash, ...receiptHashInput } = receipt;
  verify(receiptHash === hashCanonical(receiptHashInput), "batch receipt hash mismatch");

  verify(manifest.schema_version === "1.0.0", "manifest schema mismatch");
  verify(manifest.generated_at === receipt.generated_at, "manifest timestamp mismatch");
  verify(manifest.generator === "@marketlens/batch-policy", "manifest generator mismatch");
  verify(
    manifest.proposal_generator === "@marketlens/agent-planner" &&
      manifest.proposal_source === "RUNTIME_LOCAL_AGENT" &&
      manifest.planner_snapshot_id === plannerSnapshot.snapshot_id &&
      manifest.planner_deterministic,
    "manifest Agent Planner provenance mismatch",
  );
  verify(manifest.engine === "REAL_RUNTIME", "manifest engine mismatch");
  verify(
    manifest.moss_adapter === "@marketlens/moss-prediction-market" &&
      manifest.moss_simulator === "@themoss/simulator",
    "manifest Moss provenance mismatch",
  );
  verify(
    manifest.environment === "local_anvil" &&
      manifest.trace_method === "debug_traceCall" &&
      receipt.action_receipts.every(
        (action) => action.moss_evidence.chain_id === manifest.chain_id,
      ),
    "manifest environment mismatch",
  );
  verify(manifest.proposed_count === receipt.proposed_count, "manifest proposed count mismatch");
  verify(manifest.eligible_count === receipt.eligible_count, "manifest eligible count mismatch");
  verify(manifest.blocked_count === receipt.final_blocked_count, "manifest blocked count mismatch");
  verify(manifest.signed_count === receipt.signed_count, "manifest signed count mismatch");
  verify(manifest.broadcast_count === receipt.broadcast_count, "manifest broadcast count mismatch");
  verify(manifest.policy_hash === receipt.policy_hash, "manifest policy hash mismatch");
  verify(manifest.receipt_hash === receipt.receipt_hash, "manifest receipt hash mismatch");
  verify(
    manifest.unsigned === receipt.unsigned &&
      manifest.not_broadcast === receipt.not_broadcast &&
      manifest.not_deployed_on_monad === receipt.not_deployed_on_monad,
    "manifest safety flags mismatch",
  );

  return {
    check_count: checkCount,
    proposal_count: proposalIds.length,
    action_receipt_count: receipt.action_receipts.length,
    simulation_count: Object.keys(simulations).length,
    policy_hash: expectedPolicyHash,
    receipt_hash: receipt.receipt_hash,
    status: "VERIFIED",
  };
}
