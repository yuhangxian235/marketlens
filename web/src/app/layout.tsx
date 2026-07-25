import type { Metadata } from "next";
import Link from "next/link";

import { getManifest } from "@/lib/evidence";
import { StatusBadge } from "@/components/status-badge";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarketLens · Evidence-backed market analysis",
  description:
    "Trace Monad prediction-market behavior from contract event to product finding.",
};

const nav = [
  ["Markets", "/markets"],
  ["Product analytics", "/product-analytics"],
  ["Evidence", "/evidence/global.unique_wallets"],
  ["Action", "/action"],
] as const;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const manifest = await getManifest();
  const passedChecks = manifest.qualityChecks.filter(
    (check) => check.status === "PASS",
  ).length;
  const dataPassed =
    manifest.publishable &&
    manifest.qualityChecks.length > 0 &&
    passedChecks === manifest.qualityChecks.length;
  return (
    <html lang="en">
      <body>
        <header className="siteHeader">
          <Link className="brand" href="/markets" aria-label="MarketLens markets">
            <span className="brandMark">ML</span>
            <span>
              MarketLens
              <small>event → evidence</small>
            </span>
          </Link>
          <nav aria-label="Primary navigation">
            {nav.map(([label, href]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="headerStatus">
            <StatusBadge tone={dataPassed ? "verified" : "warning"}>
              {dataPassed ? "DATA PASS" : "DATA BLOCKED"}
            </StatusBadge>
            <StatusBadge tone="warning">ACTION MOCK</StatusBadge>
          </div>
        </header>
        <div className="auditRibbon">
          <span>CHAIN {manifest.chainId}</span>
          <span>
            BLOCKS {manifest.fromBlock}—{manifest.toBlock}
          </span>
          <span>
            {passedChecks}/{manifest.qualityChecks.length} CHECKS PASS
          </span>
          <span>NO SIGNER</span>
        </div>
        <main>{children}</main>
        <footer>
          <span>MarketLens local MVP baseline</span>
          <span>Static local-fork fixture · manual resolver · address-level evidence</span>
        </footer>
      </body>
    </html>
  );
}
