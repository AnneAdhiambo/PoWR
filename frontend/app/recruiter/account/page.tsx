"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowSquareOut, Copy, Users } from "phosphor-react";
import toast from "react-hot-toast";
import { useRecruiterContext } from "../../components/recruiter/RecruiterContext";
import { Button, Card, LoadingState, PageHeader, RecruiterPage, controlClassName } from "../../components/ui";
import { recruiterApiClient } from "../../lib/recruiterApi";

export default function RecruiterAccountPage() {
  const { recruiter, canManageOrganization, refresh } = useRecruiterContext();
  const [organization, setOrganization] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({ display_name: "", summary: "", website: "", location: "", logo_url: "", benefits: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    recruiterApiClient.getOrganizationProfile()
      .then(({ organization: organizationData }) => {
        setOrganization(organizationData);
        const profile = organizationData.profile || {};
        setProfileForm({
          display_name: organizationData.display_name || recruiter?.companyName || "",
          summary: profile.summary || "",
          website: profile.website || "",
          location: profile.location || "",
          logo_url: profile.logoUrl || "",
          benefits: Array.isArray(profile.benefits) ? profile.benefits.join(", ") : "",
        });
      })
      .catch(() => toast.error("Failed to load company settings"))
      .finally(() => setLoading(false));
  }, [recruiter?.companyName]);

  async function saveOrganizationProfile() {
    setSavingProfile(true);
    try {
      const { organization: updated } = await recruiterApiClient.updateOrganizationProfile({
        ...profileForm,
        benefits: profileForm.benefits.split(",").map((benefit) => benefit.trim()).filter(Boolean),
      });
      setOrganization((current: any) => ({ ...current, ...updated }));
      await refresh();
      toast.success("Company settings saved");
    } catch (error: any) {
      toast.error(error.message || "Could not update company settings");
    } finally {
      setSavingProfile(false);
    }
  }

  if (loading) return <RecruiterPage><LoadingState label="Loading company settings" /></RecruiterPage>;

  const workspaceHost = organization?.hostname || "your-company.powr.dev";
  const careersUrl = `https://${workspaceHost}/jobs`;

  return (
    <RecruiterPage className="max-w-4xl">
      <PageHeader
        eyebrow="Company"
        title="Company settings"
        description="Manage the company information and branding candidates see on your public careers page."
        actions={<Link href="/recruiter/team" className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-medium text-gray-300 hover:border-white/20 hover:text-white"><Users size={16} />Team members</Link>}
      />

      <Card className="mb-6 p-5">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-subtle)]">Public careers page</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><p className="truncate text-sm font-medium text-white">{careersUrl}</p><p className="mt-1 text-xs text-[var(--text-muted)]">Published jobs appear here under your company identity.</p></div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(careersUrl)}><Copy size={15} />Copy</Button>
            <a href={careersUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4 py-2 text-sm font-medium text-gray-300 hover:text-white">Open<ArrowSquareOut size={15} /></a>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div><h2 className="text-base font-semibold text-white">Company profile</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Keep this concise and useful for candidates deciding whether to apply.</p></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-gray-300">Company name<input disabled={!canManageOrganization} value={profileForm.display_name} onChange={(event) => setProfileForm((current) => ({ ...current, display_name: event.target.value }))} className={`mt-2 ${controlClassName}`} /></label>
          <label className="text-sm text-gray-300">Location<input disabled={!canManageOrganization} value={profileForm.location} onChange={(event) => setProfileForm((current) => ({ ...current, location: event.target.value }))} className={`mt-2 ${controlClassName}`} /></label>
          <label className="text-sm text-gray-300">Website<input disabled={!canManageOrganization} type="url" value={profileForm.website} onChange={(event) => setProfileForm((current) => ({ ...current, website: event.target.value }))} className={`mt-2 ${controlClassName}`} /></label>
          <label className="text-sm text-gray-300">Logo URL<input disabled={!canManageOrganization} type="url" value={profileForm.logo_url} onChange={(event) => setProfileForm((current) => ({ ...current, logo_url: event.target.value }))} className={`mt-2 ${controlClassName}`} /></label>
          <label className="text-sm text-gray-300 sm:col-span-2">Company summary<textarea disabled={!canManageOrganization} rows={4} value={profileForm.summary} onChange={(event) => setProfileForm((current) => ({ ...current, summary: event.target.value }))} className={`mt-2 ${controlClassName}`} /></label>
          <label className="text-sm text-gray-300 sm:col-span-2">Benefits, comma separated<input disabled={!canManageOrganization} value={profileForm.benefits} onChange={(event) => setProfileForm((current) => ({ ...current, benefits: event.target.value }))} className={`mt-2 ${controlClassName}`} /></label>
        </div>
        {canManageOrganization ? <Button type="button" onClick={saveOrganizationProfile} loading={savingProfile} className="mt-5">Save company settings</Button> : <p className="mt-5 text-sm text-[var(--text-muted)]">Only owners and admins can edit company settings.</p>}
      </Card>
    </RecruiterPage>
  );
}
