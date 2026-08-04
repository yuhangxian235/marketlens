// Generate PolymarketShadowActionReceipt
import type { CandidateAction } from "../models/candidate-action";
import type { OrderbookSnapshot } from "../models/orderbook";
import type { ActionReceipt, ActionCheckResult } from "../models/receipt";
import { sha256 } from "../snapshot/hash";

export function generateActionReceipt(
  action: CandidateAction,
  book: OrderbookSnapshot,
  replay: { filled: boolean; filledSize: string; filledPrice: string; totalCost: string; partialFill: boolean; remainingSize: string; worstPrice: string; levelsConsumed: number },
  checks: ActionCheckResult[],
  snapshotCapturedAt: string
): ActionReceipt {
  const allPassed = checks.every(c => c.status === "PASS" || c.status === "REVIEW" || c.status === "NOT_APPLICABLE");
  const anyReview = checks.some(c => c.status === "REVIEW");
  const anyBlocked = checks.some(c => c.status === "BLOCKED");

  const verdict: "PASS"|"BLOCKED"|"REVIEW" = anyBlocked ? "BLOCKED" : anyReview ? "REVIEW" : "PASS";

  const receipt: ActionReceipt = {
    receiptVersion: "1.0",
    actionId: action.actionId,
    sourceAgent: action.sourceAgent,
    simulationType: "POLYMARKET_ORDERBOOK_SHADOW",
    generatedAt: new Date().toISOString(),
    marketSnapshot: {
      marketId: action.marketId,
      question: action.rationale || "Market question not cached",
      conditionId: action.conditionId,
      capturedAt: snapshotCapturedAt,
      source: "polymarket_public_gamma",
    },
    orderbookSnapshotHash: book.bookHash,
    bookTimestamp: book.timestamp,
    market: action.rationale || "Unknown",
    outcome: action.outcome,
    side: action.side,
    orderType: action.orderType,
    requested: {
      side: action.side,
      limitPrice: action.limitPrice,
      size: action.buyBudget || action.sellShares || "0",
      orderType: action.orderType,
    },
    estimatedFill: {
      filled: replay.filled,
      filledSize: replay.filledSize,
      filledPrice: replay.filledPrice,
      remainingSize: replay.remainingSize,
      partialFill: replay.partialFill,
    },
    levelsConsumed: replay.levelsConsumed,
    immediateFill: {
      filled: replay.filled,
      filledSize: replay.filledSize,
      filledPrice: replay.filledPrice,
      remainingSize: replay.remainingSize,
      partialFill: replay.partialFill,
    },
    restingRemainder: action.orderType === "GTC" && replay.partialFill
      ? { filled: false, filledSize: "0", filledPrice: "0", remainingSize: replay.remainingSize, partialFill: false }
      : null,
    averagePrice: replay.filledPrice,
    worstPrice: replay.worstPrice,
    collateralSpent: action.side === "BUY" ? replay.totalCost : "0",
    collateralReceived: action.side === "SELL" ? replay.totalCost : "0",
    sharesBought: action.side === "BUY" ? replay.filledSize : "0",
    sharesSold: action.side === "SELL" ? replay.filledSize : "0",
    slippageBps: 0, // computed during replay
    partialFill: replay.partialFill,
    actionChecks: checks,
    actionVerdict: verdict,
    verdictReason: verdict === "PASS" ? "All checks passed"
      : verdict === "REVIEW" ? "Some checks require review"
      : checks.filter(c => c.status === "BLOCKED").map(c => c.reason).join("; "),
    unsigned: true,
    notSubmitted: true,
    notBroadcast: true,
    limitations: "Estimated from public orderbook snapshot. Not accepted by Polymarket. Not signed. Not submitted. Future fills not guaranteed.",
    receiptHash: "",
  };

  receipt.receiptHash = sha256(JSON.stringify(receipt));
  return receipt;
}
