"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { recruiterApiClient } from "../../lib/recruiterApi";
import { Plus, Trash, Users, Bookmark } from "phosphor-react";
import toast from "react-hot-toast";

export default function RecruiterSavedPage() {
  const router = useRouter();
  const [pools, setPools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPoolName, setNewPoolName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("recruiter_token")) {
      router.replace("/recruiter/auth");
      return;
    }
    loadPools();
  }, []);

  const loadPools = async () => {
    setLoading(true);
    try {
      const { pools: data } = await recruiterApiClient.getSavedPools();
      setPools(data);
    } catch (error: any) {
      toast.error("Failed to load saved pools");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoolName.trim()) return;
    setCreating(true);
    try {
      await recruiterApiClient.createSavedPool(newPoolName.trim());
      setNewPoolName("");
      setShowCreate(false);
      toast.success("Pool created");
      loadPools();
    } catch (error: any) {
      toast.error(error.message || "Failed to create pool");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (poolId: number) => {
    try {
      await recruiterApiClient.deleteSavedPool(poolId);
      toast.success("Pool deleted");
      setPools((prev) => prev.filter((p) => p.id !== poolId));
    } catch (error: any) {
      toast.error("Failed to delete pool");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Saved Talent Pools</h1>
            <p className="text-sm text-gray-500 mt-1">Organise candidates into named lists.</p>
          </div>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#FF5500] hover:bg-[#e04d00] text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" weight="bold" />
            New Pool
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="flex gap-3 mb-6">
            <input
              type="text"
              value={newPoolName}
              onChange={(e) => setNewPoolName(e.target.value)}
              placeholder="Pool name (e.g. 'Frontend Q3')"
              className="flex-1 px-4 py-2.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[rgba(255,85,0,0.5)]"
            />
            <button
              type="submit"
              disabled={creating || !newPoolName.trim()}
              className="px-4 py-2.5 rounded-lg bg-[#FF5500] hover:bg-[#e04d00] text-white text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : pools.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Bookmark className="w-12 h-12 text-gray-700 mb-4" weight="regular" />
            <p className="text-gray-400 font-medium mb-1">No saved pools yet</p>
            <p className="text-sm text-gray-600">Create a pool to start saving developers.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pools.map((pool) => (
              <div
                key={pool.id}
                className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 flex items-center justify-between hover:border-[rgba(255,85,0,0.2)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[rgba(255,85,0,0.1)] border border-[#FF5500]/20 flex items-center justify-center">
                    <Bookmark className="w-5 h-5 text-[#FF5500]" weight="fill" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{pool.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Users className="w-3 h-3 text-gray-600" weight="regular" />
                      <span className="text-xs text-gray-500">
                        {pool.member_count || 0} developer{pool.member_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(pool.id)}
                  className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                >
                  <Trash className="w-4 h-4" weight="regular" />
                </button>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
