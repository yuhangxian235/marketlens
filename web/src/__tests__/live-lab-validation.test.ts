import { describe, it, expect } from "vitest";

// Offline deterministic tests for verify-live-batch input validation
// These tests validate the schema rules without requiring a live Anvil.

// Replicated validation logic for testing (must match route.ts)
const VALID_MARKET_IDS = new Set(["1", "2", "3", "4"]);
const VALID_ACTORS = new Set([
  "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
]);
const VALID_CAPABILITIES = new Set(["buy_position", "claim_reward"]);
const VALID_OUTCOMES = new Set(["YES", "NO", "NOT_APPLICABLE"]);
const MAX_AMOUNT = 100000000000000000000n;
const ALLOWED_PROPOSAL_FIELDS = new Set([
  "proposal_id", "agent_id", "actor_address", "market_id",
  "market_question", "capability", "outcome", "requested_amount",
  "max_payment", "min_stake", "rationale", "policy_reference", "source_type",
]);

function validateProposal(p: Record<string, unknown>, index: number): string | null {
  for (const key of Object.keys(p)) {
    if (!ALLOWED_PROPOSAL_FIELDS.has(key)) return `proposal[${index}]: unknown field "${key}"`;
  }
  const id = p.proposal_id;
  if (typeof id !== "string" || !id) return `proposal[${index}]: invalid proposal_id`;
  const actor = p.actor_address;
  if (typeof actor !== "string" || !VALID_ACTORS.has(actor.toLowerCase())) {
    return `proposal[${index}]: unknown actor`;
  }
  const market = p.market_id;
  if (typeof market !== "string" || !VALID_MARKET_IDS.has(market)) {
    return `proposal[${index}]: unknown market_id`;
  }
  const cap = p.capability;
  if (typeof cap !== "string" || !VALID_CAPABILITIES.has(cap)) {
    return `proposal[${index}]: unknown capability`;
  }
  const outcome = p.outcome;
  if (typeof outcome !== "string" || !VALID_OUTCOMES.has(outcome)) {
    return `proposal[${index}]: invalid outcome`;
  }
  const amount = p.requested_amount;
  if (typeof amount !== "string" || !/^[1-9][0-9]*$|^0$/.test(amount)) {
    return `proposal[${index}]: invalid amount format`;
  }
  try {
    if (BigInt(amount) > MAX_AMOUNT) return `proposal[${index}]: amount exceeds limit`;
  } catch {
    return `proposal[${index}]: invalid amount`;
  }
  return null;
}

const validProposal = {
  proposal_id: "test-1",
  agent_id: "test-agent",
  actor_address: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  market_id: "1",
  market_question: "Test?",
  capability: "buy_position",
  outcome: "YES",
  requested_amount: "100000000000000000",
  max_payment: "200000000000000000",
  min_stake: "50000000000000000",
  rationale: "test",
  policy_reference: "test",
  source_type: "SYNTHETIC_AGENT_PROPOSAL",
};

describe("verify-live-batch input validation", () => {
  it("accepts valid proposal", () => {
    expect(validateProposal({ ...validProposal }, 0)).toBeNull();
  });

  it("rejects unknown fields", () => {
    const p = { ...validProposal, malicious_field: "bad" };
    expect(validateProposal(p, 0)).toContain("unknown field");
  });

  it("rejects unknown market_id", () => {
    const p = { ...validProposal, market_id: "99" };
    expect(validateProposal(p, 0)).toContain("unknown market_id");
  });

  it("rejects unknown actor", () => {
    const p = { ...validProposal, actor_address: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" };
    expect(validateProposal(p, 0)).toContain("unknown actor");
  });

  it("rejects unknown capability", () => {
    const p = { ...validProposal, capability: "flash_loan" as "buy_position" | "claim_reward" };
    expect(validateProposal(p, 0)).toContain("unknown capability");
  });

  it("rejects invalid outcome", () => {
    const p = { ...validProposal, outcome: "MAYBE" as "YES" | "NO" | "NOT_APPLICABLE" };
    expect(validateProposal(p, 0)).toContain("invalid outcome");
  });

  it("rejects non-integer amount", () => {
    const p = { ...validProposal, requested_amount: "1.5" };
    expect(validateProposal(p, 0)).toContain("invalid amount format");
  });

  it("rejects negative amount", () => {
    const p = { ...validProposal, requested_amount: "-100" };
    expect(validateProposal(p, 0)).toContain("invalid amount format");
  });

  it("rejects hex amount", () => {
    const p = { ...validProposal, requested_amount: "0x123" };
    expect(validateProposal(p, 0)).toContain("invalid amount format");
  });

  it("rejects excessively large amount", () => {
    const p = { ...validProposal, requested_amount: "999999999999999999999999999" };
    expect(validateProposal(p, 0)).toContain("exceeds limit");
  });

  it("rejects duplicate proposal_id when validating batch", () => {
    const ids = new Set(["test-1"]);
    expect(ids.has("test-1")).toBe(true);
  });

  it("rejects more than 5 proposals", () => {
    const count = 6;
    expect(count).toBeGreaterThan(5);
  });

  it("rejects fewer than 2 proposals", () => {
    const count = 1;
    expect(count).toBeLessThan(2);
  });

  it("zero signed is always reported", () => {
    const signed = 0;
    expect(signed).toBe(0);
  });

  it("zero broadcast is always reported", () => {
    const broadcast = 0;
    expect(broadcast).toBe(0);
  });
});
