"use client";

import {
  MockPredictionMarketActionAdapter,
  checkConstraints,
  type Address,
  type Outcome,
} from "@marketlens/prediction-market-actions";
import { parseEther } from "viem";

export interface BuyPreviewInput {
  contractAddress: Address;
  sender: Address;
  marketId: string;
  outcome: Outcome;
  paymentMon: string;
  maximumPaymentMon: string;
}

export async function previewBuy(input: BuyPreviewInput) {
  const paymentWei = parseEther(input.paymentMon);
  const adapter = new MockPredictionMarketActionAdapter({
    chainId: 143,
    contractAddress: input.contractAddress,
  });
  const action = await adapter.buyPosition({
    sender: input.sender,
    marketId: BigInt(input.marketId),
    outcome: input.outcome,
    paymentWei,
  });
  const receipt = await adapter.simulate(action);
  const constraints = checkConstraints(
    {
      sender: input.sender,
      requiredOutcome: input.outcome,
      maxPaymentWei: parseEther(input.maximumPaymentMon),
      minPositionUnits: paymentWei,
    },
    receipt,
  );
  return { action, receipt, constraints };
}

