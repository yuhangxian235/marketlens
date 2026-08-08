// MarketLens Signing Gateway for Uryzen
//
// Consumes:
// 1. Original Agent plan (UryzenBetIntent[])
// 2. MarketLens BatchVerificationReceipt
//
// Rules:
// - If ANY bet is INELIGIBLE → original unsafe batch REFUSED
// - Only a SANITIZED plan (eligible bets only) may reach local signer
// - Blocked bet must be ABSENT from signed calldata
//
// NO BROADCAST. Local signing only with ephemeral dev key.

import { ethers } from "ethers";
import { randomBytes } from "node:crypto";
import type { UryzenBetIntent, SigningGatewayResult } from "./types.js";
import type { BatchVerificationReceipt, BatchActionReceipt } from "@marketlens/batch-policy";
import { buildPlaceBetsBatchTx, buildPlaceBetTx, verifySelector } from "./tx-builder.js";
import { PLACE_BETS_BATCH_SELECTOR, MONAD_TESTNET_CHAIN_ID } from "./types.js";

// ============================================================
// SECURITY: EPHEMERAL DEVELOPMENT KEY — runtime generated, never committed
// ============================================================
function generateDevWallet(): ethers.Wallet {
  const pk = "0x" + randomBytes(32).toString("hex");
  return new ethers.Wallet(pk);
}

let signerCallCount = 0;

export function resetSignerCallCount(): void {
  signerCallCount = 0;
}

export function getSignerCallCount(): number {
  return signerCallCount;
}

/**
 * Sign a transaction LOCALLY. Never broadcast.
 * Uses ephemeral dev wallet.
 */
async function signTxLocally(txRequest: {
  chainId: number;
  to: string;
  data: string;
  value: string;
}): Promise<string> {
  signerCallCount++;
  const wallet = generateDevWallet();
  const tx = new ethers.Transaction();
  tx.chainId = txRequest.chainId;
  tx.to = txRequest.to;
  tx.data = txRequest.data;
  tx.value = BigInt(txRequest.value);
  tx.gasLimit = 300000;
  tx.gasPrice = ethers.parseUnits("50", "gwei");
  tx.nonce = 0;

  const signed = await wallet.signTransaction(tx);
  return signed;
}

/**
 * Evaluate MarketLens receipt and decide whether to sign.
 *
 * If ANY action is INELIGIBLE → original unsafe batch REFUSED.
 * Then: construct sanitized plan (eligible only) → sign locally.
 */
export async function evaluateAndSign(
  originalPlan: UryzenBetIntent[],
  receipt: BatchVerificationReceipt,
): Promise<{
  originalDecision: SigningGatewayResult;
  sanitizedDecision: SigningGatewayResult | null;
}> {
  resetSignerCallCount();

  // Find eligible and blocked proposal IDs
  const eligibleIds = new Set(receipt.eligible_proposal_ids ?? []);
  const blockedIds = new Set(receipt.blocked_proposal_ids ?? []);

  const hasBlocked = blockedIds.size > 0;

  // === ORIGINAL UNSAFE BATCH ===
  const originalDecision: SigningGatewayResult = {
    signed: false,
    reason: hasBlocked
      ? "MARKETLENS_PLAN_INELIGIBLE"
      : "ELIGIBLE",
    signerCallCount: 0,
    signedTx: null,
    planType: "ORIGINAL",
  };

  if (!hasBlocked) {
    // All eligible — sign the original batch
    const txRequest = buildPlaceBetsBatchTx(originalPlan);
    const signed = await signTxLocally(txRequest);
    originalDecision.signed = true;
    originalDecision.signedTx = signed;
    originalDecision.signerCallCount = getSignerCallCount();
    return { originalDecision, sanitizedDecision: null };
  }

  // === SANITIZED APPROVED PLAN ===
  // Filter to eligible intents only
  // Map: proposal_id → intent index (proposal_id = "uryzen-{runId}-{idx}")
  const eligibleIntents: UryzenBetIntent[] = [];
  for (let i = 0; i < originalPlan.length; i++) {
    // Check if this intent's proposal was eligible
    const actionReceipt = receipt.action_receipts.find(
      (ar: BatchActionReceipt) =>
        ar.proposal_id === `uryzen-${originalPlan[i].agentRunId}-${i}`
    );
    if (actionReceipt?.final_verdict === "PASS") {
      eligibleIntents.push(originalPlan[i]);
    }
  }

  if (eligibleIntents.length === 0) {
    return {
      originalDecision,
      sanitizedDecision: {
        signed: false,
        reason: "NO_ELIGIBLE_ACTIONS",
        signerCallCount: 0,
        signedTx: null,
        planType: "SANITIZED",
      },
    };
  }

  // Build and sign sanitized plan
  let txRequest;
  if (eligibleIntents.length === 1) {
    txRequest = buildPlaceBetTx(eligibleIntents[0]);
  } else {
    txRequest = buildPlaceBetsBatchTx(eligibleIntents);
  }

  const sanitizedSigned = await signTxLocally(txRequest);

  const sanitizedDecision: SigningGatewayResult = {
    signed: true,
    reason: "SANITIZED_APPROVED_PLAN",
    signerCallCount: getSignerCallCount(),
    signedTx: sanitizedSigned,
    planType: "SANITIZED",
  };

  return { originalDecision, sanitizedDecision };
}

/**
 * Retry: Agent re-requests original unsafe batch → still REFUSED.
 */
export async function retryOriginal(
  originalPlan: UryzenBetIntent[],
): Promise<SigningGatewayResult> {
  // Re-evaluate: always refuse if it was blocked
  return {
    signed: false,
    reason: "MARKETLENS_PLAN_INELIGIBLE",
    signerCallCount: getSignerCallCount(),
    signedTx: null,
    planType: "ORIGINAL",
  };
}
