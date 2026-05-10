import * as React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`flex h-12 w-full border-2 border-ink bg-canvas px-4 py-2 text-base font-medium ring-offset-canvas file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action disabled:cursor-not-allowed disabled:opacity-50 ${className || ""}`}
        style={{ borderRadius: "0px" }}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
