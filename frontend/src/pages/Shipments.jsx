import React, { useState, useEffect, useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import { MapPin, Calendar, Truck, AlertCircle, CheckCircle, Navigation } from 'lucide-react';
import RouteMap from '../components/RouteMap';

const ShipmentTracker = () => {
  const { api } = useContext(InventoryContext);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [filter, setFilter] = useState('IN_TRANSIT');
  const [routePath, setRoutePath] = useState(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    fetchShipments();
  }, [filter]);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/shipments', {
        params: {
          status: filter,
          limit: 20
        }
      });
      setShipments(response.data.shipments || []);
    } catch (error) {
      console.error('Error fetching shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  const optimizeRoute = async (shipmentId) => {
    try {
      const resData = await api.post(`/routes/shipment/${shipmentId}/optimize`, { criterion: 'COST' });
      if (resData.data) {
        setRoutePath(resData.data);
      }
    } catch (error) {
      console.error('Error optimizing shipment route:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleDynamicReroute = async (shipmentId, outOfStockWarehouseId, productId) => {
    try {
      const data = await api.post('/routes/reroute', {
        shipmentId,
        outOfStockWarehouseId,
        productId
      });
      alert('Shipment successfully re-routed to alternative warehouse: ' + data.alternativeWarehouse.name);
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

  const getStatusColor = (status) => {
    const colors = {
      'PREPARING': '#F59E0B',
      'READY_FOR_PICKUP': '#3B82F6',
      'IN_TRANSIT': '#8B5CF6',
      'OUT_FOR_DELIVERY': '#EC4899',
      'DELIVERED': '#10B981',
      'FAILED': '#EF4444',
      'RETURNED': '#6B7280'
    };
    return colors[status] || '#6B7280';
  };

  const getWeatherIcon = (weather) => {
    switch (weather?.severity) {
      case 'HIGH':
        return '⛈️';
      case 'MEDIUM':
        return '🌧️';
      case 'LOW':
        return '⚠️';
      default:
        return '✅';
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>Live Shipment Tracking</h1>

      {/* Route map visualization area at top of selection */}
      {routePath && (
        <div style={{ marginBottom: '25px' }}>
          <RouteMap pathData={routePath} />
        </div>
      )}

      {/* Status Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto' }}>
        {['IN_TRANSIT', 'DELIVERED', 'OUT_FOR_DELIVERY', 'FAILED'].map(status => (
          <button
            key={status}
            onClick={() => {
              setFilter(status);
              setRoutePath(null);
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: filter === status ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
              color: 'var(--color-text-heading)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              whiteSpace: 'nowrap'
            }}
          >
            {status.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Shipments Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
            Loading shipments...
          </div>
        ) : shipments.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
            No shipments found
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
                padding: '16px'
              }}
            >
              {/* Tracking Number */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{shipment.trackingNumber}</h3>
                <span style={{
                  padding: '4px 12px',
                  backgroundColor: getStatusColor(shipment.status),
                  color: 'white',
                  borderRadius: '3px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {shipment.status}
                </span>
              </div>

              {/* Basic Info */}
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Truck size={14} />
                  <span>{shipment.carrier}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <MapPin size={14} />
                  <span>{shipment.destinationAddress?.city || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={14} />
                  <span>ETA: {new Date(shipment.estimatedDeliveryDate).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Current Location */}
              {shipment.currentLocation && (
                <div style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  padding: '8px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  marginBottom: '12px'
                }}>
                  <div style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Current Location:</div>
                  <div style={{ color: 'var(--color-text-heading)', fontWeight: '500' }}>
                    {shipment.currentLocation.address || `${shipment.currentLocation.latitude}, ${shipment.currentLocation.longitude}`}
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                    {new Date(shipment.currentLocation.timestamp).toLocaleString()}
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
                  fontSize: '13px',
                  marginBottom: '12px'
                }}>
                  <span>{getWeatherIcon(shipment.weatherImpact)}</span>
                  <div>
                    <div style={{ fontWeight: '500' }}>Weather Impact: {shipment.weatherImpact.severity}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {shipment.weatherImpact.estimatedDelayHours > 0 && `+${shipment.weatherImpact.estimatedDelayHours}h delay`}
                    </div>
                  </div>
                </div>
              )}

              {/* Driver Info */}
              {shipment.driverInfo && (
                <div style={{
                  fontSize: '13px',
                  backgroundColor: 'var(--color-bg-secondary)',
                  padding: '8px',
                  borderRadius: '4px'
                }}>
                  <div style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Driver:</div>
                  <div style={{ color: 'var(--color-text-heading)' }}>{shipment.driverInfo.name}</div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{shipment.driverInfo.phone}</div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Detailed View */}
      {selectedShipment && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '350px',
          maxHeight: '80vh',
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '16px',
          overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Shipment Details</h3>
            <button
              onClick={() => {
                setSelectedShipment(null);
                setRoutePath(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Tracking:</div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{selectedShipment.trackingNumber}</div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Route:</div>
              <div style={{ fontSize: '13px' }}>
                {selectedShipment.originAddress?.city || 'Warehouse Depot'} → {selectedShipment.destinationAddress?.city}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button 
                onClick={() => optimizeRoute(selectedShipment._id)}
                style={{ flex: 1, padding: '8px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                <Navigation size={12} /> Optimize Path
              </button>
              
              {/* Dynamic Re-routing Button in case of inventory shortage */}
              <button 
                onClick={() => handleDynamicReroute(
                  selectedShipment._id,
                  selectedShipment.originAddress?._id || selectedShipment.originAddress,
                  selectedShipment.items?.[0]?.product?._id || selectedShipment.items?.[0]?.product
                )}
                style={{ flex: 1, padding: '8px', fontSize: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Stockout Re-route
              </button>
            </div>

            {selectedShipment.status === 'IN_TRANSIT' && (
              <button 
                onClick={() => toggleSimulation(selectedShipment._id)}
                style={{ 
                  width: '100%', 
                  marginTop: '10px', 
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

            {selectedShipment.route && selectedShipment.route.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Route History:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                  {selectedShipment.route.slice(0, 5).map((point, idx) => (
                    <div key={idx} style={{
                      padding: '6px',
                      backgroundColor: 'var(--color-bg-primary)',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      <div style={{ color: 'var(--color-text-secondary)' }}>
                        {new Date(point.timestamp).toLocaleTimeString()}
                      </div>
                      <div>{point.address || `${point.latitude}, ${point.longitude}`}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedShipment.cost && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Shipping Cost:</div>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>${selectedShipment.cost.total || selectedShipment.cost}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipmentTracker;