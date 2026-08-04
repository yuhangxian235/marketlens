import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  encodeAbiParameters,
  keccak256,
  padHex,
  parseAbiParameters,
  toHex,
} from "viem";

const rpcUrl = process.argv[2] ?? "http://127.0.0.1:8546";
const fixtureMode = process.argv[3] ?? "batch";
const contract = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";
const owner = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
const alice = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
const bob = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc";
const artifactUrl = new URL(
  "../../../contracts/out/PredictionMarket.sol/PredictionMarket.json",
  import.meta.url,
);
const evidenceUrl = new URL("../../../work/phase4a-anvil-fixture.json", import.meta.url);

let requestId = 0;
async function rpc(method, params) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++requestId, method, params }),
  });
  const payload = await response.json();
  if (payload.error) {
    throw new Error(`${method}: ${payload.error.message}`);
  }
  return payload.result;
}

function word(value) {
  return toHex(BigInt(value), { size: 32 });
}

function addSlot(slot, offset) {
  return word(BigInt(slot) + BigInt(offset));
}

function mappingSlot(key, slot) {
  return keccak256(
    encodeAbiParameters(parseAbiParameters("uint256, uint256"), [
      BigInt(key),
      BigInt(slot),
    ]),
  );
}

function addressMappingSlot(address, slot) {
  return keccak256(
    encodeAbiParameters(parseAbiParameters("address, bytes32"), [address, slot]),
  );
}

async function setStorage(slot, value) {
  await rpc("anvil_setStorageAt", [contract, padHex(slot, { size: 32 }), word(value)]);
}

function bindImmutableOwner(deployedBytecode, immutableReferences) {
  let hex = deployedBytecode.slice(2);
  const ownerWord = owner.slice(2).padStart(64, "0");
  for (const reference of immutableReferences["41254"] ?? []) {
    const start = reference.start * 2;
    const length = reference.length * 2;
    hex = `${hex.slice(0, start)}${ownerWord}${hex.slice(start + length)}`;
  }
  return `0x${hex}`;
}

const artifact = JSON.parse(await readFile(artifactUrl, "utf8"));
const runtimeCode = bindImmutableOwner(
  artifact.deployedBytecode.object,
  artifact.deployedBytecode.immutableReferences,
);
const latestBlock = await rpc("eth_getBlockByNumber", ["latest", false]);
const closesAt = BigInt(latestBlock.timestamp) + 86_400n;

await rpc("anvil_setCode", [contract, runtimeCode]);
await rpc("anvil_setBalance", [contract, toHex(1_500_000_000_000_000_000n)]);

// nextMarketId = 5. Markets 1, 2, and 4 are open; market 3 is resolved YES.
await setStorage(word(0n), 5n);
for (const marketId of [1n, 2n, 4n]) {
  const base = mappingSlot(marketId, 1n);
  await setStorage(addSlot(base, 2n), closesAt);
}

const resolvedBase = mappingSlot(3n, 1n);
const resolvedYesPacked = (1n << 128n) | (1n << 136n);
await setStorage(addSlot(resolvedBase, 2n), resolvedYesPacked);
await setStorage(addSlot(resolvedBase, 3n), 1_000_000_000_000_000_000n);
await setStorage(addSlot(resolvedBase, 4n), 500_000_000_000_000_000n);
await setStorage(addSlot(resolvedBase, 5n), 1_000_000_000_000_000_000n);
await setStorage(addSlot(resolvedBase, 6n), 1_500_000_000_000_000_000n);

// BOB owns only the losing NO side in market 3. claimReward reads the YES slot,
// obtains zero stake, and must revert with NothingToClaim.
const positionsByMarket = mappingSlot(3n, 2n);
const alicePositionsByWallet = addressMappingSlot(alice, positionsByMarket);
const aliceYesPosition = mappingSlot(1n, alicePositionsByWallet);
await setStorage(aliceYesPosition, 1_000_000_000_000_000_000n);
const positionsByWallet = addressMappingSlot(bob, positionsByMarket);
const bobNoPosition = mappingSlot(2n, positionsByWallet);
await setStorage(bobNoPosition, 500_000_000_000_000_000n);

if (fixtureMode === "protocol") {
  await setStorage(word(0n), 6n);

  const claimedBase = mappingSlot(4n, 1n);
  await setStorage(addSlot(claimedBase, 2n), resolvedYesPacked);
  await setStorage(addSlot(claimedBase, 3n), 1_000_000_000_000_000_000n);
  const claimedByMarket = mappingSlot(4n, 3n);
  const ownerClaimed = addressMappingSlot(owner, claimedByMarket);
  await setStorage(ownerClaimed, 1n);

  const closedBase = mappingSlot(5n, 1n);
  await setStorage(addSlot(closedBase, 2n), 1n << 136n);
  await setStorage(addSlot(closedBase, 7n), 1n);
}

const code = await rpc("eth_getCode", [contract, "latest"]);
const nextMarketId = await rpc("eth_call", [
  { to: contract, data: "0x406ef2ef" },
  "latest",
]);
const expectedNextMarketId = fixtureMode === "protocol" ? 6n : 5n;
if (code === "0x" || BigInt(nextMarketId) !== expectedNextMarketId) {
  throw new Error("Local Anvil fixture verification failed");
}

const evidence = {
  schema_version: "1.0.0",
  environment: "local_anvil",
  chain_id: 143,
  contract_address: contract,
  setup_methods: [
    "anvil_setCode",
    "anvil_setStorageAt",
    "anvil_setBalance",
  ],
  private_keys_used: false,
  signed_transactions: 0,
  broadcast_transactions: 0,
  fixture_mode: fixtureMode,
  next_market_id: fixtureMode === "protocol" ? "6" : "5",
  markets: {
    "1": "OPEN",
    "2": "OPEN",
    "3": "RESOLVED_YES_BOB_HOLDS_ONLY_NO",
    "4": fixtureMode === "protocol" ? "RESOLVED_ALREADY_CLAIMED" : "OPEN_CONFLICT_FIXTURE",
    ...(fixtureMode === "protocol" ? { "5": "RESOLVED_REFUND" } : {}),
  },
};
await mkdir(new URL("../../../work/", import.meta.url), { recursive: true });
await writeFile(evidenceUrl, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(evidence)}\n`);
