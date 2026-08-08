import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarketLens · AI Agent Execution Policy Firewall",
  description:
    "Control what your AI Agent is allowed to execute. MarketLens reviews the Agent's complete plan before signing, detecting cross-action conflicts and policy violations.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="siteHeader">
          <span className="brand">
            <span className="brandMark">ML</span>
            <span>
              MarketLens
              <small>AI Agent Policy Firewall</small>
            </span>
          </span>
          <nav>
            <a href="/">Home</a>
            <a href="/demo">Verified Demo</a>
          </nav>
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
