import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarketLens · AI Agent Execution Policy Firewall",
  description:
    "Control what your AI Agent is allowed to execute. MarketLens reviews the complete plan before signing, detecting conflicts and policy violations.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="siteHeader">
          <Link href="/" className="brand">
            <span className="brandMark">ML</span>
            <span>MarketLens</span>
          </Link>
          <nav>
            <Link href="/">Agent Plan</Link>
            <Link href="/demo">Verified Demo</Link>
            <Link href="/demo?mode=live">Live Lab</Link>
          </nav>
          <div className="headerStatus">
            <span className="trustBadge">Monad Testnet ●</span>
            <span className="trustBadge trustBadge-dim">Synthetic Demo</span>
            <span className="trustBadge trustBadge-dim">Unsigned</span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
