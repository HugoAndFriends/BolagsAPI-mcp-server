/**
 * HTTP client for calling the BolagsAPI REST API
 */

// Re-export types for convenience
export type {
  CompanyData,
  FinancialHealth,
  SearchResult,
  FinancialsData,
  AnalysisData,
  HealthScore,
  TimelineData,
  SimilarCompanies,
  ReportsList,
  CompanyScreening,
  IndustryStats,
} from "./api-types.js";

import type {
  CompanyData,
  FinancialHealth,
  SearchResult,
  FinancialsData,
  AnalysisData,
  HealthScore,
  TimelineData,
  SimilarCompanies,
  ReportsList,
  CompanyScreening,
  IndustryStats,
} from "./api-types.js";

// Configuration from environment
const API_BASE_URL =
  process.env.BOLAGSAPI_URL ?? "https://api.bolagsapi.se/v1";
const API_KEY = process.env.BOLAGSAPI_KEY ?? "";

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: {
    params?: Record<string, string | number | boolean | undefined>;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const url = new URL(`${API_BASE_URL}${endpoint}`);

  // Add query params
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url.toString(), { headers });
  const json = (await response.json()) as T & ApiErrorResponse;

  if (!response.ok) {
    const errorJson = json as ApiErrorResponse;
    throw new ApiError(
      response.status,
      errorJson.error ?? "unknown_error",
      errorJson.message ?? `API request failed with status ${String(response.status)}`
    );
  }

  return json;
}

// API functions
export async function getCompany(
  orgnr: string,
  options: {
    include?: string[];
    lang?: "sv" | "en";
  } = {}
): Promise<CompanyData> {
  const includeParam = options.include?.length
    ? options.include.join(",")
    : undefined;
  return apiRequest<CompanyData>(`/company/${orgnr}`, {
    params: { include: includeParam },
    headers: options.lang ? { "Accept-Language": options.lang } : undefined,
  });
}

export async function searchCompanies(params: {
  q: string;
  city?: string;
  sni?: string;
  org_form?: string;
  active_only?: boolean;
  limit?: number;
  offset?: number;
}): Promise<SearchResult> {
  return apiRequest<SearchResult>("/search", { params });
}

export async function getFinancials(orgnr: string): Promise<FinancialsData> {
  return apiRequest<FinancialsData>(`/company/${orgnr}/financials`);
}

export async function getAnalysis(
  orgnr: string,
  lang?: "sv" | "en"
): Promise<AnalysisData> {
  return apiRequest<AnalysisData>(`/company/${orgnr}/analysis`, {
    params: { lang },
  });
}

export async function getHealthScore(orgnr: string): Promise<HealthScore> {
  return apiRequest<HealthScore>(`/company/${orgnr}/health`);
}

export async function getFinancialHealth(orgnr: string): Promise<FinancialHealth> {
  return apiRequest<FinancialHealth>(`/company/${orgnr}/financial-health`);
}

export async function getTimeline(
  orgnr: string,
  lang?: "sv" | "en"
): Promise<TimelineData> {
  return apiRequest<TimelineData>(`/company/${orgnr}/timeline`, {
    headers: lang ? { "Accept-Language": lang } : undefined,
  });
}

export async function getSimilarCompanies(
  orgnr: string,
  options: { limit?: number; same_city?: boolean } = {}
): Promise<SimilarCompanies> {
  return apiRequest<SimilarCompanies>(`/company/${orgnr}/similar`, {
    params: options,
  });
}

export async function getReports(orgnr: string): Promise<ReportsList> {
  return apiRequest<ReportsList>(`/company/${orgnr}/reports`);
}

export async function getCompanyScreening(
  orgnr: string
): Promise<CompanyScreening> {
  return apiRequest<CompanyScreening>(`/company/${orgnr}/screening`);
}

export async function getIndustryStats(
  sniCode: string,
  lang?: "sv" | "en"
): Promise<IndustryStats> {
  return apiRequest<IndustryStats>(`/industry/${sniCode}`, {
    headers: lang ? { "Accept-Language": lang } : undefined,
  });
}
