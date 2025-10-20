/**
 * Resend Email Integration Types
 * Type definitions for email operations
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailOptions {
  to: string | string[];
  from?: string;
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  reply_to?: string | string[];
  tags?: EmailTag[];
  attachments?: EmailAttachment[];
}

export interface EmailTag {
  name: string;
  value: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  content_type?: string;
}

export interface EmailResult {
  id: string;
  success: boolean;
  error?: string;
}

export interface CustomerEmailData {
  email: string;
  name: string;
  company?: string;
  tier?: string;
  planName?: string;
}

export interface PricingEmailData {
  tier: string;
  monthlyPrice: number;
  setupFee: number;
  totalFirstMonth: number;
  features: string[];
}

export interface CredentialsEmailData {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslRequired: boolean;
  connectionString: string;
}

export interface AdminNotificationData {
  type: 'new_customer' | 'payment_received' | 'provisioning_complete' | 'error';
  customerEmail: string;
  customerName: string;
  details: Record<string, any>;
  timestamp: Date;
}

export enum EmailTemplateType {
  INTAKE_CONFIRMATION = 'intake_confirmation',
  PAYMENT_REQUEST = 'payment_request',
  PROVISIONING_STARTED = 'provisioning_started',
  CREDENTIALS_DELIVERED = 'credentials_delivered',
  WELCOME = 'welcome',
  ADMIN_NOTIFICATION = 'admin_notification',
}
