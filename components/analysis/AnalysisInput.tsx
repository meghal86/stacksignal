"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { detectAnalysisInputType } from "@/lib/analysis/input";

type AnalysisInputProps = {
  onSubmit?: (input: string, tier: "free" | "paid") => void;
  defaultValue?: string;
};

const DETECTION_LABELS = {
  github_repo: "GitHub Repo detected",
  npm_package: "npm package detected",
  pypi_package: "PyPI package detected",
  domain_search: "Searching ecosystem...",
} as const;

export function AnalysisInput({ onSubmit, defaultValue = "" }: AnalysisInputProps) {
  const [input, setInput] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const detectedType = useMemo(() => {
    if (!input.trim()) {
      return null;
    }

    return detectAnalysisInputType(input);
  }, [input]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const value = input.trim();
    if (!value) {
      return;
    }

    setIsLoading(true);

    if (onSubmit) {
      onSubmit(value, "free");
      return;
    }

    router.push(`/analyze?q=${encodeURIComponent(value)}&tier=free`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <Input
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Paste a GitHub URL, npm package, or describe what you want to build..."
        className="h-16 w-full border-2 border-ink bg-white px-5 text-base text-ink placeholder:text-ink/40 md:text-lg"
        disabled={isLoading}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-h-7">
          {detectedType ? (
            <Badge
              variant="outline"
              className="border border-[#E8E4DD] bg-canvas px-3 py-1 text-[10px] uppercase tracking-[0.14em]"
            >
              {DETECTION_LABELS[detectedType]}
            </Badge>
          ) : null}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="h-12 border border-[#FF4800] bg-action px-6 text-sm uppercase tracking-[0.1em] text-white hover:bg-[#e34000]"
        >
          {isLoading ? "Analyzing..." : "Analyze →"}
        </Button>
      </div>
    </form>
  );
}
