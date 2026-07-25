import type {
  EmittedEvent,
  MarketLensSimulationEnvelope,
  NativeTransfer,
  PreparedAction,
} from "./types.js";

export function createMockEnvelope(
  action: PreparedAction,
): MarketLensSimulationEnvelope {
  const nativeTransfers: NativeTransfer[] = [];
  const emittedEvents: EmittedEvent[] = [];
  if (action.operation === "buy_position") {
    const paymentWei = action.intent.paymentWei ?? "0";
    nativeTransfers.push({
      from: action.unsignedTransaction.from,
      to: action.unsignedTransaction.to,
      valueWei: paymentWei,
      provenance: "mock-fixture",
    });
    emittedEvents.push({
      eventName: "PositionBought",
      args: {
        marketId: action.intent.marketId ?? "",
        wallet: action.intent.sender,
        outcome: action.intent.outcome ?? "",
        amount: paymentWei,
        positionUnits: paymentWei,
      },
      provenance: "mock-fixture",
    });
  } else if (action.operation === "create_market") {
    emittedEvents.push({
      eventName: "MarketCreated",
      args: {
        creator: action.intent.sender,
        question: action.intent.question ?? "",
        closesAt: action.intent.closesAt ?? "",
      },
      provenance: "mock-fixture",
    });
  } else {
    emittedEvents.push({
      eventName: "RewardClaimed",
      args: {
        marketId: action.intent.marketId ?? "",
        wallet: action.intent.sender,
      },
      provenance: "mock-fixture",
    });
  }

  return {
    schemaVersion: 1,
    verificationMode: "mock",
    operation: action.operation,
    unsignedTransaction: action.unsignedTransaction,
    decodedCall: action.decodedCall,
    ...(action.intent.marketId === undefined
      ? {}
      : { marketId: action.intent.marketId }),
    ...(action.intent.question === undefined
      ? {}
      : {
          marketQuestion: {
            value: action.intent.question,
            source: "action-input" as const,
          },
        }),
    ...(action.intent.outcome === undefined
      ? {}
      : { selectedOutcome: action.intent.outcome }),
    sender: action.intent.sender,
    ...(action.intent.paymentWei === undefined
      ? {}
      : {
          expectedPaymentWei: action.intent.paymentWei,
          expectedPositionUnits: action.intent.paymentWei,
        }),
    nativeTransfers,
    emittedEvents,
    simulationSuccess: true,
    warnings: [
      {
        code: "MOCK_ONLY",
        message:
          "Deterministic preview only; no debug_traceCall, Moss Receipt, or pinned simulation block exists.",
      },
    ],
  };
}

