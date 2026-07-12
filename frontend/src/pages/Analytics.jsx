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

  useEffect(() => { fetchAllData(); fetchFinanceData(); }, []);

  const fetchFinanceData = async () => {
    try {
      const [marginsData, plData] = await Promise.all([
        api.get('/finance/sku-margins'),
        api.get('/finance/pl-summary')
      ]);
      if (marginsData.data) setSkuMargins(marginsData.data);
      if (plData.data) setPlSummary(plData.data);
    } catch (e) { console.error(e); }
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
      const sh = shipmentsRes.data.shipments || [];
      const ba = batchesRes.data || [];
      const al = alertsRes.data.alerts || [];
      setShipments(sh); setBatches(ba); setAlerts(al);
      setForecasts(forecastsRes.data || []);
      setOrders(ordersRes.data?.orders || ordersRes.orders || ordersRes.data || []);
      setWarehouses(warehousesRes.data?.warehouses || warehousesRes.warehouses || warehousesRes.data || warehousesRes || []);

      const deliveredCount = sh.filter(s => s.status === 'DELIVERED').length;
      const expiredBatches = ba.filter(b => new Date(b.expiryDate) < new Date()).length;
      const criticalAlerts = al.filter(a => a.severity === 'CRITICAL').length;
      const resolvedAlerts = al.filter(a => a.status === 'RESOLVED').length;
      const avgTurnover = products.length > 0
        ? (products.reduce((sum, p) => sum + (p.turnoverRate || 0), 0) / products.length).toFixed(2)
        : 0;
      setMetrics({
        deliveryRate: sh.length > 0 ? ((deliveredCount / sh.length) * 100).toFixed(1) : 0,
        batchHealth: ba.length > 0 ? (((ba.length - expiredBatches) / ba.length) * 100).toFixed(1) : 100,
        criticalAlerts, resolvedAlerts, avgTurnover,
        totalShipments: sh.length, totalBatches: ba.length, totalAlerts: al.length
      });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const kpis = [
    { label: 'Delivery rate', value: `${metrics.deliveryRate}%`, sub: `${metrics.totalShipments} shipments`, accent: 'linear-gradient(90deg, var(--gradient-sky), var(--gradient-mint))' },
    { label: 'Batch health', value: `${metrics.batchHealth}%`, sub: `${metrics.totalBatches} batches`, accent: 'linear-gradient(90deg, var(--gradient-mint), var(--gradient-lavender))' },
    { label: 'Avg turnover', value: `${metrics.avgTurnover}x`, sub: 'Annual rotation', accent: 'linear-gradient(90deg, var(--gradient-lavender), var(--gradient-sky))' },
    { label: 'Active alerts', value: metrics.criticalAlerts, sub: `${metrics.resolvedAlerts} resolved`, accent: 'linear-gradient(90deg, var(--gradient-peach), var(--gradient-rose))' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      {/* Page Header */}
      <div>
        <h1 style={{ marginBottom: '6px' }}>Analytics</h1>
        <p style={{ fontSize: '15px', color: 'var(--color-muted)' }}>
          Performance metrics, financial ledgers, and inventory intelligence
        </p>
      </div>

      {/* KPI Cards */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {kpis.map(k => (
            <div key={k.label} style={{
              backgroundColor: 'var(--color-surface-card)',
              border: '1px solid var(--color-hairline)',
              borderRadius: 'var(--rounded-xl)',
              overflow: 'hidden'
            }}>
              <div style={{ height: '3px', background: k.accent }} />
              <div style={{ padding: '20px 22px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.96px', color: 'var(--color-muted)', marginBottom: '8px' }}>{k.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: '300', color: 'var(--color-ink)', letterSpacing: '-0.72px', lineHeight: 1, marginBottom: '4px' }}>{k.value}</div>
                <div style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{k.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-muted)' }}>Loading analytics…</div>
      ) : (
        <>
          {/* Charts: Primary Grid */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.96px', color: 'var(--color-muted)', marginBottom: '20px' }}>
              Operational charts
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px' }}>
              <ShipmentTrackingChart shipments={shipments} />
              <BatchExpiryChart batches={batches} />
              <AlertSeverityChart alerts={alerts} />
              <ForecastChart forecasts={forecasts} />
              <InventoryTurnoverChart products={products} />
              <DeadStockChart products={products} />
            </div>
          </div>

          {/* Extended Charts */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.96px', color: 'var(--color-muted)', marginBottom: '20px' }}>
              Extended analytics
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px' }}>
              <TopProductsChart products={products} orders={orders} />
              <StockHealthChart products={products} warehouses={warehouses} />
              <StockDistributionChart products={products} />
              <SalesVsPurchasesChart orders={orders} />
              <InventoryTrendChart products={products} orders={orders} />
            </div>
          </div>

          {/* FIFO P&L Table */}
          <div style={{ backgroundColor: 'var(--color-surface-card)', border: '1px solid var(--color-hairline)', borderRadius: 'var(--rounded-xl)', overflow: 'hidden' }}>
            <div style={{ padding: '22px 24px', borderBottom: '1px solid var(--color-hairline)' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.96px', color: 'var(--color-muted)', marginBottom: '4px' }}>Monthly P&L</div>
              <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: '500' }}>FIFO Cost of Goods Sold Ledger</h3>
            </div>
            <div className="table-container" style={{ borderRadius: 0, border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    {['Month', 'Orders', 'Revenue', 'COGS', 'Gross profit', 'Margin %'].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {plSummary.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '32px' }}>No P&L data available</td></tr>
                  ) : plSummary.map(row => (
                    <tr key={row.month}>
                      <td style={{ fontWeight: '500', color: 'var(--color-ink)' }}>{row.month}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{row.ordersCount}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>${row.revenue?.toLocaleString()}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>${row.cogs?.toLocaleString()}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: '600', color: 'var(--color-success)' }}>${row.grossProfit?.toLocaleString()}</td>
                      <td style={{ fontWeight: '600' }}>{row.marginPercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SKU Margins Table */}
          <div style={{ backgroundColor: 'var(--color-surface-card)', border: '1px solid var(--color-hairline)', borderRadius: 'var(--rounded-xl)', overflow: 'hidden' }}>
            <div style={{ padding: '22px 24px', borderBottom: '1px solid var(--color-hairline)' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.96px', color: 'var(--color-muted)', marginBottom: '4px' }}>Product margins</div>
              <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: '500' }}>Gross Margin Per SKU (FIFO)</h3>
            </div>
            <div className="table-container" style={{ borderRadius: 0, border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    {['SKU', 'Product', 'Units sold', 'Revenue', 'COGS', 'Gross profit', 'Margin %'].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {skuMargins.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '32px' }}>No SKU margin data available</td></tr>
                  ) : skuMargins.map(row => (
                    <tr key={row.sku}>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{row.sku}</td>
                      <td style={{ fontWeight: '500', color: 'var(--color-ink)' }}>{row.name}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{row.salesQuantity}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>${row.revenue?.toLocaleString()}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>${row.cogs?.toLocaleString()}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: '600', color: 'var(--color-success)' }}>${row.grossProfit?.toLocaleString()}</td>
                      <td style={{ fontWeight: '600' }}>{row.marginPercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;