import React, { useState, useEffect, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { ShipmentTrackingChart, BatchExpiryChart, AlertSeverityChart, ForecastChart, InventoryTurnoverChart, DeadStockChart } from '../components/AdvancedCharts';

const Analytics = () => {
  const { api, products } = useContext(InventoryContext);
  const [shipments, setShipments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [shipmentsRes, batchesRes, alertsRes, forecastsRes] = await Promise.all([
        api.get('/api/shipments?limit=100'),
        api.get('/api/batches?limit=100'),
        api.get('/api/alerts?limit=100'),
        api.get('/api/forecasts?limit=50')
      ]);

      setShipments(shipmentsRes.data.shipments || []);
      setBatches(batchesRes.data || []);
      setAlerts(alertsRes.data.alerts || []);
      setForecasts(forecastsRes.data || []);

      // Calculate metrics
      calculateMetrics(shipmentsRes.data.shipments || [], batchesRes.data || [], alertsRes.data.alerts || []);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (shp, bat, alrt) => {
    const deliveredCount = shp.filter(s => s.status === 'DELIVERED').length;
    const deliveryRate = shp.length > 0 ? ((deliveredCount / shp.length) * 100).toFixed(1) : 0;

    const expiredBatches = bat.filter(b => new Date(b.expiryDate) < new Date()).length;
    const batchHealth = bat.length > 0 ? (((bat.length - expiredBatches) / bat.length) * 100).toFixed(1) : 100;

    const criticalAlerts = alrt.filter(a => a.severity === 'CRITICAL').length;
    const resolvedAlerts = alrt.filter(a => a.status === 'RESOLVED').length;

    const avgTurnover = products.length > 0
      ? (products.reduce((sum, p) => sum + (p.turnoverRate || 0), 0) / products.length).toFixed(2)
      : 0;

    setMetrics({
      deliveryRate,
      batchHealth,
      criticalAlerts,
      resolvedAlerts,
      avgTurnover,
      totalShipments: shp.length,
      totalBatches: bat.length,
      totalAlerts: alrt.length
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>Advanced Analytics Dashboard</h1>

      {/* KPI Cards */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '16px', textAlign: 'center', borderTop: '4px solid #3B82F6' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Delivery Rate
            </div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#3B82F6' }}>{metrics.deliveryRate}%</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
              {metrics.totalShipments} total shipments
            </div>
          </div>

          <div className="card" style={{ padding: '16px', textAlign: 'center', borderTop: '4px solid #10B981' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Batch Health
            </div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#10B981' }}>{metrics.batchHealth}%</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
              {metrics.totalBatches} batches tracked
            </div>
          </div>

          <div className="card" style={{ padding: '16px', textAlign: 'center', borderTop: '4px solid #F59E0B' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Avg Turnover
            </div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#F59E0B' }}>{metrics.avgTurnover}x</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
              Annual rotation rate
            </div>
          </div>

          <div className="card" style={{ padding: '16px', textAlign: 'center', borderTop: '4px solid #EF4444' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Active Alerts
            </div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#EF4444' }}>{metrics.criticalAlerts}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
              {metrics.resolvedAlerts} resolved
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
          Loading analytics...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '20px' }}>
          <ShipmentTrackingChart shipments={shipments} />
          <BatchExpiryChart batches={batches} />
          <AlertSeverityChart alerts={alerts} />
          <ForecastChart forecasts={forecasts} />
          <InventoryTurnoverChart products={products} />
          <DeadStockChart products={products} />
        </div>
      )}
    </div>
  );
};

export default Analytics;