"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench, Plus, Pencil, Trash, X } from "phosphor-react";
import { recruiterApiClient } from "../../lib/recruiterApi";
import toast from "react-hot-toast";

interface Gig {
  id: string | number;
  title: string;
  client: string;
  location: string;
  rate?: string;
  duration?: string;
  description?: string;
  tags?: string[];
}

interface GigForm {
  title: string;
  client: string;
  location: string;
  rate: string;
  duration: string;
  description: string;
  tagsInput: string;
}

const emptyForm: GigForm = {
  title: "",
  client: "",
  location: "",
  rate: "",
  duration: "",
  description: "",
  tagsInput: "",
};

export default function RecruiterGigsPage() {
  const router = useRouter();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGig, setEditingGig] = useState<Gig | null>(null);
  const [form, setForm] = useState<GigForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("recruiter_token")) {
      router.replace("/recruiter/auth");
      return;
    }
    loadGigs();
  }, []);

  const loadGigs = async () => {
    try {
      setLoading(true);
      const { gigs } = await recruiterApiClient.getMyGigs();
      setGigs(gigs);
    } catch {
      toast.error("Failed to load gigs");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingGig(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (gig: Gig) => {
    setEditingGig(gig);
    setForm({
      title: gig.title,
      client: gig.client,
      location: gig.location,
      rate: gig.rate || "",
      duration: gig.duration || "",
      description: gig.description || "",
      tagsInput: (gig.tags || []).join(", "),
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.client || !form.location) {
      toast.error("Title, client, and location are required");
      return;
    }
    const data = {
      title: form.title,
      client: form.client,
      location: form.location,
      rate: form.rate || undefined,
      duration: form.duration || undefined,
      description: form.description || undefined,
      tags: form.tagsInput
        ? form.tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    };
    try {
      setSaving(true);
      if (editingGig) {
        const { gig } = await recruiterApiClient.updateGig(String(editingGig.id), data);
        setGigs((prev) =>
          prev.map((g) => (String(g.id) === String(editingGig.id) ? gig : g))
        );
        toast.success("Gig updated");
      } else {
        const { gig } = await recruiterApiClient.createGig(data);
        setGigs((prev) => [gig, ...prev]);
        toast.success("Gig posted");
      }
      setShowForm(false);
    } catch {
      toast.error("Failed to save gig");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm("Delete this gig?")) return;
    try {
      await recruiterApiClient.deleteGig(String(id));
      setGigs((prev) => prev.filter((g) => String(g.id) !== String(id)));
      toast.success("Gig deleted");
    } catch {
      toast.error("Failed to delete gig");
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Gigs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Post short-term contracts and freelance work
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#FF5500] hover:bg-[#e04d00] text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" weight="bold" />
          Post a Gig
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141519] rounded-2xl border border-[rgba(255,255,255,0.08)] w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                {editingGig ? "Edit Gig" : "Post a Gig"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] text-gray-400 transition-colors"
              >
                <X className="w-4 h-4" weight="bold" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Build React Dashboard Component"
                  className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FF5500]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Client *</label>
                <input
                  value={form.client}
                  onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
                  placeholder="e.g. Tech Startup"
                  className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FF5500]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Location *</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="e.g. Remote"
                    className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FF5500]"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Rate</label>
                  <input
                    value={form.rate}
                    onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                    placeholder="e.g. $80–$120/hr"
                    className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FF5500]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Duration</label>
                <input
                  value={form.duration}
                  onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                  placeholder="e.g. 2–4 weeks"
                  className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FF5500]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the work..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FF5500] resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Tags (comma-separated)
                </label>
                <input
                  value={form.tagsInput}
                  onChange={(e) => setForm((f) => ({ ...f, tagsInput: e.target.value }))}
                  placeholder="e.g. React, TypeScript, Frontend"
                  className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FF5500]"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-[#FF5500] hover:bg-[#e04d00] text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {saving ? "Saving..." : editingGig ? "Save Changes" : "Post Gig"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-lg bg-[rgba(255,255,255,0.05)] text-gray-400 text-sm hover:bg-[rgba(255,255,255,0.08)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gigs List */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : gigs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <Wrench className="w-16 h-16 text-gray-800 mb-4" weight="regular" />
          <p className="text-gray-400 font-medium">No gigs posted yet</p>
          <p className="text-sm text-gray-600 mt-1">
            Post contract work or freelance gigs for verified developers.
          </p>
          <button
            onClick={openCreate}
            className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FF5500] hover:bg-[#e04d00] text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" weight="bold" />
            Post a Gig
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {gigs.map((gig) => (
            <div
              key={gig.id}
              className="p-5 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white mb-1">{gig.title}</h3>
                  <p className="text-xs text-gray-400 mb-2">
                    {gig.client} · {gig.location}
                    {gig.rate ? ` · ${gig.rate}` : ""}
                    {gig.duration ? ` · ${gig.duration}` : ""}
                  </p>
                  {gig.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                      {gig.description}
                    </p>
                  )}
                  {gig.tags && gig.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {gig.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.04)] text-gray-400 border border-[rgba(255,255,255,0.04)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(gig)}
                    className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-gray-400 hover:text-white transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" weight="regular" />
                  </button>
                  <button
                    onClick={() => handleDelete(gig.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash className="w-4 h-4" weight="regular" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
