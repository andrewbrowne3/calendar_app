// API Service - Clean, type-safe

import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { API_CONFIG } from '../utils/config';
import storageService from '../utils/storage';
import type {
  User,
  Goal,
  Calendar,
  Event,
  LoginRequest,
  LoginResponse,
  FinanceAccount,
  Transaction,
  TransactionFilters,
  TransferRequest,
  FinanceCategory,
  RecurringTransaction,
  Subscription,
  Budget,
  FinancialGoal,
  FinancialDashboard,
  ProfitLossReport,
  CashFlowReport,
  CategoryBreakdown,
  TaxSummary,
  IncomeVsExpenses,
} from '../types';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        const isAuthEndpoint =
          config.url?.includes('/login') ||
          config.url?.includes('/register') ||
          config.url?.includes('/token/refresh');

        if (!isAuthEndpoint) {
          const token = storageService.getAccessToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest: any = error.config;

        const isAuthEndpoint =
          originalRequest?.url?.includes('/login') ||
          originalRequest?.url?.includes('/register') ||
          originalRequest?.url?.includes('/token/refresh');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
          originalRequest._retry = true;

          try {
            const refreshToken = storageService.getRefreshToken();
            if (refreshToken) {
              const response = await axios.post(
                `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.REFRESH}`,
                { refresh: refreshToken }
              );

              const newAccessToken = response.data.access;
              storageService.saveTokens({
                access: newAccessToken,
                refresh: refreshToken,
              });

              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            storageService.clearAll();
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async get<T>(url: string): Promise<T> {
    const response = await this.client.get<T>(url);
    return response.data;
  }

  private async post<T, U>(url: string, data?: U): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  private async patch<T, U>(url: string, data: U): Promise<T> {
    const response = await this.client.patch<T>(url, data);
    return response.data;
  }

  private async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.post<LoginResponse, LoginRequest>(
      API_CONFIG.ENDPOINTS.AUTH.LOGIN,
      credentials
    );

    storageService.saveTokens({
      access: response.access,
      refresh: response.refresh,
    });
    storageService.saveUser(response.user);

    return response;
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = storageService.getRefreshToken();
      if (refreshToken) {
        await this.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT, { refresh: refreshToken });
      }
    } catch (error) {
      // Continue even if API call fails
    } finally {
      storageService.clearAll();
    }
  }

  async getCurrentUser(): Promise<User> {
    return await this.get<User>(API_CONFIG.ENDPOINTS.AUTH.PROFILE);
  }

  // Goals
  async getGoals(): Promise<Goal[]> {
    return await this.get<Goal[]>(API_CONFIG.ENDPOINTS.GOALS);
  }

  async createGoal(goalData: Partial<Goal>): Promise<Goal> {
    return await this.post<Goal, Partial<Goal>>(API_CONFIG.ENDPOINTS.GOALS, goalData);
  }

  async updateGoal(goalId: string, updates: Partial<Goal>): Promise<Goal> {
    return await this.patch<Goal, Partial<Goal>>(
      `${API_CONFIG.ENDPOINTS.GOALS}${goalId}/`,
      updates
    );
  }

  async deleteGoal(goalId: string): Promise<void> {
    await this.delete(`${API_CONFIG.ENDPOINTS.GOALS}${goalId}/`);
  }

  async toggleGoalCompletion(goalId: string, isCompleted: boolean): Promise<Goal> {
    const status = isCompleted ? 'completed' : 'active';
    return await this.updateGoal(goalId, {
      is_completed: isCompleted,
      status,
    });
  }

  // Calendars
  async getCalendars(): Promise<Calendar[]> {
    return await this.get<Calendar[]>(API_CONFIG.ENDPOINTS.CALENDARS);
  }

  async createCalendar(calendar: Partial<Calendar>): Promise<Calendar> {
    return await this.post<Calendar, Partial<Calendar>>(
      API_CONFIG.ENDPOINTS.CALENDARS,
      calendar
    );
  }

  async updateCalendar(calendarId: string, updates: Partial<Calendar>): Promise<Calendar> {
    return await this.patch<Calendar, Partial<Calendar>>(
      `${API_CONFIG.ENDPOINTS.CALENDARS}${calendarId}/`,
      updates
    );
  }

  async deleteCalendar(calendarId: string): Promise<void> {
    await this.delete(`${API_CONFIG.ENDPOINTS.CALENDARS}${calendarId}/`);
  }

  // Events
  async getEvents(startDate?: string, endDate?: string, calendarId?: string): Promise<Event[]> {
    let url = API_CONFIG.ENDPOINTS.EVENTS;
    const params = new URLSearchParams();

    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (calendarId) params.append('calendar_id', calendarId);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return await this.get<Event[]>(url);
  }

  async createEvent(event: {
    title: string;
    description?: string;
    calendar: string;
    start_time: string;
    end_time: string;
    all_day?: boolean;
    location?: string;
  }): Promise<Event> {
    return await this.post<Event, typeof event>(API_CONFIG.ENDPOINTS.EVENTS, event);
  }

  async updateEvent(eventId: string, updates: Partial<Event>): Promise<Event> {
    return await this.patch<Event, Partial<Event>>(
      `${API_CONFIG.ENDPOINTS.EVENTS}${eventId}/`,
      updates
    );
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.delete(`${API_CONFIG.ENDPOINTS.EVENTS}${eventId}/`);
  }

  // ==================== Finance ====================

  // Accounts
  async getFinanceAccounts(): Promise<FinanceAccount[]> {
    return await this.get<FinanceAccount[]>(API_CONFIG.ENDPOINTS.FINANCE.ACCOUNTS);
  }

  async createFinanceAccount(data: Partial<FinanceAccount>): Promise<FinanceAccount> {
    return await this.post<FinanceAccount, Partial<FinanceAccount>>(
      API_CONFIG.ENDPOINTS.FINANCE.ACCOUNTS, data
    );
  }

  async updateFinanceAccount(id: string, data: Partial<FinanceAccount>): Promise<FinanceAccount> {
    return await this.patch<FinanceAccount, Partial<FinanceAccount>>(
      `${API_CONFIG.ENDPOINTS.FINANCE.ACCOUNTS}${id}/`, data
    );
  }

  async deleteFinanceAccount(id: string): Promise<void> {
    await this.delete(`${API_CONFIG.ENDPOINTS.FINANCE.ACCOUNTS}${id}/`);
  }

  // Transactions
  async getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
    let url = API_CONFIG.ENDPOINTS.FINANCE.TRANSACTIONS;
    if (filters) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }
    return await this.get<Transaction[]>(url);
  }

  async createTransaction(data: Partial<Transaction>): Promise<Transaction> {
    return await this.post<Transaction, Partial<Transaction>>(
      API_CONFIG.ENDPOINTS.FINANCE.TRANSACTIONS, data
    );
  }

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction> {
    return await this.patch<Transaction, Partial<Transaction>>(
      `${API_CONFIG.ENDPOINTS.FINANCE.TRANSACTIONS}${id}/`, data
    );
  }

  async deleteTransaction(id: string): Promise<void> {
    await this.delete(`${API_CONFIG.ENDPOINTS.FINANCE.TRANSACTIONS}${id}/`);
  }

  // Transfers
  async createTransfer(data: TransferRequest): Promise<Transaction> {
    return await this.post<Transaction, TransferRequest>(
      API_CONFIG.ENDPOINTS.FINANCE.TRANSFERS, data
    );
  }

  // Categories
  async getFinanceCategories(): Promise<FinanceCategory[]> {
    return await this.get<FinanceCategory[]>(API_CONFIG.ENDPOINTS.FINANCE.CATEGORIES);
  }

  async createFinanceCategory(data: Partial<FinanceCategory>): Promise<FinanceCategory> {
    return await this.post<FinanceCategory, Partial<FinanceCategory>>(
      API_CONFIG.ENDPOINTS.FINANCE.CATEGORIES, data
    );
  }

  // Recurring Transactions
  async getRecurringTransactions(): Promise<RecurringTransaction[]> {
    return await this.get<RecurringTransaction[]>(API_CONFIG.ENDPOINTS.FINANCE.RECURRING);
  }

  async createRecurringTransaction(data: Partial<RecurringTransaction>): Promise<RecurringTransaction> {
    return await this.post<RecurringTransaction, Partial<RecurringTransaction>>(
      API_CONFIG.ENDPOINTS.FINANCE.RECURRING, data
    );
  }

  async updateRecurringTransaction(id: string, data: Partial<RecurringTransaction>): Promise<RecurringTransaction> {
    return await this.patch<RecurringTransaction, Partial<RecurringTransaction>>(
      `${API_CONFIG.ENDPOINTS.FINANCE.RECURRING}${id}/`, data
    );
  }

  async deleteRecurringTransaction(id: string): Promise<void> {
    await this.delete(`${API_CONFIG.ENDPOINTS.FINANCE.RECURRING}${id}/`);
  }

  async generateRecurringTransaction(id: string): Promise<Transaction> {
    return await this.post<Transaction, undefined>(
      `${API_CONFIG.ENDPOINTS.FINANCE.RECURRING}${id}/generate/`
    );
  }

  // Subscriptions
  async getSubscriptions(filters?: { status?: string; billing_cycle?: string; category_id?: string }): Promise<Subscription[]> {
    let url = API_CONFIG.ENDPOINTS.FINANCE.SUBSCRIPTIONS;
    if (filters) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }
    return await this.get<Subscription[]>(url);
  }

  async createSubscription(data: Partial<Subscription>): Promise<Subscription> {
    return await this.post<Subscription, Partial<Subscription>>(
      API_CONFIG.ENDPOINTS.FINANCE.SUBSCRIPTIONS, data
    );
  }

  async updateSubscription(id: string, data: Partial<Subscription>): Promise<Subscription> {
    return await this.patch<Subscription, Partial<Subscription>>(
      `${API_CONFIG.ENDPOINTS.FINANCE.SUBSCRIPTIONS}${id}/`, data
    );
  }

  async deleteSubscription(id: string): Promise<void> {
    await this.delete(`${API_CONFIG.ENDPOINTS.FINANCE.SUBSCRIPTIONS}${id}/`);
  }

  // Budgets
  async getBudgets(): Promise<Budget[]> {
    return await this.get<Budget[]>(API_CONFIG.ENDPOINTS.FINANCE.BUDGETS);
  }

  async createBudget(data: Partial<Budget>): Promise<Budget> {
    return await this.post<Budget, Partial<Budget>>(
      API_CONFIG.ENDPOINTS.FINANCE.BUDGETS, data
    );
  }

  async updateBudget(id: string, data: Partial<Budget>): Promise<Budget> {
    return await this.patch<Budget, Partial<Budget>>(
      `${API_CONFIG.ENDPOINTS.FINANCE.BUDGETS}${id}/`, data
    );
  }

  async deleteBudget(id: string): Promise<void> {
    await this.delete(`${API_CONFIG.ENDPOINTS.FINANCE.BUDGETS}${id}/`);
  }

  // Financial Goals
  async getFinancialGoals(): Promise<FinancialGoal[]> {
    return await this.get<FinancialGoal[]>(API_CONFIG.ENDPOINTS.FINANCE.GOALS);
  }

  async createFinancialGoal(data: Partial<FinancialGoal>): Promise<FinancialGoal> {
    return await this.post<FinancialGoal, Partial<FinancialGoal>>(
      API_CONFIG.ENDPOINTS.FINANCE.GOALS, data
    );
  }

  // Dashboard
  async getFinancialDashboard(): Promise<FinancialDashboard> {
    return await this.get<FinancialDashboard>(API_CONFIG.ENDPOINTS.FINANCE.DASHBOARD);
  }

  // Reports
  async getProfitLoss(params?: { account_id?: string; start_date?: string; end_date?: string }): Promise<ProfitLossReport> {
    let url = API_CONFIG.ENDPOINTS.FINANCE.REPORTS.PROFIT_LOSS;
    if (params) {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v) qs.append(k, v); });
      const s = qs.toString();
      if (s) url += `?${s}`;
    }
    return await this.get<ProfitLossReport>(url);
  }

  async getCashFlow(params?: { account_id?: string; period?: string; start_date?: string; end_date?: string }): Promise<CashFlowReport> {
    let url = API_CONFIG.ENDPOINTS.FINANCE.REPORTS.CASH_FLOW;
    if (params) {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v) qs.append(k, v); });
      const s = qs.toString();
      if (s) url += `?${s}`;
    }
    return await this.get<CashFlowReport>(url);
  }

  async getCategoryBreakdown(params?: { account_id?: string; start_date?: string; end_date?: string }): Promise<CategoryBreakdown> {
    let url = API_CONFIG.ENDPOINTS.FINANCE.REPORTS.CATEGORY_BREAKDOWN;
    if (params) {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v) qs.append(k, v); });
      const s = qs.toString();
      if (s) url += `?${s}`;
    }
    return await this.get<CategoryBreakdown>(url);
  }

  async getTaxSummary(params?: { year?: string; account_id?: string }): Promise<TaxSummary> {
    let url = API_CONFIG.ENDPOINTS.FINANCE.REPORTS.TAX_SUMMARY;
    if (params) {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v) qs.append(k, v); });
      const s = qs.toString();
      if (s) url += `?${s}`;
    }
    return await this.get<TaxSummary>(url);
  }

  async getIncomeVsExpenses(params?: { period?: string; months?: number; account_id?: string }): Promise<IncomeVsExpenses> {
    let url = API_CONFIG.ENDPOINTS.FINANCE.REPORTS.INCOME_VS_EXPENSES;
    if (params) {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v) qs.append(k, String(v)); });
      const s = qs.toString();
      if (s) url += `?${s}`;
    }
    return await this.get<IncomeVsExpenses>(url);
  }
}

export const apiService = new ApiService();
export default apiService;
