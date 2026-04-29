import React, { useState, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { AuthContext } from '../context/AuthContext';
import EditModal from '../components/EditModal';
import api from '../services/api';

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

  const handleSave = async (formData) => {
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct._id, formData);
      } else {
        await api.createProduct(formData);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (e) {
      console.error('Error saving product:', e);
    }
  };

  const openNew = () => { setEditingProduct(null); setIsModalOpen(true); };
  const openEdit = (product) => { setEditingProduct(product); setIsModalOpen(true); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '28px' }}>PRODUCT REGISTRY</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>TOTAL INVENTORY: {products.length} ITEMS</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
           <input 
             placeholder="SEARCH SKU / NAME..." 
             value={searchTerm} 
             onChange={e => setSearchTerm(e.target.value)} 
             style={{ width: '250px' }}
           />
           <select 
             value={filterCategory} 
             onChange={e => setFilterCategory(e.target.value)} 
             style={{ width: '150px', appearance: 'none' }}
           >
             <option value="">ALL CATEGORIES</option>
             {categories.map(c => <option key={c} value={c}>{c}</option>)}
           </select>
           <button className="btn-solid" onClick={openNew}>ADD NEW PRODUCT</button>
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
              return (
              <tr 
                key={product._id} 
                className={selectedId === product._id ? 'selected' : ''}
                onClick={() => setSelectedId(product._id)}
              >
                <td style={{ color: 'var(--color-text-secondary)' }}>...{product._id.slice(-5)}</td>
                <td style={{ color: 'var(--color-text-heading)' }}>{product.name}</td>
                <td>{product.sku}</td>
                <td>{product.category}</td>
                <td style={{ fontFamily: 'var(--font-heading)', fontSize: '16px' }}>{product.stock}</td>
                <td>
                  {isLowStock ? (
                    <span style={{ 
                      display: 'inline-block',
                      border: '1px solid var(--color-text-heading)',
                      backgroundColor: 'var(--color-bg-card)',
                      color: 'var(--color-text-heading)',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>LOW STOCK</span>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)' }}>OK</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn-outline" onClick={(e) => { e.stopPropagation(); openEdit(product); }}>EDIT</button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

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
