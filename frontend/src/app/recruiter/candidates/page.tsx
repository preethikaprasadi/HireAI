"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  ChevronRight,
  FileText,
  MapPin,
  Search,
  Users,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import {
  getRecruiterCandidates,
  type ApplicationStatus,
  type RecruiterCandidate,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

const STATUS_OPTIONS: Array<
  ApplicationStatus | "ALL"
> = [
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
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function getStatusClasses(status: string) {
  switch (status) {
    case "SHORTLISTED":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "HIRED":
      return "bg-green-50 text-green-700 border-green-200";

    case "REJECTED":
      return "bg-red-50 text-red-700 border-red-200";

    case "REVIEWED":
      return "bg-purple-50 text-purple-700 border-purple-200";

    case "PENDING":
      return "bg-amber-50 text-amber-700 border-amber-200";

    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function getCandidateInitials(
  candidate: RecruiterCandidate
) {
  const name = candidate.name?.trim();

  if (!name) {
    return "CA";
  }

  const parts = name.split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

function formatExperience(
  years: number | null
) {
  if (years === null || years === undefined) {
    return "Experience not specified";
  }

  if (years === 0) {
    return "Entry level";
  }

  if (years === 1) {
    return "1 year experience";
  }

  return `${years} years experience`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function RecruiterCandidatesPage() {
  const [candidates, setCandidates] = useState<
    RecruiterCandidate[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<ApplicationStatus | "ALL">(
      "ALL"
    );

  const [locationFilter, setLocationFilter] =
    useState("ALL");

  useEffect(() => {
    let cancelled = false;

    async function loadCandidates() {
      try {

        const token = getAccessToken();

        if (!token) {
          throw new Error(
            "Authentication required."
          );
        }

        const response =
          await getRecruiterCandidates(token);

        if (!cancelled) {
          setCandidates(
            response.candidates
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load candidates."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCandidates();

    return () => {
      cancelled = true;
    };
  }, []);

  const locations = useMemo(() => {
    const uniqueLocations = new Set<string>();

    candidates.forEach((candidate) => {
      if (candidate.location?.trim()) {
        uniqueLocations.add(
          candidate.location.trim()
        );
      }
    });

    return Array.from(uniqueLocations).sort();
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return candidates.filter((candidate) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          candidate.name,
          candidate.email,
          candidate.location,
          candidate.headline,
          ...candidate.skills,
          ...candidate.job_titles,
          ...candidate.applications.map(
            (application) =>
              application.job_title
          ),
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(normalizedSearch)
          );

      const matchesLocation =
        locationFilter === "ALL" ||
        candidate.location ===
          locationFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        candidate.applications.some(
          (application) =>
            application.status ===
            statusFilter
        );

      return (
        matchesSearch &&
        matchesLocation &&
        matchesStatus
      );
    });
  }, [
    candidates,
    search,
    statusFilter,
    locationFilter,
  ]);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users className="h-4 w-4" />
            Recruitment
          </div>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Candidates
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Review candidates who have
                applied to your jobs.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Candidates
              </div>

              <div className="mt-1 text-xl font-bold text-slate-900">
                {candidates.length}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search candidates, skills, jobs..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | ApplicationStatus
                    | "ALL"
                )
              }
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              {STATUS_OPTIONS.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status === "ALL"
                      ? "All application statuses"
                      : formatStatus(
                          status
                        )}
                  </option>
                )
              )}
            </select>

            <select
              value={locationFilter}
              onChange={(event) =>
                setLocationFilter(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="ALL">
                All locations
              </option>

              {locations.map(
                (location) => (
                  <option
                    key={location}
                    value={location}
                  >
                    {location}
                  </option>
                )
              )}
            </select>
          </div>

          {!loading && (
            <div className="mt-3 text-xs text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {filteredCandidates.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700">
                {candidates.length}
              </span>{" "}
              candidates
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6"
                >
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-full bg-slate-200" />

                    <div className="flex-1 space-y-3">
                      <div className="h-4 w-48 rounded bg-slate-200" />
                      <div className="h-3 w-72 rounded bg-slate-200" />
                      <div className="h-3 w-40 rounded bg-slate-200" />
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="font-semibold text-red-800">
              Unable to load candidates
            </h2>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading &&
          !error &&
          filteredCandidates.length ===
            0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Users className="h-6 w-6 text-slate-400" />
              </div>

              <h2 className="mt-4 text-base font-semibold text-slate-900">
                No candidates found
              </h2>

              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                {search ||
                statusFilter !== "ALL" ||
                locationFilter !== "ALL"
                  ? "Try changing your search or filters."
                  : "Candidates will appear here when they apply to your jobs."}
              </p>
            </div>
          )}

        {/* Candidate list */}
        {!loading &&
          !error &&
          filteredCandidates.length >
            0 && (
            <div className="space-y-4">
              {filteredCandidates.map(
                (candidate) => {
                  /*
                   * Applications are displayed individually.
                   * We no longer assume applications[0] is
                   * the application the recruiter wants to view.
                   */
                  const sortedApplications = [
                    ...candidate.applications,
                  ].sort(
                    (a, b) =>
                      new Date(
                        b.applied_at
                      ).getTime() -
                      new Date(
                        a.applied_at
                      ).getTime()
                  );

                  const latestApplication =
                    sortedApplications[0];

                  return (
                    <div
                      key={candidate.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-5">
                        {/* Candidate identity */}
                        <div className="flex min-w-0 gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                            {getCandidateInitials(
                              candidate
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-base font-semibold text-slate-900">
                                {candidate.name ||
                                  "Unnamed candidate"}
                              </h2>

                              {latestApplication && (
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                                    latestApplication.status
                                  )}`}
                                >
                                  Latest:{" "}
                                  {formatStatus(
                                    latestApplication.status
                                  )}
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              {candidate.headline ||
                                "No headline provided"}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                              {candidate.email && (
                                <span>
                                  {
                                    candidate.email
                                  }
                                </span>
                              )}

                              {candidate.location && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {
                                    candidate.location
                                  }
                                </span>
                              )}

                              <span>
                                {formatExperience(
                                  candidate.years_of_experience
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Applications */}
                        {sortedApplications.length >
                          0 && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-2">
                                <BriefcaseBusiness className="h-4 w-4 text-slate-500" />

                                <h3 className="text-sm font-semibold text-slate-800">
                                  Applications
                                </h3>
                              </div>

                              <span className="text-xs text-slate-500">
                                {
                                  candidate.application_count
                                }{" "}
                                application
                                {candidate.application_count !==
                                1
                                  ? "s"
                                  : ""}
                              </span>
                            </div>

                            <div className="mt-3 space-y-2">
                              {sortedApplications.map(
                                (
                                  application
                                ) => (
                                  <div
                                    key={
                                      application.id
                                    }
                                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-sm font-medium text-slate-800">
                                          {
                                            application.job_title
                                          }
                                        </p>

                                        <span
                                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${getStatusClasses(
                                            application.status
                                          )}`}
                                        >
                                          {formatStatus(
                                            application.status
                                          )}
                                        </span>
                                      </div>

                                      <p className="mt-1 text-xs text-slate-500">
                                        Applied{" "}
                                        {formatDate(
                                          application.applied_at
                                        )}
                                      </p>
                                    </div>

                                    <Link
                                      href={`/recruiter/applications/${application.id}`}
                                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                                    >
                                      View Application
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    </Link>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="mt-5 grid gap-5 border-t border-slate-100 pt-5 md:grid-cols-3">
                        {/* Skills */}
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Skills
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {candidate.skills.length >
                            0 ? (
                              candidate.skills
                                .slice(0, 6)
                                .map(
                                  (skill) => (
                                    <span
                                      key={
                                        skill
                                      }
                                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                                    >
                                      {skill}
                                    </span>
                                  )
                                )
                            ) : (
                              <span className="text-sm text-slate-400">
                                No skills added
                              </span>
                            )}

                            {candidate.skills
                              .length >
                              6 && (
                              <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
                                +
                                {candidate
                                  .skills
                                  .length -
                                  6}{" "}
                                more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Application Summary */}
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Application Summary
                          </div>

                          <div className="mt-2 flex items-start gap-3">
                            <BriefcaseBusiness className="mt-0.5 h-4 w-4 text-slate-400" />

                            <div>
                              <div className="text-sm font-medium text-slate-800">
                                {
                                  candidate.application_count
                                }{" "}
                                application
                                {candidate.application_count !==
                                1
                                  ? "s"
                                  : ""}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {sortedApplications
                                  .slice(
                                    0,
                                    2
                                  )
                                  .map(
                                    (
                                      application
                                    ) =>
                                      application.job_title
                                  )
                                  .join(
                                    ", "
                                  )}

                                {sortedApplications
                                  .length >
                                  2 &&
                                  ` +${
                                    sortedApplications
                                      .length -
                                    2
                                  } more`}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Resume */}
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Resume
                          </div>

                          {candidate.resume ? (
                            <div className="mt-2 flex items-start gap-3">
                              <FileText className="mt-0.5 h-4 w-4 text-blue-500" />

                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-slate-800">
                                  {
                                    candidate
                                      .resume
                                      .file_name
                                  }
                                </div>

                                <div className="mt-1 text-xs text-slate-500">
                                  Version{" "}
                                  {
                                    candidate
                                      .resume
                                      .version
                                  }{" "}
                                  · Uploaded{" "}
                                  {formatDate(
                                    candidate
                                      .resume
                                      .uploaded_at
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 text-sm text-slate-400">
                              No resume available
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
      </div>
    </AppShell>
  );
}
