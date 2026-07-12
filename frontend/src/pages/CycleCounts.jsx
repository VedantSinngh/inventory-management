import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, Plus, Edit2, BarChart3 } from 'lucide-react';
import Spinner from '../components/Spinner';
import apiService from '../services/api';

const statusBadgeClass = {
  PLANNED:     'badge-muted',
  IN_PROGRESS: 'badge-warning',
  COMPLETED:   'badge-success',
  CANCELLED:   'badge-danger',
};

const priorityBadgeClass = {
  LOW:      'badge-success',
  MEDIUM:   'badge-warning',
  HIGH:     'badge-danger',
  CRITICAL: 'badge-danger',
};

const StatusIcon = ({ status }) => {
  const icons = {
    PLANNED:     <Clock size={15} style={{ color: 'var(--color-muted)' }} />,
    IN_PROGRESS: <AlertCircle size={15} style={{ color: 'var(--color-warning)' }} />,
    COMPLETED:   <CheckCircle size={15} style={{ color: 'var(--color-success)' }} />,
    CANCELLED:   <AlertCircle size={15} style={{ color: 'var(--color-danger)' }} />,
  };
  return icons[status] || <Clock size={15} />;
};

const CycleCounts = () => {
  const [cycleCounts, setCycleCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('PLANNED');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingCycleCount, setEditingCycleCount] = useState(null);
  const [formData, setFormData] = useState({ warehouse: '', status: 'PLANNED', type: 'PARTIAL', scheduledDate: '', priority: 'MEDIUM' });

  useEffect(() => { fetchCycleCounts(); }, [filterStatus, currentPage]);

  const fetchCycleCounts = async () => {
    try {
      setLoading(true); setError(null);
      const response = await apiService.getCycleCounts(currentPage, 20, { status: filterStatus });
      setCycleCounts(response.data || []);
      setTotalPages(response.pagination?.pages || 1);
    } catch (err) { setError('Failed to fetch cycle counts'); setCycleCounts([]); }
    finally { setLoading(false); }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCycleCount) {
        await apiService.updateCycleCountStatus(editingCycleCount._id, formData.status);
      } else {
        setError('Create cycle count not yet implemented');
        return;
      }
      setShowForm(false); setEditingCycleCount(null);
      setFormData({ warehouse: '', status: 'PLANNED', type: 'PARTIAL', scheduledDate: '', priority: 'MEDIUM' });
      fetchCycleCounts();
    } catch (err) { setError('Failed to save cycle count'); }
  };

  const handleEdit = (cc) => {
    setEditingCycleCount(cc);
    setFormData({ warehouse: cc.warehouse?._id || '', status: cc.status || 'PLANNED', type: cc.type || 'PARTIAL', scheduledDate: cc.scheduledDate || '', priority: cc.priority || 'MEDIUM' });
    setShowForm(true);
  };

  const tabs = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ marginBottom: '6px' }}>Cycle Counts</h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)' }}>Physical inventory verification schedules</p>
        </div>
        <button
          className="btn-primary"
          style={{ height: '40px', padding: '0 18px', fontSize: '14px', gap: '6px', display: 'inline-flex', alignItems: 'center' }}
          onClick={() => { setEditingCycleCount(null); setShowForm(!showForm); }}
        >
          <Plus size={14} /> New cycle count
        </button>
      </div>

      {/* Edit Form */}
      {showForm && (
        <div style={{ backgroundColor: 'var(--color-surface-card)', border: '1px solid var(--color-hairline)', borderRadius: 'var(--rounded-xl)', padding: '28px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '300', marginBottom: '24px' }}>
            {editingCycleCount ? 'Update cycle count' : 'Create cycle count'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              {[
                { label: 'Status', name: 'status', options: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
                { label: 'Type', name: 'type', options: ['FULL', 'PARTIAL', 'RANDOM_SAMPLE', 'ABC_ANALYSIS'] },
                { label: 'Priority', name: 'priority', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
              ].map(f => (
                <div key={f.name} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-body)', marginBottom: 0 }}>{f.label}</label>
                  <select name={f.name} value={formData[f.name]} onChange={handleFormChange} style={{ height: '42px' }}>
                    {f.options.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              ))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-body)', marginBottom: 0 }}>Scheduled date</label>
                <input type="date" name="scheduledDate" value={formData.scheduledDate} onChange={handleFormChange} style={{ height: '42px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary" style={{ height: '40px', padding: '0 18px' }}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ height: '40px', padding: '0 18px' }}>
                {editingCycleCount ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: 'var(--color-danger)', borderRadius: 'var(--rounded-lg)', fontSize: '14px', fontWeight: '500' }}>
          {error}
        </div>
      )}

      {/* Pill Tab Filters */}
      <div style={{ display: 'flex', gap: '4px', padding: '4px', backgroundColor: 'var(--color-surface-soft)', borderRadius: 'var(--rounded-pill)', width: 'fit-content' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => { setFilterStatus(tab); setCurrentPage(1); }}
            style={{
              padding: '7px 16px', fontSize: '13px', fontWeight: '500',
              fontFamily: 'var(--font-body)', borderRadius: 'var(--rounded-pill)',
              border: 'none', cursor: 'pointer', transition: 'all 150ms',
              backgroundColor: filterStatus === tab ? 'var(--color-surface-card)' : 'transparent',
              color: filterStatus === tab ? 'var(--color-ink)' : 'var(--color-muted)',
              boxShadow: filterStatus === tab ? '0 1px 4px rgba(12,10,9,0.08)' : 'none',
            }}>
            {tab.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Spinner text="Loading cycle counts…" /></div>
      ) : cycleCounts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', backgroundColor: 'var(--color-surface-card)', border: '1px solid var(--color-hairline)', borderRadius: 'var(--rounded-xl)', color: 'var(--color-muted)' }}>
          <BarChart3 size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ fontSize: '16px' }}>No {filterStatus.toLowerCase().replace('_', ' ')} cycle counts</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {cycleCounts.map(cc => (
            <div key={cc._id} style={{
              backgroundColor: 'var(--color-surface-card)',
              border: '1px solid var(--color-hairline)',
              borderRadius: 'var(--rounded-xl)',
              padding: '20px 22px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              transition: 'box-shadow 150ms'
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(12,10,9,0.05)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <StatusIcon status={cc.status} />
                  <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '500', color: 'var(--color-ink)' }}>
                    {cc.cycleCountId}
                  </span>
                  <span className={`badge ${statusBadgeClass[cc.status] || 'badge-muted'}`}>
                    {cc.status.replace(/_/g, ' ')}
                  </span>
                  <span className={`badge ${priorityBadgeClass[cc.priority] || 'badge-muted'}`}>
                    {cc.priority}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'var(--color-muted)', flexWrap: 'wrap' }}>
                  <span>Warehouse: {cc.warehouse?.name || 'N/A'}</span>
                  <span>Type: {(cc.type || 'N/A').replace(/_/g, ' ')}</span>
                  {cc.scheduledDate && <span>Scheduled: {new Date(cc.scheduledDate).toLocaleDateString()}</span>}
                  {cc.summary && (
                    <>
                      <span>Items: {cc.summary.totalItems || 0}</span>
                      <span>Accuracy: {(cc.summary.accuracyPercentage || 0).toFixed(1)}%</span>
                      {cc.summary.discrepanciesFound > 0 && (
                        <span style={{ color: 'var(--color-danger)' }}>⚠ {cc.summary.discrepanciesFound} discrepancies</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleEdit(cc)}
                style={{
                  width: '36px', height: '36px', border: '1px solid var(--color-hairline)',
                  borderRadius: 'var(--rounded-md)', background: 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-muted)', transition: 'all 150ms', flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-soft)'; e.currentTarget.style.color = 'var(--color-ink)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-muted)'; }}
              >
                <Edit2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
          <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
            className="btn-secondary" style={{ height: '36px', padding: '0 14px', fontSize: '13px', opacity: currentPage === 1 ? 0.4 : 1 }}>
            ← Prev
          </button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '14px', color: 'var(--color-muted)', padding: '0 12px' }}>
            {currentPage} of {totalPages}
          </span>
          <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
            className="btn-secondary" style={{ height: '36px', padding: '0 14px', fontSize: '13px', opacity: currentPage === totalPages ? 0.4 : 1 }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default CycleCounts;
