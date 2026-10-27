"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  Search,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import {
  getRecruiterAnalytics,
  RecruiterAnalytics,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusClasses(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-green-50 text-green-700 border-green-200";

    case "CLOSED":
      return "bg-slate-100 text-slate-700 border-slate-200";

    case "DRAFT":
      return "bg-amber-50 text-amber-700 border-amber-200";

    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function formatActivityDate(date?: string) {
  if (!date) {
    return "—";
  }

  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

function PipelineItem({
  label,
  value,
  total,
  className,
}: {
  label: string;
  value: number;
  total: number;
  className: string;
}) {
  const percentage =
    total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          {label}
        </span>

        <span className="text-sm font-semibold text-slate-900">
          {value}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${className}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="mt-1 text-xs text-slate-400">
        {percentage}% of applications
      </p>
    </div>
  );
}

export default function RecruiterAnalyticsPage() {
  const [analytics, setAnalytics] =
    useState<RecruiterAnalytics | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [jobSearch, setJobSearch] = useState("");

  const loadAnalytics = useCallback(
  async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      setError("");

      const token = getAccessToken();

      if (!token) {
        throw new Error("Authentication required.");
      }

      const data = await getRecruiterAnalytics(token);

      setAnalytics(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load analytics."
      );
    } finally {
      setLoading(false);
    }
  },
  []
);

useEffect(() => {
  const timeoutId = window.setTimeout(() => {
    void loadAnalytics(false);
  }, 0);

  return () => window.clearTimeout(timeoutId);
}, [loadAnalytics]);

  const filteredJobs = useMemo(() => {
    if (!analytics) {
      return [];
    }

    const search = jobSearch.trim().toLowerCase();

    if (!search) {
      return analytics.job_performance;
    }

    return analytics.job_performance.filter((job) =>
      job.job_title.toLowerCase().includes(search)
    );
  }, [analytics, jobSearch]);

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-2xl bg-slate-200"
              />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !analytics) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-800">
            Unable to load analytics
          </h2>

          <p className="mt-2 text-sm text-red-600">
            {error || "No analytics data available."}
          </p>

          <button
            onClick={() => loadAnalytics()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </AppShell>
    );
  }

  const { overview, application_pipeline } =
    analytics;

  const maxApplications = Math.max(
    ...analytics.application_activity.map(
      (item) => item.applications
    ),
    1
  );

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">
              Recruiter Analytics
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Recruitment Overview
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Monitor your jobs, candidates, applications, and
              hiring pipeline from one place.
            </p>
          </div>

          <button
            onClick={() => loadAnalytics()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Activity className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Overview cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Jobs"
            value={overview.total_jobs}
            icon={<BriefcaseBusiness className="h-5 w-5" />}
            description={`${overview.active_jobs} active jobs`}
          />

          <StatCard
            title="Candidates"
            value={overview.total_candidates}
            icon={<Users className="h-5 w-5" />}
            description="Unique candidates"
          />

          <StatCard
            title="Applications"
            value={overview.total_applications}
            icon={<FileText className="h-5 w-5" />}
            description="Applications received"
          />

          <StatCard
            title="Hired"
            value={overview.hired}
            icon={<CheckCircle2 className="h-5 w-5" />}
            description="Successful hires"
          />
        </div>

        {/* Job status + application status */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Job overview */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Job Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current status of your job postings.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-xs font-medium text-green-600">
                  Active
                </p>

                <p className="mt-2 text-2xl font-bold text-green-700">
                  {overview.active_jobs}
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-xs font-medium text-amber-600">
                  Draft
                </p>

                <p className="mt-2 text-2xl font-bold text-amber-700">
                  {overview.draft_jobs}
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 p-4">
                <p className="text-xs font-medium text-slate-600">
                  Closed
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-700">
                  {overview.closed_jobs}
                </p>
              </div>
            </div>
          </section>

          {/* Application pipeline */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Application Pipeline
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                See how applications move through your hiring
                process.
              </p>
            </div>

            <div className="space-y-5">
              <PipelineItem
                label="Applied"
                value={application_pipeline.applied}
                total={overview.total_applications}
                className="bg-blue-500"
              />

              <PipelineItem
                label="Pending"
                value={application_pipeline.pending}
                total={overview.total_applications}
                className="bg-amber-500"
              />

              <PipelineItem
                label="Reviewed"
                value={application_pipeline.reviewed}
                total={overview.total_applications}
                className="bg-indigo-500"
              />

              <PipelineItem
                label="Shortlisted"
                value={application_pipeline.shortlisted}
                total={overview.total_applications}
                className="bg-green-500"
              />

              <PipelineItem
                label="Rejected"
                value={application_pipeline.rejected}
                total={overview.total_applications}
                className="bg-red-500"
              />

              <PipelineItem
                label="Hired"
                value={application_pipeline.hired}
                total={overview.total_applications}
                className="bg-emerald-600"
              />
            </div>
          </section>
        </div>

        {/* Application activity */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Application Activity
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Applications received during the last 30 days.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              30-day activity
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-\[720px]">
              <div className="flex h-64 items-end gap-1 border-b border-l border-slate-200 px-3">
                {analytics.application_activity.map(
                  (item) => {
                    const height =
                      item.applications === 0
                        ? 2
                        : Math.max(
                            6,
                            (item.applications /
                              maxApplications) *
                              100
                          );

                    return (
                      <div
                        key={item.date}
                        className="group flex h-full flex-1 items-end justify-center"
                      >
                        <div className="relative flex h-full w-full items-end justify-center">
                          <div
                            className="w-full max-w-5 rounded-t bg-blue-500 transition hover:bg-blue-600"
                            style={{
                              height: `${height}%`,
                            }}
                            title={`${item.applications} applications on ${item.date}`}
                          >
                            <div className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs text-white group-hover:block">
                              {item.applications}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              <div className="mt-3 flex justify-between px-3 text-[10px] text-slate-400">
                <span>
                  {formatActivityDate(
                    analytics.application_activity[0]
                      ?.date
                  )}
                </span>

                <span>
                  {formatActivityDate(
                    analytics.application_activity[
                      Math.floor(
                        analytics.application_activity
                          .length / 2
                      )
                    ]?.date
                  )}
                </span>

                <span>
                  {formatActivityDate(
                    analytics.application_activity[
                      analytics.application_activity.length -
                        1
                    ]?.date
                  )}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Job performance */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Job Performance
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Compare application and hiring activity across
                  your jobs.
                </p>
              </div>

              <div className="relative w-full lg:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={jobSearch}
                  onChange={(event) =>
                    setJobSearch(event.target.value)
                  }
                  placeholder="Search jobs..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <BriefcaseBusiness className="mx-auto h-10 w-10 text-slate-300" />

              <p className="mt-3 text-sm font-medium text-slate-700">
                No jobs found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Try changing your search.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-\[760px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Job
                    </th>

                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Applications
                    </th>

                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Shortlisted
                    </th>

                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Hired
                    </th>

                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Rejected
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredJobs.map((job) => (
                    <tr
                      key={job.job_id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">
                          {job.job_title}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                            job.status
                          )}`}
                        >
                          {formatStatus(job.status)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="font-semibold text-slate-900">
                          {job.application_count}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="font-semibold text-green-600">
                          {job.shortlisted_count}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="font-semibold text-emerald-600">
                          {job.hired_count}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="font-semibold text-red-600">
                          {job.rejected_count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Hiring summary */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-amber-600" />

              <span className="text-sm font-medium text-slate-600">
                Pending Review
              </span>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900">
              {overview.pending}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-indigo-600" />

              <span className="text-sm font-medium text-slate-600">
                Reviewed
              </span>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900">
              {overview.reviewed}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />

              <span className="text-sm font-medium text-slate-600">
                Shortlisted
              </span>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900">
              {overview.shortlisted}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-600" />

              <span className="text-sm font-medium text-slate-600">
                Rejected
              </span>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900">
              {overview.rejected}
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
