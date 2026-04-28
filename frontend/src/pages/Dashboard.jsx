import React, { useContext, useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { InventoryContext } from '../context/InventoryContext';
import { AuthContext } from '../context/AuthContext';
import { Download } from 'lucide-react';

const exportCSV = (data, filename) => {
  const headers = Object.keys(data[0] || {}).join(',');
  const rows = data.map(row => Object.values(row).join(',')).join('\n');
  const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const data = [
  { name: 'MON', val: 4000 },
  { name: 'TUE', val: 3000 },
  { name: 'WED', val: 2000 },
  { name: 'THU', val: 2780 },
  { name: 'FRI', val: 1890 },
  { name: 'SAT', val: 2390 },
  { name: 'SUN', val: 3490 },
];

const StatCard = ({ title, value }) => (
  <div className="card" style={{ flex: 1 }}>
    <div style={{ fontSize: '48px', fontFamily: 'var(--font-heading)', color: 'var(--color-text-heading)' }}>{value}</div>
    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{title}</div>
  </div>
);

const Dashboard = () => {
  const { products, orders } = useContext(InventoryContext);
  
  const lowStockProducts = products.filter(p => p.stock <= (p.lowStockThreshold || 10));
  const pendingOrders = orders.filter(o => o.status === 'PENDING').length;

  const suggestions = lowStockProducts.map(p => ({
    productId: p._id || p.id,
    name: p.name,
    currentStock: p.stock,
    suggestedReorder: Math.max((p.lowStockThreshold || 10) * 2 - p.stock, 1),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {lowStockProducts.length > 0 && (
        <div className="alert-banner">
          <span><strong style={{ letterSpacing: '0.05em' }}>ALERT:</strong> {lowStockProducts.length} ITEMS RUNNING LOW ON STOCK</span>
          <button style={{ color: 'var(--color-bg-primary)', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px' }}>
        <StatCard title="Total Products" value={products.length} />
        <StatCard title="Low Stock Items" value={lowStockProducts.length} />
        <StatCard title="Pending Orders" value={pendingOrders} />
        <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <button onClick={() => exportCSV(products, 'inventory_export.csv')} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Download size={14} /> EXPORT CSV
           </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        <div className="card" style={{ flex: 2, height: '400px' }}>
          <h3 style={{ fontSize: '20px', marginBottom: '20px' }}>INVENTORY MOVEMENT (7 DAYS)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <Line type="step" dataKey="val" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="card" style={{ flex: 1, overflowY: 'auto', maxHeight: '400px' }}>
          <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>REORDER INTELLIGENCE</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {suggestions.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>NO SUGGESTIONS AT THIS TIME</p>
            ) : (
              suggestions.map(s => (
                <div key={s.productId} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{s.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>SUGGESTED BUY:</span>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>+{s.suggestedReorder} UNITS</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
