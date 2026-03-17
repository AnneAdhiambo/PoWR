"use client";

import React from "react";
import { Card, SkillBar } from "../ui";
import { SkillScore } from "../dashboard/SkillPercentilePanel";

interface Candidate {
  username: string;
  skills: SkillScore[];
  overallIndex: number;
}

interface ComparisonViewProps {
  candidates: Candidate[];
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  candidates,
}) => {
  if (candidates.length === 0) {
    return (
      <Card>
        <p className="text-gray-400 text-center py-8">
          Select candidates to compare
        </p>
      </Card>
    );
  }

  const allSkills = Array.from(
    new Set(candidates.flatMap((c) => c.skills.map((s) => s.skill)))
  );

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-semibold text-white tracking-tight mb-6">
          Side-by-Side Comparison
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#141519]">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                  Skill
                </th>
                {candidates.map((candidate) => (
                  <th
                    key={candidate.username}
                    className="text-center py-3 px-4 text-sm font-semibold text-white"
                  >
                    {candidate.username}
                    <div className="text-xs text-[#FF5500] mt-1">
                      Index: {candidate.overallIndex}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allSkills.map((skill) => (
                <tr
                  key={skill}
                  className="border-b border-[#0A0B0D]"
                >
                  <td className="py-4 px-4 text-sm text-gray-300">{skill}</td>
                  {candidates.map((candidate) => {
                    const skillData = candidate.skills.find(
                      (s) => s.skill === skill
                    );
                    return (
                      <td key={candidate.username} className="py-4 px-4">
                        {skillData ? (
                          <div className="space-y-2">
                            <div className="text-center">
                              <span className="text-lg font-bold text-[#FF5500]">
                                {skillData.score}
                              </span>
                              <span className="text-xs text-gray-400 ml-2">
                                Top {100 - skillData.percentile}%
                              </span>
                            </div>
                            <SkillBar
                              skill={skill}
                              score={skillData.score}
                              percentile={skillData.percentile}
                              showPercentile={false}
                            />
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">N/A</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

