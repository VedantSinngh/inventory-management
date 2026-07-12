import React from 'react';

const SimpleCategoryBreakdown = ({ products }) => {
  const categoryData = products.reduce((acc, product) => {
    const category = product.category || 'Uncategorized';
    const existing = acc.find(c => c.name === category);
    if (existing) {
      existing.stock += product.stock || 0;
      existing.count += 1;
    } else {
      acc.push({ name: category, stock: product.stock || 0, count: 1 });
    }
    return acc;
  }, []);

  categoryData.sort((a, b) => b.stock - a.stock);

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const totalStock = categoryData.reduce((sum, c) => sum + c.stock, 0);

  return (
    <div className="card" style={{ height: '300px', display: 'flex', flexDirection: 'column', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-hairline)', boxShadow: '0 4px 20px rgba(0,0,0,0.01)' }}>
      <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--color-ink)' }}>
        Stock by Category
      </h3>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
        {categoryData.length === 0 ? (
          <p style={{ color: 'var(--color-muted)', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
            No products catalogued
          </p>
        ) : (
          categoryData.map((cat, idx) => {
            const percentage = totalStock > 0 ? (cat.stock / totalStock) * 100 : 0;
            const barColor = colors[idx % colors.length];
            return (
              <div key={cat.name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '500' }}>
                  <span style={{ color: 'var(--color-ink)' }}>{cat.name}</span>
                  <span style={{ color: 'var(--color-muted)' }}>
                    {cat.stock.toLocaleString()} units <span style={{ opacity: 0.6 }}>({cat.count} items)</span>
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: 'var(--color-surface-soft)',
                  borderRadius: '9999px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${percentage}%`,
                    backgroundColor: barColor,
                    borderRadius: '9999px',
                    transition: 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)'
                  }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SimpleCategoryBreakdown;
