"use client";
import React from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

interface SkillRadarChartProps {
  skills: Array<{ skill: string; score: number }>;
}

export const SkillRadarChart: React.FC<SkillRadarChartProps> = ({ skills }) => {
  // Take top 5 skills, normalize to 0-100
  const top5 = skills.slice(0, 5);

  // Pad to at least 3 points for a visible polygon
  while (top5.length < 3) {
    top5.push({ skill: "—", score: 0 });
  }

  const data = top5.map(s => ({
    subject: s.skill.length > 10 ? s.skill.slice(0, 9) + "…" : s.skill,
    value: Math.min(Math.round(s.score), 100),
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
        <PolarGrid
          gridType="polygon"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fontSize: 9, fill: "rgba(255,255,255,0.45)", fontFamily: "inherit" }}
          tickLine={false}
        />
        <Radar
          name="Skills"
          dataKey="value"
          stroke="#3b76ef"
          fill="#3b76ef"
          fillOpacity={0.35}
          strokeWidth={1.5}
          dot={{ fill: "#5b96ff", r: 3, strokeWidth: 1, stroke: "rgba(91,150,255,0.5)" }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};
