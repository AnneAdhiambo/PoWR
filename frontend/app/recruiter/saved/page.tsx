"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bookmark, Plus, Trash, Users } from "phosphor-react";
import toast from "react-hot-toast";
import { Button, Card, ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader, RecruiterPage, controlClassName } from "../../components/ui";
import { recruiterApiClient } from "../../lib/recruiterApi";

interface TalentList {
  id: number;
  name: string;
  member_count?: number;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function RecruiterSavedPage() {
  const [pools, setPools] = useState<TalentList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newPoolName, setNewPoolName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deletePool, setDeletePool] = useState<TalentList | null>(null);

  async function loadPools() {
    setLoading(true); setError("");
    try { setPools((await recruiterApiClient.getSavedPools()).pools); }
    catch (loadError: unknown) { setError(errorMessage(loadError, "Could not load talent lists")); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadPools(); }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!newPoolName.trim()) return;
    setCreating(true);
    try { await recruiterApiClient.createSavedPool(newPoolName.trim()); setNewPoolName(""); setShowCreate(false); await loadPools(); toast.success("Talent list created"); }
    catch (createError: unknown) { toast.error(errorMessage(createError, "Could not create talent list")); }
    finally { setCreating(false); }
  }
  async function handleDelete() {
    if (!deletePool) return;
    try { await recruiterApiClient.deleteSavedPool(deletePool.id); setPools((current) => current.filter((pool) => pool.id !== deletePool.id)); toast.success("Talent list deleted"); }
    catch (deleteError: unknown) { toast.error(errorMessage(deleteError, "Could not delete talent list")); }
  }

  return (
    <RecruiterPage>
      <PageHeader eyebrow="Shared sourcing" title="Talent lists" description="Organize promising developers into focused, reusable shortlists." actions={<Button onClick={() => setShowCreate((open) => !open)}><Plus size={16} />New list</Button>} />
      {showCreate && <Card className="mb-6 p-5"><form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row"><label className="sr-only" htmlFor="list-name">Talent list name</label><input id="list-name" autoFocus value={newPoolName} onChange={(event) => setNewPoolName(event.target.value)} placeholder="e.g. Backend shortlist · Q4" className={`${controlClassName} flex-1`} /><Button type="submit" loading={creating} disabled={!newPoolName.trim()}>Create list</Button><Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button></form></Card>}
      {error ? <ErrorState description={error} action={<Button variant="secondary" onClick={loadPools}>Try again</Button>} /> : loading ? <LoadingState label="Loading talent lists" /> : pools.length === 0 ? <EmptyState title="Build your first talent list" description="Save developers from Talent Search and keep a shortlist ready for the next role." action={<Button onClick={() => setShowCreate(true)}>Create talent list</Button>} /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pools.map((pool) => <Card key={pool.id} className="group p-5"><div className="flex items-start justify-between"><span className="rounded-xl bg-orange-500/10 p-2 text-orange-400"><Bookmark size={20} weight="fill" /></span><button aria-label={`Delete ${pool.name}`} onClick={() => setDeletePool(pool)} className="rounded-lg p-2 text-gray-600 opacity-100 hover:bg-red-500/10 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100"><Trash size={16} /></button></div><h2 className="mt-5 font-semibold text-white">{pool.name}</h2><p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500"><Users size={15} />{pool.member_count || 0} developers</p><p className="mt-4 border-t border-white/[0.06] pt-4 text-xs text-gray-600">Shared across your recruiting organization</p></Card>)}
        </div>
      )}
      <ConfirmDialog isOpen={Boolean(deletePool)} onClose={() => setDeletePool(null)} onConfirm={handleDelete} title="Delete talent list?" message={`This removes “${deletePool?.name || "this list"}”. Developer profiles are not deleted.`} confirmText="Delete list" variant="danger" />
    </RecruiterPage>
  );
}
