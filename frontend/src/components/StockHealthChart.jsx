import React from 'react';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const StockHealthChart = ({ products, warehouses }) => {
  // Calculate health metrics
  const calculateMetrics = () => {
    const totalProducts = products.length;
    const lowStockCount = products.filter(p => p.stock <= (p.lowStockThreshold || 10)).length;
    const outOfStockCount = products.filter(p => p.stock === 0).length;
    const overStockCount = products.filter(p => p.stock > (p.lowStockThreshold || 10) * 3).length;

    // Health scores (0-100)
    const stockAvailability = totalProducts > 0 ? ((totalProducts - outOfStockCount) / totalProducts) * 100 : 0;
    const stockBalance = totalProducts > 0 ? (1 - (lowStockCount / totalProducts) * 0.5) * 100 : 0;
    const warehouseUtilization = warehouses.length > 0 ? 75 : 0; // Placeholder
    const turnoverRate = 80; // Placeholder
    const inventoryAccuracy = 95; // Placeholder

    return [
      Math.round(stockAvailability),
      Math.round(stockBalance),
      warehouseUtilization,
      turnoverRate,
      inventoryAccuracy
    ];
  };

  const metrics = calculateMetrics();

  const chartData = {
    labels: ['Stock Availability', 'Stock Balance', 'Warehouse Util.', 'Turnover Rate', 'Inventory Accuracy'],
    datasets: [
      {
        label: 'Inventory Health Score',
        data: metrics,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderWidth: 2,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: 'var(--color-bg-card)',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          color: 'var(--color-text-muted)',
          font: { size: 11 },
          stepSize: 20
        },
        grid: {
          color: 'var(--color-border)'
        }
      }
    },
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
          label: (context) => `${context.label}: ${Math.round(context.parsed.r)}/100`
        }
      }
    }
  };

  return (
    <div className="card" style={{ height: '400px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase' }}>
        ⚙️ Inventory Health Score
      </h3>
      <Radar data={chartData} options={options} />
    </div>
  );
};

export default StockHealthChart;
