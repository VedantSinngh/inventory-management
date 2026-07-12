import React, { useState, useEffect, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { Mail, Phone, Globe, Plus, X, RefreshCw } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Suppliers = () => {
  const { api } = useContext(InventoryContext);
  const { user } = useContext(AuthContext);
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

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/suppliers?page=1&limit=20');
      setSuppliers(response.suppliers || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/suppliers', formData);
      setFormData({ name: '', contactInfo: { email: '', phone: '', website: '', address: {} }, paymentTerms: 'NET_30', leadTime: 7, rating: 3 });
      setShowForm(false);
      fetchSuppliers();
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ marginBottom: '6px' }}>Suppliers</h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)' }}>
            {suppliers.length} active supplier{suppliers.length !== 1 ? 's' : ''} in your network
          </p>
        </div>
        {['ADMIN', 'MANAGER'].includes(user?.role) && (
          <button
            className={showForm ? 'btn-secondary' : 'btn-primary'}
            style={{ height: '40px', padding: '0 18px', fontSize: '14px', gap: '6px', display: 'inline-flex', alignItems: 'center' }}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? (<><X size={14} /> Cancel</>) : (<><Plus size={14} /> Add supplier</>)}
          </button>
        )}
      </div>

      {/* Add Supplier Form */}
      {showForm && (
        <div style={{
          backgroundColor: 'var(--color-surface-card)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 'var(--rounded-xl)',
          padding: '28px 28px',
        }}>
          <h3 style={{ marginBottom: '24px', fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '300' }}>
            New supplier
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-body)', marginBottom: 0 }}>Supplier name *</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Supply Co."
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{ height: '42px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-body)', marginBottom: 0 }}>Email *</label>
                <input
                  type="email"
                  placeholder="contact@supplier.com"
                  value={formData.contactInfo.email}
                  onChange={e => setFormData({ ...formData, contactInfo: { ...formData.contactInfo, email: e.target.value } })}
                  required
                  style={{ height: '42px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-body)', marginBottom: 0 }}>Phone</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={formData.contactInfo.phone}
                  onChange={e => setFormData({ ...formData, contactInfo: { ...formData.contactInfo, phone: e.target.value } })}
                  style={{ height: '42px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-body)', marginBottom: 0 }}>Lead time (days)</label>
                <input
                  type="number"
                  value={formData.leadTime}
                  min={1}
                  onChange={e => setFormData({ ...formData, leadTime: parseInt(e.target.value) })}
                  style={{ height: '42px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-body)', marginBottom: 0 }}>Payment terms</label>
                <select
                  value={formData.paymentTerms}
                  onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                  style={{ height: '42px' }}
                >
                  {['NET_15', 'NET_30', 'NET_45', 'NET_60', 'COD'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-body)', marginBottom: 0 }}>Rating (1–5)</label>
                <input
                  type="number"
                  value={formData.rating}
                  min={1} max={5}
                  onChange={e => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                  style={{ height: '42px' }}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ height: '42px', padding: '0 24px', fontSize: '15px' }}>
              Create supplier
            </button>
          </form>
        </div>
      )}

      {/* Supplier Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-muted)' }}>
          Loading suppliers…
        </div>
      ) : suppliers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-muted)' }}>
          <p style={{ marginBottom: '16px', fontSize: '16px' }}>No suppliers yet</p>
          {['ADMIN', 'MANAGER'].includes(user?.role) && (
            <button className="btn-primary" style={{ height: '40px', padding: '0 18px', fontSize: '14px' }} onClick={() => setShowForm(true)}>
              Add your first supplier
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '20px' }}>
          {suppliers.map(supplier => (
            <div key={supplier._id} style={{
              backgroundColor: 'var(--color-surface-card)',
              border: '1px solid var(--color-hairline)',
              borderRadius: 'var(--rounded-xl)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              transition: 'box-shadow 200ms ease',
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(12,10,9,0.06)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '2px' }}>{supplier.name}</h3>
                  <span style={{ fontSize: '12px', color: 'var(--color-muted)', fontFamily: 'monospace' }}>{supplier.code}</span>
                </div>
                <span className={`badge ${supplier.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                  {supplier.status}
                </span>
              </div>

              {/* Contact */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {supplier.contactInfo?.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-body)' }}>
                    <Mail size={13} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{supplier.contactInfo.email}</span>
                  </div>
                )}
                {supplier.contactInfo?.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-body)' }}>
                    <Phone size={13} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
                    <span>{supplier.contactInfo.phone}</span>
                  </div>
                )}
                {supplier.contactInfo?.website && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-body)' }}>
                    <Globe size={13} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{supplier.contactInfo.website}</span>
                  </div>
                )}
              </div>

              {/* Metrics */}
              <div style={{
                backgroundColor: 'var(--color-canvas)',
                border: '1px solid var(--color-hairline)',
                borderRadius: 'var(--rounded-lg)',
                padding: '14px 16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                fontSize: '13px'
              }}>
                {[
                  { label: 'Rating', value: `${'★'.repeat(Math.round(supplier.rating || 0))} ${supplier.rating || '—'}/5` },
                  { label: 'On-time', value: `${supplier.performance?.onTimeDelivery || 95}%` },
                  { label: 'Lead time', value: `${supplier.leadTime} days` },
                  { label: 'Payment', value: supplier.paymentTerms },
                ].map(m => (
                  <div key={m.label}>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: '600' }}>{m.label}</div>
                    <div style={{ fontWeight: '500', color: 'var(--color-ink)' }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* API Status */}
              {supplier.apiCredentials?.hasApiAccess && (
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: 'var(--rounded-lg)',
                  fontSize: '13px',
                  color: '#15803d',
                  fontWeight: '500'
                }}>
                  ✓ API Connected
                  {supplier.apiCredentials.lastSync && (
                    <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.8 }}>
                      Last sync: {new Date(supplier.apiCredentials.lastSync).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {/* Footer action */}
              {['ADMIN', 'MANAGER'].includes(user?.role) && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await api.post(`/suppliers/${supplier._id}/performance/recalculate`);
                      alert('Variability recalculated!');
                      fetchSuppliers();
                    } catch (err) { alert('Error: ' + err.message); }
                  }}
                  className="btn-secondary"
                  style={{ width: '100%', height: '36px', fontSize: '13px', gap: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <RefreshCw size={13} /> Recalculate variability
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Suppliers;