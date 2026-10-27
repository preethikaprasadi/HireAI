"use client";

import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  useEffect,
  useState,
} from "react";

import AppShell from "@/components/layout/AppShell";
import {
  deleteCandidateResume,
  getCandidateResumes,
  Resume,
  uploadCandidateResume,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";


const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];


function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


function formatDate(value?: string) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      dateStyle: "medium",
    },
  ).format(new Date(value));
}


function getAnalysisStatus() {
  /*
   * The resume list endpoint does not expose
   * analysis status directly, so the upload/list
   * page treats an existing resume as uploaded.
   *
   * The detailed analysis can be shown later by
   * calling the existing analysis endpoint.
   */
  return "Uploaded";
}


export default function CandidateResumesPage() {
  const router = useRouter();

  const [resumes, setResumes] =
    useState<Resume[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");



useEffect(() => {
  let cancelled = false;

  async function fetchResumes() {
    setLoading(true);
    setLoadError("");

    try {
      const token = getAccessToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      const data = await getCandidateResumes(token);

      if (cancelled) return;

      setResumes(data);
    } catch (err) {
      if (cancelled) return;

      setLoadError(
        err instanceof Error
          ? err.message
          : "Failed to load resumes. Please try again.",
      );
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  void fetchResumes();

  return () => {
    cancelled = true;
  };
}, [router, retryCount]);

  async function handleUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    /*
     * Reset the input so the same file can
     * be selected again after an error.
     */
    event.target.value = "";

    if (!file) {
      return;
    }

    setError("");
    setSuccess("");


    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(
        "Only PDF and DOCX resume files are supported.",
      );

      return;
    }


    if (file.size > MAX_FILE_SIZE) {
      setError(
        "Resume file must be 5 MB or smaller.",
      );

      return;
    }


    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }


    setUploading(true);

        try {
      const uploadedResume =
        await uploadCandidateResume(
          file,
          token,
        );

      setResumes((current) => [
        uploadedResume,
        ...current,
      ]);

      setSuccess(
        "Resume uploaded successfully.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload resume.",
      );
    } finally {
      setUploading(false);
    }
  }


  async function handleDelete(
    resume: Resume,
  ) {
    if (deletingId !== null) return;
    const confirmed =
      window.confirm(
        `Delete "${resume.file_name}"?`,
      );

    if (!confirmed) {
      return;
    }

    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    setDeletingId(resume.id);
    setError("");
    setSuccess("");

    try {
      await deleteCandidateResume(
        resume.id,
        token,
      );

      setResumes((current) =>
        current.filter(
          (item) => item.id !== resume.id,
        ),
      );

      setSuccess(
        "Resume deleted successfully.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete resume.",
      );
    } finally {
      setDeletingId(null);
    }
  }


if (loading) {
  return (
    <AppShell>
      <div
        role="status"
        className="flex min-h-[50vh] flex-col items-center justify-center px-5"
      >
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-4 text-sm font-medium text-slate-700">
          Loading your resumes...
        </p>
      </div>
    </AppShell>
  );
}

if (loadError) {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl py-10">
        <section
          role="alert"
          className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm sm:p-12"
        >
          <AlertCircle
            size={28}
            className="mx-auto text-red-500"
          />

          <h1 className="mt-4 text-xl font-semibold text-slate-900">
            Couldn&apos;t load your resumes
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() =>
              setRetryCount((count) => count + 1)
            }
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Try again
          </button>
        </section>
      </div>
    </AppShell>
  );
}

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            My Resumes
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Manage the resumes you use when applying
            for jobs. Your current resume is automatically
            used as the default selection.
          </p>
        </div>


        {/* Messages */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <span>{error}</span>
          </div>
        )}


        {success && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
            />

            <span>{success}</span>
          </div>
        )}


        {/* Upload card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

            <div>
              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Upload size={19} />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Upload a resume
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    PDF or DOCX · Maximum 5 MB
                  </p>
                </div>

              </div>
            </div>


            <label
              className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                uploading
                  ? "cursor-not-allowed bg-blue-400"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {uploading ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Choose Resume
                </>
              )}

              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                disabled={uploading || deletingId !== null}
                onChange={handleUpload}
                className="hidden"
              />
            </label>

          </div>


          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <p className="text-xs leading-5 text-slate-500">
              HireAI automatically extracts structured
              information from uploaded resumes for
              recruitment matching.
            </p>
          </div>

        </section>


        {/* Resume list */}
        <section className="mt-6">

          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Uploaded resumes
              </h2>

              {!loading && (
                <p className="mt-1 text-xs text-slate-500">
                  {resumes.length}{" "}
                  {resumes.length === 1
                    ? "resume"
                    : "resumes"}
                </p>
              )}
            </div>
          </div>


          {loading ? (
            <div className="space-y-3">
              <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
              <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
            </div>
          ) : resumes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <FileText size={22} />
              </div>

              <h3 className="mt-4 text-base font-semibold text-slate-900">
                No resumes uploaded
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Upload your resume to start applying
                for positions on HireAI.
              </p>

            </div>
          ) : (
            <div className="space-y-3">

              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 sm:p-6"
                >

                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                    <div className="flex min-w-0 items-start gap-4">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <FileText size={20} />
                      </div>


                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <h3 className="truncate text-sm font-semibold text-slate-900">
                            {resume.file_name}
                          </h3>

                          {resume.is_current && (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                              Current
                            </span>
                          )}

                        </div>


                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">

                          <span>
                            Version{" "}
                            {resume.version}
                          </span>

                          <span>
                            {formatFileSize(
                              resume.file_size,
                            )}
                          </span>

                          <span>
                            Uploaded{" "}
                            {formatDate(
                              resume.uploaded_at,
                            )}
                          </span>

                        </div>


                        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                          <CheckCircle2 size={14} />
                          {getAnalysisStatus()}
                        </div>

                      </div>

                    </div>


                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(resume)
                      }
                      disabled={
                        deletingId !== null
                      }
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 px-3.5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId ===
                      resume.id ? (
                        <Loader2
                          size={15}
                          className="animate-spin"
                        />
                      ) : (
                        <Trash2 size={15} />
                      )}

                      {deletingId ===
                      resume.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>

                  </div>

                </div>
              ))}

            </div>
          )}

        </section>


        {/* Application hint */}
        {resumes.length > 0 && (
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Ready to apply?
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                Choose your resume when applying to a
                job. Your current resume is selected by
                default.
              </p>
            </div>

            <Link
              href="/candidate/jobs"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Browse Jobs
            </Link>

          </div>
        )}

      </div>
    </AppShell>
  );
}
