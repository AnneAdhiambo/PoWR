"use client";

import { useState } from "react";
import { CandidateCard } from "../components/recruiter/CandidateCard";
import { ComparisonView } from "../components/recruiter/ComparisonView";
import { Button, Card } from "../components/ui";
import { Search, Filter, X } from "lucide-react";
import { SkillScore } from "../components/dashboard/SkillPercentilePanel";

// Mock data - in production, fetch from API
const mockCandidates = [
  {
    username: "alice-dev",
    skills: [
      {
        skill: "Backend Engineering",
        score: 85,
        percentile: 10,
        confidence: 92,
        artifactCount: 52,
      },
      {
        skill: "Frontend Engineering",
        score: 70,
        percentile: 30,
        confidence: 78,
        artifactCount: 38,
      },
      {
        skill: "DevOps / Infrastructure",
        score: 60,
        percentile: 40,
        confidence: 65,
        artifactCount: 18,
      },
      {
        skill: "Systems / Architecture",
        score: 75,
        percentile: 25,
        confidence: 85,
        artifactCount: 35,
      },
    ],
    overallIndex: 72,
    lastVerified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    username: "bob-coder",
    skills: [
      {
        skill: "Backend Engineering",
        score: 78,
        percentile: 18,
        confidence: 88,
        artifactCount: 45,
      },
      {
        skill: "Frontend Engineering",
        score: 82,
        percentile: 12,
        confidence: 90,
        artifactCount: 48,
      },
      {
        skill: "DevOps / Infrastructure",
        score: 55,
        percentile: 45,
        confidence: 60,
        artifactCount: 15,
      },
      {
        skill: "Systems / Architecture",
        score: 68,
        percentile: 32,
        confidence: 75,
        artifactCount: 28,
      },
    ],
    overallIndex: 71,
    lastVerified: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function RecruitersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [minPercentile, setMinPercentile] = useState<number>(0);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const filteredCandidates = mockCandidates.filter((candidate) => {
    const matchesSearch =
      candidate.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      searchQuery === "";
    const matchesSkill =
      selectedSkill === "" ||
      candidate.skills.some((s) => s.skill === selectedSkill);
    const matchesPercentile =
      candidate.skills.some((s) => 100 - s.percentile >= minPercentile) ||
      minPercentile === 0;
    return matchesSearch && matchesSkill && matchesPercentile;
  });

  const toggleCandidateSelection = (username: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(username)
        ? prev.filter((u) => u !== username)
        : [...prev, username]
    );
  };

  const comparisonCandidates = mockCandidates.filter((c) =>
    selectedCandidates.includes(c.username)
  );

  return (
    <div className="min-h-screen bg-[#0A0B0D] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
            Candidate Discovery
          </h1>
          <p className="text-gray-400">
            Find developers with verified proof-of-work
          </p>
        </div>

        {/* Filters */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-white">Filters</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#0A0B0D] border border-[#141519] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF5500]"
                />
              </div>

              {/* Skill Filter */}
              <select
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
                className="px-4 py-2 bg-[#0A0B0D] border border-[#141519] rounded-lg text-white focus:outline-none focus:border-[#FF5500]"
              >
                <option value="">All Skills</option>
                <option value="Backend Engineering">Backend Engineering</option>
                <option value="Frontend Engineering">Frontend Engineering</option>
                <option value="DevOps / Infrastructure">
                  DevOps / Infrastructure
                </option>
                <option value="Systems / Architecture">
                  Systems / Architecture
                </option>
              </select>

              {/* Percentile Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400 whitespace-nowrap">
                  Min Percentile:
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={minPercentile}
                  onChange={(e) => setMinPercentile(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-[#0A0B0D] border border-[#141519] rounded-lg text-white focus:outline-none focus:border-[#FF5500]"
                />
              </div>
            </div>

            {/* Comparison Controls */}
            {selectedCandidates.length > 0 && (
              <div className="flex items-center gap-2 pt-4 border-t border-[#141519]">
                <span className="text-sm text-gray-400">
                  {selectedCandidates.length} candidate(s) selected
                </span>
                <Button
                  onClick={() => setShowComparison(!showComparison)}
                  size="sm"
                >
                  {showComparison ? "Hide" : "Show"} Comparison
                </Button>
                <Button
                  onClick={() => setSelectedCandidates([])}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Comparison View */}
        {showComparison && comparisonCandidates.length > 0 && (
          <ComparisonView candidates={comparisonCandidates} />
        )}

        {/* Candidate Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCandidates.map((candidate) => (
            <div
              key={candidate.username}
              onClick={() => toggleCandidateSelection(candidate.username)}
              className="cursor-pointer"
            >
              <CandidateCard
                username={candidate.username}
                skills={candidate.skills}
                overallIndex={candidate.overallIndex}
                lastVerified={candidate.lastVerified}
                profileUrl={`/profile/${candidate.username}`}
              />
              {selectedCandidates.includes(candidate.username) && (
                <div className="mt-2 text-center">
                  <span className="text-xs text-[#FF5500]">Selected</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredCandidates.length === 0 && (
          <Card>
            <p className="text-gray-400 text-center py-8">
              No candidates found matching your filters
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

