import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import apiService from '../../../api/apiService';

const IncomeExpenseChart: React.FC = () => {
  const [data, setData] = useState<Array<{ month: string; income: number; expenses: number }>>([]);

  useEffect(() => {
    apiService.getIncomeVsExpenses({ months: 6 }).then((res) => {
      setData(res.data.map((d) => ({
        month: new Date(d.month).toLocaleDateString('en-US', { month: 'short' }),
        income: d.income,
        expenses: d.expenses,
      })));
    }).catch(() => {});
  }, []);

  if (data.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#9E9E9E' }}>No data yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, '']} />
        <Legend />
        <Bar dataKey="income" fill="#4CAF50" name="Income" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" fill="#F44336" name="Expenses" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default IncomeExpenseChart;
