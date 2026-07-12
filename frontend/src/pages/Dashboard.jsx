import React, { useContext, useState, useEffect } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { Download, AlertCircle, TrendingUp, Package, Truck, AlertTriangle, Clock, Zap, Upload, Layout } from 'lucide-react';
import SimpleInventoryChart from '../components/SimpleInventoryChart';
import SimpleCategoryBreakdown from '../components/SimpleCategoryBreakdown';
import SimpleSalesOverview from '../components/SimpleSalesOverview';

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

const Dashboard = () => {
  const { products, orders, api } = useContext(InventoryContext);
  const [advancedMetrics, setAdvancedMetrics] = useState({
    shipments: { total: 0, inTransit: 0, delivered: 0 },
    batches: { total: 0, expiringSoon: 0, expired: 0 },
    alerts: { total: 0, critical: 0, active: 0 },
    forecasts: { total: 0, approved: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchAdvancedMetrics();
  }, []);

  const fetchAdvancedMetrics = async () => {
    try {
      const [shipmentsRes, batchesRes, alertsRes, forecastsRes] = await Promise.all([
        api.get('/shipments?limit=1').catch(() => ({ data: { pagination: { total: 0 }, shipments: [] } })),
        api.get('/batches/analytics/overview').catch(() => ({})),
        api.get('/alerts/analytics/overview').catch(() => ({})),
        api.get('/forecasts/analytics/overview').catch(() => ({}))
      ]);

      setAdvancedMetrics({
        shipments: {
          total: shipmentsRes.data?.pagination?.total || 0,
          inTransit: shipmentsRes.data?.shipments?.filter(s => s.status === 'IN_TRANSIT').length || 0,
          delivered: shipmentsRes.data?.shipments?.filter(s => s.status === 'DELIVERED').length || 0
        },
        batches: batchesRes.data || batches || { total: 0, expiringSoon: 0, expired: 0 },
        alerts: alertsRes.data || { total: 0, critical: 0, active: 0 },
        forecasts: forecastsRes.data || { total: 0, approved: 0 }
      });
    } catch (error) {
      console.error('Error fetching advanced metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const lowStockProducts = products.filter(p => p.stock <= (p.lowStockThreshold || 10));
  const outOfStockProducts = products.filter(p => p.stock === 0);
  const totalInventoryValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);
  const pendingOrders = orders.filter(o => o.status === 'PENDING').length;

  const reorderItems = lowStockProducts.map(p => ({
    productId: p._id || p.id,
    name: p.name,
    currentStock: p.stock,
    suggestedReorder: Math.max((p.lowStockThreshold || 10) * 2 - p.stock, 1),
  }));

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 2) throw new Error("CSV must have a header and at least one data row");
        
        const headers = lines[0].split(',');
        const data = lines.slice(1).map(line => {
          const values = line.split(',');
          const obj = {};
          headers.forEach((header, index) => {
            obj[header.trim()] = values[index] ? values[index].trim() : '';
          });
          return obj;
        });

        const confirmWipe = window.confirm("WARNING: This will wipe your existing database to import the new data. Continue?");
        if (!confirmWipe) {
          setImporting(false);
          return;
        }

        await api.post('/import', { data, wipeDatabase: true });
        alert('Import successful! Reloading dashboard...');
        window.location.reload();
      } catch (error) {
        console.error("Import error", error);
        alert("Failed to import: " + error.message);
        setImporting(false);
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const StatItem = ({ label, value, subtext, gradient, glowColor }) => (
    <div 
      className="dashboard-stat-card"
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: 'var(--color-canvas)',
        borderRadius: '16px',
        border: '1px solid var(--color-hairline)',
        boxShadow: `0 4px 20px rgba(0, 0, 0, 0.02)`,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'default'
      }}
    >
      {/* Top Border Glow Accent */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: gradient
      }} />

      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--color-muted)', fontWeight: '700' }}>
        {label}
      </span>
      <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
        {value}
      </span>
      {subtext && (
        <span style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: glowColor, display: 'inline-block' }} />
          {subtext}
        </span>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.8px', margin: 0, color: 'var(--color-ink)' }}>Overview</h1>
          <p style={{ fontSize: '13.5px', color: 'var(--color-muted)', marginTop: '4px' }}>Real-time inventory ledger and operational velocity metrics</p>
        </div>
        
        {/* Header Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => document.getElementById('csvUpload').click()}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: '600',
              backgroundColor: 'var(--color-canvas)',
              color: 'var(--color-ink)',
              border: '1px solid var(--color-hairline)',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 150ms'
            }}
            disabled={importing}
            className="action-btn"
          >
            <Upload size={14} /> {importing ? 'Importing...' : 'Import CSV'}
          </button>
          <input 
            type="file" 
            id="csvUpload" 
            accept=".csv" 
            style={{ display: 'none' }} 
            onChange={handleFileUpload} 
          />
          <button
            onClick={() => exportCSV(products, 'inventory_export.csv')}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: '600',
              backgroundColor: 'var(--color-canvas)',
              color: 'var(--color-ink)',
              border: '1px solid var(--color-hairline)',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 150ms'
            }}
            className="action-btn"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Critical Alert Bar */}
      {(outOfStockProducts.length > 0 || lowStockProducts.length > 0 || advancedMetrics.alerts.critical > 0) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 20px',
          backgroundColor: 'rgba(217, 45, 32, 0.04)',
          border: '1px solid rgba(217, 45, 32, 0.08)',
          borderRadius: '12px',
          color: 'var(--color-danger)',
          fontSize: '13.5px',
          fontWeight: '600',
          boxShadow: '0 2px 10px rgba(217, 45, 32, 0.02)'
        }}>
          <AlertCircle size={16} />
          <span>
            {outOfStockProducts.length > 0 && `${outOfStockProducts.length} items out of stock. `}
            {lowStockProducts.length > 0 && `${lowStockProducts.length} items below safety threshold. `}
            {advancedMetrics.alerts.critical > 0 && `${advancedMetrics.alerts.critical} unresolved critical issues.`}
          </span>
        </div>
      )}

      {/* Minimalist KPI Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px'
      }}>
        <StatItem 
          label="Total SKU Count" 
          value={products.length} 
          subtext="Unique catalog records" 
          gradient="linear-gradient(90deg, #3b82f6, #60a5fa)"
          glowColor="#3b82f6"
        />
        <StatItem 
          label="Inventory Value" 
          value={`$${(totalInventoryValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
          subtext="Asset valuation" 
          gradient="linear-gradient(90deg, #6366f1, #818cf8)"
          glowColor="#6366f1"
        />
        <StatItem 
          label="Understocked" 
          value={lowStockProducts.length} 
          subtext="Procurement priority" 
          gradient="linear-gradient(90deg, #f59e0b, #fbbf24)"
          glowColor={lowStockProducts.length > 0 ? 'var(--color-danger)' : '#f59e0b'}
        />
        <StatItem 
          label="Pending Orders" 
          value={pendingOrders} 
          subtext="Awaiting verification" 
          gradient="linear-gradient(90deg, #10b981, #34d399)"
          glowColor="#10b981"
        />
      </div>

      {/* Primary Analytics Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px',
        alignItems: 'start'
      }} className="main-dashboard-grid">
        
        {/* Left Column: Trend Charts and Ledgers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <SimpleInventoryChart products={products} />
          
          <SimpleSalesOverview orders={orders} />
        </div>

        {/* Right Column: Category & Reorders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <SimpleCategoryBreakdown products={products} />

          {/* Reorders Card */}
          <div className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--color-hairline)', boxShadow: '0 4px 20px rgba(0,0,0,0.01)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--color-ink)' }}>
              Reorder Queue
            </h3>
            
            {reorderItems.length === 0 ? (
              <p style={{ color: 'var(--color-muted)', fontSize: '13.5px', textAlign: 'center', padding: '32px 0' }}>
                All inventory quantities are currently above safety stock thresholds.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reorderItems.slice(0, 4).map(item => (
                  <div key={item.productId} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    border: '1px solid var(--color-hairline)',
                    backgroundColor: 'var(--color-surface-soft)',
                    borderRadius: '10px',
                    transition: 'transform 150ms'
                  }} className="reorder-item-row">
                    <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '70%' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                        Stock Level: <strong style={{ color: 'var(--color-danger)' }}>{item.currentStock} units</strong>
                      </span>
                    </div>
                    <span style={{ 
                      fontSize: '12px', 
                      fontWeight: '700', 
                      color: '#9a3412',
                      backgroundColor: '#ffedd5',
                      padding: '4px 8px',
                      borderRadius: '6px'
                    }}>
                      +{item.suggestedReorder} Qty
                    </span>
                  </div>
                ))}
                
                {reorderItems.length > 4 && (
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', textAlign: 'center', marginTop: '8px', fontWeight: '500' }}>
                    + {reorderItems.length - 4} more SKUs require reordering
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      <style>{`
        .dashboard-stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04) !important;
          border-color: var(--color-muted) !important;
        }
        .action-btn:hover {
          background-color: var(--color-surface-soft) !important;
          border-color: var(--color-muted) !important;
        }
        .reorder-item-row:hover {
          transform: translateX(2px);
        }
        @media (max-width: 900px) {
          .main-dashboard-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
