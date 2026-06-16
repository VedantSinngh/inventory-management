import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const chartColors = ['#6366f1', '#22c55e', '#f59e0b', '#38bdf8', '#ef4444'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        borderRadius: '6px',
        padding: '10px 14px',
        fontSize: '12px'
      }}>
        {label && <p style={{ margin: '0 0 6px 0', fontWeight: '600', color: 'var(--color-text-primary)' }}>{label}</p>}
        {payload.map((p, idx) => (
          <p key={idx} style={{ margin: '4px 0', color: p.color || 'var(--color-accent)' }}>
            {p.name}: <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{p.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ShipmentTrackingChart = ({ shipments = [] }) => {
  const data = shipments.reduce((acc, ship) => {
    const status = ship.status || 'PENDING';
    const existing = acc.find(item => item.name === status);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: status, value: 1 });
    }
    return acc;
  }, []);

  const colors = {
    'PREPARING': '#f59e0b',
    'READY_FOR_PICKUP': '#38bdf8',
    'IN_TRANSIT': '#6366f1',
    'OUT_FOR_DELIVERY': '#38bdf8',
    'DELIVERED': '#22c55e',
    'FAILED': '#ef4444',
    'RETURNED': '#4a4a6a'
  };

  return (
    <div className="card">
      <h3 style={{ fontSize: '15px', fontWeight: '500', marginBottom: '16px' }}>Shipment Status Distribution</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name.replace(/_/g, ' ')}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[entry.name] || '#6366F1'} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const BatchExpiryChart = ({ batches = [] }) => {
  const today = new Date();
  const expiryData = batches.reduce((acc, batch) => {
    const expiryDate = new Date(batch.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

    let category = 'Safe';
    if (daysUntilExpiry < 0) category = 'Expired';
    else if (daysUntilExpiry <= 7) category = '0-7 Days';
    else if (daysUntilExpiry <= 30) category = '8-30 Days';
    else if (daysUntilExpiry <= 90) category = '31-90 Days';

    const existing = acc.find(item => item.name === category);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: category, value: 1 });
    }
    return acc;
  }, []);

  const getBarColor = (name) => {
    if (name === 'Expired') return '#ef4444';
    if (name === '0-7 Days') return '#f59e0b';
    return '#6366f1';
  };

  return (
    <div className="card">
      <h3 style={{ fontSize: '15px', fontWeight: '500', marginBottom: '16px' }}>Batch Expiry Status</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={expiryData}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" stroke="var(--color-text-secondary)" tick={{ fontSize: 11 }} />
          <YAxis stroke="var(--color-text-secondary)" tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {expiryData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.name)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const AlertSeverityChart = ({ alerts = [] }) => {
  const data = alerts.reduce((acc, alert) => {
    const severity = alert.severity || 'LOW';
    const existing = acc.find(item => item.name === severity);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: severity, value: 1 });
    }
    return acc;
  }, []);

  const getSeverityColor = (name) => {
    if (name === 'CRITICAL' || name === 'HIGH') return '#ef4444';
    if (name === 'MEDIUM') return '#f59e0b';
    return '#38bdf8';
  };

  return (
    <div className="card">
      <h3 style={{ fontSize: '15px', fontWeight: '500', marginBottom: '16px' }}>Alert Severity Distribution</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" stroke="var(--color-text-secondary)" tick={{ fontSize: 11 }} />
          <YAxis dataKey="name" type="category" stroke="var(--color-text-secondary)" tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getSeverityColor(entry.name)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const ForecastChart = ({ forecasts = [] }) => {
  const data = forecasts.slice(0, 10).map((f, idx) => ({
    period: `Month ${idx + 1}`,
    predicted: f.forecast?.predictedDemand || 0,
    lower: f.forecast?.confidenceInterval?.lower || 0,
    upper: f.forecast?.confidenceInterval?.upper || 0
  }));

  return (
    <div className="card">
      <h3 style={{ fontSize: '15px', fontWeight: '500', marginBottom: '16px' }}>Demand Forecast</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis dataKey="period" stroke="var(--color-text-secondary)" tick={{ fontSize: 11 }} />
          <YAxis stroke="var(--color-text-secondary)" tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="lower" stroke="#4a4a6a" strokeDasharray="5 5" name="Confidence Lower" dot={false} />
          <Line type="monotone" dataKey="predicted" stroke="#6366f1" strokeWidth={2} name="Predicted" dot={{ r: 4 }} />
          <Line type="monotone" dataKey="upper" stroke="#4a4a6a" strokeDasharray="5 5" name="Confidence Upper" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const InventoryTurnoverChart = ({ products = [] }) => {
  const data = products
    .filter(p => p.turnoverRate > 0)
    .sort((a, b) => b.turnoverRate - a.turnoverRate)
    .slice(0, 10)
    .map(p => ({
      name: p.name.substring(0, 15),
      turnover: p.turnoverRate,
      velocity: p.salesVelocity || 0
    }));

  return (
    <div className="card">
      <h3 style={{ fontSize: '15px', fontWeight: '500', marginBottom: '16px' }}>Top 10 Products by Turnover</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} stroke="var(--color-text-secondary)" tick={{ fontSize: 10 }} />
          <YAxis stroke="var(--color-text-secondary)" tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="turnover" fill="#6366f1" radius={[4, 4, 0, 0]} name="Annual Turnover" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const DeadStockChart = ({ products = [] }) => {
  const deadStockCount = products.filter(p => p.deadStock).length;
  const abcData = products.reduce((acc, p) => {
    const className = p.abcClassification || 'C';
    const existing = acc.find(item => item.name === className);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: className, value: 1 });
    }
    return acc;
  }, []);

  const colors = { 'A': '#22c55e', 'B': '#6366f1', 'C': '#f59e0b' };

  return (
    <div className="card">
      <h3 style={{ fontSize: '15px', fontWeight: '500', marginBottom: '16px' }}>
        Inventory Classification (Dead Stock: {deadStockCount})
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={abcData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            dataKey="value"
          >
            {abcData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[entry.name] || '#6366F1'} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export { ShipmentTrackingChart, BatchExpiryChart, AlertSeverityChart, ForecastChart, InventoryTurnoverChart, DeadStockChart };