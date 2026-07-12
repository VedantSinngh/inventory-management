import React, { useState, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { MapPin, Plus, X, ArrowLeft } from 'lucide-react';

const Warehouses = () => {
  const { warehouses, products, fetchWarehouses } = useContext(InventoryContext);
  const { success, error: showError } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Facility name is required';
    if (!location.trim()) e.location = 'Location is required';
    if (!capacity || capacity <= 0) e.capacity = 'Capacity must be greater than 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    try {
      setSubmitting(true);
      await api.createWarehouse({ name: name.trim(), location: location.trim(), capacity: Number(capacity) });
      success('Warehouse registered successfully!');
      setName(''); setLocation(''); setCapacity(''); setErrors({});
      setIsModalOpen(false);
      await fetchWarehouses();
    } catch (err) {
      showError(err.data?.message || err.message || 'Failed to register warehouse');
    } finally { setSubmitting(false); }
  };

  const closeModal = () => { setIsModalOpen(false); setName(''); setLocation(''); setCapacity(''); setErrors({}); };

  const activeWarehouse = warehouses.find(w => w._id === selectedWarehouseId);

  // Drill-down view
  if (activeWarehouse) {
    const warehouseProducts = products.filter(p => p.warehouse === activeWarehouse._id || p.warehouse?._id === activeWarehouse._id);
    const zones = {};
    warehouseProducts.forEach(p => {
      const cat = p.category || 'Unassigned';
      if (!zones[cat]) zones[cat] = [];
      zones[cat].push(p);
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <button
              onClick={() => setSelectedWarehouseId(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', padding: 0 }}
            >
              <ArrowLeft size={13} /> Warehouse network
            </button>
            <h1 style={{ marginBottom: '4px' }}>{activeWarehouse.name}</h1>
            <p style={{ fontSize: '15px', color: 'var(--color-muted)' }}>{warehouseProducts.length} SKUs allocated across {Object.keys(zones).length} zones</p>
          </div>
          <button className="btn-secondary" onClick={() => setSelectedWarehouseId(null)} style={{ height: '38px', padding: '0 18px', fontSize: '14px' }}>
            Back to network
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {Object.keys(zones).length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '64px', color: 'var(--color-muted)' }}>
              No inventory allocated in this warehouse
            </div>
          ) : Object.entries(zones).map(([zone, items]) => (
            <div key={zone} style={{
              backgroundColor: 'var(--color-surface-card)',
              border: '1px solid var(--color-hairline)',
              borderRadius: 'var(--rounded-xl)',
              padding: '20px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.96px', color: 'var(--color-muted)', marginBottom: '6px' }}>Zone</div>
              <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: '500', marginBottom: '16px', color: 'var(--color-ink)' }}>{zone}</h3>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '10px' }}>{items.length} SKUs allocated</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {items.slice(0, 5).map(p => (
                  <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--rounded-md)', fontSize: '13px' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px', color: 'var(--color-body)' }}>{p.name}</span>
                    <span style={{ fontWeight: '600', fontVariantNumeric: 'tabular-nums', color: 'var(--color-ink)', flexShrink: 0 }}>{p.stock}</span>
                  </div>
                ))}
                {items.length > 5 && (
                  <p style={{ fontSize: '12px', color: 'var(--color-muted)', textAlign: 'center', marginTop: '4px' }}>
                    +{items.length - 5} more items
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ marginBottom: '6px' }}>Warehouses</h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)' }}>
            {warehouses.length} active facilit{warehouses.length !== 1 ? 'ies' : 'y'} in your network
          </p>
        </div>
        <button
          className="btn-primary"
          style={{ height: '40px', padding: '0 18px', fontSize: '14px', gap: '6px', display: 'inline-flex', alignItems: 'center' }}
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={14} /> Register facility
        </button>
      </div>

      {/* Warehouse Grid */}
      {warehouses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', backgroundColor: 'var(--color-surface-card)', border: '1px solid var(--color-hairline)', borderRadius: 'var(--rounded-xl)' }}>
          <p style={{ color: 'var(--color-muted)', marginBottom: '20px', fontSize: '15px' }}>No warehouses registered yet</p>
          <button className="btn-primary" style={{ height: '40px', padding: '0 18px' }} onClick={() => setIsModalOpen(true)}>
            Register your first facility
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {warehouses.map(w => {
            const wProducts = products.filter(p => p.warehouse === w._id || p.warehouse?._id === w._id);
            const totalStock = wProducts.reduce((acc, p) => acc + (p.stock || 0), 0);
            const util = w.capacity ? Math.round((totalStock / w.capacity) * 100) : 0;
            const isCritical = util > 80;
            const barColor = isCritical ? 'var(--color-danger)' : util > 60 ? 'var(--color-warning)' : 'var(--color-success)';

            return (
              <div
                key={w._id}
                onClick={() => setSelectedWarehouseId(w._id)}
                style={{
                  backgroundColor: 'var(--color-surface-card)',
                  border: `1px solid ${isCritical ? 'var(--color-danger-border)' : 'var(--color-hairline)'}`,
                  borderRadius: 'var(--rounded-xl)',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'box-shadow 200ms ease, transform 200ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(12,10,9,0.06)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: '500', marginBottom: '4px' }}>{w.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--color-muted)' }}>
                      <MapPin size={12} /> {w.location}
                    </div>
                  </div>
                  <span className={`badge ${isCritical ? 'badge-danger' : 'badge-success'}`}>
                    {isCritical ? 'High load' : 'Operational'}
                  </span>
                </div>

                {/* Capacity Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--color-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.6px', fontSize: '11px' }}>Capacity</span>
                    <span style={{ fontWeight: '600', color: barColor }}>{util}%</span>
                  </div>
                  <div style={{ height: '5px', backgroundColor: 'var(--color-surface-strong)', borderRadius: 'var(--rounded-pill)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(util, 100)}%`, backgroundColor: barColor, borderRadius: 'var(--rounded-pill)', transition: 'width 300ms ease' }} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '5px' }}>
                    {totalStock.toLocaleString()} / {(w.capacity || 0).toLocaleString()} units
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-hairline)' }}>
                  {[
                    { label: 'Total units', value: totalStock.toLocaleString() },
                    { label: 'Categories', value: [...new Set(wProducts.map(p => p.category))].length },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: '600', marginBottom: '3px' }}>{s.label}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '300', color: 'var(--color-ink)' }}>{s.value}</div>
                    </div>
                  ))}
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
          backgroundColor: 'rgba(12, 10, 9, 0.4)',
          backdropFilter: 'blur(6px)',
          zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            backgroundColor: 'var(--color-surface-card)',
            border: '1px solid var(--color-hairline)',
            borderRadius: 'var(--rounded-xxl)',
            padding: '36px 36px',
            width: '100%',
            maxWidth: '460px',
            boxShadow: '0 16px 48px rgba(12, 10, 9, 0.12)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '300', marginBottom: '4px' }}>Register facility</h2>
                <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>Add a new warehouse to your network</p>
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: '4px', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {[
                { label: 'Facility name', key: 'name', val: name, set: setName, type: 'text', ph: 'e.g. Main Warehouse' },
                { label: 'Location', key: 'location', val: location, set: setLocation, type: 'text', ph: 'e.g. New York, NY' },
                { label: 'Storage capacity (units)', key: 'capacity', val: capacity, set: setCapacity, type: 'number', ph: 'e.g. 10000', min: 1, step: 100 },
              ].map(f => (
                <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: errors[f.key] ? 'var(--color-danger)' : 'var(--color-body)', marginBottom: 0 }}>
                    {f.label} *
                  </label>
                  <input
                    type={f.type}
                    value={f.val}
                    onChange={e => { f.set(e.target.value); if (errors[f.key]) setErrors(p => ({ ...p, [f.key]: '' })); }}
                    placeholder={f.ph}
                    min={f.min}
                    step={f.step}
                    style={{ height: '44px', borderColor: errors[f.key] ? 'var(--color-danger-border)' : undefined }}
                  />
                  {errors[f.key] && <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-danger)' }}>{errors[f.key]}</p>}
                </div>
              ))}

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={closeModal} className="btn-secondary" style={{ flex: 1, height: '44px' }}>Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary" style={{ flex: 2, height: '44px' }}>
                  {submitting ? 'Registering…' : 'Register facility'}
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
