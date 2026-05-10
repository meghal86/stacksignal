"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);

    // Basic detection logic
    let type = "npm";
    let slug = query.trim();

    // If it looks like a GitHub URL
    if (slug.includes("github.com/")) {
      type = "github";
      slug = slug.split("github.com/")[1].split("?")[0].split("#")[0];
    } else if (slug.includes("/")) {
      // Could be owner/repo
      type = "github";
    }

    router.push(`/analyze?slug=${encodeURIComponent(slug)}&type=${type}`);
  };

  return (
    <form onSubmit={handleSearch} className="w-full max-w-2xl flex flex-col md:flex-row gap-0 group shadow-none">
      <Input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search package or repo (e.g. nextjs, anthropic-ai/sdk)" 
        className="md:border-r-0 focus-visible:ring-0 group-hover:border-action transition-colors h-12"
        disabled={isLoading}
      />
      <Button 
        type="submit"
        disabled={isLoading}
        className="h-12 px-8 group-hover:bg-action transition-colors whitespace-nowrap uppercase tracking-widest font-heading"
      >
        {isLoading ? "Detecting..." : "Analyze Signals"}
      </Button>
    </form>
  );
}
