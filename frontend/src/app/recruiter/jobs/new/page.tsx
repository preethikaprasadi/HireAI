"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronDown,
  DollarSign,
  MapPin,
  Save,
  Users,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import {
  Company,
  Department,
  Skill,
  createJob,
  createSkill,
  getRecruiterSkillCatalog,
  getDepartments,
  getRecruiterCompanies,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type SelectedJobSkill = {
  skill_id: string;
  name: string;
  requirement_type: "REQUIRED" | "PREFERRED";
  importance: number;
};

const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
  "TEMPORARY",
];


export default function CreateJobPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<SelectedJobSkill[]>([]);
  const [skillToAdd, setSkillToAdd] = useState("");
  const [newSkillName, setNewSkillName] = useState("");
  const [skillError, setSkillError] = useState("");
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [creatingSkill, setCreatingSkill] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    company_id: "",
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


  useEffect(() => {
    async function loadCompanies() {
      const token = getAccessToken();

      if (!token) {
        setError("You are not authenticated.");
        setLoadingCompanies(false);
        return;
      }

      try {
        const data = await getRecruiterCompanies(token);

        setCompanies(data);

        if (data.length === 1) {
          setForm((current) => ({
            ...current,
            company_id: data[0].id,
          }));
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load companies.",
        );
      } finally {
        setLoadingCompanies(false);
      }
    }

    loadCompanies();
  }, []);

  useEffect(() => {
    async function loadDepartments() {
      if (!form.company_id) {
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
        const data = await getDepartments(form.company_id, token);
        setDepartments(data);
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
  }, [form.company_id]);

  useEffect(() => {
    const loadSkills = async () => {
      const token = localStorage.getItem("hireai_access_token");

      if (!token) return;

      setLoadingSkills(true);

      try {
        const skills = await getRecruiterSkillCatalog(token);
        setAvailableSkills(skills);
      } catch (error) {
        console.error("Failed to load skills:", error);
        setSkillError("Could not load the skill catalog.");
      } finally {
        setLoadingSkills(false);
      }
    };

    loadSkills();
  }, []);

  function updateField(
    field: keyof typeof form,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  const addExistingSkill = () => {
    const skill = availableSkills.find(
      (item) => item.id === skillToAdd
    );

    if (!skill) return;

    if (
      selectedSkills.some(
        (item) => item.skill_id === skill.id
      )
    ) {
      setSkillError("This skill has already been added.");
      return;
    }

    setSelectedSkills((previous) => [
      ...previous,
      {
        skill_id: skill.id,
        name: skill.name,
        requirement_type: "REQUIRED",
        importance: 5,
      },
    ]);

    setSkillToAdd("");
    setSkillError("");
  };

  const addNewSkill = async () => {
    const name = newSkillName.trim();
    const token = localStorage.getItem("hireai_access_token");

    if (!name || !token) {
      setSkillError("Enter a skill name.");
      return;
    }

    const duplicate = selectedSkills.some(
      (item) => item.name.toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
      setSkillError("This skill has already been added.");
      return;
    }

    setCreatingSkill(true);
    setSkillError("");

    try {
      const skill = await createSkill(name, token);

      setAvailableSkills((previous) =>
        previous.some((item) => item.id === skill.id)
          ? previous
          : [...previous, skill].sort((a, b) =>
              a.name.localeCompare(b.name)
            )
      );

      setSelectedSkills((previous) => {
        if (previous.some((item) => item.skill_id === skill.id)) {
          return previous;
        }

        return [
          ...previous,
          {
            skill_id: skill.id,
            name: skill.name,
            requirement_type: "REQUIRED",
            importance: 5,
          },
        ];
      });

      setNewSkillName("");
    } catch (error) {
      setSkillError(
        error instanceof Error
          ? error.message
          : "Could not create the skill."
      );
    } finally {
      setCreatingSkill(false);
    }
  };

  const updateSelectedSkill = (
    skillId: string,
    updates: Partial<
      Pick<SelectedJobSkill, "requirement_type" | "importance">
    >
  ) => {
    setSelectedSkills((previous) =>
      previous.map((skill) =>
        skill.skill_id === skillId
          ? { ...skill, ...updates }
          : skill
      )
    );
  };

  const removeSelectedSkill = (skillId: string) => {
    setSelectedSkills((previous) =>
      previous.filter((skill) => skill.skill_id !== skillId)
    );
  };

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess(false);


    if (!form.company_id) {
      setError("Please select a company.");
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
      setError("You are not authenticated.");
      return;
    }


    setSaving(true);

   try {

    await createJob(
      {
        company_id: form.company_id,
        title: form.title.trim(),
        department_id: form.department_id || null,
          description: form.description.trim(),
          skills: selectedSkills.map((skill) => ({
            skill_id: skill.skill_id,
            requirement_type: skill.requirement_type,
            importance: skill.importance,
          })),
          location: form.location.trim() || undefined,
          employment_type: form.employment_type,
          experience_min: experienceMin,
          experience_max: experienceMax,
          salary_min: salaryMin,
          salary_max: salaryMax,
          closing_date: form.closing_date
            ? new Date(form.closing_date).toISOString()
            : undefined,
        },
        token,
      );

      setSuccess(true);

      setForm({
        company_id: form.company_id,
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

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create job.",
      );
    } finally {
      setSaving(false);
    }
  }


  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/recruiter/jobs"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Jobs
          </Link>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Create a new job
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Add the details for the position you want to recruit for.
            </p>
          </div>
        </div>


        {/* Success */}
        {success && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Job created successfully as a draft.
            You can review it from your jobs page before publishing.
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

            {/* Main form */}
            <div className="space-y-6">

              {/* Basic information */}
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
                        Basic information about the position.
                      </p>
                    </div>
                  </div>
                </div>


                <div className="space-y-5">

                  {/* Company */}
                  <div>
                    <label
                      htmlFor="company"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Company
                      <span className="ml-1 text-red-500">*</span>
                    </label>

                    <div className="relative">
                      <Building2
                        size={17}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <select
                        id="company"
                        value={form.company_id}
                        onChange={(event) => {
                          setForm((current) => ({
                            ...current,
                            company_id: event.target.value,
                            department_id: "",
                          }));
                          setError("");
                        }}
                        disabled={loadingCompanies}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50"
                      >
                        <option value="">
                          {loadingCompanies
                            ? "Loading companies..."
                            : "Select a company"}
                        </option>

                        {companies.map((company) => (
                          <option
                            key={company.id}
                            value={company.id}
                          >
                            {company.name}
                          </option>
                        ))}
                      </select>

                      <ChevronDown
                        size={17}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                    </div>

                    {!loadingCompanies &&
                      companies.length === 0 && (
                        <p className="mt-2 text-xs text-amber-600">
                          You need to create a company before creating
                          a job.
                        </p>
                      )}
                  </div>


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
                      placeholder="e.g. Junior Python Developer"
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
                        disabled={!form.company_id || loadingDepartments}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50"
                      >
                        <option value="">
                          {!form.company_id
                            ? "Select a company first"
                            : loadingDepartments
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
                          placeholder="e.g. Colombo, Sri Lanka"
                          maxLength={255}
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

                        {EMPLOYMENT_TYPES.map((type) => (
                          <option
                            key={type}
                            value={type}
                          >
                            {type
                              .replace("_", " ")
                              .toLowerCase()
                              .replace(
                                /^\w/,
                                (letter) =>
                                  letter.toUpperCase(),
                              )}
                          </option>
                        ))}
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
                    Describe the role, responsibilities, and what the
                    candidate will work on.
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
                  placeholder="Describe the responsibilities, technologies, team, and expectations for this role..."
                  required
                  minLength={10}
                  rows={9}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />

                <div className="mt-2 flex justify-end">
                  <span className="text-xs text-slate-400">
                    {form.description.length} characters
                  </span>
                </div>

              </section>


              {/* Required Skills */}
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Required Skills
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Select skills for this job and set their requirement type
                    and importance. You can also add new skills to the catalog.
                  </p>
                </div>

                {skillError && (
                  <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {skillError}
                  </p>
                )}

                <div className="mb-5">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Choose an existing skill
                  </label>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={skillToAdd}
                      onChange={(event) => setSkillToAdd(event.target.value)}
                      disabled={loadingSkills}
                      className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">
                        {loadingSkills ? "Loading skills..." : "Select a skill"}
                      </option>

                      {availableSkills
                        .filter(
                          (skill) =>
                            !selectedSkills.some(
                              (selected) => selected.skill_id === skill.id
                            )
                        )
                        .map((skill) => (
                          <option key={skill.id} value={skill.id}>
                            {skill.name}
                          </option>
                        ))}
                    </select>

                    <button
                      type="button"
                      onClick={addExistingSkill}
                      disabled={!skillToAdd || loadingSkills}
                      className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Add skill
                    </button>
                  </div>
                </div>

                <div className="mb-6 rounded-xl border border-dashed border-gray-300 p-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Add a new skill
                  </label>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={newSkillName}
                      onChange={(event) => setNewSkillName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void addNewSkill();
                        }
                      }}
                      maxLength={150}
                      placeholder="e.g. FastAPI, Docker, TypeScript"
                      className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />

                    <button
                      type="button"
                      onClick={() => void addNewSkill()}
                      disabled={!newSkillName.trim() || creatingSkill}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {creatingSkill ? "Adding..." : "Create skill"}
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    New skills are added to the shared catalog and can be reused.
                  </p>
                </div>

                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">
                    Selected skills
                  </h3>
                  <span className="text-xs text-gray-500">
                    {selectedSkills.length} selected
                  </span>
                </div>

                {selectedSkills.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-gray-600">
                      No skills added yet
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Add skills to help match candidates to this job.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedSkills.map((skill) => (
                      <div
                        key={skill.skill_id}
                        className="rounded-xl border border-gray-200 p-4"
                      >
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {skill.name}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Set how important this skill is for the role.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeSelectedSkill(skill.skill_id)}
                            aria-label={`Remove ${skill.name}`}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <span aria-hidden="true">✕</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700">
                              Requirement
                            </label>

                            <select
                              value={skill.requirement_type}
                              onChange={(event) =>
                                updateSelectedSkill(skill.skill_id, {
                                  requirement_type: event.target.value as
                                    | "REQUIRED"
                                    | "PREFERRED",
                                })
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            >
                              <option value="REQUIRED">Required</option>
                              <option value="PREFERRED">Preferred</option>
                            </select>
                          </div>

                          <div>
                            <div className="mb-1.5 flex items-center justify-between">
                              <label className="text-sm font-medium text-gray-700">
                                Priority
                              </label>
                              <span className="text-sm font-semibold text-indigo-600">
                                {skill.importance}/10
                              </span>
                            </div>

                            <input
                              type="range"
                              min={1}
                              max={10}
                              step={1}
                              value={skill.importance}
                              onChange={(event) =>
                                updateSelectedSkill(skill.skill_id, {
                                  importance: Number(event.target.value),
                                })
                              }
                              aria-label={`${skill.name} priority`}
                              className="w-full accent-indigo-600"
                            />

                            <div className="flex justify-between text-xs text-gray-400">
                              <span>Low</span>
                              <span>High</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>


            </div>


            {/* Right side */}
            <div className="space-y-6">

              {/* Experience */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <div className="mb-5">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Experience
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Optional experience range in years.
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
                    Optional closing date for applications.
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


              {/* Submit */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <p className="mb-4 text-xs leading-5 text-slate-500">
                  The job will be saved as a draft. You can review the
                  details and publish it later.
                </p>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    loadingCompanies ||
                    companies.length === 0
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={17} />

                  {saving
                    ? "Creating job..."
                    : "Create job"}
                </button>

              </div>

            </div>

          </div>
        </form>

      </div>
    </AppShell>
  );
}
