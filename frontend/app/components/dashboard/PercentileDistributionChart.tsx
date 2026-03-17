"use client";

import React from "react";
import { Card } from "../ui";

interface PercentileDistributionChartProps {
  overallPercentile: number; // 0-100, where 100 = top 1%
  overallIndex: number;
}

export const PercentileDistributionChart: React.FC<PercentileDistributionChartProps> = ({
  overallPercentile,
  overallIndex,
}) => {
  // Convert percentile to position (0-100 scale, where 0 = left, 100 = right)
  const userPosition = 100 - overallPercentile;
  const topPercent = 100 - overallPercentile;
  
  // Helper to get ordinal suffix
  const getOrdinalSuffix = (n: number) => {
    const j = n % 10;
    const k = n % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  // Generate bell curve points (normal distribution approximation)
  const generateBellCurve = () => {
    const points: { x: number; y: number }[] = [];
    const mean = 50; // Center of distribution
    const stdDev = 15; // Standard deviation for bell curve shape
    
    for (let x = 0; x <= 100; x += 2) {
      const y = Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
      points.push({ x, y });
    }
    
    // Normalize y values to 0-1 range for display
    const maxY = Math.max(...points.map(p => p.y));
    return points.map(p => ({ x: p.x, y: p.y / maxY }));
  };

  const curvePoints = generateBellCurve();
  
  // Convert to SVG path
  const pathData = curvePoints
    .map((point, index) => {
      const x = (point.x / 100) * 100; // Percentage of width
      const y = 100 - (point.y * 80); // Invert y and scale (leave some margin)
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <Card className="p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">Percentile</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span className="text-xs text-gray-400">
              Percentile: {topPercent}{getOrdinalSuffix(topPercent)} percentile
            </span>
          </div>
        </div>
        <p className="text-sm text-white mb-1">You beat {topPercent}% of users</p>
        <a href="#" className="text-xs text-gray-400 hover:text-gray-300 inline-flex items-center gap-1">
          Learn more about Percentile <span>→</span>
        </a>
      </div>
      
      <div className="relative h-32 w-full">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 200, 100, 0.3)" />
              <stop offset="100%" stopColor="rgba(255, 200, 100, 0.05)" />
            </linearGradient>
          </defs>
          
          {/* Fill under curve - muted yellow/tan gradient like Tublian */}
          <path
            d={`${pathData} L 100 100 L 0 100 Z`}
            fill="url(#curveGradient)"
            vectorEffect="non-scaling-stroke"
          />
          
          {/* Bell curve line - muted yellow/tan */}
          <path
            d={pathData}
            fill="none"
            stroke="rgba(255, 200, 100, 0.4)"
            strokeWidth="0.4"
            vectorEffect="non-scaling-stroke"
          />
          
          {/* User position marker */}
          <g transform={`translate(${userPosition}, 0)`}>
            {/* Vertical line */}
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="100"
              stroke="#FF5500"
              strokeWidth="0.4"
              vectorEffect="non-scaling-stroke"
            />
            {/* Marker dot at curve intersection */}
            {(() => {
              const closestPoint = curvePoints.reduce((closest, point) => {
                return Math.abs(point.x - userPosition) < Math.abs(closest.x - userPosition)
                  ? point
                  : closest;
              });
              const dotY = 100 - (closestPoint.y * 80);
              return (
                <circle
                  cx="0"
                  cy={dotY}
                  r="1.8"
                  fill="#FF5500"
                  stroke="#0A0B0D"
                  strokeWidth="0.3"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })()}
          </g>
        </svg>
        
        {/* Labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-2 pb-1">
          <span className="text-xs text-gray-500">0</span>
          <span className="text-xs text-gray-500">50</span>
          <span className="text-xs text-gray-500">100</span>
        </div>
      </div>
    </Card>
  );
};




