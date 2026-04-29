import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const StockDistributionChart = ({ products }) => {
  // Group products by category and calculate total stock
  const categoryData = products.reduce((acc, product) => {
    const category = product.category || 'Uncategorized';
    const existing = acc.find(c => c.name === category);
    if (existing) {
      existing.stock += product.stock || 0;
      existing.count += 1;
    } else {
      acc.push({ name: category, stock: product.stock || 0, count: 1 });
    }
    return acc;
  }, []);

  // Sort by stock quantity
  categoryData.sort((a, b) => b.stock - a.stock);

  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
  ];

  const chartData = {
    labels: categoryData.map(c => c.name),
    datasets: [
      {
        label: 'Stock Units',
        data: categoryData.map(c => c.stock),
        backgroundColor: colors.slice(0, categoryData.length),
        borderColor: 'var(--color-bg-card)',
        borderWidth: 2,
        hoverOffset: 10
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: 'var(--color-text-secondary)',
          font: { size: 11, weight: '500' },
          padding: 15,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'var(--color-bg-primary)',
        titleColor: 'var(--color-text-heading)',
        bodyColor: 'var(--color-text-secondary)',
        borderColor: 'var(--color-border)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const index = context.dataIndex;
            const count = categoryData[index].count;
            return `${label}: ${value} units (${count} items)`;
          }
        }
      }
    }
  };

  return (
    <div className="card" style={{ height: '400px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase' }}>
        📦 Stock Distribution by Category
      </h3>
      <Doughnut data={chartData} options={options} />
    </div>
  );
};

export default StockDistributionChart;
