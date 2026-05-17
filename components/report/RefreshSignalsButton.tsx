"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function RefreshSignalsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/signals/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }

      const body = (await response.json().catch(() => null)) as { slug?: string; error?: string } | null;
      if (!response.ok || !body?.slug) {
        throw new Error(body?.error ?? "Refresh failed");
      }

      router.push(`/report/${body.slug}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Refresh failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={refresh}
        disabled={loading}
        className="border-ink bg-canvas text-ink hover:bg-action hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Refreshing..." : "Refresh Signals"}
      </Button>
      {error ? <p className="max-w-xs text-right font-mono text-[10px] uppercase tracking-wider text-skip">{error}</p> : null}
    </div>
  );
}
