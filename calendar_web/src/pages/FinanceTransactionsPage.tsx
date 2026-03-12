import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, ArrowRightLeft, Trash2 } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import Modal from '../components/common/Modal';
import type { TransactionType } from '../types';
import toast from 'react-hot-toast';
import './FinanceDashboardPage.css';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export const FinanceTransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    accounts, transactions, categories, selectedAccountId,
    isLoading, loadAccounts, loadTransactions, loadCategories,
    addTransaction, deleteTransaction, addTransfer, selectAccount,
  } = useFinance();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [filterType, setFilterType] = useState<TransactionType | ''>('');

  // Transaction form
  const [txnAccount, setTxnAccount] = useState('');
  const [txnType, setTxnType] = useState<TransactionType>('expense');
  const [txnAmount, setTxnAmount] = useState('');
  const [txnDescription, setTxnDescription] = useState('');
  const [txnCategory, setTxnCategory] = useState('');
  const [txnDate, setTxnDate] = useState(new Date().toISOString().split('T')[0]);
  const [txnNotes, setTxnNotes] = useState('');

  // Transfer form
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadAccounts();
    loadCategories();
  }, [loadAccounts, loadCategories]);

  useEffect(() => {
    const filters: Record<string, string> = {};
    if (selectedAccountId) filters.account_id = selectedAccountId;
    if (filterType) filters.transaction_type = filterType;
    loadTransactions(filters);
  }, [loadTransactions, selectedAccountId, filterType]);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addTransaction({
        account: txnAccount,
        transaction_type: txnType,
        amount: parseFloat(txnAmount),
        description: txnDescription,
        category: txnCategory || undefined,
        date: txnDate,
        notes: txnNotes || undefined,
      });
      toast.success('Transaction created');
      setShowCreateModal(false);
      setTxnAmount('');
      setTxnDescription('');
      setTxnNotes('');
      loadTransactions(selectedAccountId ? { account_id: selectedAccountId } : undefined);
      loadAccounts();
    } catch {
      toast.error('Failed to create transaction');
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addTransfer({
        from_account: transferFrom,
        to_account: transferTo,
        amount: parseFloat(transferAmount),
        description: transferDescription,
        date: transferDate,
      });
      toast.success('Transfer created');
      setShowTransferModal(false);
      setTransferAmount('');
      setTransferDescription('');
      loadTransactions(selectedAccountId ? { account_id: selectedAccountId } : undefined);
      loadAccounts();
    } catch {
      toast.error('Failed to create transfer');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this transaction?')) {
      try {
        await deleteTransaction(id);
        toast.success('Transaction deleted');
        loadAccounts();
      } catch {
        toast.error('Failed to delete');
      }
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (txnType === 'income') return c.category_type === 'income' || c.category_type === 'both';
    if (txnType === 'expense') return c.category_type === 'expense' || c.category_type === 'both';
    return true;
  });

  // Flatten subcategories for the dropdown
  const flatCategories: Array<{ id: string; name: string }> = [];
  filteredCategories.forEach((cat) => {
    flatCategories.push({ id: cat.id, name: cat.name });
    cat.subcategories?.forEach((sub) => {
      flatCategories.push({ id: sub.id, name: `  ${cat.name} > ${sub.name}` });
    });
  });

  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' as const };
  const labelStyle = { display: 'block' as const, fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#424242' };

  return (
    <div className="finance-page">
      <div className="finance-header">
        <div className="finance-header-left">
          <h1 className="finance-title">Transactions</h1>
          <p className="finance-subtitle">{transactions.length} transactions</p>
        </div>
        <div className="finance-actions">
          <button className="refresh-btn" onClick={() => loadTransactions()} disabled={isLoading}>
            <RefreshCw size={18} className={isLoading ? 'spinning' : ''} />
          </button>
          <button
            className="create-goal-btn"
            style={{ backgroundColor: '#FF9800' }}
            onClick={() => setShowTransferModal(true)}
          >
            <ArrowRightLeft size={18} /> Transfer
          </button>
          <button className="create-goal-btn" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} /> New Transaction
          </button>
        </div>
      </div>

      <div className="finance-subnav">
        <button className="subnav-btn" onClick={() => navigate('/finances')}>Dashboard</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/accounts')}>Accounts</button>
        <button className="subnav-btn active" onClick={() => navigate('/finances/transactions')}>Transactions</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/budgets')}>Budgets</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/subscriptions')}>Subscriptions</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/reports')}>Reports</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select
          value={selectedAccountId || ''}
          onChange={(e) => selectAccount(e.target.value || null)}
          style={{ ...inputStyle, width: 'auto', minWidth: 160 }}
        >
          <option value="">All Accounts</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as TransactionType | '')}
          style={{ ...inputStyle, width: 'auto', minWidth: 140 }}
        >
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </select>
      </div>

      {/* Transaction List */}
      <div className="transactions-list">
        {transactions.length === 0 ? (
          <div className="empty-state">
            <h3>No transactions yet</h3>
            <p>Add your first transaction to start tracking</p>
          </div>
        ) : (
          transactions.map((txn) => (
            <div key={txn.id} className="transaction-row">
              <div className="transaction-info">
                <span className="transaction-description">{txn.description}</span>
                <span className="transaction-meta">
                  {txn.account_detail?.name} &bull; {txn.date}
                  {txn.category_detail && ` &bull; ${txn.category_detail.name}`}
                  {txn.is_tax_deductible && ' &bull; Tax deductible'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className={`transaction-amount ${txn.transaction_type}`}>
                  {txn.transaction_type === 'expense' ? '-' : txn.transaction_type === 'income' ? '+' : ''}
                  {formatCurrency(txn.amount)}
                </span>
                <button className="refresh-btn" style={{ width: 28, height: 28 }} onClick={() => handleDelete(txn.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Transaction Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Transaction">
        <form onSubmit={handleCreateTransaction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Account</label>
            <select value={txnAccount} onChange={(e) => setTxnAccount(e.target.value)} required style={inputStyle}>
              <option value="">Select account...</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select value={txnType} onChange={(e) => setTxnType(e.target.value as TransactionType)} style={inputStyle}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Amount</label>
            <input type="number" step="0.01" min="0.01" value={txnAmount} onChange={(e) => setTxnAmount(e.target.value)} required style={inputStyle} placeholder="0.00" />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <input type="text" value={txnDescription} onChange={(e) => setTxnDescription(e.target.value)} required style={inputStyle} placeholder="What was this for?" />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select value={txnCategory} onChange={(e) => setTxnCategory(e.target.value)} style={inputStyle}>
              <option value="">No category</option>
              {flatCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea value={txnNotes} onChange={(e) => setTxnNotes(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="Additional notes..." />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '10px 20px', border: '1px solid #E0E0E0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button type="submit" className="create-goal-btn">Add Transaction</button>
          </div>
        </form>
      </Modal>

      {/* Transfer Modal */}
      <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Transfer Between Accounts">
        <form onSubmit={handleCreateTransfer} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>From Account</label>
            <select value={transferFrom} onChange={(e) => setTransferFrom(e.target.value)} required style={inputStyle}>
              <option value="">Select source...</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.current_balance)})</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>To Account</label>
            <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)} required style={inputStyle}>
              <option value="">Select destination...</option>
              {accounts.filter(a => a.id !== transferFrom).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Amount</label>
            <input type="number" step="0.01" min="0.01" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} required style={inputStyle} placeholder="0.00" />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <input type="text" value={transferDescription} onChange={(e) => setTransferDescription(e.target.value)} required style={inputStyle} placeholder="e.g., Owner's draw" />
          </div>
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={() => setShowTransferModal(false)} style={{ padding: '10px 20px', border: '1px solid #E0E0E0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button type="submit" className="create-goal-btn" style={{ backgroundColor: '#FF9800' }}>Transfer</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FinanceTransactionsPage;
