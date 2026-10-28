"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  DollarSign,
  Loader2,
  MapPin,
  Save,
  Users,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import {
  apiRequest,
  Department,
  getDepartments,
  Job,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
  "TEMPORARY",
];

export default function EditJobPage() {
  const params = useParams();
  const router = useRouter();

  const jobId = params.job_id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    title: "",
    department_id: "",
    description: "",
    location: "",
    employment_type: "",
    experience_min: "",
    experience_max: "",
    salary_min: "",
    salary_max: "",
    closing_date: "",
  });

  function toDateTimeLocal(value: string) {
    const date = new Date(value);

    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1,
    ).padStart(2, "0");
    const day = String(
      date.getDate(),
    ).padStart(2, "0");
    const hours = String(
      date.getHours(),
    ).padStart(2, "0");
    const minutes = String(
      date.getMinutes(),
    ).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  useEffect(() => {
    async function loadJob() {
      const token = getAccessToken();

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const data = await apiRequest<Job>(
          `/api/v1/jobs/${jobId}`,
          {
            method: "GET",
            token,
          },
        );

        setJob(data);

        setForm({
          title: data.title ?? "",
          department_id: data.department_id ?? "",
          description: data.description ?? "",
          location: data.location ?? "",
          employment_type: data.employment_type ?? "",
          experience_min:
            data.experience_min != null
              ? String(data.experience_min)
              : "",
          experience_max:
            data.experience_max != null
              ? String(data.experience_max)
              : "",
          salary_min:
            data.salary_min != null
              ? String(data.salary_min)
              : "",
          salary_max:
            data.salary_max != null
              ? String(data.salary_max)
              : "",
          closing_date: data.closing_date
            ? toDateTimeLocal(data.closing_date)
            : "",
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load job.",
        );
      } finally {
        setLoading(false);
      }
    }

    if (jobId) {
      loadJob();
    }
  }, [jobId, router]);

  useEffect(() => {
    async function loadDepartments() {
      if (!job?.company_id) {
        setDepartments([]);
        return;
      }

      const token = getAccessToken();

      if (!token) {
        setDepartments([]);
        return;
      }

      setLoadingDepartments(true);

      try {
        const data = await getDepartments(job.company_id, token);
        setDepartments(data);

        // Handle a legacy job whose department name matches
        // a department but whose ID was not previously linked.
        setForm((current) => {
          if (current.department_id) {
            return current;
          }

          const match = data.find(
            (department) =>
              department.name.toLowerCase() ===
              (job.department ?? "").trim().toLowerCase(),
          );

          return match
            ? { ...current, department_id: match.id }
            : current;
        });
      } catch (err) {
        setDepartments([]);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load departments.",
        );
      } finally {
        setLoadingDepartments(false);
      }
    }

    loadDepartments();
  }, [job?.company_id, job?.department]);

  function updateField(
    field: keyof typeof form,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setSuccess(false);
    setError("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    if (!form.title.trim()) {
      setError("Job title is required.");
      return;
    }

    if (form.title.trim().length < 2) {
      setError(
        "Job title must contain at least 2 characters.",
      );
      return;
    }

    if (form.description.trim().length < 10) {
      setError(
        "Job description must contain at least 10 characters.",
      );
      return;
    }

    if (!form.employment_type) {
      setError("Please select an employment type.");
      return;
    }

    const experienceMin = form.experience_min
      ? Number(form.experience_min)
      : undefined;

    const experienceMax = form.experience_max
      ? Number(form.experience_max)
      : undefined;

    const salaryMin = form.salary_min
      ? Number(form.salary_min)
      : undefined;

    const salaryMax = form.salary_max
      ? Number(form.salary_max)
      : undefined;

    if (
      experienceMin !== undefined &&
      experienceMax !== undefined &&
      experienceMin > experienceMax
    ) {
      setError(
        "Minimum experience cannot be greater than maximum experience.",
      );
      return;
    }

    if (
      salaryMin !== undefined &&
      salaryMax !== undefined &&
      salaryMin > salaryMax
    ) {
      setError(
        "Minimum salary cannot be greater than maximum salary.",
      );
      return;
    }

    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    setSaving(true);

    try {
      const updatedJob = await apiRequest<Job>(
        `/api/v1/jobs/${jobId}`,
        {
          method: "PUT",
          token,
          body: JSON.stringify({
            title: form.title.trim(),
            department_id: form.department_id || null,
            description: form.description.trim(),
            location:
              form.location.trim() || null,
            employment_type:
              form.employment_type,
            experience_min:
              experienceMin,
            experience_max:
              experienceMax,
            salary_min:
              salaryMin,
            salary_max:
              salaryMax,
            closing_date:
              form.closing_date
                ? new Date(
                    form.closing_date,
                  ).toISOString()
                : null,
          }),
        },
      );

      setJob(updatedJob);
      setSuccess(true);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update job.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl animate-pulse">
          <div className="mb-8 h-4 w-28 rounded bg-slate-200" />

          <div className="h-8 w-72 rounded bg-slate-200" />

          <div className="mt-3 h-4 w-96 rounded bg-slate-200" />

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="h-150 rounded-2xl bg-slate-200" />
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
          <h1 className="text-lg font-semibold text-slate-900">
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

  if (job.status === "CLOSED") {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <BriefcaseBusiness size={21} />
          </div>

          <h1 className="mt-4 text-lg font-semibold text-slate-900">
            This job is closed
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Closed jobs cannot be edited.
          </p>

          <Link
            href={`/recruiter/jobs/${job.id}`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            View Job
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/recruiter/jobs/${job.id}`}
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Job
          </Link>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Edit job
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Update the details for{" "}
              <span className="font-medium text-slate-700">
                {job.title}
              </span>
              .
            </p>
          </div>
        </div>

        {/* Success */}
        {success && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm text-emerald-700">
              Job updated successfully.
            </p>

            <Link
              href={`/recruiter/jobs/${job.id}`}
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              View job
            </Link>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Main */}
            <div className="space-y-6">
              {/* Job information */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <BriefcaseBusiness size={18} />
                    </div>

                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        Job information
                      </h2>

                      <p className="text-xs text-slate-500">
                        Update the basic information for this position.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Title */}
                  <div>
                    <label
                      htmlFor="title"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Job title
                      <span className="ml-1 text-red-500">*</span>
                    </label>

                    <input
                      id="title"
                      type="text"
                      value={form.title}
                      onChange={(event) =>
                        updateField(
                          "title",
                          event.target.value,
                        )
                      }
                      required
                      minLength={2}
                      maxLength={255}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  {/* Department + Location */}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="department"
                        className="mb-2 block text-sm font-medium text-slate-700"
                      >
                        Department
                      </label>

                      <select
                        id="department"
                        value={form.department_id}
                        onChange={(event) =>
                          updateField("department_id", event.target.value)
                        }
                        disabled={loadingDepartments}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50"
                      >
                        <option value="">
                          {loadingDepartments
                            ? "Loading departments..."
                            : departments.length === 0
                              ? "No departments available"
                              : "Select a department"}
                        </option>

                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="location"
                        className="mb-2 block text-sm font-medium text-slate-700"
                      >
                        Location
                      </label>

                      <div className="relative">
                        <MapPin
                          size={17}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                          id="location"
                          type="text"
                          value={form.location}
                          onChange={(event) =>
                            updateField(
                              "location",
                              event.target.value,
                            )
                          }
                          maxLength={255}
                          placeholder="e.g. Colombo, Sri Lanka"
                          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Employment type */}
                  <div>
                    <label
                      htmlFor="employment_type"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Employment type
                      <span className="ml-1 text-red-500">*</span>
                    </label>

                    <div className="relative">
                      <Users
                        size={17}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <select
                        id="employment_type"
                        value={form.employment_type}
                        onChange={(event) =>
                          updateField(
                            "employment_type",
                            event.target.value,
                          )
                        }
                        required
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                      >
                        <option value="">
                          Select employment type
                        </option>

                        {EMPLOYMENT_TYPES.map(
                          (type) => (
                            <option
                              key={type}
                              value={type}
                            >
                              {type
                                .replaceAll(
                                  "_",
                                  " ",
                                )
                                .toLowerCase()
                                .replace(
                                  /\b\w/g,
                                  (letter) =>
                                    letter.toUpperCase(),
                                )}
                            </option>
                          ),
                        )}
                      </select>

                      <ChevronDown
                        size={17}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Description */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Job description
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Update the responsibilities and expectations for
                    this role.
                  </p>
                </div>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value,
                    )
                  }
                  required
                  minLength={10}
                  rows={10}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />

                <div className="mt-2 flex justify-end">
                  <span className="text-xs text-slate-400">
                    {form.description.length} characters
                  </span>
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Experience */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Experience
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Experience range in years.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="experience_min"
                      className="mb-2 block text-xs font-medium text-slate-600"
                    >
                      Minimum
                    </label>

                    <input
                      id="experience_min"
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.experience_min}
                      onChange={(event) =>
                        updateField(
                          "experience_min",
                          event.target.value,
                        )
                      }
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="experience_max"
                      className="mb-2 block text-xs font-medium text-slate-600"
                    >
                      Maximum
                    </label>

                    <input
                      id="experience_max"
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.experience_max}
                      onChange={(event) =>
                        updateField(
                          "experience_max",
                          event.target.value,
                        )
                      }
                      placeholder="5"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>
              </section>

              {/* Salary */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Salary range
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Optional salary range.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="salary_min"
                      className="mb-2 block text-xs font-medium text-slate-600"
                    >
                      Minimum
                    </label>

                    <div className="relative">
                      <DollarSign
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="salary_min"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.salary_min}
                        onChange={(event) =>
                          updateField(
                            "salary_min",
                            event.target.value,
                          )
                        }
                        placeholder="50000"
                        className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="salary_max"
                      className="mb-2 block text-xs font-medium text-slate-600"
                    >
                      Maximum
                    </label>

                    <div className="relative">
                      <DollarSign
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="salary_max"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.salary_max}
                        onChange={(event) =>
                          updateField(
                            "salary_max",
                            event.target.value,
                          )
                        }
                        placeholder="80000"
                        className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Closing date */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Application deadline
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Optional closing date.
                  </p>
                </div>

                <div className="relative">
                  <CalendarDays
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="datetime-local"
                    value={form.closing_date}
                    onChange={(event) =>
                      updateField(
                        "closing_date",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </section>

              {/* Save */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-4 text-xs leading-5 text-slate-500">
                  Your changes will be saved immediately. The current
                  job status will remain unchanged.
                </p>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={17} />
                  )}

                  {saving
                    ? "Saving changes..."
                    : "Save changes"}
                </button>

                <Link
                  href={`/recruiter/jobs/${job.id}`}
                  className="mt-2 flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  Cancel
                </Link>
              </section>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
