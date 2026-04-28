import React, { useState, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { AuthContext } from '../context/AuthContext';

const Warehouses = () => {
  const { warehouses, products, fetchWarehouses } = useContext(InventoryContext);
  const { user } = useContext(AuthContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ name, location })
      });
      if (res.ok) {
        fetchWarehouses();
        setName('');
        setLocation('');
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '28px' }}>WAREHOUSE NETWORK</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{warehouses.length} ACTIVE LOCATIONS</p>
        </div>
        <button className="btn-solid" onClick={() => setIsModalOpen(true)}>REGISTER NEW FACILITY</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
        {warehouses.map(w => {
          const warehouseProducts = products.filter(p => p.warehouse === w._id || p.warehouse?._id === w._id);
          const totalStock = warehouseProducts.reduce((acc, p) => acc + p.stock, 0);
          
          return (
            <div key={w._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ fontSize: '20px' }}>{w.name}</h3>
                <span className="badge">{w.location}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>TOTAL STOCK CAPACITY</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '18px' }}>{totalStock}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>PRODUCT VARIETIES</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '18px' }}>{warehouseProducts.length}</div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <h3 style={{ fontSize: '24px', marginBottom: '20px' }}>REGISTER FACILITY</h3>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>FACILITY NAME</label>
                <input value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>GEOGRAPHIC LOCATION</label>
                <input value={location} onChange={e => setLocation(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline">CANCEL</button>
                <button type="submit" className="btn-solid">SAVE FACILITY</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouses;
