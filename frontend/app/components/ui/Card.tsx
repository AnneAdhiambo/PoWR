import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = "", ...props }) => {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.025)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

