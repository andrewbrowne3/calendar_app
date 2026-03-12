import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import Modal from '../components/common/Modal';
import type { BudgetPeriod } from '../types';
import toast from 'react-hot-toast';
import './FinanceDashboardPage.css';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export const FinanceBudgetsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    accounts, budgets, categories, isLoading,
    loadAccounts, loadBudgets, loadCategories, addBudget, deleteBudget,
  } = useFinance();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [formCategory, setFormCategory] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formPeriod, setFormPeriod] = useState<BudgetPeriod>('monthly');
  const [formAccount, setFormAccount] = useState('');

  useEffect(() => {
    loadAccounts();
    loadBudgets();
    loadCategories();
  }, [loadAccounts, loadBudgets, loadCategories]);

  // Flatten categories for dropdown
  const flatCategories: Array<{ id: string; name: string }> = [];
  categories.filter(c => c.category_type === 'expense' || c.category_type === 'both').forEach((cat) => {
    flatCategories.push({ id: cat.id, name: cat.name });
    cat.subcategories?.forEach((sub) => {
      flatCategories.push({ id: sub.id, name: `  ${cat.name} > ${sub.name}` });
    });
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addBudget({
        category: formCategory,
        amount: parseFloat(formAmount),
        period: formPeriod,
        account: formAccount || undefined,
        start_date: new Date().toISOString().split('T')[0],
      });
      toast.success('Budget created');
      setShowCreateModal(false);
      setFormCategory('');
      setFormAmount('');
      loadBudgets();
    } catch {
      toast.error('Failed to create budget');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this budget?')) {
      try {
        await deleteBudget(id);
        toast.success('Budget deleted');
      } catch {
        toast.error('Failed to delete');
      }
    }
  };

  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' as const };
  const labelStyle = { display: 'block' as const, fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#424242' };

  return (
    <div className="finance-page">
      <div className="finance-header">
        <div className="finance-header-left">
          <h1 className="finance-title">Budgets</h1>
          <p className="finance-subtitle">{budgets.length} active budgets</p>
        </div>
        <div className="finance-actions">
          <button className="refresh-btn" onClick={() => loadBudgets()} disabled={isLoading}>
            <RefreshCw size={18} className={isLoading ? 'spinning' : ''} />
          </button>
          <button className="create-goal-btn" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} /> New Budget
          </button>
        </div>
      </div>

      <div className="finance-subnav">
        <button className="subnav-btn" onClick={() => navigate('/finances')}>Dashboard</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/accounts')}>Accounts</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/transactions')}>Transactions</button>
        <button className="subnav-btn active" onClick={() => navigate('/finances/budgets')}>Budgets</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/subscriptions')}>Subscriptions</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/reports')}>Reports</button>
      </div>

      {budgets.length === 0 ? (
        <div className="empty-state">
          <h3>No budgets set</h3>
          <p>Create budgets to track spending against limits</p>
          <button className="create-goal-btn" onClick={() => setShowCreateModal(true)}>
            Create Budget
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {budgets.map((budget) => (
            <div key={budget.id} className="budget-alert-card" style={{ flexWrap: 'wrap' }}>
              <div className="budget-alert-info" style={{ minWidth: 200 }}>
                <span className="budget-alert-name">{budget.category_detail?.name || 'Unknown'}</span>
                <span className="budget-alert-detail">
                  {formatCurrency(budget.spent)} of {formatCurrency(budget.amount)} ({budget.period})
                  {budget.account_detail && ` - ${budget.account_detail.name}`}
                </span>
              </div>
              <div className="budget-progress-bar" style={{ flex: 1, minWidth: 100 }}>
                <div
                  className="budget-progress-fill"
                  style={{
                    width: `${Math.min(budget.percentage, 100)}%`,
                    backgroundColor: budget.percentage >= 100 ? '#F44336' : budget.percentage >= 80 ? '#FF9800' : '#4CAF50',
                  }}
                />
              </div>
              <span className="budget-percentage" style={{
                color: budget.percentage >= 100 ? '#F44336' : budget.percentage >= 80 ? '#FF9800' : '#4CAF50',
              }}>
                {budget.percentage}%
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: budget.remaining >= 0 ? '#4CAF50' : '#F44336', minWidth: 90, textAlign: 'right' }}>
                {formatCurrency(budget.remaining)} left
              </span>
              <button className="refresh-btn" style={{ width: 28, height: 28 }} onClick={() => handleDelete(budget.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Budget">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Category</label>
            <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} required style={inputStyle}>
              <option value="">Select category...</option>
              {flatCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Budget Amount</label>
            <input type="number" step="0.01" min="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} required style={inputStyle} placeholder="500.00" />
          </div>
          <div>
            <label style={labelStyle}>Period</label>
            <select value={formPeriod} onChange={(e) => setFormPeriod(e.target.value as BudgetPeriod)} style={inputStyle}>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Account (optional - leave blank for all accounts)</label>
            <select value={formAccount} onChange={(e) => setFormAccount(e.target.value)} style={inputStyle}>
              <option value="">All Accounts</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '10px 20px', border: '1px solid #E0E0E0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button type="submit" className="create-goal-btn">Create Budget</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FinanceBudgetsPage;
