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

const TopProductsChart = ({ products, orders }) => {
  // Calculate top products by sales volume
  const productSales = {};

  orders.forEach(order => {
    if (order.type === 'SALES') {
      order.items?.forEach(item => {
        const productId = item.product?._id || item.product;
        if (!productSales[productId]) {
          productSales[productId] = { quantity: 0, revenue: 0 };
        }
        productSales[productId].quantity += item.quantity || 0;
        productSales[productId].revenue += (item.quantity || 0) * (item.priceAtTime || 0);
      });
    }
  });

  // Get top 8 products
  const topProducts = products
    .map(p => ({
      name: p.name,
      quantity: productSales[p._id]?.quantity || 0,
      revenue: productSales[p._id]?.revenue || 0
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  const chartData = {
    labels: topProducts.map(p => p.name.substring(0, 20)),
    datasets: [
      {
        label: 'Units Sold',
        data: topProducts.map(p => p.quantity),
        backgroundColor: '#8B5CF6',
        borderColor: '#7C3AED',
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: '#7C3AED'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
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
          label: (context) => `Units Sold: ${Math.round(context.parsed.x)}`,
          afterLabel: (context) => {
            const product = topProducts[context.dataIndex];
            return `Revenue: $${product.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: 'var(--color-border)', drawBorder: false },
        ticks: { color: 'var(--color-text-muted)', font: { size: 11 } }
      },
      y: {
        grid: { display: false },
        ticks: { color: 'var(--color-text-muted)', font: { size: 10 } }
      }
    }
  };

  return (
    <div className="card" style={{ height: '400px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase' }}>
        🏆 Top Selling Products
      </h3>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default TopProductsChart;
