import React, { useState, useEffect, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { Star, Mail, Phone, Globe, TrendingUp, Calendar } from 'lucide-react';

const Suppliers = () => {
  const { api } = useContext(InventoryContext);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contactInfo: { email: '', phone: '', website: '', address: {} },
    paymentTerms: 'NET_30',
    leadTime: 7,
    rating: 3
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/suppliers?page=1&limit=20');
      setSuppliers(response.data.suppliers || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/suppliers', formData);
      setFormData({
        name: '',
        contactInfo: { email: '', phone: '', website: '', address: {} },
        paymentTerms: 'NET_30',
        leadTime: 7,
        rating: 3
      });
      setShowForm(false);
      fetchSuppliers();
    } catch (error) {
      console.error('Error creating supplier:', error);
    }
  };

  const getRatingStars = (rating) => {
    return '⭐'.repeat(Math.round(rating));
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px' }}>Supplier Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 20px',
            backgroundColor: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          {showForm ? 'Cancel' : '+ Add Supplier'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>New Supplier</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <input
              type="text"
              placeholder="Supplier Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                padding: '10px',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-heading)'
              }}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.contactInfo.email}
              onChange={(e) => setFormData({
                ...formData,
                contactInfo: { ...formData.contactInfo, email: e.target.value }
              })}
              style={{
                padding: '10px',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-heading)'
              }}
              required
            />
            <input
              type="number"
              placeholder="Lead Time (days)"
              value={formData.leadTime}
              onChange={(e) => setFormData({ ...formData, leadTime: parseInt(e.target.value) })}
              style={{
                padding: '10px',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-heading)'
              }}
            />
            <select
              value={formData.paymentTerms}
              onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
              style={{
                padding: '10px',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-heading)'
              }}
            >
              <option>NET_15</option>
              <option>NET_30</option>
              <option>NET_45</option>
              <option>NET_60</option>
              <option>COD</option>
            </select>
            <button
              type="submit"
              style={{
                gridColumn: '1 / -1',
                padding: '10px',
                backgroundColor: 'var(--color-accent)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Create Supplier
            </button>
          </form>
        </div>
      )}

      {/* Suppliers Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
            Loading suppliers...
          </div>
        ) : suppliers.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
            No suppliers found
          </div>
        ) : (
          suppliers.map(supplier => (
            <div key={supplier._id} className="card" style={{ padding: '16px' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{supplier.name}</h3>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{supplier.code}</div>
                </div>
                <span style={{
                  padding: '4px 8px',
                  backgroundColor: supplier.status === 'ACTIVE' ? '#D1FAE5' : '#FEE2E2',
                  color: supplier.status === 'ACTIVE' ? '#065F46' : '#7F1D1D',
                  borderRadius: '3px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {supplier.status}
                </span>
              </div>

              {/* Contact Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px', fontSize: '13px' }}>
                {supplier.contactInfo?.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)' }}>
                    <Mail size={14} />
                    <span>{supplier.contactInfo.email}</span>
                  </div>
                )}
                {supplier.contactInfo?.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)' }}>
                    <Phone size={14} />
                    <span>{supplier.contactInfo.phone}</span>
                  </div>
                )}
                {supplier.contactInfo?.website && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)' }}>
                    <Globe size={14} />
                    <span>{supplier.contactInfo.website}</span>
                  </div>
                )}
              </div>

              {/* Performance Metrics */}
              <div style={{
                backgroundColor: 'var(--color-bg-secondary)',
                padding: '12px',
                borderRadius: '4px',
                marginBottom: '12px',
                fontSize: '13px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Rating:</span>
                  <span style={{ fontWeight: '600' }}>{getRatingStars(supplier.rating)} {supplier.rating}/5</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>On-Time:</span>
                  <span style={{ fontWeight: '600' }}>{supplier.performance?.onTimeDelivery || 95}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Lead Time:</span>
                  <span style={{ fontWeight: '600' }}>{supplier.leadTime} days</span>
                </div>
              </div>

              {/* Payment Terms */}
              <div style={{
                padding: '8px',
                backgroundColor: 'var(--color-bg-primary)',
                borderRadius: '4px',
                fontSize: '13px',
                marginBottom: '12px'
              }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Payment: </span>
                <span style={{ fontWeight: '600' }}>{supplier.paymentTerms}</span>
              </div>

              {/* API Status */}
              {supplier.apiCredentials?.hasApiAccess && (
                <div style={{
                  padding: '8px',
                  backgroundColor: '#D1FAE5',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: '#065F46',
                  fontWeight: '500',
                  marginBottom: '12px'
                }}>
                  ✓ API Connected
                  {supplier.apiCredentials.lastSync && (
                    <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                      Last sync: {new Date(supplier.apiCredentials.lastSync).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {/* Minimum Order */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderTop: '1px solid var(--color-border)',
                fontSize: '13px'
              }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Min Order:</span>
                <span style={{ fontWeight: '600' }}>{supplier.minimumOrderQuantity || 1} units</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Suppliers;