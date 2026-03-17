"use client";

import React, { useEffect, useState } from "react";

interface TrustScoreCircleProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export const TrustScoreCircle: React.FC<TrustScoreCircleProps> = ({
  score,
  size = "md",
  showLabel = true,
}) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    // Animate from 0 to score over 300ms
    const duration = 300;
    const startTime = Date.now();
    const startValue = 0;
    const endValue = score;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic bezier approximation
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(startValue + (endValue - startValue) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score]);

  const sizes = {
    sm: { 
      container: "w-16 h-16", 
      text: "text-xl", 
      stroke: "8",
      svgSize: 64,
      radius: 24,
    },
    md: { 
      container: "w-24 h-24", 
      text: "text-2xl", 
      stroke: "10",
      svgSize: 96,
      radius: 36,
    },
    lg: { 
      container: "w-32 h-32", 
      text: "text-4xl", 
      stroke: "12",
      svgSize: 128,
      radius: 50,
    },
  };
  
  const sizeConfig = sizes[size];
  const circumference = 2 * Math.PI * sizeConfig.radius;
  const offset = circumference - (animatedScore / 100) * circumference;
  const center = sizeConfig.svgSize / 2;
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${sizeConfig.container} relative flex items-center justify-center`}>
        <svg
          className="transform -rotate-90 absolute inset-0"
          width={sizeConfig.svgSize}
          height={sizeConfig.svgSize}
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={sizeConfig.radius}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={sizeConfig.stroke}
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={sizeConfig.radius}
            stroke="#FF5500"
            strokeWidth={sizeConfig.stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-out"
            style={{
              opacity: isVisible ? 1 : 0,
            }}
          />
        </svg>
        <div className="relative z-10 flex items-center justify-center">
          <span 
            className={`${sizeConfig.text} font-bold text-white transition-opacity duration-300`}
            style={{
              opacity: isVisible ? 1 : 0,
              textShadow: '0 0 20px rgba(59, 118, 239, 0.3)',
            }}
          >
            {animatedScore}
          </span>
        </div>
      </div>
      {showLabel && (
        <span className="text-sm text-gray-400">Trust Score</span>
      )}
    </div>
  );
};

