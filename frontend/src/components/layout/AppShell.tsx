"use client";

import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { logout } from "@/lib/auth";

const recruiterNavigation = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/recruiter/dashboard",
  },
  {
    label: "Jobs",
    icon: BriefcaseBusiness,
    href: "/recruiter/jobs",
  },
  {
    label: "Candidates",
    icon: Users,
    href: "/recruiter/candidates",
  },
  {
    label: "Companies",
    icon: Building2,
    href: "/recruiter/companies",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    href: "/recruiter/analytics",
  },
];

const candidateNavigation = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/candidate/dashboard",
  },
  {
    label: "Profile",
    icon: UserRound,
    href: "/candidate/profile",
  },
  {
  label: "Skills",
  icon: Sparkles,
  href: "/candidate/skills",
  },
  {
    label: "My Resumes",
    icon: FileText,
    href: "/candidate/resumes",
  },
  {
    label: "My Applications",
    icon: ClipboardList,
    href: "/candidate/applications",
  },
  {
    label: "Jobs",
    icon: BriefcaseBusiness,
    href: "/candidate/jobs",
  },

];

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const router = useRouter();

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const handleSignOut = async () => {
    await logout();
    router.replace("/login");
  };

  const isCandidate =
    pathname.startsWith("/candidate");

  const navigation = isCandidate
    ? candidateNavigation
    : recruiterNavigation;

  const workspaceLabel = isCandidate
    ? "Candidate workspace"
    : "Recruiter workspace";

  const accountSettingsHref = isCandidate
    ? "/candidate/settings"
    : "/recruiter/settings";

  const accountName = isCandidate
    ? "Candidate"
    : "Recruiter";

  const accountDescription = isCandidate
    ? "Candidate account"
    : "Recruiter account";

  const avatarLetter = isCandidate
    ? "C"
    : "R";

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-64 flex-col
          border-r border-slate-200
          bg-white
          transition-transform duration-200
          lg:static lg:translate-x-0
          ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >

        {/* Brand */}
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              H
            </div>

            <div>
              <p className="text-lg font-semibold tracking-tight text-slate-900">
                HireAI
              </p>

              <p className="text-xs text-slate-400">
                Recruitment platform
              </p>
            </div>

          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>

        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto space-y-1 px-3 py-6">

          <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>

          {navigation.map((item) => {
            const Icon = item.icon;

            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() =>
                  setMobileOpen(false)
                }
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={1.8}
                />

                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="my-6 border-t border-slate-100" />

          <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Account
          </p>

          <Link
            href={accountSettingsHref}
            onClick={() =>
              setMobileOpen(false)
            }
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              pathname.startsWith(
                accountSettingsHref,
              )
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Settings
              size={18}
              strokeWidth={1.8}
            />

            <span>Settings</span>
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut
              size={18}
              strokeWidth={1.8}
            />

            <span>Sign out</span>
          </button>

        </nav>

        {/* User section */}
        <div className="border-t border-slate-100 p-4">

          <div className="flex items-center gap-3 rounded-lg p-2">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
              {avatarLetter}
            </div>

            <div className="min-w-0 flex-1">

              <p className="truncate text-sm font-medium text-slate-800">
                {accountName}
              </p>

              <p className="truncate text-xs text-slate-400">
                {accountDescription}
              </p>

            </div>

          </div>

        </div>

      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur lg:px-8">

          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={21} />
          </button>

          <div className="hidden lg:block">

            <p className="text-sm text-slate-500">
              {workspaceLabel}
            </p>

          </div>

          <div className="ml-auto flex items-center gap-3">

            <button
              type="button"
              onClick={handleSignOut}
              className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 sm:flex"
            >
              <LogOut size={16} />
              Sign out
            </button>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
              {avatarLetter}
            </div>

          </div>

        </header>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>

      </div>

    </div>
  );
}
