import { ActionWorkbench } from "@/components/action-workbench";
import { getManifest, getMarkets } from "@/lib/evidence";

export default async function ActionPage() {
  const [manifest, markets] = await Promise.all([getManifest(), getMarkets()]);
  return (
    <div className="actionPage">
      <header className="pageIntro actionIntro">
        <div>
          <div className="sectionLabel">Signer-free action laboratory</div>
          <h1>Intent on the left. Evidence on the right. Signer nowhere.</h1>
        </div>
        <p>
          The current adapter is an honest deterministic mock. Real Moss remains
          disabled until source vocabulary, bytecode, pinned-block metadata, and a
          zero-Warning trace all pass together.
        </p>
      </header>
      <ActionWorkbench
        contractAddress={manifest.contractAddress}
        markets={markets}
      />
    </div>
  );
}

