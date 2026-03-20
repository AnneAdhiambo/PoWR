import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}) => {
  const baseStyles = "cursor-pointer rounded-full font-medium transition-all duration-120 ease-out focus:outline-none focus:ring-2 focus:ring-[#FF5500] focus:ring-offset-2 focus:ring-offset-[#0A0B0D]";
  
  const variants = {
    primary: "bg-[#FF5500] text-white hover:bg-[#e04d00] hover:shadow-[0_0_20px_rgba(255,85,0,0.4)] active:bg-[#cc4400] disabled:opacity-60 disabled:cursor-not-allowed",
    secondary: "bg-[#141519] text-white hover:bg-[#1A1B1F] active:bg-[#0F1012] disabled:opacity-60 disabled:cursor-not-allowed",
    outline: "border-2 border-[#FF5500] text-[#FF5500] hover:bg-[#FF5500] hover:text-white hover:shadow-[0_0_20px_rgba(255,85,0,0.3)] active:bg-[#e04d00] disabled:opacity-60 disabled:cursor-not-allowed",
  };
  
  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

