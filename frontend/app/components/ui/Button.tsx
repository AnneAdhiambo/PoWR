import React from "react";
import { SquircleLoader } from "./SquircleLoader";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles = "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-control)] font-medium transition duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--bg-main)] disabled:cursor-not-allowed disabled:opacity-50";
  
  const variants = {
    primary: "bg-[var(--brand-orange)] text-white hover:bg-[var(--brand-orange-hover)] hover:shadow-[0_8px_28px_rgba(255,85,0,0.24)] active:translate-y-px",
    secondary: "border border-[var(--border-strong)] bg-[var(--bg-soft)] text-white hover:bg-[var(--bg-elevated)]",
    outline: "border border-[var(--brand-orange)] text-[var(--brand-orange)] hover:bg-[var(--brand-orange)] hover:text-white",
    ghost: "text-gray-300 hover:bg-[var(--bg-hover)] hover:text-white",
    danger: "border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20",
  };
  
  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <SquircleLoader size={16} color="currentColor" label="Working" />}
      {children}
    </button>
  );
};

