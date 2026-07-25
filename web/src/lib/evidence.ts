import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface EvidenceManifest {
  schemaVersion: number;
  analysisRunId: string;
  publishable: boolean;
  chainId: number;
  contractAddress: `0x${string}`;
  fromBlock: number;
  toBlock: number;
  windowStart: string;
  windowEnd: string;
  pipelineVersion: string;
  generatedAt: string;
  qualityChecks: Array<{
    name: string;
    status: "PASS" | "FAIL" | "WARN";
    sqlValue: string;
    pandasValue: string;
  }>;
}

export interface MarketSummary {
  marketId: string;
  question: string;
  questionHash: `0x${string}`;
  closesAt: string;
  creatorWallet: `0x${string}`;
  tradeCount: number;
  uniqueWallets: number;
  totalAmountMon: number;
  yesAmountGwei: number;
  noAmountGwei: number;
  firstTouchWallets: number;
  resolvedOutcome: "YES" | "NO" | null;
  refundMode: boolean | null;
}

export interface AnalyticsSummary {
  analysisRunId: string;
  allWallets: number;
  multiMarketWallets: number;
  multiMarketShare: number | null;
  returnedLaterWallets: number;
  d1EligibleWallets: number;
  d1ReturnedWallets: number;
  d1RepeatRate: number | null;
  semantics: {
    wallet: string;
    firstSeen: string;
    repeat: string;
  };
}

export interface MetricEvidence {
  metric_id: string;
  definition: string;
  numerator_definition: string;
  denominator_definition: string;
  sql_file: string;
  sample_size: number;
  sample_tx_hashes: string[];
  limitations: string;
}

export type EvidenceMap = Record<string, MetricEvidence>;


export interface DataProvenance {
  source: string; data_status: string; chain_id: number;
  rpc_external: boolean; fork_used: boolean; contract_address: string;
  block_from: number; block_to: number; block_count: number;
  generated_at_utc: string; raw_event_count: number;
  decoded_event_count: number; decode_error_count: number;
  action_status: string; moss_status: string; monad_status: string;
  wallet_count: number; market_count: number;
}

async function readData<T>(filename: string): Promise<T> {
  const path = join(process.cwd(), "public", "data", filename);
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export const getManifest = () => readData<EvidenceManifest>("manifest.json");
export const getMarkets = () => readData<MarketSummary[]>("markets.json");
export const getAnalytics = () => readData<AnalyticsSummary>("analytics.json");
export const getEvidence = () => readData<EvidenceMap>("evidence.json");
export const getProvenance = () => readData<DataProvenance>("provenance.json");

export function compactAddress(address: string): string {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export function percent(value: number | null): string {
  return value === null ? "N/A" : `${(value * 100).toFixed(1)}%`;
}

