"use client";

import React from "react";
import { Card } from "../ui";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { SkillScore } from "./SkillPercentilePanel";

interface SkillsRadarChartProps {
  skills: SkillScore[];
}

export const SkillsRadarChart: React.FC<SkillsRadarChartProps> = ({ skills }) => {
  if (skills.length === 0) {
    return (
      <Card className="p-5 rounded-[16px]">
        <h2 className="text-sm font-medium text-white mb-3" style={{ fontWeight: 500, fontSize: '14px' }}>
          Skill Percentiles
        </h2>
        <p className="text-gray-400 text-center py-8 text-xs" style={{ opacity: 0.6 }}>No skills data</p>
      </Card>
    );
  }

  // Transform skills data for radar chart
  const chartData = skills.map((skill) => {
    // Shorten skill names for better readability
    const shortName = skill.skill
      .replace("Engineering", "Eng")
      .replace("Infrastructure", "Infra")
      .replace("Architecture", "Arch")
      .split(" ")[0];
    
    return {
      skill: shortName,
      fullSkill: skill.skill,
      score: Math.round(skill.score),
      percentile: skill.percentile,
    };
  });

  return (
    <Card className="p-5 rounded-[16px]">
      <h2 className="text-sm font-medium text-white mb-4" style={{ fontWeight: 500, fontSize: '14px' }}>
        Skill Percentiles
      </h2>
      <div className="w-full" style={{ height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} margin={{ top: 30, right: 30, bottom: 30, left: 30 }}>
            <PolarGrid 
              stroke="rgba(255, 255, 255, 0.05)" 
              strokeWidth={1}
            />
            <PolarAngleAxis
              dataKey="skill"
              tick={{ 
                fill: 'rgba(255, 255, 255, 0.7)', 
                fontSize: 11,
                fontWeight: 500
              }}
              tickLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#FF5500"
              strokeWidth={2.5}
              fill="#FF5500"
              fillOpacity={0.25}
              dot={{ 
                r: 4, 
                fill: '#FF5500',
                fillOpacity: 1,
                stroke: '#FF5500',
                strokeWidth: 2
              }}
              animationDuration={350}
              animationEasing="ease-out"
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.04)]">
        <div className="grid grid-cols-2 gap-2">
          {skills.map((skill, index) => (
            <div
              key={skill.skill}
              className="flex items-center justify-between p-2 rounded-lg bg-[rgba(255,255,255,0.02)]"
            >
              <span className="text-xs text-gray-400 truncate" style={{ opacity: 0.7 }}>
                {skill.skill.split(" ")[0]}
              </span>
              <span className="text-xs font-semibold text-white ml-2">
                {Math.round(skill.score)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

