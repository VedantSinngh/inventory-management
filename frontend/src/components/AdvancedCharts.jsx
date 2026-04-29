import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
    'PREPARING': '#F59E0B',
    'READY_FOR_PICKUP': '#3B82F6',
    'IN_TRANSIT': '#8B5CF6',
    'OUT_FOR_DELIVERY': '#EC4899',
    'DELIVERED': '#10B981',
    'FAILED': '#EF4444',
    'RETURNED': '#6B7280'
  };

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Shipment Status Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[entry.name] || '#6366F1'} />
            ))}
          </Pie>
          <Tooltip />
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

  const colors = ['#EF4444', '#F59E0B', '#FBBF24', '#10B981', '#3B82F6'];

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Batch Expiry Status</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={expiryData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#3B82F6" radius={[8, 8, 0, 0]} />
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

  const colors = {
    'CRITICAL': '#DC2626',
    'HIGH': '#EF4444',
    'MEDIUM': '#F59E0B',
    'LOW': '#FBBF24'
  };

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Alert Severity Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" />
          <Tooltip />
          <Bar dataKey="value" fill="#3B82F6" radius={[0, 8, 8, 0]} />
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
    <div className="card" style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Demand Forecast</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="lower" stroke="#9CA3AF" strokeDasharray="5 5" name="Confidence Lower" />
          <Line type="monotone" dataKey="predicted" stroke="#3B82F6" strokeWidth={2} name="Predicted" />
          <Line type="monotone" dataKey="upper" stroke="#9CA3AF" strokeDasharray="5 5" name="Confidence Upper" />
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
    <div className="card" style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Top 10 Products by Turnover</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="turnover" fill="#10B981" name="Annual Turnover" />
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

  const colors = { 'A': '#10B981', 'B': '#3B82F6', 'C': '#F59E0B' };

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
        Inventory Classification (Dead Stock: {deadStockCount})
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={abcData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {abcData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[entry.name] || '#6366F1'} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export { ShipmentTrackingChart, BatchExpiryChart, AlertSeverityChart, ForecastChart, InventoryTurnoverChart, DeadStockChart };