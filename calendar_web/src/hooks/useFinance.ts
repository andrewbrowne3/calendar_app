import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from './useAppDispatch';
import {
  fetchAccounts, createAccount, updateAccount, deleteAccount as deleteAccountAction,
  fetchTransactions, createTransaction, updateTransaction, deleteTransaction as deleteTransactionAction,
  createTransfer,
  fetchCategories,
  fetchRecurringTransactions, createRecurring, deleteRecurring as deleteRecurringAction,
  fetchSubscriptions, createSubscription, updateSubscription, deleteSubscription as deleteSubscriptionAction,
  fetchBudgets, createBudget, deleteBudget as deleteBudgetAction,
  fetchDashboard,
  setSelectedAccount, clearError,
} from '../store/slices/financeSlice';
import type {
  FinanceAccount, Transaction, TransactionFilters, TransferRequest,
  RecurringTransaction, Subscription, Budget,
} from '../types';

export const useFinance = () => {
  const dispatch = useAppDispatch();
  const {
    accounts, transactions, categories, budgets, recurringTransactions,
    subscriptions, dashboard, selectedAccountId, isLoading, error,
  } = useAppSelector((state) => state.finance);

  // Derived data
  const businessAccounts = useMemo(() => accounts.filter(a => a.account_type === 'business'), [accounts]);
  const personalAccounts = useMemo(() => accounts.filter(a => a.account_type === 'personal'), [accounts]);
  const jointAccounts = useMemo(() => accounts.filter(a => a.account_type === 'joint'), [accounts]);
  const selectedAccount = useMemo(() => accounts.find(a => a.id === selectedAccountId), [accounts, selectedAccountId]);

  // Account actions
  const loadAccounts = useCallback(async () => {
    return dispatch(fetchAccounts()).unwrap();
  }, [dispatch]);

  const addAccount = useCallback(async (data: Partial<FinanceAccount>) => {
    return dispatch(createAccount(data)).unwrap();
  }, [dispatch]);

  const editAccount = useCallback(async (id: string, data: Partial<FinanceAccount>) => {
    return dispatch(updateAccount({ id, data })).unwrap();
  }, [dispatch]);

  const deleteAccount = useCallback(async (id: string) => {
    return dispatch(deleteAccountAction(id)).unwrap();
  }, [dispatch]);

  // Transaction actions
  const loadTransactions = useCallback(async (filters?: TransactionFilters) => {
    return dispatch(fetchTransactions(filters)).unwrap();
  }, [dispatch]);

  const addTransaction = useCallback(async (data: Partial<Transaction>) => {
    return dispatch(createTransaction(data)).unwrap();
  }, [dispatch]);

  const editTransaction = useCallback(async (id: string, data: Partial<Transaction>) => {
    return dispatch(updateTransaction({ id, data })).unwrap();
  }, [dispatch]);

  const deleteTransaction = useCallback(async (id: string) => {
    return dispatch(deleteTransactionAction(id)).unwrap();
  }, [dispatch]);

  const addTransfer = useCallback(async (data: TransferRequest) => {
    return dispatch(createTransfer(data)).unwrap();
  }, [dispatch]);

  // Category actions
  const loadCategories = useCallback(async () => {
    return dispatch(fetchCategories()).unwrap();
  }, [dispatch]);

  // Recurring actions
  const loadRecurring = useCallback(async () => {
    return dispatch(fetchRecurringTransactions()).unwrap();
  }, [dispatch]);

  const addRecurring = useCallback(async (data: Partial<RecurringTransaction>) => {
    return dispatch(createRecurring(data)).unwrap();
  }, [dispatch]);

  const deleteRecurring = useCallback(async (id: string) => {
    return dispatch(deleteRecurringAction(id)).unwrap();
  }, [dispatch]);

  // Subscription actions
  const loadSubscriptions = useCallback(async (filters?: { status?: string; billing_cycle?: string; category_id?: string }) => {
    return dispatch(fetchSubscriptions(filters)).unwrap();
  }, [dispatch]);

  const addSubscription = useCallback(async (data: Partial<Subscription>) => {
    return dispatch(createSubscription(data)).unwrap();
  }, [dispatch]);

  const editSubscription = useCallback(async (id: string, data: Partial<Subscription>) => {
    return dispatch(updateSubscription({ id, data })).unwrap();
  }, [dispatch]);

  const deleteSubscription = useCallback(async (id: string) => {
    return dispatch(deleteSubscriptionAction(id)).unwrap();
  }, [dispatch]);

  // Budget actions
  const loadBudgets = useCallback(async () => {
    return dispatch(fetchBudgets()).unwrap();
  }, [dispatch]);

  const addBudget = useCallback(async (data: Partial<Budget>) => {
    return dispatch(createBudget(data)).unwrap();
  }, [dispatch]);

  const deleteBudget = useCallback(async (id: string) => {
    return dispatch(deleteBudgetAction(id)).unwrap();
  }, [dispatch]);

  // Dashboard
  const loadDashboard = useCallback(async () => {
    return dispatch(fetchDashboard()).unwrap();
  }, [dispatch]);

  // Account selection
  const selectAccount = useCallback((id: string | null) => {
    dispatch(setSelectedAccount(id));
  }, [dispatch]);

  const clearFinanceError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    // State
    accounts, businessAccounts, personalAccounts, jointAccounts,
    selectedAccount, selectedAccountId,
    transactions, categories, budgets, recurringTransactions,
    subscriptions, dashboard, isLoading, error,
    // Actions
    loadAccounts, addAccount, editAccount, deleteAccount,
    loadTransactions, addTransaction, editTransaction, deleteTransaction,
    addTransfer,
    loadCategories,
    loadRecurring, addRecurring, deleteRecurring,
    loadSubscriptions, addSubscription, editSubscription, deleteSubscription,
    loadBudgets, addBudget, deleteBudget,
    loadDashboard,
    selectAccount, clearError: clearFinanceError,
  };
};

export default useFinance;
