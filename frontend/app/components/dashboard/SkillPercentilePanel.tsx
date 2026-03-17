"use client";

import React from "react";
import { Card } from "../ui";

export interface SkillScore {
  skill: string;
  score: number;
  percentile: number;
  confidence: number;
  artifactCount: number;
}

interface SkillPercentilePanelProps {
  skills: SkillScore[];
}

// Generate a simple line graph data
const generateLineData = (score: number, count: number = 5) => {
  const points = [];
  for (let i = 0; i < count; i++) {
    const base = score * 0.7;
    const variation = (Math.random() - 0.5) * 20;
    points.push(Math.max(0, Math.min(100, base + variation)));
  }
  return points;
};

export const SkillPercentilePanel: React.FC<SkillPercentilePanelProps> = ({
  skills,
}) => {
  const getColor = (index: number) => {
    const colors = ["#FF5500", "#10B981", "#8B5CF6", "#F59E0B"];
    return colors[index % colors.length];
  };

  const getPercentileText = (percentile: number) => {
    const topPercent = 100 - percentile;
    return `Top ${topPercent}%`;
  };

  return (
    <Card className="p-4 rounded-[16px]">
      <h2 className="text-sm font-medium text-white mb-3" style={{ fontWeight: 500, fontSize: '14px' }}>
        Skill Percentiles
      </h2>
      <div className="space-y-2.5">
        {skills.length === 0 ? (
          <p className="text-gray-400 text-center py-4 text-xs" style={{ opacity: 0.6 }}>No skills data</p>
        ) : skills.length === 1 ? (
          // Single skill - make it more prominent
          skills.map((skill, index) => {
            const color = getColor(index);
            const lineData = generateLineData(skill.score, 5);
            const maxValue = Math.max(...lineData, skill.score);
            const minValue = Math.min(...lineData, skill.score);
            const range = maxValue - minValue || 1;
            
            return (
              <div
                key={skill.skill}
                className="p-3.5 rounded-[14px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white" style={{ fontWeight: 500 }}>
                    {skill.skill}
                  </span>
                  <span className="text-xs font-semibold text-gray-400 bg-[rgba(255,255,255,0.03)] px-2 py-1 rounded">
                    {getPercentileText(skill.percentile)}
                  </span>
                </div>
                <div className="h-[50px] relative mb-2">
                  <svg
                    width="100%"
                    height="50"
                    className="overflow-visible"
                  >
                    <line
                      x1="0"
                      y1="25"
                      x2="100%"
                      y2="25"
                      stroke="rgba(255,255,255,0.02)"
                      strokeWidth="1"
                    />
                    <polyline
                      points={lineData
                        .map(
                          (value, i) =>
                            `${(i / (lineData.length - 1)) * 100}%,${
                              50 - ((value - minValue) / range) * 40
                            }`
                        )
                        .join(" ")}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-base font-bold text-white" style={{ fontWeight: 600 }}>
                  {skill.score}
                </span>
              </div>
            );
          })
        ) : (
          skills.map((skill, index) => {
            const color = getColor(index);
            const lineData = generateLineData(skill.score, 5);
            const maxValue = Math.max(...lineData, skill.score);
            const minValue = Math.min(...lineData, skill.score);
            const range = maxValue - minValue || 1;
            
            return (
              <div
                key={skill.skill}
                className="p-3 rounded-[14px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-white" style={{ fontWeight: 500 }}>
                    {skill.skill}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-400 bg-[rgba(255,255,255,0.03)] px-1.5 py-0.5 rounded">
                    {getPercentileText(skill.percentile)}
                  </span>
                </div>
                <div className="h-[45px] relative mb-1.5">
                  <svg
                    width="100%"
                    height="45"
                    className="overflow-visible"
                  >
                    <line
                      x1="0"
                      y1="22.5"
                      x2="100%"
                      y2="22.5"
                      stroke="rgba(255,255,255,0.02)"
                      strokeWidth="1"
                    />
                    <polyline
                      points={lineData
                        .map(
                          (value, i) =>
                            `${(i / (lineData.length - 1)) * 100}%,${
                              45 - ((value - minValue) / range) * 35
                            }`
                        )
                        .join(" ")}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-sm font-bold text-white" style={{ fontWeight: 600 }}>
                  {skill.score}
                </span>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};

