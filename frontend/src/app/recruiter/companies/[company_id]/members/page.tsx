
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Loader2,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { getAccessToken } from "@/lib/auth";
import {
  addCompanyMember,
  decideCompanyJoinRequest,
  getCompany,
  getCompanyJoinRequests,
  getCompanyMembers,
  getMyCompanyMemberships,
  removeCompanyMember,
  type Company,
  type CompanyJoinRequest,
  type CompanyMember,
  type CompanyMembership,
} from "@/lib/api";

export default function CompanyMembersPage() {
  const params = useParams<{ company_id: string }>();
  const router = useRouter();
  const companyId = params.company_id;

  const [joinRequests, setJoinRequests] = useState<CompanyJoinRequest[]>([]);
  const [decidingRequestId, setDecidingRequestId] = useState<string | null>(null);


  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [memberships, setMemberships] = useState<CompanyMembership[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = getAccessToken() ?? "";

  const currentMembership = memberships.find(
    (membership) => membership.company_id === companyId,
  );
  const isOwner = currentMembership?.role === "OWNER";

  useEffect(() => {
    let cancelled = false;

    if (!token || !companyId) {
      if (!token) router.replace("/login");
      return;
    }


    async function fetchMembers() {
      try {
        const [companyData, memberData, membershipData] = await Promise.all([
          getCompany(companyId, token),
          getCompanyMembers(companyId, token),
          getMyCompanyMemberships(token),
        ]);

        if (cancelled) return;

        setCompany(companyData);
        setMembers(memberData);
        setMemberships(membershipData);

        const membership = membershipData.find(
          (item) => item.company_id === companyId,
        );

        if (membership?.role === "OWNER") {
          const requests = await getCompanyJoinRequests(companyId, token);

          if (cancelled) return;

          setJoinRequests(
            requests.filter((request) => request.status === "PENDING"),
          );
        } else {
          setJoinRequests([]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load company members.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }


    void fetchMembers();
    return () => {
      cancelled = true;
    };
  }, [companyId, router, token]);

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !isOwner) return;

    setAdding(true);
    setError("");
    setSuccess("");

    try {
      const newMember = await addCompanyMember(
        companyId,
        normalizedEmail,
        token,
      );

      setMembers((current) => [...current, newMember]);
      setEmail("");
      setSuccess(`${newMember.email} was added to the company.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to add the recruiter.",
      );
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveMember(member: CompanyMember) {
    if (!isOwner || member.role === "OWNER") return;

    const confirmed = window.confirm(
      `Remove ${member.email} from ${company?.name ?? "this company"}?`,
    );

    if (!confirmed) return;

    setRemovingId(member.id);
    setError("");
    setSuccess("");

    try {
      await removeCompanyMember(companyId, member.id, token);

      setMembers((current) =>
        current.filter((item) => item.id !== member.id),
      );

      setSuccess(`${member.email} was removed from the company.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to remove the recruiter.",
      );
    } finally {
      setRemovingId(null);
    }
  }


  async function handleJoinRequestDecision(
    request: CompanyJoinRequest,
    decision: "APPROVED" | "REJECTED",
  ) {
    if (!isOwner || decidingRequestId) return;

    setDecidingRequestId(request.id);
    setError("");
    setSuccess("");

    try {
      await decideCompanyJoinRequest(
        companyId,
        request.id,
        decision,
        token,
      );

      setJoinRequests((current) =>
        current.filter((item) => item.id !== request.id),
      );

      if (decision === "APPROVED") {
        const updatedMembers = await getCompanyMembers(companyId, token);
        setMembers(updatedMembers);
        setSuccess(
          `${request.email ?? "Recruiter"} was approved and added to the company.`,
        );
      } else {
        setSuccess(
          `The request from ${request.email ?? "this recruiter"} was rejected.`,
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to process the join request.",
      );
    } finally {
      setDecidingRequestId(null);
    }
  }


  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => router.push(`/recruiter/companies/${companyId}`)}
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to company
        </button>

        <div className="mb-8 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <Users className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Company members
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {company
                ? `Manage recruiters belonging to ${company.name}.`
                : "View the members of this company."}
            </p>
          </div>
        </div>

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

        {loading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
            <span className="ml-3 text-sm text-gray-500">
              Loading company members...
            </span>
          </div>
        ) : (
          <>
            {isOwner ? (
              <form
                onSubmit={handleAddMember}
                className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <h2 className="text-base font-semibold text-gray-900">
                  Add a recruiter
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Enter the email address of an existing HireAI recruiter
                  account.
                </p>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      maxLength={254}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="recruiter@example.com"
                      disabled={adding}
                      className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-gray-50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={adding || !email.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {adding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {adding ? "Adding..." : "Add recruiter"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                You have read-only access to this member list. Only the
                company owner can add or remove recruiters.
              </div>
            )}


            {isOwner && (
              <section className="mb-8 overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-amber-100 px-5 py-4 sm:px-6">
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      New member requests
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Review recruiters requesting to join your company.
                    </p>
                  </div>

                  {joinRequests.length > 0 && (
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-100 px-2 text-sm font-semibold text-amber-800">
                      {joinRequests.length}
                    </span>
                  )}
                </div>

                {joinRequests.length === 0 ? (
                  <div className="px-5 py-8 text-center sm:px-6">
                    <Users className="mx-auto h-7 w-7 text-gray-300" />
                    <p className="mt-2 text-sm font-medium text-gray-700">
                      No pending requests
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      New recruiter requests will appear here.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {joinRequests.map((request) => {
                      const isDeciding = decidingRequestId === request.id;
                      const applicantName = [
                        request.first_name,
                        request.last_name,
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <li
                          key={request.id}
                          className="flex flex-col gap-4 px-5 py-4 sm:px-6 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-sm font-semibold uppercase text-amber-700">
                              {(request.email?.charAt(0) ?? "R")}
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900">
                                {applicantName || "Recruiter"}
                              </p>
                              <p className="mt-1 break-all text-sm text-gray-500">
                                {request.email ?? "Email unavailable"}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                                  Pending approval
                                </span>
                                <span className="text-xs text-gray-400">
                                  Requested{" "}
                                  {new Date(request.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                void handleJoinRequestDecision(request, "REJECTED")
                              }
                              disabled={decidingRequestId !== null}
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isDeciding ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                              Reject
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void handleJoinRequestDecision(request, "APPROVED")
                              }
                              disabled={decidingRequestId !== null}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isDeciding ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              Approve
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}


            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    Members
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {members.length}{" "}
                    {members.length === 1 ? "member" : "members"}
                  </p>
                </div>
              </div>

              {members.length === 0 ? (
                <div className="px-5 py-12 text-center sm:px-6">
                  <Users className="mx-auto h-8 w-8 text-gray-300" />
                  <p className="mt-3 text-sm font-medium text-gray-700">
                    No members found
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Company members will appear here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {members.map((member) => (
                    <li
                      key={member.id}
                      className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold uppercase text-gray-600">
                          {member.email?.charAt(0) ?? "U"}
                        </div>

                        <div className="min-w-0">
                          <p className="break-all text-sm font-medium text-gray-900">
                            {member.email}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                                member.role === "OWNER"
                                  ? "bg-purple-50 text-purple-700"
                                  : "bg-teal-50 text-teal-700"
                              }`}
                            >
                              {member.role === "OWNER" && (
                                <ShieldCheck className="h-3.5 w-3.5" />
                              )}
                              {member.role}
                            </span>

                            <span className="text-xs text-gray-400">
                              Joined{" "}
                              {new Date(member.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isOwner && member.role !== "OWNER" && (
                        <button
                          type="button"
                          onClick={() => void handleRemoveMember(member)}
                          disabled={removingId === member.id}
                          className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-center"
                        >
                          {removingId === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
