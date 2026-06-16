import React, { useState, useEffect } from 'react';
import { ShoppingCart, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import api from '../services/api';

const ReorderEngine = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [serviceLevelZ, setServiceLevelZ] = useState(1.65); // 95% default

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const resData = await api.get('/reorders/predictive');
      if (resData.data) {
        setData(resData.data);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleCheckboxChange = (id) => {
    setSelectedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleBulkPO = async () => {
    const itemsToOrder = data
      .filter(item => selectedItems[item.productId])
      .map(item => ({
        productId: item.productId,
        quantity: item.suggestedQuantity
      }));

    if (itemsToOrder.length === 0) return;

    try {
      await api.post('/reorders/purchase-orders', { items: itemsToOrder });
      alert('Purchase orders successfully generated!');
      fetchSuggestions();
      setSelectedItems({});
    } catch (error) {
      console.error('Error creating POs:', error);
      alert('Error: ' + error.message);
    }
  };

  // Live client-side safety stock recalculator based on slider's Z factor
  const adjustSafetyStock = (item) => {
    // Back-calculate the safety stock parts using new Z
    const L = 14;
    const stdDevDemand = 1.5;
    const avgDailyDemand = item.avgDailyDemand;
    const sigmaL = 2.1;

    const demandComp = L * Math.pow(stdDevDemand, 2);
    const leadTimeComp = Math.pow(avgDailyDemand, 2) * Math.pow(sigmaL, 2);
    const calculatedSafety = serviceLevelZ * Math.sqrt(demandComp + leadTimeComp);
    const calculatedROP = (avgDailyDemand * L) + calculatedSafety;

    return {
      safetyStock: Math.ceil(calculatedSafety),
      reorderPoint: Math.ceil(calculatedROP),
      needsReorder: item.stock <= calculatedROP
    };
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Predictive Reorder Engine</h2>
        <button onClick={fetchSuggestions} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--color-border)' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>Target Service Level Sensitivity</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <input 
            type="range" 
            min="1.28" // 90%
            max="2.58" // 99%
            step="0.05"
            value={serviceLevelZ} 
            onChange={(e) => setServiceLevelZ(parseFloat(e.target.value))}
            style={{ flex: 1 }}
          />
          <div style={{ fontWeight: 'bold', minWidth: '150px' }}>
            Z-Factor: {serviceLevelZ} (
            {serviceLevelZ <= 1.5 ? '90% Service' : serviceLevelZ <= 1.8 ? '95% Service' : '99% Service'}
            )
          </div>
        </div>
      </div>

      {loading ? (
        <div>Loading reorder suggestions...</div>
      ) : (
        <div style={{ overflowX: 'auto', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '12px' }}>Select</th>
                <th style={{ padding: '12px' }}>Product</th>
                <th style={{ padding: '12px' }}>SKU</th>
                <th style={{ padding: '12px' }}>Stock</th>
                <th style={{ padding: '12px' }}>Avg Daily Demand</th>
                <th style={{ padding: '12px' }}>Safety Stock</th>
                <th style={{ padding: '12px' }}>Reorder Point</th>
                <th style={{ padding: '12px' }}>Suggested Qty</th>
                <th style={{ padding: '12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map(item => {
                const adjusted = adjustSafetyStock(item);
                return (
                  <tr key={item.productId} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: adjusted.needsReorder ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                    <td style={{ padding: '12px' }}>
                      <input 
                        type="checkbox" 
                        checked={!!selectedItems[item.productId]} 
                        onChange={() => handleCheckboxChange(item.productId)} 
                      />
                    </td>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.name}</td>
                    <td style={{ padding: '12px' }}>{item.sku}</td>
                    <td style={{ padding: '12px' }}>{item.stock}</td>
                    <td style={{ padding: '12px' }}>{item.avgDailyDemand}</td>
                    <td style={{ padding: '12px' }}>{adjusted.safetyStock}</td>
                    <td style={{ padding: '12px' }}>{adjusted.reorderPoint}</td>
                    <td style={{ padding: '12px' }}>{item.suggestedQuantity}</td>
                    <td style={{ padding: '12px' }}>
                      {adjusted.needsReorder ? (
                        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                          <AlertTriangle size={14} /> Reorder
                        </span>
                      ) : (
                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                          <ShieldCheck size={14} /> Safe
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

      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          onClick={handleBulkPO} 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          disabled={Object.values(selectedItems).filter(Boolean).length === 0}
        >
          <ShoppingCart size={18} /> Bulk Create Purchase Orders
        </button>
      </div>
    </div>
  );
};

export default ReorderEngine;
