import React, { useState, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { AuthContext } from '../context/AuthContext';
import EditModal from '../components/EditModal';
import api from '../services/api';
import { Barcode, Edit, Plus, Trash, Check } from 'lucide-react';

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

    if (isEdit) {
      delete payload.stock;
    }

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined || payload[key] === '') {
        delete payload[key];
      }
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
    } catch (e) {
      console.error('Error saving product:', e);
    }
  };

  const openNew = () => { setEditingProduct(null); setIsModalOpen(true); };
  const openEdit = (product) => { setEditingProduct(product); setIsModalOpen(true); };

  const selectedProduct = products.find(p => p._id === selectedId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', letterSpacing: '-0.3px', margin: 0 }}>PRODUCT REGISTRY</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginTop: '4px' }}>
            TOTAL REGISTERED: {products.length} SKUS
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
           <input 
             placeholder="Search sku or name..." 
             value={searchTerm} 
             onChange={e => setSearchTerm(e.target.value)} 
             style={{ width: '220px' }}
           />
           <select 
             value={filterCategory} 
             onChange={e => setFilterCategory(e.target.value)} 
             style={{ width: '160px' }}
           >
             <option value="">ALL CATEGORIES</option>
             {categories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
           </select>
           <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={openNew}>
             <Plus size={16} /> ADD PRODUCT
           </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>PRODUCT NAME</th>
              <th>SKU</th>
              <th>CATEGORY</th>
              <th>STOCK</th>
              <th>STATUS</th>
              <th style={{ textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => {
              const isLowStock = product.stock <= (product.lowStockThreshold || 10);
              const isSelected = selectedId === product._id;
              return (
              <tr 
                key={product._id} 
                className={isSelected ? 'selected' : ''}
                onClick={() => setSelectedId(isSelected ? null : product._id)}
                style={{ cursor: 'pointer' }}
              >
                <td style={{ color: 'var(--color-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                  {product._id.slice(-5).toUpperCase()}
                </td>
                <td style={{ color: 'var(--color-text-primary)', fontWeight: '500' }}>
                  {product.name}
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{product.sku}</td>
                <td>{product.category?.toUpperCase()}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: '600' }}>{product.stock}</td>
                <td>
                  {isLowStock ? (
                    <span className="badge badge-danger">LOW STOCK</span>
                  ) : (
                    <span className="badge badge-success">IN STOCK</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      className="btn-icon" 
                      onClick={(e) => { e.stopPropagation(); window.open(`/api/products/${product.sku}/barcode`, '_blank'); }}
                      title="Barcode view"
                    >
                      <Barcode size={14} />
                    </button>
                    <button 
                      className="btn-icon" 
                      onClick={(e) => { e.stopPropagation(); openEdit(product); }}
                      title="Edit item"
                    >
                      <Edit size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedId && selectedProduct && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--color-surface-elevated)',
          border: '1px solid var(--color-m-red)',
          borderRadius: 'var(--rounded-none)',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          zIndex: 1000,
          boxShadow: 'none'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--color-on-dark)' }}>
            Selected SKU: <strong style={{ color: 'var(--color-m-red)' }}>{selectedProduct.sku}</strong> ({selectedProduct.name})
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn-primary" 
              style={{ height: '30px', padding: '0 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => openEdit(selectedProduct)}
            >
              <Edit size={12} /> Edit Item
            </button>
            <button 
              className="btn-secondary" 
              style={{ height: '30px', padding: '0 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => window.open(`/api/products/${selectedProduct.sku}/barcode`, '_blank')}
            >
              <Barcode size={12} /> Barcode
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
