"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DollarSign,
  Edit3,
  FileText,
  MapPin,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import {
  apiRequest,
  getJobApplications,
  Application,
  Job,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

function formatEmploymentType(type: string) {
  return type
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not specified";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Not specified";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(parsed);
}

function formatSalary(
  min?: number | string | null,
  max?: number | string | null,
) {
  if (min == null && max == null) {
    return "Not specified";
  }

  const formatter = new Intl.NumberFormat("en-US");

  if (min != null && max != null) {
    return `${formatter.format(Number(min))} – ${formatter.format(Number(max))}`;
  }

  if (min != null) {
    return `From ${formatter.format(Number(min))}`;
  }

  return `Up to ${formatter.format(Number(max))}`;
}

function formatExperience(
  min?: number | null,
  max?: number | null,
) {
  if (min == null && max == null) {
    return "Not specified";
  }

  if (min != null && max != null) {
    return `${min} – ${max} years`;
  }

  if (min != null) {
    return `${min}+ years`;
  }

  return `Up to ${max} years`;
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  }

  if (status === "CLOSED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
        <XCircle size={13} />
        Closed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
      <Clock3 size={13} />
      Draft
    </span>
  );
}

function ApplicationStat({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "blue" | "amber" | "violet" | "emerald" | "red";
}) {
  const styles = {
    slate: "bg-slate-50 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div
        className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold ${styles[tone]}`}
      >
        {value}
      </div>

      <p className="mt-3 text-xs font-medium text-slate-500">
        {label}
      </p>
    </div>
  );
}

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const jobId = params.job_id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadJobDetails() {
      const token = getAccessToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const [jobData, applicationData] =
          await Promise.all([
            apiRequest<Job>(
              `/api/v1/jobs/${jobId}`,
              {
                method: "GET",
                token,
              },
            ),
            getJobApplications(jobId, token),
          ]);

        if (cancelled) {
          return;
        }

        setJob(jobData);
        setApplications(applicationData);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load job.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (jobId) {
      void loadJobDetails();
    }

    return () => {
      cancelled = true;
    };
  }, [jobId, router]);

  async function handlePublish() {
    if (!job) {
      return;
    }

    const confirmed = window.confirm(
      "Publish this job? Candidates will be able to see and apply for it.",
    );

    if (!confirmed) {
      return;
    }

    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    setActionLoading(true);
    setActionError("");

    try {
      const updatedJob = await apiRequest<Job>(
        `/api/v1/jobs/${job.id}/publish`,
        {
          method: "POST",
          token,
        },
      );

      setJob(updatedJob);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to publish job.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClose() {
    if (!job) {
      return;
    }

    const confirmed = window.confirm(
      "Close this job? Candidates will no longer be able to apply.",
    );

    if (!confirmed) {
      return;
    }

    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    setActionLoading(true);
    setActionError("");

    try {
      const updatedJob = await apiRequest<Job>(
        `/api/v1/jobs/${job.id}/close`,
        {
          method: "POST",
          token,
        },
      );

      setJob(updatedJob);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to close job.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (!jobId) {
  return (
    <div className="p-6 text-center">
      <p className="text-sm text-red-600">
        Invalid job ID.
      </p>

      <Link
        href="/recruiter/jobs"
        className="mt-4 inline-flex text-sm font-medium text-blue-600 hover:underline"
      >
        Back to Jobs
      </Link>
    </div>
  );
}

  if (loading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="mb-8 h-4 w-28 rounded bg-slate-200" />

          <div className="h-8 w-72 rounded bg-slate-200" />

          <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-200" />

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <div className="h-36 rounded-2xl bg-slate-200" />
              <div className="h-72 rounded-2xl bg-slate-200" />
              <div className="h-56 rounded-2xl bg-slate-200" />
            </div>

            <div className="h-80 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!job) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
            <XCircle size={22} />
          </div>

          <h1 className="mt-4 text-lg font-semibold text-slate-900">
            Unable to load job
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {error || "The requested job could not be found."}
          </p>

          <Link
            href="/recruiter/jobs"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <ArrowLeft size={16} />
            Back to Jobs
          </Link>
        </div>
      </AppShell>
    );
  }

  const appliedCount = applications.filter(
    (application) => application.status === "APPLIED",
  ).length;

  const pendingCount = applications.filter(
    (application) => application.status === "PENDING",
  ).length;

  const reviewedCount = applications.filter(
    (application) => application.status === "REVIEWED",
  ).length;

  const shortlistedCount = applications.filter(
    (application) => application.status === "SHORTLISTED",
  ).length;

  const hiredCount = applications.filter(
    (application) => application.status === "HIRED",
  ).length;

  const rejectedCount = applications.filter(
    (application) => application.status === "REJECTED",
  ).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        {/* Back */}
        <Link
          href="/recruiter/jobs"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Jobs
        </Link>

        {/* Header */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <StatusBadge status={job.status} />

                {job.department && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />

                    <span className="text-xs font-medium text-slate-400">
                      {job.department}
                    </span>
                  </>
                )}
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                {job.title}
              </h1>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                {job.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={15} />
                    {job.location}
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5">
                  <BriefcaseBusiness size={15} />
                  {formatEmploymentType(job.employment_type)}
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <Users size={15} />
                  {formatExperience(
                    job.experience_min,
                    job.experience_max,
                  )}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap lg:justify-end">
              {job.status !== "CLOSED" && (
                <Link
                  href={`/recruiter/jobs/${job.id}/edit`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <Edit3 size={16} />
                  Edit job
                </Link>
              )}

              {job.status === "DRAFT" && (
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={actionLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                  {actionLoading
                    ? "Publishing..."
                    : "Publish job"}
                </button>
              )}

              {job.status === "ACTIVE" && (
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={actionLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <XCircle size={16} />
                  {actionLoading ? "Closing..." : "Close job"}
                </button>
              )}
            </div>
          </div>

          {actionError && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </div>
          )}
        </div>

        {/* Application overview */}
        <section className="mb-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Recruitment overview
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Current application activity for this position.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <ApplicationStat
              label="Applied"
              value={appliedCount}
              tone="blue"
            />

            <ApplicationStat
              label="Pending"
              value={pendingCount}
              tone="amber"
            />

            <ApplicationStat
              label="Reviewed"
              value={reviewedCount}
              tone="violet"
            />

            <ApplicationStat
              label="Shortlisted"
              value={shortlistedCount}
              tone="emerald"
            />

            <ApplicationStat
              label="Hired"
              value={hiredCount}
              tone="emerald"
            />

            <ApplicationStat
              label="Rejected"
              value={rejectedCount}
              tone="red"
            />
          </div>
        </section>

        {/* Main content */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left */}
          <div className="space-y-6">
            {/* Description */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileText size={17} />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Job description
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Position overview and responsibilities
                  </p>
                </div>
              </div>

              <div className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {job.description}
              </div>
            </section>

            {/* Recruitment details */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-slate-900">
                  Recruitment details
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Requirements and timing for this position
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Users size={17} />
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Experience
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {formatExperience(
                        job.experience_min,
                        job.experience_max,
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <DollarSign size={17} />
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Salary
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {formatSalary(
                        job.salary_min,
                        job.salary_max,
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <CalendarDays size={17} />
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Closing date
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {formatDate(job.closing_date)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Clock3 size={17} />
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Created
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {formatDate(job.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Candidate workflow */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                      <Users size={17} />
                    </div>

                    <h2 className="text-sm font-semibold text-slate-900">
                      Candidate workflow
                    </h2>
                  </div>

                  <p className="mt-3 max-w-xl text-xs leading-5 text-slate-500">
                    Review submitted applications or use AI-powered
                    matching to identify candidates who best fit this
                    position.
                  </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Link
                    href={`/recruiter/jobs/${job.id}/applications`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Users size={15} />
                    Applications
                    {applications.length > 0 && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px]">
                        {applications.length}
                      </span>
                    )}
                  </Link>

                  <Link
                    href={`/recruiter/jobs/${job.id}/matches`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
                  >
                    <Sparkles size={15} />
                    AI Matches
                  </Link>
                </div>
              </div>
            </section>
          </div>

          {/* Right */}
          <aside className="space-y-6">
            {/* Status */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Job status
              </h2>

              <div className="mt-4">
                <StatusBadge status={job.status} />
              </div>

              <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-slate-400">
                    Published
                  </span>

                  <span className="text-right font-medium text-slate-700">
                    {job.published_at
                      ? formatDate(job.published_at)
                      : "Not published"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-slate-400">
                    Closing
                  </span>

                  <span className="text-right font-medium text-slate-700">
                    {formatDate(job.closing_date)}
                  </span>
                </div>
              </div>
            </section>

            {/* Quick actions */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Quick actions
              </h2>

              <div className="mt-4 space-y-2">
                <Link
                  href={`/recruiter/jobs/${job.id}/applications`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <Users size={16} />
                    Review applications
                  </span>

                  <span className="text-xs text-slate-400">
                    {applications.length}
                  </span>
                </Link>

                <Link
                  href={`/recruiter/jobs/${job.id}/matches`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <Sparkles size={16} />
                    AI candidate matches
                  </span>

                  <span className="text-xs text-slate-400">
                    AI
                  </span>
                </Link>

                {job.status !== "CLOSED" && (
                  <Link
                    href={`/recruiter/jobs/${job.id}/edit`}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Edit3 size={16} />
                    Edit job
                  </Link>
                )}
              </div>
            </section>

            {/* Job summary */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Job summary
              </h2>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs text-slate-400">
                    Employment
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {formatEmploymentType(
                      job.employment_type,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Department
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {job.department || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Location
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {job.location || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Last updated
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {formatDate(job.updated_at)}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
