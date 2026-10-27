"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  BriefcaseBusiness,
  Users,
  Network,
  Settings2,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import {
  getCompany,
  getMyCompanyMemberships,
  type Company,
  type CompanyMembership,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

export default function CompanyOverviewPage() {
  const params = useParams<{ company_id: string }>();
  const companyId = params.company_id;
  const router = useRouter();

  const [company, setCompany] = useState<Company | null>(null);
  const [membership, setMembership] =
    useState<CompanyMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCompany() {
      const token = getAccessToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [companyData, memberships] = await Promise.all([
          getCompany(companyId, token),
          getMyCompanyMemberships(token),
        ]);

        if (cancelled) return;

        const currentMembership =
          memberships.find(
            (item) => item.company_id === companyId,
          ) ?? null;

        if (!currentMembership) {
          setError("You do not have access to this company.");
          return;
        }

        setCompany(companyData);
        setMembership(currentMembership);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load company information.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCompany();

    return () => {
      cancelled = true;
    };
  }, [companyId, router]);

  const isOwner = membership?.role === "OWNER";

  return (
    <AppShell>
      <div className="page-container">
        <Link
          href="/recruiter/companies"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          All companies
        </Link>

        {loading ? (
          <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-8">
            <div className="h-6 w-56 rounded bg-slate-200" />
            <div className="mt-4 h-4 w-80 max-w-full rounded bg-slate-100" />
            <div className="mt-8 h-28 rounded bg-slate-100" />
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
          >
            {error}
          </div>
        ) : company ? (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-50 text-blue-600">
                    {company.logo_url ? (
                      <Image
                        src={company.logo_url}
                        alt={`${company.name} logo`}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Building2 size={26} />
                    )}
                  </div>

                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                      {company.name}
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                      {company.industry || "Industry not specified"}
                      {company.location
                        ? ` · ${company.location}`
                        : ""}
                    </p>

                    <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {isOwner ? "Company Owner" : "Company Recruiter"}
                    </span>
                  </div>
                </div>

                {isOwner && (
                  <Link
                    href={`/recruiter/companies/${companyId}/settings`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <Settings2 size={16} />
                    Company settings
                  </Link>
                )}
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <h2 className="text-sm font-semibold text-slate-900">
                  About the company
                </h2>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {company.description || "No company description added yet."}
                </p>

                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Visit company website
                    <ArrowUpRight size={15} />
                  </a>
                )}
              </div>
            </section>

            <section className="mt-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Company management
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {isOwner
                  ? "Manage your company, team, and department structure."
                  : "View your company team and department structure."}
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <ManagementLink
                  href={`/recruiter/companies/${companyId}/members`}
                  title="Recruiter memberships"
                  description={
                    isOwner
                      ? "Add recruiters and manage company membership."
                      : "View the recruiters who belong to this company."
                  }
                  icon={Users}
                />

                <ManagementLink
                  href={`/recruiter/companies/${companyId}/departments`}
                  title="Departments"
                  description={
                    isOwner
                      ? "Create departments and assign recruiters."
                      : "View company departments and assignments."
                  }
                  icon={Network}
                />

                <ManagementLink
                  href={`/recruiter/jobs?company_id=${companyId}`}
                  title="Company jobs"
                  description="View jobs available to your company account."
                  icon={BriefcaseBusiness}
                />
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function ManagementLink({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: typeof Users;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Icon size={19} />
        </div>

        <ArrowUpRight
          size={18}
          className="text-slate-400 transition group-hover:text-blue-600"
        />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-5 text-slate-500">
        {description}
      </p>
    </Link>
  );
}
