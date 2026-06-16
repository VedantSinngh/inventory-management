import React, { useState, useEffect, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { ShipmentTrackingChart, BatchExpiryChart, AlertSeverityChart, ForecastChart, InventoryTurnoverChart, DeadStockChart } from '../components/AdvancedCharts';
import TopProductsChart from '../components/TopProductsChart';
import StockHealthChart from '../components/StockHealthChart';
import StockDistributionChart from '../components/StockDistributionChart';
import SalesVsPurchasesChart from '../components/SalesVsPurchasesChart';
import InventoryTrendChart from '../components/InventoryTrendChart';

const Analytics = () => {
  const { api, products } = useContext(InventoryContext);
  const [shipments, setShipments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({});

  const [skuMargins, setSkuMargins] = useState([]);
  const [plSummary, setPlSummary] = useState([]);

  useEffect(() => {
    fetchAllData();
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    try {
      const [marginsData, plData] = await Promise.all([
        api.get('/finance/sku-margins'),
        api.get('/finance/pl-summary')
      ]);
      if (marginsData.data) setSkuMargins(marginsData.data);
      if (plData.data) setPlSummary(plData.data);
    } catch (error) {
      console.error('Error fetching finance data:', error);
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [shipmentsRes, batchesRes, alertsRes, forecastsRes, ordersRes, warehousesRes] = await Promise.all([
        api.get('/shipments?limit=100'),
        api.get('/batches?limit=100'),
        api.get('/alerts?limit=100'),
        api.get('/forecasts?limit=50'),
        api.get('/orders?limit=100'),
        api.get('/warehouses?limit=100')
      ]);

      setShipments(shipmentsRes.data.shipments || []);
      setBatches(batchesRes.data || []);
      setAlerts(alertsRes.data.alerts || []);
      setForecasts(forecastsRes.data || []);
      setOrders(ordersRes.data?.orders || ordersRes.orders || ordersRes.data || []);
      setWarehouses(warehousesRes.data?.warehouses || warehousesRes.warehouses || warehousesRes.data || warehousesRes || []);

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '20px' }}>
            <ShipmentTrackingChart shipments={shipments} />
            <BatchExpiryChart batches={batches} />
            <AlertSeverityChart alerts={alerts} />
            <ForecastChart forecasts={forecasts} />
            <InventoryTurnoverChart products={products} />
            <DeadStockChart products={products} />
          </div>

          {/* Extended Analytics Grid */}
          <h2 style={{ fontSize: '24px', marginTop: '20px', marginBottom: '10px' }}>Extended Analytics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '20px' }}>
            <TopProductsChart products={products} orders={orders} />
            <StockHealthChart products={products} warehouses={warehouses} />
            <StockDistributionChart products={products} />
            <SalesVsPurchasesChart orders={orders} />
            <InventoryTrendChart products={products} orders={orders} />
          </div>

          {/* FIFO COGS Monthly P&L Table */}
          <div style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>FIFO Monthly P&L Ledger Summary</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '12px' }}>Month / Year</th>
                  <th style={{ padding: '12px' }}>Orders Count</th>
                  <th style={{ padding: '12px' }}>Total Revenue</th>
                  <th style={{ padding: '12px' }}>Total COGS</th>
                  <th style={{ padding: '12px' }}>Gross Profit</th>
                  <th style={{ padding: '12px' }}>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {plSummary.map(row => (
                  <tr key={row.month} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{row.month}</td>
                    <td style={{ padding: '12px' }}>{row.ordersCount}</td>
                    <td style={{ padding: '12px' }}>${row.revenue}</td>
                    <td style={{ padding: '12px' }}>${row.cogs}</td>
                    <td style={{ padding: '12px', color: '#10b981', fontWeight: 'bold' }}>${row.grossProfit}</td>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{row.marginPercentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SKU Gross Margins Table */}
          <div style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Gross Margin Per Product SKU (FIFO Based)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '12px' }}>Product SKU</th>
                  <th style={{ padding: '12px' }}>Product Name</th>
                  <th style={{ padding: '12px' }}>Units Sold</th>
                  <th style={{ padding: '12px' }}>Revenue</th>
                  <th style={{ padding: '12px' }}>COGS</th>
                  <th style={{ padding: '12px' }}>Gross Profit</th>
                  <th style={{ padding: '12px' }}>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {skuMargins.map(row => (
                  <tr key={row.sku} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{row.sku}</td>
                    <td style={{ padding: '12px' }}>{row.name}</td>
                    <td style={{ padding: '12px' }}>{row.salesQuantity}</td>
                    <td style={{ padding: '12px' }}>${row.revenue}</td>
                    <td style={{ padding: '12px' }}>${row.cogs}</td>
                    <td style={{ padding: '12px', color: '#10b981', fontWeight: 'bold' }}>${row.grossProfit}</td>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{row.marginPercentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;