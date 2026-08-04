import { Registry, createRuntime, type Address } from "@themoss/core";
import {
  createTraceSimulator,
  type TransactionSimulation,
  type Warning,
} from "@themoss/simulator";
import { decodeErrorResult, toHex } from "viem";
import { MarketLensPredictionMarketProtocol } from "./adapter.js";
import { PredictionMarketAbi } from "./abis/prediction-market.js";
import { verifyPredictionMarketReceipt } from "./receipt-verification.js";

export interface MossBatchProposal {
  proposal_id: string;
  actor_address: Address;
  capability: "buy_position" | "claim_reward";
  market_id: string;
  outcome: "YES" | "NO" | "NOT_APPLICABLE";
  requested_amount: string;
}

export interface MossBatchSimulation {
  engine: "@themoss/simulator";
  adapter: "@marketlens/moss-prediction-market";
  protocol: string;
  method: string;
  rpc_url: string;
  chain_id: number;
  trace_method: "debug_traceCall";
  trace_call_count: number;
  moss_trace_call_count: 1;
  block_number_before: string;
  block_number_after: string;
  state_unchanged: boolean;
  transaction: TransactionSimulation["transaction"];
  reverted: boolean;
  revert_reason?: string;
  raw_revert_evidence?: {
    block_number: string;
    type: string;
    from: Address;
    to: Address;
    input: `0x${string}`;
    output: `0x${string}`;
    error: string;
    decoded_error?: {
      name: string;
      args: string[];
    };
  };
  warnings: Warning[];
  receipt?: {
    protocol: string;
    text: string;
    outcome: Record<string, unknown>;
    change_count: number;
  };
  gas: string | null;
  unsigned: true;
  not_broadcast: true;
}

function capabilityMethod(capability: MossBatchProposal["capability"]): string {
  return capability === "buy_position" ? "buyPosition" : "claimReward";
}

function capabilityParams(proposal: MossBatchProposal): Record<string, string> {
  if (proposal.capability === "claim_reward") {
    return { marketId: proposal.market_id };
  }
  if (proposal.outcome === "NOT_APPLICABLE") {
    throw new Error(`${proposal.proposal_id}: buy_position requires YES or NO`);
  }
  return {
    marketId: proposal.market_id,
    outcome: proposal.outcome,
    paymentWei: proposal.requested_amount,
  };
}

export async function simulateMossProposal(
  proposal: MossBatchProposal,
  rpcUrl = "http://127.0.0.1:8546",
): Promise<MossBatchSimulation> {
  const runtime = await createRuntime({ rpcUrl });
  const registry = new Registry(runtime).use(MarketLensPredictionMarketProtocol);
  const method = capabilityMethod(proposal.capability);
  const capability = await registry.action(
    "marketlens",
    method,
    proposal.actor_address,
    capabilityParams(proposal),
  );
  if (capability.kind !== "capability") {
    throw new Error(`${proposal.proposal_id}: Moss returned a query instead of a Capability`);
  }

  const before = await runtime.client.getBlockNumber();
  const simulator = createTraceSimulator(runtime, {
    receipt: (node, changes) =>
      verifyPredictionMarketReceipt(node, registry.parseReceipt(node, changes)),
  });
  const outcome = await simulator.simulate(capability);
  const after = await runtime.client.getBlockNumber();
  const result = outcome.results[0];
  if (!result) {
    throw new Error(`${proposal.proposal_id}: Moss returned no transaction simulation`);
  }

  const receiptOutcome =
    result.receipt?.outcome && typeof result.receipt.outcome === "object"
      ? (result.receipt.outcome as Record<string, unknown>)
      : undefined;
  let rawRevertEvidence: MossBatchSimulation["raw_revert_evidence"];
  if (result.reverted) {
    const sender = result.transaction.from.toLowerCase() as Address;
    const frame = (await runtime.client.request({
      method: "debug_traceCall" as never,
      params: [
        { ...result.transaction, gas: toHex(10_000_000n) },
        toHex(before),
        {
          tracer: "callTracer",
          tracerConfig: { withLog: true },
          stateOverrides: {
            [sender]: { balance: toHex(10n ** 24n) },
          },
        },
      ] as never,
    })) as {
      type: string;
      from: Address;
      to: Address;
      input: `0x${string}`;
      output: `0x${string}`;
      error: string;
    };
    let decodedError: { name: string; args: string[] } | undefined;
    if (frame.output && frame.output !== "0x") {
      try {
        const decoded = decodeErrorResult({ abi: PredictionMarketAbi, data: frame.output });
        decodedError = {
          name: decoded.errorName,
          args: (decoded.args ?? []).map((value) => String(value)),
        };
      } catch {
        decodedError = undefined;
      }
    }
    rawRevertEvidence = {
      block_number: before.toString(),
      type: frame.type,
      from: frame.from,
      to: frame.to,
      input: frame.input,
      output: frame.output,
      error: frame.error,
      decoded_error: decodedError,
    };
  }

  return {
    engine: "@themoss/simulator",
    adapter: "@marketlens/moss-prediction-market",
    protocol: result.protocol,
    method: result.method,
    rpc_url: rpcUrl,
    chain_id: 143,
    trace_method: "debug_traceCall",
    trace_call_count: result.reverted ? 2 : 1,
    moss_trace_call_count: 1,
    block_number_before: before.toString(),
    block_number_after: after.toString(),
    state_unchanged: before === after,
    transaction: result.transaction,
    reverted: result.reverted,
    revert_reason: result.revertReason,
    raw_revert_evidence: rawRevertEvidence,
    warnings: [...result.warnings],
    receipt:
      result.receipt && receiptOutcome
        ? {
            protocol: result.receipt.protocol,
            text: result.receipt.text,
            outcome: receiptOutcome,
            change_count: result.changes?.length ?? 0,
          }
        : undefined,
    gas: result.gas,
    unsigned: true,
    not_broadcast: true,
  };
}
