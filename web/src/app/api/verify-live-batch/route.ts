import { NextResponse } from "next/server";
import {
  verifyBatch,
  createUnsignedAllowlist,
  type AgentProposal,
  type BatchPolicy,
} from "@marketlens/batch-policy";

// ─── Fixture allowlists ───
const VALID_MARKET_IDS = new Set(["1", "2", "3", "4"]);
const VALID_ACTORS = new Set([
  "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
]);
const VALID_CAPABILITIES = new Set(["buy_position", "claim_reward"]);
const VALID_OUTCOMES = new Set(["YES", "NO", "NOT_APPLICABLE"]);
const MAX_AMOUNT = 100000000000000000000n; // 100 MON
const MAX_BODY_BYTES = 32768;
const MAX_CONCURRENT = 2;

const ALLOWED_PROPOSAL_FIELDS = new Set([
  "proposal_id", "agent_id", "actor_address", "market_id",
  "market_question", "capability", "outcome", "requested_amount",
  "max_payment", "min_stake", "rationale", "policy_reference", "source_type",
]);

const NO_STORE = { "Cache-Control": "no-store" };

interface LiveBatchRequest {
  proposals: Record<string, unknown>[];
  policy: {
    max_payment_per_action: string;
    max_total_payment: string;
    block_conflicting_outcomes_same_market: boolean;
  };
}

function validateProposal(raw: unknown, index: number): string | null {
  if (!raw || typeof raw !== "object") return `proposal[${index}]: not an object`;
  const p = raw as Record<string, unknown>;
  if ("__proto__" in p || "constructor" in p || "prototype" in p) {
    return `proposal[${index}]: rejected prototype pollution key`;
  }
  for (const key of Object.keys(p)) {
    if (!ALLOWED_PROPOSAL_FIELDS.has(key)) {
      return `proposal[${index}]: unknown field "${key}"`;
    }
  }
  const id = p["proposal_id"] as string;
  if (typeof id !== "string" || !id) return `proposal[${index}]: invalid proposal_id`;
  const actor = p["actor_address"] as string;
  if (typeof actor !== "string" || !VALID_ACTORS.has(actor.toLowerCase())) {
    return `proposal[${index}]: unknown actor`;
  }
  const market = p["market_id"] as string;
  if (typeof market !== "string" || !VALID_MARKET_IDS.has(market)) {
    return `proposal[${index}]: unknown market_id`;
  }
  const cap = p["capability"] as string;
  if (typeof cap !== "string" || !VALID_CAPABILITIES.has(cap)) {
    return `proposal[${index}]: unknown capability`;
  }
  const outcome = p["outcome"] as string;
  if (typeof outcome !== "string" || !VALID_OUTCOMES.has(outcome)) {
    return `proposal[${index}]: invalid outcome`;
  }
  const amount = p["requested_amount"] as string;
  if (typeof amount !== "string" || !/^[1-9][0-9]*$|^0$/.test(amount)) {
    return `proposal[${index}]: amount must be base-10 unsigned integer string`;
  }
  try {
    if (BigInt(amount) > MAX_AMOUNT) return `proposal[${index}]: amount exceeds limit`;
  } catch {
    return `proposal[${index}]: invalid amount`;
  }
  (p as Record<string, string>)["source_type"] = "SYNTHETIC_AGENT_PROPOSAL";
  return null;
}

function validatePolicy(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return "policy: not an object";
  const p = raw as Record<string, unknown>;
  if ("__proto__" in p || "constructor" in p || "prototype" in p) {
    return "policy: rejected prototype pollution key";
  }
  const allowed = ["max_payment_per_action", "max_total_payment", "block_conflicting_outcomes_same_market"];
  for (const k of allowed) {
    if (!(k in p)) return `policy: missing "${k}"`;
  }
  for (const k of Object.keys(p)) {
    if (!allowed.includes(k)) return `policy: unknown field "${k}"`;
  }
  if (!/^[1-9][0-9]*$|^0$/.test(String(p["max_payment_per_action"]))) {
    return "policy: max_payment_per_action must be base-10 unsigned integer string";
  }
  if (!/^[1-9][0-9]*$|^0$/.test(String(p["max_total_payment"]))) {
    return "policy: max_total_payment must be base-10 unsigned integer string";
  }
  if (typeof p["block_conflicting_outcomes_same_market"] !== "boolean") {
    return "policy: block_conflicting_outcomes_same_market must be boolean";
  }
  return null;
}

function buildPolicy(input: LiveBatchRequest["policy"]): BatchPolicy {
  return {
    policy_id: `live-policy-${Date.now()}`,
    max_actions: 5,
    max_payment_per_action: input.max_payment_per_action,
    max_payment_per_market: input.max_payment_per_action,
    max_total_payment: input.max_total_payment,
    allowed_capabilities: ["buy_position", "claim_reward"],
    allowed_outcomes: ["YES", "NO", "NOT_APPLICABLE"],
    block_conflicting_outcomes_same_market: input.block_conflicting_outcomes_same_market,
    require_simulation_success: true,
    require_receipt: true,
    require_intent_match: true,
    fail_closed_on_missing_data: true,
    execution_mode: "ALLOW_ELIGIBLE_ONLY" as const,
  };
}

async function checkAnvil(rpcUrl: string): Promise<boolean> {
  try {
    const r = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      signal: AbortSignal.timeout(3000),
    });
    const data = await r.json();
    return !!(data?.result);
  } catch {
    return false;
  }
}

// ─── Concurrency guard ───
let activeVerifications = 0;

async function guardedVerify(
  proposals: AgentProposal[],
  policy: BatchPolicy,
  rpcUrl: string,
  generatedAt: string
) {
  if (activeVerifications >= MAX_CONCURRENT) {
    throw new Error("CONCURRENCY_LIMIT");
  }
  activeVerifications++;
  try {
    const receipt = await verifyBatch(proposals, policy, { rpcUrl, generatedAt });
    return receipt;
  } finally {
    activeVerifications--;
  }
}

// ─── Route handler ───
export async function POST(request: Request) {
  // Content-Type
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { error: "Content-Type must be application/json" },
      { status: 415, headers: NO_STORE }
    );
  }

  // Body size
  const cl = parseInt(request.headers.get("content-length") ?? "0", 10);
  if (cl > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413, headers: NO_STORE });
  }

  // Concurrency
  if (activeVerifications >= MAX_CONCURRENT) {
    return NextResponse.json(
      { error: "Too many concurrent live verifications" },
      { status: 429, headers: { ...NO_STORE, "Retry-After": "5" } }
    );
  }

  // Parse
  let input: LiveBatchRequest;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE });
  }

  // Validate proposals
  if (!Array.isArray(input.proposals)) {
    return NextResponse.json({ error: "proposals must be an array" }, { status: 400, headers: NO_STORE });
  }
  if (input.proposals.length < 2 || input.proposals.length > 5) {
    return NextResponse.json({ error: "proposals must contain 2-5 items" }, { status: 400, headers: NO_STORE });
  }

  const seenIds = new Set<string>();
  for (let i = 0; i < input.proposals.length; i++) {
    const err = validateProposal(input.proposals[i], i);
    if (err) return NextResponse.json({ error: err }, { status: 400, headers: NO_STORE });
    const id = (input.proposals[i] as Record<string, unknown>)["proposal_id"] as string;
    if (seenIds.has(id)) {
      return NextResponse.json({ error: `duplicate proposal_id: "${id}"` }, { status: 400, headers: NO_STORE });
    }
    seenIds.add(id);
  }

  // Validate policy
  if (!input.policy || typeof input.policy !== "object") {
    return NextResponse.json({ error: "policy is required" }, { status: 400, headers: NO_STORE });
  }
  const policyErr = validatePolicy(input.policy as unknown);
  if (policyErr) return NextResponse.json({ error: policyErr }, { status: 400, headers: NO_STORE });

  // Check Anvil
  const rpcUrl = process.env.MARKETLENS_ANVIL_RPC ?? "http://127.0.0.1:8546";
  const anvilAlive = await checkAnvil(rpcUrl);
  if (!anvilAlive) {
    return NextResponse.json(
      { error: "Live local fixture unavailable", rpc_url: rpcUrl },
      { status: 503, headers: NO_STORE }
    );
  }

  // Build policy and run
  const policy = buildPolicy(input.policy);
  const generatedAt = new Date().toISOString();

  try {
    const receipt = await guardedVerify(
      input.proposals as unknown as AgentProposal[],
      policy,
      rpcUrl,
      generatedAt
    );

    const allowlist = createUnsignedAllowlist(receipt, policy);

    return NextResponse.json({
      proposals: input.proposals,
      policy,
      receipt,
      allowlist,
      generated_at: generatedAt,
      evidence_mode: "FRESH_LOCAL_ANVIL",
      rpc_url: rpcUrl,
      unsigned: true,
      not_broadcast: true,
      not_deployed_on_monad: true,
    }, { headers: NO_STORE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "CONCURRENCY_LIMIT") {
      return NextResponse.json(
        { error: "Too many concurrent live verifications" },
        { status: 429, headers: { ...NO_STORE, "Retry-After": "5" } }
      );
    }
    return NextResponse.json(
      { error: "Live verification failed", detail: process.env.NODE_ENV === "development" ? message : undefined },
      { status: 502, headers: NO_STORE }
    );
  }
}
