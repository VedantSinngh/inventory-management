import React, { useState, useEffect, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';

const EditModal = ({ isOpen, onClose, onSave, product }) => {
  const { warehouses } = useContext(InventoryContext);
  const [formData, setFormData] = useState({
    name: '', sku: '', category: '', price: '', stock: '', lowStockThreshold: '', warehouse: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        category: product.category || '',
        price: product.price || '',
        stock: product.stock || '',
        lowStockThreshold: product.lowStockThreshold || 10,
        warehouse: product.warehouse?._id || product.warehouse || ''
      });
    } else {
      setFormData({ name: '', sku: '', category: '', price: '', stock: '', lowStockThreshold: 10, warehouse: '' });
    }
  }, [product, isOpen]);
// ... (rest of logic unchanged except the form fields)
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>CATEGORY</label>
              <input 
                value={formData.category} 
                onChange={e => setFormData({...formData, category: e.target.value})}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>WAREHOUSE</label>
              <select 
                value={formData.warehouse} 
                onChange={e => setFormData({...formData, warehouse: e.target.value})}
                style={{ appearance: 'none' }}
              >
                <option value="">-- UNASSIGNED --</option>
                {warehouses.map(w => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Required field';
    if (!formData.sku) newErrors.sku = 'Required field';
    if (!formData.price) newErrors.price = 'Required field';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
        <h3 style={{ fontSize: '24px', marginBottom: '20px' }}>{product ? 'EDIT PRODUCT' : 'NEW PRODUCT'}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>PRODUCT NAME</label>
            <input 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              className={errors.name ? 'input-error' : ''}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>SKU</label>
              <input 
                value={formData.sku} 
                onChange={e => setFormData({...formData, sku: e.target.value})}
                className={errors.sku ? 'input-error' : ''}
              />
              {errors.sku && <span className="error-message">{errors.sku}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>CATEGORY</label>
              <input 
                value={formData.category} 
                onChange={e => setFormData({...formData, category: e.target.value})}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>PRICE</label>
              <input 
                type="number"
                value={formData.price} 
                onChange={e => setFormData({...formData, price: e.target.value})}
                className={errors.price ? 'input-error' : ''}
              />
              {errors.price && <span className="error-message">{errors.price}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>STOCK QUANTITY</label>
              <input 
                type="number"
                value={formData.stock} 
                onChange={e => setFormData({...formData, stock: e.target.value})}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} className="btn-outline" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>CANCEL</button>
            <button type="submit" className="btn-solid">SAVE RECORD</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditModal;
