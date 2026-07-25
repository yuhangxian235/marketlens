export type Address = `0x${string}`;
export type Hex = `0x${string}`;
export type Outcome = "YES" | "NO";
export type Operation = "create_market" | "buy_position" | "claim_reward";
export type VerificationMode = "mock" | "moss-source-pinned";

export interface CreateMarketInput {
  sender: Address;
  question: string;
  closesAt: bigint;
}

export interface BuyPositionInput {
  sender: Address;
  marketId: bigint;
  outcome: Outcome;
  paymentWei: bigint;
}

export interface ClaimRewardInput {
  sender: Address;
  marketId: bigint;
}

export interface UnsignedTransaction {
  from: Address;
  to: Address;
  data: Hex;
  value: string;
  chainId: number;
}

export interface PreparedAction {
  schemaVersion: 1;
  verificationMode: VerificationMode;
  operation: Operation;
  unsignedTransaction: UnsignedTransaction;
  decodedCall: {
    functionName: string;
    args: readonly unknown[];
  };
  intent: {
    sender: Address;
    marketId?: string;
    question?: string;
    closesAt?: string;
    outcome?: Outcome;
    paymentWei?: string;
  };
}

export interface SimulationWarning {
  code: string;
  message: string;
}

export interface NativeTransfer {
  from: Address;
  to: Address;
  valueWei: string;
  provenance: "mock-fixture" | "moss-change";
}

export interface EmittedEvent {
  eventName: string;
  args: Record<string, string | boolean>;
  provenance: "mock-fixture" | "moss-change";
}

export interface MarketLensSimulationEnvelope {
  schemaVersion: 1;
  verificationMode: VerificationMode;
  operation: Operation;
  simulationBlockNumber?: string;
  simulationBlockHash?: Hex;
  simulationBlockTimestamp?: string;
  unsignedTransaction: UnsignedTransaction;
  decodedCall: PreparedAction["decodedCall"];
  marketId?: string;
  marketQuestion?: {
    value: string;
    questionHash?: Hex;
    source: "action-input" | "indexed-chain-state";
  };
  selectedOutcome?: Outcome;
  sender: Address;
  expectedPaymentWei?: string;
  expectedPositionUnits?: string;
  nativeTransfers: NativeTransfer[];
  emittedEvents: EmittedEvent[];
  mossReceiptOutcome?: unknown;
  simulationSuccess: boolean;
  revertReason?: string;
  warnings: SimulationWarning[];
}

export interface UserConstraints {
  sender: Address;
  requiredOutcome?: Outcome;
  maxPaymentWei?: bigint;
  minPositionUnits?: bigint;
}

export interface ConstraintCheck {
  id: string;
  label: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export interface ConstraintResult {
  passed: boolean;
  checks: ConstraintCheck[];
}
