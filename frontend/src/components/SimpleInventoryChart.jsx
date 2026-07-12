import React, { useContext } from 'react';
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

  // Generate a real 7-day inventory trend using actual orders history
  const generateRealTrendData = () => {
    const days = [];
    const dateLabels = [];
    const today = new Date();

    // Create past 7 days arrays
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      days.push(d.toDateString());
      dateLabels.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }));
    }

    // Calculate total stock today
    const currentStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);

    // Compute net changes per day
    const dailyChanges = {};
    days.forEach(day => {
      dailyChanges[day] = 0;
    });

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt).toDateString();
      if (dailyChanges[orderDate] !== undefined && order.status !== 'CANCELLED') {
        const qty = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        // Purchase adds stock, Sales deducts stock
        dailyChanges[orderDate] += (order.type === 'PURCHASE' ? qty : -qty);
      }
    });

    // Back-calculate inventory values
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

  const trend = generateRealTrendData();

  const chartData = {
    labels: trend.labels,
    datasets: [
      {
        label: 'Stock Quantity',
        data: trend.values,
        borderColor: '#181d26',
        backgroundColor: 'rgba(24, 29, 38, 0.05)',
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#181d26',
        pointHoverRadius: 6,
        pointRadius: 3
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#181d26',
        titleFont: { size: 11, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (context) => `Stock: ${context.parsed.y} units`
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
            family: 'Inter, system-ui'
          },
          color: '#64748b'
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            size: 10,
            family: 'Inter, system-ui'
          },
          color: '#64748b'
        }
      }
    }
  };

  return (
    <div className="card" style={{ height: '280px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-ink)' }}>
        Weekly Inventory Level
      </h3>
      <div style={{ flex: 1, position: 'relative' }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default SimpleInventoryChart;
