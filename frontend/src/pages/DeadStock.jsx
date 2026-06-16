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
      if (resData.data) {
        setData(resData.data);
      }
    } catch (error) {
      console.error('Error fetching dead stock:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeadStock();
  }, []);

  const handleAction = async (productId, strategy) => {
    try {
      if (strategy === 'DISCOUNT_BUNDLE') {
        // Fetch current product first
        const productData = await api.getProduct(productId);
        
        const body = {
          price: parseFloat((productData.price * 0.60).toFixed(2)) // 40% discount
        };
        
        await api.updateProduct(productId, body);
        alert('Discount successfully applied to product!');
        fetchDeadStock();
      } else if (strategy === 'WRITE_OFF') {
        const body = {
          sku: data.find(d => d.product._id === productId).product.sku,
          quantityAdjustment: 0, // set stock to 0
          actionType: 'AUDIT',
          notes: 'Dead stock write-off'
        };
        
        await api.post('/products/scan-update', body);
        alert('Inventory successfully written off!');
        fetchDeadStock();
      } else {
        alert(`Request submitted for Supplier return processing.`);
      }
    } catch (error) {
      console.error('Action failed:', error);
      alert('Error: ' + error.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Intelligent Dead Stock Suggester</h2>
        <button onClick={fetchDeadStock} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }} disabled={loading}>
          <RefreshCw size={16} /> Refresh Analysis
        </button>
      </div>

      <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--color-border)' }}>
        <p style={{ margin: 0 }}>This page aggregates products with zero sales activity over the past 90 days. The recommendation matrix evaluates maximum capital recovery rates across options.</p>
      </div>

      {loading ? (
        <div>Analyzing inventory movement...</div>
      ) : data.length === 0 ? (
        <div>No dead stock detected! All inventory has active sales logs.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {data.map(item => (
            <div key={item.product._id} style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-border)', paddingBottom: '15px', marginBottom: '15px' }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0' }}>{item.product.name}</h3>
                  <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>SKU: {item.product.sku} | Supplier: {item.supplierName}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '18px' }}>Cost Basis: ${item.costBasis}</div>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Stock Qty: {item.product.stock} units</span>
                </div>
              </div>

              <h4>Liquidation Options Evaluation Matrix:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                {item.suggestions.map(s => (
                  <div key={s.strategy} style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{s.strategy.replace('_', ' ')}</span>
                        <span style={{
                          padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                          backgroundColor: s.recoveryRate >= 75 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                          color: s.recoveryRate >= 75 ? '#10b981' : '#eab308'
                        }}>
                          {s.recoveryRate}% Recovery
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 15px 0' }}>{s.description}</p>
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Recovery: ${s.estimatedRecoveryValue}</div>
                      <button 
                        onClick={() => handleAction(item.product._id, s.strategy)}
                        style={{
                          width: '100%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer',
                          backgroundColor: s.strategy === 'WRITE_OFF' ? 'rgba(239, 68, 68, 0.1)' : s.strategy === 'DISCOUNT_BUNDLE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
                          color: s.strategy === 'WRITE_OFF' ? '#ef4444' : s.strategy === 'DISCOUNT_BUNDLE' ? '#10b981' : 'white',
                          border: 'none', borderRadius: '4px'
                        }}
                      >
                        {s.strategy === 'WRITE_OFF' ? <Trash2 size={14} /> : s.strategy === 'DISCOUNT_BUNDLE' ? <Percent size={14} /> : <ArrowUpRight size={14} />} Execute
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeadStock;
