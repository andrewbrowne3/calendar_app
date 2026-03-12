import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Trash2, Edit2 } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import Modal from '../components/common/Modal';
import type { AccountType } from '../types';
import toast from 'react-hot-toast';
import './FinanceDashboardPage.css';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export const FinanceAccountsPage: React.FC = () => {
  const navigate = useNavigate();
  const { accounts, isLoading, loadAccounts, addAccount, editAccount, deleteAccount } = useFinance();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<AccountType>('personal');
  const [formDescription, setFormDescription] = useState('');
  const [formBalance, setFormBalance] = useState('0');
  const [formColor, setFormColor] = useState('#2196F3');

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const resetForm = () => {
    setFormName('');
    setFormType('personal');
    setFormDescription('');
    setFormBalance('0');
    setFormColor('#2196F3');
    setEditingAccount(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await editAccount(editingAccount, {
          name: formName,
          account_type: formType,
          description: formDescription,
          color: formColor,
        });
        toast.success('Account updated');
      } else {
        await addAccount({
          name: formName,
          account_type: formType,
          description: formDescription,
          initial_balance: parseFloat(formBalance),
          color: formColor,
        });
        toast.success('Account created');
      }
      setShowCreateModal(false);
      resetForm();
      loadAccounts();
    } catch {
      toast.error('Failed to save account');
    }
  };

  const handleEdit = (account: typeof accounts[0]) => {
    setFormName(account.name);
    setFormType(account.account_type);
    setFormDescription(account.description || '');
    setFormColor(account.color);
    setEditingAccount(account.id);
    setShowCreateModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this account?')) {
      try {
        await deleteAccount(id);
        toast.success('Account deleted');
      } catch {
        toast.error('Failed to delete account');
      }
    }
  };

  const accountsByType = {
    business: accounts.filter(a => a.account_type === 'business'),
    personal: accounts.filter(a => a.account_type === 'personal'),
    joint: accounts.filter(a => a.account_type === 'joint'),
  };

  return (
    <div className="finance-page">
      <div className="finance-header">
        <div className="finance-header-left">
          <h1 className="finance-title">Accounts</h1>
          <p className="finance-subtitle">{accounts.length} accounts</p>
        </div>
        <div className="finance-actions">
          <button className="refresh-btn" onClick={() => loadAccounts()} disabled={isLoading}>
            <RefreshCw size={18} className={isLoading ? 'spinning' : ''} />
          </button>
          <button className="create-goal-btn" onClick={() => { resetForm(); setShowCreateModal(true); }}>
            <Plus size={18} /> New Account
          </button>
        </div>
      </div>

      <div className="finance-subnav">
        <button className="subnav-btn" onClick={() => navigate('/finances')}>Dashboard</button>
        <button className="subnav-btn active" onClick={() => navigate('/finances/accounts')}>Accounts</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/transactions')}>Transactions</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/budgets')}>Budgets</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/subscriptions')}>Subscriptions</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/reports')}>Reports</button>
      </div>

      {Object.entries(accountsByType).map(([type, accts]) => accts.length > 0 && (
        <div key={type} className="section">
          <h2 className="section-title" style={{ textTransform: 'capitalize' }}>{type} Accounts</h2>
          <div className="account-cards">
            {accts.map((account) => (
              <div key={account.id} className="account-card" style={{ borderLeftColor: account.color }}>
                <div className="account-card-header">
                  <span className="account-card-name">{account.name}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="refresh-btn"
                      style={{ width: 28, height: 28 }}
                      onClick={() => handleEdit(account)}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="refresh-btn"
                      style={{ width: 28, height: 28 }}
                      onClick={() => handleDelete(account.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <span className="account-card-balance">{formatCurrency(account.current_balance)}</span>
                {account.description && (
                  <p style={{ fontSize: 12, color: '#9E9E9E', margin: '8px 0 0' }}>{account.description}</p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 12 }}>
                  <span style={{ color: '#4CAF50' }}>+{formatCurrency(account.monthly_income || 0)}</span>
                  <span style={{ color: '#F44336' }}>-{formatCurrency(account.monthly_expenses || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {accounts.length === 0 && (
        <div className="empty-state">
          <h3>No accounts yet</h3>
          <p>Create your first account to start tracking finances</p>
          <button className="create-goal-btn" onClick={() => setShowCreateModal(true)}>
            Create Account
          </button>
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetForm(); }}
        title={editingAccount ? 'Edit Account' : 'Create Account'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#424242' }}>
              Account Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Main Business LLC"
              required
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#424242' }}>
              Account Type
            </label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as AccountType)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
            >
              <option value="business">Business</option>
              <option value="personal">Personal</option>
              <option value="joint">Joint</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#424242' }}>
              Description
            </label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Optional description"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
          {!editingAccount && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#424242' }}>
                Initial Balance
              </label>
              <input
                type="number"
                step="0.01"
                value={formBalance}
                onChange={(e) => setFormBalance(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#424242' }}>
              Color
            </label>
            <input
              type="color"
              value={formColor}
              onChange={(e) => setFormColor(e.target.value)}
              style={{ width: 50, height: 36, border: 'none', cursor: 'pointer' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              onClick={() => { setShowCreateModal(false); resetForm(); }}
              style={{ padding: '10px 20px', border: '1px solid #E0E0E0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 14 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="create-goal-btn"
            >
              {editingAccount ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FinanceAccountsPage;
