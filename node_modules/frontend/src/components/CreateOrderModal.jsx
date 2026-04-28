import React, { useState, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { AuthContext } from '../context/AuthContext';

const CreateOrderModal = ({ isOpen, onClose, type }) => {
  const { products, fetchOrders, fetchProducts } = useContext(InventoryContext);
  const { user } = useContext(AuthContext);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !quantity) return;

    const targetProduct = products.find(p => p._id === selectedProduct);
    const amount = (targetProduct?.price || 0) * Number(quantity);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          type,
          items: [{ product: selectedProduct, quantity: Number(quantity), priceAtTime: targetProduct.price }],
          totalAmount: amount
        })
      });
      if (res.ok) {
        fetchOrders();
        fetchProducts();
        onClose();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
        <h3 style={{ fontSize: '24px', marginBottom: '20px' }}>NEW {type} ORDER</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>SELECT PRODUCT</label>
            <select 
              value={selectedProduct} 
              onChange={e => setSelectedProduct(e.target.value)}
              className={errors.product ? 'input-error' : ''}
              style={{ appearance: 'none' }}
            >
              <option value="">-- CHOOSE --</option>
              {products.map(p => (
                <option key={p._id} value={p._id}>{p.name} (In stock: {p.stock})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>QUANTITY</label>
            <input 
              type="number"
              value={quantity} 
              onChange={e => setQuantity(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} className="btn-outline" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>CANCEL</button>
            <button type="submit" className="btn-solid">EXECUTE ORDER</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrderModal;
