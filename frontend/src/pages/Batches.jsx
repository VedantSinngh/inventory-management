import React, { useState, useEffect } from 'react';
import { Package, AlertCircle, CheckCircle, Clock, Trash2, Edit2, Plus } from 'lucide-react';
import Spinner from '../components/Spinner';
import apiService from '../services/api';

const Batches = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('APPROVED');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [formData, setFormData] = useState({
    batchNumber: '',
    product: '',
    supplier: '',
    qualityStatus: 'APPROVED',
    quantity: 0,
    expiryDate: '',
    manufactureDate: '',
    notes: ''
  });

  useEffect(() => {
    fetchBatches();
  }, [filterStatus, currentPage]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        qualityStatus: filterStatus
      };

      const response = await apiService.getBatches(currentPage, 20, filters);

      setBatches(response.data || []);
      setTotalPages(response.pagination?.pages || 1);
    } catch (err) {
      setError('Failed to fetch batches');
      console.error('Error fetching batches:', err);
      setBatches([]);
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
      if (editingBatch) {
        await apiService.updateBatchStatus(editingBatch._id, formData.qualityStatus);
      } else {
        await apiService.createBatch(formData);
      }
      setShowForm(false);
      setEditingBatch(null);
      setFormData({
        batchNumber: '',
        product: '',
        supplier: '',
        qualityStatus: 'APPROVED',
        quantity: 0,
        expiryDate: '',
        manufactureDate: '',
        notes: ''
      });
      fetchBatches();
    } catch (err) {
      setError('Failed to save batch');
      console.error('Error saving batch:', err);
    }
  };

  const handleEdit = (batch) => {
    setEditingBatch(batch);
    setFormData({
      batchNumber: batch.batchNumber || '',
      product: batch.product?._id || '',
      supplier: batch.supplier?._id || '',
      qualityStatus: batch.qualityStatus || 'APPROVED',
      quantity: batch.quantity || 0,
      expiryDate: batch.expiryDate || '',
      manufactureDate: batch.manufactureDate || '',
      notes: batch.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this batch?')) return;
    try {
      // Note: You may need to add a delete method to the API service
      setError('Delete not yet implemented');
    } catch (err) {
      setError('Failed to delete batch');
      console.error('Error deleting batch:', err);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'APPROVED': '#10B981',
      'PENDING_INSPECTION': '#F59E0B',
      'QUARANTINED': '#EF4444',
      'REJECTED': '#DC2626',
      'EXPIRED': '#6B7280'
    };
    return colors[status] || '#6B7280';
  };

  const getStatusBgColor = (status) => {
    const colors = {
      'APPROVED': 'rgba(16, 185, 129, 0.1)',
      'PENDING_INSPECTION': 'rgba(245, 158, 11, 0.1)',
      'QUARANTINED': 'rgba(239, 68, 68, 0.1)',
      'REJECTED': 'rgba(220, 38, 38, 0.1)',
      'EXPIRED': 'rgba(107, 114, 128, 0.1)'
    };
    return colors[status] || 'rgba(107, 114, 128, 0.1)';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle size={18} style={{ color: '#10B981' }} />;
      case 'PENDING_INSPECTION':
        return <Clock size={18} style={{ color: '#F59E0B' }} />;
      case 'QUARANTINED':
      case 'REJECTED':
        return <AlertCircle size={18} style={{ color: '#EF4444' }} />;
      case 'EXPIRED':
        return <AlertCircle size={18} style={{ color: '#6B7280' }} />;
      default:
        return <Package size={18} />;
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', margin: 0 }}>Batches</h1>
        <button
          onClick={() => {
            setEditingBatch(null);
            setFormData({
              batchNumber: '',
              product: '',
              supplier: '',
              qualityStatus: 'APPROVED',
              quantity: 0,
              expiryDate: '',
              manufactureDate: '',
              notes: ''
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
          New Batch
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
          <h2 style={{ marginTop: 0 }}>{editingBatch ? 'Edit Batch' : 'Create New Batch'}</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Batch Number
                </label>
                <input
                  type="text"
                  name="batchNumber"
                  value={formData.batchNumber}
                  onChange={handleFormChange}
                  required
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

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Quality Status
                </label>
                <select
                  name="qualityStatus"
                  value={formData.qualityStatus}
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
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING_INSPECTION">Pending Inspection</option>
                  <option value="QUARANTINED">Quarantined</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Quantity
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleFormChange}
                  min="0"
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

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Expiry Date
                </label>
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
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

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Manufacture Date
                </label>
                <input
                  type="date"
                  name="manufactureDate"
                  value={formData.manufactureDate}
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

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Notes
                </label>
                <input
                  type="text"
                  name="notes"
                  value={formData.notes}
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
                {editingBatch ? 'Update Batch' : 'Create Batch'}
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
        {['APPROVED', 'PENDING_INSPECTION', 'QUARANTINED', 'REJECTED', 'EXPIRED'].map(status => (
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

      {/* Batches List */}
      {!loading && batches.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {batches.map(batch => (
            <div
              key={batch._id}
              style={{
                padding: '16px',
                border: `2px solid ${getStatusColor(batch.qualityStatus)}`,
                backgroundColor: getStatusBgColor(batch.qualityStatus),
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  {getStatusIcon(batch.qualityStatus)}
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                    {batch.batchNumber}
                  </h3>
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: getStatusColor(batch.qualityStatus),
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {batch.qualityStatus.replace(/_/g, ' ')}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '24px', marginLeft: '30px', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                  <span>Quantity: {batch.quantity || 0}</span>
                  <span>Status: {batch.status || 'N/A'}</span>
                  {batch.expiryDate && <span>Expires: {new Date(batch.expiryDate).toLocaleDateString()}</span>}
                </div>

                {batch.notes && (
                  <p style={{ margin: '0 0 8px 30px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    Notes: {batch.notes}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                <button
                  onClick={() => handleEdit(batch)}
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
                  onClick={() => handleDelete(batch._id)}
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
      {!loading && batches.length === 0 && (
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--color-text-secondary)'
        }}>
          <Package size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', margin: 0 }}>No batches found</p>
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

export default Batches;
