
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Image from "next/image";
import {
  Building2,
  Check,
  Edit3,
  ExternalLink,
  Globe,
  MapPin,
  Plus,
  Search,
  X,
} from "lucide-react";

import {
  createCompany,
  getRecruiterCompanies,
  updateCompany,
  type Company,
  type CompanyRequest,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

const emptyForm: CompanyRequest = {
  name: "",
  description: "",
  industry: "",
  website: "",
  location: "",
  logo_url: "",
};

function getValidHttpUrl(value?: string | null): string | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

export default function RecruiterCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] =
    useState<Company | null>(null);
  const [form, setForm] = useState<CompanyRequest>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadCompanies = useCallback(async () => {
    const token = getAccessToken();

    if (!token) {
      throw new Error("Authentication required. Please log in.");
    }

    return getRecruiterCompanies(token);
  }, []);

  useEffect(() => {
    let active = true;

    void loadCompanies()
      .then((data) => {
        if (active) setCompanies(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load companies.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadCompanies]);

  function retryLoadCompanies() {
    setLoading(true);
    setError("");

    void loadCompanies()
      .then(setCompanies)
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load companies.",
        );
      })
      .finally(() => setLoading(false));
  }

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return companies;
    }

    return companies.filter((company) =>
      [
        company.name,
        company.industry,
        company.location,
        company.description,
      ]
        .filter(Boolean)
        .some((value) =>
          value!.toLowerCase().includes(query),
        ),
    );
  }, [companies, search]);

  function openCreateForm() {
    setEditingCompany(null);
    setForm({ ...emptyForm });
    setFormError("");
    setSuccessMessage("");
    setShowForm(true);
  }

  function openEditForm(company: Company) {
    setEditingCompany(company);
    setForm({
      name: company.name,
      description: company.description ?? "",
      industry: company.industry ?? "",
      website: company.website ?? "",
      location: company.location ?? "",
      logo_url: company.logo_url ?? "",
    });
    setFormError("");
    setSuccessMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingCompany(null);
    setForm({ ...emptyForm });
    setFormError("");
  }

  function updateField(
    field: keyof CompanyRequest,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    const name = form.name.trim();

    if (name.length < 2) {
      setFormError("Company name must contain at least 2 characters.");
      return;
    }

    const token = getAccessToken();

    if (!token) {
      setFormError("Authentication required. Please log in again.");
      return;
    }

    const payload: CompanyRequest = {
      name,
      description: form.description?.trim() || null,
      industry: form.industry?.trim() || null,
      website: form.website?.trim() || null,
      location: form.location?.trim() || null,
      logo_url: form.logo_url?.trim() || null,
    };

    try {
      setSaving(true);

      if (editingCompany) {
        const updated = await updateCompany(
          editingCompany.id,
          payload,
          token,
        );

        setCompanies((current) =>
          current.map((company) =>
            company.id === updated.id ? updated : company,
          ),
        );

        setSuccessMessage("Company updated successfully.");
      } else {
        const created = await createCompany(payload, token);

        setCompanies((current) => [created, ...current]);
        setSuccessMessage("Company created successfully.");
      }

      setShowForm(false);
      setEditingCompany(null);
      setForm({ ...emptyForm });
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Unable to save the company.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <Building2 size={16} />
              <span>Recruiter workspace</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Companies
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage your company profiles and keep your recruitment
              information up to date.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus size={18} />
            Add company
          </button>
        </div>

        {/* Feedback */}
        {successMessage && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            <Check size={17} />
            {successMessage}
            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              aria-label="Dismiss success message"
              className="ml-auto rounded p-1 hover:bg-emerald-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Search and count */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Your companies
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {companies.length}{" "}
                {companies.length === 1 ? "company" : "companies"} registered
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search companies..."
                aria-label="Search companies"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        {/* Loading */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-slate-100" />
                    <div className="h-3 w-1/3 rounded bg-slate-100" />
                  </div>
                </div>
                <div className="mt-5 h-3 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-4/5 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {/* Load error */}
        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-white p-6 text-center">
            <p className="font-medium text-red-700">
              Could not load companies
            </p>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <button
              type="button"
              onClick={retryLoadCompanies}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
        )}

        {/* Company list */}
        {!loading && !error && companies.length > 0 && (
          <>
            {filteredCompanies.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
                <Search className="mx-auto text-slate-400" size={28} />
                <h3 className="mt-3 font-semibold text-slate-900">
                  No matching companies
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Try a different company name, industry, or location.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredCompanies.map((company) => (
                  <article
                    key={company.id}
                    className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      {getValidHttpUrl(company.logo_url) ? (
                        <Image
                            src={getValidHttpUrl(company.logo_url)!}
                            alt={`${company.name} logo`}
                            width={48}
                            height={48}
                            className="h-12 w-12 shrink-0 rounded-xl border border-slate-100 bg-white object-contain p-1"
                            unoptimized
                        />
                        ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                          <Building2 size={23} />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="wrap-break-word font-semibold text-slate-900">
                          {company.name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {company.industry || "Industry not specified"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => openEditForm(company)}
                        aria-label={`Edit ${company.name}`}
                        title="Edit company"
                        className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>

                    <p className="mt-4 min-h-10 text-sm leading-5 text-slate-600">
                      {company.description?.trim()
                        ? company.description
                        : "No company description has been added yet."}
                    </p>

                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                      <div className="flex items-start gap-2 text-sm text-slate-500">
                        <MapPin
                          size={16}
                          className="mt-0.5 shrink-0 text-slate-400"
                        />
                        <span className="wrap-break-word">
                          {company.location || "Location not specified"}
                        </span>
                      </div>

                      {getValidHttpUrl(company.website) ? (
                        <a
                          href={getValidHttpUrl(company.website)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 break-all text-sm text-blue-600 transition hover:text-blue-800 hover:underline"
                        >
                          <Globe size={16} className="shrink-0" />
                          <span className="break-all">
                            {company.website?.replace(/^https?:\/\//, "")}
                          </span>
                          <ExternalLink
                            size={14}
                            className="shrink-0"
                          />
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Globe size={16} />
                          Website not added
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditForm(company)}
                      className="mt-5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      Edit company details
                    </button>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!loading && !error && companies.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Building2 size={28} />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              Add your first company
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Create a company profile to organize your recruitment
              activities and associate job listings with your company.
            </p>
            <button
              type="button"
              onClick={openCreateForm}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus size={18} />
              Create company
            </button>
          </div>
        )}
      </div>

      {/* Create / edit modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-\[60] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="company-form-title"
            className="my-4 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl sm:my-8"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2
                  id="company-form-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  {editingCompany ? "Edit company" : "Create a company"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingCompany
                    ? "Update your company profile information."
                    : "Enter the details for your new company profile."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
              {formError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {formError}
                </div>
              )}

              <div>
                <label
                  htmlFor="company-name"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Company name <span className="text-red-500">*</span>
                </label>
                <input
                  id="company-name"
                  required
                  minLength={2}
                  maxLength={255}
                  value={form.name}
                  onChange={(event) =>
                    updateField("name", event.target.value)
                  }
                  placeholder="e.g. Acme Technologies"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="company-industry"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Industry
                  </label>
                  <input
                    id="company-industry"
                    maxLength={150}
                    value={form.industry ?? ""}
                    onChange={(event) =>
                      updateField("industry", event.target.value)
                    }
                    placeholder="e.g. Software & IT"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="company-location"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Location
                  </label>
                  <input
                    id="company-location"
                    maxLength={255}
                    value={form.location ?? ""}
                    onChange={(event) =>
                      updateField("location", event.target.value)
                    }
                    placeholder="e.g. Colombo, Sri Lanka"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="company-website"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Website
                </label>
                <input
                  id="company-website"
                  type="url"
                  maxLength={500}
                  value={form.website ?? ""}
                  onChange={(event) =>
                    updateField("website", event.target.value)
                  }
                  placeholder="https://example.com"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="company-logo"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Logo URL
                </label>
                <input
                  id="company-logo"
                  type="url"
                  value={form.logo_url ?? ""}
                  onChange={(event) =>
                    updateField("logo_url", event.target.value)
                  }
                  placeholder="https://example.com/logo.png"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Use a publicly accessible image URL.
                </p>
              </div>

              <div>
                <label
                  htmlFor="company-description"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Description
                </label>
                <textarea
                  id="company-description"
                  rows={4}
                  value={form.description ?? ""}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  placeholder="Describe your company and what it does..."
                  className="w-full resize-y rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    "Saving..."
                  ) : (
                    <>
                      <Check size={17} />
                      {editingCompany ? "Save changes" : "Create company"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
