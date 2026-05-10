"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface CopyButtonProps {
  content: string;
  label?: string;
  className?: string;
}

export function CopyButton({ content, label = "Copy", className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={`border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white rounded-none font-mono text-[10px] uppercase transition-all ${className}`}
      onClick={handleCopy}
    >
      {copied ? "Copied!" : label}
    </Button>
  );
}
