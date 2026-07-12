import React, { useContext, useRef, useEffect, useState } from 'react';
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
import { InventoryContext } from '../context/InventoryContext';

// Register Chart.js components
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

const SimpleInventoryChart = ({ products }) => {
  const { orders } = useContext(InventoryContext);
  const chartRef = useRef(null);
  const [chartData, setChartData] = useState({ datasets: [] });

  const generateRealTrendData = () => {
    const days = [];
    const dateLabels = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      days.push(d.toDateString());
      dateLabels.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }));
    }

    const currentStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);

    const dailyChanges = {};
    days.forEach(day => {
      dailyChanges[day] = 0;
    });

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt).toDateString();
      if (dailyChanges[orderDate] !== undefined && order.status !== 'CANCELLED') {
        const qty = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        dailyChanges[orderDate] += (order.type === 'PURCHASE' ? qty : -qty);
      }
    });

    const trendValues = new Array(7);
    let tempStock = currentStock;
    trendValues[6] = tempStock;

    for (let i = 5; i >= 0; i--) {
      const changeOnDayAfter = dailyChanges[days[i + 1]];
      tempStock = tempStock - changeOnDayAfter;
      trendValues[i] = Math.max(0, tempStock);
    }

    return {
      labels: dateLabels,
      values: trendValues
    };
  };

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const ctx = chart.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.25)'); 
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.00)');

    const trend = generateRealTrendData();

    setChartData({
      labels: trend.labels,
      datasets: [
        {
          label: 'Stock Quantity',
          data: trend.values,
          borderColor: '#6366f1',
          backgroundColor: gradient,
          borderWidth: 3,
          tension: 0.38,
          fill: true,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: 'var(--color-canvas)',
          pointBorderWidth: 2,
          pointHoverRadius: 7,
          pointRadius: 4
        }
      ]
    });
  }, [products, orders]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#1e1b4b',
        titleFont: { size: 11, weight: 'bold' },
        bodyFont: { size: 12, weight: '600' },
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (context) => `Total Inventory: ${context.parsed.y} units`
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 10,
            weight: '600',
            family: 'Inter, system-ui'
          },
          color: 'var(--color-muted)'
        }
      },
      y: {
        grid: {
          color: 'rgba(99, 102, 241, 0.05)'
        },
        ticks: {
          font: {
            size: 10,
            weight: '600',
            family: 'Inter, system-ui'
          },
          color: 'var(--color-muted)'
        }
      }
    }
  };

  return (
    <div className="card" style={{ height: '300px', padding: '24px', display: 'flex', flexDirection: 'column', borderRadius: '16px', border: '1px solid var(--color-hairline)', boxShadow: '0 4px 20px rgba(0,0,0,0.01)' }}>
      <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--color-ink)' }}>
        Weekly Inventory Level
      </h3>
      <div style={{ flex: 1, position: 'relative' }}>
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
    </div>
  );
};

export default SimpleInventoryChart;
