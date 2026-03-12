import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Trash2, Edit2, ExternalLink } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import Modal from '../components/common/Modal';
import type { BillingCycle, SubscriptionStatus, Subscription } from '../types';
import toast from 'react-hot-toast';
import './FinanceDashboardPage.css';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const statusColors: Record<SubscriptionStatus, string> = {
  active: '#4CAF50',
  trial: '#2196F3',
  paused: '#FF9800',
  cancelled: '#9E9E9E',
};

export const FinanceSubscriptionsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    accounts, categories, subscriptions, isLoading,
    loadAccounts, loadCategories, loadSubscriptions,
    addSubscription, editSubscription, deleteSubscription,
  } = useFinance();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formCycle, setFormCycle] = useState<BillingCycle>('monthly');
  const [formNextDate, setFormNextDate] = useState('');
  const [formStatus, setFormStatus] = useState<SubscriptionStatus>('active');
  const [formCategory, setFormCategory] = useState('');
  const [formAccount, setFormAccount] = useState('');
  const [formColor, setFormColor] = useState('#9C27B0');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    loadAccounts();
    loadCategories();
    loadSubscriptions();
  }, [loadAccounts, loadCategories, loadSubscriptions]);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormWebsite('');
    setFormCost('');
    setFormCycle('monthly');
    setFormNextDate('');
    setFormStatus('active');
    setFormCategory('');
    setFormAccount('');
    setFormColor('#9C27B0');
    setFormNotes('');
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setFormNextDate(new Date().toISOString().split('T')[0]);
    setShowModal(true);
  };

  const openEdit = (sub: Subscription) => {
    setEditingId(sub.id);
    setFormName(sub.name);
    setFormDescription(sub.description || '');
    setFormWebsite(sub.website_url || '');
    setFormCost(String(sub.cost));
    setFormCycle(sub.billing_cycle);
    setFormNextDate(sub.next_billing_date);
    setFormStatus(sub.status);
    setFormCategory(sub.category || '');
    setFormAccount(sub.account || '');
    setFormColor(sub.color);
    setFormNotes(sub.notes || '');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Partial<Subscription> = {
      name: formName,
      description: formDescription || undefined,
      website_url: formWebsite || undefined,
      cost: parseFloat(formCost),
      billing_cycle: formCycle,
      next_billing_date: formNextDate,
      status: formStatus,
      category: formCategory || undefined,
      account: formAccount || undefined,
      color: formColor,
      notes: formNotes || undefined,
    };

    try {
      if (editingId) {
        await editSubscription(editingId, data);
        toast.success('Subscription updated');
      } else {
        await addSubscription(data);
        toast.success('Subscription created');
      }
      setShowModal(false);
      resetForm();
      loadSubscriptions();
    } catch {
      toast.error(editingId ? 'Failed to update' : 'Failed to create');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this subscription?')) {
      try {
        await deleteSubscription(id);
        toast.success('Subscription deleted');
      } catch {
        toast.error('Failed to delete');
      }
    }
  };

  // Flatten categories for dropdown
  const flatCategories: Array<{ id: string; name: string }> = [];
  categories.filter(c => c.category_type === 'expense' || c.category_type === 'both').forEach((cat) => {
    flatCategories.push({ id: cat.id, name: cat.name });
    cat.subcategories?.forEach((sub) => {
      flatCategories.push({ id: sub.id, name: `  ${cat.name} > ${sub.name}` });
    });
  });

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active' || s.status === 'trial');
  const monthlyTotal = activeSubscriptions.reduce((sum, s) => sum + s.monthly_cost, 0);
  const yearlyTotal = monthlyTotal * 12;

  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' as const };
  const labelStyle = { display: 'block' as const, fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#424242' };

  return (
    <div className="finance-page">
      <div className="finance-header">
        <div className="finance-header-left">
          <h1 className="finance-title">Subscriptions</h1>
          <p className="finance-subtitle">{activeSubscriptions.length} active subscriptions</p>
        </div>
        <div className="finance-actions">
          <button className="refresh-btn" onClick={() => loadSubscriptions()} disabled={isLoading}>
            <RefreshCw size={18} className={isLoading ? 'spinning' : ''} />
          </button>
          <button className="create-goal-btn" onClick={openCreate}>
            <Plus size={18} /> New Subscription
          </button>
        </div>
      </div>

      <div className="finance-subnav">
        <button className="subnav-btn" onClick={() => navigate('/finances')}>Dashboard</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/accounts')}>Accounts</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/transactions')}>Transactions</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/budgets')}>Budgets</button>
        <button className="subnav-btn active" onClick={() => navigate('/finances/subscriptions')}>Subscriptions</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/reports')}>Reports</button>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card-content">
            <span className="summary-card-label">Monthly Total</span>
            <span className="summary-card-value" style={{ color: '#9C27B0' }}>
              {formatCurrency(monthlyTotal)}
            </span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-content">
            <span className="summary-card-label">Yearly Total</span>
            <span className="summary-card-value" style={{ color: '#F44336' }}>
              {formatCurrency(yearlyTotal)}
            </span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-content">
            <span className="summary-card-label">Active Count</span>
            <span className="summary-card-value" style={{ color: '#4CAF50' }}>
              {activeSubscriptions.length}
            </span>
          </div>
        </div>
      </div>

      {/* Subscription List */}
      {subscriptions.length === 0 ? (
        <div className="empty-state">
          <h3>No subscriptions yet</h3>
          <p>Track your recurring service subscriptions like Netflix, Spotify, gym memberships, etc.</p>
          <button className="create-goal-btn" onClick={openCreate}>
            Add Subscription
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {subscriptions.map((sub) => (
            <div key={sub.id} className="budget-alert-card" style={{ flexWrap: 'wrap', borderLeft: `4px solid ${sub.color}` }}>
              <div className="budget-alert-info" style={{ minWidth: 200, flex: 1 }}>
                <span className="budget-alert-name">{sub.name}</span>
                <span className="budget-alert-detail">
                  {formatCurrency(sub.cost)}/{sub.billing_cycle}
                  {sub.category_detail && ` \u2022 ${sub.category_detail.name}`}
                  {sub.account_detail && ` \u2022 ${sub.account_detail.name}`}
                </span>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 12,
                backgroundColor: `${statusColors[sub.status]}20`,
                color: statusColors[sub.status],
              }}>
                {sub.status}
              </span>
              <div style={{ textAlign: 'right', minWidth: 100 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#212121' }}>
                  {formatCurrency(sub.monthly_cost)}/mo
                </div>
                <div style={{ fontSize: 12, color: '#757575' }}>
                  Next: {sub.next_billing_date}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {sub.website_url && (
                  <a href={sub.website_url} target="_blank" rel="noopener noreferrer" className="refresh-btn" style={{ width: 28, height: 28, textDecoration: 'none' }}>
                    <ExternalLink size={14} />
                  </a>
                )}
                <button className="refresh-btn" style={{ width: 28, height: 28 }} onClick={() => openEdit(sub)}>
                  <Edit2 size={14} />
                </button>
                <button className="refresh-btn" style={{ width: 28, height: 28 }} onClick={() => handleDelete(sub.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editingId ? 'Edit Subscription' : 'Add Subscription'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} required style={inputStyle} placeholder="e.g. Netflix, Spotify" />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Cost</label>
              <input type="number" step="0.01" min="0.01" value={formCost} onChange={(e) => setFormCost(e.target.value)} required style={inputStyle} placeholder="9.99" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Billing Cycle</label>
              <select value={formCycle} onChange={(e) => setFormCycle(e.target.value as BillingCycle)} style={inputStyle}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Next Billing Date</label>
              <input type="date" value={formNextDate} onChange={(e) => setFormNextDate(e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Status</label>
              <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as SubscriptionStatus)} style={inputStyle}>
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} style={inputStyle} placeholder="Optional description" />
          </div>
          <div>
            <label style={labelStyle}>Website URL</label>
            <input type="url" value={formWebsite} onChange={(e) => setFormWebsite(e.target.value)} style={inputStyle} placeholder="https://..." />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Category</label>
              <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} style={inputStyle}>
                <option value="">None</option>
                {flatCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Account</label>
              <select value={formAccount} onChange={(e) => setFormAccount(e.target.value)} style={inputStyle}>
                <option value="">None</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Color</label>
              <input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} style={{ ...inputStyle, height: 42, padding: 4 }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="Optional notes" />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={() => { setShowModal(false); resetForm(); }} style={{ padding: '10px 20px', border: '1px solid #E0E0E0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button type="submit" className="create-goal-btn">{editingId ? 'Save Changes' : 'Add Subscription'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FinanceSubscriptionsPage;
