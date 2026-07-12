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

  const StatItem = ({ label, value, subtext, color }) => (
    <div style={{
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }}>
      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-muted)', fontWeight: '600' }}>
        {label}
      </span>
      <span style={{ fontSize: '24px', fontWeight: '700', color: color || 'var(--color-ink)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        {value}
      </span>
      {subtext && (
        <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
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
          <h1 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.5px', margin: 0, color: 'var(--color-ink)' }}>Overview</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '4px' }}>Real-time inventory ledger and operational velocity metrics</p>
        </div>
        
        {/* Header Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => document.getElementById('csvUpload').click()}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '600',
              backgroundColor: 'var(--color-canvas)',
              color: 'var(--color-ink)',
              border: '1px solid var(--color-hairline)',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            disabled={importing}
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
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '600',
              backgroundColor: 'var(--color-canvas)',
              color: 'var(--color-ink)',
              border: '1px solid var(--color-hairline)',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
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
          padding: '12px 16px',
          backgroundColor: 'rgba(217, 45, 32, 0.05)',
          border: '1px solid rgba(217, 45, 32, 0.1)',
          borderRadius: '8px',
          color: 'var(--color-danger)',
          fontSize: '13px',
          fontWeight: '500'
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        border: '1px solid var(--color-hairline)',
        borderRadius: '12px',
        backgroundColor: 'var(--color-canvas)',
        divideColor: 'var(--color-hairline)',
        overflow: 'hidden'
      }} className="kpi-banner">
        <StatItem 
          label="Total SKU Count" 
          value={products.length} 
          subtext="Unique catalog records" 
        />
        <div style={{ borderLeft: '1px solid var(--color-hairline)' }}>
          <StatItem 
            label="Inventory Value" 
            value={`$${(totalInventoryValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
            subtext="Calculated asset valuation" 
          />
        </div>
        <div style={{ borderLeft: '1px solid var(--color-hairline)' }}>
          <StatItem 
            label="Understocked" 
            value={lowStockProducts.length} 
            color={lowStockProducts.length > 0 ? 'var(--color-danger)' : undefined}
            subtext="Needs procurement priority" 
          />
        </div>
        <div style={{ borderLeft: '1px solid var(--color-hairline)' }}>
          <StatItem 
            label="Pending Transactions" 
            value={pendingOrders} 
            subtext="Awaiting verification" 
          />
        </div>
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
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-ink)' }}>
              Reorder Queue
            </h3>
            
            {reorderItems.length === 0 ? (
              <p style={{ color: 'var(--color-muted)', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
                All inventory quantities are currently above safety stock thresholds.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reorderItems.slice(0, 4).map(item => (
                  <div key={item.productId} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    border: '1px solid var(--color-hairline)',
                    backgroundColor: 'var(--color-surface-soft)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '70%' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                        In Stock: {item.currentStock} units
                      </span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-danger)' }}>
                      +{item.suggestedReorder}
                    </span>
                  </div>
                ))}
                
                {reorderItems.length > 4 && (
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', textAlign: 'center', marginTop: '6px' }}>
                    + {reorderItems.length - 4} more SKUs require reordering
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      <style>{`
        @media (max-width: 900px) {
          .main-dashboard-grid {
            grid-template-columns: 1fr !important;
          }
          .kpi-banner {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
