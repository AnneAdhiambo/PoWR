"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { recruiterApiClient } from "../../lib/recruiterApi";
import { Button, Card, LoadingState, PageHeader, RecruiterPage, controlClassName } from "../../components/ui";
import { useRecruiterContext } from "../../components/recruiter/RecruiterContext";
import { Crown, Check, Buildings, EnvelopeSimple, CreditCard, Lightning, ArrowRight } from "phosphor-react";
import toast from "react-hot-toast";


export default function RecruiterAccountPage() {
  const { canManageOrganization, refresh } = useRecruiterContext();
  const router = useRouter();
  const [recruiter, setRecruiter] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({ display_name: "", summary: "", website: "", location: "", logo_url: "", benefits: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const workspaceHost = organization?.hostname
    ? organization.hostname
    : "your-company.powr.dev";

  useEffect(() => {
    if (!localStorage.getItem("recruiter_token")) {
      router.replace("/recruiter/auth");
      return;
    }
    loadRecruiter();
  }, [router]);

  const loadRecruiter = async () => {
    setLoading(true);
    try {
      const [{ recruiter: data }, { organization: organizationData }] = await Promise.all([recruiterApiClient.getMe(), recruiterApiClient.getOrganizationProfile()]);
      setRecruiter(data);
      setOrganization(organizationData);
      const profile = organizationData.profile || {};
      setProfileForm({
        display_name: organizationData.display_name || data.companyName || "",
        summary: profile.summary || "",
        website: profile.website || "",
        location: profile.location || "",
        logo_url: profile.logoUrl || "",
        benefits: Array.isArray(profile.benefits) ? profile.benefits.join(", ") : "",
      });
      localStorage.setItem("recruiter_plan", data.plan || "free");
    } catch {
      toast.error("Failed to load account");
    } finally {
      setLoading(false);
    }
  };

  const saveOrganizationProfile = async () => {
    setSavingProfile(true);
    try {
      const { organization: updated } = await recruiterApiClient.updateOrganizationProfile({
        ...profileForm,
        benefits: profileForm.benefits.split(",").map((benefit) => benefit.trim()).filter(Boolean),
      });
      setOrganization((current: any) => ({ ...current, ...updated }));
      await refresh();
      toast.success("Organization profile updated");
    } catch (error: any) {
      toast.error(error.message || "Could not update organization profile");
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <RecruiterPage><LoadingState label="Loading organization workspace" /></RecruiterPage>
    );
  }

  return (
    <RecruiterPage className="max-w-4xl">
        <PageHeader eyebrow="Organization" title="Careers & account" description="Manage the identity candidates see and the workspace your hiring team uses." />

        {/* Profile card */}
        {recruiter && (
          <Card className="p-5 mb-8">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-4">Profile</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <EnvelopeSimple className="w-4 h-4 text-gray-500" weight="regular" />
                <span className="text-sm text-white">{recruiter.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Buildings className="w-4 h-4 text-gray-500" weight="regular" />
                <span className="text-sm text-white">{recruiter.companyName}</span>
                {recruiter.companySize && (
                  <span className="text-xs text-gray-500">({recruiter.companySize})</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Crown className="w-4 h-4 text-gray-500" weight="regular" />
                <span className="text-sm capitalize text-white">{recruiter.plan} plan</span>
                {recruiter.plan !== "free" && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-[rgba(255,85,0,0.15)] text-[#FF5500] border border-[#FF5500]/30 capitalize">
                    Active
                  </span>
                )}
              </div>
            </div>
          </Card>
        )}

        <Card className="p-5 mb-8">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Organization workspace</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">{recruiter?.companyName || "Your company"}</h2>
              <p className="mt-1 text-sm text-gray-400">Public careers site</p>
              <p className="mt-2 break-all text-sm text-[#FF5500]">https://{workspaceHost}/jobs</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(`https://${workspaceHost}/jobs`)}>
              Copy link
            </Button>
          </div>
        </Card>

        <Card className="p-5 mb-8">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-4">Public company profile</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-gray-300">Company name<input disabled={!canManageOrganization} value={profileForm.display_name} onChange={(event) => setProfileForm((current) => ({ ...current, display_name: event.target.value }))} className={`mt-2 ${controlClassName}`} /></label>
            <label className="text-sm text-gray-300">Location<input disabled={!canManageOrganization} value={profileForm.location} onChange={(event) => setProfileForm((current) => ({ ...current, location: event.target.value }))} className={`mt-2 ${controlClassName}`} /></label>
            <label className="text-sm text-gray-300">Website<input disabled={!canManageOrganization} type="url" value={profileForm.website} onChange={(event) => setProfileForm((current) => ({ ...current, website: event.target.value }))} className={`mt-2 ${controlClassName}`} /></label>
            <label className="text-sm text-gray-300">Logo URL<input disabled={!canManageOrganization} type="url" value={profileForm.logo_url} onChange={(event) => setProfileForm((current) => ({ ...current, logo_url: event.target.value }))} className={`mt-2 ${controlClassName}`} /></label>
            <label className="text-sm text-gray-300 sm:col-span-2">Summary<textarea disabled={!canManageOrganization} rows={3} value={profileForm.summary} onChange={(event) => setProfileForm((current) => ({ ...current, summary: event.target.value }))} className={`mt-2 ${controlClassName}`} /></label>
            <label className="text-sm text-gray-300 sm:col-span-2">Benefits, comma separated<input disabled={!canManageOrganization} value={profileForm.benefits} onChange={(event) => setProfileForm((current) => ({ ...current, benefits: event.target.value }))} className={`mt-2 ${controlClassName}`} /></label>
          </div>
          {canManageOrganization ? <Button type="button" onClick={saveOrganizationProfile} loading={savingProfile} className="mt-5">Save company profile</Button> : <p className="mt-5 text-sm text-gray-500">Only organization owners and admins can edit public branding.</p>}
        </Card>

        {/* Billing card */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-4">Billing</p>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[rgba(255,85,0,0.12)] flex items-center justify-center">
                  {recruiter?.plan === "free"
                    ? <CreditCard className="w-4.5 h-4.5 text-[#FF5500]" weight="fill" />
                    : <Lightning className="w-4.5 h-4.5 text-[#FF5500]" weight="fill" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white capitalize">{recruiter?.plan || "free"} Plan</p>
                  <p className="text-xs text-gray-500">
                    {recruiter?.plan === "free"
                      ? "10 profile views / month · No outreach"
                      : recruiter?.plan === "pro"
                      ? "Unlimited views · 50 outreach / month"
                      : "Unlimited everything · Team seats · API access"}
                  </p>
                </div>
              </div>
              {recruiter?.plan !== "free" && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  Active
                </span>
              )}
            </div>

            {recruiter?.plan === "free" && (
              <div className="mb-4 p-3 rounded-lg bg-[rgba(255,85,0,0.06)] border border-[#FF5500]/15">
                <p className="text-xs text-gray-300 mb-2.5">Unlock unlimited access with Pro</p>
                <ul className="space-y-1.5 mb-0">
                  {["Unlimited profile views", "50 outreach messages / month", "Saved talent pools"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
                      <Check className="w-3 h-3 text-[#FF5500] flex-shrink-0" weight="bold" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Link
              href="/recruiter/billing"
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                recruiter?.plan === "free"
                  ? "bg-[#FF5500] hover:bg-[#e04d00] text-white"
                  : "bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] text-gray-300 hover:text-white"
              }`}
            >
              {recruiter?.plan === "free" ? (
                <>Upgrade to Pro <ArrowRight className="w-3.5 h-3.5" weight="bold" /></>
              ) : (
                <>Manage Billing <ArrowRight className="w-3.5 h-3.5" weight="bold" /></>
              )}
            </Link>
          </Card>
        </div>
    </RecruiterPage>
  );
}
