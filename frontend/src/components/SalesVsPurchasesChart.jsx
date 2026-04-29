import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const SalesVsPurchasesChart = ({ orders }) => {
  // Generate last 12 weeks data
  const generateWeeklyData = () => {
    const weeks = [];
    const labels = [];
    const today = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i * 7);
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      
      labels.push(`Week ${12 - i}`);

      // Calculate sales and purchases for the week
      const weekOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= weekStart && orderDate < new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      });

      const salesAmount = weekOrders
        .filter(o => o.type === 'SALES')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      const purchaseAmount = weekOrders
        .filter(o => o.type === 'PURCHASE')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      weeks.push({ sales: salesAmount, purchases: purchaseAmount });
    }

    return { labels, data: weeks };
  };

  const { labels, data } = generateWeeklyData();

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Sales Revenue',
        data: data.map(d => d.sales),
        backgroundColor: '#10B981',
        borderColor: '#059669',
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: '#047857'
      },
      {
        label: 'Purchase Cost',
        data: data.map(d => d.purchases),
        backgroundColor: '#3B82F6',
        borderColor: '#1D4ED8',
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: '#1e40af'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'x',
    plugins: {
      legend: {
        display: true,
        labels: {
          color: 'var(--color-text-secondary)',
          font: { size: 12, weight: '500' },
          usePointStyle: true,
          padding: 15
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
          label: (context) => `${context.dataset.label}: $${Math.round(context.parsed.y).toLocaleString()}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'var(--color-text-muted)', font: { size: 11 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'var(--color-border)', drawBorder: false },
        ticks: {
          color: 'var(--color-text-muted)',
          font: { size: 11 },
          callback: (value) => `$${(value / 1000).toFixed(0)}k`
        }
      }
    }
  };

  return (
    <div className="card" style={{ height: '400px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase' }}>
        💰 Sales vs Purchases (12 Weeks)
      </h3>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default SalesVsPurchasesChart;
