/**
 * Customer Validator
 *
 * Zod schemas for validating customer operations including
 * updates, status transitions, tier changes, and add-ons.
 *
 * @module validators/customer
 */

import { z } from 'zod';

/**
 * Customer status enum
 */
const customerStatusEnum = z.enum([
  'prospect',
  'consultation',
  'approved',
  'provisioning',
  'active',
  'suspended',
  'churned',
]);

/**
 * Pricing tier enum
 */
const pricingTierEnum = z.enum(['shared', 'dedicated', 'pro', 'enterprise']);

/**
 * Add-ons enum
 */
const addonsEnum = z.enum(['ha', 'replicas', 'vpn', 'compliance']);

/**
 * Email validation regex
 */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Phone validation regex
 */
const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;

/**
 * URL validation regex
 */
const urlRegex = /^https?:\/\/.+/;

/**
 * Customer update schema
 *
 * Validates partial updates to customer records.
 * All fields are optional.
 */
export const customerUpdateSchema = z
  .object({
    company_name: z.string().min(1).max(200).optional(),
    email: z.string().regex(emailRegex, 'Invalid email format').max(255).optional(),
    tier: pricingTierEnum.optional(),
    status: customerStatusEnum.optional(),
    contact_name: z.string().max(100).optional().nullable(),
    phone: z
      .string()
      .regex(phoneRegex, 'Invalid phone format')
      .max(50)
      .optional()
      .nullable(),
    website: z
      .string()
      .regex(urlRegex, 'Invalid URL format')
      .max(255)
      .optional()
      .nullable(),
  })
  .strict();

/**
 * Customer status transition schema
 *
 * Validates status changes with transition rules.
 */
export const statusTransitionSchema = z.object({
  status: customerStatusEnum,
  reason: z.string().max(500).optional(),
});

/**
 * Validate status transitions
 *
 * Ensures status changes follow the correct workflow:
 * prospect -> consultation -> approved -> provisioning -> active
 * active -> suspended (payment issue)
 * active/suspended -> churned (cancelled)
 */
export function validateStatusTransition(
  currentStatus: string,
  newStatus: string
): { valid: boolean; error?: string } {
  const validTransitions: Record<string, string[]> = {
    prospect: ['consultation', 'churned'],
    consultation: ['approved', 'churned'],
    approved: ['provisioning', 'churned'],
    provisioning: ['active', 'churned'],
    active: ['suspended', 'churned'],
    suspended: ['active', 'churned'],
    churned: [], // Terminal state
  };

  const allowed = validTransitions[currentStatus] || [];

  if (!allowed.includes(newStatus)) {
    return {
      valid: false,
      error: `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowed.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Customer tier change schema
 *
 * Validates tier upgrades/downgrades.
 */
export const tierChangeSchema = z.object({
  tier: pricingTierEnum,
  effective_date: z.string().datetime().optional(),
  reason: z.string().max(500).optional(),
});

/**
 * Add-ons modification schema
 *
 * Validates add-on additions and removals.
 */
export const addonsUpdateSchema = z.object({
  add: z.array(addonsEnum).default([]),
  remove: z.array(addonsEnum).default([]),
});

/**
 * Customer list filters schema
 *
 * Validates query parameters for listing customers.
 */
export const customerListFiltersSchema = z.object({
  status: customerStatusEnum.optional(),
  tier: pricingTierEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sort_by: z.enum(['created_at', 'updated_at', 'company_name']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(200).optional(),
});

/**
 * Type inference
 */
export type CustomerUpdateData = z.infer<typeof customerUpdateSchema>;
export type StatusTransitionData = z.infer<typeof statusTransitionSchema>;
export type TierChangeData = z.infer<typeof tierChangeSchema>;
export type AddonsUpdateData = z.infer<typeof addonsUpdateSchema>;
export type CustomerListFilters = z.infer<typeof customerListFiltersSchema>;

/**
 * Validate customer update
 */
export function validateCustomerUpdate(data: unknown): CustomerUpdateData {
  return customerUpdateSchema.parse(data);
}

/**
 * Validate status transition
 */
export function validateStatusTransitionData(data: unknown): StatusTransitionData {
  return statusTransitionSchema.parse(data);
}

/**
 * Validate tier change
 */
export function validateTierChange(data: unknown): TierChangeData {
  return tierChangeSchema.parse(data);
}

/**
 * Validate add-ons update
 */
export function validateAddonsUpdate(data: unknown): AddonsUpdateData {
  return addonsUpdateSchema.parse(data);
}

/**
 * Validate customer list filters
 */
export function validateCustomerListFilters(data: unknown): CustomerListFilters {
  return customerListFiltersSchema.parse(data);
}
