"use client";
import { API_BASE_URL } from "@/lib/api";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  FileText,
  MapPin,
  Search,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/layout/AppShell";

import {
  ApplicationReview,
  Job,
  getApplicationReview,
  getJob,
  getJobApplications,
  getMyCompanyMemberships,
  updateApplicationStatus,
} from "@/lib/api";

import { getAccessToken } from "@/lib/auth";


const STATUS_OPTIONS = [
  "ALL",
  "APPLIED",
  "PENDING",
  "REVIEWED",
  "SHORTLISTED",
  "REJECTED",
  "HIRED",
];


function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}


function getStatusClasses(status: string) {
  switch (status) {
    case "APPLIED":
      return "bg-blue-50 text-blue-700";

    case "PENDING":
      return "bg-amber-50 text-amber-700";

    case "REVIEWED":
      return "bg-violet-50 text-violet-700";

    case "SHORTLISTED":
      return "bg-emerald-50 text-emerald-700";

    case "REJECTED":
      return "bg-red-50 text-red-700";

    case "HIRED":
      return "bg-blue-100 text-blue-800";

    default:
      return "bg-slate-100 text-slate-600";
  }
}


function getScoreClasses(score: number) {
  if (score >= 75) {
    return "text-emerald-600";
  }

  if (score >= 50) {
    return "text-amber-600";
  }

  return "text-slate-500";
}


function getMatchStatusClasses(status?: string | null) {
  switch (status) {
    case "STRONG_MATCH":
      return "bg-emerald-50 text-emerald-700";

    case "POTENTIAL_MATCH":
      return "bg-amber-50 text-amber-700";

    case "WEAK_MATCH":
      return "bg-red-50 text-red-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}


function formatMatchStatus(status?: string | null) {
  if (!status) {
    return "Not evaluated";
  }

  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}


function formatDate(value?: string) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}


function getCandidateName(review: ApplicationReview) {
  return review.candidate.name || "Unnamed candidate";
}


function getCandidateInitials(name: string) {
  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}


function getExperienceLabel(years?: number | null) {
  if (years == null) {
    return "Experience not specified";
  }

  if (years === 0) {
    return "No experience";
  }

  return `${years} ${years === 1 ? "year" : "years"} experience`;
}


export default function JobApplicationsPage() {
  const params = useParams();
  const router = useRouter();

  const jobId = params.job_id as string;

  const [job, setJob] = useState<Job | null>(null);

  const [currentUserId, setCurrentUserId] =
  useState<string | null>(null);

  const [reviews, setReviews] = useState<
    ApplicationReview[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [statusUpdating, setStatusUpdating] =
    useState<string | null>(null);

  const [resumeDownloading, setResumeDownloading] =
    useState<string | null>(null);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");


  useEffect(() => {
    let cancelled = false;

    async function loadApplications() {
      try {
        const token = getAccessToken();

        if (!token) {
          router.push("/login");
          return;
        }

        const [
          jobResponse,
          applications,
          memberships,
        ] = await Promise.all([
          getJob(jobId, token),
          getJobApplications(jobId, token),
          getMyCompanyMemberships(token),
        ]);

        const reviewResults =
          await Promise.all(
            applications.map(
              async (application) => {
                try {
                  return await getApplicationReview(
                    application.id,
                    token,
                  );
                } catch {
                  return null;
                }
              },
            ),
          );

        if (cancelled) {
          return;
        }

        setJob(jobResponse);

        setCurrentUserId(
          memberships[0]?.user_id ?? null,
        );

        setReviews(
          reviewResults.filter(
            (
              review,
            ): review is ApplicationReview =>
              review !== null,
          ),
        );

        setError("");
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load applications.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (jobId) {
      loadApplications();
    }

    return () => {
      cancelled = true;
    };
  }, [jobId, router]);


  const filteredReviews = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return reviews
      .filter((review) => {
        const candidateName =
          getCandidateName(review).toLowerCase();

        const email =
          review.candidate.email
            ?.toLowerCase() || "";

        const headline =
          review.candidate.headline
            ?.toLowerCase() || "";

        const jobTitles =
          review.resume_analysis?.job_titles
            ?.join(" ")
            .toLowerCase() || "";

        const matchesSearch =
          !query ||
          candidateName.includes(query) ||
          email.includes(query) ||
          headline.includes(query) ||
          jobTitles.includes(query);

        const matchesStatus =
          statusFilter === "ALL" ||
          review.application.status ===
            statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      })
      .sort(
        (a, b) =>
          new Date(
            b.application.applied_at ?? 0,
          ).getTime() -
          new Date(
            a.application.applied_at ?? 0,
          ).getTime(),
      );
  }, [
    reviews,
    search,
    statusFilter,
  ]);


  async function handleStatusChange(
    applicationId: string,
    newStatus: Parameters<typeof updateApplicationStatus>[1],
  ) {
    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    setStatusUpdating(applicationId);
    setError("");

    try {
      const updatedApplication =
        await updateApplicationStatus(
          applicationId,
          newStatus,
          token,
        );

      setReviews((current) =>
        current.map((review) =>
          review.application.id ===
          applicationId
            ? {
                ...review,
                application:
                  updatedApplication,
                match:
                  review.match
                    ? {
                        ...review.match,
                      }
                    : review.match,
              }
            : review,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update application status.",
      );
    } finally {
      setStatusUpdating(null);
    }
  }


  async function handleDownloadResume(
    applicationId: string,
    fileName: string,
  ) {
    try {
      const token = getAccessToken();

      if (!token) {
        router.push("/login");
        return;
      }

      setResumeDownloading(applicationId);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/v1/applications/${applicationId}/resume`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        let message =
          "Unable to download resume.";

        try {
          const data =
            await response.json();

          if (data?.detail) {
            message = data.detail;
          }
        } catch {
          // Keep default message.
        }

        throw new Error(message);
      }

      const blob =
        await response.blob();

      const url =
        window.URL.createObjectURL(blob);

      const anchor =
        document.createElement("a");

      anchor.href = url;
      anchor.download = fileName;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to download resume.",
      );
    } finally {
      setResumeDownloading(null);
    }
  }


  const totalCount = reviews.length;

  const appliedCount =
    reviews.filter(
      (review) =>
        review.application.status ===
        "APPLIED",
    ).length;

  const pendingCount =
    reviews.filter(
      (review) =>
        review.application.status ===
        "PENDING",
    ).length;

  const reviewedCount =
    reviews.filter(
      (review) =>
        review.application.status ===
        "REVIEWED",
    ).length;

  const shortlistedCount =
    reviews.filter(
      (review) =>
        review.application.status ===
        "SHORTLISTED",
    ).length;

  const rejectedCount =
    reviews.filter(
      (review) =>
        review.application.status ===
        "REJECTED",
    ).length;

  const hiredCount =
    reviews.filter(
      (review) =>
        review.application.status ===
        "HIRED",
    ).length;


  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "ALL";


  function clearFilters() {
    setSearch("");
    setStatusFilter("ALL");
  }


  if (loading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl animate-pulse">

          <div className="mb-6 h-4 w-28 rounded bg-slate-200" />

          <div className="h-8 w-72 rounded bg-slate-200" />

          <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-200" />

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-28 rounded-2xl bg-slate-200"
                />
              ),
            )}
          </div>

          <div className="mt-6 h-12 rounded-xl bg-slate-200" />

          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-40 rounded-2xl bg-slate-200"
                />
              ),
            )}
          </div>

        </div>
      </AppShell>
    );
  }


  if (!job) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl py-16 text-center">

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <BriefcaseBusiness size={21} />
          </div>

          <h1 className="mt-4 text-lg font-semibold text-slate-900">
            Unable to load applications
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {error || "Job not found."}
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


  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8">

          <Link
            href={`/recruiter/jobs/${job.id}`}
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Job
          </Link>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            <div className="min-w-0">

              <div className="flex items-center gap-2 text-sm text-slate-500">
                <BriefcaseBusiness size={15} />
                <span className="truncate">
                  {job.title}
                </span>
              </div>

              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Applications
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Review and manage candidates who applied for this position.
              </p>

            </div>

            <div className="flex flex-col gap-2 sm:flex-row">

              <Link
                href={`/recruiter/jobs/${job.id}`}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Job Details
              </Link>

              <Link
                href={`/recruiter/jobs/${job.id}/matches`}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                View AI Matches
              </Link>

            </div>

          </div>
        </div>


        {/* Pipeline summary */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">

          <SummaryCard
            label="Total"
            value={totalCount}
            icon={Users}
            iconClass="bg-blue-50 text-blue-600"
          />

          <SummaryCard
            label="Applied"
            value={appliedCount}
            icon={Clock3}
            iconClass="bg-blue-50 text-blue-600"
          />

          <SummaryCard
            label="Pending"
            value={pendingCount}
            icon={Clock3}
            iconClass="bg-amber-50 text-amber-600"
          />

          <SummaryCard
            label="Reviewed"
            value={reviewedCount}
            icon={CheckCircle2}
            iconClass="bg-violet-50 text-violet-600"
          />

          <SummaryCard
            label="Shortlisted"
            value={shortlistedCount}
            icon={CheckCircle2}
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <SummaryCard
            label="Hired"
            value={hiredCount}
            icon={CheckCircle2}
            iconClass="bg-blue-50 text-blue-700"
          />

        </div>


        {/* Rejected summary */}
        {rejectedCount > 0 && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-red-100 bg-red-50 px-4 py-3">

            <div className="flex items-center gap-2 text-sm text-red-700">
              <XCircle size={16} />
              <span>
                {rejectedCount}{" "}
                {rejectedCount === 1
                  ? "application"
                  : "applications"}{" "}
                rejected
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setStatusFilter("REJECTED")
              }
              className="text-xs font-semibold text-red-700 underline-offset-2 hover:underline"
            >
              View rejected
            </button>

          </div>
        )}


        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

            <p>{error}</p>

            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 text-xs font-semibold text-red-700 hover:text-red-900"
            >
              Dismiss
            </button>

          </div>
        )}


        {/* Filters */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="flex flex-col gap-3 lg:flex-row">

            <div className="relative flex-1">

              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search candidates by name, email, headline or job title..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />

            </div>


            <div className="relative lg:w-52">

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-9 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              >
                {STATUS_OPTIONS.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status === "ALL"
                        ? "All statuses"
                        : formatStatus(status)}
                    </option>
                  ),
                )}
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

            </div>


            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                Clear filters
              </button>
            )}

          </div>


          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">

            <p className="text-xs text-slate-400">
              Showing{" "}
              <span className="font-semibold text-slate-600">
                {filteredReviews.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-600">
                {reviews.length}
              </span>{" "}
              applications
            </p>

            <p className="text-xs text-slate-400">
              Newest applications shown first
            </p>

          </div>

        </div>


        {/* Empty */}
        {filteredReviews.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Users size={21} />
            </div>

            <h2 className="mt-4 text-sm font-semibold text-slate-900">
              {reviews.length === 0
                ? "No applications yet"
                : "No matching applications"}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {reviews.length === 0
                ? "Applications will appear here when candidates apply for this job."
                : "Try changing your search or status filter."}
            </p>

            {reviews.length > 0 &&
              hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Clear filters
                </button>
              )}

          </div>
        )}


        {/* Application list */}
        {filteredReviews.length > 0 && (
          <div className="space-y-3">

            {filteredReviews.map(
              (review) => {
                const candidateName =
                  getCandidateName(review);

                const score =
                  review.match?.overall_score;

                const matchStatus =
                  review.match?.match_status;

                const initials =
                  getCandidateInitials(
                    candidateName,
                  );

                return (
                  <div
                    key={review.application.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                  >

                    <div className="flex flex-col gap-5">

                      {/* Candidate header */}
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                        <div className="flex min-w-0 items-start gap-4">

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-600">
                            {initials}
                          </div>

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <h2 className="text-base font-semibold text-slate-900">
                                {candidateName}
                              </h2>

                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusClasses(
                                  review.application.status,
                                )}`}
                              >
                                {formatStatus(
                                  review.application.status,
                                )}
                              </span>

                              {matchStatus && (
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getMatchStatusClasses(
                                    matchStatus,
                                  )}`}
                                >
                                  {formatMatchStatus(
                                    matchStatus,
                                  )}
                                </span>
                              )}

                            </div>


                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">

                              {review.candidate.email && (
                                <span>
                                  {review.candidate.email}
                                </span>
                              )}

                              {review.candidate.location && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin size={12} />
                                  {review.candidate.location}
                                </span>
                              )}

                              <span>
                                {getExperienceLabel(
                                  review.candidate
                                    .years_of_experience,
                                )}
                              </span>

                            </div>


                            {review.candidate.headline && (
                              <p className="mt-2 line-clamp-1 text-xs text-slate-500">
                                {review.candidate.headline}
                              </p>
                            )}

                          </div>

                        </div>


                        {/* Match score */}
                        {score != null && (
                          <div className="shrink-0 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">

                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              AI Match
                            </p>

                            <p
                              className={`mt-1 text-xl font-bold ${getScoreClasses(
                                score,
                              )}`}
                            >
                              {score.toFixed(0)}%
                            </p>

                          </div>
                        )}

                      </div>


                      {/* Candidate metadata */}
                      <div className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">

                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                            Applied
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {formatDate(
                              review.application
                                .applied_at,
                            )}
                          </p>
                        </div>


                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                            Resume
                          </p>

                          <p className="mt-1 max-w-full truncate text-sm font-medium text-slate-700">
                            {review.resume.file_name}
                          </p>
                        </div>


                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                            Experience
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {getExperienceLabel(
                              review.candidate
                                .years_of_experience,
                            )}
                          </p>
                        </div>


                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                            Previous role
                          </p>

                          <p className="mt-1 truncate text-sm font-medium text-slate-700">
                            {review.resume_analysis
                              ?.job_titles?.[0] ||
                              "Not specified"}
                          </p>
                        </div>

                      </div>


                      {/* Actions */}
                      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadResume(
                              review.application.id,
                              review.resume.file_name,
                            )
                          }
                          disabled={
                            resumeDownloading ===
                            review.application.id
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Download size={15} />

                          {resumeDownloading ===
                          review.application.id
                            ? "Downloading..."
                            : "Download Resume"}
                        </button>


                        <div className="flex flex-col gap-2 sm:flex-row">

                          {(
                            review.company_role === "OWNER" ||
                            (
                              currentUserId !== null &&
                              review.job_created_by === currentUserId
                            )
                          ) && (

                          <select
                            value={
                              review.application.status
                            }
                            disabled={
                              statusUpdating ===
                              review.application.id
                            }
                            onChange={(event) =>
                              handleStatusChange(
                                review.application.id,
                                event.target.value as Parameters<
                                  typeof updateApplicationStatus
                                >[1],
                              )
                            }
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {STATUS_OPTIONS
                              .filter(
                                (status) =>
                                  status !== "ALL",
                              )
                              .map(
                                (status) => (
                                  <option
                                    key={status}
                                    value={status}
                                  >
                                    {formatStatus(
                                      status,
                                    )}
                                  </option>
                                ),
                              )}
                          </select>
                          )}

                          <Link
                            href={`/recruiter/applications/${review.application.id}`}
                            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                          >
                            Review Candidate
                          </Link>

                        </div>

                      </div>

                    </div>

                  </div>
                );
              },
            )}

          </div>
        )}

      </div>
    </AppShell>
  );
}


function SummaryCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <div className="flex items-center justify-between">

        <span className="text-xs font-medium text-slate-500">
          {label}
        </span>

        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}`}
        >
          <Icon size={16} />
        </div>

      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>

    </div>
  );
}
