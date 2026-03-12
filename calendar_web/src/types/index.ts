// TypeScript interfaces

export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  timezone: string;
  date_format: string;
  time_format: number;
  profile_picture?: string;
  created_at: string;
  updated_at: string;
}

export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled';
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';
export type GoalFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  frequency: GoalFrequency;
  priority: GoalPriority;
  status: GoalStatus;
  target_value?: number;
  current_value: number;
  unit?: string;
  start_date: string;
  end_date?: string;
  color: string;
  is_active: boolean;
  is_completed: boolean;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface Calendar {
  id: string;
  name: string;
  description?: string;
  color: string;
  visibility: 'private' | 'public' | 'shared';
  timezone: string;
  is_active: boolean;
  event_count?: number;
  created_at: string;
  updated_at: string;
  owner?: User;
}

export interface Event {
  id: string;
  calendar: Calendar;
  creator: User;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  status: 'confirmed' | 'tentative' | 'cancelled';
  color?: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  completed?: boolean;
  reminder_minutes?: number[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

// Chatbot types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ModelInfo {
  name: string;
  provider: string;
  display_name: string;
  size?: number;
  modified_at?: string;
}

export interface ModelsResponse {
  providers: string[];
  default_provider: string;
  default_model: {
    anthropic: string;
    ollama: string;
  };
  models: {
    anthropic: ModelInfo[];
    ollama: ModelInfo[];
  };
}

export interface StreamEvent {
  type: 'start' | 'think' | 'act' | 'observe' | 'complete' | 'error';
  content?: string;
  iteration?: number;
  conversation_id?: string;
  response?: string;
  message?: string;
  iterations?: number;
  provider?: string;
  model?: string;
}

// ==================== Finance Types ====================

export type AccountType = 'business' | 'personal' | 'joint';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'pending' | 'cleared' | 'reconciled' | 'void';
export type BudgetPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type FinancialGoalType = 'savings' | 'debt_payoff' | 'revenue' | 'expense_reduction';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'trial';
export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface AccountMember {
  id: number;
  user: User;
  role: 'owner' | 'member' | 'viewer';
  created_at: string;
}

export interface FinanceAccount {
  id: string;
  owner: User;
  name: string;
  account_type: AccountType;
  description?: string;
  currency: string;
  initial_balance: number;
  current_balance: number;
  color: string;
  icon?: string;
  is_active: boolean;
  members?: AccountMember[];
  monthly_income?: number;
  monthly_expenses?: number;
  created_at: string;
  updated_at: string;
}

export interface FinanceCategory {
  id: string;
  name: string;
  category_type: 'income' | 'expense' | 'both';
  parent?: string;
  color: string;
  icon?: string;
  is_tax_deductible: boolean;
  tax_category?: string;
  is_active: boolean;
  subcategories?: FinanceCategory[];
  created_at: string;
}

export interface Transaction {
  id: string;
  account: string;
  account_detail?: FinanceAccount;
  created_by: number;
  created_by_detail?: User;
  transaction_type: TransactionType;
  category?: string;
  category_detail?: FinanceCategory;
  amount: number;
  description: string;
  notes?: string;
  date: string;
  status: TransactionStatus;
  transfer_to_account?: string;
  transfer_to_account_detail?: FinanceAccount;
  transfer_transaction?: string;
  is_tax_deductible: boolean;
  tax_category?: string;
  tags: string[];
  attachment_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransferRequest {
  from_account: string;
  to_account: string;
  amount: number;
  description: string;
  notes?: string;
  date: string;
  tags?: string[];
}

export interface RecurringTransaction {
  id: string;
  account: string;
  account_detail?: FinanceAccount;
  transaction_type: TransactionType;
  category?: string;
  category_detail?: FinanceCategory;
  amount: number;
  description: string;
  notes?: string;
  frequency: RecurringFrequency;
  start_date: string;
  end_date?: string;
  next_due_date: string;
  day_of_month?: number;
  transfer_to_account?: string;
  is_tax_deductible: boolean;
  tax_category?: string;
  auto_create_calendar_event: boolean;
  reminder_days_before: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  account?: string;
  account_detail?: FinanceAccount;
  category: string;
  category_detail?: FinanceCategory;
  amount: number;
  period: BudgetPeriod;
  start_date: string;
  end_date?: string;
  color: string;
  is_active: boolean;
  spent: number;
  remaining: number;
  percentage: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user: number;
  name: string;
  description?: string;
  website_url?: string;
  cost: number;
  billing_cycle: BillingCycle;
  next_billing_date: string;
  status: SubscriptionStatus;
  category?: string;
  category_detail?: FinanceCategory;
  account?: string;
  account_detail?: FinanceAccount;
  color: string;
  notify_before_renewal: number;
  auto_create_transaction: boolean;
  notes?: string;
  started_date?: string;
  cancelled_date?: string;
  is_active: boolean;
  monthly_cost: number;
  created_at: string;
  updated_at: string;
}

export interface FinancialGoal {
  id: string;
  goal: string;
  goal_type: FinancialGoalType;
  account?: string;
  account_detail?: FinanceAccount;
  target_amount: number;
  current_amount: number;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface FinancialDashboard {
  total_balance: number;
  monthly_income: number;
  monthly_expenses: number;
  monthly_savings: number;
  accounts: FinanceAccount[];
  recent_transactions: Transaction[];
  budget_alerts: Budget[];
  upcoming_recurring: RecurringTransaction[];
  total_monthly_subscriptions: number;
  upcoming_renewals: Subscription[];
}

export interface TransactionFilters {
  account_id?: string;
  category_id?: string;
  transaction_type?: TransactionType;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
  search?: string;
  is_tax_deductible?: boolean;
  status?: TransactionStatus;
}

export interface ProfitLossReport {
  total_income: number;
  total_expenses: number;
  net_profit: number;
  income_by_category: Array<{
    category__id: string;
    category__name: string;
    category__color: string;
    total: number;
  }>;
  expense_by_category: Array<{
    category__id: string;
    category__name: string;
    category__color: string;
    total: number;
  }>;
  start_date?: string;
  end_date?: string;
}

export interface CashFlowReport {
  cash_flow: Array<{
    period: string;
    income: number;
    expenses: number;
    net: number;
  }>;
  period_type: string;
  start_date: string;
  end_date: string;
}

export interface CategoryBreakdown {
  breakdown: Array<{
    category__id: string;
    category__name: string;
    category__color: string;
    total: number;
    percentage: number;
  }>;
  total_expenses: number;
  start_date?: string;
  end_date?: string;
}

export interface TaxSummary {
  year: string;
  total_deductible: number;
  by_tax_category: Array<{
    tax_category: string;
    total: number;
  }>;
}

export interface IncomeVsExpenses {
  data: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
  period: string;
  months: number;
}
