import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  Info,
  CheckCheck,
  FileText,
  AlertCircle
} from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const Replenishment = () => {
  const { user } = useContext(AuthContext);

  // Core state
  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null); // 'approve-all', itemId, etc.
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // UI state for items
  const [editingQty, setEditingQty] = useState({}); // { [itemId]: number }
  const [expandedEvidence, setExpandedEvidence] = useState({}); // { [itemId]: boolean }
  const [rejectingItem, setRejectingItem] = useState(null); // itemId
  const [rejectNotes, setRejectNotes] = useState('');

  // Fetch plans list
  const fetchPlans = useCallback(async (selectLatest = false) => {
    try {
      setErrorMessage(null);
      const res = await api.get('/replenishment/plans?limit=15');
      const planList = res.data || [];
      setPlans(planList);

      if (planList.length > 0 && (selectLatest || !activePlan)) {
        // Fetch full active plan with populated references
        const latestId = planList[0]._id;
        const fullPlan = await api.get(`/replenishment/plans/${latestId}`);
        setActivePlan(fullPlan);
      } else if (planList.length === 0) {
        setActivePlan(null);
      }
    } catch (err) {
      handleApiError(err, 'Failed to fetch replenishment plans');
    } finally {
      setLoading(false);
    }
  }, [activePlan]);

  // Fetch a specific plan by ID
  const selectPlan = async (planId) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const fullPlan = await api.get(`/replenishment/plans/${planId}`);
      setActivePlan(fullPlan);
    } catch (err) {
      handleApiError(err, 'Failed to load replenishment plan');
    } finally {
      setLoading(false);
    }
  };

  // Central error handling
  const handleApiError = (err, fallbackText) => {
    let msg = err.message || fallbackText;
    if (err.status === 401) {
      msg = 'Session expired or unauthorized. Please log in again.';
    } else if (err.status === 403) {
      msg = 'Access denied: Only ADMIN and MANAGER roles are permitted to manage replenishment.';
    } else if (err.status === 409) {
      msg = err.data?.message || 'Conflict: The item or plan has already been processed.';
    } else if (err.status === 429) {
      msg = err.data?.message || 'Rate limit reached: An analysis is already in progress or limit exceeded. Please wait.';
    } else if (err.data?.message) {
      msg = err.data.message;
    }
    setErrorMessage(msg);
  };

  // Initial load
  useEffect(() => {
    fetchPlans(true);
  }, []);

  // Socket listener for real-time plan updates
  useEffect(() => {
    if (!user?.token) return;

    let socket;
    try {
      socket = io(SOCKET_URL, {
        auth: { token: user.token },
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        socket.emit('join-dashboard');
      });

      socket.on('replenishment:plan-updated', (payload) => {
        // Refresh plans list and active plan
        api.get('/replenishment/plans?limit=15')
          .then((res) => {
            const list = res.data || [];
            setPlans(list);
            if (activePlan && payload?.planId === activePlan._id) {
              return api.get(`/replenishment/plans/${activePlan._id}`);
            } else if (!activePlan && list.length > 0) {
              return api.get(`/replenishment/plans/${list[0]._id}`);
            }
            return null;
          })
          .then((updatedActive) => {
            if (updatedActive) setActivePlan(updatedActive);
          })
          .catch((e) => console.error('Socket background refresh error:', e));
      });
    } catch (e) {
      console.error('Socket initialization error in Replenishment:', e);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [user?.token, activePlan?._id]);

  // Trigger autonomous agent run
  const handleRunAgent = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const newPlan = await api.post('/replenishment/run', { maxProducts: 10 });
      setActivePlan(newPlan);
      setSuccessMessage('Autonomous replenishment plan generated successfully!');
      fetchPlans(false);
    } catch (err) {
      handleApiError(err, 'Failed to run replenishment review');
    } finally {
      setIsGenerating(false);
    }
  };

  // Edit item quantity (PATCH)
  const handleSaveQuantity = async (item) => {
    const rawVal = editingQty[item._id];
    if (rawVal === undefined || rawVal === '') return;

    const qty = parseInt(rawVal, 10);
    if (isNaN(qty) || qty <= 0) {
      setErrorMessage('Quantity must be a positive integer greater than zero.');
      return;
    }

    setActionInProgress(`qty-${item._id}`);
    setErrorMessage(null);
    try {
      const res = await api.patch(`/replenishment/plans/${activePlan._id}/items/${item._id}`, {
        quantity: qty
      });

      if (res.clamped) {
        setSuccessMessage(`Quantity clamped to maximum allowed threshold of ${res.item?.approvedQuantity} units.`);
      } else {
        setSuccessMessage('Item quantity updated.');
      }

      // Update active plan in place
      setActivePlan(res.plan || {
        ...activePlan,
        items: activePlan.items.map(i => i._id === item._id ? res.item : i)
      });
      setEditingQty(prev => ({ ...prev, [item._id]: undefined }));
    } catch (err) {
      handleApiError(err, 'Failed to update item quantity');
    } finally {
      setActionInProgress(null);
    }
  };

  // Approve single item
  const handleApproveItem = async (itemId) => {
    setActionInProgress(`approve-${itemId}`);
    setErrorMessage(null);
    try {
      const res = await api.post(`/replenishment/plans/${activePlan._id}/items/${itemId}/approve`, {});
      setSuccessMessage('Item approved and purchase order created.');
      setActivePlan(res.plan);
      fetchPlans(false);
    } catch (err) {
      handleApiError(err, 'Failed to approve item');
    } finally {
      setActionInProgress(null);
    }
  };

  // Reject single item
  const handleRejectItem = async (itemId) => {
    setActionInProgress(`reject-${itemId}`);
    setErrorMessage(null);
    try {
      const res = await api.post(`/replenishment/plans/${activePlan._id}/items/${itemId}/reject`, {
        notes: rejectNotes || 'Rejected by reviewer'
      });
      setSuccessMessage('Item rejected.');
      setActivePlan(res.plan);
      setRejectingItem(null);
      setRejectNotes('');
      fetchPlans(false);
    } catch (err) {
      handleApiError(err, 'Failed to reject item');
    } finally {
      setActionInProgress(null);
    }
  };

  // Approve all remaining pending items
  const handleApproveAll = async () => {
    if (!activePlan) return;
    setActionInProgress('approve-all');
    setErrorMessage(null);
    try {
      const res = await api.post(`/replenishment/plans/${activePlan._id}/approve-all`, {});
      setSuccessMessage(res.message || 'All pending replenishment items approved.');
      setActivePlan(res.plan);
      fetchPlans(false);
    } catch (err) {
      handleApiError(err, 'Failed to approve all items');
    } finally {
      setActionInProgress(null);
    }
  };

  const isBusy = isGenerating || actionInProgress !== null;
  const pendingItems = activePlan?.items?.filter(i => i.status === 'PENDING') || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Autonomous Replenishment</h1>
          <p>
            Autonomous inventory analysis, predictive stockout safeguards, and human-in-the-loop purchase order approval.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => fetchPlans(false)}
            disabled={isBusy || loading}
            className="btn-secondary"
            title="Refresh plans list"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleRunAgent}
            disabled={isBusy}
            className="btn-primary"
            style={{ gap: '8px' }}
          >
            <Sparkles size={16} />
            {isGenerating ? 'Analyzing Inventory…' : 'Run Replenishment Review'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--rounded-lg)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#b91c1c',
          fontSize: '14px'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            style={{ color: '#b91c1c', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 'var(--rounded-lg)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#15803d',
          fontSize: '14px'
        }}>
          <CheckCircle size={18} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            style={{ color: '#15803d', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Rule-Based Fallback Banner */}
      {activePlan && activePlan.source === 'rule-based-fallback' && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 'var(--rounded-xl)',
          padding: '16px 20px',
          display: 'flex',
          gap: '14px',
          alignItems: 'flex-start'
        }}>
          <AlertTriangle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: '600', color: '#92400e', fontSize: '15px' }}>
              Deterministic Rule-Based Fallback Engine
            </div>
            <div style={{ fontSize: '13px', color: '#b45309', marginTop: '4px', lineHeight: 1.5 }}>
              This plan was generated using the zero-LLM deterministic heuristics engine (Min-Heap priority reorder queue, exponential smoothing forecast demand, and supplier MOQ bounds).
              {activePlan.metrics?.fallbackReason && (
                <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                  Trigger reason: {activePlan.metrics.fallbackReason}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Plan Overview Card */}
      {activePlan && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '22px', margin: 0 }}>Replenishment Plan Review</h2>
                <span className={`badge ${
                  activePlan.status === 'APPROVED' ? 'badge-success' :
                  activePlan.status === 'PARTIALLY_APPROVED' ? 'badge-info' :
                  activePlan.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'
                }`}>
                  {activePlan.status.replace('_', ' ')}
                </span>
                <span className="badge badge-muted" style={{ textTransform: 'uppercase' }}>
                  {activePlan.source}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '4px' }}>
                Created {new Date(activePlan.createdAt).toLocaleString()} · Created by {activePlan.createdBy?.name || 'Autonomous Agent'}
              </div>
            </div>

            {/* Bulk Action */}
            {pendingItems.length > 0 && (
              <button
                onClick={handleApproveAll}
                disabled={isBusy}
                className="btn-primary"
                style={{ height: '38px', padding: '0 18px', fontSize: '14px', gap: '8px' }}
              >
                <CheckCheck size={16} />
                {actionInProgress === 'approve-all' ? 'Approving All…' : `Approve All (${pendingItems.length} items)`}
              </button>
            )}
          </div>

          {/* Metrics Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            backgroundColor: 'var(--color-surface-soft)',
            padding: '14px 18px',
            borderRadius: 'var(--rounded-lg)'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Analyzed Items</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-ink)', marginTop: '2px' }}>
                {activePlan.items?.length || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Pending Approval</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: pendingItems.length > 0 ? 'var(--color-warning)' : 'var(--color-muted)', marginTop: '2px' }}>
                {pendingItems.length}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Engine / Model</div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-ink)', marginTop: '4px', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {activePlan.metrics?.modelUsed || 'Heuristic engine'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Execution Time</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-ink)', marginTop: '2px' }}>
                {activePlan.metrics?.executionTimeMs ? `${activePlan.metrics.executionTimeMs}ms` : 'Instant'}
              </div>
            </div>
          </div>

          {activePlan.purchaseOrderSummary && (
            <div style={{ fontSize: '14px', color: 'var(--color-body)', backgroundColor: 'var(--color-canvas)', padding: '12px 16px', borderRadius: 'var(--rounded-md)', border: '1px solid var(--color-hairline)' }}>
              <strong>Agent Summary:</strong> {activePlan.purchaseOrderSummary}
            </div>
          )}
        </div>
      )}

      {/* Plan Items Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px', color: 'var(--color-muted)' }}>
          Loading replenishment plan data…
        </div>
      ) : !activePlan || activePlan.items?.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '64px',
          backgroundColor: 'var(--color-surface-card)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 'var(--rounded-xl)'
        }}>
          <Layers size={36} color="var(--color-muted)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>No Active Replenishment Plan</h3>
          <p style={{ color: 'var(--color-muted)', fontSize: '14px', maxWidth: '440px', margin: '0 auto 20px' }}>
            Click "Run Replenishment Review" to trigger the autonomous replenishment agent to inspect reorder queues, sales velocity, and stock thresholds.
          </p>
          <button
            onClick={handleRunAgent}
            disabled={isBusy}
            className="btn-primary"
            style={{ gap: '8px' }}
          >
            <Sparkles size={15} />
            Generate Initial Plan
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '130px' }}>SKU</th>
                <th>Product & Stock</th>
                <th style={{ width: '220px' }}>Order Quantity</th>
                <th>Supplier</th>
                <th>Urgency</th>
                <th>Reasoning & Evidence</th>
                <th style={{ width: '160px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activePlan.items.map((item) => {
                const currentQty = editingQty[item._id] !== undefined
                  ? editingQty[item._id]
                  : (item.approvedQuantity || item.suggestedQuantity);
                const isModified = editingQty[item._id] !== undefined && Number(editingQty[item._id]) !== (item.approvedQuantity || item.suggestedQuantity);
                const isClamped = item.clamped || (item.maxAllowed && Number(currentQty) > item.maxAllowed);
                const isEvidenceExpanded = !!expandedEvidence[item._id];
                const isItemActionPending = actionInProgress === `approve-${item._id}` || actionInProgress === `reject-${item._id}` || actionInProgress === `qty-${item._id}`;

                return (
                  <React.Fragment key={item._id}>
                    <tr>
                      {/* SKU */}
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '600', color: 'var(--color-ink)' }}>
                          {item.sku}
                        </span>
                      </td>

                      {/* Product */}
                      <td>
                        <div style={{ fontWeight: '500', color: 'var(--color-ink)', fontSize: '14px' }}>
                          {item.productName || item.product?.name || 'Unnamed item'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
                          Current Stock: <strong style={{ color: 'var(--color-ink)' }}>{item.currentStock}</strong>
                          {item.product?.lowStockThreshold && (
                            <span> (Threshold: {item.product.lowStockThreshold})</span>
                          )}
                        </div>
                      </td>

                      {/* Quantity & Clamping */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="number"
                            min="1"
                            max={item.maxAllowed || 1000}
                            value={currentQty}
                            disabled={item.status !== 'PENDING' || isBusy}
                            onChange={(e) => setEditingQty(prev => ({ ...prev, [item._id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveQuantity(item);
                            }}
                            style={{
                              width: '84px',
                              height: '34px',
                              padding: '6px 10px',
                              fontSize: '14px',
                              textAlign: 'center',
                              fontVariantNumeric: 'tabular-nums'
                            }}
                          />
                          {isModified && item.status === 'PENDING' && (
                            <button
                              onClick={() => handleSaveQuantity(item)}
                              disabled={isBusy}
                              className="btn-secondary"
                              style={{ height: '34px', padding: '0 10px', fontSize: '12px' }}
                              title="Save quantity edit"
                            >
                              Save
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
                          Bound: {item.maxAllowed ? `Max ${item.maxAllowed}` : 'Dynamic'}
                          {isClamped && (
                            <span className="badge badge-warning" style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 6px' }}>
                              Clamped
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Supplier */}
                      <td>
                        <div style={{ fontSize: '13px', color: 'var(--color-ink)' }}>
                          {item.supplierName || item.supplier?.name || 'Unknown'}
                        </div>
                      </td>

                      {/* Urgency */}
                      <td>
                        <span className={`badge ${
                          item.urgency === 'HIGH' ? 'badge-danger' :
                          item.urgency === 'LOW' ? 'badge-info' : 'badge-warning'
                        }`}>
                          {item.urgency}
                        </span>
                      </td>

                      {/* Reasoning & Evidence Toggle */}
                      <td>
                        <div style={{ fontSize: '13px', color: 'var(--color-body)', lineHeight: 1.4 }}>
                          {item.reason}
                        </div>
                        {Array.isArray(item.evidenceRefs) && item.evidenceRefs.length > 0 && (
                          <button
                            onClick={() => setExpandedEvidence(prev => ({ ...prev, [item._id]: !prev[item._id] }))}
                            className="btn-tertiary"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              color: 'var(--color-muted)',
                              marginTop: '6px'
                            }}
                          >
                            <FileText size={12} />
                            {isEvidenceExpanded ? 'Hide Evidence' : `Evidence (${item.evidenceRefs.length})`}
                            {isEvidenceExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        )}
                      </td>

                      {/* Status / Actions */}
                      <td style={{ textAlign: 'right' }}>
                        {item.status === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleApproveItem(item._id)}
                              disabled={isBusy}
                              className="btn-primary"
                              style={{
                                height: '32px',
                                padding: '0 12px',
                                fontSize: '12px',
                                backgroundColor: 'var(--color-success)',
                                color: '#ffffff'
                              }}
                              title="Approve item and create Purchase Order"
                            >
                              <CheckCircle size={13} />
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setRejectingItem(item._id);
                                setRejectNotes('');
                              }}
                              disabled={isBusy}
                              className="btn-secondary"
                              style={{ height: '32px', padding: '0 10px', fontSize: '12px', color: 'var(--color-danger)' }}
                              title="Reject recommendation"
                            >
                              <XCircle size={13} />
                              Reject
                            </button>
                          </div>
                        ) : item.status === 'APPROVED' ? (
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <span className="badge badge-success">
                              <CheckCircle size={11} /> Approved
                            </span>
                            {item.orderId && (
                              <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                                Order #{String(item.orderId).slice(-6)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="badge badge-danger">
                            <XCircle size={11} /> Rejected
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Expandable Evidence Row */}
                    {isEvidenceExpanded && (
                      <tr style={{ backgroundColor: 'var(--color-canvas-soft)' }}>
                        <td colSpan="7" style={{ padding: '12px 20px' }}>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-muted)', marginBottom: '8px' }}>
                            Data Sources & Verification Evidence:
                          </div>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {item.evidenceRefs.map((ev, idx) => (
                              <div
                                key={idx}
                                style={{
                                  backgroundColor: 'var(--color-surface-card)',
                                  border: '1px solid var(--color-hairline)',
                                  borderRadius: 'var(--rounded-sm)',
                                  padding: '6px 10px',
                                  fontSize: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                <span style={{ fontWeight: '600', color: 'var(--color-ink)' }}>{ev.tool}:</span>
                                <span style={{ color: 'var(--color-muted)' }}>{ev.metric} =</span>
                                <span style={{ fontFamily: 'monospace', color: 'var(--color-body)' }}>
                                  {typeof ev.value === 'object' ? JSON.stringify(ev.value) : String(ev.value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Inline Reject Notes Input */}
                    {rejectingItem === item._id && (
                      <tr style={{ backgroundColor: '#fff7ed' }}>
                        <td colSpan="7" style={{ padding: '12px 20px' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: '500', color: '#c2410c' }}>
                              Rejection note:
                            </span>
                            <input
                              type="text"
                              value={rejectNotes}
                              placeholder="Reason for rejecting (optional)..."
                              onChange={(e) => setRejectNotes(e.target.value)}
                              style={{ flex: 1, height: '34px', fontSize: '13px' }}
                            />
                            <button
                              onClick={() => handleRejectItem(item._id)}
                              disabled={isBusy}
                              className="btn-primary"
                              style={{ height: '34px', padding: '0 14px', fontSize: '12px', backgroundColor: '#ea580c' }}
                            >
                              Confirm Reject
                            </button>
                            <button
                              onClick={() => setRejectingItem(null)}
                              className="btn-secondary"
                              style={{ height: '34px', padding: '0 12px', fontSize: '12px' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Historical Plans Section */}
      <div style={{ marginTop: '16px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} /> Past Replenishment Analysis Plans
        </h3>

        {plans.length === 0 ? (
          <div style={{ fontSize: '14px', color: 'var(--color-muted)' }}>No historical plans found.</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Plan Date</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Items Count</th>
                  <th>Model / Engine</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => {
                  const isCurrent = activePlan?._id === p._id;
                  return (
                    <tr key={p._id} style={{ backgroundColor: isCurrent ? 'var(--color-canvas-soft)' : undefined }}>
                      <td style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-ink)' }}>
                        {new Date(p.createdAt).toLocaleString()}
                        {isCurrent && (
                          <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--color-success)', fontWeight: '600' }}>
                            (Viewing)
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${
                          p.status === 'APPROVED' ? 'badge-success' :
                          p.status === 'PARTIALLY_APPROVED' ? 'badge-info' :
                          p.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {p.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                          {p.source}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                        {p.items?.length || 0} items
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                        {p.metrics?.modelUsed || 'Heuristic'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => selectPlan(p._id)}
                          disabled={isBusy || isCurrent}
                          className="btn-secondary"
                          style={{ height: '30px', padding: '0 12px', fontSize: '12px' }}
                        >
                          View Plan
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Replenishment;
