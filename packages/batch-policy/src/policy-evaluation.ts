import type { MossBatchSimulation } from "@marketlens/moss-prediction-market";
import { hashCanonical, verifyBatch } from "./engine.js";
import type {
  AgentProposal,
  BatchPolicy,
  BatchVerificationReceipt,
  MossSimulationEvidence,
  UnsignedAllowlistArtifact,
} from "./types.js";

export interface EvidenceEvaluationOptions {
  generatedAt?: string;
}

/**
 * Re-applies Batch Policy rules to an exact, previously verified Moss evidence
 * set. This never simulates or invents execution results; callers are expected
 * to verify the published artifact set before crossing this boundary.
 */
export async function evaluateBatchWithEvidence(
  proposals: AgentProposal[],
  policy: BatchPolicy,
  evidenceByProposal: Record<string, MossSimulationEvidence>,
  options: EvidenceEvaluationOptions = {},
): Promise<BatchVerificationReceipt> {
  const proposalIds = new Set(
    proposals.map((proposal) => proposal.proposal_id),
  );

  for (const proposal of proposals) {
    if (!evidenceByProposal[proposal.proposal_id]) {
      throw new Error(`Missing Moss evidence for ${proposal.proposal_id}`);
    }
  }
  for (const proposalId of Object.keys(evidenceByProposal)) {
    if (!proposalIds.has(proposalId)) {
      throw new Error(`Unexpected Moss evidence for ${proposalId}`);
    }
  }

  return verifyBatch(proposals, policy, {
    generatedAt: options.generatedAt,
    simulateProposal: async (proposal) =>
      evidenceByProposal[proposal.proposal_id] as MossBatchSimulation,
  });
}

/** Produces a tamper-evident, non-executable record of the final allowlist. */
export function createUnsignedAllowlist(
  receipt: BatchVerificationReceipt,
  policy: BatchPolicy,
): UnsignedAllowlistArtifact {
  if (receipt.policy_hash !== hashCanonical(policy)) {
    throw new Error("Policy does not match the Batch Receipt policy hash");
  }
  if (
    receipt.signed_count !== 0 ||
    receipt.broadcast_count !== 0 ||
    !receipt.unsigned ||
    !receipt.not_broadcast ||
    !receipt.not_deployed_on_monad
  ) {
    throw new Error("Batch Receipt violates the unsigned safety boundary");
  }

  const artifactWithoutHash = {
    schema_version: "1.0.0" as const,
    artifact_type: "UNSIGNED_ELIGIBLE_ACTION_ALLOWLIST" as const,
    generated_at: receipt.generated_at,
    batch_id: receipt.batch_id,
    policy_id: receipt.policy_id,
    policy_hash: receipt.policy_hash,
    policy_snapshot: policy,
    source_batch_receipt_hash: receipt.receipt_hash,
    eligible_count: receipt.eligible_count,
    blocked_count: receipt.final_blocked_count,
    signed_count: 0 as const,
    broadcast_count: 0 as const,
    eligible_actions: receipt.action_receipts
      .filter((action) => action.final_verdict === "PASS")
      .map((action) => ({
        proposal_id: action.proposal_id,
        agent_id: action.agent_id,
        capability: action.capability,
        market_id: action.market_id,
        outcome: action.outcome,
        requested_amount: action.requested_amount,
        action_receipt_hash: action.receipt_hash,
      })),
    blocked_actions: receipt.action_receipts
      .filter((action) => action.final_verdict === "BLOCKED")
      .map((action) => ({
        proposal_id: action.proposal_id,
        action_level_verdict: action.action_level_verdict,
        batch_level_verdict: action.batch_level_verdict,
        verdict_reason: action.verdict_reason,
        action_receipt_hash: action.receipt_hash,
      })),
    boundaries: [
      "UNSIGNED",
      "NOT BROADCAST",
      "NOT DEPLOYED ON MONAD",
    ] as ["UNSIGNED", "NOT BROADCAST", "NOT DEPLOYED ON MONAD"],
  };

  return {
    ...artifactWithoutHash,
    allowlist_hash: hashCanonical(artifactWithoutHash),
  };
}
