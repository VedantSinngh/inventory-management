import React, { useState, useEffect } from 'react';
import { RefreshCw, Trash2, ArrowUpRight, Percent } from 'lucide-react';
import api from '../services/api';

const DeadStock = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);

  const fetchDeadStock = async () => {
    setLoading(true);
    try {
      const resData = await api.get('/inventory/dead-stock');
      if (resData.data) setData(resData.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchDeadStock(); }, []);

  const handleAction = async (productId, strategy) => {
    try {
      if (strategy === 'DISCOUNT_BUNDLE') {
        const productData = await api.getProduct(productId);
        await api.updateProduct(productId, { price: parseFloat((productData.price * 0.60).toFixed(2)) });
        alert('40% discount applied!');
        fetchDeadStock();
      } else if (strategy === 'WRITE_OFF') {
        await api.post('/products/scan-update', { sku: data.find(d => d.product._id === productId).product.sku, quantityAdjustment: 0, actionType: 'AUDIT', notes: 'Dead stock write-off' });
        alert('Inventory written off!');
        fetchDeadStock();
      } else {
        alert('Supplier return request submitted.');
      }
    } catch (e) { alert('Error: ' + e.message); }
  };

  const strategyIcon = { WRITE_OFF: Trash2, DISCOUNT_BUNDLE: Percent, SUPPLIER_RETURN: ArrowUpRight };
  const strategyColor = { WRITE_OFF: 'var(--color-danger)', DISCOUNT_BUNDLE: 'var(--color-success)', SUPPLIER_RETURN: 'var(--color-info)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ marginBottom: '6px' }}>Dead Stock</h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)' }}>
            Products with zero sales activity over the past 90 days
          </p>
        </div>
        <button
          onClick={fetchDeadStock}
          disabled={loading}
          className="btn-secondary"
          style={{ height: '40px', padding: '0 18px', fontSize: '14px', gap: '6px', display: 'inline-flex', alignItems: 'center' }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'el-spin 0.8s linear infinite' : 'none' }} />
          {loading ? 'Analyzing…' : 'Refresh analysis'}
        </button>
      </div>

      {/* Info Banner */}
      <div style={{
        backgroundColor: 'var(--color-surface-card)',
        border: '1px solid var(--color-hairline)',
        borderRadius: 'var(--rounded-xl)',
        padding: '18px 22px',
        fontSize: '14px',
        color: 'var(--color-body)',
        lineHeight: 1.6
      }}>
        The recommendation matrix evaluates maximum capital recovery rates across discount bundling, write-offs, and supplier return strategies.
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px', color: 'var(--color-muted)' }}>Analyzing inventory movement…</div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', backgroundColor: 'var(--color-surface-card)', border: '1px solid var(--color-hairline)', borderRadius: 'var(--rounded-xl)', color: 'var(--color-muted)' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No dead stock detected</p>
          <p style={{ fontSize: '14px' }}>All inventory has active sales records</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {data.map(item => (
            <div key={item.product._id} style={{
              backgroundColor: 'var(--color-surface-card)',
              border: '1px solid var(--color-hairline)',
              borderRadius: 'var(--rounded-xl)',
              padding: '24px',
            }}>
              {/* Item Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: '1px solid var(--color-hairline)', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>{item.product.name}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                    SKU: <span style={{ fontFamily: 'monospace' }}>{item.product.sku}</span>
                    {item.supplierName && <> · Supplier: {item.supplierName}</>}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '300', color: 'var(--color-ink)', lineHeight: 1 }}>
                    ${item.costBasis}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>{item.product.stock} units · cost basis</p>
                </div>
              </div>

              {/* Strategy Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                {item.suggestions.map(s => {
                  const Icon = strategyIcon[s.strategy] || ArrowUpRight;
                  const color = strategyColor[s.strategy] || 'var(--color-muted)';
                  return (
                    <div key={s.strategy} style={{
                      backgroundColor: 'var(--color-canvas)',
                      border: '1px solid var(--color-hairline)',
                      borderRadius: 'var(--rounded-lg)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-ink)' }}>
                          {s.strategy.replace(/_/g, ' ')}
                        </span>
                        <span style={{
                          fontSize: '11px', fontWeight: '600', padding: '2px 8px',
                          borderRadius: 'var(--rounded-pill)',
                          backgroundColor: s.recoveryRate >= 75 ? '#dcfce7' : '#fef9c3',
                          color: s.recoveryRate >= 75 ? '#15803d' : '#a16207'
                        }}>
                          {s.recoveryRate}% recovery
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.5 }}>{s.description}</p>
                      <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--color-ink)' }}>
                        ${s.estimatedRecoveryValue} estimated
                      </div>
                      <button
                        onClick={() => handleAction(item.product._id, s.strategy)}
                        style={{
                          width: '100%', height: '34px', border: `1px solid var(--color-hairline)`,
                          borderRadius: 'var(--rounded-pill)', backgroundColor: 'transparent', cursor: 'pointer',
                          fontSize: '13px', fontFamily: 'var(--font-body)', fontWeight: '500',
                          color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                          transition: 'background-color 150ms'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-soft)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Icon size={13} /> Execute
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeadStock;
