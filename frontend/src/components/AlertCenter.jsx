import React, { useState, useEffect, useContext } from 'react';
import { AlertCircle, TrendingUp, Truck, Package, Clock, Bell } from 'lucide-react';
import { InventoryContext } from '../context/InventoryContext';

const AlertCenter = ({ isOpen, onClose }) => {
  const { api } = useContext(InventoryContext);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ACTIVE');
  const [filterSeverity, setFilterSeverity] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
  }, [filter, filterSeverity, isOpen]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/alerts', {
        params: {
          status: filter,
          severity: filterSeverity,
          limit: 50
        }
      });
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      await api.put(`/api/alerts/${alertId}/acknowledge`, {
        notes: 'Acknowledged by user'
      });
      fetchAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      await api.put(`/api/alerts/${alertId}/resolve`, {
        resolution: 'Resolved'
      });
      fetchAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'CRITICAL': '#DC2626',
      'HIGH': '#EF4444',
      'MEDIUM': '#F59E0B',
      'LOW': '#FBBF24'
    };
    return colors[severity] || '#6B7280';
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'STOCK_LOW':
      case 'STOCK_OUT':
        return '📦';
      case 'SHIPMENT_DELAYED':
        return '🚚';
      case 'EXPIRY_WARNING':
        return '⏰';
      case 'ANOMALY_DETECTED':
        return '🔍';
      default:
        return '⚠️';
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: 'rgba(15, 17, 21, 0.4)',
      backdropFilter: 'blur(8px)',
      zIndex: 2000,
      display: 'flex',
      justifyContent: 'flex-end',
      transition: 'opacity 250ms ease'
    }} onClick={onClose}>
      <div 
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--color-canvas)',
          height: '100%',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          overflowY: 'auto',
          borderLeft: '1px solid var(--color-hairline)',
          animation: 'slideIn 200ms cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--color-hairline)', paddingBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-ink)' }}>
            <Bell size={20} style={{ color: 'var(--color-primary)' }} /> Live Alert Feed
          </h2>
          <button onClick={onClose} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '20px', color: 'var(--color-muted)', padding: '4px' }}>✕</button>
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--color-surface-soft)',
          padding: '4px',
          borderRadius: '8px',
          border: '1px solid var(--color-hairline)',
          gap: '2px',
          marginBottom: '20px'
        }}>
          {[
            { value: 'ACTIVE', label: 'Active' },
            { value: 'ACKNOWLEDGED', label: 'Acknowledge' },
            { value: 'RESOLVED', label: 'Resolved' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: filter === opt.value ? '700' : '500',
                color: filter === opt.value ? 'var(--color-on-primary)' : 'var(--color-body)',
                backgroundColor: filter === opt.value ? 'var(--color-primary)' : 'transparent',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 150ms',
                border: 'none'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Alerts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-muted)' }}>
              Loading alerts...
            </div>
          ) : alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-muted)' }}>
              No {filter.toLowerCase()} alerts
            </div>
          ) : (
            alerts.map(alert => (
              <div
                key={alert._id}
                style={{
                  border: '1px solid var(--color-hairline)',
                  borderLeft: `4px solid ${getSeverityColor(alert.severity)}`,
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  backgroundColor: 'var(--color-surface-soft)',
                  borderRadius: '8px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '16px' }}>{getAlertIcon(alert.type)}</span>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: 'var(--color-ink)' }}>{alert.title}</h3>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-body)', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                    {alert.message}
                  </p>
                  <div style={{ fontSize: '10px', color: 'var(--color-muted)' }}>
                    {new Date(alert.createdAt).toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: '12px' }}>
                  {alert.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => acknowledgeAlert(alert._id)}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: 'var(--color-canvas)',
                          color: 'var(--color-body)',
                          border: '1px solid var(--color-hairline)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}
                      >
                        Ack
                      </button>
                      <button
                        onClick={() => resolveAlert(alert._id)}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: 'var(--color-primary)',
                          color: 'var(--color-on-primary)',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}
                      >
                        Resolve
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default AlertCenter;