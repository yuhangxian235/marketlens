import type { EvidenceManifest } from "@/lib/evidence";

export function EvidenceRail({ manifest }: { manifest: EvidenceManifest }) {
  return (
    <aside className="evidenceRail" aria-label="Evidence chain of custody">
      <div className="railNode railNodeVerified">
        <span>Network</span>
        <strong>Monad fork · {manifest.chainId}</strong>
      </div>
      <div className="railNode">
        <span>Observed blocks</span>
        <strong>
          {manifest.fromBlock.toLocaleString()}—{manifest.toBlock.toLocaleString()}
        </strong>
      </div>
      <div className="railNode">
        <span>Pipeline</span>
        <strong>{manifest.pipelineVersion}</strong>
      </div>
      <div className="railNode railNodeVerified">
        <span>Publication</span>
        <strong>{manifest.publishable ? "Checks passed" : "Blocked"}</strong>
      </div>
    </aside>
  );
}

