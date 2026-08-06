"use client";

import type { CSSProperties } from "react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightIcon,
  Briefcase01Icon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  Globe01Icon,
  MarkerPin01Icon,
  SearchLgIcon,
  Star01Icon,
} from "@untitledui/icons-react/outline";
import { Pagination, Select } from "../components/ui";
import { apiClient } from "../lib/api";
import { savedItems } from "../lib/savedItems";

function formatPosted(date?: string) {
  if (!date) return "Recently";
  const days = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

interface PublicJob {
  id: string;
  publicSlug?: string;
  organizationSlug?: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  posted: string;
  description: string;
  tags: string[];
  department?: string;
  remotePolicy?: string;
  seniority?: string;
  createdAt?: string;
}

interface TenantProfile {
  logoUrl?: string;
  primaryColor?: string;
  summary?: string;
  location?: string;
  website?: string;
  benefits?: string[];
}

interface Tenant {
  display_name: string;
  profile?: TenantProfile;
}

const typeOptions = [
  { value: "all", label: "All employment types" },
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
];

const sortOptions = [
  { value: "recent", label: "Most recent" },
  { value: "title", label: "Job title" },
];

function JobsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const highlightedRef = useRef<HTMLDivElement>(null);
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantUnavailable, setTenantUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [employmentType, setEmploymentType] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const pageSize = 8;

  useEffect(() => {
    const isTenant = window.location.hostname.endsWith(".powr.localhost") || window.location.hostname.endsWith(".powr.dev");
    const tenantRequest = isTenant
      ? apiClient.getTenantContext().then(({ organization }) => setTenant(organization)).catch(() => setTenantUnavailable(true))
      : Promise.resolve();

    setSavedJobIds(new Set(savedItems.getSavedJobs().map((job) => job.id)));

    Promise.all([
      tenantRequest,
      apiClient.getJobs({ limit: 100 }).then(({ jobs: responseJobs }) => {
        setJobs(responseJobs.map((job) => ({
          id: job.public_slug || String(job.id),
          publicSlug: job.public_slug,
          organizationSlug: job.organization_slug,
          title: job.title,
          company: job.company,
          location: job.location,
          salary: job.salary || "",
          type: job.type || "full-time",
          posted: formatPosted(job.created_at),
          description: job.description || "",
          tags: job.tags || [],
          department: job.department,
          remotePolicy: job.remote_policy,
          seniority: job.seniority,
          createdAt: job.created_at,
        })));
      }),
    ]).finally(() => setLoading(false));
  }, []);

  const filteredJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedLocation = locationQuery.trim().toLowerCase();
    return jobs
      .filter((job) => employmentType === "all" || job.type === employmentType)
      .filter((job) => !normalizedQuery || [job.title, job.company, job.department, job.seniority, ...job.tags].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedQuery)))
      .filter((job) => !normalizedLocation || [job.location, job.remotePolicy].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedLocation)))
      .sort((left, right) => sort === "title" ? left.title.localeCompare(right.title) : new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  }, [jobs, query, locationQuery, employmentType, sort]);

  const totalPages = Math.ceil(filteredJobs.length / pageSize);
  const visibleJobs = filteredJobs.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [query, locationQuery, employmentType, sort]);

  useEffect(() => {
    if (!highlightId || jobs.length === 0) return;
    const index = filteredJobs.findIndex((job) => job.id === highlightId);
    if (index < 0) return;
    setPage(Math.floor(index / pageSize) + 1);
    const timeout = window.setTimeout(() => highlightedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
    return () => window.clearTimeout(timeout);
  }, [highlightId, jobs.length, filteredJobs]);

  function openJob(job: PublicJob) {
    const identifier = job.publicSlug || job.id;
    const isLocal = window.location.hostname === "localhost" || window.location.hostname.endsWith(".powr.localhost");
    if (job.organizationSlug && !window.location.hostname.startsWith(`${job.organizationSlug}.`)) {
      const hostname = `${job.organizationSlug}.${isLocal ? "powr.localhost:3000" : "powr.dev"}`;
      window.location.assign(`${window.location.protocol}//${hostname}/jobs/${identifier}`);
      return;
    }
    router.push(`/jobs/${identifier}`);
  }

  function toggleSaved(job: PublicJob) {
    const next = new Set(savedJobIds);
    if (next.has(job.id)) {
      savedItems.unsaveJob(job.id);
      next.delete(job.id);
    } else {
      savedItems.saveJob({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        type: job.type,
        posted: job.posted,
        description: job.description,
        tags: job.tags,
      });
      next.add(job.id);
    }
    setSavedJobIds(next);
  }

  if (tenantUnavailable) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0c0f] px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-xl bg-white/[0.04] text-gray-400"><Briefcase01Icon className="size-6" /></div>
          <h1 className="text-2xl font-semibold text-white">Careers site unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">This organization careers site does not exist or is not currently active.</p>
          <button onClick={() => router.replace("/")} className="mt-6 rounded-lg border border-white/[0.1] px-4 py-2 text-sm text-gray-300 hover:bg-white/[0.05]">Return to PoWR</button>
        </div>
      </main>
    );
  }

  const accent = tenant?.profile?.primaryColor || "#ff5500";

  return (
    <div className="min-h-screen bg-[#0b0c0f] text-white" style={{ "--tenant-accent": accent } as CSSProperties}>
      <header className="bg-[#0d0e12]">
        <div className="mx-auto flex max-w-[1220px] items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {tenant?.profile?.logoUrl ? <img src={tenant.profile.logoUrl} alt={`${tenant.display_name} logo`} className="size-11 rounded-xl object-cover" /> : tenant ? <div className="flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ backgroundColor: accent }}>{tenant.display_name.slice(0, 1).toUpperCase()}</div> : <img src="/logo.png" alt="PoWR" className="size-12 object-contain" />}
            <div className="min-w-0"><p className="truncate text-base font-semibold text-white">{tenant?.display_name || "PoWR Jobs"}</p><p className="truncate text-xs text-gray-500">{tenant ? `Careers at ${tenant.display_name}` : "Work where proof matters"}</p></div>
          </div>
          <div className="flex items-center gap-4">
            {tenant?.profile?.website && <a href={tenant.profile.website} target="_blank" rel="noreferrer" className="hidden items-center gap-2 text-sm text-gray-400 hover:text-white sm:flex"><Globe01Icon className="size-4" />Company website</a>}
            <span className="flex items-center gap-2 text-xs text-gray-600">Powered by <img src="/logo.png" alt="PoWR" className="size-6 object-contain" /></span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1220px] px-5 py-10 sm:px-8 sm:py-14">
        <section className="max-w-3xl">
          <p className="text-sm font-medium" style={{ color: accent }}>{tenant ? `Join ${tenant.display_name}` : "Developer opportunities"}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">{tenant ? `Do work that matters at ${tenant.display_name}.` : "Find work that values what you can prove."}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-400">{tenant?.profile?.summary || (tenant ? `Explore open roles at ${tenant.display_name}, understand the work clearly, and apply with evidence from what you have already built.` : "Search opportunities from teams hiring developers through real work evidence, not polished claims alone.")}</p>
        </section>

        <section aria-label="Search jobs" className="mt-9">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_200px]">
            <label className="group flex h-14 items-center gap-3 rounded-xl bg-[#121317] px-4 transition-colors focus-within:bg-[#18191e]">
              <SearchLgIcon className="size-5 shrink-0 text-gray-500 transition-colors group-focus-within:text-orange-500" />
              <input aria-label="Search job title or skill" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search jobs or skills" className="jobs-search-input min-w-0 flex-1 text-[15px] text-white placeholder:text-gray-600" />
            </label>
            <label className="group flex h-14 items-center gap-3 rounded-xl bg-[#121317] px-4 transition-colors focus-within:bg-[#18191e]">
              <MarkerPin01Icon className="size-5 shrink-0 text-gray-500 transition-colors group-focus-within:text-orange-500" />
              <input aria-label="Search location" value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="Location or remote" className="jobs-search-input min-w-0 flex-1 text-[15px] text-white placeholder:text-gray-600" />
            </label>
            <div className="group flex h-14 items-center gap-3 rounded-xl bg-[#121317] px-4 transition-colors focus-within:bg-[#18191e] md:col-span-2 lg:col-span-1">
              <Briefcase01Icon className="size-5 shrink-0 text-gray-500 transition-colors group-focus-within:text-orange-500" />
              <Select ariaLabel="Employment type" value={employmentType} onValueChange={setEmploymentType} options={typeOptions} className="!min-h-0 !border-0 !bg-transparent !p-0 !text-[15px] !shadow-none focus:!border-0 focus:!shadow-none" />
            </div>
          </div>
        </section>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section>
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-xl font-semibold text-white">{tenant ? `Open roles at ${tenant.display_name}` : "Open jobs"}</h2>
                <p className="mt-1 text-sm text-gray-500">{loading ? "Loading roles…" : `${filteredJobs.length} ${filteredJobs.length === 1 ? "role" : "roles"} available`}</p>
              </div>
              <div className="w-full sm:w-44"><Select ariaLabel="Sort jobs" value={sort} onValueChange={setSort} options={sortOptions} /></div>
            </div>

            {loading ? (
              <div className="space-y-3" aria-label="Loading jobs">{[1, 2, 3].map((item) => <div key={item} className="h-44 animate-pulse rounded-2xl bg-white/[0.025]" />)}</div>
            ) : visibleJobs.length === 0 ? (
              <div className="rounded-2xl bg-white/[0.025] px-6 py-16 text-center">
                <Briefcase01Icon className="mx-auto size-7 text-gray-600" />
                <h3 className="mt-4 font-semibold text-white">No matching jobs</h3>
                <p className="mt-2 text-sm text-gray-500">Try another title, skill, location, or employment type.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleJobs.map((job) => (
                  <div key={job.id} ref={job.id === highlightId ? highlightedRef : null} className={`group rounded-2xl p-5 transition-colors sm:p-6 ${job.id === highlightId ? "bg-[#18191e]" : "bg-[#121317] hover:bg-[#16171b]"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <button type="button" onClick={() => openJob(job)} className="min-w-0 flex-1 cursor-pointer text-left">
                        <h3 className="text-lg font-semibold text-white group-hover:underline group-hover:decoration-white/30 group-hover:underline-offset-4">{job.title}</h3>
                        <p className="mt-1 text-sm text-gray-400">{job.company}</p>
                      </button>
                      <button type="button" onClick={() => toggleSaved(job)} aria-label={`${savedJobIds.has(job.id) ? "Unsave" : "Save"} ${job.title}`} className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-500 hover:bg-white/[0.05] hover:text-white">
                        <Star01Icon className={`size-[19px] ${savedJobIds.has(job.id) ? "fill-current" : ""}`} style={savedJobIds.has(job.id) ? { color: accent } : undefined} />
                      </button>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5"><MarkerPin01Icon className="size-[15px]" />{job.location}</span>
                      <span className="flex items-center gap-1.5 capitalize"><Briefcase01Icon className="size-[15px]" />{job.type.replace("-", " ")}</span>
                      {job.salary && <span className="flex items-center gap-1.5"><CurrencyDollarIcon className="size-[15px]" />{job.salary}</span>}
                      <span className="flex items-center gap-1.5"><ClockIcon className="size-[15px]" />{job.posted}</span>
                    </div>
                    {job.description && <p className="mt-4 line-clamp-2 text-sm leading-6 text-gray-400">{job.description}</p>}
                    <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div className="flex flex-wrap gap-2">{job.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-md bg-white/[0.045] px-2.5 py-1 text-xs text-gray-400">{tag}</span>)}</div>
                      <button type="button" onClick={() => openJob(job)} className="inline-flex shrink-0 cursor-pointer items-center gap-2 self-start text-sm font-semibold text-orange-500 hover:text-orange-300 sm:self-auto">View details<ArrowRightIcon className="size-[15px]" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </section>

          <aside className="space-y-4 lg:sticky lg:top-6">
            <div className="rounded-2xl bg-[#121317] p-5">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-600">About the company</p>
              <h2 className="mt-3 text-lg font-semibold text-white">{tenant?.display_name || "Hiring through PoWR"}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-400">{tenant?.profile?.summary || "A team that values demonstrated ability, thoughtful work, and transparent hiring decisions."}</p>
              {tenant?.profile?.location && <p className="mt-4 flex items-center gap-2 text-sm text-gray-500"><MarkerPin01Icon className="size-4" />{tenant.profile.location}</p>}
              {tenant?.profile?.website && <a href={tenant.profile.website} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-gray-300">Visit company website<ArrowRightIcon className="size-[15px]" /></a>}
            </div>
            {tenant?.profile?.benefits && tenant.profile.benefits.length > 0 && <div className="rounded-2xl bg-[#121317] p-5"><h2 className="text-sm font-semibold text-white">Why join us</h2><div className="mt-4 space-y-3">{tenant.profile.benefits.slice(0, 5).map((benefit) => <p key={benefit} className="flex gap-2 text-sm leading-5 text-gray-400"><CheckCircleIcon className="mt-0.5 size-[17px] shrink-0" style={{ color: accent }} />{benefit}</p>)}</div></div>}
            <div className="rounded-2xl bg-[#121317] p-5">
              <h2 className="text-sm font-semibold text-white">Your work speaks here</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">PoWR helps hiring teams understand what you have built and how your experience fits the role.</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function JobsPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#0b0c0f]" />}><JobsPageContent /></Suspense>;
}
