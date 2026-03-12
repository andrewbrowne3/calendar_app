import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import apiService from '../../../api/apiService';

interface CategoryData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

const CategoryPieChart: React.FC = () => {
  const [data, setData] = useState<CategoryData[]>([]);

  useEffect(() => {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    apiService.getCategoryBreakdown({ start_date: startDate, end_date: endDate }).then((res) => {
      setData(res.breakdown.map((item) => ({
        name: item.category__name,
        value: item.total,
        color: item.category__color,
        percentage: item.percentage,
      })));
    }).catch(() => {});
  }, []);

  if (data.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#9E9E9E' }}>No data yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          formatter={(value: string) => <span style={{ fontSize: 12 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default CategoryPieChart;
