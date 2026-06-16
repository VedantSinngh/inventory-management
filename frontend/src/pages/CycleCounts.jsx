import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, Plus, Edit2, Trash2, BarChart3 } from 'lucide-react';
import Spinner from '../components/Spinner';
import apiService from '../services/api';

const CycleCounts = () => {
  const [cycleCounts, setCycleCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('PLANNED');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingCycleCount, setEditingCycleCount] = useState(null);
  const [formData, setFormData] = useState({
    warehouse: '',
    status: 'PLANNED',
    type: 'PARTIAL',
    scheduledDate: '',
    priority: 'MEDIUM'
  });

  useEffect(() => {
    fetchCycleCounts();
  }, [filterStatus, currentPage]);

  const fetchCycleCounts = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        status: filterStatus
      };

      const response = await apiService.getCycleCounts(currentPage, 20, filters);

      setCycleCounts(response.data || []);
      setTotalPages(response.pagination?.pages || 1);
    } catch (err) {
      setError('Failed to fetch cycle counts');
      console.error('Error fetching cycle counts:', err);
      setCycleCounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCycleCount) {
        await apiService.updateCycleCountStatus(editingCycleCount._id, formData.status);
      } else {
        // Create new would require additional API method
        setError('Create functionality not yet implemented');
        return;
      }
      setShowForm(false);
      setEditingCycleCount(null);
      setFormData({
        warehouse: '',
        status: 'PLANNED',
        type: 'PARTIAL',
        scheduledDate: '',
        priority: 'MEDIUM'
      });
      fetchCycleCounts();
    } catch (err) {
      setError('Failed to save cycle count');
      console.error('Error saving cycle count:', err);
    }
  };

  const handleEdit = (cycleCount) => {
    setEditingCycleCount(cycleCount);
    setFormData({
      warehouse: cycleCount.warehouse?._id || '',
      status: cycleCount.status || 'PLANNED',
      type: cycleCount.type || 'PARTIAL',
      scheduledDate: cycleCount.scheduledDate || '',
      priority: cycleCount.priority || 'MEDIUM'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this cycle count?')) return;
    try {
      setError('Delete not yet implemented');
    } catch (err) {
      setError('Failed to delete cycle count');
      console.error('Error deleting cycle count:', err);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'PLANNED': '#6B7280',
      'IN_PROGRESS': '#F59E0B',
      'COMPLETED': '#10B981',
      'CANCELLED': '#EF4444'
    };
    return colors[status] || '#6B7280';
  };

  const getStatusBgColor = (status) => {
    const colors = {
      'PLANNED': 'rgba(107, 114, 128, 0.1)',
      'IN_PROGRESS': 'rgba(245, 158, 11, 0.1)',
      'COMPLETED': 'rgba(16, 185, 129, 0.1)',
      'CANCELLED': 'rgba(239, 68, 68, 0.1)'
    };
    return colors[status] || 'rgba(107, 114, 128, 0.1)';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'LOW': '#10B981',
      'MEDIUM': '#F59E0B',
      'HIGH': '#EF4444',
      'CRITICAL': '#DC2626'
    };
    return colors[priority] || '#6B7280';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PLANNED':
        return <Clock size={18} style={{ color: '#6B7280' }} />;
      case 'IN_PROGRESS':
        return <AlertCircle size={18} style={{ color: '#F59E0B' }} />;
      case 'COMPLETED':
        return <CheckCircle size={18} style={{ color: '#10B981' }} />;
      case 'CANCELLED':
        return <AlertCircle size={18} style={{ color: '#EF4444' }} />;
      default:
        return <Clock size={18} />;
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', margin: 0 }}>Cycle Counts</h1>
        <button
          onClick={() => {
            setEditingCycleCount(null);
            setFormData({
              warehouse: '',
              status: 'PLANNED',
              type: 'PARTIAL',
              scheduledDate: '',
              priority: 'MEDIUM'
            });
            setShowForm(!showForm);
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          <Plus size={18} />
          New Cycle Count
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{
          padding: '20px',
          backgroundColor: 'var(--color-bg-secondary)',
          borderRadius: '8px',
          marginBottom: '24px',
          border: '1px solid var(--color-border)'
        }}>
          <h2 style={{ marginTop: 0 }}>{editingCycleCount ? 'Edit Cycle Count' : 'Create New Cycle Count'}</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleFormChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-heading)',
                    fontSize: '14px'
                  }}
                >
                  <option value="PLANNED">Planned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleFormChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-heading)',
                    fontSize: '14px'
                  }}
                >
                  <option value="FULL">Full</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="RANDOM_SAMPLE">Random Sample</option>
                  <option value="ABC_ANALYSIS">ABC Analysis</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleFormChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-heading)',
                    fontSize: '14px'
                  }}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Scheduled Date
                </label>
                <input
                  type="date"
                  name="scheduledDate"
                  value={formData.scheduledDate}
                  onChange={handleFormChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-heading)',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-heading)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--color-accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {editingCycleCount ? 'Update Cycle Count' : 'Create Cycle Count'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(status => (
          <button
            key={status}
            onClick={() => { setFilterStatus(status); setCurrentPage(1); }}
            style={{
              padding: '8px 16px',
              backgroundColor: filterStatus === status ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
              color: filterStatus === status ? 'white' : 'var(--color-text-heading)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {status.replace(/_/g, ' ')}
          </button>
        ))}
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

      {/* Cycle Counts List */}
      {!loading && cycleCounts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {cycleCounts.map(cc => (
            <div
              key={cc._id}
              style={{
                padding: '16px',
                border: `2px solid ${getStatusColor(cc.status)}`,
                backgroundColor: getStatusBgColor(cc.status),
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  {getStatusIcon(cc.status)}
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                    {cc.cycleCountId}
                  </h3>
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: getStatusColor(cc.status),
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {cc.status.replace(/_/g, ' ')}
                  </span>
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: getPriorityColor(cc.priority),
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {cc.priority}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '24px', marginLeft: '30px', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                  <span>Warehouse: {cc.warehouse?.name || 'N/A'}</span>
                  <span>Type: {cc.type || 'N/A'}</span>
                  {cc.scheduledDate && <span>Scheduled: {new Date(cc.scheduledDate).toLocaleDateString()}</span>}
                </div>

                {cc.summary && (
                  <div style={{ display: 'flex', gap: '24px', marginLeft: '30px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    <span>Items: {cc.summary.totalItems || 0}</span>
                    <span>Counted: {cc.summary.countedItems || 0}</span>
                    <span>Discrepancies: {cc.summary.discrepanciesFound || 0}</span>
                    <span>Accuracy: {(cc.summary.accuracyPercentage || 0).toFixed(2)}%</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                <button
                  onClick={() => handleEdit(cc)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(cc._id)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#DC2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && cycleCounts.length === 0 && (
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--color-text-secondary)'
        }}>
          <BarChart3 size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', margin: 0 }}>No cycle counts found</p>
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

export default CycleCounts;
