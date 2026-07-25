import type { ReactNode } from "react";

export function StatusBadge({
  tone,
  children,
}: {
  tone: "verified" | "warning" | "neutral";
  children: ReactNode;
}) {
  return <span className={`statusBadge statusBadge-${tone}`}>{children}</span>;
}

