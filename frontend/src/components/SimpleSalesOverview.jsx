import React from 'react';

const SimpleSalesOverview = ({ orders }) => {
  // Calculate this month's data
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const monthOrders = orders.filter(o => {
    const orderDate = new Date(o.createdAt);
    return orderDate >= monthStart && orderDate <= monthEnd;
  });

  const salesOrders = monthOrders.filter(o => o.type === 'SALES');
  const purchaseOrders = monthOrders.filter(o => o.type === 'PURCHASE');

  const salesRevenue = salesOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const purchaseCost = purchaseOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const profit = salesRevenue - purchaseCost;

  return (
    <div className="card" style={{ height: '350px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', textTransform: 'uppercase' }}>
        💰 This Month Overview
      </h3>

      {monthOrders.length === 0 ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted)',
          fontSize: '13px',
          textAlign: 'center'
        }}>
          No orders this month yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Sales Revenue */}
          <div style={{
            backgroundColor: 'var(--color-bg-primary)',
            padding: '16px',
            borderRadius: '6px',
            border: '2px solid #10B981'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>📤 SALES REVENUE</span>
              <span style={{ color: '#10B981', fontWeight: 'bold', fontSize: '12px' }}>
                {salesOrders.length} orders
              </span>
            </div>
            <div style={{
              fontSize: '28px',
              fontFamily: 'var(--font-heading)',
              fontWeight: 'bold',
              color: '#10B981'
            }}>
              ${salesRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
          </div>

          {/* Purchase Cost */}
          <div style={{
            backgroundColor: 'var(--color-bg-primary)',
            padding: '16px',
            borderRadius: '6px',
            border: '2px solid #3B82F6'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>📥 PURCHASE COST</span>
              <span style={{ color: '#3B82F6', fontWeight: 'bold', fontSize: '12px' }}>
                {purchaseOrders.length} orders
              </span>
            </div>
            <div style={{
              fontSize: '28px',
              fontFamily: 'var(--font-heading)',
              fontWeight: 'bold',
              color: '#3B82F6'
            }}>
              ${purchaseCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
          </div>

          {/* Profit */}
          <div style={{
            backgroundColor: 'var(--color-bg-primary)',
            padding: '16px',
            borderRadius: '6px',
            border: `2px solid ${profit >= 0 ? '#10B981' : '#EF4444'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>📈 NET PROFIT</span>
              <span style={{
                color: profit >= 0 ? '#10B981' : '#EF4444',
                fontWeight: 'bold',
                fontSize: '12px'
              }}>
                {profit >= 0 ? '+' : '-'}{Math.abs(profit).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div style={{
              fontSize: '28px',
              fontFamily: 'var(--font-heading)',
              fontWeight: 'bold',
              color: profit >= 0 ? '#10B981' : '#EF4444'
            }}>
              ${Math.abs(profit).toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleSalesOverview;
