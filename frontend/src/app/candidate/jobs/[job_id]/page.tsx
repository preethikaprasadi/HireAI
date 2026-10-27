"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

import AppShell from "@/components/layout/AppShell";
import {
  Application,
  Job,
  getJob,
  getCandidateApplications,
  getCandidateResumes,
  createApplication,
  Resume,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";


function formatDate(value?: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      dateStyle: "medium",
    },
  ).format(new Date(value));
}


function formatEmploymentType(
  value: string,
) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase(),
    );
}


export default function CandidateJobDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const jobId = params.job_id as string;

  const [job, setJob] =
    useState<Job | null>(null);

  const [resumes, setResumes] =
    useState<Resume[]>([]);

  const [applications, setApplications] =
    useState<Application[]>([]);

  const [selectedResume, setSelectedResume] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [applying, setApplying] =
    useState(false);

  const [error, setError] =
    useState("");

  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const [success, setSuccess] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState(0);



  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      setLoadError("");

      try {
        const token = getAccessToken();

        if (!token) {
          router.replace("/login");
          return;
        }

        const [jobData, resumeData, applicationData] =
          await Promise.all([
            getJob(jobId, token),
            getCandidateResumes(token),
            getCandidateApplications(token),
          ]);

        if (cancelled) return;

        setJob(jobData);
        setCurrentTime(Date.now());
        setResumes(resumeData);
        setApplications(applicationData);

        const currentResume = resumeData.find(
          (resume) => resume.is_current,
        );

        setSelectedResume(currentResume?.id ?? "");
      } catch (err) {
        if (cancelled) return;

        setLoadError(
          err instanceof Error
            ? err.message
            : "Failed to load job details. Please try again.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (jobId) {
      void loadPage();
    }

    return () => {
      cancelled = true;
    };
  }, [jobId, router, retryCount]);

  const existingApplication =
    applications.find(
      (application) =>
        application.job_id === jobId,
    );

  const jobClosed =
    job?.status === "CLOSED" ||
    Boolean(
      job?.closing_date &&
        new Date(job.closing_date).getTime() <
          currentTime,
    );

  const hasResume = resumes.length > 0;
  const displayedLoadError = jobId
    ? loadError
    : "A valid job ID was not provided.";

  async function handleApply() {
    if (applying) return;
    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    if (existingApplication) {
      setError(
        "You have already applied for this position.",
      );
      return;
    }

    if (jobClosed) {
      setError(
        "This position is no longer accepting applications.",
      );
      return;
    }

    if (!hasResume) {
      setError(
        "Please upload a resume before applying.",
      );
      return;
    }

    if (!selectedResume) {
      setError(
        "Please select a resume before applying.",
      );
      return;
    }

    setApplying(true);
    setError("");

    try {
      const application = await createApplication(
        {
          job_id: jobId,
          resume_id: selectedResume,
        },
        token,
      );

      setApplications((current) => [
        application,
        ...current,
      ]);

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit application.",
      );
    } finally {
      setApplying(false);
    }
  }


  if (loading && jobId) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl animate-pulse">
          <div className="h-4 w-28 rounded bg-slate-200" />
          <div className="mt-8 h-9 w-96 rounded bg-slate-200" />
          <div className="mt-4 h-4 w-64 rounded bg-slate-200" />

          <div className="mt-8 h-72 rounded-2xl bg-slate-200" />
        </div>
      </AppShell>
    );
  }


  if (displayedLoadError) {
    return (
      <AppShell>
        <section
          role="alert"
          className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white px-6 py-14 text-center shadow-sm"
        >
          <h1 className="text-xl font-semibold text-slate-900">
            Could&apos;t load job details
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
            {displayedLoadError}
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Try again
            </button>

            <Link
              href="/candidate/jobs"
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back to Jobs
            </Link>
          </div>
        </section>
      </AppShell>
    );
  }

  if (!job) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl py-16 text-center">
          <h1 className="text-lg font-semibold text-slate-900">
            Job not found
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            This job may have been removed or is no longer available.
          </p>

          <Link
            href="/candidate/jobs"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
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
      <div className="mx-auto max-w-5xl">

        <Link
          href="/candidate/jobs"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Jobs
        </Link>


        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">

          {/* Job information */}
          <main className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <BriefcaseBusiness size={22} />
            </div>


            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              {job.title}
            </h1>


            {job.department && (
              <p className="mt-2 text-sm text-slate-500">
                {job.department}
              </p>
            )}


            <div className="mt-5 flex flex-wrap gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                {formatEmploymentType(
                  job.employment_type,
                )}
              </span>

              {job.location && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                  <MapPin size={13} />
                  {job.location}
                </span>
              )}
            </div>


            <div className="mt-8 border-t border-slate-100 pt-8">

              <h2 className="text-base font-semibold text-slate-900">
                About the role
              </h2>

              <div className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">
                {job.description}
              </div>

            </div>


            {(job.experience_min != null ||
              job.experience_max != null) && (
              <div className="mt-8 border-t border-slate-100 pt-8">

                <h2 className="text-base font-semibold text-slate-900">
                  Experience
                </h2>

                <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <Clock3
                    size={16}
                    className="text-slate-400"
                  />

                  {job.experience_min ?? 0}
                  –
                  {job.experience_max ?? "∞"}
                  years
                </p>

              </div>
            )}


            {job.closing_date && (
              <div className="mt-8 border-t border-slate-100 pt-8">

                <h2 className="text-base font-semibold text-slate-900">
                  Application deadline
                </h2>

                <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <CalendarDays
                    size={16}
                    className="text-slate-400"
                  />

                  {formatDate(job.closing_date)}
                </p>

              </div>
            )}

          </main>


          {/* Application panel */}
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">

            {success ? (
              <div className="text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={24} />
                </div>

                <h2 className="mt-4 text-lg font-semibold text-slate-900">
                  Application submitted
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Your application has been submitted
                  successfully.
                </p>

                <Link
                  href="/candidate/applications"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  View My Applications
                </Link>

                <Link
                  href="/candidate/jobs"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Continue Browsing
                </Link>

              </div>

            ) :
            existingApplication ? (
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <CheckCircle2 size={24} />
                </div>

                <h2 className="mt-4 text-center text-lg font-semibold text-slate-900">
                  Already applied
                </h2>

                <p className="mt-2 text-center text-sm leading-6 text-slate-500">
                  You have already submitted an application
                  for this position.
                </p>

                <div className="mt-5 rounded-xl bg-slate-50 p-4 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Application status
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {existingApplication.status
                      .replaceAll("_", " ")
                      .toLowerCase()
                      .replace(
                        /\b\w/g,
                        (letter) => letter.toUpperCase(),
                      )}
                  </p>
                </div>

                <Link
                  href="/candidate/applications"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  View My Applications
                </Link>
              </div>
            ) : jobClosed ? (
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <CalendarDays size={22} />
                </div>

                <h2 className="mt-4 text-center text-lg font-semibold text-slate-900">
                  Applications are closed
                </h2>

                <p className="mt-2 text-center text-sm leading-6 text-slate-500">
                  This position is no longer accepting
                  applications.
                </p>
              </div>
            ) :

            (
              <>
                <h2 className="text-lg font-semibold text-slate-900">
                  Apply for this position
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Select the resume you want to use
                  for this application.
                </p>


                {error && (
                  <div
                    role="alert"
                    className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs leading-5 text-red-700"
                  >
                    {error}
                  </div>
                )}

                <div className="mt-6">

                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Resume
                  </label>

                  {resumes.length === 0 ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-medium text-amber-800">
                        No resume available
                      </p>

                      <p className="mt-1 text-xs leading-5 text-amber-700">
                        Upload a resume before applying
                        for this position.
                      </p>

                      <Link
                        href="/candidate/resumes"
                        className="mt-3 inline-flex text-sm font-semibold text-amber-800 underline"
                      >
                        Upload resume
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {resumes.map((resume) => (
                        <label
                          key={resume.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                            selectedResume ===
                            resume.id
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="resume"
                            value={resume.id}
                            checked={
                              selectedResume ===
                              resume.id
                            }
                            onChange={(event) =>
                              setSelectedResume(
                                event.target.value,
                              )
                            }
                            className="mt-1"
                          />

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {resume.file_name}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Version{" "}
                              {resume.version}
                              {resume.is_current
                                ? " · Current"
                                : ""}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                </div>


                {resumes.length > 0 && (
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={
                      applying ||
                      !selectedResume
                    }
                    className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {applying
                      ? "Submitting..."
                      : "Submit Application"}
                  </button>
                )}

              </>
            )}

          </aside>

        </div>

      </div>
    </AppShell>
  );
}
