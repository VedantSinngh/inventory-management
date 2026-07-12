import React, { useState, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import CreateOrderModal from '../components/CreateOrderModal';
import { ChevronDown, ChevronUp, Plus, Check, X } from 'lucide-react';

const renderStatusBadge = (status) => {
  const map = {
    COMPLETED: 'badge-success',
    PENDING:   'badge-warning',
    APPROVED:  'badge-info',
    CANCELLED: 'badge-danger',
  };
  return <span className={`badge ${map[status] || 'badge-muted'}`}>{status}</span>;
};

const Orders = () => {
  const { orders, api, fetchOrders, fetchProducts } = useContext(InventoryContext);
  const [selectedId, setSelectedId]   = useState(null);
  const [modalType, setModalType]     = useState(null);
  const [activeTab, setActiveTab]     = useState('ALL');
  const [expandedOrders, setExpandedOrders] = useState({});

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const tabs = ['ALL', 'PURCHASE', 'SALES', 'PENDING'];

  const filteredOrders = orders.filter(o => {
    if (activeTab === 'ALL')     return true;
    if (activeTab === 'PENDING') return o.status === 'PENDING';
    return o.type === activeTab;
  });

  const totalValue  = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const pendingCnt  = orders.filter(o => o.status === 'PENDING').length;
  const confirmedCnt = orders.filter(o => o.status === 'APPROVED' || o.status === 'COMPLETED').length;

  const doOrderAction = async (e, path, method = 'put', body, msg) => {
    e.stopPropagation();
    try {
      if (method === 'put') await api.put(path, body);
      else await api.post(path);
      await Promise.all([fetchOrders(), fetchProducts()]);
    } catch (err) { alert(err.message || 'Error'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ marginBottom: '6px' }}>Orders</h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)' }}>
            ${totalValue.toLocaleString()} total order value
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn-secondary"
            style={{ height: '40px', padding: '0 18px', fontSize: '14px' }}
            onClick={() => setModalType('PURCHASE')}
          >
            New purchase order
          </button>
          <button
            className="btn-primary"
            style={{ height: '40px', padding: '0 18px', fontSize: '14px', gap: '6px', display: 'inline-flex', alignItems: 'center' }}
            onClick={() => setModalType('SALES')}
          >
            <Plus size={14} /> New sales order
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { label: 'Total orders', value: orders.length, accent: 'var(--gradient-sky)' },
          { label: 'Pending approval', value: pendingCnt, accent: 'var(--gradient-peach)' },
          { label: 'Confirmed / Delivered', value: confirmedCnt, accent: 'var(--gradient-mint)' },
        ].map(s => (
          <div key={s.label} style={{
            backgroundColor: 'var(--color-surface-card)',
            border: '1px solid var(--color-hairline)',
            borderRadius: 'var(--rounded-xl)',
            overflow: 'hidden'
          }}>
            <div style={{ height: '2px', background: s.accent }} />
            <div style={{ padding: '20px 22px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.96px', color: 'var(--color-muted)', marginBottom: '8px' }}>
                {s.label}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: '300', color: 'var(--color-ink)', letterSpacing: '-0.72px', lineHeight: 1 }}>
                {s.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pill Tab Selector */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '4px',
        backgroundColor: 'var(--color-surface-soft)',
        borderRadius: 'var(--rounded-pill)',
        width: 'fit-content',
      }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '7px 18px',
              fontSize: '13px',
              fontWeight: '500',
              fontFamily: 'var(--font-body)',
              borderRadius: 'var(--rounded-pill)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              backgroundColor: activeTab === tab ? 'var(--color-surface-card)' : 'transparent',
              color: activeTab === tab ? 'var(--color-ink)' : 'var(--color-muted)',
              boxShadow: activeTab === tab ? '0 1px 4px rgba(12,10,9,0.08)' : 'none',
            }}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: '44px' }} />
              <th>Order ID</th>
              <th>Type</th>
              <th>Date</th>
              <th>Total value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '48px 20px' }}>
                  No orders found
                </td>
              </tr>
            ) : filteredOrders.map(order => {
              const isExpanded = expandedOrders[order._id];
              return (
                <React.Fragment key={order._id}>
                  <tr
                    onClick={() => setSelectedId(selectedId === order._id ? null : order._id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <button
                        onClick={(e) => toggleExpand(order._id, e)}
                        style={{
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: 'var(--color-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: '28px', height: '28px', borderRadius: 'var(--rounded-sm)',
                          transition: 'background-color 100ms'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-soft)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-muted)' }}>
                      {order._id.slice(-8).toUpperCase()}
                    </td>
                    <td>
                      <span className={`badge ${order.type === 'SALES' ? 'badge-info' : 'badge-muted'}`}>
                        {order.type}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
                      ${(order.totalAmount || 0).toLocaleString()}
                    </td>
                    <td>{renderStatusBadge(order.status)}</td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={6} style={{ padding: 0, backgroundColor: 'var(--color-canvas)' }}>
                        <div style={{
                          margin: '0 0 0 44px',
                          padding: '20px 24px',
                          borderLeft: '2px solid var(--color-hairline)',
                          backgroundColor: 'var(--color-surface-soft)',
                        }}>
                          <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.96px', color: 'var(--color-muted)', marginBottom: '14px' }}>
                            Line items
                          </div>

                          {order.items && order.items.length > 0 ? (
                            <>
                              <table style={{ width: '100%', marginBottom: '16px' }}>
                                <thead>
                                  <tr style={{ backgroundColor: 'transparent' }}>
                                    <th style={{ padding: '6px 12px', fontSize: '11px' }}>Product ID</th>
                                    <th style={{ padding: '6px 12px', fontSize: '11px' }}>Quantity</th>
                                    <th style={{ padding: '6px 12px', fontSize: '11px' }}>Unit price</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.items.map((item, idx) => (
                                    <tr key={idx} style={{ backgroundColor: 'transparent' }}>
                                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '12px' }}>
                                        {(item.product?._id || item.product || '').slice(-8).toUpperCase()}
                                      </td>
                                      <td style={{ padding: '8px 12px', fontVariantNumeric: 'tabular-nums' }}>{item.quantity}</td>
                                      <td style={{ padding: '8px 12px', fontVariantNumeric: 'tabular-nums' }}>${item.price || item.priceAtTime}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--color-hairline)' }}>
                                {order.status === 'PENDING' && (
                                  <>
                                    <button
                                      className="btn-primary"
                                      style={{ height: '34px', padding: '0 14px', fontSize: '13px', gap: '5px', display: 'inline-flex', alignItems: 'center', backgroundColor: '#15803d' }}
                                      onClick={e => doOrderAction(e, `/orders/${order._id}`, 'put', { status: 'APPROVED' })}
                                    >
                                      <Check size={13} /> Approve
                                    </button>
                                    <button
                                      className="btn-secondary"
                                      style={{ height: '34px', padding: '0 14px', fontSize: '13px', gap: '5px', display: 'inline-flex', alignItems: 'center', color: 'var(--color-danger)', borderColor: 'var(--color-danger-border)' }}
                                      onClick={e => doOrderAction(e, `/orders/${order._id}/cancel`, 'post')}
                                    >
                                      <X size={13} /> Cancel
                                    </button>
                                  </>
                                )}
                                {order.status === 'APPROVED' && (
                                  <button
                                    className="btn-primary"
                                    style={{ height: '34px', padding: '0 14px', fontSize: '13px', gap: '5px', display: 'inline-flex', alignItems: 'center' }}
                                    onClick={e => doOrderAction(e, `/orders/${order._id}`, 'put', { status: 'COMPLETED' })}
                                  >
                                    <Check size={13} /> Mark Complete
                                  </button>
                                )}
                              </div>
                            </>
                          ) : (
                            <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>No line items found</p>
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
