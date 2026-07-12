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
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.5px', margin: 0, color: 'var(--color-ink)' }}>Logistics Alert Registry</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Real-time quality control, stockouts, and carrier notifications</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--color-surface-soft)', padding: '8px 16px', borderRadius: 'var(--rounded-pill)', border: '1px solid var(--color-hairline)' }}>
          <AlertCircle size={16} style={{ color: 'var(--color-danger)' }} />
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-ink)' }}>{alerts.length} Active Records</span>
        </div>
      </div>

      {/* Filters Segment Control */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '32px',
        flexWrap: 'wrap',
        borderBottom: '1px solid var(--color-hairline)',
        paddingBottom: '16px'
      }}>
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--color-surface-soft)',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid var(--color-hairline)',
          gap: '2px'
        }}>
          {[
            { value: 'ACTIVE', label: 'Active Pipeline' },
            { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
            { value: 'RESOLVED', label: 'Resolved Archive' },
            { value: 'FALSE_POSITIVE', label: 'False Positives' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => { setFilterStatus(opt.value); setCurrentPage(1); }}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: filterStatus === opt.value ? '700' : '500',
                color: filterStatus === opt.value ? 'var(--color-on-primary)' : 'var(--color-body)',
                backgroundColor: filterStatus === opt.value ? 'var(--color-primary)' : 'transparent',
                borderRadius: '8px',
                transition: 'all 150ms ease',
                cursor: 'pointer'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Severity Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-muted)', fontWeight: '500' }}>Filter Severity:</span>
          <select
            value={filterSeverity || ''}
            onChange={(e) => { setFilterSeverity(e.target.value || null); setCurrentPage(1); }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-hairline)',
              backgroundColor: 'var(--color-canvas)',
              color: 'var(--color-ink)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              outline: 'none',
              width: 'auto',
              minWidth: '150px'
            }}
          >
            <option value="">All Levels</option>
            <option value="LOW">🟢 Low</option>
            <option value="MEDIUM">🟡 Medium</option>
            <option value="HIGH">🟠 High</option>
            <option value="CRITICAL">🔴 Critical</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'rgba(217, 45, 32, 0.1)',
          color: 'var(--color-danger)',
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '14px',
          border: '1px solid rgba(217, 45, 32, 0.2)'
        }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <Spinner />}

      {/* Alerts List */}
      {!loading && alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {alerts.map(alert => {
            const isUnread = alert.status === 'ACTIVE';
            const severityColor = getSeverityColor(alert.severity);
            return (
              <div
                key={alert._id}
                style={{
                  padding: '20px 24px',
                  border: '1px solid var(--color-hairline)',
                  borderLeft: `5px solid ${severityColor}`,
                  backgroundColor: isUnread ? 'var(--color-surface-soft)' : 'var(--color-canvas)',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 200ms ease',
                  boxShadow: isUnread ? '0 4px 12px rgba(0,0,0,0.02)' : 'none'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    {getStatusIcon(alert.status)}
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--color-ink)' }}>{alert.title}</h3>
                    <span style={{
                      padding: '3px 8px',
                      backgroundColor: getSeverityBgColor(alert.severity),
                      color: severityColor,
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      border: `1px solid ${severityColor}33`
                    }}>
                      {alert.severity}
                    </span>
                  </div>

                  <p style={{ margin: '4px 0 12px 30px', fontSize: '13.5px', color: 'var(--color-body)', lineHeight: '1.4' }}>
                    {alert.message}
                  </p>

                  <div style={{ display: 'flex', gap: '24px', marginLeft: '30px', fontSize: '11px', color: 'var(--color-muted)', fontWeight: '500' }}>
                    <span>Type: <strong style={{ color: 'var(--color-body)' }}>{alert.type}</strong></span>
                    <span>Created: {new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                  {alert.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => handleAcknowledge(alert._id)}
                        style={{
                          height: '36px',
                          padding: '0 16px',
                          fontSize: '13px',
                          fontWeight: '600',
                          backgroundColor: 'var(--color-canvas)',
                          color: 'var(--color-body)',
                          border: '1px solid var(--color-hairline)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 150ms'
                        }}
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => handleResolve(alert._id)}
                        style={{
                          height: '36px',
                          padding: '0 16px',
                          fontSize: '13px',
                          fontWeight: '600',
                          backgroundColor: 'var(--color-primary)',
                          color: 'var(--color-on-primary)',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 150ms'
                        }}
                      >
                        Resolve
                      </button>
                    </>
                  )}
                  {alert.status === 'ACKNOWLEDGED' && (
                    <button
                      onClick={() => handleResolve(alert._id)}
                      style={{
                        height: '36px',
                        padding: '0 16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        backgroundColor: 'var(--color-primary)',
                        color: 'var(--color-on-primary)',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 150ms'
                      }}
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
