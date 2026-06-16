import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, XCircle, Filter } from 'lucide-react';
import Spinner from '../components/Spinner';
import apiService from '../services/api';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ACTIVE');
  const [filterSeverity, setFilterSeverity] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchAlerts();
  }, [filterStatus, filterSeverity, currentPage]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {
        status: filterStatus,
        ...(filterSeverity && { severity: filterSeverity })
      };

      const response = await apiService.getAlerts(currentPage, 20, filters);
      
      setAlerts(response.data || []);
      setTotalPages(response.pagination?.pages || 1);
    } catch (err) {
      setError('Failed to fetch alerts');
      console.error('Error fetching alerts:', err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await apiService.acknowledgeAlert(alertId);
      fetchAlerts();
    } catch (err) {
      setError('Failed to acknowledge alert');
      console.error('Error acknowledging alert:', err);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      await apiService.resolveAlert(alertId, 'Resolved by user');
      fetchAlerts();
    } catch (err) {
      setError('Failed to resolve alert');
      console.error('Error resolving alert:', err);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'CRITICAL': '#DC2626',
      'HIGH': '#EF4444',
      'MEDIUM': '#F59E0B',
      'LOW': '#10B981'
    };
    return colors[severity] || '#6B7280';
  };

  const getSeverityBgColor = (severity) => {
    const colors = {
      'CRITICAL': 'rgba(220, 38, 38, 0.1)',
      'HIGH': 'rgba(239, 68, 68, 0.1)',
      'MEDIUM': 'rgba(245, 158, 11, 0.1)',
      'LOW': 'rgba(16, 185, 129, 0.1)'
    };
    return colors[severity] || 'rgba(107, 114, 128, 0.1)';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <AlertCircle size={18} style={{ color: '#EF4444' }} />;
      case 'ACKNOWLEDGED':
        return <Clock size={18} style={{ color: '#F59E0B' }} />;
      case 'RESOLVED':
        return <CheckCircle size={18} style={{ color: '#10B981' }} />;
      case 'FALSE_POSITIVE':
        return <XCircle size={18} style={{ color: '#6B7280' }} />;
      default:
        return <AlertCircle size={18} />;
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', margin: 0 }}>Alert Center</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--color-text-secondary)' }}>
          <AlertCircle size={18} />
          <span>{alerts.length} alerts</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        padding: '16px',
        backgroundColor: 'var(--color-bg-secondary)',
        borderRadius: '8px',
        alignItems: 'center'
      }}>
        <Filter size={18} style={{ color: 'var(--color-text-secondary)' }} />
        
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-primary)',
            color: 'var(--color-text-heading)',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          <option value="ACTIVE">Active</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved</option>
          <option value="FALSE_POSITIVE">False Positive</option>
        </select>

        <select
          value={filterSeverity || ''}
          onChange={(e) => { setFilterSeverity(e.target.value || null); setCurrentPage(1); }}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-primary)',
            color: 'var(--color-text-heading)',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          <option value="">All Severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'rgba(220, 38, 38, 0.1)',
          color: '#DC2626',
          borderRadius: '4px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <Spinner />}

      {/* Alerts List */}
      {!loading && alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {alerts.map(alert => {
            const isCritical = alert.severity === 'CRITICAL' || alert.severity === 'HIGH';
            const isUnread = alert.status === 'ACTIVE';
            return (
              <div
                key={alert._id}
                style={{
                  padding: '16px 20px',
                  border: '1px solid var(--color-border)',
                  borderLeft: `4px solid ${getSeverityColor(alert.severity)}`,
                  backgroundColor: isUnread ? 'var(--color-surface-2)' : 'var(--color-surface-1)',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 150ms ease'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                    {getStatusIcon(alert.status)}
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'var(--color-text-primary)' }}>{alert.title}</h3>
                    <span className={`badge ${
                      alert.severity === 'CRITICAL' ? 'badge-danger' : 
                      alert.severity === 'HIGH' ? 'badge-danger' : 
                      alert.severity === 'MEDIUM' ? 'badge-warning' : 'badge-success'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>

                  <p style={{ margin: '4px 0 8px 30px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    {alert.message}
                  </p>

                  <div style={{ display: 'flex', gap: '24px', marginLeft: '30px', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                    <span>Type: {alert.type}</span>
                    <span>Created: {new Date(alert.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                  {alert.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => handleAcknowledge(alert._id)}
                        className="btn-secondary"
                        style={{ height: '30px', padding: '0 12px', fontSize: '12px' }}
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => handleResolve(alert._id)}
                        className="btn-primary"
                        style={{ height: '30px', padding: '0 12px', fontSize: '12px' }}
                      >
                        Resolve
                      </button>
                    </>
                  )}
                  {alert.status === 'ACKNOWLEDGED' && (
                    <button
                      onClick={() => handleResolve(alert._id)}
                      className="btn-primary"
                      style={{ height: '30px', padding: '0 12px', fontSize: '12px' }}
                    >
                      Resolve
                    </button>
                  )}
                  {(alert.status === 'RESOLVED' || alert.status === 'FALSE_POSITIVE') && (
                    <span style={{ color: 'var(--color-text-tertiary)', fontSize: '12px', fontWeight: '500' }}>
                      {alert.status}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && alerts.length === 0 && (
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--color-text-secondary)'
        }}>
          <AlertCircle size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', margin: 0 }}>No alerts found</p>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginTop: '24px',
          padding: '16px'
        }}>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '8px 16px',
              backgroundColor: currentPage === 1 ? 'var(--color-bg-secondary)' : 'var(--color-accent)',
              color: currentPage === 1 ? 'var(--color-text-secondary)' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            ← Previous
          </button>
          
          <span style={{ padding: '8px 16px', color: 'var(--color-text-secondary)' }}>
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 16px',
              backgroundColor: currentPage === totalPages ? 'var(--color-bg-secondary)' : 'var(--color-accent)',
              color: currentPage === totalPages ? 'var(--color-text-secondary)' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default Alerts;
