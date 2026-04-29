import React, { useState, useEffect, useContext } from 'react';
import { AlertCircle, TrendingUp, Truck, Package, Clock } from 'lucide-react';
import { InventoryContext } from '../context/InventoryContext';

const AlertCenter = () => {
  const { api } = useContext(InventoryContext);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ACTIVE');
  const [filterSeverity, setFilterSeverity] = useState(null);

  useEffect(() => {
    fetchAlerts();
  }, [filter, filterSeverity]);

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

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>Alert Center</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => setFilter('ACTIVE')}
          style={{
            padding: '8px 16px',
            backgroundColor: filter === 'ACTIVE' ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
            color: 'var(--color-text-heading)',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Active
        </button>
        <button
          onClick={() => setFilter('ACKNOWLEDGED')}
          style={{
            padding: '8px 16px',
            backgroundColor: filter === 'ACKNOWLEDGED' ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
            color: 'var(--color-text-heading)',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Acknowledged
        </button>
        <button
          onClick={() => setFilter('RESOLVED')}
          style={{
            padding: '8px 16px',
            backgroundColor: filter === 'RESOLVED' ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
            color: 'var(--color-text-heading)',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Resolved
        </button>
      </div>

      {/* Alerts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
            Loading alerts...
          </div>
        ) : alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
            No {filter.toLowerCase()} alerts
          </div>
        ) : (
          alerts.map(alert => (
            <div
              key={alert._id}
              className="card"
              style={{
                borderLeft: `4px solid ${getSeverityColor(alert.severity)}`,
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{getAlertIcon(alert.type)}</span>
                  <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{alert.title}</h3>
                  <span style={{
                    padding: '2px 8px',
                    backgroundColor: getSeverityColor(alert.severity),
                    color: 'white',
                    borderRadius: '3px',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    {alert.severity}
                  </span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                  {alert.message}
                </p>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  {new Date(alert.createdAt).toLocaleString()}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                {alert.status === 'ACTIVE' && (
                  <>
                    <button
                      onClick={() => acknowledgeAlert(alert._id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#3B82F6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => resolveAlert(alert._id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#10B981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
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
  );
};

export default AlertCenter;