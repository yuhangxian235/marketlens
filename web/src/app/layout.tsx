import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarketLens · Pre-sign policy firewall for agent batches",
  description:
    "See why an agent action can pass alone but still be blocked when the whole batch violates user policy.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="siteHeader firewallSiteHeader">
          <span className="brand">
            <span className="brandMark">ML</span>
            <span>
              MarketLens
              <small>Agent batch policy firewall</small>
            </span>
          </span>
          <div className="headerStatus" aria-label="Execution boundaries">
            <span className="statusBadge statusBadge-verified">REAL LOCAL</span>
            <span className="statusBadge statusBadge-warning">UNSIGNED</span>
            <span className="statusBadge statusBadge-warning">NOT BROADCAST</span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
