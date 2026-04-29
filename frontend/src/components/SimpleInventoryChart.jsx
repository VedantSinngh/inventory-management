import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SimpleInventoryChart = ({ products }) => {
  // Generate simple 7-day trend
  const generateWeekData = () => {
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    
    return days.map((day, i) => ({
      name: day,
      value: Math.max(0, totalStock + (Math.random() - 0.5) * 100 * Math.sin(i))
    }));
  };

  const data = generateWeekData();

  return (
    <div className="card" style={{ height: '350px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase' }}>
        📊 Weekly Inventory Movement
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              color: 'var(--color-text-heading)'
            }}
            formatter={(value) => `${Math.round(value)} units`}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={{ fill: 'var(--color-accent)', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SimpleInventoryChart;
