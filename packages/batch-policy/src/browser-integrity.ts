import { canonicalJson } from "./canonical.js";
import type { BatchArtifactManifest } from "./integrity.js";
import type {
  AgentProposal,
  BatchPolicy,
  BatchVerificationReceipt,
  MossSimulationEvidence,
} from "./types.js";

export interface PublishedBatchArtifactSet {
  proposals: AgentProposal[];
  policy: BatchPolicy;
  simulations: Record<string, MossSimulationEvidence>;
  receipt: BatchVerificationReceipt;
  manifest: BatchArtifactManifest;
}

export interface BrowserArtifactVerification {
  check_count: number;
  proposal_count: number;
  action_receipt_count: number;
  simulation_count: number;
  policy_hash: string;
  receipt_hash: string;
  status: "VERIFIED";
}

export async function hashCanonicalInBrowser(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return `0x${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
}

export async function verifyPublishedBatchArtifacts(
  artifacts: PublishedBatchArtifactSet,
): Promise<BrowserArtifactVerification> {
  let checkCount = 0;
  const verify = (condition: boolean, message: string): void => {
    checkCount += 1;
    if (!condition) throw new Error(`Published receipt rejected: ${message}`);
  };
  const same = (left: unknown, right: unknown): boolean =>
    canonicalJson(left) === canonicalJson(right);
  const { proposals, policy, simulations, receipt, manifest } = artifacts;

  const proposalIds = proposals.map((proposal) => proposal.proposal_id);
  const actionIds = receipt.action_receipts.map((action) => action.proposal_id);
  verify(proposals.length > 0, "proposal list is empty");
  verify(new Set(proposalIds).size === proposalIds.length, "proposal IDs are not unique");
  verify(
    proposals.every(
      (proposal) =>
        proposal.planner_evidence?.planner === "@marketlens/agent-planner" &&
        proposal.planner_evidence.snapshot_id === manifest.planner_snapshot_id &&
        proposal.planner_evidence.deterministic,
    ),
    "Agent Planner provenance mismatch",
  );
  verify(same(receipt.proposal_order, proposalIds), "proposal order mismatch");
  verify(same(actionIds, proposalIds), "Action Receipt order mismatch");
  verify(
    same(Object.keys(simulations).sort(), [...proposalIds].sort()),
    "Moss simulation IDs mismatch",
  );

  const policyHash = await hashCanonicalInBrowser(policy);
  verify(receipt.policy_hash === policyHash, "policy hash mismatch");
  verify(manifest.policy_hash === policyHash, "manifest policy hash mismatch");

  for (const action of receipt.action_receipts) {
    const proposal = proposals.find(
      (candidate) => candidate.proposal_id === action.proposal_id,
    );
    verify(proposal !== undefined, `${action.proposal_id} proposal is missing`);
    if (!proposal) continue;

    verify(
      action.agent_id === proposal.agent_id &&
        action.capability === proposal.capability &&
        action.market_id === proposal.market_id &&
        action.outcome === proposal.outcome &&
        action.requested_amount === proposal.requested_amount,
      `${action.proposal_id} does not match its proposal`,
    );
    verify(
      same(simulations[action.proposal_id], action.moss_evidence),
      `${action.proposal_id} Moss evidence mismatch`,
    );
    verify(
      action.moss_evidence.engine === "@themoss/simulator" &&
        action.moss_evidence.adapter === "@marketlens/moss-prediction-market" &&
        action.moss_evidence.trace_method === "debug_traceCall" &&
        action.moss_evidence.moss_trace_call_count === 1,
      `${action.proposal_id} Moss provenance mismatch`,
    );
    verify(
      action.moss_evidence.state_unchanged &&
        action.moss_evidence.block_number_before ===
          action.moss_evidence.block_number_after,
      `${action.proposal_id} changed chain state`,
    );
    verify(
      action.unsigned && action.not_broadcast,
      `${action.proposal_id} safety flags mismatch`,
    );
    if (action.moss_evidence.reverted) {
      verify(
        action.moss_evidence.raw_revert_evidence !== undefined &&
          action.final_verdict === "BLOCKED",
        `${action.proposal_id} revert evidence mismatch`,
      );
    } else {
      verify(
        action.moss_evidence.receipt !== undefined,
        `${action.proposal_id} Moss Receipt is missing`,
      );
    }

    const { receipt_hash: actionHash, ...actionHashInput } = action;
    verify(
      actionHash === (await hashCanonicalInBrowser(actionHashInput)),
      `${action.proposal_id} Action Receipt hash mismatch`,
    );
  }

  const eligibleIds = receipt.action_receipts
    .filter((action) => action.final_verdict === "PASS")
    .map((action) => action.proposal_id);
  const blockedIds = receipt.action_receipts
    .filter((action) => action.final_verdict === "BLOCKED")
    .map((action) => action.proposal_id);
  verify(receipt.proposed_count === proposalIds.length, "proposed count mismatch");
  verify(receipt.eligible_count === eligibleIds.length, "eligible count mismatch");
  verify(receipt.final_blocked_count === blockedIds.length, "blocked count mismatch");
  verify(same(receipt.eligible_proposal_ids, eligibleIds), "eligible IDs mismatch");
  verify(same(receipt.blocked_proposal_ids, blockedIds), "blocked IDs mismatch");
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
    "required boundary labels are missing",
  );

  const { receipt_hash: receiptHash, ...receiptHashInput } = receipt;
  verify(
    receiptHash === (await hashCanonicalInBrowser(receiptHashInput)),
    "Batch Receipt hash mismatch",
  );
  verify(manifest.receipt_hash === receiptHash, "manifest Receipt hash mismatch");
  verify(manifest.generated_at === receipt.generated_at, "manifest timestamp mismatch");
  verify(
    manifest.proposed_count === receipt.proposed_count &&
      manifest.eligible_count === receipt.eligible_count &&
      manifest.blocked_count === receipt.final_blocked_count,
    "manifest count mismatch",
  );
  verify(
    manifest.proposal_generator === "@marketlens/agent-planner" &&
      manifest.proposal_source === "RUNTIME_LOCAL_AGENT" &&
      manifest.planner_deterministic,
    "manifest Agent Planner provenance mismatch",
  );
  verify(
    manifest.engine === "REAL_RUNTIME" &&
      manifest.moss_adapter === "@marketlens/moss-prediction-market" &&
      manifest.moss_simulator === "@themoss/simulator" &&
      manifest.environment === "local_anvil" &&
      manifest.trace_method === "debug_traceCall",
    "manifest provenance mismatch",
  );
  verify(
    manifest.signed_count === 0 &&
      manifest.broadcast_count === 0 &&
      manifest.unsigned &&
      manifest.not_broadcast &&
      manifest.not_deployed_on_monad,
    "manifest safety boundary mismatch",
  );

  return {
    check_count: checkCount,
    proposal_count: proposalIds.length,
    action_receipt_count: actionIds.length,
    simulation_count: Object.keys(simulations).length,
    policy_hash: policyHash,
    receipt_hash: receiptHash,
    status: "VERIFIED",
  };
}
