import React, { useContext, useState, useEffect } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { Download, AlertCircle, TrendingUp, Package, Truck, AlertTriangle, Clock, Zap } from 'lucide-react';
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

  useEffect(() => {
    fetchAdvancedMetrics();
  }, []);

  const fetchAdvancedMetrics = async () => {
    try {
      const [shipmentsRes, batchesRes, alertsRes, forecastsRes] = await Promise.all([
        api.get('/api/shipments?limit=1').catch(() => ({ data: { pagination: { total: 0 }, shipments: [] } })),
        api.get('/api/batches/analytics/overview').catch(() => ({})),
        api.get('/api/alerts/analytics/overview').catch(() => ({})),
        api.get('/api/forecasts/analytics/overview').catch(() => ({}))
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

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="card" style={{ flex: 1, minWidth: '200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
            {title}
          </div>
          <div style={{
            fontSize: '32px',
            fontFamily: 'var(--font-heading)',
            fontWeight: 'bold',
            color: color || 'var(--color-text-heading)'
          }}>
            {value}
          </div>
        </div>
        {Icon && <Icon size={24} color={color || 'var(--color-accent)'} strokeWidth={1.5} />}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Alerts */}
      {(outOfStockProducts.length > 0 || lowStockProducts.length > 0 || advancedMetrics.alerts.critical > 0) && (
        <div className="alert-banner" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle size={20} />
          <span>
            <strong>⚠️ ATTENTION NEEDED:</strong>
            {outOfStockProducts.length > 0 && ` ${outOfStockProducts.length} items OUT OF STOCK`}
            {outOfStockProducts.length > 0 && lowStockProducts.length > 0 && ' |'}
            {lowStockProducts.length > 0 && ` ${lowStockProducts.length} items LOW ON STOCK`}
            {advancedMetrics.alerts.critical > 0 && ` | ${advancedMetrics.alerts.critical} CRITICAL ALERTS`}
          </span>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        <StatCard
          title="Total Products"
          value={products.length}
          icon={Package}
          color="#3B82F6"
        />
        <StatCard
          title="Inventory Value"
          value={`$${(totalInventoryValue / 1000).toFixed(0)}k`}
          icon={TrendingUp}
          color="#10B981"
        />
        <StatCard
          title="Low Stock Items"
          value={lowStockProducts.length}
          icon={AlertCircle}
          color={lowStockProducts.length > 0 ? '#EF4444' : '#10B981'}
        />
        <StatCard
          title="Pending Orders"
          value={pendingOrders}
          icon={Package}
          color="#F59E0B"
        />
      </div>

      {/* Advanced Features KPI Cards */}
      {!loading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
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
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => exportCSV(products, 'inventory_export.csv')}
          className="btn-outline"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px'
          }}
        >
          <Download size={16} /> EXPORT INVENTORY
        </button>
        <button
          onClick={() => window.location.href = '/analytics'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            backgroundColor: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          VIEW ANALYTICS
        </button>
      </div>

      {/* Charts Row 1 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px'
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
            padding: '20px',
            backgroundColor: 'var(--color-bg-primary)',
            borderRadius: '6px'
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
                  backgroundColor: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  padding: '12px',
                  borderLeft: '3px solid #EF4444'
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
