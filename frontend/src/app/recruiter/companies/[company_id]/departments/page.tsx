
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
  Users,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { getAccessToken } from "@/lib/auth";
import {
  getCompany,
  getMyCompanyMemberships,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  type Company,
  type CompanyMembership,
  type Department,
  type DepartmentRequest,
} from "@/lib/api";

export default function DepartmentsPage() {
  const params = useParams<{ company_id: string }>();
  const companyId = params.company_id;
  const router = useRouter();

  const [company, setCompany] = useState<Company | null>(null);
  const [membership, setMembership] =
    useState<CompanyMembership | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const isOwner = membership?.role === "OWNER";

  const loadPage = useCallback(async () => {
    const token = getAccessToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [companyData, memberships, departmentData] =
        await Promise.all([
          getCompany(companyId, token),
          getMyCompanyMemberships(token),
          getDepartments(companyId, token),
        ]);

      const currentMembership =
        memberships.find((item) => item.company_id === companyId) ??
        null;

      if (!currentMembership) {
        setError("You do not have access to this company.");
        return;
      }

      setCompany(companyData);
      setMembership(currentMembership);
      setDepartments(departmentData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load departments.",
      );
    } finally {
      setLoading(false);
    }
  }, [companyId, router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPage();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadPage]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
  }

  function startEditing(department: Department) {
    setEditingId(department.id);
    setName(department.name);
    setDescription(department.description ?? "");
    setError("");
    setSuccess("");
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getAccessToken();
    if (!token || !isOwner) return;

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setError("Department name must contain at least 2 characters.");
      return;
    }

    const data: DepartmentRequest = {
      name: trimmedName,
      description: description.trim() || null,
    };

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingId) {
        const updated = await updateDepartment(
          companyId,
          editingId,
          data,
          token,
        );

        setDepartments((current) =>
          current.map((item) =>
            item.id === editingId ? updated : item,
          ),
        );
        setSuccess("Department updated successfully.");
      } else {
        const created = await createDepartment(
          companyId,
          data,
          token,
        );

        setDepartments((current) =>
          [...current, created].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );
        setSuccess("Department created successfully.");
      }

      resetForm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save department.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(department: Department) {
    const token = getAccessToken();

    if (!token || !isOwner) return;

    const confirmed = window.confirm(
      `Delete "${department.name}"? Its recruiter assignments will also be removed.`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await deleteDepartment(companyId, department.id, token);

      setDepartments((current) =>
        current.filter((item) => item.id !== department.id),
      );

      if (editingId === department.id) {
        resetForm();
      }

      setSuccess("Department deleted successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete department.",
      );
    }
  }

  return (
    <AppShell>
      <div className="page-container">
        <Link
          href={`/recruiter/companies/${companyId}`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Company overview
        </Link>

        {loading ? (
          <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-8">
            <div className="h-6 w-56 rounded bg-slate-200" />
            <div className="mt-5 h-24 rounded bg-slate-100" />
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Building2 size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">
                    Departments
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    {company?.name ?? "Company"} · Organize your recruiting team
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                role="status"
                className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
              >
                {success}
              </div>
            )}

            {isOwner && (
              <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-base font-semibold text-slate-900">
                  {editingId ? "Edit department" : "Create department"}
                </h2>

                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label
                      htmlFor="department-name"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Department name *
                    </label>
                    <input
                      id="department-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                      minLength={2}
                      maxLength={150}
                      placeholder="e.g. Engineering"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="department-description"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Description
                    </label>
                    <textarea
                      id="department-description"
                      value={description}
                      onChange={(event) =>
                        setDescription(event.target.value)
                      }
                      rows={3}
                      placeholder="Describe this department's responsibilities"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {editingId ? <Save size={16} /> : <Plus size={16} />}
                      {saving
                        ? "Saving..."
                        : editingId
                          ? "Save changes"
                          : "Create department"}
                    </button>

                    {editingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <X size={16} />
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </section>
            )}

            {!isOwner && (
              <p className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                You can view departments and their recruiter assignments.
                Only the company owner can change department settings.
              </p>
            )}

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  All departments
                </h2>
                <span className="text-sm text-slate-500">
                  {departments.length} total
                </span>
              </div>

              {departments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
                  <Building2 className="mx-auto text-slate-400" size={30} />
                  <p className="mt-3 font-medium text-slate-800">
                    No departments yet
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {isOwner
                      ? "Create your first department using the form above."
                      : "The company owner has not created any departments yet."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {departments.map((department) => (
                    <article
                      key={department.id}
                      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900">
                            {department.name}
                          </h3>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-600">
                            {department.description ||
                              "No description provided."}
                          </p>
                          <p className="mt-2 text-xs text-slate-400">
                            Created{" "}
                            {new Date(department.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/recruiter/companies/${companyId}/departments/${department.id}/members`}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Users size={15} />
                            Recruiters
                          </Link>

                          {isOwner && (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditing(department)}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                              >
                                <Pencil size={15} />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(department)}
                                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                              >
                                <Trash2 size={15} />
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
