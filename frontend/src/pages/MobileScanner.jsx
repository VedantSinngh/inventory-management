import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, RefreshCw, CheckCircle } from 'lucide-react';
import api from '../services/api';

const MobileScanner = () => {
  const [scanResult, setScanResult] = useState(null);
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Update adjustments
  const [qtyAdjustment, setQtyAdjustment] = useState(0);
  const [actionType, setActionType] = useState('ADD'); // 'ADD' or 'AUDIT'
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: {
        width: 250,
        height: 250,
      },
      fps: 5,
    });

    scanner.render(
      (result) => {
        scanner.clear();
        setScanResult(result);
        lookupProduct(result);
      },
      (error) => {
        // Ignore normal scan fails
      }
    );

    return () => {
      try {
        scanner.clear();
      } catch (err) {}
    };
  }, []);

  const lookupProduct = async (sku) => {
    setLoading(true);
    try {
      // Fetch product by SKU
      const data = await api.get(`/products?search=${sku}`);
      if (data.data && data.data.length > 0) {
        setProductData(data.data[0]);
      } else {
        alert('Product not found in system with SKU: ' + sku);
      }
    } catch (err) {
      console.error(err);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAdjustment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/products/scan-update', {
        sku: scanResult,
        quantityAdjustment: qtyAdjustment,
        actionType,
        notes
      });
      alert('Inventory audit successfully saved!');
      setScanResult(null);
      setProductData(null);
      // Reload scanner
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert('Error: ' + error.message);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Mobile Barcode Scanner</h2>

      {!scanResult ? (
        <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: '20px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div id="reader" style={{ width: '100%' }}></div>
          <div style={{ textAlign: 'center', marginTop: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--color-text-secondary)' }}>
            <Camera size={18} /> Point camera at barcode / QR code
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: '20px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Scanned SKU: <strong>{scanResult}</strong></span>
            <button onClick={() => window.location.reload()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px' }}>
              <RefreshCw size={12} /> Rescan
            </button>
          </div>

          {loading ? (
            <div>Querying database...</div>
          ) : productData ? (
            <div>
              <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '15px' }}>
                <h3 style={{ margin: '0 0 5px 0' }}>{productData.name}</h3>
                <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Current Stock: {productData.stock} units</span>
              </div>

              <form onSubmit={handleSubmitAdjustment}>
                <div style={{ marginBottom: '15px' }}>
                  <label>Audit Action Type</label>
                  <select value={actionType} onChange={(e) => setActionType(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
                    <option value="ADD">Add New Stock Received</option>
                    <option value="AUDIT">Override / Match Physical Count</option>
                  </select>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label>{actionType === 'ADD' ? 'Quantity to Add' : 'Actual Physical Count'}</label>
                  <input 
                    type="number" 
                    value={qtyAdjustment} 
                    onChange={(e) => setQtyAdjustment(parseInt(e.target.value))} 
                    required 
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }} 
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label>Audit Notes</label>
                  <input 
                    type="text" 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    placeholder="e.g. Cycle count shelf A" 
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }} 
                  />
                </div>

                <button 
                  type="submit" 
                  style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  <CheckCircle size={18} /> Submit Audit Record
                </button>
              </form>
            </div>
          ) : (
            <div>No matching item found. Try rescanning.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default MobileScanner;
