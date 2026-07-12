import React, { useContext, useState, useEffect } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { Download, Upload, AlertCircle } from 'lucide-react';
import SimpleInventoryChart from '../components/SimpleInventoryChart';
import SimpleCategoryBreakdown from '../components/SimpleCategoryBreakdown';
import SimpleSalesOverview from '../components/SimpleSalesOverview';

const exportCSV = (data, filename) => {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const Dashboard = () => {
  const { products, orders, api } = useContext(InventoryContext);
  const [advancedMetrics, setAdvancedMetrics] = useState({
    batches: { total: 0, expiringSoon: 0 },
    alerts:  { active: 0, critical: 0 },
  });
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [batchRes, alertRes] = await Promise.all([
          api.get('/batches/analytics/overview').catch(() => ({})),
          api.get('/alerts/analytics/overview').catch(() => ({})),
        ]);
        setAdvancedMetrics({
          batches: batchRes.data || batchRes || {},
          alerts:  alertRes.data  || alertRes  || {},
        });
      } catch (e) { /* silent */ }
    })();
  }, []);

  const lowStock    = products.filter(p => p.stock <= (p.lowStockThreshold || 10));
  const outOfStock  = products.filter(p => p.stock === 0);
  const totalValue  = products.reduce((s, p) => s + ((p.price || 0) * (p.stock || 0)), 0);
  const pendingOrd  = orders.filter(o => o.status === 'PENDING').length;

  const reorderItems = lowStock.map(p => ({
    id: p._id || p.id,
    name: p.name,
    stock: p.stock,
    suggest: Math.max((p.lowStockThreshold || 10) * 2 - p.stock, 1),
  }));

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const lines = ev.target.result.split('\n').map(l => l.trim()).filter(Boolean);
        const headers = lines[0].split(',');
        const data = lines.slice(1).map(line => {
          const vals = line.split(',');
          const obj = {};
          headers.forEach((h, i) => { obj[h.trim()] = vals[i]?.trim() || ''; });
          return obj;
        });
        const ok = window.confirm('This will replace your existing data. Continue?');
        if (!ok) { setImporting(false); return; }
        await api.post('/import', { data, wipeDatabase: true });
        alert('Import successful!');
        window.location.reload();
      } catch (err) {
        alert('Import failed: ' + err.message);
        setImporting(false);
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const stats = [
    {
      label: 'Total SKUs',
      value: products.length.toLocaleString(),
      sub: 'Catalog records',
      accent: 'linear-gradient(90deg, var(--gradient-sky), var(--gradient-mint))',
    },
    {
      label: 'Inventory Value',
      value: `$${Math.round(totalValue).toLocaleString()}`,
      sub: 'Asset valuation',
      accent: 'linear-gradient(90deg, var(--gradient-lavender), var(--gradient-sky))',
    },
    {
      label: 'Understocked',
      value: lowStock.length,
      sub: lowStock.length === 0 ? 'All quantities safe' : 'Below safety threshold',
      accent: lowStock.length > 0
        ? 'linear-gradient(90deg, #fca5a5, var(--gradient-peach))'
        : 'linear-gradient(90deg, var(--gradient-mint), var(--gradient-sky))',
    },
    {
      label: 'Pending Orders',
      value: pendingOrd,
      sub: 'Awaiting verification',
      accent: 'linear-gradient(90deg, var(--gradient-peach), var(--gradient-rose))',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', position: 'relative' }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ marginBottom: '6px' }}>Overview</h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)', letterSpacing: '0.15px' }}>
            Real-time inventory ledger and operational velocity metrics
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => document.getElementById('csvUpload').click()}
            className="btn-secondary"
            disabled={importing}
            style={{ height: '38px', padding: '0 18px', fontSize: '14px', gap: '6px', display: 'flex', alignItems: 'center' }}
          >
            <Upload size={14} /> {importing ? 'Importing…' : 'Import CSV'}
          </button>
          <input type="file" id="csvUpload" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} />
          <button
            onClick={() => exportCSV(products, 'inventory.csv')}
            className="btn-secondary"
            style={{ height: '38px', padding: '0 18px', fontSize: '14px', gap: '6px', display: 'flex', alignItems: 'center' }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Critical alert banner */}
      {(outOfStock.length > 0 || advancedMetrics.alerts?.critical > 0) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '13px 18px',
          backgroundColor: '#fff7f7',
          border: '1px solid var(--color-danger-border)',
          borderRadius: 'var(--rounded-lg)',
          color: 'var(--color-danger)',
          fontSize: '14px',
          fontWeight: '500',
        }}>
          <AlertCircle size={15} />
          {outOfStock.length > 0 && `${outOfStock.length} SKU${outOfStock.length > 1 ? 's' : ''} out of stock. `}
          {advancedMetrics.alerts?.critical > 0 && `${advancedMetrics.alerts.critical} unresolved critical alert${advancedMetrics.alerts.critical > 1 ? 's' : ''}.`}
        </div>
      )}

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {stats.map(s => (
          <div
            key={s.label}
            style={{
              backgroundColor: 'var(--color-surface-card)',
              border: '1px solid var(--color-hairline)',
              borderRadius: 'var(--rounded-xl)',
              overflow: 'hidden',
              transition: 'box-shadow 200ms ease, transform 200ms ease',
              cursor: 'default',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(12,10,9,0.06)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
          >
            {/* Gradient accent bar */}
            <div style={{ height: '3px', background: s.accent }} />
            <div style={{ padding: '22px 24px' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.96px',
                color: 'var(--color-muted)',
                fontFamily: 'var(--font-body)',
                marginBottom: '10px'
              }}>
                {s.label}
              </div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '40px',
                fontWeight: '300',
                lineHeight: 1.05,
                letterSpacing: '-0.96px',
                color: 'var(--color-ink)',
                marginBottom: '6px'
              }}>
                {s.value}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-muted)', letterSpacing: '0.15px' }}>
                {s.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main analytics grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px',
        alignItems: 'start',
      }}>
        {/* Left: charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <SimpleInventoryChart products={products} />
          <SimpleSalesOverview orders={orders} />
        </div>

        {/* Right: breakdown + reorders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <SimpleCategoryBreakdown products={products} />

          <div style={{
            backgroundColor: 'var(--color-surface-card)',
            border: '1px solid var(--color-hairline)',
            borderRadius: 'var(--rounded-xl)',
            padding: '24px',
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.96px',
              color: 'var(--color-muted)',
              marginBottom: '20px',
              fontFamily: 'var(--font-body)',
            }}>
              Reorder Queue
            </div>

            {reorderItems.length === 0 ? (
              <p style={{ color: 'var(--color-muted-soft)', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>
                All quantities above safety stock
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {reorderItems.slice(0, 5).map(item => (
                  <div key={item.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '11px 14px',
                    backgroundColor: 'var(--color-canvas)',
                    border: '1px solid var(--color-hairline)',
                    borderRadius: 'var(--rounded-lg)',
                    transition: 'border-color 150ms',
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-ink)', marginBottom: '2px' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                        {item.stock} units in stock
                      </div>
                    </div>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#9a3412',
                      backgroundColor: '#ffedd5',
                      padding: '3px 10px',
                      borderRadius: 'var(--rounded-pill)',
                      letterSpacing: '0.2px',
                      whiteSpace: 'nowrap'
                    }}>
                      +{item.suggest}
                    </span>
                  </div>
                ))}
                {reorderItems.length > 5 && (
                  <div style={{ fontSize: '13px', color: 'var(--color-muted)', textAlign: 'center', paddingTop: '8px' }}>
                    +{reorderItems.length - 5} more requiring reorder
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .dash-main { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
