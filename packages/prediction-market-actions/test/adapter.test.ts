import { decodeFunctionData } from "viem";
import { describe, expect, it } from "vitest";

import { predictionMarketAbi } from "../../../artifacts/abi/PredictionMarket.js";
import {
  MockPredictionMarketActionAdapter,
  MossIntegrationUnavailableError,
  MossPredictionMarketActionAdapter,
  checkConstraints,
} from "../src/index.js";

const sender = "0x1111111111111111111111111111111111111111";
const contract = "0x2222222222222222222222222222222222222222";

describe("PredictionMarketActionAdapter", () => {
  it("prepares buy calldata and value without a signer", async () => {
    const adapter = new MockPredictionMarketActionAdapter({
      chainId: 143,
      contractAddress: contract,
    });

    const action = await adapter.buyPosition({
      sender,
      marketId: 7n,
      outcome: "YES",
      paymentWei: 2_000_000_000n,
    });

    expect(action.unsignedTransaction).toMatchObject({
      from: sender,
      to: contract,
      value: "2000000000",
      chainId: 143,
    });
    expect(
      decodeFunctionData({
        abi: predictionMarketAbi,
        data: action.unsignedTransaction.data,
      }),
    ).toEqual({
      functionName: "buyPosition",
      args: [7n, 1],
    });
  });

  it("checks values and keeps MOCK visibly non-verifiable", async () => {
    const adapter = new MockPredictionMarketActionAdapter({
      chainId: 143,
      contractAddress: contract,
    });
    const action = await adapter.buyPosition({
      sender,
      marketId: 7n,
      outcome: "YES",
      paymentWei: 2_000_000_000n,
    });
    const receipt = await adapter.simulate(action);

    const result = checkConstraints(
      {
        sender,
        requiredOutcome: "YES",
        maxPaymentWei: 3_000_000_000n,
        minPositionUnits: 2_000_000_000n,
      },
      receipt,
    );

    expect(result.checks.find((check) => check.id === "payment-limit")?.passed).toBe(
      true,
    );
    expect(result.checks.find((check) => check.id === "zero-warnings")?.passed).toBe(
      false,
    );
    expect(result.passed).toBe(false);
    expect(receipt.verificationMode).toBe("mock");
  });

  it("fails closed when source-pinned Moss prerequisites are incomplete", async () => {
    const adapter = new MossPredictionMarketActionAdapter();

    await expect(
      adapter.buyPosition({
        sender,
        marketId: 1n,
        outcome: "NO",
        paymentWei: 1_000_000_000n,
      }),
    ).rejects.toBeInstanceOf(MossIntegrationUnavailableError);
  });

  it("rejects payments that are not aligned to one gwei", async () => {
    const adapter = new MockPredictionMarketActionAdapter({
      chainId: 143,
      contractAddress: contract,
    });

    await expect(
      adapter.buyPosition({
        sender,
        marketId: 1n,
        outcome: "NO",
        paymentWei: 1_000_000_001n,
      }),
    ).rejects.toThrow("1 gwei");
  });

  it("checks the payment cap against unsigned transaction value", async () => {
    const adapter = new MockPredictionMarketActionAdapter({
      chainId: 143,
      contractAddress: contract,
    });
    const action = await adapter.buyPosition({
      sender,
      marketId: 7n,
      outcome: "YES",
      paymentWei: 4_000_000_000n,
    });
    const original = await adapter.simulate(action);
    const receipt = {
      ...original,
      expectedPaymentWei: "1000000000",
      expectedPositionUnits: "1000000000",
      emittedEvents: original.emittedEvents.map((event) => ({
        ...event,
        args: {
          ...event.args,
          amount: "1000000000",
          positionUnits: "1000000000",
        },
      })),
    };

    const result = checkConstraints(
      {
        sender,
        requiredOutcome: "YES",
        maxPaymentWei: 3_000_000_000n,
        minPositionUnits: 1_000_000_000n,
      },
      receipt,
    );

    expect(result.checks.find((check) => check.id === "payment-limit")?.passed).toBe(
      false,
    );
    expect(
      result.checks.find((check) => check.id === "payment-consistency")?.passed,
    ).toBe(false);
  });

  it("rejects envelope identity fields that disagree with the transaction", async () => {
    const adapter = new MockPredictionMarketActionAdapter({
      chainId: 143,
      contractAddress: contract,
    });
    const action = await adapter.buyPosition({
      sender,
      marketId: 7n,
      outcome: "NO",
      paymentWei: 2_000_000_000n,
    });
    const original = await adapter.simulate(action);
    const receipt = {
      ...original,
      unsignedTransaction: {
        ...original.unsignedTransaction,
        from: "0x3333333333333333333333333333333333333333" as const,
      },
      emittedEvents: original.emittedEvents.map((event) => ({
        ...event,
        args: {
          ...event.args,
          marketId: "8",
          wallet: "0x4444444444444444444444444444444444444444",
        },
      })),
    };

    const result = checkConstraints(
      {
        sender,
        requiredOutcome: "NO",
        maxPaymentWei: 2_000_000_000n,
        minPositionUnits: 2_000_000_000n,
      },
      receipt,
    );

    expect(
      result.checks.find((check) => check.id === "transaction-sender")?.passed,
    ).toBe(false);
    expect(result.checks.find((check) => check.id === "event-agreement")?.passed).toBe(
      false,
    );
  });
});
