"use client";

import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import {
  Application,
  CandidateProfile,
  getCandidateApplications,
  getCandidateProfile,
  getCandidateResumes,
  getJob,
  Job,
  Resume,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type ApplicationWithJob = Application & {
  job?: Job;
};

function formatDate(value?: string) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getStatusClasses(status: string) {
  switch (status) {
    case "HIRED":
      return "bg-emerald-50 text-emerald-700";

    case "SHORTLISTED":
      return "bg-blue-50 text-blue-700";

    case "REVIEWED":
      return "bg-violet-50 text-violet-700";

    case "PENDING":
      return "bg-amber-50 text-amber-700";

    case "REJECTED":
      return "bg-red-50 text-red-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "APPLIED":
      return "Applied";

    case "PENDING":
      return "Pending";

    case "REVIEWED":
      return "Reviewed";

    case "SHORTLISTED":
      return "Shortlisted";

    case "REJECTED":
      return "Rejected";

    case "HIRED":
      return "Hired";

    default:
      return status;
  }
}

export default function CandidateDashboardPage() {
  const [profile, setProfile] =
    useState<CandidateProfile | null>(null);

  const [resumes, setResumes] =
    useState<Resume[]>([]);

  const [applications, setApplications] =
    useState<ApplicationWithJob[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [retryCount, setRetryCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");
      const token = getAccessToken();

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const [
          profileData,
          resumeData,
          applicationData,
        ] = await Promise.all([
          getCandidateProfile(token),
          getCandidateResumes(token),
          getCandidateApplications(token),
        ]);

        if (cancelled) {
          return;
        }

        const applicationsWithJobs =
          await Promise.all(
            applicationData.map(
              async (application) => {
                try {
                  const job = await getJob(
                    application.job_id,
                    token,
                  );

                  return {
                    ...application,
                    job,
                  };
                } catch {
                  return {
                    ...application,
                  };
                }
              },
            ),
          );

        if (cancelled) {
          return;
        }

        applicationsWithJobs.sort((a, b) => {
          const dateA = a.applied_at
            ? new Date(a.applied_at).getTime()
            : 0;

          const dateB = b.applied_at
            ? new Date(b.applied_at).getTime()
            : 0;

          return dateB - dateA;
        });

        setProfile(profileData);
        setResumes(resumeData);
        setApplications(
          applicationsWithJobs,
        );
        setError("");
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load your dashboard.",
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
  }, [retryCount, router]);

  const recentApplications =
    applications.slice(0, 5);

  const pendingCount =
    applications.filter(
      (application) =>
        application.status === "APPLIED" ||
        application.status === "PENDING",
    ).length;

  const shortlistedCount =
    applications.filter(
      (application) =>
        application.status === "SHORTLISTED",
    ).length;

  const hiredCount =
    applications.filter(
      (application) =>
        application.status === "HIRED",
    ).length;

  const profileFields = [
    profile?.phone,
    profile?.location,
    profile?.headline,
    profile?.bio,
    profile?.years_of_experience !== null &&
      profile?.years_of_experience !== undefined,
    profile?.linkedin_url,
    profile?.github_url,
  ];

  const completedProfileFields =
    profileFields.filter(Boolean).length;

  const profileCompletion =
    Math.round(
      (completedProfileFields /
        profileFields.length) *
        100,
    );

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">
              Candidate workspace
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Welcome back
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage your applications, resumes,
              and job search from one place.
            </p>
          </div>

          <Link
            href="/candidate/jobs"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Search size={16} />
            Browse Jobs
          </Link>
        </div>

        {/* Error */}


        {loading ? (
          <div className="space-y-6">

            <div className="h-36 animate-pulse rounded-2xl bg-slate-200" />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
              <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
              <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
              <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
            </div>

            <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />

          </div>
        ) : (
          <>
            {/* Profile snapshot */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center gap-4">

                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg font-semibold text-blue-700">
                    <UserRound size={24} />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Your candidate profile
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {profile?.location ||
                        "Add your location to your profile"}
                    </p>
                  </div>

                </div>

                <div className="flex flex-wrap gap-2">

                  {profile?.years_of_experience !==
                    null &&
                    profile?.years_of_experience !==
                      undefined && (
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                        {profile.years_of_experience}{" "}
                        {profile.years_of_experience ===
                        1
                          ? "year"
                          : "years"}{" "}
                        experience
                      </span>
                    )}

                  {profile?.headline && (
                    <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
                      {profile.headline}
                    </span>
                  )}

                </div>

                <div className="mt-5 border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Profile completeness
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {profileCompletion}%
                      </p>
                    </div>

                    <Link
                      href="/candidate/profile"
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      {profileCompletion === 100
                        ? "View profile"
                        : "Complete profile"}
                    </Link>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{
                        width: `${profileCompletion}%`,
                      }}
                    />
                  </div>
                </div>

              </div>

            </section>

            {/* Stats */}
            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Applications
                    </p>

                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {applications.length}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <BriefcaseBusiness size={19} />
                  </div>

                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Active applications
                    </p>

                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {pendingCount}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Clock3 size={19} />
                  </div>

                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Shortlisted
                    </p>

                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {shortlistedCount}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <CheckCircle2 size={19} />
                  </div>

                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Resumes
                    </p>

                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {resumes.length}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <FileText size={19} />
                  </div>

                </div>
              </div>

            </section>

            {/* Main content */}
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">

              {/* Recent applications */}
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Recent applications
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Track the latest positions you
                      applied for.
                    </p>
                  </div>

                  <Link
                    href="/candidate/applications"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View all
                  </Link>

                </div>

                {recentApplications.length === 0 ? (
                  <div className="px-6 py-14 text-center">

                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <BriefcaseBusiness size={21} />
                    </div>

                    <h3 className="mt-4 text-sm font-semibold text-slate-900">
                      No applications yet
                    </h3>

                    <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-500">
                      Browse available jobs and submit
                      your first application.
                    </p>

                    <Link
                      href="/candidate/jobs"
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      Find Jobs
                      <ArrowRight size={14} />
                    </Link>

                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">

                    {recentApplications.map(
                      (application) => (
                        <div
                          key={application.id}
                          className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                        >

                          <div className="min-w-0">

                            <p className="truncate text-sm font-semibold text-slate-900">
                              {application.job
                                ?.title ||
                                "Job position"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Applied{" "}
                              {formatDate(
                                application.applied_at,
                              )}
                            </p>

                          </div>

                          <div className="flex items-center gap-3">

                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusClasses(
                                application.status,
                              )}`}
                            >
                              {getStatusLabel(
                                application.status,
                              )}
                            </span>

                            {application.job && (
                              <Link
                                href={`/candidate/jobs/${application.job.id}`}
                                className="text-slate-400 transition hover:text-blue-600"
                                aria-label="View job"
                              >
                                <ArrowRight
                                  size={17}
                                />
                              </Link>
                            )}

                          </div>

                        </div>
                      ),
                    )}

                  </div>
                )}

              </section>

              {/* Quick actions */}
              <section className="space-y-4">

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                  <h2 className="text-base font-semibold text-slate-900">
                    Quick actions
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Keep your job search moving.
                  </p>

                  <div className="mt-5 space-y-2">

                    <Link
                      href="/candidate/jobs"
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <span className="flex items-center gap-3">
                        <Search size={17} />
                        Browse Jobs
                      </span>

                      <ArrowRight size={15} />
                    </Link>

                    <Link
                      href="/candidate/resumes"
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <span className="flex items-center gap-3">
                        <FileText size={17} />
                        Manage Resumes
                      </span>

                      <ArrowRight size={15} />
                    </Link>

                    <Link
                      href="/candidate/applications"
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <span className="flex items-center gap-3">
                        <BriefcaseBusiness
                          size={17}
                        />
                        My Applications
                      </span>

                      <ArrowRight size={15} />
                    </Link>

                  </div>

                </div>

                {/* Resume reminder */}
                {resumes.length === 0 && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                      <FileText size={18} />
                    </div>

                    <h3 className="mt-4 text-sm font-semibold text-slate-900">
                      Add your resume
                    </h3>

                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      Upload a PDF or DOCX resume before
                      applying for jobs.
                    </p>

                    <Link
                      href="/candidate/resumes"
                      className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-blue-700 hover:text-blue-800"
                    >
                      Upload Resume
                      <ArrowRight size={14} />
                    </Link>

                  </div>
                )}

                {/* Hired message */}
                {hiredCount > 0 && (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6">

                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 size={18} />

                      <span className="text-sm font-semibold">
                        Hired application
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-emerald-800">
                      You have {hiredCount} application
                      {hiredCount === 1 ? "" : "s"} marked
                      as hired.
                    </p>

                  </div>
                )}

              </section>

            </div>
          </>

        )}

          {error && !loading && (
            <section
              role="alert"
              className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm sm:p-12"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <RefreshCw size={22} />
              </div>

              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                Couldn&apos;t load your dashboard
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  setRetryCount((count) => count + 1)
                }
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <RefreshCw size={16} />
                Try again
              </button>
            </section>
          )}




      </div>
    </AppShell>
  );
}
