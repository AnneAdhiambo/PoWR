"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { recruiterApiClient } from "../../lib/recruiterApi";

type RecruiterRole = "owner" | "admin" | "recruiter" | "hiring_manager" | "interviewer";

interface RecruiterIdentity {
  id: number;
  email: string;
  companyName: string;
  plan: string;
}

interface OrganizationIdentity {
  id?: number;
  displayName: string;
  hostname?: string;
}

interface RecruiterContextValue {
  recruiter: RecruiterIdentity | null;
  organization: OrganizationIdentity | null;
  role: RecruiterRole | null;
  loading: boolean;
  canManageOrganization: boolean;
  canManageJobs: boolean;
  canMoveCandidates: boolean;
  refresh: () => Promise<void>;
}

const RecruiterContext = createContext<RecruiterContextValue | null>(null);

export function RecruiterContextProvider({ children }: { children: React.ReactNode }) {
  const [recruiter, setRecruiter] = useState<RecruiterIdentity | null>(null);
  const [organization, setOrganization] = useState<OrganizationIdentity | null>(null);
  const [role, setRole] = useState<RecruiterRole | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [{ recruiter: me }, { organization: org }, { members }] = await Promise.all([
        recruiterApiClient.getMe(),
        recruiterApiClient.getOrganizationProfile(),
        recruiterApiClient.getTeamMembers(),
      ]);
      const membership = members.find((member) => member.email?.toLowerCase() === me.email?.toLowerCase());
      setRecruiter(me);
      setOrganization({
        id: org.id,
        displayName: org.display_name || me.companyName || "Your organization",
        hostname: org.hostname,
      });
      setRole((membership?.role || "recruiter") as RecruiterRole);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  const value = useMemo<RecruiterContextValue>(() => {
    const canManageOrganization = role === "owner" || role === "admin";
    const canManageJobs = canManageOrganization || role === "recruiter" || role === "hiring_manager";
    return {
      recruiter,
      organization,
      role,
      loading,
      canManageOrganization,
      canManageJobs,
      canMoveCandidates: canManageJobs,
      refresh,
    };
  }, [recruiter, organization, role, loading]);

  return <RecruiterContext.Provider value={value}>{children}</RecruiterContext.Provider>;
}

export function useRecruiterContext() {
  const context = useContext(RecruiterContext);
  if (!context) throw new Error("useRecruiterContext must be used inside RecruiterContextProvider");
  return context;
}
