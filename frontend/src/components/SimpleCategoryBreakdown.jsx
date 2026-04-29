import React from 'react';

const SimpleCategoryBreakdown = ({ products }) => {
  // Group products by category
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

  // Sort by stock quantity
  categoryData.sort((a, b) => b.stock - a.stock);

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const totalStock = categoryData.reduce((sum, c) => sum + c.stock, 0);

  return (
    <div className="card" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase' }}>
        📦 Stock by Category
      </h3>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        {categoryData.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
            No products yet
          </p>
        ) : (
          categoryData.map((cat, idx) => {
            const percentage = totalStock > 0 ? (cat.stock / totalStock) * 100 : 0;
            return (
              <div key={cat.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
                  <span style={{ fontWeight: '500' }}>{cat.name}</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {cat.stock} units ({cat.count} items)
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '24px',
                  backgroundColor: 'var(--color-bg-primary)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${percentage}%`,
                    backgroundColor: colors[idx % colors.length],
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: percentage > 30 ? 'white' : 'transparent',
                    transition: 'width 300ms ease'
                  }}>
                    {percentage > 30 ? `${Math.round(percentage)}%` : ''}
                  </div>
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
