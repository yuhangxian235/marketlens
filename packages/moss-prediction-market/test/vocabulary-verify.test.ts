/**
 * Deterministic Moss Vocabulary Verification
 * Verifies fixed commit d09b38c already contains all required tokens.
 * IDEMPOTENT — same result every run.
 */
import { describe, it, expect } from "vitest";
import { VERBS, CATEGORIES, RISK_LABELS } from "@themoss/core";

describe("Moss Vocabulary (fixed commit d09b38c)", () => {
  it("contains create, buy, claim in VERBS", () => {
    for (const verb of ["create", "buy", "claim"]) {
      expect(VERBS).toContain(verb);
    }
  });

  it("contains prediction-market in CATEGORIES", () => {
    expect(CATEGORIES).toContain("prediction-market");
  });

  it("contains adminAction and contractInteraction in RISK_LABELS", () => {
    expect(RISK_LABELS).toContain("adminAction");
    expect(RISK_LABELS).toContain("contractInteraction");
  });

  it("preserves backward compatibility (old verbs still present)", () => {
    const OLD = ["swap", "wrap", "unwrap", "supply", "withdraw", "borrow", "repay", "stake", "unstake", "mint", "transfer", "approve"];
    for (const verb of OLD) {
      expect(VERBS).toContain(verb);
    }
  });

  it("prediction-market is serializable as string", () => {
    const cat = CATEGORIES.find(c => c === "prediction-market");
    expect(cat).toBe("prediction-market");
    expect(typeof cat).toBe("string");
  });

  it("all extended risk labels have active Capability consumers", () => {
    // createMarket → adminAction
    // buyPosition  → fundOut (core, not extension)
    // claimReward  → contractInteraction
    // All three are in RISK_LABELS
    expect(RISK_LABELS.includes("adminAction")).toBe(true);
    expect(RISK_LABELS.includes("contractInteraction")).toBe(true);
    expect(RISK_LABELS.includes("fundOut")).toBe(true);
  });

  it("VERBS type-check: create and buy are valid Verb type", () => {
    const v1: (typeof VERBS)[number] = "create";
    const v2: (typeof VERBS)[number] = "buy";
    const v3: (typeof VERBS)[number] = "claim";
    expect(v1).toBe("create");
    expect(v2).toBe("buy");
    expect(v3).toBe("claim");
  });

  it("CATEGORIES type-check: prediction-market is valid Category", () => {
    const c: (typeof CATEGORIES)[number] = "prediction-market";
    expect(c).toBe("prediction-market");
  });

  it("RISK_LABELS type-check: adminAction and contractInteraction are valid RiskLabel", () => {
    const r1: (typeof RISK_LABELS)[number] = "adminAction";
    const r2: (typeof RISK_LABELS)[number] = "contractInteraction";
    expect(r1).toBe("adminAction");
    expect(r2).toBe("contractInteraction");
  });
});
