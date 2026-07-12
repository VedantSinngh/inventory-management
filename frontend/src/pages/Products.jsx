import React, { useState, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { AuthContext } from '../context/AuthContext';
import EditModal from '../components/EditModal';
import api from '../services/api';
import { Barcode, Edit, Plus } from 'lucide-react';

const Products = () => {
  const { products, fetchProducts } = useContext(InventoryContext);
  const { user } = useContext(AuthContext);
  const [selectedId, setSelectedId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === '' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(products.map(p => p.category))];

  const normalizePayload = (data, isEdit) => {
    const payload = {
      name: data.name?.trim(),
      sku: data.sku?.trim(),
      category: data.category?.trim(),
      price: data.price === '' ? undefined : Number(data.price),
      stock: data.stock === '' ? undefined : Number(data.stock),
      lowStockThreshold: data.lowStockThreshold === '' ? undefined : Number(data.lowStockThreshold),
      warehouse: data.warehouse || undefined,
      supplier: data.supplier?.trim() || undefined
    };
    if (isEdit) delete payload.stock;
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined || payload[key] === '') delete payload[key];
    });
    return payload;
  };

  const handleSave = async (formData) => {
    try {
      const payload = normalizePayload(formData, !!editingProduct);
      if (editingProduct) {
        await api.updateProduct(editingProduct._id, payload);
      } else {
        await api.createProduct(payload);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (e) { console.error('Error saving product:', e); }
  };

  const openNew = () => { setEditingProduct(null); setIsModalOpen(true); };
  const openEdit = (product) => { setEditingProduct(product); setIsModalOpen(true); };
  const selectedProduct = products.find(p => p._id === selectedId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: '6px' }}>Products</h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)' }}>
            {products.length.toLocaleString()} SKUs in catalog
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            placeholder="Search name or SKU…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '220px', height: '40px' }}
          />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            style={{ width: '180px', height: '40px' }}
          >
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            className="btn-primary"
            style={{ height: '40px', gap: '6px', display: 'inline-flex', alignItems: 'center' }}
            onClick={openNew}
          >
            <Plus size={15} /> Add product
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Product name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '48px 20px' }}>
                  No products found
                </td>
              </tr>
            ) : filteredProducts.map((product) => {
              const isLowStock = product.stock <= (product.lowStockThreshold || 10);
              const isOutOfStock = product.stock === 0;
              const isSelected = selectedId === product._id;
              return (
                <tr
                  key={product._id}
                  onClick={() => setSelectedId(isSelected ? null : product._id)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--color-surface-soft)' : undefined
                  }}
                >
                  <td style={{ color: 'var(--color-muted)', fontFamily: 'monospace', fontSize: '12px' }}>
                    {product._id.slice(-5).toUpperCase()}
                  </td>
                  <td style={{ fontWeight: '500', color: 'var(--color-ink)' }}>{product.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{product.sku}</td>
                  <td>{product.category}</td>
                  <td style={{ fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>{product.stock}</td>
                  <td>
                    {isOutOfStock ? (
                      <span className="badge badge-danger">Out of stock</span>
                    ) : isLowStock ? (
                      <span className="badge badge-warning">Low stock</span>
                    ) : (
                      <span className="badge badge-success">In stock</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); window.open(`/api/products/${product.sku}/barcode`, '_blank'); }}
                        title="Barcode"
                        style={{
                          width: '32px', height: '32px', borderRadius: 'var(--rounded-md)',
                          border: '1px solid var(--color-hairline)', background: 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--color-muted)', cursor: 'pointer', transition: 'all 150ms'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-soft)'; e.currentTarget.style.color = 'var(--color-ink)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-muted)'; }}
                      >
                        <Barcode size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(product); }}
                        title="Edit"
                        style={{
                          width: '32px', height: '32px', borderRadius: 'var(--rounded-md)',
                          border: '1px solid var(--color-hairline)', background: 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--color-muted)', cursor: 'pointer', transition: 'all 150ms'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-soft)'; e.currentTarget.style.color = 'var(--color-ink)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-muted)'; }}
                      >
                        <Edit size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating Action Bar */}
      {selectedId && selectedProduct && (
        <div style={{
          position: 'fixed',
          bottom: '28px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--color-surface-card)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 'var(--rounded-pill)',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          zIndex: 1000,
          boxShadow: '0 8px 32px rgba(12, 10, 9, 0.12)',
          backdropFilter: 'blur(12px)'
        }}>
          <span style={{ fontSize: '14px', color: 'var(--color-body)' }}>
            Selected: <strong style={{ color: 'var(--color-ink)', fontWeight: '600' }}>{selectedProduct.name}</strong>
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-primary"
              style={{ height: '32px', padding: '0 14px', fontSize: '13px', gap: '5px', display: 'flex', alignItems: 'center' }}
              onClick={() => openEdit(selectedProduct)}
            >
              <Edit size={13} /> Edit
            </button>
            <button
              className="btn-secondary"
              style={{ height: '32px', padding: '0 14px', fontSize: '13px', gap: '5px', display: 'flex', alignItems: 'center' }}
              onClick={() => window.open(`/api/products/${selectedProduct.sku}/barcode`, '_blank')}
            >
              <Barcode size={13} /> Barcode
            </button>
          </div>
        </div>
      )}

      <EditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        product={editingProduct}
      />
    </div>
  );
};

export default Products;
