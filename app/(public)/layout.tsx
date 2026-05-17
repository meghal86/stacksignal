import type { ReactNode } from "react";
import { SignalNav } from "@/components/brand/SignalNav";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="art-page text-ink">
      <SignalNav />
      <div className="art-shell">{children}</div>
    </div>
  );
}
