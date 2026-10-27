"use client";

import Link from "next/link";
import {
  BriefcaseBusiness,
  ChevronDown,
  Clock3,
  MapPin,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import {
  Application,
  getCandidateApplications,
  getJobs,
  Job,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

function formatEmploymentType(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function formatDate(value?: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function isClosed(job: Job) {
  if (job.status === "CLOSED") {
    return true;
  }

  if (!job.closing_date) {
    return false;
  }

  return new Date(job.closing_date).getTime() <
    Date.now();
}

export default function CandidateJobsPage() {
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] =
    useState<Application[]>([]);

  const [search, setSearch] = useState("");
  const [employmentFilter, setEmploymentFilter] =
    useState("ALL");
  const [locationFilter, setLocationFilter] =
    useState("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);


  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      setLoading(true);
      setError("");

      try {
        const token = getAccessToken();

        if (!token) {
          router.replace("/login");
          return;
        }

        const [jobData, applicationData] =
          await Promise.all([
            getJobs(token),
            getCandidateApplications(token),
          ]);

        if (cancelled) return;

        setJobs(jobData);
        setApplications(applicationData);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load jobs. Please try again.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadJobs();

    return () => {
      cancelled = true;
    };
  }, [router, retryCount]);

  const employmentTypes = useMemo(() => {
    return Array.from(
      new Set(
        jobs
          .map((job) => job.employment_type)
          .filter(Boolean),
      ),
    );
  }, [jobs]);

  const locations = useMemo(() => {
    return Array.from(
      new Set(
        jobs
          .map((job) => job.location)
          .filter(
            (location): location is string =>
              Boolean(location),
          ),
      ),
    ).sort();
  }, [jobs]);

  const appliedJobIds = useMemo(() => {
    return new Set(
      applications.map(
        (application) => application.job_id,
      ),
    );
  }, [applications]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesSearch =
        !query ||
        job.title
          .toLowerCase()
          .includes(query) ||
        job.description
          .toLowerCase()
          .includes(query) ||
        job.department
          ?.toLowerCase()
          .includes(query) ||
        job.location
          ?.toLowerCase()
          .includes(query);

      const matchesEmployment =
        employmentFilter === "ALL" ||
        job.employment_type ===
          employmentFilter;

      const matchesLocation =
        locationFilter === "ALL" ||
        job.location === locationFilter;

      return (
        matchesSearch &&
        matchesEmployment &&
        matchesLocation
      );
    });
  }, [
    jobs,
    search,
    employmentFilter,
    locationFilter,
  ]);

  const activeJobs = jobs.filter(
    (job) => !isClosed(job),
  ).length;

  const appliedCount = jobs.filter((job) =>
    appliedJobIds.has(job.id),
  ).length;

  function clearFilters() {
    setSearch("");
    setEmploymentFilter("ALL");
    setLocationFilter("ALL");
  }

  if (loading) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-6xl">
          <div className="animate-pulse">
            <div className="h-5 w-40 rounded bg-slate-200" />
            <div className="mt-3 h-8 w-72 rounded bg-slate-200" />
            <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-200" />

            <div className="mt-8 h-14 rounded-2xl bg-slate-200" />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="h-11 rounded-xl bg-slate-200" />
              <div className="h-11 rounded-xl bg-slate-200" />
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-64 rounded-2xl bg-slate-200"
                />
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }


  if (error) {
    return (
      <AppShell>
        <section
          role="alert"
          className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white px-6 py-14 text-center shadow-sm"
        >
          <h1 className="text-xl font-semibold text-slate-900">
            Couldn&apos;t load jobs
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
            {error}
          </p>

          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Try again
          </button>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-blue-600">
              Candidate workspace
            </p>

            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Find your next opportunity
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Explore available positions and find
              roles that match your experience.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
              {activeJobs} open
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">
              {appliedCount} applied
            </span>
          </div>
        </div>

        {/* Search + filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by job title, keyword, department, or location..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {/* Employment filter */}
            <div className="relative">
              <select
                value={employmentFilter}
                onChange={(event) =>
                  setEmploymentFilter(
                    event.target.value,
                  )
                }
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              >
                <option value="ALL">
                  All employment types
                </option>

                {employmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {formatEmploymentType(type)}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* Location filter */}
            <div className="relative">
              <select
                value={locationFilter}
                onChange={(event) =>
                  setLocationFilter(
                    event.target.value,
                  )
                }
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              >
                <option value="ALL">
                  All locations
                </option>

                {locations.map((location) => (
                  <option
                    key={location}
                    value={location}
                  >
                    {location}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>

          {(search ||
            employmentFilter !== "ALL" ||
            locationFilter !== "ALL") && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Showing {filteredJobs.length} of{" "}
                {jobs.length} jobs
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        {/* Results header */}
        <div className="mb-4 mt-7 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Available positions
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {filteredJobs.length}{" "}
              {filteredJobs.length === 1
                ? "position"
                : "positions"}{" "}
              found
            </p>
          </div>
        </div>

        {/* Empty state */}
        {filteredJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <BriefcaseBusiness size={24} />
            </div>

            <h2 className="mt-4 text-base font-semibold text-slate-900">
              {jobs.length === 0
                ? "No open positions yet"
                : "No jobs match your search"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {jobs.length === 0
                ? "There are no positions available right now. Please check back later for new opportunities."
                : "Try another search term or remove some filters to see more opportunities."}
            </p>
            {(search ||
              employmentFilter !== "ALL" ||
              locationFilter !== "ALL") && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredJobs.map((job) => {
              const applied = appliedJobIds.has(
                job.id,
              );

              const closed = isClosed(job);

              return (
                <Link
                  key={job.id}
                  href={`/candidate/jobs/${job.id}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <BriefcaseBusiness size={20} />
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      {applied && (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                          Applied
                        </span>
                      )}

                      {closed ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                          Closed
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          {formatEmploymentType(
                            job.employment_type,
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <h2 className="mt-5 text-lg font-semibold text-slate-900 transition group-hover:text-blue-600">
                    {job.title}
                  </h2>

                  {job.department && (
                    <p className="mt-1 text-sm text-slate-500">
                      {job.department}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                    {job.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={14} />
                        {job.location}
                      </span>
                    )}

                    {(job.experience_min != null ||
                      job.experience_max != null) && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={14} />
                        {job.experience_min ?? 0}
                        {"–"}
                        {job.experience_max ?? "∞"}{" "}
                        years
                      </span>
                    )}
                  </div>

                  <p className="mt-5 line-clamp-3 text-sm leading-6 text-slate-500">
                    {job.description}
                  </p>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-xs text-slate-400">
                      {job.closing_date
                        ? `Closes ${formatDate(
                            job.closing_date,
                          )}`
                        : "Open position"}
                    </span>

                    <span className="text-sm font-semibold text-blue-600">
                      {applied
                        ? "View application →"
                        : closed
                          ? "View details →"
                          : "View & apply →"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
