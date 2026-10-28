"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Filter,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";

import {
  getJob,
  getJobMatches,
  updateApplicationStatus,
  type ApplicationStatus,
  type CandidateMatch,
  type Job,
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

type MatchFilter =
  | "ALL"
  | "STRONG_MATCH"
  | "POTENTIAL_MATCH"
  | "LOW_MATCH";

type SortOption =
  | "SCORE_DESC"
  | "SCORE_ASC"
  | "NAME_ASC";


function formatStatus(status: string): string {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}


function getApplicationStatusClasses(
  status: string,
): string {
  switch (status) {
    case "SHORTLISTED":
      return "bg-emerald-50 text-emerald-700";

    case "HIRED":
      return "bg-blue-50 text-blue-700";

    case "REJECTED":
      return "bg-red-50 text-red-700";

    case "REVIEWED":
      return "bg-violet-50 text-violet-700";

    case "PENDING":
      return "bg-amber-50 text-amber-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}


function getMatchClasses(
  status: string,
): string {
  switch (status) {
    case "STRONG_MATCH":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";

    case "POTENTIAL_MATCH":
      return "bg-amber-50 text-amber-700 border-amber-100";

    case "LOW_MATCH":
      return "bg-slate-100 text-slate-600 border-slate-200";

    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}


function getScoreClasses(
  score: number,
): string {
  if (score >= 75) {
    return "text-emerald-600";
  }

  if (score >= 50) {
    return "text-amber-600";
  }

  return "text-slate-500";
}


function getScoreLabel(
  score: number,
): string {
  if (score >= 75) {
    return "Strong match";
  }

  if (score >= 50) {
    return "Potential match";
  }

  return "Low match";
}


function getCandidateInitials(
  name: string,
): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "C";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}


function clampScore(
  value: number,
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, value),
  );
}


export default function JobMatchesPage() {
  const params = useParams();
  const router = useRouter();

  const jobId = params.job_id as string;

  const [job, setJob] =
    useState<Job | null>(null);

  const [matches, setMatches] =
    useState<CandidateMatch[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [matchFilter, setMatchFilter] =
    useState<MatchFilter>("ALL");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [sortOption, setSortOption] =
    useState<SortOption>("SCORE_DESC");

  const [statusUpdating, setStatusUpdating] =
    useState<string | null>(null);


  useEffect(() => {
    async function loadMatches() {
      const token = getAccessToken();

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");


        console.log("AI MATCHES PAGE - requested job ID:", jobId);

        const [
          jobResponse,
          matchResponse,
        ] = await Promise.all([
          getJob(jobId, token),
          getJobMatches(jobId, token),
        ]);

        console.log("AI MATCHES PAGE - loaded job:", {
          id: jobResponse.id,
          title: jobResponse.title,
        });

        console.log(
          "AI MATCHES PAGE - returned match count:",
          matchResponse.length,
        );


        setJob(jobResponse);
        setMatches(matchResponse);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load AI matches.",
        );
      } finally {
        setLoading(false);
      }
    }

    if (jobId) {
      loadMatches();
    }
  }, [jobId, router]);


  const filteredMatches = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    const filtered = matches.filter(
      (match) => {
        const candidateName =
          match.candidate_name
            ?.toLowerCase() || "";

        const matchedRequired =
          match.details.matched_required
            .join(" ")
            .toLowerCase();

        const matchedPreferred =
          match.details.matched_preferred
            .join(" ")
            .toLowerCase();

        const missingRequired =
          match.details.missing_required
            .join(" ")
            .toLowerCase();

        const missingPreferred =
          match.details.missing_preferred
            .join(" ")
            .toLowerCase();

        const matchedTitle =
          match.details.matched_title
            ?.toLowerCase() || "";

        const matchesSearch =
          !query ||
          candidateName.includes(query) ||
          matchedRequired.includes(query) ||
          matchedPreferred.includes(query) ||
          missingRequired.includes(query) ||
          missingPreferred.includes(query) ||
          matchedTitle.includes(query);

        const matchesQuality =
          matchFilter === "ALL" ||
          match.match_status ===
            matchFilter;

        const matchesStatus =
          statusFilter === "ALL" ||
          match.application_status ===
            statusFilter;

        return (
          matchesSearch &&
          matchesQuality &&
          matchesStatus
        );
      },
    );

    return [...filtered].sort(
      (a, b) => {
        if (sortOption === "SCORE_ASC") {
          return (
            a.overall_score -
            b.overall_score
          );
        }

        if (sortOption === "NAME_ASC") {
          return a.candidate_name
            .localeCompare(
              b.candidate_name,
            );
        }

        return (
          b.overall_score -
          a.overall_score
        );
      },
    );
  }, [
    matches,
    search,
    matchFilter,
    statusFilter,
    sortOption,
  ]);


  const strongCount =
    matches.filter(
      (match) =>
        match.overall_score >= 75,
    ).length;

  const potentialCount =
    matches.filter(
      (match) =>
        match.overall_score >= 50 &&
        match.overall_score < 75,
    ).length;

  const lowCount =
    matches.filter(
      (match) =>
        match.overall_score < 50,
    ).length;

  const shortlistedCount =
    matches.filter(
      (match) =>
        match.application_status ===
        "SHORTLISTED",
    ).length;


  async function handleStatusChange(
    applicationId: string,
    newStatus: ApplicationStatus,
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

      setMatches((current) =>
        current.map((match) =>
          match.application_id ===
          applicationId
            ? {
                ...match,
                application_status:
                  updatedApplication.status,
              }
            : match,
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


  function clearFilters() {
    setSearch("");
    setMatchFilter("ALL");
    setStatusFilter("ALL");
    setSortOption("SCORE_DESC");
  }


  if (loading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-7xl space-y-6">

          <div className="h-5 w-28 animate-pulse rounded bg-slate-200" />

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="h-7 w-72 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-4 w-96 animate-pulse rounded bg-slate-100" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map(
              (item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse rounded-2xl bg-slate-200"
                />
              ),
            )}
          </div>

          <div className="space-y-4">
            {[1, 2, 3].map(
              (item) => (
                <div
                  key={item}
                  className="h-56 animate-pulse rounded-2xl bg-slate-200"
                />
              ),
            )}
          </div>

        </div>
      </AppShell>
    );
  }


  if (error && !job) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl">

          <Link
            href="/recruiter/jobs"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Jobs
          </Link>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex gap-3">

              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <h2 className="font-semibold text-red-900">
                  Unable to load AI matches
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

            </div>
          </div>

        </div>
      </AppShell>
    );
  }


  if (!job) {
    return null;
  }


  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">

        {/* Back navigation */}

        <Link
          href={`/recruiter/jobs/${job.id}`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Job
        </Link>


        {/* Header */}

        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <BriefcaseBusiness size={15} />
              {job.title}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">

              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                AI Candidate Matches
              </h1>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                <Sparkles size={13} />
                AI ranked
              </span>

            </div>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Candidates are ranked using skills,
              experience, role alignment, and
              semantic similarity for this position.
            </p>

          </div>


          <div className="flex flex-col gap-2 sm:flex-row">

            <Link
              href={`/recruiter/jobs/${job.id}/applications`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Users size={16} />
              Applications
            </Link>

            <Link
              href={`/recruiter/jobs/${job.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Job Details
            </Link>

          </div>

        </div>


        {/* Error banner */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />

            <span>{error}</span>

          </div>
        )}


        {/* Summary cards */}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <MatchSummaryCard
            label="Candidates"
            value={matches.length}
            description="Applications analyzed"
            icon={<Users size={17} />}
            iconClasses="bg-blue-50 text-blue-600"
          />

          <MatchSummaryCard
            label="Strong matches"
            value={strongCount}
            description="75% or higher"
            icon={<Target size={17} />}
            iconClasses="bg-emerald-50 text-emerald-600"
          />

          <MatchSummaryCard
            label="Potential matches"
            value={potentialCount}
            description="50% to 74%"
            icon={<TrendingUp size={17} />}
            iconClasses="bg-amber-50 text-amber-600"
          />

          <MatchSummaryCard
            label="Shortlisted"
            value={shortlistedCount}
            description={`${lowCount} low matches`}
            icon={<CheckCircle2 size={17} />}
            iconClasses="bg-violet-50 text-violet-600"
          />

        </div>


        {/* Filters */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="relative min-w-0 flex-1">

              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search candidates or skills..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>


            <div className="grid gap-3 sm:grid-cols-3 lg:flex">

              <FilterSelect
                value={matchFilter}
                onChange={(value) =>
                  setMatchFilter(
                    value as MatchFilter,
                  )
                }
                options={[
                  {
                    value: "ALL",
                    label: "All match quality",
                  },
                  {
                    value: "STRONG_MATCH",
                    label: "Strong matches",
                  },
                  {
                    value: "POTENTIAL_MATCH",
                    label: "Potential matches",
                  },
                  {
                    value: "LOW_MATCH",
                    label: "Low matches",
                  },
                ]}
              />

              <FilterSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  {
                    value: "ALL",
                    label: "All statuses",
                  },
                  ...STATUS_OPTIONS.map(
                    (status) => ({
                      value: status,
                      label: formatStatus(
                        status,
                      ),
                    }),
                  ),
                ]}
              />

              <FilterSelect
                value={sortOption}
                onChange={(value) =>
                  setSortOption(
                    value as SortOption,
                  )
                }
                options={[
                  {
                    value: "SCORE_DESC",
                    label: "Best match first",
                  },
                  {
                    value: "SCORE_ASC",
                    label: "Lowest match first",
                  },
                  {
                    value: "NAME_ASC",
                    label: "Candidate name",
                  },
                ]}
              />

            </div>

          </div>


          {(search.trim() ||
            matchFilter !== "ALL" ||
            statusFilter !== "ALL") && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">

              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {filteredMatches.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {matches.length}
                </span>{" "}
                candidates
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


        {/* Candidate results */}

        {matches.length === 0 ? (
          <EmptyMatchesState />
        ) : filteredMatches.length === 0 ? (
          <NoFilteredMatchesState
            onClear={clearFilters}
          />
        ) : (
          <div className="space-y-4">

            {filteredMatches.map(
              (match, index) => (
                <MatchCard
                  key={match.application_id}
                  match={match}
                  rank={index + 1}
                  statusUpdating={
                    statusUpdating ===
                    match.application_id
                  }
                  onStatusChange={
                    handleStatusChange
                  }
                />
              ),
            )}

          </div>
        )}

      </div>
    </AppShell>
  );
}


function MatchSummaryCard({
  label,
  value,
  description,
  icon,
  iconClasses,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  iconClasses: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <span className="text-sm font-medium text-slate-500">
          {label}
        </span>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClasses}`}
        >
          {icon}
        </div>

      </div>

      <p className="mt-4 text-2xl font-semibold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>

    </div>
  );
}


function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
}) {
  return (
    <div className="relative">

      <Filter
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:min-w-44"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
      />

    </div>
  );
}


function MatchCard({
  match,
  rank,
  statusUpdating,
  onStatusChange,
}: {
  match: CandidateMatch;
  rank: number;
  statusUpdating: boolean;
  onStatusChange: (
    applicationId: string,
    status: ApplicationStatus,
  ) => void;
}) {
  const score = clampScore(
    match.overall_score,
  );

  const candidateName =
    match.candidate_name ||
    "Unnamed candidate";

  const matchedRequired =
    match.details.matched_required || [];

  const matchedPreferred =
    match.details.matched_preferred || [];

  const missingRequired =
    match.details.missing_required || [];

  const missingPreferred =
    match.details.missing_preferred || [];

  const matchedSkills = [
    ...matchedRequired,
    ...matchedPreferred,
  ];

  const missingSkills = [
    ...missingRequired,
    ...missingPreferred,
  ];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300">

      {/* Candidate header */}

      <div className="border-b border-slate-100 p-5 sm:p-6">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

          <div className="flex min-w-0 items-start gap-4">

            {/* Rank */}

            <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 sm:flex">
              #{rank}
            </div>


            {/* Avatar */}

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-semibold text-blue-600">
              {getCandidateInitials(
                candidateName,
              )}
            </div>


            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2">

                <h2 className="truncate text-base font-semibold text-slate-900">
                  {candidateName}
                </h2>

                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getMatchClasses(
                    match.match_status,
                  )}`}
                >
                  {getScoreLabel(score)}
                </span>

              </div>


              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">

                <span className="inline-flex items-center gap-1.5">
                  <UserRound size={13} />
                  Candidate
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <Clock3 size={13} />
                  Application status:{" "}
                  {formatStatus(
                    match.application_status,
                  )}
                </span>

              </div>

            </div>

          </div>


          {/* Score */}

          <div className="flex items-center gap-4 lg:shrink-0">

            <div className="text-left lg:text-right">

              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Match score
              </p>

              <p
                className={`mt-0.5 text-3xl font-bold tracking-tight ${getScoreClasses(
                  score,
                )}`}
              >
                {score.toFixed(0)}
                <span className="text-base font-semibold">
                  %
                </span>
              </p>

            </div>

          </div>

        </div>

      </div>


      {/* Match breakdown */}

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_280px]">

        <div className="space-y-6">

          {/* Component scores */}

          <section>

            <div className="mb-4 flex items-center justify-between">

              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Match breakdown
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  How this candidate compares with the job requirements.
                </p>
              </div>

            </div>


            <div className="grid gap-3 sm:grid-cols-2">

              <ScoreBar
                label="Skills"
                score={match.components.skill}
              />

              <ScoreBar
                label="Experience"
                score={
                  match.components
                    .experience
                }
              />

              <ScoreBar
                label="Role"
                score={match.components.role}
              />

              <ScoreBar
                label="Semantic"
                score={
                  match.components
                    .semantic
                }
              />

            </div>

          </section>


          {/* Skills */}

          <section className="grid gap-5 sm:grid-cols-2">

            <SkillList
              title="Matched skills"
              skills={matchedSkills}
              positive
              emptyText="No matching skills found."
            />

            <SkillList
              title="Missing skills"
              skills={missingSkills}
              positive={false}
              emptyText="No missing skills identified."
            />

          </section>


          {/* Match details */}

          <section className="grid gap-3 sm:grid-cols-3">

            <DetailBox
              label="Experience"
              value={
                match.details
                  .experience_status
                  ? formatStatus(
                      match.details
                        .experience_status,
                    )
                  : "Not available"
              }
            />

            <DetailBox
              label="Role alignment"
              value={
                match.details
                  .role_status
                  ? formatStatus(
                      match.details
                        .role_status,
                    )
                  : "Not available"
              }
              secondary={
                match.details
                  .matched_title
                  ? `Matched title: ${match.details.matched_title}`
                  : undefined
              }
            />

            <DetailBox
              label="Semantic similarity"
              value={
                match.details
                  .semantic_status
                  ? formatStatus(
                      match.details
                        .semantic_status,
                    )
                  : "Not available"
              }
            />

          </section>

        </div>


        {/* Actions */}

        <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4">

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Candidate actions
          </p>


          <div className="mt-4 space-y-3">

            <Link
              href={`/recruiter/applications/${match.application_id}`}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              <UserRound size={15} />
              Review Candidate
            </Link>


            <div>

              <label
                htmlFor={`status-${match.application_id}`}
                className="mb-1.5 block text-xs font-medium text-slate-500"
              >
                Application status
              </label>

              <div className="relative">

                <select
                  id={`status-${match.application_id}`}
                  value={
                    match.application_status
                  }
                  disabled={statusUpdating}
                  onChange={(event) =>
                    onStatusChange(
                      match.application_id,
                      event.target
                        .value as ApplicationStatus,
                    )
                  }
                  className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {STATUS_OPTIONS.map(
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

                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

              </div>

            </div>


            <Link
              href={`/recruiter/jobs/${match.application_id}/applications`}
              className="hidden"
            >
              Applications
            </Link>

          </div>


          <div className="mt-5 border-t border-slate-200 pt-4">

            <div className="flex items-center justify-between text-xs">

              <span className="text-slate-400">
                Current status
              </span>

              <span
                className={`rounded-full px-2.5 py-1 font-medium ${getApplicationStatusClasses(
                  match.application_status,
                )}`}
              >
                {formatStatus(
                  match.application_status,
                )}
              </span>

            </div>

          </div>

        </aside>

      </div>

    </article>
  );
}


function ScoreBar({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  const safeScore =
    clampScore(score);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">

      <div className="flex items-center justify-between">

        <span className="text-xs font-medium text-slate-600">
          {label}
        </span>

        <span
          className={`text-xs font-bold ${getScoreClasses(
            safeScore,
          )}`}
        >
          {safeScore.toFixed(0)}%
        </span>

      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">

        <div
          className={`h-full rounded-full transition-all ${
            safeScore >= 75
              ? "bg-emerald-500"
              : safeScore >= 50
                ? "bg-amber-500"
                : "bg-slate-400"
          }`}
          style={{
            width: `${safeScore}%`,
          }}
        />

      </div>

    </div>
  );
}


function SkillList({
  title,
  skills,
  positive,
  emptyText,
}: {
  title: string;
  skills: string[];
  positive: boolean;
  emptyText: string;
}) {
  const uniqueSkills = [
    ...new Set(
      skills.filter(Boolean),
    ),
  ];

  return (
    <div>

      <h3 className="text-sm font-semibold text-slate-900">
        {title}
      </h3>

      <div className="mt-3 flex flex-wrap gap-2">

        {uniqueSkills.length > 0 ? (
          uniqueSkills.map(
            (skill, index) => (
              <span
                key={`${skill}-${index}`}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                  positive
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                    : "border-red-100 bg-red-50 text-red-700"
                }`}
              >
                {positive ? (
                  <CheckCircle2 size={12} />
                ) : (
                  <XCircle size={12} />
                )}

                {skill}
              </span>
            ),
          )
        ) : (
          <p className="text-xs text-slate-500">
            {emptyText}
          </p>
        )}

      </div>

    </div>
  );
}


function DetailBox({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">

      <p className="text-xs font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 text-sm font-semibold text-slate-800">
        {value}
      </p>

      {secondary && (
        <p className="mt-1 text-[11px] leading-4 text-slate-500">
          {secondary}
        </p>
      )}

    </div>
  );
}


function EmptyMatchesState() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center shadow-sm">

      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
        <Sparkles size={22} />
      </div>

      <h2 className="mt-4 text-base font-semibold text-slate-900">
        No AI matches available
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        There are currently no applications with
        completed matching data for this job.
      </p>

      <Link
        href="/recruiter/jobs"
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        <ArrowLeft size={15} />
        Back to Jobs
      </Link>

    </div>
  );
}


function NoFilteredMatchesState({
  onClear,
}: {
  onClear: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center shadow-sm">

      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <Search size={21} />
      </div>

      <h2 className="mt-4 text-base font-semibold text-slate-900">
        No matching candidates
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        Try changing your search or filters.
      </p>

      <button
        type="button"
        onClick={onClear}
        className="mt-5 text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        Clear filters
      </button>

    </div>
  );
}
