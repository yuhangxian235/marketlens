// Uryzen Agent Integration — Types
// All data from RECON: docs/uryzen-monad-recon-report.md

import type { AgentProposal } from "@marketlens/batch-policy";
import { ethers } from "ethers";

// ============================================================
// Uryzen Market Data (from public API)
// ============================================================
export interface UryzenMarket {
  apiId: number;
  onChainEventId: number;
  title: string;
  category: string;
  totalPool: string;
  totalPoolWei: string;
  status: string;
  outcomes: UryzenOutcome[];
}

export interface UryzenOutcome {
  index: number;
  label: string;
}

// ============================================================
// Uryzen Contract Data (verified from RECON)
// ============================================================
export const URYZEN_BETTING_CORE = "0xdFBd38b6D5A233009b59Bb3b2831BC89663016C1" as const;
export const URYZEN_EVENT_STORAGE = "0x85786718E7dd37720447eD4b318BC01a06911e42" as const;
export const MONAD_TESTNET_CHAIN_ID = 10143;
export const MONAD_TESTNET_RPC = "https://testnet-rpc.monad.xyz";

// ============================================================
// Verified ABI Function Signatures (from RECON JS bundle)
// ============================================================
/** placeBet(uint256 eventId, uint8 predictionIndex, uint256 betAmount) payable */
export const PLACE_BET_SIGNATURE = "placeBet(uint256,uint8,uint256)";
/** placeBetsBatch(uint256[] eventIds, uint8[] predictionIndices, uint256[] betAmounts) payable */
export const PLACE_BETS_BATCH_SIGNATURE = "placeBetsBatch(uint256[],uint8[],uint256[])";

// Selectors computed from ethers.id() (true Keccak-256, not SHA3-256)
export const PLACE_BET_SELECTOR = ethers.id(PLACE_BET_SIGNATURE).slice(0, 10);
export const PLACE_BETS_BATCH_SELECTOR = ethers.id(PLACE_BETS_BATCH_SIGNATURE).slice(0, 10);

// ============================================================
// ABI Definitions (from RECON JS bundle)
// ============================================================
export const BETTING_CORE_ABI = [
  // placeBet
  {
    type: "function",
    name: "placeBet",
    inputs: [
      { name: "eventId", type: "uint256", internalType: "uint256" },
      { name: "predictionIndex", type: "uint8", internalType: "uint8" },
      { name: "betAmount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  // placeBetsBatch
  {
    type: "function",
    name: "placeBetsBatch",
    inputs: [
      { name: "eventIds", type: "uint256[]", internalType: "uint256[]" },
      { name: "predictionIndices", type: "uint8[]", internalType: "uint8[]" },
      { name: "betAmounts", type: "uint256[]", internalType: "uint256[]" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  // getEvent
  {
    type: "function",
    name: "getEvent",
    inputs: [{ name: "eventId", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "eventType", type: "uint8" },
      { name: "eventTime", type: "uint256" },
      { name: "participantA", type: "string" },
      { name: "participantB", type: "string" },
      { name: "totalPool", type: "uint256" },
      { name: "winnerPool", type: "uint256" },
      { name: "loserPool", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "result", type: "uint8" },
      { name: "riskLevel", type: "uint8" },
      { name: "claimDeadline", type: "uint256" },
      { name: "expiredProcessed", type: "bool" },
    ],
    stateMutability: "view",
  },
] as const;

// ============================================================
// Agent-Generated Bet Intent
// ============================================================
export interface UryzenBetIntent {
  agentRunId: string;
  onChainEventId: number;
  predictionIndex: number;
  outcomeLabel: string;
  /** Amount in MON as a decimal string (e.g., "0.3") */
  amountMon: string;
  /** Amount in wei (18 decimals) as string for bigint */
  amountWei: string;
  rationale: string;
  intentIndex: number;
  generatedAt: string;
}

// ============================================================
// Uryzen Transaction Request
// ============================================================
export interface UryzenTxRequest {
  chainId: number;
  to: string;
  data: string;       // ABI-encoded calldata
  value: string;       // wei as hex
  functionName: string;
}

// ============================================================
// Signing Gateway Decisions
// ============================================================
export interface SigningGatewayResult {
  signed: boolean;
  reason: string;
  signerCallCount: number;
  signedTx: string | null;     // signed raw tx hex or null
  planType: "ORIGINAL" | "SANITIZED";
}

// ============================================================
// Plan Tracking
// ============================================================
export interface ExecutionPlan {
  planType: "ORIGINAL" | "SANITIZED";
  planHash: string;
  betIntents: UryzenBetIntent[];
  betCount: number;
  totalMon: string;
}
