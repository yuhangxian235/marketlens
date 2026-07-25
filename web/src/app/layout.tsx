import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MarketLens · Evidence-backed market analysis",
  description:
    "Trace prediction-market behavior from contract event to product finding. Local Anvil, not Monad.",
};

const nav = [
  ["Demo", "/demo"],
  ["Markets", "/markets"],
  ["Analytics", "/product-analytics"],
  ["Evidence", "/evidence/global.unique_wallets"],
  ["Action", "/action"],
] as const;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="siteHeader">
          <Link className="brand" href="/" aria-label="MarketLens home">
            <span className="brandMark">ML</span>
            <span>
              MarketLens
              <small>evidence → simulation</small>
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
            <span className="statusBadge statusBadge-verified">REAL LOCAL</span>
            <span className="statusBadge statusBadge-warning">NOT MONAD</span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}

