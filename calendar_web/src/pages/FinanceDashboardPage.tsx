import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import IncomeExpenseChart from '../components/finance/charts/IncomeExpenseChart';
import CategoryPieChart from '../components/finance/charts/CategoryPieChart';
import toast from 'react-hot-toast';
import './FinanceDashboardPage.css';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export const FinanceDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { dashboard, isLoading, loadDashboard, selectAccount } = useFinance();

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRefresh = async () => {
    try {
      await loadDashboard();
      toast.success('Dashboard refreshed');
    } catch {
      toast.error('Failed to refresh');
    }
  };

  const summaryCards = [
    { label: 'Total Balance', value: dashboard?.total_balance ?? 0, icon: Wallet, color: '#2196F3' },
    { label: 'Monthly Income', value: dashboard?.monthly_income ?? 0, icon: TrendingUp, color: '#4CAF50' },
    { label: 'Monthly Expenses', value: dashboard?.monthly_expenses ?? 0, icon: TrendingDown, color: '#F44336' },
    { label: 'Net Savings', value: dashboard?.monthly_savings ?? 0, icon: PiggyBank, color: '#FF9800' },
  ];

  return (
    <div className="finance-page">
      <div className="finance-header">
        <div className="finance-header-left">
          <h1 className="finance-title">Finances</h1>
          <p className="finance-subtitle">Overview of your financial health</p>
        </div>
        <div className="finance-actions">
          <button className="refresh-btn" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw size={18} className={isLoading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="finance-subnav">
        <button className="subnav-btn active" onClick={() => navigate('/finances')}>Dashboard</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/accounts')}>Accounts</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/transactions')}>Transactions</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/budgets')}>Budgets</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/subscriptions')}>Subscriptions</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/reports')}>Reports</button>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        {summaryCards.map((card) => (
          <div key={card.label} className="summary-card">
            <div className="summary-card-icon" style={{ backgroundColor: `${card.color}15` }}>
              <card.icon size={24} color={card.color} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-label">{card.label}</span>
              <span className="summary-card-value" style={{ color: card.color }}>
                {formatCurrency(card.value)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Account Cards */}
      {dashboard?.accounts && dashboard.accounts.length > 0 && (
        <div className="section">
          <h2 className="section-title">Accounts</h2>
          <div className="account-cards">
            {dashboard.accounts.map((account) => (
              <div
                key={account.id}
                className="account-card"
                style={{ borderLeftColor: account.color }}
                onClick={() => {
                  selectAccount(account.id);
                  navigate('/finances/transactions');
                }}
              >
                <div className="account-card-header">
                  <span className="account-card-name">{account.name}</span>
                  <span className={`account-type-badge ${account.account_type}`}>
                    {account.account_type}
                  </span>
                </div>
                <span className="account-card-balance">{formatCurrency(account.current_balance)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="charts-row">
        <div className="chart-container">
          <h2 className="section-title">Income vs Expenses</h2>
          <IncomeExpenseChart />
        </div>
        <div className="chart-container">
          <h2 className="section-title">Spending by Category</h2>
          <CategoryPieChart />
        </div>
      </div>

      {/* Recent Transactions */}
      {dashboard?.recent_transactions && dashboard.recent_transactions.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">Recent Transactions</h2>
            <button className="link-btn" onClick={() => navigate('/finances/transactions')}>View All</button>
          </div>
          <div className="transactions-list">
            {dashboard.recent_transactions.map((txn) => (
              <div key={txn.id} className="transaction-row">
                <div className="transaction-info">
                  <span className="transaction-description">{txn.description}</span>
                  <span className="transaction-meta">
                    {txn.account_detail?.name} &bull; {txn.date}
                    {txn.category_detail && ` &bull; ${txn.category_detail.name}`}
                  </span>
                </div>
                <span className={`transaction-amount ${txn.transaction_type}`}>
                  {txn.transaction_type === 'expense' ? '-' : txn.transaction_type === 'income' ? '+' : ''}
                  {formatCurrency(txn.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget Alerts */}
      {dashboard?.budget_alerts && dashboard.budget_alerts.length > 0 && (
        <div className="section">
          <h2 className="section-title">Budget Alerts</h2>
          <div className="budget-alerts">
            {dashboard.budget_alerts.map((budget) => (
              <div key={budget.id} className="budget-alert-card">
                <div className="budget-alert-info">
                  <span className="budget-alert-name">{budget.category_detail?.name}</span>
                  <span className="budget-alert-detail">
                    {formatCurrency(budget.spent)} of {formatCurrency(budget.amount)}
                  </span>
                </div>
                <div className="budget-progress-bar">
                  <div
                    className="budget-progress-fill"
                    style={{
                      width: `${Math.min(budget.percentage, 100)}%`,
                      backgroundColor: budget.percentage >= 100 ? '#F44336' : '#FF9800',
                    }}
                  />
                </div>
                <span className="budget-percentage">{budget.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscription Summary */}
      {(dashboard?.total_monthly_subscriptions != null && dashboard.total_monthly_subscriptions > 0) && (
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">Subscriptions</h2>
            <button className="link-btn" onClick={() => navigate('/finances/subscriptions')}>Manage</button>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            <div className="summary-card" style={{ flex: 1 }}>
              <div className="summary-card-content">
                <span className="summary-card-label">Monthly Subscriptions</span>
                <span className="summary-card-value" style={{ color: '#9C27B0' }}>
                  {formatCurrency(dashboard.total_monthly_subscriptions)}
                </span>
              </div>
            </div>
          </div>
          {dashboard.upcoming_renewals && dashboard.upcoming_renewals.length > 0 && (
            <div className="recurring-list">
              <div style={{ fontSize: 13, fontWeight: 500, color: '#757575', marginBottom: 8 }}>Upcoming renewals (next 7 days)</div>
              {dashboard.upcoming_renewals.map((sub) => (
                <div key={sub.id} className="recurring-row">
                  <div className="recurring-info">
                    <span className="recurring-description">{sub.name}</span>
                    <span className="recurring-meta">
                      {sub.billing_cycle} &bull; Due {sub.next_billing_date}
                    </span>
                  </div>
                  <span className="recurring-amount">{formatCurrency(sub.cost)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Recurring */}
      {dashboard?.upcoming_recurring && dashboard.upcoming_recurring.length > 0 && (
        <div className="section">
          <h2 className="section-title">Upcoming Bills</h2>
          <div className="recurring-list">
            {dashboard.upcoming_recurring.map((rec) => (
              <div key={rec.id} className="recurring-row">
                <div className="recurring-info">
                  <span className="recurring-description">{rec.description}</span>
                  <span className="recurring-meta">
                    {rec.account_detail?.name} &bull; {rec.frequency} &bull; Due {rec.next_due_date}
                  </span>
                </div>
                <span className="recurring-amount">{formatCurrency(rec.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceDashboardPage;
