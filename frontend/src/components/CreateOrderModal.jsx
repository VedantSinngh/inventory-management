import React, { useState, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const CreateOrderModal = ({ isOpen, onClose, type }) => {
  const { products, fetchOrders, fetchProducts } = useContext(InventoryContext);
  const { success, error: showError } = useToast();
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};
    if (!selectedProduct) newErrors.product = 'Product is required';
    if (!quantity || quantity <= 0) newErrors.quantity = 'Quantity must be greater than 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const targetProduct = products.find(p => p._id === selectedProduct);
    if (!targetProduct) {
      showError('Product not found');
      return;
    }

    const amount = (targetProduct?.price || 0) * Number(quantity);

    try {
      setLoading(true);
      console.log(`Creating ${type} order:`, {
        product: targetProduct.name,
        quantity: Number(quantity),
        amount
      });

      await api.createOrder({
        type,
        items: [{
          product: selectedProduct,
          quantity: Number(quantity),
          priceAtTime: targetProduct.price || 0
        }],
        totalAmount: amount
      });

      success(`${type} order created successfully!`);
      setSelectedProduct('');
      setQuantity('');
      setErrors({});
      
      await Promise.all([fetchOrders(), fetchProducts()]);
      onClose();
    } catch (err) {
      console.error('Error creating order:', err);
      showError(err.data?.message || err.message || `Failed to create ${type} order`);
    } finally {
      setLoading(false);
    }
  };

  const orderTypeLabel = type === 'SALES' ? '📤 New Sales Order' : '📥 New Purchase Order';
  const orderTypeColor = type === 'SALES' ? '#10B981' : '#3B82F6';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '8px',
            backgroundColor: orderTypeColor, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '20px'
          }}>
            {type === 'SALES' ? '📤' : '📥'}
          </div>
          <h3 style={{ fontSize: '24px', margin: 0 }}>{orderTypeLabel}</h3>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Select Product *
            </label>
            <select
              value={selectedProduct}
              onChange={e => {
                setSelectedProduct(e.target.value);
                if (errors.product) setErrors(prev => ({ ...prev, product: '' }));
              }}
              style={{
                appearance: 'none',
                borderColor: errors.product ? '#ef4444' : undefined
              }}
            >
              <option value="">-- Choose a Product --</option>
              {products.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name} (Stock: {p.stock} units) - ${p.price || '0.00'}
                </option>
              ))}
            </select>
            {errors.product && (
              <span style={{ fontSize: '12px', color: '#ef4444' }}>{errors.product}</span>
            )}
          </div>

          {selectedProduct && (
            <div style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              padding: '12px',
              borderRadius: '4px',
              fontSize: '13px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Product:</span>
                <span style={{ fontWeight: 'bold' }}>
                  {products.find(p => p._id === selectedProduct)?.name}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Unit Price:</span>
                <span>${(products.find(p => p._id === selectedProduct)?.price || 0).toFixed(2)}</span>
              </div>
              {type === 'SALES' && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Available:</span>
                  <span style={{ color: '#10B981' }}>
                    {products.find(p => p._id === selectedProduct)?.stock || 0} units
                  </span>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Quantity *
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={e => {
                setQuantity(e.target.value);
                if (errors.quantity) setErrors(prev => ({ ...prev, quantity: '' }));
              }}
              placeholder="Enter quantity"
              style={{
                borderColor: errors.quantity ? '#ef4444' : undefined
              }}
            />
            {errors.quantity && (
              <span style={{ fontSize: '12px', color: '#ef4444' }}>{errors.quantity}</span>
            )}
          </div>

          {selectedProduct && quantity && (
            <div style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: `2px solid ${orderTypeColor}`,
              padding: '12px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Amount:</span>
                <span style={{ color: orderTypeColor }}>
                  ${((products.find(p => p._id === selectedProduct)?.price || 0) * Number(quantity)).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
              disabled={loading}
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="btn-solid"
              disabled={loading}
              style={{
                backgroundColor: orderTypeColor,
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'PROCESSING...' : 'CREATE ORDER'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrderModal;

