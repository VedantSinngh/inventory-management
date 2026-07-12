import React, { useState, useEffect } from 'react';
import { ShoppingCart, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import api from '../services/api';

const ReorderEngine = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [serviceLevelZ, setServiceLevelZ] = useState(1.65);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const resData = await api.get('/reorders/predictive');
      if (resData.data) setData(resData.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchSuggestions(); }, []);

  const handleCheckbox = (id) => setSelectedItems(prev => ({ ...prev, [id]: !prev[id] }));

  const handleBulkPO = async () => {
    const items = data.filter(item => selectedItems[item.productId])
      .map(item => ({ productId: item.productId, quantity: item.suggestedQuantity }));
    if (!items.length) return;
    try {
      await api.post('/reorders/purchase-orders', { items });
      alert('Purchase orders generated!');
      fetchSuggestions();
      setSelectedItems({});
    } catch (e) { alert('Error: ' + e.message); }
  };

  const adjustSafetyStock = (item) => {
    const L = 14, stdDevDemand = 1.5, sigmaL = 2.1;
    const calculatedSafety = serviceLevelZ * Math.sqrt(L * Math.pow(stdDevDemand, 2) + Math.pow(item.avgDailyDemand, 2) * Math.pow(sigmaL, 2));
    const calculatedROP = (item.avgDailyDemand * L) + calculatedSafety;
    return { safetyStock: Math.ceil(calculatedSafety), reorderPoint: Math.ceil(calculatedROP), needsReorder: item.stock <= calculatedROP };
  };

  const selectedCount = Object.values(selectedItems).filter(Boolean).length;
  const serviceLabel = serviceLevelZ <= 1.5 ? '90%' : serviceLevelZ <= 1.8 ? '95%' : '99%';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ marginBottom: '6px' }}>Reorder Engine</h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)' }}>
            Predictive safety-stock analysis with dynamic Z-factor sensitivity
          </p>
        </div>
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="btn-secondary"
          style={{ height: '40px', padding: '0 18px', fontSize: '14px', gap: '6px', display: 'inline-flex', alignItems: 'center' }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Service Level Control */}
      <div style={{ backgroundColor: 'var(--color-surface-card)', border: '1px solid var(--color-hairline)', borderRadius: 'var(--rounded-xl)', padding: '22px 24px' }}>
        <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.96px', color: 'var(--color-muted)', marginBottom: '8px' }}>
          Target service level
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <input
            type="range" min="1.28" max="2.58" step="0.05"
            value={serviceLevelZ}
            onChange={e => setServiceLevelZ(parseFloat(e.target.value))}
            style={{ flex: 1, minWidth: '200px', accentColor: 'var(--color-ink)' }}
          />
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '300', lineHeight: 1 }}>{serviceLabel}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>Service level</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '300', lineHeight: 1 }}>{serviceLevelZ}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>Z-factor</div>
            </div>
          </div>
        </div>
      </div>

      {/* Reorder Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px', color: 'var(--color-muted)' }}>Loading suggestions…</div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', backgroundColor: 'var(--color-surface-card)', border: '1px solid var(--color-hairline)', borderRadius: 'var(--rounded-xl)', color: 'var(--color-muted)' }}>
          <p style={{ fontSize: '16px' }}>No reorder suggestions at this time</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '44px' }}>
                  <input type="checkbox" onChange={() => {
                    const allSelected = data.every(item => selectedItems[item.productId]);
                    const next = {};
                    data.forEach(item => { next[item.productId] = !allSelected; });
                    setSelectedItems(next);
                  }} checked={data.length > 0 && data.every(item => selectedItems[item.productId])} />
                </th>
                <th>Product</th>
                <th>SKU</th>
                <th>Stock</th>
                <th>Avg demand/day</th>
                <th>Safety stock</th>
                <th>Reorder point</th>
                <th>Suggested qty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map(item => {
                const adj = adjustSafetyStock(item);
                return (
                  <tr key={item.productId} style={{ backgroundColor: adj.needsReorder ? '#fff8f8' : undefined }}>
                    <td>
                      <input type="checkbox" checked={!!selectedItems[item.productId]} onChange={() => handleCheckbox(item.productId)} />
                    </td>
                    <td style={{ fontWeight: '500', color: 'var(--color-ink)' }}>{item.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{item.sku}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{item.stock}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{item.avgDailyDemand}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: '600' }}>{adj.safetyStock}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: '600' }}>{adj.reorderPoint}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: '600', color: 'var(--color-ink)' }}>{item.suggestedQuantity}</td>
                    <td>
                      {adj.needsReorder ? (
                        <span className="badge badge-danger" style={{ gap: '4px', display: 'inline-flex', alignItems: 'center' }}>
                          <AlertTriangle size={11} /> Reorder
                        </span>
                      ) : (
                        <span className="badge badge-success" style={{ gap: '4px', display: 'inline-flex', alignItems: 'center' }}>
                          <ShieldCheck size={11} /> Safe
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk Action */}
      {selectedCount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleBulkPO}
            className="btn-primary"
            style={{ height: '42px', padding: '0 24px', fontSize: '15px', gap: '8px', display: 'inline-flex', alignItems: 'center' }}
          >
            <ShoppingCart size={15} /> Create {selectedCount} purchase order{selectedCount > 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReorderEngine;
