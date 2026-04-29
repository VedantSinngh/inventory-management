import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const InventoryTrendChart = ({ products, orders }) => {
  // Generate last 30 days trend data
  const generateTrendData = () => {
    const days = [];
    const labels = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      
      // Calculate total stock value for that day (simulated)
      const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
      const variance = Math.sin(i / 5) * 50 + (Math.random() - 0.5) * 30;
      days.push(Math.max(0, totalStock + variance));
    }

    return { labels, data: days };
  };

  const { labels, data } = generateTrendData();

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Total Stock Units',
        data,
        borderColor: 'var(--color-accent)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'var(--color-accent)',
        pointBorderColor: 'var(--color-bg-card)',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
        displayColors: true,
        callbacks: {
          label: (context) => `Stock: ${Math.round(context.parsed.y)} units`
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
        ticks: { color: 'var(--color-text-muted)', font: { size: 11 } }
      }
    }
  };

  return (
    <div className="card" style={{ height: '400px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase' }}>
        📈 Inventory Trend (30 Days)
      </h3>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default InventoryTrendChart;
