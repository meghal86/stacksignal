import * as React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "build" | "skip" | "watch" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const baseStyles = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono font-bold transition-colors";
  
  const variants = {
    default: "bg-ink text-canvas",
    build: "bg-clarity text-ink",
    skip: "bg-skip text-canvas",
    watch: "bg-insight text-canvas",
    outline: "border-2 border-ink text-ink",
  };

  const combinedClassName = `${baseStyles} ${variants[variant]} ${className || ""}`;

  return (
    <div
      className={combinedClassName}
      style={{ borderRadius: "100px" }} // Pill shape as per design.md
      {...props}
    />
  );
}
