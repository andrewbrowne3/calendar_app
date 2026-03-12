import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import apiService from '../api/apiService';
import type { ProfitLossReport, CashFlowReport, TaxSummary } from '../types';
import './FinanceDashboardPage.css';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

type ReportTab = 'pnl' | 'cashflow' | 'tax';

export const FinanceReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { accounts } = useFinance();
  const [activeTab, setActiveTab] = useState<ReportTab>('pnl');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Report data
  const [pnl, setPnl] = useState<ProfitLossReport | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowReport | null>(null);
  const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const params = selectedAccount ? { account_id: selectedAccount } : undefined;
      if (activeTab === 'pnl') {
        const today = new Date();
        const startOfYear = `${today.getFullYear()}-01-01`;
        const endDate = today.toISOString().split('T')[0];
        setPnl(await apiService.getProfitLoss({ ...params, start_date: startOfYear, end_date: endDate }));
      } else if (activeTab === 'cashflow') {
        setCashFlow(await apiService.getCashFlow({ ...params, period: 'monthly' }));
      } else if (activeTab === 'tax') {
        setTaxSummary(await apiService.getTaxSummary({ ...params, year: String(new Date().getFullYear()) }));
      }
    } catch {
      // silently fail
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadReport();
  }, [activeTab, selectedAccount]);

  return (
    <div className="finance-page">
      <div className="finance-header">
        <div className="finance-header-left">
          <h1 className="finance-title">Reports</h1>
          <p className="finance-subtitle">Financial analysis and insights</p>
        </div>
        <div className="finance-actions">
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13 }}
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button className="refresh-btn" onClick={loadReport} disabled={isLoading}>
            <RefreshCw size={18} className={isLoading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      <div className="finance-subnav">
        <button className="subnav-btn" onClick={() => navigate('/finances')}>Dashboard</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/accounts')}>Accounts</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/transactions')}>Transactions</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/budgets')}>Budgets</button>
        <button className="subnav-btn" onClick={() => navigate('/finances/subscriptions')}>Subscriptions</button>
        <button className="subnav-btn active" onClick={() => navigate('/finances/reports')}>Reports</button>
      </div>

      {/* Report tabs */}
      <div className="finance-subnav" style={{ marginBottom: 24 }}>
        <button className={`subnav-btn ${activeTab === 'pnl' ? 'active' : ''}`} onClick={() => setActiveTab('pnl')}>
          Profit & Loss
        </button>
        <button className={`subnav-btn ${activeTab === 'cashflow' ? 'active' : ''}`} onClick={() => setActiveTab('cashflow')}>
          Cash Flow
        </button>
        <button className={`subnav-btn ${activeTab === 'tax' ? 'active' : ''}`} onClick={() => setActiveTab('tax')}>
          Tax Summary
        </button>
      </div>

      {/* P&L Report */}
      {activeTab === 'pnl' && pnl && (
        <div>
          <div className="summary-cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="summary-card">
              <div className="summary-card-content">
                <span className="summary-card-label">Total Income</span>
                <span className="summary-card-value" style={{ color: '#4CAF50' }}>{formatCurrency(pnl.total_income)}</span>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-card-content">
                <span className="summary-card-label">Total Expenses</span>
                <span className="summary-card-value" style={{ color: '#F44336' }}>{formatCurrency(pnl.total_expenses)}</span>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-card-content">
                <span className="summary-card-label">Net Profit</span>
                <span className="summary-card-value" style={{ color: pnl.net_profit >= 0 ? '#4CAF50' : '#F44336' }}>
                  {formatCurrency(pnl.net_profit)}
                </span>
              </div>
            </div>
          </div>

          <div className="charts-row">
            <div className="chart-container">
              <h3 className="section-title">Income by Category</h3>
              {pnl.income_by_category.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pnl.income_by_category.map((item) => (
                    <div key={item.category__id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: item.category__color }} />
                        <span style={{ fontSize: 14 }}>{item.category__name}</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#9E9E9E', fontSize: 14 }}>No income recorded</p>
              )}
            </div>
            <div className="chart-container">
              <h3 className="section-title">Expenses by Category</h3>
              {pnl.expense_by_category.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pnl.expense_by_category.map((item) => (
                    <div key={item.category__id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: item.category__color }} />
                        <span style={{ fontSize: 14 }}>{item.category__name}</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#9E9E9E', fontSize: 14 }}>No expenses recorded</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cash Flow Report */}
      {activeTab === 'cashflow' && cashFlow && (
        <div className="chart-container">
          <h3 className="section-title">Cash Flow Over Time</h3>
          {cashFlow.cash_flow.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={cashFlow.cash_flow.map(d => ({
                ...d,
                period: new Date(d.period).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#4CAF50" name="Income" strokeWidth={2} />
                <Line type="monotone" dataKey="expenses" stroke="#F44336" name="Expenses" strokeWidth={2} />
                <Line type="monotone" dataKey="net" stroke="#2196F3" name="Net" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: '#9E9E9E', fontSize: 14, textAlign: 'center', padding: 40 }}>No data yet</p>
          )}
        </div>
      )}

      {/* Tax Summary */}
      {activeTab === 'tax' && taxSummary && (
        <div>
          <div className="summary-cards" style={{ gridTemplateColumns: '1fr' }}>
            <div className="summary-card">
              <div className="summary-card-content">
                <span className="summary-card-label">Total Tax-Deductible Expenses ({taxSummary.year})</span>
                <span className="summary-card-value" style={{ color: '#2196F3' }}>{formatCurrency(taxSummary.total_deductible)}</span>
              </div>
            </div>
          </div>

          <div className="chart-container" style={{ marginTop: 16 }}>
            <h3 className="section-title">By Tax Category</h3>
            {taxSummary.by_tax_category.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={taxSummary.by_tax_category} layout="vertical" margin={{ left: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
                    <YAxis type="category" dataKey="tax_category" tick={{ fontSize: 12 }} width={120} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="total" fill="#2196F3" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 16 }}>
                  {taxSummary.by_tax_category.map((item) => (
                    <div key={item.tax_category} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
                      <span style={{ fontSize: 14 }}>{item.tax_category || 'Uncategorized'}</span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: '#9E9E9E', fontSize: 14, textAlign: 'center', padding: 40 }}>No tax-deductible expenses recorded</p>
            )}
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#9E9E9E' }}>Loading report...</div>
      )}
    </div>
  );
};

export default FinanceReportsPage;
