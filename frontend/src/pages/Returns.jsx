import React, { useState, useEffect } from 'react';
import { RefreshCw, ClipboardList, PlusCircle, ShieldAlert } from 'lucide-react';
import api from '../services/api';

const Returns = () => {
  const [loading, setLoading] = useState(false);
  const [returns, setReturns] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [orderId, setOrderId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reasonCode, setReasonCode] = useState('DEFECTIVE');
  const [notes, setNotes] = useState('');

  // Inspection states
  const [inspectingReturn, setInspectingReturn] = useState(null);
  const [isDamaged, setIsDamaged] = useState(false);
  const [isSealed, setIsSealed] = useState(true);
  const [supplierLiable, setSupplierLiable] = useState(false);
  const [inspectNotes, setInspectNotes] = useState('');

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const data = await api.get('/returns');
      if (data.data) {
        setReturns(data.data);
      }
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const handleRegisterReturn = async (e) => {
    e.preventDefault();
    try {
      await api.post('/returns', {
        originalOrderId: orderId,
        productId,
        quantity,
        reasonCode,
        notes
      });
      alert('Return registered successfully!');
      setShowAddForm(false);
      fetchReturns();
      setOrderId('');
      setProductId('');
      setQuantity(1);
      setNotes('');
    } catch (error) {
      console.error('Error submitting return:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleProcessInspection = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/returns/${inspectingReturn._id}/process`, {
        isDamaged,
        isSealed,
        supplierLiable,
        notes: inspectNotes
      });
      alert('Return processed successfully!');
      setInspectingReturn(null);
      fetchReturns();
      setInspectNotes('');
    } catch (error) {
      console.error('Error processing return inspection:', error);
      alert('Error: ' + error.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Reverse Logistics & Returns</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'var(--color-accent)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>
            <PlusCircle size={16} /> Register Return
          </button>
          <button onClick={fetchReturns} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }} disabled={loading}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleRegisterReturn} style={{ backgroundColor: 'var(--color-bg-secondary)', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--color-border)' }}>
          <h3>Register Return Request</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label>Original Order ID</label>
              <input type="text" value={orderId} onChange={(e) => setOrderId(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} placeholder="MongoDB Order ID" />
            </div>
            <div>
              <label>Product ID</label>
              <input type="text" value={productId} onChange={(e) => setProductId(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} placeholder="MongoDB Product ID" />
            </div>
            <div>
              <label>Return Quantity</label>
              <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value))} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
            </div>
            <div>
              <label>Reason Code</label>
              <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
                <option value="DEFECTIVE">Defective / Damaged</option>
                <option value="WRONG_ITEM">Incorrect Item Received</option>
                <option value="BUYER_REMORSE">Buyer Remorse / Cancelled</option>
                <option value="EXPIRED">Expired Batch</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Customer Return Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px', height: '60px' }} />
          </div>
          <button type="submit" style={{ padding: '10px 20px', backgroundColor: 'var(--color-accent)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px' }}>Submit Request</button>
        </form>
      )}

      {inspectingReturn && (
        <form onSubmit={handleProcessInspection} style={{ backgroundColor: 'var(--color-bg-secondary)', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #eab308' }}>
          <h3>Inspect Return Request: {inspectingReturn.returnNumber}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Is Packaging Sealed?</label>
              <input type="checkbox" checked={isSealed} onChange={(e) => setIsSealed(e.target.checked)} /> Sealed / Intact
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Is Product Damaged?</label>
              <input type="checkbox" checked={isDamaged} onChange={(e) => setIsDamaged(e.target.checked)} /> Damaged / Broken
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Is Supplier Liable?</label>
              <input type="checkbox" checked={supplierLiable} onChange={(e) => setSupplierLiable(e.target.checked)} /> Yes, chargeback supplier
            </div>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Inspection Notes</label>
            <textarea value={inspectNotes} onChange={(e) => setInspectNotes(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '5px', height: '60px' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#eab308', border: 'none', color: 'black', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>Complete Inspection</button>
            <button type="button" onClick={() => setInspectingReturn(null)} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '4px' }}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div>Loading reverse logistics records...</div>
      ) : (
        <div style={{ overflowX: 'auto', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '12px' }}>Return #</th>
                <th style={{ padding: '12px' }}>Product</th>
                <th style={{ padding: '12px' }}>Quantity</th>
                <th style={{ padding: '12px' }}>Reason</th>
                <th style={{ padding: '12px' }}>Disposition</th>
                <th style={{ padding: '12px' }}>Liability</th>
                <th style={{ padding: '12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {returns.map(ret => (
                <tr key={ret._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{ret.returnNumber}</td>
                  <td style={{ padding: '12px' }}>{ret.product?.name || 'Unknown Product'}</td>
                  <td style={{ padding: '12px' }}>{ret.quantity}</td>
                  <td style={{ padding: '12px' }}>{ret.reasonCode}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                      backgroundColor: ret.disposition === 'RESTOCKED' ? 'rgba(16, 185, 129, 0.1)' : ret.disposition === 'DISPOSED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                      color: ret.disposition === 'RESTOCKED' ? '#10b981' : ret.disposition === 'DISPOSED' ? '#ef4444' : '#eab308'
                    }}>
                      {ret.disposition}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {ret.supplierLiable ? (
                      <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                        <ShieldAlert size={14} /> Supplier Chargeback
                      </span>
                    ) : 'None'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {ret.disposition === 'PENDING_INSPECTION' && (
                      <button onClick={() => setInspectingReturn(ret)} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        <ClipboardList size={14} /> Inspect
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Returns;
