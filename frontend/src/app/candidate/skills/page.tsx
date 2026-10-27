"use client";

import {
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import {
  createCandidateSkill,
  deleteCandidateSkill,
  getAvailableSkills,
  getCandidateSkills,
  type CandidateSkill,
  type Skill,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

export default function CandidateSkillsPage() {
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [skills, setSkills] = useState<CandidateSkill[]>([]);

  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [proficiency, setProficiency] = useState("");
  const [years, setYears] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [deletingSkillId, setDeletingSkillId] = useState("");


useEffect(() => {
  let cancelled = false;

  async function loadData() {
    setLoading(true);
    setLoadError("");
    setError("");

    try {
      const token = getAccessToken();

      if (!token) {
        window.location.replace("/login");
        return;
      }

      const [catalog, candidateSkills] = await Promise.all([
        getAvailableSkills(token),
        getCandidateSkills(token),
      ]);

      if (cancelled) return;

      setAvailableSkills(catalog);
      setSkills(candidateSkills);
    } catch (err) {
      if (cancelled) return;

      setLoadError(
        err instanceof Error
          ? err.message
          : "Unable to load your skills. Please try again.",
      );
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  void loadData();

  return () => {
    cancelled = true;
  };
}, [retryCount]);

  function getSkillName(skillId: string) {
    return (
      availableSkills.find(
        (skill) => skill.id === skillId,
      )?.name ?? "Unknown skill"
    );
  }

  function isAlreadyAdded(skillId: string) {
    return skills.some(
      (skill) => skill.skill_id === skillId,
    );
  }

  async function handleAddSkill(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedSkillId) {
      setError("Please select a skill.");
      return;
    }

    if (isAlreadyAdded(selectedSkillId)) {
      setError("You already have this skill.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const token = getAccessToken();

      if (!token) {
        throw new Error("Please log in again.");
      }

      const experience =
        years.trim() === ""
          ? undefined
          : Number(years);

      if (
        experience !== undefined &&
        (!Number.isFinite(experience) ||
          experience < 0 ||
          experience > 60)
      ) {
        throw new Error(
          "Years of experience must be a valid number.",
        );
      }

      const newSkill = await createCandidateSkill(
        {
          skill_id: selectedSkillId,
          proficiency:
            proficiency || undefined,
          years_experience: experience,
        },
        token,
      );

      setSkills((current) => [
        ...current,
        newSkill,
      ]);

      setSelectedSkillId("");
      setProficiency("");
      setYears("");

      setSuccess("Skill added successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to add skill.",
      );
    } finally {
      setSaving(false);
    }
  }


async function handleDeleteSkill(skillId: string) {
  if (deletingSkillId) return;

  try {
    setDeletingSkillId(skillId);
    setError("");
    setSuccess("");

    const token = getAccessToken();

    if (!token) {
      window.location.replace("/login");
      return;
    }

    await deleteCandidateSkill(skillId, token);

    setSkills((current) =>
      current.filter((skill) => skill.skill_id !== skillId),
    );

    setSuccess("Skill removed.");
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Unable to remove skill. Please try again.",
    );
  } finally {
    setDeletingSkillId("");
  }
}

if (loading) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5">
      <div
        role="status"
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
      >
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
        <p className="mt-4 text-sm font-medium text-slate-700">
          Loading your skills...
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Please wait while we retrieve your skills.
        </p>
      </div>
    </div>
  );
}

if (loadError) {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10">
      <section
        role="alert"
        className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm sm:p-12"
      >
        <h1 className="text-xl font-semibold text-slate-900">
          Couldn&apos;t load your skills
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
          {loadError}
        </p>

        <button
          type="button"
          onClick={() => setRetryCount((count) => count + 1)}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
        >
          Try again
        </button>
      </section>
    </div>
  );
}

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Sparkles size={22} />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              My Skills
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Add the technical and professional
              skills that represent your experience.
            </p>
          </div>
        </div>
      </div>

      {/* Add skill */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-base font-semibold text-slate-900">
            Add a skill
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Your skills can be used when matching your
            profile with suitable jobs.
          </p>
        </div>

        <form
          onSubmit={handleAddSkill}
          className="p-6"
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {/* Skill */}
            <div>
              <label
                htmlFor="skill"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Skill
              </label>

              <select
                id="skill"
                value={selectedSkillId}
                onChange={(event) => {
                  setSelectedSkillId(
                    event.target.value,
                  );
                  setError("");
                  setSuccess("");
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              >
                <option value="">
                  Select a skill
                </option>

                {availableSkills.map((skill) => (
                  <option
                    key={skill.id}
                    value={skill.id}
                    disabled={isAlreadyAdded(
                      skill.id,
                    )}
                  >
                    {skill.name}
                    {isAlreadyAdded(skill.id)
                      ? " — Already added"
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Proficiency */}
            <div>
              <label
                htmlFor="proficiency"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Proficiency
              </label>

              <select
                id="proficiency"
                value={proficiency}
                onChange={(event) =>
                  setProficiency(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              >
                <option value="">
                  Select level
                </option>

                <option value="BEGINNER">
                  Beginner
                </option>

                <option value="INTERMEDIATE">
                  Intermediate
                </option>

                <option value="ADVANCED">
                  Advanced
                </option>

                <option value="EXPERT">
                  Expert
                </option>
              </select>
            </div>

            {/* Experience */}
            <div>
              <label
                htmlFor="skill-years"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Years of experience
              </label>

              <input
                id="skill-years"
                type="number"
                min="0"
                max="60"
                step="0.5"
                value={years}
                onChange={(event) =>
                  setYears(event.target.value)
                }
                placeholder="e.g. 2"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={17} />

              {saving
                ? "Adding..."
                : "Add Skill"}
            </button>
          </div>
        </form>
      </div>

      {/* Feedback */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Existing skills */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Your skills
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {skills.length === 0
                  ? "No skills added yet."
                  : `${skills.length} skill${
                      skills.length === 1
                        ? ""
                        : "s"
                    } added`}
              </p>
            </div>

            <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {skills.length}
            </div>
          </div>
        </div>

        <div className="p-6">
          {skills.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <Sparkles
                size={28}
                className="mx-auto text-slate-400"
              />

              <h3 className="mt-3 text-sm font-semibold text-slate-800">
                No skills yet
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Add your technical and professional
                skills above to strengthen your
                candidate profile.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {skills.map((skill) => (
                <div
                  key={`${skill.skill_id}`}
                  className="group flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {getSkillName(
                        skill.skill_id,
                      )}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {skill.proficiency && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                          {formatProficiency(
                            skill.proficiency,
                          )}
                        </span>
                      )}

                      {skill.years_experience !==
                        null &&
                        skill.years_experience !==
                          undefined && (
                          <span className="text-xs text-slate-500">
                            {
                              skill.years_experience
                            }{" "}
                            {skill.years_experience ===
                            1
                              ? "year"
                              : "years"}
                          </span>
                        )}
                    </div>
                  </div>


                  <button
                    type="button"
                    disabled={deletingSkillId !== ""}
                    onClick={() =>
                      handleDeleteSkill(skill.skill_id)
                    }
                    aria-label={`Remove ${getSkillName(
                      skill.skill_id,
                    )}`}
                    className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
                  >

                    {deletingSkillId === skill.skill_id ? (
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-red-600"
                        aria-label="Removing skill"
                      />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Matching information */}
      <div className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
          <Sparkles size={18} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            How your skills are used
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            HireAI uses your listed skills together
            with your resume information when
            evaluating how your profile matches
            available jobs.
          </p>
        </div>
      </div>
    </div>
  );
}

function formatProficiency(
  value: string,
): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}
