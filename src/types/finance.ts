// Finance Manager Types

export type FinancialGranularity = 'day' | 'week' | 'month';
export type ForecastSource = 'derived_from_plan' | 'manual_adjustment';
export type ActualSource = 'manual' | 'import' | 'api';
export type DocumentType = 'invoice' | 'boleto' | 'receipt' | 'credit_note' | 'other';
export type DocumentStatus = 'received' | 'verified' | 'approved' | 'scheduled' | 'paid' | 'cancelled';
export type PaymentStatus = 'scheduled' | 'paid' | 'partial' | 'cancelled' | 'overdue';
export type PaymentMethod = 'pix' | 'boleto' | 'transfer' | 'card' | 'other';
export type AlertType = 'overspend' | 'underspend' | 'overdue' | 'variance';
export type AuditAction = 'create' | 'update' | 'delete' | 'approve' | 'lock' | 'unlock';
export type AuditEntityType = 'forecast' | 'actual' | 'document' | 'payment' | 'vendor' | 'revenue';
export type RevenueSource = 'crm' | 'manual' | 'import';

export interface FinancialDimensions {
  subdivision_id?: string;
  moment_id?: string;
  funnel_stage_id?: string;
  medium_id?: string;
  vehicle_id?: string;
  channel_id?: string;
}

export interface FinancialVendor {
  id: string;
  user_id: string;
  name: string;
  document?: string | null;
  category?: string | null;
  payment_terms?: string | null;
  is_active: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialForecast {
  id: string;
  user_id: string;
  media_plan_id: string;
  version: number;
  granularity: FinancialGranularity;
  period_start: string;
  period_end: string;
  planned_amount: number;
  dimensions_json: FinancialDimensions;
  source: ForecastSource;
  is_locked: boolean;
  reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialActual {
  id: string;
  user_id: string;
  media_plan_id: string;
  period_start: string;
  period_end: string;
  actual_amount: number;
  dimensions_json: FinancialDimensions;
  source: ActualSource;
  import_batch_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialDocument {
  id: string;
  user_id: string;
  media_plan_id: string;
  vendor_id?: string | null;
  vendor_name?: string | null;
  document_type: DocumentType;
  document_number?: string | null;
  issue_date: string;
  due_date: string;
  amount: number;
  currency: string;
  status: DocumentStatus;
  related_dimensions_json: FinancialDimensions;
  attachment_urls: string[];
  notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialPayment {
  id: string;
  user_id: string;
  financial_document_id: string;
  installment_number: number;
  planned_payment_date: string;
  actual_payment_date?: string | null;
  planned_amount: number;
  paid_amount?: number | null;
  status: PaymentStatus;
  payment_method?: PaymentMethod | null;
  proof_url?: string | null;
  notes?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialRevenue {
  id: string;
  user_id: string;
  media_plan_id?: string | null;
  product_name?: string | null;
  period_start: string;
  period_end: string;
  revenue_amount: number;
  source: RevenueSource;
  created_at: string;
  updated_at: string;
}

export interface FinancialAuditLog {
  id: string;
  user_id: string;
  entity_type: AuditEntityType;
  entity_id: string;
  action: AuditAction;
  before_json?: Record<string, unknown> | null;
  after_json?: Record<string, unknown> | null;
  reason?: string | null;
  created_at: string;
}

export interface FinancialAlertConfig {
  id: string;
  user_id: string;
  alert_type: AlertType;
  threshold_percentage: number;
  threshold_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Dashboard aggregated data
export interface FinanceDashboardData {
  plannedThisMonth: number;
  actualThisMonth: number;
  variance: number;
  variancePercentage: number;
  payableNext30Days: number;
  paidLast30Days: number;
  overduePayments: number;
  pacingData: PacingDataPoint[];
  alerts: FinanceAlert[];
}

export interface PacingDataPoint {
  period: string;
  planned: number;
  actual: number;
}

export interface FinanceAlert {
  id: string;
  type: AlertType;
  level: 'info' | 'warning' | 'error';
  message: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
}
