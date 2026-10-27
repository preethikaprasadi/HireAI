"use client";
import { API_BASE_URL } from "@/lib/api";
import {
  use,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Download,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import {
  getApplicationReview,
  getMyCompanyMemberships,
  updateApplicationStatus,
  type ApplicationReview,
  type ApplicationStatus,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

const STATUS_OPTIONS: ApplicationStatus[] = [
  "APPLIED",
  "PENDING",
  "REVIEWED",
  "SHORTLISTED",
  "REJECTED",
  "HIRED",
];

type ReviewAnalysis = {
  summary?: string | null;
  skills?: string[];
  job_titles?: string[];
  experience?: Array<Record<string, unknown>>;
  education?: Array<Record<string, unknown>>;
  projects?: Array<Record<string, unknown>>;
  certifications?: string[];
};

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function getStatusClasses(status: string) {
  switch (status) {
    case "APPLIED":
      return "bg-slate-100 text-slate-700 border-slate-200";

    case "PENDING":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "REVIEWED":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "SHORTLISTED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "REJECTED":
      return "bg-red-50 text-red-700 border-red-200";

    case "HIRED":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";

    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getScoreClasses(score: number) {
  if (score >= 75) {
    return {
      text: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    };
  }

  if (score >= 50) {
    return {
      text: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
    };
  }

  return {
    text: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  };
}

function getMatchStatusClasses(status?: string) {
  const normalized = status?.toUpperCase();

  if (
    normalized === "STRONG_MATCH" ||
    normalized === "STRONG MATCH"
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (
    normalized === "POTENTIAL_MATCH" ||
    normalized === "POTENTIAL MATCH"
  ) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  return "bg-amber-50 text-amber-700 border-amber-200";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCandidateInitials(
  name?: string | null,
) {
  if (!name) {
    return "CA";
  }

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0]}${
    parts[parts.length - 1][0]
  }`.toUpperCase();
}

function displayValue(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  return String(value);
}

function renderList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value;
}

export default function ApplicationReviewPage({
  params,
}: {
  params: Promise<{
    application_id: string;
  }>;
}) {
  /*
   * Next.js dynamic route params are asynchronous.
   *
   * Correct:
   *   const { application_id } = use(params)
   *
   * Not:
   *   params.application_id
   */
  const { application_id: applicationId } =
    use(params);

  const [review, setReview] =
    useState<ApplicationReview | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [updatingStatus, setUpdatingStatus] =
    useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  /*
   * Initial application review request.
   *
   * The state updates happen after the async request
   * completes, avoiding the React set-state-in-effect
   * warning caused by calling a state-changing function
   * synchronously from the effect.
   */
  useEffect(() => {
    let cancelled = false;

    async function fetchReview() {
      try {
        const token = getAccessToken();

        if (!token) {
          setError("Please log in again.");
          setLoading(false);
          return;
        }

        const [reviewData, memberships] = await Promise.all([
          getApplicationReview(applicationId, token),
          getMyCompanyMemberships(token),
        ]);

        if (cancelled) {
          return;
        }

        setReview(reviewData);
        setCurrentUserId(memberships[0]?.user_id ?? null);
        setError("");
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load application review.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchReview();

    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  async function retryReview() {
    try {
      setLoading(true);
      setError("");

      const token = getAccessToken();

      if (!token) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      const data =
        await getApplicationReview(
          applicationId,
          token,
        );

      setReview(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load application review.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(
    newStatus: ApplicationStatus,
  ) {
    if (!review) {
      return;
    }

    if (
      newStatus === review.application.status
    ) {
      return;
    }

    try {
      setUpdatingStatus(true);
      setError("");

      const token = getAccessToken();

      if (!token) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      const updatedApplication =
        await updateApplicationStatus(
          applicationId,
          newStatus,
          token,
        );

      setReview((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          application: {
            ...current.application,
            ...updatedApplication,
          },
        };
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update application status.",
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleDownloadResume() {
    try {
      const token = getAccessToken();

      if (!token) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

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

      const blob = await response.blob();

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;
      link.download =
        review?.resume.file_name ||
        "resume";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to download resume.",
      );
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex gap-5">
              <div className="h-16 w-16 animate-pulse rounded-2xl bg-slate-200" />

              <div className="flex-1 space-y-3">
                <div className="h-6 w-64 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-72 animate-pulse rounded bg-slate-200" />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="h-72 animate-pulse rounded-2xl bg-slate-200 lg:col-span-2" />
            <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (error && !review) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl">
          <Link
            href="/recruiter/jobs"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to jobs
          </Link>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <h2 className="font-semibold text-red-900">
                  Unable to load application
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={retryReview}
                  className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!review) {
    return null;
  }

  const canUpdateStatus =
    currentUserId !== null &&
    (
      review.company_role === "OWNER" ||
      review.job_created_by === currentUserId
    );

  const analysis =
    review.resume_analysis as
      | ReviewAnalysis
      | null
      | undefined;

  const match = review.match;

  const score = Number(
    match?.overall_score ?? 0,
  );

  const scoreStyle =
    getScoreClasses(score);

  const candidateName =
    review.candidate.name ||
    "Unnamed candidate";

  const initials =
    getCandidateInitials(
      review.candidate.name,
    );

  const skills = renderList(
    analysis?.skills,
  );

  const jobTitles = renderList(
    analysis?.job_titles,
  );

  const experience = renderList(
    analysis?.experience,
  );

  const education = renderList(
    analysis?.education,
  );

  const projects = renderList(
    analysis?.projects,
  );

  const certifications = renderList(
    analysis?.certifications,
  );

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}

        <div className="flex flex-col gap-4">
          <Link
            href={`/recruiter/jobs/${review.application.job_id}/applications`}
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to applications
          </Link>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Candidate Header */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-lg font-semibold text-blue-600">
                {initials}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                    {candidateName}
                  </h1>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                      review.application.status,
                    )}`}
                  >
                    {formatStatus(
                      review.application.status,
                    )}
                  </span>
                </div>

                <p className="mt-1 text-sm font-medium text-slate-600">
                  {review.candidate.headline ||
                    (jobTitles.length > 0
                      ? String(jobTitles[0])
                      : "Candidate")}
                </p>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                  {review.candidate.email && (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-4 w-4" />
                      {review.candidate.email}
                    </span>
                  )}

                  {review.candidate.phone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-4 w-4" />
                      {review.candidate.phone}
                    </span>
                  )}

                  {review.candidate.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {review.candidate.location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <button
                type="button"
                onClick={handleDownloadResume}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Download Resume
              </button>

              {canUpdateStatus && (
                <select
                  value={review.application.status}
                  onChange={(event) =>
                    handleStatusChange(event.target.value as ApplicationStatus)
                  }
                  disabled={updatingStatus}
                  className="rounded-xl border ... "
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </section>

        {/* Main */}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left */}

          <div className="space-y-6 lg:col-span-2">
            {/* AI Match */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />

                    <h2 className="text-lg font-semibold text-slate-200">
                      AI Match Analysis
                    </h2>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    How this candidate matches the
                    job requirements.
                  </p>
                </div>

                {match?.match_status && (
                  <span
                    className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getMatchStatusClasses(
                      match.match_status,
                    )}`}
                  >
                    {formatStatus(
                      match.match_status,
                    )}
                  </span>
                )}
              </div>
              {match ? (
                <>
              <div className="mt-6 grid gap-6 md:grid-cols-[180px_1fr] md:items-center">
                <div
                  className={`flex h-40 w-40 flex-col items-center justify-center rounded-full border-8 ${scoreStyle.border} ${scoreStyle.bg}`}
                >
                  <span
                    className={`text-4xl font-bold tracking-tight ${scoreStyle.text}`}
                  >
                    {score.toFixed(0)}
                  </span>

                  <span className="mt-1 text-xs font-medium text-slate-500">
                    out of 100
                  </span>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      label: "Skills",
                      value:
                        match?.components.skill ??
                        0,
                    },
                    {
                      label: "Experience",
                      value:
                        match?.components
                          .experience ?? 0,
                    },
                    {
                      label: "Role",
                      value:
                        match?.components.role ??
                        0,
                    },
                    {
                      label: "Semantic",
                      value:
                        match?.components
                          .semantic ?? 0,
                    },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">
                          {item.label}
                        </span>

                        <span className="font-semibold text-slate-900">
                          {Number(
                            item.value,
                          ).toFixed(0)}
                          %
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{
                            width: `${Math.min(
                              Math.max(
                                Number(
                                  item.value,
                                ),
                                0,
                              ),
                              100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />

                    <h3 className="text-sm font-semibold text-emerald-900">
                      Matching skills
                    </h3>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {match?.details.matched_required
                      ?.concat(
                        match.details
                          .matched_preferred,
                      )
                      .map((skill) => (
                        <span
                          key={skill}
                          className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700"
                        >
                          {skill}
                        </span>
                      ))}

                    {!match?.details
                      .matched_required
                      ?.length &&
                      !match?.details
                        .matched_preferred
                        ?.length && (
                        <span className="text-sm text-slate-500">
                          No matching skills found.
                        </span>
                      )}
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-amber-600" />

                    <h3 className="text-sm font-semibold text-amber-900">
                      Missing skills
                    </h3>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {match?.details
                      .missing_required
                      ?.concat(
                        match.details
                          .missing_preferred,
                      )
                      .map((skill) => (
                        <span
                          key={skill}
                          className="rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-700"
                        >
                          {skill}
                        </span>
                      ))}

                    {!match?.details
                      .missing_required
                      ?.length &&
                      !match?.details
                        .missing_preferred
                        ?.length && (
                        <span className="text-sm text-slate-500">
                          No missing skills
                          detected.
                        </span>
                      )}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Experience
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatStatus(
                      match?.details
                        .experience_status ||
                        "Not available",
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Role
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatStatus(
                      match?.details
                        .role_status ||
                        "Not available",
                    )}
                  </p>

                  {match?.details
                    .matched_title && (
                    <p className="mt-1 text-xs text-slate-500">
                      Matched title:{" "}
                      {
                        match.details
                          .matched_title
                      }
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Semantic match
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatStatus(
                      match?.details
                        .semantic_status ||
                        "Not available",
                    )}
                  </p>
                </div>
              </div>
                </>
              ) : (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
                  <h3 className="font-semibold text-amber-900">
                    AI matching unavailable
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-amber-800">
                    The candidate&apos;s application and resume are available
                    for review, but an AI match score could not be
                    calculated. You can still assess the candidate using
      the resume and extracted profile information below.
    </p>
  </div>
)}
            </section>

            {/* Summary */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-slate-500" />

                <h2 className="text-lg font-semibold text-slate-900">
                  Professional Summary
                </h2>
              </div>

              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">
                {analysis?.summary ||
                  "No professional summary was extracted from this resume."}
              </p>
            </section>

            {/* Experience */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <BriefcaseBusiness className="h-5 w-5 text-slate-500" />

                <h2 className="text-lg font-semibold text-slate-900">
                  Experience
                </h2>
              </div>

              {experience.length > 0 ? (
                <div className="mt-6 space-y-6">
                  {experience.map(
                    (item, index) => {
                      const experienceItem =
                        item as Record<
                          string,
                          unknown
                        >;

                      return (
                        <div
                          key={index}
                          className="relative border-l-2 border-slate-200 pl-5"
                        >
                          <div className="absolute -left-\[7px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-600" />

                          <h3 className="font-semibold text-slate-900">
                            {displayValue(
                              experienceItem.job_title,
                            )}
                          </h3>

                          <p className="mt-1 text-sm font-medium text-slate-600">
                            {displayValue(
                              experienceItem.company,
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {displayValue(
                              experienceItem.start_date,
                            )}{" "}
                            —{" "}
                            {displayValue(
                              experienceItem.end_date,
                            )}
                          </p>

                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {displayValue(
                              experienceItem.description,
                            )}
                          </p>
                        </div>
                      );
                    },
                  )}
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  No professional experience
                  was extracted from the
                  resume.
                </div>
              )}
            </section>

            {/* Education */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-slate-500" />

                <h2 className="text-lg font-semibold text-slate-900">
                  Education
                </h2>
              </div>

              {education.length > 0 ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {education.map(
                    (item, index) => {
                      const educationItem =
                        item as Record<
                          string,
                          unknown
                        >;

                      return (
                        <div
                          key={index}
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <h3 className="font-semibold text-slate-900">
                            {displayValue(
                              educationItem.degree,
                            )}
                          </h3>

                          <p className="mt-1 text-sm text-slate-600">
                            {displayValue(
                              educationItem.institution,
                            )}
                          </p>

                          <p className="mt-2 text-xs text-slate-400">
                            {displayValue(
                              educationItem.year,
                            )}
                          </p>
                        </div>
                      );
                    },
                  )}
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  No education information
                  was extracted.
                </div>
              )}
            </section>

            {/* Projects */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <BriefcaseBusiness className="h-5 w-5 text-slate-500" />

                <h2 className="text-lg font-semibold text-slate-900">
                  Projects
                </h2>
              </div>

              {projects.length > 0 ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {projects.map(
                    (item, index) => {
                      const project =
                        item as Record<
                          string,
                          unknown
                        >;

                      return (
                        <div
                          key={index}
                          className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300"
                        >
                          <h3 className="font-semibold text-slate-900">
                            {displayValue(
                              project.name,
                            )}
                          </h3>

                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {displayValue(
                              project.description,
                            )}
                          </p>
                        </div>
                      );
                    },
                  )}
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  No projects were extracted
                  from the resume.
                </div>
              )}
            </section>
          </div>

          {/* Right */}

          <div className="space-y-6">
            {/* Application */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Application
              </h2>

              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" />

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Applied
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {formatDate(
                        review.application
                          .applied_at,
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" />

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Last updated
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {formatDate(
                        review.application
                          .updated_at,
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <BriefcaseBusiness className="mt-0.5 h-4 w-4 text-slate-400" />

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Application ID
                    </p>

                    <p className="mt-1 break-all text-xs font-medium text-slate-600">
                      {review.application.id}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Resume */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Resume
              </h2>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                    <Download className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {review.resume.file_name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Version{" "}
                      {review.resume.version}
                      {review.resume
                        .is_current
                        ? " · Current"
                        : ""}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    handleDownloadResume
                  }
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Download className="h-4 w-4" />
                  Download Resume
                </button>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                Uploaded{" "}
                {formatDate(
                  review.resume
                    .uploaded_at,
                )}
              </p>
            </section>

            {/* Skills */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Skills
              </h2>

              <div className="mt-4 flex flex-wrap gap-2">
                {skills.length > 0 ? (
                  skills.map(
                    (skill, index) => (
                      <span
                        key={`${String(
                          skill,
                        )}-${index}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                      >
                        {String(skill)}
                      </span>
                    ),
                  )
                ) : (
                  <p className="text-sm text-slate-500">
                    No skills extracted.
                  </p>
                )}
              </div>
            </section>

            {/* Job titles */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Previous Job Titles
              </h2>

              <div className="mt-4 space-y-2">
                {jobTitles.length > 0 ? (
                  jobTitles.map(
                    (title, index) => (
                      <div
                        key={`${String(
                          title,
                        )}-${index}`}
                        className="flex items-center gap-2 text-sm text-slate-700"
                      >
                        <ChevronRight className="h-4 w-4 text-blue-500" />
                        {String(title)}
                      </div>
                    ),
                  )
                ) : (
                  <p className="text-sm text-slate-500">
                    No job titles extracted.
                  </p>
                )}
              </div>
            </section>

            {/* Certifications */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Certifications
              </h2>

              <div className="mt-4 space-y-2">
                {certifications.length >
                0 ? (
                  certifications.map(
                    (
                      certification,
                      index,
                    ) => (
                      <div
                        key={`${String(
                          certification,
                        )}-${index}`}
                        className="flex items-start gap-2 text-sm text-slate-700"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />

                        <span>
                          {String(
                            certification,
                          )}
                        </span>
                      </div>
                    ),
                  )
                ) : (
                  <p className="text-sm text-slate-500">
                    No certifications
                    extracted.
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
