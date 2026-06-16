import React, { useContext, useState, useEffect } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { Download, AlertCircle, TrendingUp, Package, Truck, AlertTriangle, Clock, Zap, Upload } from 'lucide-react';
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
  const { products, orders, warehouses, api } = useContext(InventoryContext);
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
          total: shipmentsRes.data.pagination?.total || 0,
          inTransit: shipmentsRes.data.shipments?.filter(s => s.status === 'IN_TRANSIT').length || 0,
          delivered: shipmentsRes.data.shipments?.filter(s => s.status === 'DELIVERED').length || 0
        },
        batches: batchesRes.data || { total: 0, expiringSoon: 0, expired: 0 },
        alerts: alertsRes.data || { total: 0, critical: 0, active: 0 },
        forecasts: forecastsRes.data || { total: 0, approved: 0 }
      });
    } catch (error) {
      console.error('Error fetching advanced metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate key metrics
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

        await api.importCsv(data, true);
        alert('Import successful! Reloading dashboard...');
        window.location.reload();
      } catch (error) {
        console.error("Import error", error);
        alert("Failed to import: " + error.message);
        setImporting(false);
      }
    };
    reader.readAsText(file);
    // reset input
    e.target.value = null;
  };

  const StatCard = ({ title, value, icon: Icon, color, delta }) => (
    <div className="card" style={{ flex: 1, minWidth: '200px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {Icon && <Icon size={20} color="var(--color-accent)" strokeWidth={1.5} />}
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
            {title}
          </div>
        </div>
      </div>
      <div style={{
        fontSize: '32px',
        fontWeight: '700',
        letterSpacing: '-0.5px',
        color: 'var(--color-text-primary)',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1
      }}>
        {value}
      </div>
      {delta && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '12px' }}>
          <span style={{ color: delta.type === 'up' ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {delta.type === 'up' ? '↑' : '↓'} {delta.value}
          </span>
          <span style={{ color: 'var(--color-text-tertiary)' }}>vs last month</span>
        </div>
      )}
    </div>
  );

  return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Alerts */}
      {(outOfStockProducts.length > 0 || lowStockProducts.length > 0 || advancedMetrics.alerts.critical > 0) && (
        <div className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: 'var(--rounded-none)', width: '100%', justifyContent: 'flex-start', border: '1px solid var(--color-danger)' }}>
          <AlertCircle size={20} />
          <span style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px', fontWeight: '700' }}>
            <strong>SYSTEM ALERTS:</strong>
            {outOfStockProducts.length > 0 && ` ${outOfStockProducts.length} items OUT OF STOCK`}
            {outOfStockProducts.length > 0 && lowStockProducts.length > 0 && ' |'}
            {lowStockProducts.length > 0 && ` ${lowStockProducts.length} items LOW ON STOCK`}
            {advancedMetrics.alerts.critical > 0 && ` | ${advancedMetrics.alerts.critical} CRITICAL SECURITY / QUALITY ERRORS`}
          </span>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        <StatCard
          title="Total Products"
          value={products.length}
          icon={Package}
          delta={{ type: 'up', value: '4.8%' }}
        />
        <StatCard
          title="Inventory Value"
          value={`$${(totalInventoryValue / 1000).toFixed(0)}k`}
          icon={TrendingUp}
          delta={{ type: 'up', value: '12.4%' }}
        />
        <StatCard
          title="Low Stock Items"
          value={lowStockProducts.length}
          icon={AlertCircle}
          delta={lowStockProducts.length > 0 ? { type: 'down', value: `${lowStockProducts.length} items` } : null}
        />
        <StatCard
          title="Pending Orders"
          value={pendingOrders}
          icon={Package}
          delta={{ type: 'up', value: '8%' }}
        />
      </div>

      {/* Advanced Features KPI Cards */}
      {!loading && (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px'
      }}>
          <StatCard
            title="Active Shipments"
            value={advancedMetrics.shipments.inTransit}
            icon={Truck}
            color="#8B5CF6"
          />
          <StatCard
            title="Expiring Soon"
            value={advancedMetrics.batches.expiringSoon}
            icon={Clock}
            color={advancedMetrics.batches.expiringSoon > 0 ? '#F59E0B' : '#10B981'}
          />
          <StatCard
            title="Critical Alerts"
            value={advancedMetrics.alerts.critical}
            icon={AlertTriangle}
            color={advancedMetrics.alerts.critical > 0 ? '#EF4444' : '#10B981'}
          />
          <StatCard
            title="Demand Forecasts"
            value={advancedMetrics.forecasts.approved}
            icon={Zap}
            color="#10B981"
          />
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '24px', marginBottom: '24px' }}>
        <button
          onClick={() => document.getElementById('csvUpload').click()}
          className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          disabled={importing}
        >
          <Upload size={16} /> {importing ? 'IMPORTING...' : 'IMPORT DATA'}
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
          className="btn-ghost"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Download size={16} /> EXPORT INVENTORY
        </button>
        <button
          onClick={() => window.location.href = '/analytics'}
          className="btn-solid"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          VIEW ANALYTICS
        </button>
      </div>

      {/* Charts Row 1 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '16px'
      }}>
        <SimpleInventoryChart products={products} />
        <SimpleCategoryBreakdown products={products} />
      </div>

      {/* Sales Overview */}
      <SimpleSalesOverview orders={orders} />

      {/* Reorder Recommendations */}
      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', textTransform: 'uppercase' }}>
          🔔 Reorder Recommendations
        </h3>

        {reorderItems.length === 0 ? (
          <p style={{
            color: 'var(--color-text-muted)',
            fontSize: '13px',
            textAlign: 'center',
            padding: '24px',
            backgroundColor: 'var(--color-surface-soft)',
            borderRadius: 'var(--rounded-none)',
            border: '1px solid var(--color-hairline)'
          }}>
            ✅ All inventory levels are optimal. No reorders needed.
          </p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '12px'
          }}>
            {reorderItems.slice(0, 6).map(item => (
              <div
                key={item.productId}
                style={{
                  backgroundColor: 'var(--color-surface-soft)',
                  border: '1px solid var(--color-hairline)',
                  borderRadius: 'var(--rounded-none)',
                  padding: '16px',
                  borderLeft: '4px solid var(--color-m-red)'
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', maxHeight: '34px', overflow: 'hidden' }}>
                  {item.name}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Current:</span>
                  <span>{item.currentStock} units</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Reorder:</span>
                  <span style={{ color: '#EF4444', fontWeight: 'bold' }}>+{item.suggestedReorder}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {reorderItems.length > 6 && (
          <p style={{
            color: 'var(--color-text-muted)',
            fontSize: '11px',
            marginTop: '12px',
            textAlign: 'center'
          }}>
            ... and {reorderItems.length - 6} more items need reordering
          </p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
