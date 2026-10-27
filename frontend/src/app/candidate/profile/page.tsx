"use client";

import {
  CheckCircle2,
  MapPin,
  Phone,
  Save,
  UserRound,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import {
  createCandidateProfile,
  getCandidateProfile,
  updateCandidateProfile,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

export default function CandidateProfilePage() {
  const [profileExists, setProfileExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const [form, setForm] = useState({
  phone: "",
  location: "",
  headline: "",
  bio: "",
  years_of_experience: "",
  linkedin_url: "",
  github_url: "",
 });

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setLoadError("");

      try {
        const token = getAccessToken();

        if (!token) {
          window.location.replace("/login");
          return;
        }

        const profile = await getCandidateProfile(token);

        if (cancelled) {
          return;
        }

        if (profile) {
          setProfileExists(true);

          setForm({
            phone: profile.phone ?? "",
            location: profile.location ?? "",
            headline: profile.headline ?? "",
            bio: profile.bio ?? "",
            years_of_experience:
              profile.years_of_experience != null
                ? String(profile.years_of_experience)
                : "",
            linkedin_url: profile.linkedin_url ?? "",
            github_url: profile.github_url ?? "",
          });
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        const message =
          err instanceof Error
            ? err.message
            : "Unable to load your profile.";

        // Only treat an explicit missing-profile response
        // as normal for a candidate creating their first profile.
        if (message.toLowerCase().includes("profile not found")) {
          setProfileExists(false);
          setLoadError("");
        } else {
          setLoadError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  function handleChange(
    field: keyof typeof form,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setSuccess("");
    setError("");
  }

  const profileFields = [
  Boolean(form.phone.trim()),
  Boolean(form.location.trim()),
  Boolean(form.headline.trim()),
  Boolean(form.bio.trim()),
  form.years_of_experience.trim() !== "",
  Boolean(form.linkedin_url.trim()),
  Boolean(form.github_url.trim()),
];

const completedProfileFields =
  profileFields.filter(Boolean).length;

const profileCompletion = Math.round(
  (completedProfileFields / profileFields.length) * 100,
);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const token = getAccessToken();

      if (!token) {
        throw new Error("Please log in again.");
      }

      const years =
        form.years_of_experience.trim() === ""
          ? undefined
          : Number(form.years_of_experience);

      if (
        years !== undefined &&
        (!Number.isFinite(years) || years < 0)
      ) {
        throw new Error(
          "Years of experience must be a valid positive number.",
        );
      }

      const payload = {
        phone: form.phone.trim() || undefined,
        location: form.location.trim() || undefined,
        headline: form.headline.trim() || undefined,
        bio: form.bio.trim() || undefined,
        years_of_experience: years,
        linkedin_url: form.linkedin_url.trim() || undefined,
        github_url: form.github_url.trim() || undefined,
      };

      if (profileExists) {
        await updateCandidateProfile(payload, token);
      } else {
        await createCandidateProfile(payload, token);
        setProfileExists(true);
      }

      setSuccess("Your profile has been saved successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your profile.",
      );
    } finally {
      setSaving(false);
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
            Loading your profile...
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Please wait while we retrieve your information.
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
            Couldn&apos;t load your profile
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() =>
              setRetryCount((count) => count + 1)
            }
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
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
            <UserRound size={22} />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              My Profile
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Keep your professional information up to date.
            </p>
          </div>
        </div>
      </div>

      {/* Profile form */}
      <form onSubmit={handleSubmit}>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Section header */}
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-base font-semibold text-slate-900">
              Professional information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              This information helps recruiters understand your
              professional background.
            </p>
          </div>

          <div className="space-y-6 p-6">


  {/* Profile completeness */}
  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">
          Profile completeness
        </p>

        <p className="mt-1 text-xs text-slate-500">
          A complete profile helps recruiters understand your background.
        </p>
      </div>

      <span className="shrink-0 text-sm font-bold text-blue-600">
        {profileCompletion}%
      </span>
    </div>

    <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100">
      <div
        className="h-full rounded-full bg-blue-600 transition-all duration-300"
        style={{
          width: `${profileCompletion}%`,
        }}
      />
    </div>

    <p className="mt-2 text-xs text-slate-500">
      {profileCompletion === 100
        ? "Your profile is complete."
        : "Complete the remaining fields to strengthen your profile."}
    </p>
  </div>

  {/* Headline */}
            {/* Headline */}
            <div>
              <label
                htmlFor="headline"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Professional headline
              </label>

              <input
                id="headline"
                type="text"
                value={form.headline}
                onChange={(event) =>
                  handleChange(
                    "headline",
                    event.target.value,
                  )
                }
                placeholder="e.g. Junior Python Developer"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />

              <p className="mt-1.5 text-xs text-slate-400">
                A short title that describes your professional
                identity.
              </p>
            </div>

            {/* Phone + Location */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Phone number
                </label>

                <div className="relative">
                  <Phone
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      handleChange(
                        "phone",
                        event.target.value,
                      )
                    }
                    placeholder="e.g. +94 71 234 5678"
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />
                </div>
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
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="location"
                    type="text"
                    value={form.location}
                    onChange={(event) =>
                      handleChange(
                        "location",
                        event.target.value,
                      )
                    }
                    placeholder="e.g. Kurunegala, Sri Lanka"
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>
            </div>

            {/* Experience */}
            <div className="max-w-sm">
              <label
                htmlFor="years_of_experience"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Years of experience
              </label>

              <input
                id="years_of_experience"
                type="number"
                min="0"
                step="0.5"
                value={form.years_of_experience}
                onChange={(event) =>
                  handleChange(
                    "years_of_experience",
                    event.target.value,
                  )
                }
                placeholder="e.g. 2"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            {/* Professional links */}
            <div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Professional links
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Add your professional profiles so recruiters can learn more about your work.
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* LinkedIn */}
                <div>
                  <label
                    htmlFor="linkedin_url"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    LinkedIn
                  </label>

                  <input
                    id="linkedin_url"
                    type="url"
                    value={form.linkedin_url}
                    onChange={(event) =>
                      handleChange("linkedin_url", event.target.value)
                    }
                    placeholder="https://linkedin.com/in/your-name"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />

                  <p className="mt-1.5 text-xs text-slate-400">
                    Your LinkedIn profile URL.
                  </p>
                </div>

                {/* GitHub */}
                <div>
                  <label
                    htmlFor="github_url"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    GitHub
                  </label>

                  <input
                    id="github_url"
                    type="url"
                    value={form.github_url}
                    onChange={(event) =>
                      handleChange("github_url", event.target.value)
                    }
                    placeholder="https://github.com/your-username"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />

                  <p className="mt-1.5 text-xs text-slate-400">
                    Your GitHub profile URL.
                  </p>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label
                htmlFor="bio"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Professional summary
              </label>

              <textarea
                id="bio"
                rows={6}
                value={form.bio}
                onChange={(event) =>
                  handleChange(
                    "bio",
                    event.target.value,
                  )
                }
                placeholder="Tell recruiters briefly about your experience, strengths, interests, and career goals."
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Keep this concise and focused on your professional
                background.
              </p>
            </div>

            {/* Feedback */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                <CheckCircle2 size={17} />
                <span>{success}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50/70 px-6 py-4">
            <button
              type="submit"
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={17} />

              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
