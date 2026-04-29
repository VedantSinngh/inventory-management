import React, { useState, useEffect, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { Calendar, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';

const Batches = () => {
  const { api } = useContext(InventoryContext);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('APPROVED');
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchBatches();
    fetchAnalytics();
  }, [filter]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/batches', {
        params: { limit: 50 }
      });
      const filtered = response.data.filter(b => b.qualityStatus === filter);
      setBatches(filtered);
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/api/batches/analytics/overview');
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const getQualityColor = (status) => {
    const colors = {
      'APPROVED': '#10B981',
      'PENDING_INSPECTION': '#F59E0B',
      'QUARANTINED': '#EF4444',
      'REJECTED': '#DC2626',
      'EXPIRED': '#6B7280'
    };
    return colors[status] || '#6B7280';
  };

  const getDaysUntilExpiry = (expiryDate) => {
    const days = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getExpiryStatus = (expiryDate) => {
    const days = getDaysUntilExpiry(expiryDate);
    if (days < 0) return { label: 'Expired', color: '#EF4444', icon: '❌' };
    if (days <= 7) return { label: 'Expiring Soon', color: '#DC2626', icon: '⚠️' };
    if (days <= 30) return { label: 'Warning', color: '#F59E0B', icon: '⚡' };
    return { label: 'Safe', color: '#10B981', icon: '✓' };
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>Batch & Expiry Management</h1>

      {/* Analytics Cards */}
      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Total Batches
            </div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#3B82F6' }}>{analytics.totalBatches}</div>
          </div>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Active
            </div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#10B981' }}>{analytics.activeBatches}</div>
          </div>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Expiring Soon
            </div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#F59E0B' }}>{analytics.expiringSoon}</div>
          </div>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Expired
            </div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#EF4444' }}>{analytics.expiredBatches}</div>
          </div>
        </div>
      )}

      {/* Quality Status Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['APPROVED', 'PENDING_INSPECTION', 'QUARANTINED', 'EXPIRED'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              padding: '8px 16px',
              backgroundColor: filter === status ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
              color: 'var(--color-text-heading)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {status.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Batches Table */}
      <div style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
            Loading batches...
          </div>
        ) : batches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
            No batches found
          </div>
        ) : (
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px'
          }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Batch Number</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Product</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Quantity</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Mfg Date</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Expiry Date</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Days Left</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch, idx) => {
                const expiryStatus = getExpiryStatus(batch.expiryDate);
                const daysLeft = getDaysUntilExpiry(batch.expiryDate);
                return (
                  <tr
                    key={batch._id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--color-bg-secondary)',
                      hover: { backgroundColor: 'var(--color-border)' }
                    }}
                  >
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>{batch.batchNumber}</div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>
                      {batch.product?.name || 'N/A'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>
                      {batch.quantityAvailable} / {batch.quantityReceived}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>
                      {new Date(batch.manufacturingDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>
                      {new Date(batch.expiryDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: getQualityColor(batch.qualityStatus),
                        color: 'white',
                        borderRadius: '3px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {batch.qualityStatus}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{expiryStatus.icon}</span>
                        <span style={{ color: expiryStatus.color, fontWeight: '600' }}>
                          {daysLeft} days
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Alert Box */}
      {analytics && analytics.expiringSoon > 0 && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: '#FEF3C7',
          border: '1px solid #F59E0B',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertCircle size={20} color="#F59E0B" />
          <div>
            <strong>Attention:</strong> {analytics.expiringSoon} batches expiring within 30 days. Review rotation recommendations.
          </div>
        </div>
      )}
    </div>
  );
};

export default Batches;