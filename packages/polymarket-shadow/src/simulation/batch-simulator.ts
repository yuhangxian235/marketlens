// Batch orderbook replay
import type { CandidateAction } from "../models/candidate-action";
import type { OrderbookSnapshot } from "../models/orderbook";
import type { BatchPolicy } from "../models/policy";
import { replayOrder } from "./orderbook-replay";
import { checkActionPolicies, checkBatchPolicy } from "../policy/action-policy";
import { generateActionReceipt } from "../receipt/action-receipt";
import type { ActionReceipt, BatchReceipt, ActionCheckResult } from "../models/receipt";
import { sha256 } from "../snapshot/hash";

export interface BatchSimInput {
  actions: CandidateAction[];
  books: Map<string, OrderbookSnapshot>;
  policy: BatchPolicy;
  snapshotCapturedAt: string;
  snapshotHashes: string[];
}

export function simulateBatch(input: BatchSimInput): { receipts: ActionReceipt[]; batchChecks: ActionCheckResult[] } {
  const receipts: ActionReceipt[] = [];
  const allActionChecks: ActionCheckResult[][] = [];

  for (const action of input.actions) {
    const book = input.books.get(action.tokenId);
    if (!book) {
      receipts.push({ ...emptyReceipt(action), actionVerdict: "BLOCKED", verdictReason: "No orderbook data" } as ActionReceipt);
      allActionChecks.push([{ rule: "data_available", expected: "true", actual: "false", status: "BLOCKED", reason: "Orderbook not found" }]);
      continue;
    }

    const replay = replayOrder(action, book, input.policy.maxSlippageBps);
    const checks = checkActionPolicies(action, book, replay, input.policy);
    const allPassed = checks.every(c => c.status === "PASS");
    const receipt = generateActionReceipt(action, book, replay, checks, input.snapshotCapturedAt);
    receipts.push(receipt);
    allActionChecks.push(checks);
  }

  // Batch-level checks
  const eligible = receipts.filter(r => r.actionVerdict === "PASS");
  const blocked = receipts.filter(r => r.actionVerdict === "BLOCKED");
  const batchChecks = checkBatchPolicy(receipts, eligible.map(r=>r.actionId), input.policy, input.actions);

  // Apply execution mode
  if (input.policy.executionMode === "ALL_OR_NOTHING") {
    const anyBlocked = blocked.length > 0 || batchChecks.some(c => c.status !== "PASS");
    if (anyBlocked) {
      for (const r of receipts) {
        if (r.actionVerdict === "PASS") {
          r.actionVerdict = "BLOCKED";
          r.verdictReason = "Batch ALL_OR_NOTHING: another action failed or batch policy violated";
        }
      }
    }
  }

  return { receipts, batchChecks };
}

function emptyReceipt(action: CandidateAction): Partial<ActionReceipt> {
  return {
    actionId: action.actionId,
    simulationType: "POLYMARKET_ORDERBOOK_SHADOW",
    actionVerdict: "BLOCKED",
    unsigned: true, notSubmitted: true, notBroadcast: true,
    limitations: "No orderbook available",
    receiptHash: sha256(JSON.stringify({ actionId: action.actionId, status: "no_data" })),
  };
}
