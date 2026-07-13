import React, { useState, useEffect, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { MapPin, Calendar, Truck, AlertCircle, CheckCircle, Navigation, Plus, X } from 'lucide-react';
import RouteMap from '../components/RouteMap';

const ALL_STATUSES = ['ALL', 'PREPARING', 'READY_FOR_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'];

const STATUS_COLORS = {
  'PREPARING': '#F59E0B',
  'READY_FOR_PICKUP': '#3B82F6',
  'IN_TRANSIT': '#8B5CF6',
  'OUT_FOR_DELIVERY': '#EC4899',
  'DELIVERED': '#10B981',
  'FAILED': '#EF4444',
  'RETURNED': '#6B7280'
};

const ShipmentTracker = () => {
  const { api } = useContext(InventoryContext);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [routePath, setRoutePath] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  // Create Shipment Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [approvedOrders, setApprovedOrders] = useState([]);
  const [createForm, setCreateForm] = useState({
    orderId: '',
    carrier: 'FedEx',
    originCity: 'Mumbai',
    originState: 'Maharashtra',
    originCountry: 'India',
    destCity: '',
    destState: '',
    destCountry: 'India',
    destStreet: ''
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    fetchShipments();
  }, [filter]);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const url = filter === 'ALL'
        ? `/shipments?limit=50`
        : `/shipments?status=${filter}&limit=50`;
      const response = await api.get(url);
      setShipments(response.shipments || response.data?.shipments || []);
    } catch (error) {
      console.error('Error fetching shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedOrders = async () => {
    try {
      const res = await api.get('/orders?status=APPROVED&limit=50');
      const orders = res.orders || res.data?.orders || res.data || [];
      setApprovedOrders(Array.isArray(orders) ? orders : []);
    } catch (e) {
      console.error('Error fetching approved orders:', e);
      setApprovedOrders([]);
    }
  };

  const openCreateModal = () => {
    fetchApprovedOrders();
    setCreateForm({
      orderId: '',
      carrier: 'FedEx',
      originCity: 'Mumbai',
      originState: 'Maharashtra',
      originCountry: 'India',
      destCity: '',
      destState: '',
      destCountry: 'India',
      destStreet: ''
    });
    setCreateError('');
    setShowCreateModal(true);
  };

  const handleCreateShipment = async (e) => {
    e.preventDefault();
    if (!createForm.orderId) {
      setCreateError('Please select an order');
      return;
    }
    if (!createForm.destCity) {
      setCreateError('Please enter a destination city');
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      await api.post('/shipments', {
        orderId: createForm.orderId,
        carrier: createForm.carrier,
        originAddress: {
          city: createForm.originCity,
          state: createForm.originState,
          country: createForm.originCountry
        },
        destinationAddress: {
          street: createForm.destStreet,
          city: createForm.destCity,
          state: createForm.destState,
          country: createForm.destCountry
        }
      });
      setShowCreateModal(false);
      setFilter('PREPARING');
      fetchShipments();
    } catch (error) {
      setCreateError(error.message || 'Failed to create shipment');
    } finally {
      setCreating(false);
    }
  };

  const optimizeRoute = async (shipmentId) => {
    setOptimizing(true);
    try {
      const resData = await api.post(`/routes/shipment/${shipmentId}/optimize`, { criterion: 'COST' });
      // The API client returns raw JSON; response is { data: optimalPath, pagination: null }
      const pathData = resData?.data || resData;
      if (pathData && (pathData.startNode !== undefined || pathData.path !== undefined)) {
        setRoutePath(pathData);
      } else {
        console.warn('Optimize returned unexpected shape:', resData);
      }
    } catch (error) {
      console.error('Error optimizing shipment route:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const handleDynamicReroute = async (shipmentId, outOfStockWarehouseId, productId) => {
    try {
      const data = await api.post('/routes/reroute', {
        shipmentId,
        outOfStockWarehouseId,
        productId
      });
      alert('Shipment successfully re-routed to alternative warehouse: ' + (data.alternativeWarehouse?.name || 'N/A'));
      fetchShipments();
      setSelectedShipment(null);
      setRoutePath(null);
    } catch (error) {
      alert('Failed to re-route: ' + error.message);
    }
  };

  const toggleSimulation = async (shipmentId) => {
    try {
      if (simulating) {
        await api.post(`/shipments/${shipmentId}/simulate/stop`);
        setSimulating(false);
      } else {
        await api.post(`/shipments/${shipmentId}/simulate/start`);
        setSimulating(true);
        alert('Simulation started! The truck will now move automatically on the map.');
      }
    } catch (error) {
      console.error('Simulation toggle failed:', error);
      alert('Simulation error: ' + error.message);
    }
  };

  const getStatusColor = (status) => STATUS_COLORS[status] || '#6B7280';

  const getWeatherIcon = (weather) => {
    switch (weather?.severity) {
      case 'HIGH': return '⛈️';
      case 'MEDIUM': return '🌧️';
      case 'LOW': return '⚠️';
      default: return '✅';
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', margin: 0 }}>Live Shipment Tracking</h1>
        <button
          onClick={openCreateModal}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 18px',
            backgroundColor: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          <Plus size={16} /> Create Shipment
        </button>
      </div>

      {/* Route map visualization area */}
      {routePath && (
        <div style={{ marginBottom: '25px' }}>
          {optimizing && <div style={{ padding: '10px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>Calculating optimal route with live traffic... 🔄</div>}
          <RouteMap pathData={routePath} />
        </div>
      )}
      {optimizing && !routePath && (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '8px', marginBottom: '16px' }}>
          Calculating optimal route with live traffic... 🔄
        </div>
      )}

      {/* Status Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {ALL_STATUSES.map(status => (
          <button
            key={status}
            onClick={() => {
              setFilter(status);
              setRoutePath(null);
              setSelectedShipment(null);
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: filter === status ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
              color: filter === status ? 'white' : 'var(--color-text-heading)',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              whiteSpace: 'nowrap',
              fontWeight: filter === status ? '600' : '400'
            }}
          >
            {status === 'ALL' ? '📦 All' : status.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Shipments Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)' }}>
            Loading shipments...
          </div>
        ) : shipments.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)' }}>
            <Truck size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
            <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>No shipments found</div>
            <div style={{ fontSize: '13px', marginBottom: '16px' }}>
              {filter !== 'ALL' ? `No shipments with status "${filter.replace(/_/g, ' ')}". Try switching to "All".` : 'Create your first shipment by approving an order and clicking "Create Shipment".'}
            </div>
            <button
              onClick={openCreateModal}
              style={{ padding: '10px 20px', backgroundColor: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
            >
              + Create Shipment
            </button>
          </div>
        ) : (
          shipments.map(shipment => (
            <div
              key={shipment._id}
              className="card"
              onClick={() => {
                setSelectedShipment(shipment);
                optimizeRoute(shipment._id);
              }}
              style={{
                cursor: 'pointer',
                borderLeft: `4px solid ${getStatusColor(shipment.status)}`,
                transition: 'all 0.2s ease',
                transform: selectedShipment?._id === shipment._id ? 'scale(1.02)' : 'scale(1)',
                padding: '16px',
                outline: selectedShipment?._id === shipment._id ? `2px solid ${getStatusColor(shipment.status)}` : 'none'
              }}
            >
              {/* Tracking Number + Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>{shipment.trackingNumber}</h3>
                <span style={{
                  padding: '3px 10px',
                  backgroundColor: getStatusColor(shipment.status),
                  color: 'white',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase'
                }}>
                  {shipment.status?.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Basic Info */}
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Truck size={13} />
                  <span>{shipment.carrier || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <MapPin size={13} />
                  <span>
                    {shipment.originAddress?.city || '—'} → {shipment.destinationAddress?.city || 'N/A'}
                  </span>
                </div>
                {shipment.estimatedDeliveryDate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={13} />
                    <span>ETA: {new Date(shipment.estimatedDeliveryDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Current Location */}
              {shipment.currentLocation && (
                <div style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  padding: '8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  marginBottom: '10px'
                }}>
                  <div style={{ color: 'var(--color-text-secondary)', marginBottom: '3px' }}>Current Location:</div>
                  <div style={{ fontWeight: '500' }}>
                    {shipment.currentLocation.address || `${shipment.currentLocation.latitude?.toFixed(4)}, ${shipment.currentLocation.longitude?.toFixed(4)}`}
                  </div>
                </div>
              )}

              {/* Weather Impact */}
              {shipment.weatherImpact?.hasImpact && (
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  padding: '8px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  marginBottom: '10px'
                }}>
                  <span>{getWeatherIcon(shipment.weatherImpact)}</span>
                  <div>
                    <div style={{ fontWeight: '500' }}>Weather: {shipment.weatherImpact.severity}</div>
                    {shipment.weatherImpact.estimatedDelayHours > 0 && (
                      <div style={{ color: 'var(--color-text-secondary)' }}>+{shipment.weatherImpact.estimatedDelayHours}h delay</div>
                    )}
                  </div>
                </div>
              )}

              {/* Coordinates indicator */}
              {shipment.originAddress?.latitude && (
                <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Navigation size={10} /> GPS coordinates available — click to optimize route
                </div>
              )}
              {!shipment.originAddress?.latitude && (
                <div style={{ fontSize: '11px', color: '#ef4444' }}>
                  ⚠ No GPS coordinates — route optimization unavailable
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Detailed Side Panel */}
      {selectedShipment && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '350px',
          maxHeight: '80vh',
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          padding: '16px',
          overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          zIndex: 1000
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Shipment Details</h3>
            <button
              onClick={() => {
                setSelectedShipment(null);
                setRoutePath(null);
              }}
              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--color-text-secondary)', lineHeight: 1 }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>Tracking</div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{selectedShipment.trackingNumber}</div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>Route</div>
              <div style={{ fontSize: '13px' }}>
                {selectedShipment.originAddress?.city || 'Origin'} → {selectedShipment.destinationAddress?.city || 'Destination'}
              </div>
              {selectedShipment.originAddress?.latitude ? (
                <div style={{ fontSize: '11px', color: '#10b981', marginTop: '3px' }}>
                  ✓ Coordinates: ({selectedShipment.originAddress.latitude.toFixed(3)}, {selectedShipment.originAddress.longitude.toFixed(3)}) → ({selectedShipment.destinationAddress.latitude?.toFixed(3)}, {selectedShipment.destinationAddress.longitude?.toFixed(3)})
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '3px' }}>⚠ No GPS coordinates stored</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={() => optimizeRoute(selectedShipment._id)}
                disabled={optimizing || !selectedShipment.originAddress?.latitude}
                style={{
                  flex: 1, padding: '9px', fontSize: '12px', cursor: optimizing || !selectedShipment.originAddress?.latitude ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  opacity: (!selectedShipment.originAddress?.latitude) ? 0.5 : 1,
                  borderRadius: '4px'
                }}
              >
                <Navigation size={12} /> {optimizing ? 'Optimizing...' : 'Optimize Route'}
              </button>

              <button
                onClick={() => handleDynamicReroute(
                  selectedShipment._id,
                  selectedShipment.originAddress?._id || selectedShipment.originAddress,
                  selectedShipment.items?.[0]?.product?._id || selectedShipment.items?.[0]?.product
                )}
                style={{ flex: 1, padding: '9px', fontSize: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Stockout Re-route
              </button>
            </div>

            {selectedShipment.status === 'IN_TRANSIT' && (
              <button
                onClick={() => toggleSimulation(selectedShipment._id)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  backgroundColor: simulating ? '#EF4444' : '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {simulating ? '🛑 Stop Simulation' : '🚀 Start Live Simulation'}
              </button>
            )}

            {selectedShipment.driverInfo && (
              <div style={{ fontSize: '13px', backgroundColor: 'var(--color-bg-primary)', padding: '10px', borderRadius: '6px' }}>
                <div style={{ color: 'var(--color-text-secondary)', marginBottom: '4px', fontSize: '12px' }}>Driver</div>
                <div style={{ fontWeight: '500' }}>{selectedShipment.driverInfo.name}</div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{selectedShipment.driverInfo.phone}</div>
              </div>
            )}

            {selectedShipment.cost && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>Shipping Cost</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981' }}>${selectedShipment.cost.total || selectedShipment.cost}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Shipment Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: '12px',
            padding: '28px',
            width: '100%',
            maxWidth: '520px',
            border: '1px solid var(--color-border)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Create New Shipment</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleCreateShipment}>
              {/* Order Selection */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text-secondary)' }}>
                  Select Approved Order *
                </label>
                <select
                  value={createForm.orderId}
                  onChange={e => setCreateForm(f => ({ ...f, orderId: e.target.value }))}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-heading)', fontSize: '14px' }}
                >
                  <option value="">-- Select an order --</option>
                  {approvedOrders.length === 0 && (
                    <option disabled>No approved orders found. Approve an order first.</option>
                  )}
                  {approvedOrders.map(o => (
                    <option key={o._id} value={o._id}>
                      #{o._id?.slice(-8)?.toUpperCase()} — {o.type || 'Order'} — ${o.totalAmount || 0}
                    </option>
                  ))}
                </select>
              </div>

              {/* Carrier */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Carrier</label>
                <select
                  value={createForm.carrier}
                  onChange={e => setCreateForm(f => ({ ...f, carrier: e.target.value }))}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-heading)', fontSize: '14px' }}
                >
                  {['FedEx', 'UPS', 'DHL', 'DTDC', 'BlueDart', 'Delhivery', 'Ekart'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Origin */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Origin City</label>
                <input
                  type="text"
                  value={createForm.originCity}
                  onChange={e => setCreateForm(f => ({ ...f, originCity: e.target.value }))}
                  placeholder="e.g. Mumbai"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-heading)', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Destination */}
              <div style={{ marginBottom: '6px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Destination *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input
                    type="text"
                    value={createForm.destStreet}
                    onChange={e => setCreateForm(f => ({ ...f, destStreet: e.target.value }))}
                    placeholder="Street (optional)"
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-heading)', fontSize: '13px', gridColumn: '1 / -1' }}
                  />
                  <input
                    type="text"
                    value={createForm.destCity}
                    onChange={e => setCreateForm(f => ({ ...f, destCity: e.target.value }))}
                    placeholder="City *"
                    required
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-heading)', fontSize: '13px' }}
                  />
                  <input
                    type="text"
                    value={createForm.destState}
                    onChange={e => setCreateForm(f => ({ ...f, destState: e.target.value }))}
                    placeholder="State"
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-heading)', fontSize: '13px' }}
                  />
                </div>
              </div>

              {createError && (
                <div style={{ color: '#ef4444', fontSize: '13px', padding: '8px 12px', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: '6px', marginBottom: '16px', marginTop: '10px' }}>
                  ⚠ {createError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-heading)', cursor: 'pointer', fontSize: '14px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{ flex: 2, padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--color-accent)', color: 'white', cursor: creating ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600', opacity: creating ? 0.7 : 1 }}
                >
                  {creating ? 'Creating...' : '🚚 Create Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipmentTracker;