
"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
  BriefcaseBusiness,
} from "lucide-react";

import {
  login,
  register,
  getCurrentUser,
  getAccessToken,
} from "@/lib/auth";

import {
  createCompany,
  requestCompanyJoin,
  getCompanyDirectory,
  type CompanyDirectoryItem,
} from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "CANDIDATE" as "CANDIDATE" | "RECRUITER",
    companyChoice: "CREATE" as "CREATE" | "JOIN",
    companyName: "",
    selectedCompanyId: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [companies, setCompanies] = useState<CompanyDirectoryItem[]>([]);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [success, setSuccess] = useState("");

  function updateField(
    field: keyof typeof form,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  useEffect(() => {
  if (
    form.role !== "RECRUITER" ||
    form.companyChoice !== "JOIN"
  ) {
    return;
  }

  let cancelled = false;

  async function loadCompanies() {
    setCompanyLoading(true);
    setError("");

    try {
      const results = await getCompanyDirectory();

      if (!cancelled) {
        setCompanies(results);
      }
    } catch (err) {
      if (!cancelled) {
        setCompanies([]);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load the company directory.",
        );
      }
    } finally {
      if (!cancelled) {
        setCompanyLoading(false);
      }
    }
  }

  void loadCompanies();

  return () => {
    cancelled = true;
  };
}, [form.role, form.companyChoice]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);


    try {
      if (
        form.role === "RECRUITER" &&
        form.companyChoice === "CREATE" &&
        !form.companyName.trim()
      ) {
        throw new Error("Please enter your company name.");
      }

      if (
        form.role === "RECRUITER" &&
        form.companyChoice === "JOIN" &&
        !form.selectedCompanyId
      ) {
        throw new Error("Please select a company to join.");
      }

      await register({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      });

      await login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      const user = await getCurrentUser();

      if (user.role === "RECRUITER") {
        const token = getAccessToken();

        if (!token) {
          throw new Error("Unable to establish your login session.");
        }

        if (form.companyChoice === "CREATE") {
          await createCompany(
            { name: form.companyName.trim() },
            token,
          );

          router.replace("/recruiter/dashboard");
          return;
        }

        await requestCompanyJoin(form.selectedCompanyId, token);

        setSuccess(
          "Your account has been created and your join request has been submitted. You can access the company after its owner approves your request.",
        );

        return;
      }

      if (user.role === "CANDIDATE") {
        router.replace("/candidate/dashboard");
        return;
      }

      throw new Error("Your account has an unsupported role.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create your account.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Brand panel */}
        <section className="hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
          <Link href="/login" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">
              H
            </div>
            <span className="text-xl font-semibold text-white">
              HireAI
            </span>
          </Link>

          <div className="max-w-lg">
            <p className="mb-4 text-sm font-medium text-blue-400">
              AI-powered recruitment
            </p>

            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white">
              The right opportunity starts with the right connection.
            </h1>

            <p className="mt-6 text-base leading-7 text-slate-400">
              Discover opportunities, manage recruitment, and
              bring candidate insights together in one workspace.
            </p>
          </div>

          <p className="text-sm text-slate-500">
            HireAI Recruitment Platform
          </p>
        </section>

        {/* Registration form */}
        <section className="flex items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">
            {/* Mobile brand */}
            <Link
              href="/login"
              className="mb-8 flex items-center gap-3 lg:hidden"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">
                H
              </div>
              <span className="text-xl font-semibold text-slate-900">
                HireAI
              </span>
            </Link>

            <div className="mb-7">
              <p className="mb-2 text-sm font-medium text-blue-600">
                Get started for free
              </p>

              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                Create your account
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Join HireAI as a candidate or recruiter.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Account type */}
              <fieldset>
                <legend className="mb-2 block text-sm font-medium text-slate-700">
                  I want to join as
                </legend>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    aria-pressed={form.role === "CANDIDATE"}
                    onClick={() => updateField("role", "CANDIDATE")}
                    className={`rounded-xl border p-3 text-left transition ${
                      form.role === "CANDIDATE"
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <UserRound
                      size={20}
                      className={
                        form.role === "CANDIDATE"
                          ? "text-blue-600"
                          : "text-slate-500"
                      }
                    />
                    <span className="mt-2 block text-sm font-semibold text-slate-900">
                      Candidate
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Find opportunities
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={form.role === "RECRUITER"}
                    onClick={() => updateField("role", "RECRUITER")}
                    className={`rounded-xl border p-3 text-left transition ${
                      form.role === "RECRUITER"
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <BriefcaseBusiness
                      size={20}
                      className={
                        form.role === "RECRUITER"
                          ? "text-blue-600"
                          : "text-slate-500"
                      }
                    />
                    <span className="mt-2 block text-sm font-semibold text-slate-900">
                      Recruiter / Owner
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Manage hiring
                    </span>
                  </button>
                </div>
              </fieldset>

              {form.role === "RECRUITER" && (
                <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Company affiliation
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Create a company and become its owner, or request to join an
                      existing company.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      aria-pressed={form.companyChoice === "CREATE"}
                      onClick={() => {
                        updateField("companyChoice", "CREATE");
                        updateField("selectedCompanyId", "");
                        setError("");
                      }}
                      className={`rounded-lg border p-3 text-left transition ${
                        form.companyChoice === "CREATE"
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span className="block text-sm font-semibold text-slate-900">
                        Create company
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        Become the owner
                      </span>
                    </button>

                    <button
                      type="button"
                      aria-pressed={form.companyChoice === "JOIN"}
                      onClick={() => {
                        updateField("companyChoice", "JOIN");
                        updateField("companyName", "");
                        setError("");
                      }}
                      className={`rounded-lg border p-3 text-left transition ${
                        form.companyChoice === "JOIN"
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span className="block text-sm font-semibold text-slate-900">
                        Join company
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        Request owner approval
                      </span>
                    </button>
                  </div>

                  {form.companyChoice === "CREATE" ? (
                    <div>
                      <label
                        htmlFor="companyName"
                        className="mb-2 block text-sm font-medium text-slate-700"
                      >
                        Company name
                      </label>
                      <input
                        id="companyName"
                        value={form.companyName}
                        onChange={(event) =>
                          updateField("companyName", event.target.value)
                        }
                        maxLength={200}
                        required
                        placeholder="e.g. Acme Technologies"
                        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label
                        htmlFor="selectedCompanyId"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Select your company
                      </label>

                      <select
                        id="selectedCompanyId"
                        value={form.selectedCompanyId}
                        onChange={(event) =>
                          updateField("selectedCompanyId", event.target.value)
                        }
                        required
                        disabled={companyLoading || companies.length === 0}
                        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                      >
                        <option value="">
                          {companyLoading
                            ? "Loading companies..."
                            : companies.length === 0
                              ? "No companies available"
                              : "Choose a company"}
                        </option>

                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                            {company.industry ? ` — ${company.industry}` : ""}
                            {company.location ? ` (${company.location})` : ""}
                          </option>
                        ))}
                      </select>

                      {companyLoading && (
                        <p className="text-xs text-slate-500">
                          Loading available companies...
                        </p>
                      )}

                      {!companyLoading && companies.length === 0 && (
                        <p className="text-xs text-slate-500">
                          No companies are listed yet. Please try again later or register as a company owner.
                        </p>
                      )}

                      {form.selectedCompanyId && (
                        <p className="text-sm font-medium text-blue-700">
                          Company selected. Your request will need owner approval.
                        </p>
                      )}
                    </div>
                  )}
                </section>
              )}


              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="first_name"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    First name
                  </label>
                  <input
                    id="first_name"
                    value={form.first_name}
                    onChange={(event) =>
                      updateField("first_name", event.target.value)
                    }
                    autoComplete="given-name"
                    maxLength={100}
                    required
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
                    placeholder="First name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="last_name"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Last name
                  </label>
                  <input
                    id="last_name"
                    value={form.last_name}
                    onChange={(event) =>
                      updateField("last_name", event.target.value)
                    }
                    autoComplete="family-name"
                    maxLength={100}
                    required
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
                    placeholder="Last name"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    autoComplete="email"
                    maxLength={255}
                    required
                    placeholder="you@example.com"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(event) =>
                      updateField("password", event.target.value)
                    }
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    placeholder="At least 8 characters"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-11 text-sm outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Confirm password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(event) =>
                      updateField("confirmPassword", event.target.value)
                    }
                    autoComplete="new-password"
                    required
                    placeholder="Re-enter your password"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-11 text-sm outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {success && (
                <div
                  role="status"
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                >
                  {success}
                  <Link
                    href="/login"
                    className="mt-2 block font-semibold underline"
                  >
                    Go to sign in
                  </Link>
                </div>
              )}

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create account"}
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
