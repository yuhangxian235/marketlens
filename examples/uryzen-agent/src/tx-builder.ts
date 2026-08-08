// Uryzen Transaction Builder
//
// Builds REAL Uryzen-compatible Monad Testnet transaction requests.
// Uses verified ABI and selectors from RECON.
// NO broadcast capability — build only.

import { ethers } from "ethers";
import type { UryzenBetIntent, UryzenTxRequest } from "./types.js";
import {
  URYZEN_BETTING_CORE,
  MONAD_TESTNET_CHAIN_ID,
  PLACE_BET_SELECTOR,
  PLACE_BETS_BATCH_SELECTOR,
  PLACE_BETS_BATCH_SIGNATURE,
  PLACE_BET_SIGNATURE,
} from "./types.js";

const iface = new ethers.Interface([
  `function ${PLACE_BET_SIGNATURE}`,
  `function ${PLACE_BETS_BATCH_SIGNATURE}`,
]);

/**
 * Build a single-bet Uryzen transaction.
 * Uses the REAL ABI and REAL contract address.
 */
export function buildPlaceBetTx(intent: UryzenBetIntent): UryzenTxRequest {
  const data = iface.encodeFunctionData("placeBet", [
    intent.onChainEventId,
    intent.predictionIndex,
    intent.amountWei,
  ]);

  // Verify selector
  if (!data.startsWith(PLACE_BET_SELECTOR)) {
    throw new Error(
      `Selector mismatch: expected ${PLACE_BET_SELECTOR}, got ${data.slice(0, 10)}`
    );
  }

  return {
    chainId: MONAD_TESTNET_CHAIN_ID,
    to: URYZEN_BETTING_CORE,
    data,
    value: ethers.toBeHex(intent.amountWei),
    functionName: "placeBet",
  };
}

/**
 * Build a multi-bet Uryzen placeBetsBatch transaction.
 * Uses the REAL ABI and REAL contract address.
 *
 * This is the KEY function — it encodes multiple bets into ONE transaction.
 */
export function buildPlaceBetsBatchTx(intents: UryzenBetIntent[]): UryzenTxRequest {
  if (intents.length === 0) {
    throw new Error("Cannot build empty batch");
  }

  const eventIds = intents.map((i) => i.onChainEventId);
  const predictionIndices = intents.map((i) => i.predictionIndex);
  const betAmounts = intents.map((i) => i.amountWei);

  const data = iface.encodeFunctionData("placeBetsBatch", [
    eventIds,
    predictionIndices,
    betAmounts,
  ]);

  // Verify selector
  if (!data.startsWith(PLACE_BETS_BATCH_SELECTOR)) {
    throw new Error(
      `Selector mismatch: expected ${PLACE_BETS_BATCH_SELECTOR}, got ${data.slice(0, 10)}`
    );
  }

  // Total value = sum of all bet amounts
  const totalValue = intents.reduce(
    (sum, i) => sum + BigInt(i.amountWei),
    BigInt(0)
  );

  return {
    chainId: MONAD_TESTNET_CHAIN_ID,
    to: URYZEN_BETTING_CORE,
    data,
    value: ethers.toBeHex(totalValue),
    functionName: "placeBetsBatch",
  };
}

/**
 * Decode calldata to verify it contains (or excludes) specific intents.
 * Used for test invariant: signed tx must NOT contain ineligible bets.
 */
export function decodePlaceBetsBatchCalldata(
  data: string,
): { eventIds: number[]; predictionIndices: number[]; betAmounts: string[] } {
  const decoded = iface.decodeFunctionData("placeBetsBatch", data);
  return {
    eventIds: decoded[0].map((v: bigint) => Number(v)),
    predictionIndices: decoded[1].map((v: number) => Number(v)),
    betAmounts: decoded[2].map((v: bigint) => v.toString()),
  };
}

/**
 * Verify that calldata starts with the expected selector.
 */
export function verifySelector(data: string, expectedSelector: string): boolean {
  return data.toLowerCase().startsWith(expectedSelector.toLowerCase());
}
