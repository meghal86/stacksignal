import * as React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "warning";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-bold transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
    
    const variants = {
      primary: "bg-ink text-canvas hover:bg-action",
      secondary: "bg-canvas text-ink border-2 border-ink hover:bg-border-warm",
      outline: "border-2 border-ink text-ink hover:bg-ink hover:text-canvas",
      ghost: "text-ink hover:bg-border-warm",
      danger: "bg-skip text-canvas hover:bg-red-700",
      success: "bg-clarity text-ink hover:bg-green-600",
      warning: "bg-insight text-canvas hover:bg-teal-700",
    };

    const sizes = {
      sm: "h-9 px-4 text-sm",
      md: "h-12 px-6 text-base",
      lg: "h-14 px-8 text-lg",
    };

    const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className || ""}`;

    return (
      <button
        ref={ref}
        className={combinedClassName}
        style={{ borderRadius: "0px" }} // Sharp corners as per design.md
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
