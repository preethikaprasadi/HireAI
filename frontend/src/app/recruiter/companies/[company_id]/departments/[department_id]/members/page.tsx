
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  UserPlus,
  UserMinus,
  Mail,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { getAccessToken } from "@/lib/auth";
import {
  getCompany,
  getMyCompanyMemberships,
  getCompanyMembers,
  getDepartments,
  getDepartmentMembers,
  assignDepartmentMember,
  removeDepartmentMember,
  type Company,
  type CompanyMembership,
  type CompanyMember,
  type Department,
  type DepartmentMember,
} from "@/lib/api";

export default function DepartmentMembersPage() {
  const params = useParams<{
    company_id: string;
    department_id: string;
  }>();

  const companyId = params.company_id;
  const departmentId = params.department_id;
  const router = useRouter();

  const [company, setCompany] = useState<Company | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [membership, setMembership] =
    useState<CompanyMembership | null>(null);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [assignments, setAssignments] = useState<DepartmentMember[]>([]);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isOwner = membership?.role === "OWNER";
  const assignedUserIds = new Set(
    assignments.map((assignment) => assignment.user_id),
  );

  const availableRecruiters = companyMembers.filter(
    (member) =>
      member.role === "RECRUITER" &&
      !assignedUserIds.has(member.user_id),
  );

  const loadPage = useCallback(async () => {
    const token = getAccessToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [
        companyData,
        memberships,
        companyMemberData,
        departmentData,
        assignmentData,
      ] = await Promise.all([
        getCompany(companyId, token),
        getMyCompanyMemberships(token),
        getCompanyMembers(companyId, token),
        getDepartments(companyId, token),
        getDepartmentMembers(companyId, departmentId, token),
      ]);

      const currentMembership =
        memberships.find((item) => item.company_id === companyId) ?? null;

      if (!currentMembership) {
        setError("You do not have access to this company.");
        return;
      }

      const currentDepartment =
        departmentData.find((item) => item.id === departmentId) ?? null;

      if (!currentDepartment) {
        setError("Department not found.");
        return;
      }

      setCompany(companyData);
      setMembership(currentMembership);
      setCompanyMembers(companyMemberData);
      setDepartment(currentDepartment);
      setAssignments(assignmentData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load department assignments.",
      );
    } finally {
      setLoading(false);
    }
  }, [companyId, departmentId, router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPage();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadPage]);

  async function handleAssign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getAccessToken();

    if (!token || !isOwner) return;

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Enter the email address of a company recruiter.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const created = await assignDepartmentMember(
        companyId,
        departmentId,
        normalizedEmail,
        token,
      );

      setAssignments((current) => [...current, created]);
      setEmail("");
      setSuccess(`${created.email} was assigned to this department.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to assign recruiter.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(assignment: DepartmentMember) {
    const token = getAccessToken();

    if (!token || !isOwner) return;

    const confirmed = window.confirm(
      `Remove ${assignment.email} from ${department?.name ?? "this department"}?`,
    );

    if (!confirmed) return;

    setRemovingId(assignment.id);
    setError("");
    setSuccess("");

    try {
      await removeDepartmentMember(
        companyId,
        departmentId,
        assignment.id,
        token,
      );

      setAssignments((current) =>
        current.filter((item) => item.id !== assignment.id),
      );

      setSuccess(`${assignment.email} was removed from this department.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to remove recruiter assignment.",
      );
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <AppShell>
      <div className="page-container">
        <Link
          href={`/recruiter/companies/${companyId}/departments`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to departments
        </Link>

        {loading ? (
          <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-8">
            <div className="h-6 w-56 rounded bg-slate-200" />
            <div className="mt-5 h-24 rounded bg-slate-100" />
          </div>
        ) : error && !department ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
          >
            {error}
          </div>
        ) : department ? (
          <>
            <header className="mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Users size={24} />
                </div>

                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">
                    Recruiter assignments
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    {company?.name} / {department.name}
                  </p>
                </div>
              </div>
            </header>

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

            <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Assigned recruiters
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {assignments.length} of 2 recruiter positions used
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    assignments.length >= 2
                      ? "bg-amber-50 text-amber-700"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {assignments.length >= 2 ? "Capacity reached" : "Slots available"}
                </span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{
                    width: `${Math.min(assignments.length, 2) * 50}%`,
                  }}
                />
              </div>

              {assignments.length === 0 ? (
                <div className="mt-5 rounded-lg border border-dashed border-slate-300 p-6 text-center">
                  <Users className="mx-auto text-slate-400" size={28} />
                  <p className="mt-2 text-sm font-medium text-slate-800">
                    No recruiters assigned yet
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Assign a company recruiter to this department.
                  </p>
                </div>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                          <Mail size={18} />
                        </div>

                        <div className="min-w-0">
                          <p className="break-all text-sm font-medium text-slate-900">
                            {assignment.email}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Assigned{" "}
                            {new Date(assignment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {isOwner && (
                        <button
                          type="button"
                          disabled={removingId === assignment.id}
                          onClick={() => void handleRemove(assignment)}
                          className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 sm:self-auto"
                        >
                          <UserMinus size={15} />
                          {removingId === assignment.id
                            ? "Removing..."
                            : "Remove"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {isOwner ? (
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-900">
                  Assign a recruiter
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Only recruiters already added to this company can be assigned.
                </p>

                {assignments.length >= 2 ? (
                  <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                    This department has reached its limit of two recruiters.
                    Remove an assignment before adding another.
                  </p>
                ) : availableRecruiters.length === 0 ? (
                  <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    There are no unassigned company recruiters available.
                    Add a recruiter through Company memberships first, or check
                    whether all existing recruiters are already assigned here.
                  </p>
                ) : (
                  <form
                    onSubmit={handleAssign}
                    className="mt-4 flex flex-col gap-3 sm:flex-row"
                  >
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor="recruiter-email"
                        className="mb-1.5 block text-sm font-medium text-slate-700"
                      >
                        Recruiter email
                      </label>
                      <input
                        id="recruiter-email"
                        type="email"
                        required
                        list="available-recruiter-emails"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="recruiter@example.com"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                      <datalist id="available-recruiter-emails">
                        {availableRecruiters.map((member) => (
                          <option key={member.id} value={member.email} />
                        ))}
                      </datalist>
                    </div>

                    <button
                      type="submit"
                      disabled={saving || assignments.length >= 2}
                      className="inline-flex items-center justify-center gap-2 self-end rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <UserPlus size={16} />
                      {saving ? "Assigning..." : "Assign recruiter"}
                    </button>
                  </form>
                )}
              </section>
            ) : (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                You can view recruiter assignments. Only the company owner can
                add or remove assignments.
              </p>
            )}
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
