import Link from "next/link";
import { notFound } from "next/navigation";

import { EvidenceRail } from "@/components/evidence-rail";
import { StatusBadge } from "@/components/status-badge";
import { getEvidence, getManifest } from "@/lib/evidence";

export async function generateStaticParams() {
  const evidence = await getEvidence();
  return Object.keys(evidence).map((metricId) => ({ metricId }));
}

export default async function EvidencePage({
  params,
}: {
  params: Promise<{ metricId: string }>;
}) {
  const { metricId } = await params;
  const [manifest, evidenceMap] = await Promise.all([
    getManifest(),
    getEvidence(),
  ]);
  const evidence = evidenceMap[metricId];
  if (!evidence) notFound();
  const passedChecks = manifest.qualityChecks.filter(
    (check) => check.status === "PASS",
  ).length;

  return (
    <div className="pageGrid">
      <EvidenceRail manifest={manifest} />
      <div className="pageCanvas">
        <header className="pageIntro evidenceTitle">
          <div className="sectionLabel">Metric evidence / {metricId}</div>
          <h1>{evidence.definition}</h1>
          <div className="badgeRow">
            <StatusBadge tone={manifest.publishable ? "verified" : "warning"}>
              RUN CHECKS {passedChecks}/{manifest.qualityChecks.length} PASS
            </StatusBadge>
            <StatusBadge tone="neutral">SAMPLE {evidence.sample_size}</StatusBadge>
          </div>
        </header>
        <section className="provenanceGrid">
          <article>
            <span>Numerator</span>
            <strong>{evidence.numerator_definition}</strong>
          </article>
          <article>
            <span>Denominator</span>
            <strong>{evidence.denominator_definition}</strong>
          </article>
          <article>
            <span>Observation window</span>
            <strong>
              {manifest.windowStart.replace("T", " ").replace("Z", " UTC")}
              <br />
              to {manifest.windowEnd.replace("T", " ").replace("Z", " UTC")}
            </strong>
          </article>
          <article>
            <span>Versioned logic</span>
            <strong>{evidence.sql_file}</strong>
          </article>
        </section>
        <section className="evidenceDocument">
          <div>
            <div className="sectionLabel">Chain envelope</div>
            <dl>
              <div>
                <dt>Chain</dt>
                <dd>{manifest.chainId}</dd>
              </div>
              <div>
                <dt>Contract</dt>
                <dd>{manifest.contractAddress}</dd>
              </div>
              <div>
                <dt>Inclusive blocks</dt>
                <dd>{manifest.fromBlock}—{manifest.toBlock}</dd>
              </div>
              <div>
                <dt>Analysis run</dt>
                <dd>{manifest.analysisRunId}</dd>
              </div>
            </dl>
          </div>
          <div>
            <div className="sectionLabel">Example transaction hashes</div>
            {evidence.sample_tx_hashes.length ? (
              <ul className="hashList">
                {evidence.sample_tx_hashes.map((hash) => (
                  <li key={hash}>{hash}</li>
                ))}
              </ul>
            ) : (
              <p className="emptyText">Global metric; open a market metric for examples.</p>
            )}
          </div>
        </section>
        <aside className="limitationBox">
          <strong>Interpretation boundary</strong>
          <p>{evidence.limitations}</p>
        </aside>
        <Link className="textLink" href="/product-analytics">
          ← Return to product analytics
        </Link>
      </div>
    </div>
  );
}
