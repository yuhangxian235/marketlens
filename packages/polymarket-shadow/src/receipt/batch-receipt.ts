// Generate Batch Receipt
import type { ActionReceipt, BatchReceipt, ActionCheckResult } from "../models/receipt";
import type { BatchPolicy } from "../models/policy";
import { sha256 } from "../snapshot/hash";

export function generateBatchReceipt(
  actionReceipts: ActionReceipt[],
  batchChecks: ActionCheckResult[],
  policy: BatchPolicy,
  snapshotCapturedAt: string,
  snapshotHashes: string[],
): BatchReceipt {
  const eligible = actionReceipts.filter(r => r.actionVerdict === "PASS");
  const blocked = actionReceipts.filter(r => r.actionVerdict === "BLOCKED");
  const review = actionReceipts.filter(r => r.actionVerdict === "REVIEW");

  const totalProposed = actionReceipts.reduce((s, r) => s + BigInt(r.collateralSpent || "0"), 0n);
  const totalEligible = eligible.reduce((s, r) => s + BigInt(r.collateralSpent || "0"), 0n);

  const exposureByMarket: Record<string,string> = {};
  for (const r of eligible) {
    const m = r.marketSnapshot.marketId;
    exposureByMarket[m] = ((BigInt(exposureByMarket[m] || "0") + BigInt(r.collateralSpent || "0")).toString());
  }

  const batchVerdict: BatchReceipt["batchVerdict"] =
    blocked.length === 0 ? "ELIGIBLE"
    : eligible.length === 0 ? "BLOCKED"
    : "PARTIALLY_ELIGIBLE";

  const receipt: BatchReceipt = {
    batchId: `batch-${Date.now()}`,
    policyId: policy.policyId,
    policyHash: policy.policyHash,
    generatedAt: new Date().toISOString(),
    snapshotCapturedAt,
    snapshotHashes,
    executionMode: policy.executionMode,
    proposedActionCount: actionReceipts.length,
    eligibleActionCount: eligible.length,
    blockedActionCount: blocked.length,
    reviewActionCount: review.length,
    totalProposedSpend: totalProposed.toString(),
    totalEligibleSpend: totalEligible.toString(),
    exposureByMarket,
    exposureByEvent: {},
    actionReceipts,
    batchChecks,
    eligibleActionIds: eligible.map(r => r.actionId),
    blockedActionIds: blocked.map(r => r.actionId),
    batchVerdict,
    unsigned: true,
    notSubmitted: true,
    notBroadcast: true,
    limitations: "All data from public Polymarket snapshots. No orders submitted.",
    batchReceiptHash: "",
  };

  receipt.batchReceiptHash = sha256(JSON.stringify(receipt));
  return receipt;
}
