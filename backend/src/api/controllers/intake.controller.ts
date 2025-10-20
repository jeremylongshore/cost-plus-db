/**
 * Intake Controller
 *
 * Handles customer intake form submissions.
 * Validates form data, creates customer records, and initiates onboarding workflow.
 *
 * @module api/controllers/intake
 */

import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../../services/customer.service.js';
import { CustomersRepository } from '../../database/repositories/customers.repository.js';
import { validateIntakeForm } from '../../validators/intake-form.validator.js';
import { logger } from '../../utils/logger.js';
import { getLocalDb } from '../../database/index.js';

/**
 * Handle customer intake form submission
 *
 * POST /api/intake
 *
 * Workflow:
 * 1. Validate intake form data
 * 2. Check for duplicate email
 * 3. Create customer record with 'prospect' status
 * 4. Send confirmation email to customer
 * 5. Send notification to admin
 * 6. Return customer_id and next steps
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export async function handleIntakeSubmission(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    logger.info('Intake form submission received', {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Validate form data
    const formData = validateIntakeForm(req.body);

    logger.info('Intake form validated', {
      company: formData.company_name,
      email: formData.primary_contact_email,
    });

    // Initialize services
    const customersRepo = new CustomersRepository(getLocalDb());
    const customerService = new CustomerService(customersRepo);

    // Map intake form to customer creation input
    const customerInput = {
      company_name: formData.company_name,
      email: formData.primary_contact_email,
      tier: formData.tier_interest || 'shared',
      status: 'prospect' as const,
      contact_name: formData.primary_contact_name,
      phone: formData.primary_contact_phone || null,
      website: formData.website || null,
    };

    // Process intake form (creates customer and sends emails)
    // Filter out undefined values to satisfy exactOptionalPropertyTypes
    const intakeData: any = {
      ...customerInput,
    };
    if (formData.use_case) intakeData.business_description = formData.use_case;
    if (formData.peak_traffic) intakeData.expected_traffic = formData.peak_traffic;
    if (formData.compliance) intakeData.compliance_requirements = formData.compliance.join(', ');

    const onboarding = await customerService.processIntakeForm(intakeData);

    logger.info('Intake form processed successfully', {
      customerId: onboarding.customer_id,
      status: onboarding.status,
    });

    // Return 201 Created with onboarding details
    res.status(201).json({
      success: true,
      data: {
        customer_id: onboarding.customer_id,
        status: onboarding.status,
        next_step: onboarding.next_step,
        message: onboarding.message,
      },
      message: 'Intake form submitted successfully',
    });
  } catch (error) {
    // Pass to error handling middleware
    next(error);
  }
}

/**
 * Get intake form schema
 *
 * GET /api/intake/schema
 *
 * Returns the JSON schema for the intake form for client-side validation.
 *
 * @param _req - Express request (unused)
 * @param res - Express response
 */
export async function getIntakeFormSchema(
  _req: Request,
  res: Response
): Promise<void> {
  // Return a simplified schema for client-side validation
  res.json({
    success: true,
    data: {
      required_fields: [
        'company_name',
        'primary_contact_name',
        'primary_contact_email',
      ],
      optional_fields: [
        'industry',
        'company_size',
        'website',
        'address',
        'tax_id',
        'primary_contact_title',
        'primary_contact_phone',
        'preferred_contact_method',
        'timezone',
        'tech_contact_name',
        'tech_contact_role',
        'tech_contact_email',
        'tech_contact_phone',
        'current_provider',
        'postgres_version',
        'database_size',
        'num_databases',
        'avg_connections',
        'peak_traffic',
        'performance_requirements',
        'migration_timeline',
        'downtime_window',
        'zero_downtime',
        'data_sensitivity',
        'tier_interest',
        'addons',
        'infrastructure_preference',
        'region_preference',
        'compliance',
        'backup_retention',
        'data_residency',
        'security_certifications',
        'referral_source',
        'current_monthly_spend',
        'budget',
        'contract_length',
        'anticipated_growth',
        'use_case',
        'specific_requirements',
        'special_considerations',
      ],
      enums: {
        tier_interest: ['shared', 'dedicated', 'pro', 'enterprise', 'custom'],
        addons: ['high-availability', 'read-replicas', 'vpn', 'compliance', 'slack'],
        company_size: ['1-10', '11-50', '51-200', '201-500', '501+'],
        preferred_contact_method: ['email', 'phone', 'slack', 'teams'],
        migration_timeline: ['asap', '1-2-weeks', '1-month', '1-3-months', 'exploring'],
        zero_downtime: ['yes', 'no', 'discuss'],
        data_sensitivity: ['public', 'internal', 'confidential', 'regulated'],
        compliance: ['hipaa', 'soc2', 'gdpr', 'pci', 'none'],
        backup_retention: ['30', '60', '90', '180', '365', 'custom'],
        contract_length: ['monthly', 'annual', 'discuss'],
        referral_source: ['search', 'social', 'referral', 'blog', 'reddit', 'other'],
      },
    },
  });
}
