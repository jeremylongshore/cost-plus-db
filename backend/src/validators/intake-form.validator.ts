/**
 * Intake Form Validator
 *
 * Zod schema for validating customer intake form submissions.
 * Validates all 40+ fields from the customer intake form.
 *
 * @module validators/intake-form
 */

import { z } from 'zod';

/**
 * Company size enum
 */
const companySizeEnum = z.enum(['1-10', '11-50', '51-200', '201-500', '501+']);

/**
 * Contact method enum
 */
const contactMethodEnum = z.enum(['email', 'phone', 'slack', 'teams']);

/**
 * Timezone enum (common timezones)
 */
const timezoneEnum = z.enum([
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
  'other',
]);

/**
 * Database provider enum
 */
const providerEnum = z.enum([
  'heroku',
  'aws-rds',
  'gcp-cloudsql',
  'azure',
  'digitalocean',
  'self-hosted',
  'none',
  'other',
]);

/**
 * Migration timeline enum
 */
const migrationTimelineEnum = z.enum([
  'asap',
  '1-2-weeks',
  '1-month',
  '1-3-months',
  'exploring',
]);

/**
 * Zero downtime preference
 */
const zeroDowntimeEnum = z.enum(['yes', 'no', 'discuss']);

/**
 * Data sensitivity level
 */
const dataSensitivityEnum = z.enum(['public', 'internal', 'confidential', 'regulated']);

/**
 * Pricing tier enum
 */
const tierEnum = z.enum(['shared', 'dedicated', 'pro', 'enterprise', 'custom']);

/**
 * Add-ons enum
 */
const addonsEnum = z.enum([
  'high-availability',
  'read-replicas',
  'vpn',
  'compliance',
  'slack',
]);

/**
 * Infrastructure provider preference
 */
const infrastructureEnum = z.enum(['contabo', 'hetzner', 'digitalocean', 'aws', '']);

/**
 * Region preference
 */
const regionEnum = z.enum(['us-east', 'us-west', 'eu-central', 'asia-pacific', '']);

/**
 * Compliance requirements
 */
const complianceEnum = z.enum(['hipaa', 'soc2', 'gdpr', 'pci', 'none']);

/**
 * Backup retention period (days)
 */
const backupRetentionEnum = z.enum(['30', '60', '90', '180', '365', 'custom']);

/**
 * Referral source
 */
const referralSourceEnum = z.enum([
  'search',
  'social',
  'referral',
  'blog',
  'reddit',
  'other',
]);

/**
 * Contract length preference
 */
const contractLengthEnum = z.enum(['monthly', 'annual', 'discuss']);

/**
 * Email validation regex
 */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Phone validation regex (international format)
 */
const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;

/**
 * URL validation regex
 */
const urlRegex = /^https?:\/\/.+/;

/**
 * Customer intake form schema
 */
export const intakeFormSchema = z.object({
  // SECTION 1: COMPANY INFORMATION
  company_name: z.string().min(1, 'Company name is required').max(200),
  industry: z.string().max(100).optional(),
  company_size: companySizeEnum.optional(),
  website: z
    .string()
    .regex(urlRegex, 'Invalid URL format')
    .max(255)
    .optional()
    .or(z.literal('')),
  address: z.string().max(500).optional(),
  tax_id: z.string().max(100).optional(),

  // SECTION 2: PRIMARY CONTACT
  primary_contact_name: z.string().min(1, 'Primary contact name is required').max(100),
  primary_contact_title: z.string().max(100).optional(),
  primary_contact_email: z
    .string()
    .min(1, 'Primary contact email is required')
    .regex(emailRegex, 'Invalid email format')
    .max(255),
  primary_contact_phone: z
    .string()
    .regex(phoneRegex, 'Invalid phone format')
    .max(50)
    .optional()
    .or(z.literal('')),
  preferred_contact_method: contactMethodEnum.default('email'),
  timezone: timezoneEnum.optional(),

  // SECTION 3: TECHNICAL CONTACT (optional)
  tech_contact_name: z.string().max(100).optional(),
  tech_contact_role: z.string().max(100).optional(),
  tech_contact_email: z
    .string()
    .regex(emailRegex, 'Invalid email format')
    .max(255)
    .optional()
    .or(z.literal('')),
  tech_contact_phone: z
    .string()
    .regex(phoneRegex, 'Invalid phone format')
    .max(50)
    .optional()
    .or(z.literal('')),

  // SECTION 4: CURRENT DATABASE ENVIRONMENT
  current_provider: providerEnum.optional(),
  postgres_version: z.string().max(50).optional(),
  database_size: z.string().max(50).optional(),
  num_databases: z.coerce.number().int().min(0).max(1000).optional(),
  avg_connections: z.coerce.number().int().min(0).max(100000).optional(),
  peak_traffic: z.string().max(200).optional(),
  performance_requirements: z.string().max(1000).optional(),

  // SECTION 5: MIGRATION DETAILS
  migration_timeline: migrationTimelineEnum.optional(),
  downtime_window: z.string().max(200).optional(),
  zero_downtime: zeroDowntimeEnum.optional(),
  data_sensitivity: dataSensitivityEnum.optional(),

  // SECTION 6: SERVICE REQUIREMENTS
  tier_interest: tierEnum.optional(),
  addons: z.array(addonsEnum).default([]),
  infrastructure_preference: infrastructureEnum.default(''),
  region_preference: regionEnum.default(''),

  // SECTION 7: COMPLIANCE & SECURITY
  compliance: z.array(complianceEnum).default([]),
  backup_retention: backupRetentionEnum.default('30'),
  data_residency: z.string().max(200).optional(),
  security_certifications: z.string().max(500).optional(),

  // SECTION 8: BUSINESS DETAILS
  referral_source: referralSourceEnum.optional(),
  current_monthly_spend: z.string().max(50).optional(),
  budget: z.string().max(50).optional(),
  contract_length: contractLengthEnum.default('monthly'),
  anticipated_growth: z.string().max(100).optional(),

  // SECTION 9: ADDITIONAL INFORMATION
  use_case: z.string().max(2000).optional(),
  specific_requirements: z.string().max(2000).optional(),
  special_considerations: z.string().max(2000).optional(),
});

/**
 * Type inference for intake form data
 */
export type IntakeFormData = z.infer<typeof intakeFormSchema>;

/**
 * Validate intake form data
 *
 * @param data - Raw form data
 * @returns Validated and typed form data
 * @throws ZodError if validation fails
 */
export function validateIntakeForm(data: unknown): IntakeFormData {
  return intakeFormSchema.parse(data);
}

/**
 * Safe validate with error handling
 *
 * @param data - Raw form data
 * @returns Success or error result
 */
export function safeValidateIntakeForm(data: unknown) {
  return intakeFormSchema.safeParse(data);
}
