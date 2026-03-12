import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type {
  FinanceAccount, Transaction, TransactionFilters, TransferRequest,
  FinanceCategory, RecurringTransaction, Subscription, Budget,
  FinancialDashboard,
} from '../../types';
import apiService from '../../api/apiService';

interface FinanceState {
  accounts: FinanceAccount[];
  transactions: Transaction[];
  categories: FinanceCategory[];
  budgets: Budget[];
  recurringTransactions: RecurringTransaction[];
  subscriptions: Subscription[];
  dashboard: FinancialDashboard | null;
  selectedAccountId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: FinanceState = {
  accounts: [],
  transactions: [],
  categories: [],
  budgets: [],
  recurringTransactions: [],
  subscriptions: [],
  dashboard: null,
  selectedAccountId: null,
  isLoading: false,
  error: null,
};

// Accounts
export const fetchAccounts = createAsyncThunk(
  'finance/fetchAccounts',
  async (_, { rejectWithValue }) => {
    try {
      return await apiService.getFinanceAccounts();
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch accounts');
    }
  }
);

export const createAccount = createAsyncThunk(
  'finance/createAccount',
  async (data: Partial<FinanceAccount>, { rejectWithValue }) => {
    try {
      return await apiService.createFinanceAccount(data);
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create account');
    }
  }
);

export const updateAccount = createAsyncThunk(
  'finance/updateAccount',
  async ({ id, data }: { id: string; data: Partial<FinanceAccount> }, { rejectWithValue }) => {
    try {
      return await apiService.updateFinanceAccount(id, data);
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update account');
    }
  }
);

export const deleteAccount = createAsyncThunk(
  'finance/deleteAccount',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiService.deleteFinanceAccount(id);
      return id;
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete account');
    }
  }
);

// Transactions
export const fetchTransactions = createAsyncThunk(
  'finance/fetchTransactions',
  async (filters: TransactionFilters | undefined, { rejectWithValue }) => {
    try {
      return await apiService.getTransactions(filters);
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch transactions');
    }
  }
);

export const createTransaction = createAsyncThunk(
  'finance/createTransaction',
  async (data: Partial<Transaction>, { rejectWithValue }) => {
    try {
      return await apiService.createTransaction(data);
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create transaction');
    }
  }
);

export const updateTransaction = createAsyncThunk(
  'finance/updateTransaction',
  async ({ id, data }: { id: string; data: Partial<Transaction> }, { rejectWithValue }) => {
    try {
      return await apiService.updateTransaction(id, data);
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update transaction');
    }
  }
);

export const deleteTransaction = createAsyncThunk(
  'finance/deleteTransaction',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiService.deleteTransaction(id);
      return id;
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete transaction');
    }
  }
);

export const createTransfer = createAsyncThunk(
  'finance/createTransfer',
  async (data: TransferRequest, { rejectWithValue }) => {
    try {
      return await apiService.createTransfer(data);
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create transfer');
    }
  }
);

// Categories
export const fetchCategories = createAsyncThunk(
  'finance/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      return await apiService.getFinanceCategories();
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch categories');
    }
  }
);

// Recurring
export const fetchRecurringTransactions = createAsyncThunk(
  'finance/fetchRecurring',
  async (_, { rejectWithValue }) => {
    try {
      return await apiService.getRecurringTransactions();
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch recurring transactions');
    }
  }
);

export const createRecurring = createAsyncThunk(
  'finance/createRecurring',
  async (data: Partial<RecurringTransaction>, { rejectWithValue }) => {
    try {
      return await apiService.createRecurringTransaction(data);
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create recurring transaction');
    }
  }
);

export const deleteRecurring = createAsyncThunk(
  'finance/deleteRecurring',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiService.deleteRecurringTransaction(id);
      return id;
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete recurring transaction');
    }
  }
);

// Budgets
export const fetchBudgets = createAsyncThunk(
  'finance/fetchBudgets',
  async (_, { rejectWithValue }) => {
    try {
      return await apiService.getBudgets();
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch budgets');
    }
  }
);

export const createBudget = createAsyncThunk(
  'finance/createBudget',
  async (data: Partial<Budget>, { rejectWithValue }) => {
    try {
      return await apiService.createBudget(data);
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create budget');
    }
  }
);

export const deleteBudget = createAsyncThunk(
  'finance/deleteBudget',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiService.deleteBudget(id);
      return id;
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete budget');
    }
  }
);

// Subscriptions
export const fetchSubscriptions = createAsyncThunk(
  'finance/fetchSubscriptions',
  async (filters: { status?: string; billing_cycle?: string; category_id?: string } | undefined, { rejectWithValue }) => {
    try {
      return await apiService.getSubscriptions(filters);
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch subscriptions');
    }
  }
);

export const createSubscription = createAsyncThunk(
  'finance/createSubscription',
  async (data: Partial<Subscription>, { rejectWithValue }) => {
    try {
      return await apiService.createSubscription(data);
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create subscription');
    }
  }
);

export const updateSubscription = createAsyncThunk(
  'finance/updateSubscription',
  async ({ id, data }: { id: string; data: Partial<Subscription> }, { rejectWithValue }) => {
    try {
      return await apiService.updateSubscription(id, data);
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update subscription');
    }
  }
);

export const deleteSubscription = createAsyncThunk(
  'finance/deleteSubscription',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiService.deleteSubscription(id);
      return id;
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete subscription');
    }
  }
);

// Dashboard
export const fetchDashboard = createAsyncThunk(
  'finance/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      return await apiService.getFinancialDashboard();
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch dashboard');
    }
  }
);

const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedAccount: (state, action: PayloadAction<string | null>) => {
      state.selectedAccountId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Accounts
      .addCase(fetchAccounts.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchAccounts.fulfilled, (state, action) => { state.isLoading = false; state.accounts = action.payload; })
      .addCase(fetchAccounts.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })
      .addCase(createAccount.fulfilled, (state, action) => { state.accounts.push(action.payload); })
      .addCase(createAccount.rejected, (state, action) => { state.error = action.payload as string; })
      .addCase(updateAccount.fulfilled, (state, action) => {
        const idx = state.accounts.findIndex(a => a.id === action.payload.id);
        if (idx !== -1) state.accounts[idx] = action.payload;
      })
      .addCase(deleteAccount.fulfilled, (state, action) => {
        state.accounts = state.accounts.filter(a => a.id !== action.payload);
      })
      // Transactions
      .addCase(fetchTransactions.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchTransactions.fulfilled, (state, action) => { state.isLoading = false; state.transactions = action.payload; })
      .addCase(fetchTransactions.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })
      .addCase(createTransaction.fulfilled, (state, action) => { state.transactions.unshift(action.payload); })
      .addCase(createTransaction.rejected, (state, action) => { state.error = action.payload as string; })
      .addCase(updateTransaction.fulfilled, (state, action) => {
        const idx = state.transactions.findIndex(t => t.id === action.payload.id);
        if (idx !== -1) state.transactions[idx] = action.payload;
      })
      .addCase(deleteTransaction.fulfilled, (state, action) => {
        state.transactions = state.transactions.filter(t => t.id !== action.payload);
      })
      .addCase(createTransfer.fulfilled, (state, action) => { state.transactions.unshift(action.payload); })
      .addCase(createTransfer.rejected, (state, action) => { state.error = action.payload as string; })
      // Categories
      .addCase(fetchCategories.fulfilled, (state, action) => { state.categories = action.payload; })
      // Recurring
      .addCase(fetchRecurringTransactions.fulfilled, (state, action) => { state.recurringTransactions = action.payload; })
      .addCase(createRecurring.fulfilled, (state, action) => { state.recurringTransactions.push(action.payload); })
      .addCase(deleteRecurring.fulfilled, (state, action) => {
        state.recurringTransactions = state.recurringTransactions.filter(r => r.id !== action.payload);
      })
      // Subscriptions
      .addCase(fetchSubscriptions.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchSubscriptions.fulfilled, (state, action) => { state.isLoading = false; state.subscriptions = action.payload; })
      .addCase(fetchSubscriptions.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })
      .addCase(createSubscription.fulfilled, (state, action) => { state.subscriptions.push(action.payload); })
      .addCase(createSubscription.rejected, (state, action) => { state.error = action.payload as string; })
      .addCase(updateSubscription.fulfilled, (state, action) => {
        const idx = state.subscriptions.findIndex(s => s.id === action.payload.id);
        if (idx !== -1) state.subscriptions[idx] = action.payload;
      })
      .addCase(deleteSubscription.fulfilled, (state, action) => {
        state.subscriptions = state.subscriptions.filter(s => s.id !== action.payload);
      })
      // Budgets
      .addCase(fetchBudgets.fulfilled, (state, action) => { state.budgets = action.payload; })
      .addCase(createBudget.fulfilled, (state, action) => { state.budgets.push(action.payload); })
      .addCase(deleteBudget.fulfilled, (state, action) => {
        state.budgets = state.budgets.filter(b => b.id !== action.payload);
      })
      // Dashboard
      .addCase(fetchDashboard.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchDashboard.fulfilled, (state, action) => { state.isLoading = false; state.dashboard = action.payload; })
      .addCase(fetchDashboard.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });
  },
});

export const { clearError, setSelectedAccount } = financeSlice.actions;
export default financeSlice.reducer;
