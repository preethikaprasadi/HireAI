
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Globe,
  Loader2,
  Save,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import {
  getCompany,
  updateCompany,
  getMyCompanyMemberships,
  type Company,
  type CompanyMembership,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

export default function CompanySettingsPage() {
  const params = useParams<{ company_id: string }>();
  const router = useRouter();
  const companyId = params.company_id;

  const [company, setCompany] = useState<Company | null>(null);
  const [memberships, setMemberships] = useState<CompanyMembership[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = getAccessToken() ?? "";

  const membership = memberships.find(
    (item) => item.company_id === companyId
  );
  const isOwner = membership?.role === "OWNER";

  useEffect(() => {
    if (!companyId) return;

    async function loadSettings() {
      setLoading(true);
      setError("");

      try {
        if (!token) {
          router.replace("/login");
          return;
        }

        const [companyData, membershipData] = await Promise.all([
          getCompany(companyId, token),
          getMyCompanyMemberships(token),
        ]);

        setCompany(companyData);
        setMemberships(membershipData);
        setName(companyData.name ?? "");
        setDescription(companyData.description ?? "");
        setWebsite(companyData.website ?? "");
        setLocation(companyData.location ?? "");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load company settings."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadSettings();
  }, [companyId, router, token]);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!company || !isOwner) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Company name is required.");
      return;
    }

    if (website.trim()) {
      try {
        const parsedWebsite = new URL(website.trim());

        if (!["http:", "https:"].includes(parsedWebsite.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        setError("Enter a valid website URL, such as https://example.com.");
        return;
      }
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updatedCompany = await updateCompany(
        companyId,
        {
          name: trimmedName,
          description: description.trim() || null,
          website: website.trim() || null,
          location: location.trim() || null,
        },
        token
      );

      setCompany(updatedCompany);
      setName(updatedCompany.name ?? "");
      setDescription(updatedCompany.description ?? "");
      setWebsite(updatedCompany.website ?? "");
      setLocation(updatedCompany.location ?? "");
      setSuccess("Company settings updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update company settings."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          <span className="ml-3 text-sm text-gray-500">
            Loading company settings...
          </span>
        </div>
      </AppShell>
    );
  }

  if (error && !company) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-6 py-10">
          <button
            type="button"
            onClick={() =>
              router.push(`/recruiter/companies/${companyId}`)
            }
            className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to company
          </button>

          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() =>
            router.push(`/recruiter/companies/${companyId}`)
          }
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to company
        </button>

        <div className="mb-8 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <Building2 className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Company settings
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage the details displayed for {company?.name}.
            </p>
          </div>
        </div>

        {!isOwner && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            You have read-only access to these settings. Only the company
            owner can make changes.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8"
        >
          <div>
            <label
              htmlFor="company-name"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Company name <span className="text-red-500">*</span>
            </label>
            <input
              id="company-name"
              required
              autoComplete="organization"
              maxLength={150}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                clearMessages();
              }}
              disabled={!isOwner || saving}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div>
            <label
              htmlFor="company-description"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Description
            </label>
            <textarea
              id="company-description"
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                clearMessages();
              }}
              disabled={!isOwner || saving}
              placeholder="Describe your company and its mission..."
              className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div>
            <label
              htmlFor="company-website"
              className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700"
            >
              <Globe className="h-4 w-4 text-gray-400" />
              Website
            </label>
            <input
              id="company-website"
              type="url"
              autoComplete="url"
              maxLength={255}
              value={website}
              onChange={(event) => {
                setWebsite(event.target.value);
                clearMessages();
              }}
              disabled={!isOwner || saving}
              placeholder="https://example.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div>
            <label
              htmlFor="company-location"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Location
            </label>
            <input
              id="company-location"
              maxLength={255}
              value={location}
              onChange={(event) => {
                setLocation(event.target.value);
                clearMessages();
              }}
              disabled={!isOwner || saving}
              placeholder="e.g. Colombo, Sri Lanka"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() =>
                router.push(`/recruiter/companies/${companyId}`)
              }
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>

            {isOwner && (
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Saving..." : "Save changes"}
              </button>
            )}
          </div>
        </form>
      </div>
    </AppShell>
  );
}
