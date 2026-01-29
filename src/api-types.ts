/**
 * Type definitions for BolagsAPI responses
 */

export interface FinancialHealth {
  stability_grade: string;
  volatility_index: number;
  finance_score: number;
  history_score: number;
  ability_to_pay_score: number;
  ownership_score: number;
  composite_score: number;
  financial_flags: {
    public_defaults_count: number;
    public_defaults_amount: number;
    petitions_count: number;
    petitions_amount: number;
    has_negative_equity: boolean;
    has_liquidation: boolean;
    has_fi_warning: boolean;
    has_qualified_audit: boolean;
  };
  _disclaimer?: {
    sv: string;
    en: string;
    applies: string;
  };
}

export interface CompanyData {
  orgnr: string;
  orgnr_formatted: string;
  vat_number?: string;
  name: string;
  org_form: {
    code: string;
    description: string;
  };
  status: string;
  registered_date: string;
  deregistered_date?: string | null;
  deregistration?: {
    reason?: string;
    date?: string;
  } | null;
  ongoing_procedures?: string | null;
  address?: {
    street?: string;
    co?: string | null;
    postal_code?: string;
    city?: string;
    country?: string;
  };
  business?: {
    description?: string;
    sni_codes?: Array<{ code: string; description: string }>;
    nace_codes?: Array<{ code: string; description: string }>;
  };
  tax_status?: {
    active: boolean;
    registered_for_vat_or_employer: boolean;
    f_tax: boolean;
    vat: boolean;
    employer?: boolean | null;
  };
  board?: {
    total_members: number;
    males: number;
    females: number;
    unknown_gender: number;
    average_age?: number;
    female_percentage: number;
  };
  financial_health?: FinancialHealth;
  website?: string;
  linkedin?: string;
  meta: {
    source: string;
    updated_at: string;
  };
  // Optional enrichment data
  financials?: unknown;
  fi?: unknown;
}

export interface SearchResult {
  query: string;
  filters: Record<string, unknown>;
  total: number;
  limit: number;
  offset: number;
  next_cursor?: string;
  results: Array<{
    orgnr: string;
    name: string;
    org_form: string;
    active: boolean;
    city?: string;
    score?: number;
    registered_date?: string;
    updated_at?: string;
  }>;
}

export interface FinancialsData {
  orgnr: string;
  currency: string;
  years: Array<{
    fiscal_year_end: string;
    fiscal_year_start?: string | null;
    is_primary?: boolean;
    income_statement: {
      revenue?: number | null;
      other_revenue?: number | null;
      operating_result?: number | null;
      result_before_tax?: number | null;
      net_income?: number | null;
    };
    balance_sheet: {
      total_assets?: number | null;
      equity?: number | null;
      cash_and_bank?: number | null;
      short_term_liabilities?: number | null;
      long_term_liabilities?: number | null;
    };
    ratios: {
      equity_ratio?: number | null;
      quick_ratio?: number | null;
      profit_margin?: number | null;
      return_on_equity?: number | null;
      return_on_assets?: number | null;
    };
    employees?: number | null;
    report_id?: string;
  }>;
}

export interface AnalysisData {
  orgnr: string;
  fiscal_year_end: string;
  rating: string;
  risk_score: number;
  summary: string;
  risk_factors: Array<{
    category: string;
    severity: string;
    description_en: string;
    description_sv: string;
  }>;
}

export interface HealthScore {
  orgnr: string;
  score: number;
  factors: {
    active: boolean;
    f_skatt: boolean;
    age_years: number;
    liquidation_risk: boolean;
  };
  industry_benchmark?: {
    sni_code: string;
    sni_description: string;
    average_score: number;
    percentile: number;
    sample_size: number;
  };
}

export interface TimelineData {
  orgnr: string;
  events: Array<{
    date: string;
    type: string;
    description: string;
  }>;
}

export interface SimilarCompanies {
  orgnr: string;
  similar: Array<{
    orgnr: string;
    name: string;
    sni_match?: string[];
    city?: string;
  }>;
}

export interface ReportsList {
  orgnr: string;
  name: string;
  total: number;
  reports: Array<{
    id: string;
    year: number;
    period_end: string;
    registered_at: string;
    format: string;
    has_auditor: boolean;
    status: string;
  }>;
  pagination: {
    total: number;
    returned: number;
    offset: number;
    has_more: boolean;
  };
}

export interface CompanyScreening {
  orgnr: string;
  companyName: string;
  companyScreening: {
    queryName: string;
    sanctionsHits: unknown[];
    pepHits: unknown[];
    hasSanctionsHits: boolean;
    hasPepHits: boolean;
    riskLevel: string;
    screenedAt: string;
  };
  boardMemberScreenings: Array<{
    name: string;
    position: string;
    screening: {
      queryName: string;
      sanctionsHits: unknown[];
      pepHits: unknown[];
      hasSanctionsHits: boolean;
      hasPepHits: boolean;
      riskLevel: string;
      screenedAt: string;
    };
  }>;
  overallRiskLevel: string;
  hasSanctionsHits: boolean;
  hasPepHits: boolean;
  screenedAt: string;
}

export interface IndustryStats {
  sni_code: string;
  description: string;
  statistics: {
    total_companies: string;
    active_companies: string;
    by_org_form: Record<string, string>;
    by_region: Record<string, string>;
    avg_age_years: number;
  };
}
