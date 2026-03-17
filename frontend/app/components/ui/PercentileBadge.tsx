import React from "react";

interface PercentileBadgeProps {
  percentile: number; // 0-100, where 100 is top 1%
  size?: "sm" | "md" | "lg";
}

export const PercentileBadge: React.FC<PercentileBadgeProps> = ({
  percentile,
  size = "md",
}) => {
  const topPercent = 100 - percentile;
  const sizes = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };
  
  return (
    <span
      className={`${sizes[size]} rounded-full bg-[#FF5500] text-white font-semibold`}
    >
      Top {topPercent.toFixed(0)}%
    </span>
  );
};

