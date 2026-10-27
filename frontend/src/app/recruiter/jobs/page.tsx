"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  FileText,
  MapPin,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";

import {
  apiRequest,
  getMyCompanyMemberships,
  getRecruiterApplications,
  getRecruiterJobs,
  getCompany,
  type Company,
  type Application,
  type CompanyMembership,
  type Job,
} from "@/lib/api";

import { getAccessToken } from "@/lib/auth";

function RecruiterJobsContent() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [memberships, setMemberships] = useState<
  CompanyMembership[]
>([]);
  const [applications, setApplications] = useState<
    Application[]
  >([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCompanyId = searchParams.get("company_id");

  const [selectedCompany, setSelectedCompany] =
  useState<Company | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionJobId, setActionJobId] = useState<string | null>(
    null,
  );

  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(
    null,
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("ALL");


  useEffect(() => {
    let cancelled = false;

    async function fetchJobs() {
      setLoading(true);
      setError(null);

      const token = getAccessToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const [
        recruiterJobs,
        recruiterApplications,
        recruiterMemberships,
        companyData,
      ] = await Promise.all([
        getRecruiterJobs(token),
        getRecruiterApplications(token),
        getMyCompanyMemberships(token),
        selectedCompanyId
          ? getCompany(selectedCompanyId, token)
          : Promise.resolve(null),
      ]);

      if (cancelled) return;

      setJobs(recruiterJobs);
      setApplications(recruiterApplications);
      setMemberships(recruiterMemberships);
      setSelectedCompany(companyData);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load jobs.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchJobs();

    return () => {
      cancelled = true;
    };
  }, [router, retryCount, selectedCompanyId]);

  const filteredJobs = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return jobs.filter((job) => {
      if (
        selectedCompanyId &&
        job.company_id !== selectedCompanyId
      ) {
        return false;
      }
      const matchesSearch =
        !normalizedSearch ||
        job.title
          .toLowerCase()
          .includes(normalizedSearch) ||
        job.location
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        job.department
          ?.toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" ||
        job.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [jobs, search, statusFilter, selectedCompanyId]);

  const activeCount = filteredJobs.filter(
    (job) => job.status === "ACTIVE",
  ).length;

  const draftCount = filteredJobs.filter(
    (job) => job.status === "DRAFT",
  ).length;

  const closedCount = filteredJobs.filter(
    (job) => job.status === "CLOSED",
  ).length;

  const applicationCountByJob = useMemo(() => {
    const counts = new Map<string, number>();

    for (const application of applications) {
      counts.set(
        application.job_id,
        (counts.get(application.job_id) || 0) + 1,
      );
    }

    return counts;
  }, [applications]);

  const membershipRoleByCompany = useMemo(
    () =>
      new Map(
        memberships.map((membership) => [
          membership.company_id,
          membership.role,
        ]),
      ),
    [memberships],
  );

  const currentUserId = memberships[0]?.user_id ?? null;

  async function handlePublish(job: Job) {
    const token = getAccessToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setActionJobId(job.id);
      setActionError(null);

      const updatedJob = await apiRequest<Job>(
        `/api/v1/jobs/${job.id}/publish`,
        {
          method: "POST",
          token,
        },
      );

      setJobs((currentJobs) =>
        currentJobs.map((currentJob) =>
          currentJob.id === updatedJob.id
            ? updatedJob
            : currentJob,
        ),
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to publish job.",
      );
    } finally {
      setActionJobId(null);
    }
  }

  async function handleClose(job: Job) {
    const confirmed = window.confirm(
      `Close "${job.title}"?\n\nCandidates will no longer be able to apply to this job.`,
    );

    if (!confirmed) {
      return;
    }

    const token = getAccessToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setActionJobId(job.id);
      setActionError(null);

      const updatedJob = await apiRequest<Job>(
        `/api/v1/jobs/${job.id}/close`,
        {
          method: "POST",
          token,
        },
      );

      setJobs((currentJobs) =>
        currentJobs.map((currentJob) =>
          currentJob.id === updatedJob.id
            ? updatedJob
            : currentJob,
        ),
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to close job.",
      );
    } finally {
      setActionJobId(null);
    }
  }

  return (
    <AppShell>
      <div className="page-container">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-medium text-blue-600">
              Recruiter workspace
            </p>

            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              {selectedCompany
                ? `${selectedCompany.name} — Jobs`
                : "Jobs"}
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Create, publish, manage, and review your
              recruitment opportunities.
            </p>
          </div>

          <Link
            href="/recruiter/jobs/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={17} />
            Create job
          </Link>
        </div>

        {/* Summary */}
        {!loading && !error && (
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <SummaryCard
              label="Active"
              value={activeCount}
              description="Currently hiring"
              icon={CheckCircle2}
            />

            <SummaryCard
              label="Drafts"
              value={draftCount}
              description="Ready to publish"
              icon={FileText}
            />

            <SummaryCard
              label="Closed"
              value={closedCount}
              description="No longer accepting"
              icon={XCircle}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
            >
              Try again
            </button>
          </div>
        )}

        {/* Action error */}
        {actionError && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">
              {actionError}
            </p>

            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-sm font-medium text-red-700 hover:text-red-900"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Jobs container */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                All jobs
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {loading
                  ? "Loading your jobs..."
                  : `${filteredJobs.length} ${
                      filteredJobs.length === 1
                        ? "job"
                        : "jobs"
                    } shown`}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {/* Search */}
              <div className="relative">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search jobs..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-64"
                />
              </div>

              {/* Status filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-40"
                >
                  <option value="ALL">
                    All statuses
                  </option>
                  <option value="ACTIVE">
                    Active
                  </option>
                  <option value="DRAFT">
                    Draft
                  </option>
                  <option value="CLOSED">
                    Closed
                  </option>
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <JobsLoadingState />
          ) : error ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-slate-500">
                Jobs could not be loaded. Please retry above.
              </p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <EmptyJobsState
              hasFilters={
                Boolean(selectedCompanyId) ||
                search.trim().length > 0 ||
                statusFilter !== "ALL"
              }
              onClearFilters={() => {
                setSearch("");
                setStatusFilter("ALL");
              }}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredJobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  applicationCount={
                    applicationCountByJob.get(
                      job.id,
                    ) || 0
                  }
                  actionLoading={
                    actionJobId === job.id
                  }
                  canManage={
                    membershipRoleByCompany.get(job.company_id) ===
                      "OWNER" ||
                    (currentUserId !== null &&
                      job.created_by === currentUserId)
                  }
                  onPublish={handlePublish}
                  onClose={handleClose}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

export default function RecruiterJobsPage() {
  return (
    <Suspense fallback={<JobsLoadingState />}>
      <RecruiterJobsContent />
    </Suspense>
  );
}

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: typeof CheckCircle2;
}) {
  return (
    <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-slate-500">
          {label}
        </p>

        <p className="mt-2 text-2xl font-semibold text-slate-900">
          {value}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          {description}
        </p>
      </div>

      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
        <Icon size={18} />
      </div>
    </div>
  );
}

function JobRow({
  job,
  applicationCount,
  actionLoading,
  canManage,
  onPublish,
  onClose,
}: {
  job: Job;
  applicationCount: number;
  actionLoading: boolean;
  canManage: boolean;
  onPublish: (job: Job) => void;
  onClose: (job: Job) => void;
}) {
  return (
    <div className="px-5 py-5 transition-colors hover:bg-slate-50/70">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        {/* Main information */}
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <BriefcaseBusiness size={19} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/recruiter/jobs/${job.id}`}
                className="truncate text-sm font-semibold text-slate-900 hover:text-blue-600"
              >
                {job.title}
              </Link>

              <StatusBadge status={job.status} />
            </div>

            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
              {job.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} />
                  {job.location}
                </span>
              )}

              {job.employment_type && (
                <span>
                  {formatEmploymentType(
                    job.employment_type,
                  )}
                </span>
              )}

              {(job.experience_min !== null ||
                job.experience_max !== null) && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 size={14} />
                  {formatExperience(
                    job.experience_min,
                    job.experience_max,
                  )}
                </span>
              )}

              <span className="inline-flex items-center gap-1.5">
                <Users size={14} />
                {applicationCount}{" "}
                {applicationCount === 1
                  ? "application"
                  : "applications"}
              </span>
              {(job.department || job.department_id) && (
                <p className="mt-1 text-xs text-slate-500">
                  Department: {job.department || "Assigned department"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 xl:min-w-[620px] xl:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/recruiter/jobs/${job.id}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Eye size={14} />
              View
            </Link>

            {canManage && job.status !== "CLOSED" && (
            <Link
              href={`/recruiter/jobs/${job.id}/edit`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Pencil size={14} />
              Edit
            </Link>
          )}

            <Link
              href={`/recruiter/jobs/${job.id}/applications`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Users size={14} />
              Applications
            </Link>

            <Link
              href={`/recruiter/jobs/${job.id}/matches`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
            >
              <Sparkles size={14} />
              AI Matches
            </Link>

            {canManage && job.status === "DRAFT" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => onPublish(job)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 size={14} />
                {actionLoading
                  ? "Publishing..."
                  : "Publish"}
              </button>
            )}

            {canManage && job.status === "ACTIVE" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => onClose(job)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <XCircle size={14} />
                {actionLoading
                  ? "Closing..."
                  : "Close"}
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400">
            Created {formatDate(job.created_at)}
            {job.published_at && (
              <>
                {" · "}Published{" "}
                {formatDate(job.published_at)}
              </>
            )}
            {job.closing_date && (
              <>
                {" · "}Closing{" "}
                {formatDate(job.closing_date)}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700"
      : status === "DRAFT"
        ? "bg-slate-100 text-slate-600"
        : "bg-amber-50 text-amber-700";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${styles}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function JobsLoadingState() {
  return (
    <div className="divide-y divide-slate-100">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="flex flex-col gap-4 px-5 py-5 xl:flex-row xl:items-center"
        >
          <div className="flex flex-1 items-center gap-4">
            <div className="h-11 w-11 shrink-0 animate-pulse rounded-lg bg-slate-100" />

            <div className="flex-1">
              <div className="h-4 w-56 animate-pulse rounded bg-slate-100" />

              <div className="mt-3 h-3 w-72 animate-pulse rounded bg-slate-100" />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="h-9 w-20 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-9 w-20 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyJobsState({
  hasFilters,
  onClearFilters,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  if (hasFilters) {
    return (
      <div className="px-5 py-16 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Search size={20} />
        </div>

        <p className="mt-4 text-sm font-semibold text-slate-900">
          No matching jobs
        </p>

        <p className="mt-1 text-sm text-slate-500">
          Try changing your search or status filter.
        </p>

        <button
          type="button"
          onClick={onClearFilters}
          className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 py-16 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <BriefcaseBusiness size={20} />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-900">
        No jobs yet
      </p>

      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        Create your first job posting to start receiving
        applications from candidates.
      </p>

      <Link
        href="/recruiter/jobs/new"
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        <Plus size={16} />
        Create job
      </Link>
    </div>
  );
}

function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function formatEmploymentType(
  value: string,
): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function formatExperience(
  minimum?: number | null,
  maximum?: number | null,
): string {
  if (
    minimum !== null &&
    minimum !== undefined &&
    maximum !== null &&
    maximum !== undefined
  ) {
    return `${minimum}-${maximum} years`;
  }

  if (
    minimum !== null &&
    minimum !== undefined
  ) {
    return `${minimum}+ years`;
  }

  if (
    maximum !== null &&
    maximum !== undefined
  ) {
    return `Up to ${maximum} years`;
  }

  return "Experience not specified";
}

function formatDate(date?: string): string {
  if (!date) {
    return "Recently";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Recently";
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
