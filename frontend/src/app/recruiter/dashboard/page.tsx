"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ArrowUpRight,
  BriefcaseBusiness,
  Clock3,
  Users,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";

import {
  getRecruiterApplications,
  getRecruiterCompanies,
  getRecruiterJobs,
  getMyCompanyMemberships,
  type Application,
  type Company,
  type CompanyMembership,
  type Job,
} from "@/lib/api";

import { getAccessToken } from "@/lib/auth";

export default function RecruiterDashboard() {

  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>(
    [],
  );
  const [companies, setCompanies] = useState<Company[]>([]);
  const [memberships, setMemberships] = useState<
    CompanyMembership[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();

      if (hour < 12) {
        setGreeting("Good morning");
      } else if (hour < 17) {
        setGreeting("Good afternoon");
      } else {
        setGreeting("Good evening");
      }
    };

    const timer = window.setTimeout(updateGreeting, 0);

    return () => window.clearTimeout(timer);
  }, []);

useEffect(() => {
  let cancelled = false;

  async function loadDashboard() {
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
        recruiterCompanies,
        recruiterMemberships
      ] = await Promise.all([
        getRecruiterJobs(token),
        getRecruiterApplications(token),
        getRecruiterCompanies(token),
        getMyCompanyMemberships(token),
      ]);

      if (cancelled) return;

      setJobs(recruiterJobs);
      setApplications(recruiterApplications);
      setCompanies(recruiterCompanies);
      setMemberships(recruiterMemberships);
    } catch (err) {
      if (cancelled) return;

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load dashboard data.",
      );
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  void loadDashboard();

  return () => {
    cancelled = true;
  };
}, [router]);

  const activeJobs = jobs.filter(
    (job) => job.status === "ACTIVE",
  ).length;

  const pendingReviews = applications.filter(
    (application) => application.status === "PENDING",
  ).length;

  const recentJobs = [...jobs]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime(),
    )
    .slice(0, 5);

  const recentApplications = [...applications]
    .sort(
      (a, b) =>
        new Date(b.applied_at ?? 0).getTime() -
        new Date(a.applied_at ?? 0).getTime(),
    )
    .slice(0, 4);

  const isCompanyOwner = memberships.some(
    (membership) => membership.role === "OWNER",
  );

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
              {greeting}, Recruiter
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Here&apos;s an overview of your recruitment
              activity.
            </p>
          </div>

          <Link
            href="/recruiter/jobs/new"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Create job
          </Link>
        </div>


        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}


        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total jobs"
            value={jobs.length}
            description="All jobs created"
            icon={BriefcaseBusiness}
            loading={loading}
          />

          <StatCard
            label="Active jobs"
            value={activeJobs}
            description="Currently hiring"
            icon={BriefcaseBusiness}
            loading={loading}
          />

          <StatCard
            label="Applications"
            value={applications.length}
            description="Applications received"
            icon={Users}
            loading={loading}
          />

          <StatCard
            label="Pending reviews"
            value={pendingReviews}
            description="Need your attention"
            icon={Clock3}
            loading={loading}
          />
        </div>

        {/* Content grid */}
        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
          {/* Jobs */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Recent jobs
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Your latest recruitment activity
                </p>
              </div>

              <Link
                href="/recruiter/jobs"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View all
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {loading ? (
                <JobLoadingState />
              ) : jobs.length === 0 ? (
                <EmptyJobsState />
              ) : (
                recentJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/recruiter/jobs/${job.id}`}
                    className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <BriefcaseBusiness size={18} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {job.title}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {job.location ||
                            "Location not specified"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:shrink-0">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          job.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700"
                            : job.status === "DRAFT"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {formatStatus(job.status)}
                      </span>

                      <ArrowUpRight
                        size={17}
                        className="text-slate-400"
                      />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* Hiring activity */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Hiring activity
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Recent application updates
              </p>
            </div>

            <div className="p-5">
              {loading ? (
                <ActivityLoadingState />
              ) : applications.length === 0 ? (
                <EmptyActivityState />
              ) : (
                <div className="space-y-5">
                  {recentApplications.map((application) => (
                      <Activity
                        key={application.id}
                        title={getApplicationActivityTitle(
                          application.status,
                        )}
                        description={`Application ${formatStatus(
                          application.status,
                        )}`}
                        time={formatDate(
                          application.applied_at,
                        )}
                      />
                    ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Company summaries */}
        {!loading && companies.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">
              Your companies
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {companies.map((company) => {
                const membership = memberships.find(
                  (item) => item.company_id === company.id,
                );

                return (
                  <div
                    key={company.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {company.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {company.location || "Location not specified"}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {membership?.role
                          ? formatStatus(membership.role)
                          : "Member"}
                      </span>
                    </div>

                    <Link
                      href={
                        membership?.role === "OWNER"
                          ? `/recruiter/companies/${company.id}`
                          : "/recruiter/jobs"
                      }
                      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      {membership?.role === "OWNER"
                        ? "Manage company"
                        : "View jobs"}
                      <ArrowUpRight size={15} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Company administration */}
        {!loading && isCompanyOwner && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Company administration
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage your company and recruitment team.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {companies
                .filter((company) =>
                  memberships.some(
                    (membership) =>
                      membership.company_id === company.id &&
                      membership.role === "OWNER",
                  ),
                )
                .map((company) => (
                  <Link
                    key={company.id}
                    href={`/recruiter/companies/${company.id}`}
                    className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Manage {company.name}
                    <ArrowUpRight
                      size={16}
                      className="ml-2"
                    />
                  </Link>
                ))}
    </div>
  </section>
)}

      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  loading,
}: {
  label: string;
  value: number;
  description: string;
  icon: typeof BriefcaseBusiness;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          {loading ? (
            <div className="mt-3 h-8 w-16 animate-pulse rounded-md bg-slate-200" />
          ) : (
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {value}
            </p>
          )}
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Icon size={19} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}

function JobLoadingState() {
  return (
    <div className="space-y-1 px-5 py-4">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="flex items-center gap-3 py-3"
        >
          <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-100" />

          <div className="flex-1">
            <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />

            <div className="mt-2 h-3 w-28 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyJobsState() {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <BriefcaseBusiness size={20} />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-900">
        No jobs yet
      </p>

      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        Create your first job posting to start receiving
        candidates.
      </p>

      <Link
        href="/recruiter/jobs/new"
        className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Create your first job
      </Link>
    </div>
  );
}

function ActivityLoadingState() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="flex gap-3"
        >
          <div className="mt-1 h-2 w-2 animate-pulse rounded-full bg-slate-200" />

          <div className="flex-1">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />

            <div className="mt-2 h-3 w-40 animate-pulse rounded bg-slate-100" />

            <div className="mt-2 h-3 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyActivityState() {
  return (
    <div className="py-8 text-center">
      <p className="text-sm font-medium text-slate-900">
        No application activity yet
      </p>

      <p className="mt-1 text-xs text-slate-500">
        Application updates will appear here.
      </p>
    </div>
  );
}

function Activity({
  title,
  description,
  time,
}: {
  title: string;
  description: string;
  time: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />

      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">
          {title}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>

        <p className="mt-1 text-[11px] text-slate-400">
          {time}
        </p>
      </div>
    </div>
  );
}

function getApplicationActivityTitle(status: string): string {
  switch (status) {
    case "PENDING":
      return "New application";

    case "REVIEWED":
      return "Application reviewed";

    case "SHORTLISTED":
      return "Candidate shortlisted";

    case "REJECTED":
      return "Application rejected";

    default:
      return "Application updated";
  }
}

function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function formatDate(date?: string): string {
  if (!date) {
    return "Recently";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Recently";
  }

  return parsed.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
}
