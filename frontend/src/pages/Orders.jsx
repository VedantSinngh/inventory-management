import React, { useState, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import CreateOrderModal from '../components/CreateOrderModal';
import { ChevronDown, ChevronUp, Plus, ShoppingBag } from 'lucide-react';

const Orders = () => {
  const { orders } = useContext(InventoryContext);
  const [selectedId, setSelectedId] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [expandedOrders, setExpandedOrders] = useState({});

  const toggleExpand = (orderId, e) => {
    e.stopPropagation();
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="badge badge-success">COMPLETED</span>;
      case 'PENDING':
        return <span className="badge badge-warning">PENDING</span>;
      case 'APPROVED':
        return <span className="badge badge-info">APPROVED</span>;
      case 'CANCELLED':
        return <span className="badge badge-danger">CANCELLED</span>;
      default:
        return <span className="badge badge-muted">{status}</span>;
    }
  };

  const tabs = ['ALL', 'PURCHASE', 'SALES', 'PENDING APPROVAL'];

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'PENDING APPROVAL') return order.status === 'PENDING';
    return order.type === activeTab;
  });

  // Funnel calculations
  const pendingCount = orders.filter(o => o.status === 'PENDING').length;
  const approvedCount = orders.filter(o => o.status === 'APPROVED' || o.status === 'COMPLETED').length;
  const totalValue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', letterSpacing: '-0.3px', margin: 0 }}>ORDER LOGISTICS</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginTop: '4px' }}>
            TOTAL VALUE TRANSACTED: ${totalValue.toLocaleString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={() => setModalType('PURCHASE')}>
            NEW PURCHASE
          </button>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setModalType('SALES')}>
            <Plus size={16} /> NEW SALES ORDER
          </button>
        </div>
      </div>

      {/* Funnel Pipeline Visualizer */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        backgroundColor: 'var(--color-surface-1)',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid var(--color-border)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>TOTAL ACTIVE PIPELINE</div>
          <div style={{ fontSize: '24px', fontWeight: '700', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>{orders.length}</div>
        </div>
        <div style={{ textAlign: 'center', borderLeft: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>PENDING APPROVAL</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-warning)', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>{pendingCount}</div>
        </div>
        <div style={{ textAlign: 'center', borderLeft: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>CONFIRMED / DELIVERED</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-success)', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>{approvedCount}</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--color-border)' }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: '500',
              color: activeTab === tab ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              borderBottom: activeTab === tab ? '2px solid var(--color-accent)' : '2px solid transparent',
              marginBottom: '-1px'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>ORDER ID</th>
              <th>TYPE</th>
              <th>DATE</th>
              <th>TOTAL VALUE</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => {
              const isSelected = selectedId === order._id;
              const isExpanded = expandedOrders[order._id];
              return (
                <React.Fragment key={order._id}>
                  <tr 
                    className={isSelected ? 'selected' : ''}
                    onClick={() => setSelectedId(isSelected ? null : order._id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <button className="btn-icon" style={{ background: 'transparent' }} onClick={(e) => toggleExpand(order._id, e)}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </td>
                    <td style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {order._id.slice(-8).toUpperCase()}
                    </td>
                    <td>
                      <span className={`badge ${order.type === 'SALES' ? 'badge-info' : 'badge-muted'}`}>
                        {order.type}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: '600' }}>
                      ${order.totalAmount?.toLocaleString()}
                    </td>
                    <td>{renderStatusBadge(order.status)}</td>
                  </tr>

                  {/* Expandable Line Items details */}
                  {isExpanded && (
                    <tr>
                      <td colSpan="6" style={{ padding: '0 0 0 40px', backgroundColor: 'var(--color-surface-1)' }}>
                        <div style={{ padding: '16px 20px', borderLeft: '2px solid var(--color-accent)' }}>
                          <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                            ORDER LINE ITEMS DETAILED LEDGER
                          </h4>
                          {order.items && order.items.length > 0 ? (
                            <table style={{ width: '100%' }}>
                              <thead>
                                <tr style={{ background: 'transparent', height: '32px' }}>
                                  <th style={{ padding: '6px 12px', fontSize: '10px' }}>PRODUCT ID</th>
                                  <th style={{ padding: '6px 12px', fontSize: '10px' }}>QUANTITY</th>
                                  <th style={{ padding: '6px 12px', fontSize: '10px' }}>UNIT PRICE</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items.map((item, idx) => (
                                  <tr key={idx} style={{ height: '36px', background: 'transparent' }}>
                                    <td style={{ padding: '6px 12px', color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                                      {item.product?._id ? item.product._id.slice(-8).toUpperCase() : (item.product || '').slice(-8).toUpperCase()}
                                    </td>
                                    <td style={{ padding: '6px 12px', fontVariantNumeric: 'tabular-nums' }}>{item.quantity}</td>
                                    <td style={{ padding: '6px 12px', fontVariantNumeric: 'tabular-nums' }}>${item.price}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>No custom item records loaded.</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
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
