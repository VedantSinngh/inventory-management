import React, { useState, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import CreateOrderModal from '../components/CreateOrderModal';

const Orders = () => {
  const { orders } = useContext(InventoryContext);
  const [selectedId, setSelectedId] = useState(null);
  const [modalType, setModalType] = useState(null);

  const renderStatusBadge = (status) => {
    if (status === 'COMPLETED') {
      return <span className="badge solid">COMPLETED</span>;
    }
    return <span className="badge">{status}</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '28px' }}>ORDER MANAGEMENT</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>TRACK PURCHASES AND SALES</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-outline" onClick={() => setModalType('PURCHASE')}>NEW PURCHASE</button>
          <button className="btn-solid" onClick={() => setModalType('SALES')}>NEW SALES ORDER</button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ORDER ID</th>
              <th>TYPE</th>
              <th>DATE</th>
              <th>TOTAL VALUE</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr 
                key={order._id} 
                className={selectedId === order._id ? 'selected' : ''}
                onClick={() => setSelectedId(order._id)}
              >
                <td style={{ color: 'var(--color-text-heading)' }}>...{order._id.slice(-5)}</td>
                <td>{order.type}</td>
                <td style={{ color: 'var(--color-text-secondary)' }}>{new Date(order.createdAt).toLocaleDateString()}</td>
                <td style={{ fontFamily: 'var(--font-heading)', fontSize: '16px' }}>${order.totalAmount}</td>
                <td>{renderStatusBadge(order.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <CreateOrderModal 
        isOpen={!!modalType} 
        type={modalType} 
        onClose={() => setModalType(null)} 
      />
    </div>
  );
};

export default Orders;
