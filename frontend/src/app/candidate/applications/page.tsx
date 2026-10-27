"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import {
  Application,
  Job,
  Resume,
  getCandidateApplications,
  getCandidateResumes,
  getJob,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";


const APPLICATION_STATUSES = [
  "APPLIED",
  "PENDING",
  "REVIEWED",
  "SHORTLISTED",
  "HIRED",
] as const;


function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase(),
    );
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

    case "HIRED":
      return "bg-blue-50 text-blue-700";

    case "REJECTED":
      return "bg-red-50 text-red-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}


function getStatusIcon(status: string) {
  switch (status) {
    case "HIRED":
    case "SHORTLISTED":
      return CheckCircle2;

    case "REJECTED":
      return XCircle;

    default:
      return Clock3;
  }
}


function formatDate(value?: string) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      dateStyle: "medium",
    },
  ).format(date);
}


function getPipelineIndex(status: string) {
  return APPLICATION_STATUSES.indexOf(
    status as (typeof APPLICATION_STATUSES)[number],
  );
}


function isPipelineStatusComplete(
  currentStatus: string,
  pipelineStatus: string,
) {
  const currentIndex =
    getPipelineIndex(currentStatus);

  const pipelineIndex =
    getPipelineIndex(pipelineStatus);

  if (
    currentStatus === "REJECTED" ||
    currentIndex === -1 ||
    pipelineIndex === -1
  ) {
    return false;
  }

  return pipelineIndex <= currentIndex;
}


export default function CandidateApplicationsPage() {
  const router = useRouter();

  const [applications, setApplications] =
    useState<Application[]>([]);

  const [jobs, setJobs] =
    useState<Record<string, Job>>({});

  const [resumes, setResumes] =
    useState<Resume[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);



  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError("");

      try {
        const token = getAccessToken();

        if (!token) {
          router.replace("/login");
          return;
        }

        const [applicationData, resumeData] =
          await Promise.all([
            getCandidateApplications(token),
            getCandidateResumes(token),
          ]);

        if (cancelled) return;

        const uniqueJobIds = [
          ...new Set(
            applicationData.map(
              (application) => application.job_id,
            ),
          ),
        ];

        const jobResults = await Promise.all(
          uniqueJobIds.map(async (jobId) => {
            try {
              return await getJob(jobId, token);
            } catch {
              // Keep the application visible if its job
              // details are no longer available.
              return null;
            }
          }),
        );

        if (cancelled) return;

        const jobMap: Record<string, Job> = {};

        jobResults.forEach((job) => {
          if (job) {
            jobMap[job.id] = job;
          }
        });

        setApplications(applicationData);
        setResumes(resumeData);
        setJobs(jobMap);
      } catch (err) {
        if (cancelled) return;

        setLoadError(
          err instanceof Error
            ? err.message
            : "Failed to load applications. Please try again.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [router, retryCount]);


  const sortedApplications =
    useMemo(() => {
      return [...applications].sort(
        (a, b) =>
          new Date(
            b.applied_at || 0,
          ).getTime() -
          new Date(
            a.applied_at || 0,
          ).getTime(),
      );
    }, [applications]);


  const resumeMap = useMemo(() => {
    return resumes.reduce(
      (
        map: Record<string, Resume>,
        resume,
      ) => {
        map[resume.id] = resume;
        return map;
      },
      {},
    );
  }, [resumes]);


  const applicationSummary =
    useMemo(() => {
      return {
        total: applications.length,
        active: applications.filter(
          (application) =>
            [
              "APPLIED",
              "PENDING",
              "REVIEWED",
              "SHORTLISTED",
            ].includes(
              application.status,
            ),
        ).length,
        shortlisted:
          applications.filter(
            (application) =>
              application.status ===
              "SHORTLISTED",
          ).length,
        hired:
          applications.filter(
            (application) =>
              application.status ===
              "HIRED",
          ).length,
      };
    }, [applications]);


  if (loading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="h-8 w-64 rounded bg-slate-200" />

          <div className="mt-3 h-4 w-80 rounded bg-slate-200" />

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="h-24 rounded-2xl bg-slate-200" />
            <div className="h-24 rounded-2xl bg-slate-200" />
            <div className="h-24 rounded-2xl bg-slate-200" />
            <div className="h-24 rounded-2xl bg-slate-200" />
          </div>

          <div className="mt-8 space-y-5">
            <div className="h-80 rounded-2xl bg-slate-200" />
            <div className="h-80 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </AppShell>
    );
  }


  if (loadError) {
    return (
      <AppShell>
        <section
          role="alert"
          className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white px-6 py-14 text-center shadow-sm"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <RefreshCw size={22} />
          </div>

          <h1 className="mt-4 text-xl font-semibold text-slate-900">
            Couldn&apos;t load your applications
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() =>
              setRetryCount((count) => count + 1)
            }
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <RefreshCw size={15} />
            Try again
          </button>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            My Applications
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Track your applications, review the jobs
            you applied for, and follow your progress
            through the hiring process.
          </p>
        </div>


        {/* Summary */}
        {sortedApplications.length > 0 && (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500">
                Total applications
              </p>

              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {applicationSummary.total}
              </p>
            </div>


            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500">
                Active applications
              </p>

              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {applicationSummary.active}
              </p>
            </div>


            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500">
                Shortlisted
              </p>

              <p className="mt-2 text-2xl font-semibold text-emerald-600">
                {applicationSummary.shortlisted}
              </p>
            </div>


            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500">
                Hired
              </p>

              <p className="mt-2 text-2xl font-semibold text-blue-600">
                {applicationSummary.hired}
              </p>
            </div>

          </div>
        )}


        {/* Empty state */}
        {sortedApplications.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <BriefcaseBusiness size={24} />
            </div>

            <h2 className="mt-5 text-base font-semibold text-slate-900">
              No applications yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              You haven&apos;t applied for any jobs yet.
              Explore available opportunities and submit
              your first application.
            </p>

            <Link
              href="/candidate/jobs"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Browse Jobs
            </Link>

          </div>
        ) : (
          <div className="space-y-5">

            {sortedApplications.map(
              (application) => {
                const job =
                  jobs[application.job_id];

                const resume =
                  resumeMap[
                    application.resume_id
                  ];

                const StatusIcon =
                  getStatusIcon(
                    application.status,
                  );

                return (
                  <article
                    key={application.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >

                    {/* Application header */}
                    <div className="p-5 sm:p-6">

                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                        <div className="flex min-w-0 items-start gap-4">

                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <BriefcaseBusiness
                              size={21}
                            />
                          </div>


                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-lg font-semibold text-slate-900">
                                {job?.title ||
                                  "Job position"}
                              </h2>

                              {job?.employment_type && (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                  {formatStatus(
                                    job.employment_type,
                                  )}
                                </span>
                              )}
                            </div>


                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">

                              {job?.department && (
                                <span className="inline-flex items-center gap-1.5">
                                  <Building2
                                    size={13}
                                  />
                                  {job.department}
                                </span>
                              )}

                              {job?.location && (
                                <span className="inline-flex items-center gap-1.5">
                                  <MapPin
                                    size={13}
                                  />
                                  {job.location}
                                </span>
                              )}

                            </div>


                            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400">
                              <CalendarDays
                                size={13}
                              />

                              Applied{" "}
                              {formatDate(
                                application.applied_at,
                              )}
                            </p>

                          </div>

                        </div>


                        {/* Current status */}
                        <div
                          className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusClasses(
                            application.status,
                          )}`}
                        >
                          <StatusIcon
                            size={14}
                          />

                          {formatStatus(
                            application.status,
                          )}
                        </div>

                      </div>


                      {/* Six-status pipeline */}
                      <div className="mt-7 overflow-x-auto pb-1">
                        <div className="flex min-w-[620px] items-start">

                          {APPLICATION_STATUSES.map(
                            (
                              pipelineStatus,
                              index,
                            ) => {
                              const complete =
                                isPipelineStatusComplete(
                                  application.status,
                                  pipelineStatus,
                                );

                              const isCurrent =
                                application.status ===
                                pipelineStatus;

                              const isRejected =
                                application.status ===
                                "REJECTED";

                              return (
                                <div
                                  key={
                                    pipelineStatus
                                  }
                                  className="flex flex-1 items-start"
                                >

                                  <div className="flex min-w-0 flex-1 flex-col items-center">

                                    <div
                                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-[11px] font-semibold transition ${
                                        complete
                                          ? "border-blue-600 bg-blue-600 text-white"
                                          : "border-slate-200 bg-white text-slate-400"
                                      } ${
                                        isCurrent
                                          ? "ring-4 ring-blue-50"
                                          : ""
                                      } ${
                                        isRejected
                                          ? "opacity-50"
                                          : ""
                                      }`}
                                    >
                                      {complete ? (
                                        <Check
                                          size={14}
                                        />
                                      ) : (
                                        index + 1
                                      )}
                                    </div>


                                    <span
                                      className={`mt-2 text-center text-[10px] font-medium sm:text-[11px] ${
                                        isCurrent
                                          ? "text-slate-900"
                                          : complete
                                            ? "text-slate-600"
                                            : "text-slate-400"
                                      }`}
                                    >
                                      {formatStatus(
                                        pipelineStatus,
                                      )}
                                    </span>

                                  </div>


                                  {index <
                                    APPLICATION_STATUSES.length -
                                      1 && (
                                    <div
                                      className={`mt-4 h-0.5 flex-1 ${
                                        complete &&
                                        getPipelineIndex(
                                          application.status,
                                        ) >
                                          index
                                          ? "bg-blue-600"
                                          : "bg-slate-200"
                                      }`}
                                    />
                                  )}

                                </div>
                              );
                            },
                          )}

                        </div>
                      </div>


                      {/* Rejected terminal status */}
                      {application.status ===
                        "REJECTED" && (
                        <div className="mt-5 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                            <XCircle
                              size={17}
                            />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-red-800">
                              Application not selected
                            </p>

                            <p className="mt-0.5 text-xs text-red-700">
                              This application is no longer
                              active in the hiring process.
                            </p>
                          </div>
                        </div>
                      )}


                      {/* Job information */}
                      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                        <div className="rounded-xl bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-slate-400">
                            <BriefcaseBusiness
                              size={15}
                            />

                            <span className="text-xs font-medium">
                              Position
                            </span>
                          </div>

                          <p className="mt-2 truncate text-sm font-semibold text-slate-700">
                            {job?.title ||
                              "Unavailable"}
                          </p>
                        </div>


                        <div className="rounded-xl bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-slate-400">
                            <MapPin
                              size={15}
                            />

                            <span className="text-xs font-medium">
                              Location
                            </span>
                          </div>

                          <p className="mt-2 truncate text-sm font-semibold text-slate-700">
                            {job?.location ||
                              "Not specified"}
                          </p>
                        </div>


                        <div className="rounded-xl bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-slate-400">
                            <Clock3
                              size={15}
                            />

                            <span className="text-xs font-medium">
                              Experience
                            </span>
                          </div>

                          <p className="mt-2 text-sm font-semibold text-slate-700">
                            {job?.experience_min !=
                              null ||
                            job?.experience_max !=
                              null
                              ? `${job?.experience_min ?? 0}–${
                                  job?.experience_max ??
                                  "∞"
                                } years`
                              : "Not specified"}
                          </p>
                        </div>


                        <div className="rounded-xl bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-slate-400">
                            <CalendarDays
                              size={15}
                            />

                            <span className="text-xs font-medium">
                              Last updated
                            </span>
                          </div>

                          <p className="mt-2 text-sm font-semibold text-slate-700">
                            {formatDate(
                              application.updated_at,
                            )}
                          </p>
                        </div>

                      </div>


                      {/* Resume used */}
                      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                          <div className="flex min-w-0 items-center gap-3">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                              <FileText
                                size={18}
                              />
                            </div>


                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-500">
                                Resume used for this application
                              </p>

                              <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                                {resume?.file_name ||
                                  "Resume unavailable"}
                              </p>
                            </div>

                          </div>


                          {resume && (
                            <span className="w-fit shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                              Version{" "}
                              {resume.version}
                            </span>
                          )}

                        </div>

                      </div>


                      {/* Actions */}
                      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">

                        <p className="text-xs text-slate-400">
                          Application ID:{" "}
                          <span className="font-mono">
                            {application.id.slice(
                              0,
                              8,
                            )}
                            ...
                          </span>
                        </p>


                        {job ? (
                          <Link
                            href={`/candidate/jobs/${job.id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            View job details

                            <span aria-hidden="true">
                              →
                            </span>
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Job details unavailable
                          </span>
                        )}

                      </div>

                    </div>

                  </article>
                );
              },
            )}

          </div>
        )}

      </div>
    </AppShell>
  );
}
