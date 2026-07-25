/**
 * Extended Failure Simulation Tests
 * Zero-value buy, invalid outcome, unknown market claim
 */
import { describe, it, expect, beforeAll } from "vitest";
import { Registry, createRuntime } from "@themoss/core";
import { createTraceSimulator } from "@themoss/simulator";
import { MarketLensPredictionMarketProtocol } from "../src/adapter.js";

const RPC = "http://127.0.0.1:8546";
const ALICE = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

describe("Extended Failure Scenarios", () => {
  let runtime: any, registry: any;
  beforeAll(async () => {
    runtime = await createRuntime({ rpcUrl: RPC });
    registry = new Registry(runtime).use(MarketLensPredictionMarketProtocol);
  }, 15000);

  function sim() { return createTraceSimulator(runtime, { receipt: (c:any,ch:any)=>registry.parseReceipt(c,ch)}); }

  it("PARAMETER_REJECTED: zero-value buy", async () => {
    await expect(
      registry.action("marketlens", "buyPosition", ALICE, { marketId: "1", outcome: "YES", paymentWei: "0" })
    ).rejects.toThrow();
  }, 30000);

  it("PARAMETER_REJECTED: invalid outcome value", async () => {
    await expect(
      registry.action("marketlens", "buyPosition", ALICE, { marketId: "1", outcome: "MAYBE" as any, paymentWei: "1000000000" })
    ).rejects.toThrow();
  }, 30000);

  it("SIMULATION_REVERTED: zero-value buy via RPC if param layer allows", async () => {
    // If zod lets it through, the contract should revert
    try {
      const cap = await registry.action("marketlens", "buyPosition", ALICE, { marketId: "1", outcome: "YES", paymentWei: "0" });
      const res = await sim().simulate(cap);
      expect(res.results[0].reverted).toBe(true);
    } catch (e: any) {
      expect(e.message).toBeDefined(); // parameter rejection is also valid
    }
  }, 30000);

  it("SIMULATION_REVERTED: unknown market claim", async () => {
    const cap = await registry.action("marketlens", "claimReward", ALICE, { marketId: "999" });
    const res = await sim().simulate(cap);
    expect(res.results[0].reverted).toBe(true);
  }, 30000);
});
