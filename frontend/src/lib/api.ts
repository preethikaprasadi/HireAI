export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

type ApiRequestOptions = RequestInit & {
  token?: string;
};

const TOKEN_KEY = "hireai_access_token";


function handleUnauthorized() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);

  window.location.assign("/login");
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    token,
    headers,
    ...requestOptions
  } = options;

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...requestOptions,
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
        ...headers,
      },
    },
  );

  if (response.status === 401 && token) {
    handleUnauthorized();

    throw new Error(
      "Your session has expired. Please log in again.",
    );
  }


  if (!response.ok) {
    let message = "Something went wrong.";

    try {
      const errorData = await response.json();

      if (errorData?.detail) {
        message = errorData.detail;
      }
    } catch {
      // Keep the default message.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export interface Company {
  id: string;
  created_by: string;
  name: string;
  description?: string | null;
  website?: string | null;
  industry?: string | null;
  location?: string | null;
  logo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyRequest {
  name: string;
  description?: string | null;
  industry?: string | null;
  website?: string | null;
  location?: string | null;
  logo_url?: string | null;
}

export interface CompanyMembership {
  company_id: string;
  user_id: string;
  role: string;
}

export interface CompanyDirectoryItem {
  id: string;
  name: string;
  industry?: string | null;
  location?: string | null;
}

export async function getCompanyDirectory(): Promise<CompanyDirectoryItem[]> {
  return apiRequest<CompanyDirectoryItem[]>(
    "/api/v1/companies/directory",
    { method: "GET" },
  );
}

export interface CompanyJoinRequest {
  id: string;
  company_id: string;
  user_id?: string;
  company_name?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  updated_at: string;
}

export async function searchCompanies(
  search: string,
): Promise<CompanyDirectoryItem[]> {
  return apiRequest<CompanyDirectoryItem[]>(
    `/api/v1/companies/directory?search=${encodeURIComponent(search)}`,
    { method: "GET" },
  );
}

export async function requestCompanyJoin(
  companyId: string,
  token: string,
): Promise<CompanyJoinRequest> {
  return apiRequest<CompanyJoinRequest>(
    `/api/v1/companies/${companyId}/join-requests`,
    {
      method: "POST",
      token,
    },
  );
}

export async function getMyCompanyJoinRequests(
  token: string,
): Promise<CompanyJoinRequest[]> {
  return apiRequest<CompanyJoinRequest[]>(
    "/api/v1/companies/join-requests/me",
    {
      method: "GET",
      token,
    },
  );
}

export async function getCompanyJoinRequests(
  companyId: string,
  token: string,
): Promise<CompanyJoinRequest[]> {
  return apiRequest<CompanyJoinRequest[]>(
    `/api/v1/companies/${companyId}/join-requests`,
    {
      method: "GET",
      token,
    },
  );
}

export async function decideCompanyJoinRequest(
  companyId: string,
  requestId: string,
  decision: "APPROVED" | "REJECTED",
  token: string,
): Promise<CompanyJoinRequest> {
  return apiRequest<CompanyJoinRequest>(
    `/api/v1/companies/${companyId}/join-requests/${requestId}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify({ status: decision }),
    },
  );
}


export interface Job {
  id: string;
  company_id: string;
  created_by: string;
  title: string;
  department?: string | null;
  department_id?: string | null;
  description: string;
  location?: string | null;
  employment_type: string;
  experience_min?: number | null;
  experience_max?: number | null;
  salary_min?: number | string | null;
  salary_max?: number | string | null;
  status: string;
  published_at?: string | null;
  closing_date?: string | null;
  created_at: string;
  updated_at: string;
}

export type ApplicationStatus =
  | "APPLIED"
  | "PENDING"
  | "REVIEWED"
  | "SHORTLISTED"
  | "REJECTED"
  | "HIRED";

export interface Application {
  id: string;
  job_id: string;
  candidate_profile_id: string;
  resume_id: string;
  status: ApplicationStatus;
  applied_at?: string;
  updated_at?: string;
}

export async function getJob(
  jobId: string,
  token: string,
): Promise<Job> {
  return apiRequest<Job>(
    `/api/v1/jobs/${jobId}`,
    {
      method: "GET",
      token,
    },
  );
}

export async function getRecruiterJobs(
  token: string,
): Promise<Job[]> {
  return apiRequest<Job[]>(
    "/api/v1/jobs/recruiter",
    {
      method: "GET",
      token,
    },
  );
}

export async function getRecruiterApplications(
  token: string,
): Promise<Application[]> {
  return apiRequest<Application[]>(
    "/api/v1/applications/recruiter",
    {
      method: "GET",
      token,
    },
  );
}

export async function getRecruiterCompanies(
  token: string,
): Promise<Company[]> {
  return apiRequest<Company[]>(
    "/api/v1/companies/recruiter",
    {
      method: "GET",
      token,
    },
  );
}

export async function getCompany(
  companyId: string,
  token: string,
): Promise<Company> {
  return apiRequest<Company>(
    `/api/v1/companies/${companyId}`,
    {
      method: "GET",
      token,
    },
  );
}

export async function createCompany(
  data: CompanyRequest,
  token: string,
): Promise<Company> {
  return apiRequest<Company>(
    "/api/v1/companies",
    {
      method: "POST",
      token,
      body: JSON.stringify(data),
    },
  );
}

export async function updateCompany(
  companyId: string,
  data: CompanyRequest,
  token: string,
): Promise<Company> {
  return apiRequest<Company>(
    `/api/v1/companies/${companyId}`,
    {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    },
  );
}

export async function getMyCompanyMemberships(
  token: string,
): Promise<CompanyMembership[]> {
  return apiRequest<CompanyMembership[]>(
    "/api/v1/companies/memberships/me",
    {
      method: "GET",
      token,
    },
  );
}

export interface Department {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DepartmentRequest {
  name: string;
  description?: string | null;
}

export interface DepartmentMember {
  id: string;
  department_id: string;
  user_id: string;
  email: string;
  assigned_by: string;
  created_at: string;
}

export async function getDepartments(
  companyId: string,
  token: string,
): Promise<Department[]> {
  return apiRequest<Department[]>(
    `/api/v1/companies/${companyId}/departments`,
    { method: "GET", token },
  );
}

export async function createDepartment(
  companyId: string,
  data: DepartmentRequest,
  token: string,
): Promise<Department> {
  return apiRequest<Department>(
    `/api/v1/companies/${companyId}/departments`,
    {
      method: "POST",
      token,
      body: JSON.stringify(data),
    },
  );
}

export async function updateDepartment(
  companyId: string,
  departmentId: string,
  data: Partial<DepartmentRequest>,
  token: string,
): Promise<Department> {
  return apiRequest<Department>(
    `/api/v1/companies/${companyId}/departments/${departmentId}`,
    {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    },
  );
}

export async function deleteDepartment(
  companyId: string,
  departmentId: string,
  token: string,
): Promise<void> {
  return apiRequest<void>(
    `/api/v1/companies/${companyId}/departments/${departmentId}`,
    { method: "DELETE", token },
  );
}

export async function getDepartmentMembers(
  companyId: string,
  departmentId: string,
  token: string,
): Promise<DepartmentMember[]> {
  return apiRequest<DepartmentMember[]>(
    `/api/v1/companies/${companyId}/departments/${departmentId}/members`,
    { method: "GET", token },
  );
}

export async function assignDepartmentMember(
  companyId: string,
  departmentId: string,
  email: string,
  token: string,
): Promise<DepartmentMember> {
  return apiRequest<DepartmentMember>(
    `/api/v1/companies/${companyId}/departments/${departmentId}/members`,
    {
      method: "POST",
      token,
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
      }),
    },
  );
}

export async function removeDepartmentMember(
  companyId: string,
  departmentId: string,
  assignmentId: string,
  token: string,
): Promise<void> {
  return apiRequest<void>(
    `/api/v1/companies/${companyId}/departments/${departmentId}/members/${assignmentId}`,
    { method: "DELETE", token },
  );
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  email: string;
  role: string;
  created_at: string;
}

export async function getCompanyMembers(
  companyId: string,
  token: string,
): Promise<CompanyMember[]> {
  return apiRequest<CompanyMember[]>(
    `/api/v1/companies/${companyId}/members`,
    {
      method: "GET",
      token,
    },
  );
}

export async function addCompanyMember(
  companyId: string,
  email: string,
  token: string,
): Promise<CompanyMember> {
  return apiRequest<CompanyMember>(
    `/api/v1/companies/${companyId}/members`,
    {
      method: "POST",
      token,
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    },
  );
}

export async function removeCompanyMember(
  companyId: string,
  memberId: string,
  token: string,
): Promise<void> {
  return apiRequest<void>(
    `/api/v1/companies/${companyId}/members/${memberId}`,
    {
      method: "DELETE",
      token,
    },
  );
}


export interface RecruiterAnalyticsOverview {
  total_jobs: number;
  active_jobs: number;
  closed_jobs: number;
  draft_jobs: number;
  total_candidates: number;
  total_applications: number;
  applied: number;
  pending: number;
  reviewed: number;
  shortlisted: number;
  rejected: number;
  hired: number;
}

export interface RecruiterApplicationPipeline {
  applied: number;
  pending: number;
  reviewed: number;
  shortlisted: number;
  rejected: number;
  hired: number;
}

export interface RecruiterApplicationActivity {
  date: string;
  applications: number;
}

export interface RecruiterJobPerformance {
  job_id: string;
  job_title: string;
  status: string;
  application_count: number;
  shortlisted_count: number;
  hired_count: number;
  rejected_count: number;
}

export interface RecruiterAnalytics {
  overview: RecruiterAnalyticsOverview;
  application_pipeline: RecruiterApplicationPipeline;
  application_activity: RecruiterApplicationActivity[];
  job_performance: RecruiterJobPerformance[];
}

export async function getRecruiterAnalytics(
  token: string
): Promise<RecruiterAnalytics> {
  return apiRequest<RecruiterAnalytics>(
    "/api/v1/analytics/recruiter",
    {
      token,
    }
  );
}

export interface JobSkillSelectionRequest {
  skill_id?: string;
  name?: string;
  requirement_type: "REQUIRED" | "PREFERRED";
  importance: number;
}

export interface JobCreateRequest {
  company_id: string;
  title: string;
  department_id?: string | null;
  department?: string;
  description: string;
  skills?: JobSkillSelectionRequest[];
  location?: string;
  employment_type: string;
  experience_min?: number;
  experience_max?: number;
  salary_min?: number;
  salary_max?: number;
  closing_date?: string;
}

export async function createJob(
  data: JobCreateRequest,
  token: string,
): Promise<Job> {
  return apiRequest<Job>(
    "/api/v1/jobs",
    {
      method: "POST",
      token,
      body: JSON.stringify(data),
    },
  );
}

export async function getRecruiterSkillCatalog(
  token: string
): Promise<Skill[]> {
  return apiRequest<Skill[]>("/api/v1/skills/catalog", {
    method: "GET",
    token,
  });
}

export async function createSkill(
  name: string,
  token: string
): Promise<Skill> {
  return apiRequest<Skill>("/api/v1/skills", {
    method: "POST",
    token,
    body: JSON.stringify({ name }),
  });
}

export interface CandidateMatch {
  application_id: string;
  candidate_profile_id: string;
  resume_id: string;
  candidate_name: string;
  application_status: ApplicationStatus;
  overall_score: number;
  match_status: string;
  components: {
    skill: number;
    experience: number;
    role: number;
    semantic: number;
  };
  details: {
    matched_required: string[];
    matched_preferred: string[];
    missing_required: string[];
    missing_preferred: string[];
    experience_status: string;
    role_status: string;
    matched_title?: string | null;
    semantic_status: string;
  };
}

export async function getJobMatches(
  jobId: string,
  token: string,
): Promise<CandidateMatch[]> {
  return apiRequest<CandidateMatch[]>(
    `/api/v1/jobs/${jobId}/matches`,
    {
      method: "GET",
      token,
    },
  );
}

export interface ApplicationReview {
  candidate: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    headline?: string | null;
    years_of_experience?: number | null;
  };

  application: Application;

  resume: {
    id: string;
    file_name: string;
    version: number;
    is_current: boolean;
    uploaded_at: string;
  };

  resume_analysis?: {
    summary?: string | null;
    skills: string[];
    job_titles: string[];
    experience: Array<Record<string, unknown>>;
    education: Array<Record<string, unknown>>;
    projects: Array<Record<string, unknown>>;
    certifications: string[];
  } | null;

  match?: {
    overall_score: number;
    match_status: string;
    components: {
      skill: number;
      experience: number;
      role: number;
      semantic: number;
    };
    details: {
      matched_required: string[];
      matched_preferred: string[];
      missing_required: string[];
      missing_preferred: string[];
      experience_status?: string | null;
      role_status?: string | null;
      matched_title?: string | null;
      semantic_status?: string | null;
    };
  } | null;
  company_role: string;
  job_created_by: string;
}

export async function getJobApplications(
  jobId: string,
  token: string,
): Promise<Application[]> {
  return apiRequest<Application[]>(
    `/api/v1/applications/job/${jobId}`,
    {
      method: "GET",
      token,
    },
  );
}

export async function getApplicationReview(
  applicationId: string,
  token: string,
): Promise<ApplicationReview> {
  return apiRequest<ApplicationReview>(
    `/api/v1/applications/${applicationId}/review`,
    {
      method: "GET",
      token,
    },
  );
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
  token: string,
): Promise<Application> {
  return apiRequest<Application>(
    `/api/v1/applications/${applicationId}/status`,
    {
      method: "PUT",
      token,
      body: JSON.stringify({
        status,
      }),
    },
  );
}

export interface Resume {
  id: string;
  candidate_profile_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  version: number;
  is_current: boolean;
  uploaded_at: string;
}


export interface CandidateProfile {
  id: string;
  user_id: string;
  phone?: string | null;
  location?: string | null;
  headline?: string | null;
  bio?: string | null;
  years_of_experience?: number | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  created_at?: string;
  updated_at?: string;
}


export interface CreateApplicationRequest {
  job_id: string;
  resume_id: string;
}


export async function getJobs(
  token: string,
): Promise<Job[]> {
  return apiRequest<Job[]>(
    "/api/v1/jobs",
    {
      method: "GET",
      token,
    },
  );
}


export interface CandidateProfileRequest {
  phone?: string;
  location?: string;
  headline?: string;
  bio?: string;
  years_of_experience?: number;
  linkedin_url?: string;
  github_url?: string;
}



export async function createCandidateProfile(
  data: CandidateProfileRequest,
  token: string,
): Promise<CandidateProfile> {
  return apiRequest<CandidateProfile>(
    "/api/v1/candidates/profile",
    {
      method: "POST",
      token,
      body: JSON.stringify(data),
    },
  );
}

export async function updateCandidateProfile(
  data: CandidateProfileRequest,
  token: string,
): Promise<CandidateProfile> {
  return apiRequest<CandidateProfile>(
    "/api/v1/candidates/profile",
    {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    },
  );
}

export async function getCandidateProfile(
  token: string,
): Promise<CandidateProfile> {
  return apiRequest<CandidateProfile>(
    "/api/v1/candidates/profile",
    {
      method: "GET",
      token,
    },
  );
}


export async function getCandidateResumes(
  token: string,
): Promise<Resume[]> {
  return apiRequest<Resume[]>(
    "/api/v1/candidates/resumes",
    {
      method: "GET",
      token,
    },
  );
}

export interface Skill {
  id: string;
  name: string;
}

export interface CandidateSkill {
  skill_id: string;
  proficiency?: string | null;
  years_experience?: number | null;
  source?: string | null;
}

export interface CandidateSkillRequest {
  skill_id: string;
  proficiency?: string;
  years_experience?: number;
}

export async function getAvailableSkills(
  token: string,
): Promise<Skill[]> {
  return apiRequest<Skill[]>(
    "/api/v1/candidates/skills/catalog",
    {
      method: "GET",
      token,
    },
  );
}

export async function getCandidateSkills(
  token: string,
): Promise<CandidateSkill[]> {
  return apiRequest<CandidateSkill[]>(
    "/api/v1/candidates/skills",
    {
      method: "GET",
      token,
    },
  );
}

export async function createCandidateSkill(
  data: CandidateSkillRequest,
  token: string,
): Promise<CandidateSkill> {
  return apiRequest<CandidateSkill>(
    "/api/v1/candidates/skills",
    {
      method: "POST",
      token,
      body: JSON.stringify(data),
    },
  );
}

export async function deleteCandidateSkill(
  skillId: string,
  token: string,
): Promise<void> {
  await apiRequest(
    `/api/v1/candidates/skills/${skillId}`,
    {
      method: "DELETE",
      token,
    },
  );
}

export async function uploadCandidateResume(
  file: File,
  token: string,
): Promise<Resume> {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/api/v1/candidates/resumes`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
  );

  if (response.status === 401) {
    handleUnauthorized();

    throw new Error(
      "Your session has expired. Please log in again.",
    );
  }


  if (!response.ok) {
    let message = "Failed to upload resume.";

    try {
      const errorData = await response.json();

      if (errorData?.detail) {
        message = errorData.detail;
      }
    } catch {
      // Keep default message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<Resume>;
}


export async function deleteCandidateResume(
  resumeId: string,
  token: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/candidates/resumes/${resumeId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (response.status === 401) {
    handleUnauthorized();

    throw new Error(
      "Your session has expired. Please log in again.",
    );
  }


  if (!response.ok) {
    let message = "Failed to delete resume.";

    try {
      const errorData = await response.json();

      if (errorData?.detail) {
        message = errorData.detail;
      }
    } catch {
      // Keep default message.
    }

    throw new Error(message);
  }
}

export async function createApplication(
  data: CreateApplicationRequest,
  token: string,
): Promise<Application> {
  return apiRequest<Application>(
    "/api/v1/applications",
    {
      method: "POST",
      token,
      body: JSON.stringify(data),
    },
  );
}


export async function getCandidateApplications(
  token: string,
): Promise<Application[]> {
  return apiRequest<Application[]>(
    "/api/v1/applications/candidate",
    {
      method: "GET",
      token,
    },
  );
}

export interface RecruiterCandidateApplication {
  id: string;
  job_id: string;
  job_title: string;
  status: ApplicationStatus;
  applied_at: string;
}

export interface RecruiterCandidateResume {
  id: string;
  file_name: string;
  version: number;
  is_current: boolean;
  uploaded_at: string;
}

export interface RecruiterCandidate {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  headline: string | null;
  years_of_experience: number | null;

  resume: RecruiterCandidateResume | null;

  skills: string[];
  job_titles: string[];

  applications: RecruiterCandidateApplication[];
  application_count: number;
}

export interface RecruiterCandidatesResponse {
  candidates: RecruiterCandidate[];
  count: number;
}

export async function getRecruiterCandidates(
  token: string
): Promise<RecruiterCandidatesResponse> {
  return apiRequest<RecruiterCandidatesResponse>(
    "/api/v1/candidates/recruiter",
    {
      method: "GET",
      token,
    }
  );
}
