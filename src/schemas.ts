/**
 * Zod schemas for MCP tool input validation
 */
import { z } from "zod";

// Swedish organization number: 10 digits, with or without dash
// Formats: 5566778899, 556677-8899, 16XXXXXXXXXX (for personnummer-based)
export const OrgnrSchema = z
  .string()
  .regex(
    /^(\d{6}-?\d{4}|\d{10}|\d{12})$/,
    "Organization number must be 10-12 digits, optionally with dash"
  )
  .describe(
    "Swedish organization number (organisationsnummer). Examples: 5566778899, 556677-8899"
  );

// Common optional parameters
export const LangSchema = z
  .enum(["sv", "en"])
  .default("sv")
  .describe("Response language: 'sv' for Swedish (default), 'en' for English");

export const LimitSchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .default(10)
  .describe("Maximum number of results (1-100, default 10)");

// Tool-specific schemas
export const LookupCompanyInputSchema = z.object({
  orgnr: OrgnrSchema,
  include_financials: z
    .boolean()
    .default(false)
    .describe("Include financial data from annual reports"),
  include_fi: z
    .boolean()
    .default(false)
    .describe("Include Finansinspektionen regulatory data"),
  lang: LangSchema,
});

export const SearchCompaniesInputSchema = z.object({
  query: z
    .string()
    .min(3)
    .max(100)
    .describe("Search term (company name, minimum 3 characters)"),
  city: z.string().optional().describe("Filter by city name"),
  sni: z
    .string()
    .regex(/^\d{2,5}$/)
    .optional()
    .describe("Filter by SNI code (2-5 digits)"),
  org_form: z
    .string()
    .optional()
    .describe("Filter by organization form (AB, HB, EK, etc.)"),
  active_only: z
    .boolean()
    .default(true)
    .describe("Only show active companies (default true)"),
  limit: LimitSchema,
});

export const AnalyzeFinancialsInputSchema = z.object({
  orgnr: OrgnrSchema,
  include_analysis: z
    .boolean()
    .default(true)
    .describe("Include AI-generated analysis"),
  lang: LangSchema,
});

export const AssessCreditInputSchema = z.object({
  orgnr: OrgnrSchema,
});

export const GetTimelineInputSchema = z.object({
  orgnr: OrgnrSchema,
  lang: LangSchema,
});

export const GetSimilarInputSchema = z.object({
  orgnr: OrgnrSchema,
  limit: z.number().int().min(1).max(100).default(20),
  same_city: z
    .boolean()
    .default(true)
    .describe("Prefer companies in the same city"),
});

export const GetReportsInputSchema = z.object({
  orgnr: OrgnrSchema,
});

export const GetComplianceInputSchema = z.object({
  orgnr: OrgnrSchema,
});

export const GetIndustryStatsInputSchema = z.object({
  sni_code: z
    .string()
    .regex(/^\d{2,5}$/, "SNI code must be 2-5 digits")
    .describe("SNI industry code (2-5 digits)"),
  lang: LangSchema,
});

// Export types
export type LookupCompanyInput = z.infer<typeof LookupCompanyInputSchema>;
export type SearchCompaniesInput = z.infer<typeof SearchCompaniesInputSchema>;
export type AnalyzeFinancialsInput = z.infer<
  typeof AnalyzeFinancialsInputSchema
>;
export type AssessCreditInput = z.infer<typeof AssessCreditInputSchema>;
export type GetTimelineInput = z.infer<typeof GetTimelineInputSchema>;
export type GetSimilarInput = z.infer<typeof GetSimilarInputSchema>;
export type GetReportsInput = z.infer<typeof GetReportsInputSchema>;
export type GetComplianceInput = z.infer<typeof GetComplianceInputSchema>;
export type GetIndustryStatsInput = z.infer<typeof GetIndustryStatsInputSchema>;
