import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "..");
const artifactPath = resolve(
  root,
  "contracts/out/PredictionMarket.sol/PredictionMarket.json",
);
const outputPath = resolve(root, "artifacts/abi/PredictionMarket.ts");
const mossOutputPath = resolve(
  root,
  "packages/moss-prediction-market/src/abis/prediction-market.ts",
);

const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
const abi = JSON.stringify(artifact.abi, null, 2);
const abiHash = `0x${createHash("sha256").update(abi).digest("hex")}`;
const output = `// Generated from contracts/src/PredictionMarket.sol by scripts/generate-abi.mjs.
// Do not edit by hand.

export const predictionMarketAbi = ${abi} as const;

export const predictionMarketAbiSha256 = "${abiHash}";
`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, output, "utf8");
await mkdir(dirname(mossOutputPath), { recursive: true });
await writeFile(
  mossOutputPath,
  `// Generated from contracts/src/PredictionMarket.sol. Do not edit by hand.

export const PredictionMarketAbi = ${abi} as const;
`,
  "utf8",
);
process.stdout.write(`${outputPath}\n${abiHash}\n`);
