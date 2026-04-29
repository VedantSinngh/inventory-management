import React, { useState, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { Warehouse, MapPin, Package } from 'lucide-react';

const Warehouses = () => {
  const { warehouses, products, fetchWarehouses, loading } = useContext(InventoryContext);
  const { success, error: showError } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Facility name is required';
    if (!location.trim()) newErrors.location = 'Location is required';
    if (!capacity || capacity <= 0) newErrors.capacity = 'Capacity must be greater than 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      console.log('Creating warehouse:', { name, location, capacity });

      await api.createWarehouse({
        name: name.trim(),
        location: location.trim(),
        capacity: Number(capacity)
      });

      success('Warehouse facility registered successfully!');
      setName('');
      setLocation('');
      setCapacity('');
      setErrors({});
      setIsModalOpen(false);

      await fetchWarehouses();
    } catch (err) {
      console.error('Error creating warehouse:', err);
      showError(err.data?.message || err.message || 'Failed to register warehouse');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Warehouse size={28} />
            WAREHOUSE NETWORK
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '4px' }}>
            {warehouses.length} ACTIVE FACILITIES
          </p>
        </div>
        <button
          className="btn-solid"
          onClick={() => setIsModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          ➕ REGISTER NEW FACILITY
        </button>
      </div>

      {warehouses.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          padding: '40px',
          textAlign: 'center',
          borderRadius: '8px'
        }}>
          <Warehouse size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '12px', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            No warehouses registered yet. Create your first facility to get started.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {warehouses.map(w => {
            const warehouseProducts = products.filter(p => p.warehouse === w._id || p.warehouse?._id === w._id);
            const totalStock = warehouseProducts.reduce((acc, p) => acc + (p.stock || 0), 0);
            const utilizationPercentage = w.capacity ? Math.round((totalStock / w.capacity) * 100) : 0;

            return (
              <div
                key={w._id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  border: `2px solid ${utilizationPercentage > 80 ? '#ef4444' : 'var(--color-border)'}`,
                  transition: 'all 200ms ease'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '40px', height: '40px',
                      backgroundColor: 'var(--color-border)',
                      borderRadius: '8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Warehouse size={20} color='var(--color-accent)' />
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{w.name}</h3>
                  </div>
                </div>

                {/* Location */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  fontSize: '12px'
                }}>
                  <MapPin size={14} />
                  <span>{w.location}</span>
                </div>

                {/* Capacity Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>CAPACITY USAGE</span>
                    <span style={{
                      fontWeight: 'bold',
                      color: utilizationPercentage > 80 ? '#ef4444' : utilizationPercentage > 60 ? '#f59e0b' : '#10b981'
                    }}>
                      {utilizationPercentage}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'var(--color-bg-primary)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(utilizationPercentage, 100)}%`,
                      backgroundColor: utilizationPercentage > 80 ? '#ef4444' : utilizationPercentage > 60 ? '#f59e0b' : '#10b981',
                      transition: 'width 300ms ease'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: 'var(--color-text-muted)' }}>
                    <span>{totalStock} / {w.capacity || '∞'} units</span>
                  </div>
                </div>

                {/* Stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--color-border)'
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                      Total Stock
                    </span>
                    <span style={{ fontSize: '18px', fontFamily: 'var(--font-heading)', fontWeight: 'bold' }}>
                      {totalStock}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                      Product Types
                    </span>
                    <span style={{ fontSize: '18px', fontFamily: 'var(--font-heading)', fontWeight: 'bold' }}>
                      {warehouseProducts.length}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '8px',
                backgroundColor: '#3B82F6', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '20px'
              }}>
                🏭
              </div>
              <h3 style={{ fontSize: '24px', margin: 0 }}>Register Warehouse</h3>
            </div>

            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                  Facility Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                  }}
                  placeholder="e.g., Main Warehouse, Distribution Center"
                  style={{ borderColor: errors.name ? '#ef4444' : undefined }}
                />
                {errors.name && <span style={{ fontSize: '12px', color: '#ef4444' }}>{errors.name}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                  Geographic Location *
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={e => {
                    setLocation(e.target.value);
                    if (errors.location) setErrors(prev => ({ ...prev, location: '' }));
                  }}
                  placeholder="e.g., New York, NY"
                  style={{ borderColor: errors.location ? '#ef4444' : undefined }}
                />
                {errors.location && <span style={{ fontSize: '12px', color: '#ef4444' }}>{errors.location}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                  Storage Capacity (units) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="100"
                  value={capacity}
                  onChange={e => {
                    setCapacity(e.target.value);
                    if (errors.capacity) setErrors(prev => ({ ...prev, capacity: '' }));
                  }}
                  placeholder="e.g., 10000"
                  style={{ borderColor: errors.capacity ? '#ef4444' : undefined }}
                />
                {errors.capacity && <span style={{ fontSize: '12px', color: '#ef4444' }}>{errors.capacity}</span>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setName('');
                    setLocation('');
                    setCapacity('');
                    setErrors({});
                  }}
                  className="btn-outline"
                  disabled={submitting}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="btn-solid"
                  disabled={submitting}
                  style={{ opacity: submitting ? 0.6 : 1 }}
                >
                  {submitting ? 'REGISTERING...' : 'REGISTER FACILITY'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouses;
