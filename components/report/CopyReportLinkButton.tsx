"use client";

import { useState } from "react";

export function CopyReportLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className="border border-[#E8E4DD] px-3 py-2 text-xs font-bold"
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
