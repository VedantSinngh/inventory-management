import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { InventoryContext } from '../context/InventoryContext';
import LeafletMap from '../components/LeafletMap';
import {
  Truck, MapPin, Calendar, Navigation, Plus, X, ChevronRight,
  RefreshCw, AlertTriangle, Clock, Package, Search, Filter,
  CheckCircle, AlertCircle, ArrowRight, Zap, Route
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_META = {
  PREPARING:        { label: 'Preparing',        color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  READY_FOR_PICKUP: { label: 'Ready for Pickup', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  IN_TRANSIT:       { label: 'In Transit',        color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery',  color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
  DELIVERED:        { label: 'Delivered',          color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
  FAILED:           { label: 'Failed',             color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
  RETURNED:         { label: 'Returned',           color: '#78716c', bg: 'rgba(120,113,108,0.1)' },
};

const ALL_STATUSES = ['ALL', ...Object.keys(STATUS_META)];

const CARRIERS = ['FedEx', 'UPS', 'DHL', 'DTDC', 'BlueDart', 'Delhivery', 'Ekart'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, color: '#78716c', bg: 'rgba(120,113,108,0.1)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '9999px',
      backgroundColor: m.bg,
      color: m.color,
      fontSize: '11px', fontWeight: '600',
      letterSpacing: '0.4px', textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, display: 'inline-block', flexShrink: 0 }} />
      {m.label}
    </span>
  );
}

// ─── Coordinate Picker Input ───────────────────────────────────────────────────
function CoordInput({ label, value, onChange, pickMode, onStartPick, onClearPick }) {
  const [manual, setManual] = useState('');

  const handleManual = (e) => {
    const v = e.target.value;
    setManual(v);
    // Accept "lat, lng" format
    const parts = v.split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      onChange(parts[0], parts[1]);
    }
  };

  // Sync from map picks
  useEffect(() => {
    if (value?.lat && value?.lng) {
      setManual(`${value.lat}, ${value.lng}`);
    }
  }, [value?.lat, value?.lng]);

  const isActive = pickMode === label.toLowerCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }}>
          {label}
        </label>
        <button
          type="button"
          onClick={isActive ? onClearPick : onStartPick}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '3px 10px', borderRadius: '9999px',
            border: `1px solid ${isActive ? (label === 'Origin' ? '#16a34a' : '#dc2626') : 'var(--color-hairline-strong)'}`,
            backgroundColor: isActive ? (label === 'Origin' ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)') : 'transparent',
            color: isActive ? (label === 'Origin' ? '#16a34a' : '#dc2626') : 'var(--color-muted)',
            fontSize: '11px', fontWeight: '600', cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          <MapPin size={10} />
          {isActive ? 'Cancel pick' : 'Pick on map'}
        </button>
      </div>

      <input
        type="text"
        value={manual}
        onChange={handleManual}
        placeholder="lat, lng — e.g. 28.6139, 77.2090"
        style={{ height: '36px', fontSize: '13px', padding: '0 12px' }}
      />

      {value?.city && (
        <div style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <MapPin size={10} />
          {value.city}{value.state ? `, ${value.state}` : ''}
        </div>
      )}
    </div>
  );
}

// ─── Create Shipment Modal ─────────────────────────────────────────────────────
function CreateShipmentModal({ api, onCreated, onClose }) {
  const [step, setStep] = useState(1); // 1=order, 2=addresses+map, 3=details
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [form, setForm] = useState({
    orderId: '',
    carrier: 'FedEx',
    originCity: '', originState: '', originCountry: 'India',
    destCity: '', destState: '', destCountry: 'India',
    weight: '',
  });

  const [origin, setOrigin] = useState(null);    // {lat, lng, city}
  const [destination, setDestination] = useState(null);
  const [pickMode, setPickMode] = useState(null); // 'origin' or 'destination'
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [routePreview, setRoutePreview] = useState([]);

  // Fetch approved orders
  useEffect(() => {
    api.get('/orders?status=APPROVED&limit=100').then(res => {
      const arr = res.orders || res.data?.orders || res.data || [];
      setOrders(Array.isArray(arr) ? arr : []);
    }).catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
  }, []);

  // When both coords set, fetch OSRM route preview
  useEffect(() => {
    if (!origin?.lat || !destination?.lat) { setRoutePreview([]); return; }
    const tomtomKey = import.meta.env.VITE_TOMTOM_KEY || 'N4g0niHg4iTxrHs25Lpivqt9GcM6bh3d';
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${origin.lat},${origin.lng}:${destination.lat},${destination.lng}/json?key=${tomtomKey}&traffic=true`;
    fetch(url).then(r => r.json()).then(d => {
      const pts = d.routes?.[0]?.legs?.[0]?.points || [];
      setRoutePreview(pts.map(p => ({ lat: p.latitude, lng: p.longitude })));
    }).catch(() => setRoutePreview([]));
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  const handleMapPick = (lat, lng) => {
    if (pickMode === 'origin') {
      setOrigin(prev => ({ ...prev, lat, lng }));
      setForm(f => ({ ...f, originCity: `${lat.toFixed(4)}, ${lng.toFixed(4)}` }));
      // Reverse geocode
      const tomtomKey = import.meta.env.VITE_TOMTOM_KEY || 'N4g0niHg4iTxrHs25Lpivqt9GcM6bh3d';
      fetch(`https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${tomtomKey}`)
      .then(r => r.json()).then(d => {
        const address = d.addresses?.[0]?.address || {};
        const city = address.municipality || address.localName || '';
        const state = address.countrySubdivision || '';
        setOrigin(prev => ({ ...prev, city, state }));
        setForm(f => ({ ...f, originCity: city || f.originCity, originState: state }));
      }).catch(() => {});
    } else if (pickMode === 'destination') {
      setDestination(prev => ({ ...prev, lat, lng }));
      setForm(f => ({ ...f, destCity: `${lat.toFixed(4)}, ${lng.toFixed(4)}` }));
      const tomtomKey = import.meta.env.VITE_TOMTOM_KEY || 'N4g0niHg4iTxrHs25Lpivqt9GcM6bh3d';
      fetch(`https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${tomtomKey}`)
      .then(r => r.json()).then(d => {
        const address = d.addresses?.[0]?.address || {};
        const city = address.municipality || address.localName || '';
        const state = address.countrySubdivision || '';
        setDestination(prev => ({ ...prev, city, state }));
        setForm(f => ({ ...f, destCity: city || f.destCity, destState: state }));
      }).catch(() => {});
    }
  };

  const geocodeCity = async (cityStr, field) => {
    if (!cityStr || cityStr.trim().length < 2) return;
    try {
      const tomtomKey = import.meta.env.VITE_TOMTOM_KEY || 'N4g0niHg4iTxrHs25Lpivqt9GcM6bh3d';
      const res = await fetch(`https://api.tomtom.com/search/2/geocode/${encodeURIComponent(cityStr)}.json?key=${tomtomKey}&limit=1`);
      const data = await res.json();
      if (data?.results?.[0]) {
        const lat = parseFloat(data.results[0].position.lat);
        const lng = parseFloat(data.results[0].position.lon);
        if (field === 'origin') setOrigin({ lat, lng, city: cityStr });
        else setDestination({ lat, lng, city: cityStr });
      }
    } catch {}
  };

  const handleSubmit = async () => {
    if (!form.orderId) { setError('Select an order'); return; }
    if (!form.destCity && !destination?.lat) { setError('Set a destination'); return; }
    setCreating(true); setError('');
    try {
      const body = {
        orderId: form.orderId,
        carrier: form.carrier,
        originAddress: {
          city: form.originCity || origin?.city,
          state: form.originState,
          country: form.originCountry,
          latitude: origin?.lat,
          longitude: origin?.lng,
        },
        destinationAddress: {
          city: form.destCity || destination?.city,
          state: form.destState,
          country: form.destCountry,
          latitude: destination?.lat,
          longitude: destination?.lng,
        },
        weight: form.weight ? parseFloat(form.weight) : undefined,
      };
      await api.post('/shipments', body);
      onCreated();
    } catch (e) {
      setError(e.message || 'Failed to create shipment');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 2000, padding: '40px 20px',
      overflowY: 'auto',
    }}>
      <div style={{
        backgroundColor: 'var(--color-surface-card)',
        borderRadius: 'var(--rounded-xl)',
        border: '1px solid var(--color-hairline)',
        width: '100%', maxWidth: '780px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '300', marginBottom: '2px' }}>New Shipment</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: 0 }}>Geocoding and routing done automatically via OpenStreetMap</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-muted)', padding: '6px', borderRadius: '6px', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Row 1: Order + Carrier */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }}>
                Order *
              </label>
              <select
                value={form.orderId}
                onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))}
                style={{ height: '36px', fontSize: '13px' }}
              >
                <option value="">
                  {loadingOrders ? 'Loading orders…' : '— select approved order —'}
                </option>
                {orders.map(o => (
                  <option key={o._id} value={o._id}>
                    #{o._id?.slice(-6)?.toUpperCase()} · {o.type || 'Order'} · ₹{o.totalAmount?.toLocaleString() || 0}
                  </option>
                ))}
                {!loadingOrders && orders.length === 0 && (
                  <option disabled>No approved orders — approve an order first</option>
                )}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }}>
                Carrier
              </label>
              <select
                value={form.carrier}
                onChange={e => setForm(f => ({ ...f, carrier: e.target.value }))}
                style={{ height: '36px', fontSize: '13px' }}
              >
                {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Map */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Route on Map
            </div>
            <LeafletMap
              origin={origin}
              destination={destination}
              routeCoords={routePreview}
              pickMode={pickMode}
              onPick={handleMapPick}
              height="280px"
            />
          </div>

          {/* Coord pickers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <CoordInput
                label="Origin"
                value={origin}
                onChange={(lat, lng) => setOrigin(prev => ({ ...prev, lat, lng }))}
                pickMode={pickMode}
                onStartPick={() => setPickMode('origin')}
                onClearPick={() => setPickMode(null)}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  type="text"
                  value={form.originCity}
                  onChange={e => setForm(f => ({ ...f, originCity: e.target.value }))}
                  onBlur={e => geocodeCity(e.target.value, 'origin')}
                  placeholder="City name (auto-geocodes)"
                  style={{ height: '36px', fontSize: '13px', padding: '0 12px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <CoordInput
                label="Destination"
                value={destination}
                onChange={(lat, lng) => setDestination(prev => ({ ...prev, lat, lng }))}
                pickMode={pickMode}
                onStartPick={() => setPickMode('destination')}
                onClearPick={() => setPickMode(null)}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  type="text"
                  value={form.destCity}
                  onChange={e => setForm(f => ({ ...f, destCity: e.target.value }))}
                  onBlur={e => geocodeCity(e.target.value, 'destination')}
                  placeholder="City name (auto-geocodes)"
                  style={{ height: '36px', fontSize: '13px', padding: '0 12px' }}
                />
              </div>
            </div>
          </div>

          {/* Row 3: Weight */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', alignItems: 'end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }}>
                Weight (kg)
              </label>
              <input
                type="number"
                value={form.weight}
                onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                placeholder="e.g. 12.5"
                style={{ height: '36px', fontSize: '13px', padding: '0 12px' }}
              />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', lineHeight: '1.6' }}>
              Addresses are automatically geocoded via TomTom Search API.
              Route and ETA are calculated using TomTom Routing API (live traffic).
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', backgroundColor: 'rgba(220,38,38,0.08)', borderRadius: 'var(--rounded-md)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626', fontSize: '13px' }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--color-hairline)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ height: '38px', padding: '0 20px', fontSize: '13px' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={creating}
            className="btn-primary"
            style={{ height: '38px', padding: '0 24px', fontSize: '13px', opacity: creating ? 0.7 : 1 }}
          >
            {creating ? 'Creating…' : 'Create Shipment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Route Optimizer Panel ─────────────────────────────────────────────────────
function RouteOptimizerPanel({ shipment, api, onClose }) {
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [criterion, setCriterion] = useState('COST');
  const [routeCoords, setRouteCoords] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const hasCoords = shipment?.originAddress?.latitude && shipment?.destinationAddress?.latitude;

  // Build Dijkstra node map from result
  const dijkstraNodes = result ? (() => {
    const m = new Map();
    if (result.startNode) m.set(result.startNode.id, result.startNode);
    if (result.endNode) m.set(result.endNode.id, result.endNode);
    (result.stopsSequence || []).forEach(s => m.set(s.nodeId, { ...s, id: s.nodeId }));
    return m;
  })() : null;

  const optimize = async () => {
    setOptimizing(true); setError(''); setResult(null);
    try {
      const res = await api.post(`/routes/shipment/${shipment._id}/optimize`, { criterion });
      const data = res.data || res;
      setResult(data);

      // Also fetch TomTom polyline between origin and destination
      if (shipment.originAddress?.latitude && shipment.destinationAddress?.latitude) {
        const oLng = shipment.originAddress.longitude;
        const oLat = shipment.originAddress.latitude;
        const dLng = shipment.destinationAddress.longitude;
        const dLat = shipment.destinationAddress.latitude;
        const tomtomKey = import.meta.env.VITE_TOMTOM_KEY || 'N4g0niHg4iTxrHs25Lpivqt9GcM6bh3d';
        const url = `https://api.tomtom.com/routing/1/calculateRoute/${oLat},${oLng}:${dLat},${dLng}/json?key=${tomtomKey}&traffic=true`;
        fetch(url).then(r => r.json()).then(d => {
          const pts = d.routes?.[0]?.legs?.[0]?.points || [];
          setRouteCoords(pts.map(p => ({ lat: p.latitude, lng: p.longitude })));
        }).catch(() => {});
      }
    } catch (e) {
      setError(e.message || 'Optimization failed');
    } finally {
      setOptimizing(false);
    }
  };

  const updateStatus = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await api.put(`/shipments/${shipment._id}/status`, { status: newStatus });
    } catch (e) {
      alert('Status update failed: ' + e.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const originCoord = shipment?.originAddress?.latitude ? {
    lat: shipment.originAddress.latitude,
    lng: shipment.originAddress.longitude,
    label: shipment.originAddress.city || 'Origin',
  } : null;

  const destCoord = shipment?.destinationAddress?.latitude ? {
    lat: shipment.destinationAddress.latitude,
    lng: shipment.destinationAddress.longitude,
    label: shipment.destinationAddress.city || 'Destination',
  } : null;

  const liveCoord = shipment?.currentLocation?.latitude ? {
    lat: shipment.currentLocation.latitude,
    lng: shipment.currentLocation.longitude,
  } : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--color-ink)' }}>{shipment.trackingNumber}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Truck size={11} />{shipment.carrier}
            <span style={{ margin: '0 4px', opacity: 0.4 }}>·</span>
            <StatusBadge status={shipment.status} />
          </div>
        </div>
        <button onClick={onClose} style={{ color: 'var(--color-muted)', padding: '4px', display: 'flex', borderRadius: '4px' }}>
          <X size={16} />
        </button>
      </div>

      {/* Route path display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', backgroundColor: 'var(--color-surface-soft)', borderRadius: 'var(--rounded-md)', fontSize: '13px' }}>
        <span style={{ color: '#16a34a', fontWeight: '600', fontSize: '12px' }}>
          {shipment.originAddress?.city || '—'}
        </span>
        <ArrowRight size={12} style={{ color: 'var(--color-muted)' }} />
        <span style={{ color: '#dc2626', fontWeight: '600', fontSize: '12px' }}>
          {shipment.destinationAddress?.city || '—'}
        </span>
        {shipment.estimatedDeliveryDate && (
          <>
            <span style={{ marginLeft: 'auto', color: 'var(--color-muted)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={10} /> ETA {fmt(shipment.estimatedDeliveryDate)}
            </span>
          </>
        )}
      </div>

      {/* Live Map */}
      <LeafletMap
        origin={originCoord}
        destination={destCoord}
        routeCoords={routeCoords}
        liveLocation={liveCoord}
        dijkstraPath={result?.path || []}
        dijkstraNodes={dijkstraNodes}
        height="300px"
      />

      {/* No coords warning */}
      {!hasCoords && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 'var(--rounded-md)', border: '1px solid rgba(245,158,11,0.2)', color: '#d97706', fontSize: '12px' }}>
          <AlertTriangle size={13} />
          No GPS coordinates — route optimization unavailable. Create a new shipment with map-picked coordinates.
        </div>
      )}

      {/* Optimizer controls */}
      {hasCoords && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={criterion}
            onChange={e => setCriterion(e.target.value)}
            style={{ height: '36px', fontSize: '12px', flex: 1 }}
          >
            <option value="COST">Minimize Cost</option>
            <option value="TIME">Minimize Time</option>
            <option value="DISTANCE">Minimize Distance</option>
          </select>
          <button
            onClick={optimize}
            disabled={optimizing}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '0 16px', height: '36px',
              backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)',
              borderRadius: 'var(--rounded-md)', border: 'none',
              fontSize: '12px', fontWeight: '600', cursor: optimizing ? 'not-allowed' : 'pointer',
              opacity: optimizing ? 0.7 : 1, whiteSpace: 'nowrap',
              transition: 'opacity 150ms',
            }}
          >
            {optimizing ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Optimizing…</> : <><Zap size={12} /> Run Dijkstra</>}
          </button>
        </div>
      )}

      {/* Optimization result */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Optimal Route · {result.criterion}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {[
              { label: 'Distance', value: `${isFinite(result.totalDistance) ? Number(result.totalDistance).toFixed(1) : '—'} km` },
              { label: 'Travel Time', value: `${isFinite(result.totalTime) ? Number(result.totalTime).toFixed(0) : '—'} min` },
              { label: 'Cost', value: `$${isFinite(result.totalCost) ? Number(result.totalCost).toFixed(2) : '—'}` },
            ].map(m => (
              <div key={m.label} style={{ padding: '10px 12px', backgroundColor: 'var(--color-surface-soft)', borderRadius: 'var(--rounded-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-ink)', marginBottom: '2px' }}>{m.value}</div>
                <div style={{ fontSize: '10px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>
              </div>
            ))}
          </div>

          {result.totalTrafficDelay > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#d97706', padding: '6px 10px', backgroundColor: 'rgba(217,119,6,0.08)', borderRadius: 'var(--rounded-sm)' }}>
              🚦 Live traffic delay: +{Math.round(result.totalTrafficDelay / 60)} min
            </div>
          )}

          {(result.stopsSequence || []).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Via</div>
              {result.stopsSequence.slice(0, 5).map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-body)', paddingLeft: '4px' }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--color-muted)', flexShrink: 0 }} />
                  {s.name} <span style={{ color: 'var(--color-muted)', fontSize: '10px' }}>({s.type})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ fontSize: '12px', color: '#dc2626', padding: '8px 12px', backgroundColor: 'rgba(220,38,38,0.07)', borderRadius: 'var(--rounded-sm)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      {/* Status Updater */}
      <div style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
          Update Status
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => updateStatus(key)}
              disabled={updatingStatus || shipment.status === key}
              style={{
                padding: '4px 12px', fontSize: '11px', fontWeight: '600',
                borderRadius: '9999px',
                border: `1px solid ${shipment.status === key ? meta.color : 'var(--color-hairline-strong)'}`,
                backgroundColor: shipment.status === key ? meta.bg : 'transparent',
                color: shipment.status === key ? meta.color : 'var(--color-muted)',
                cursor: shipment.status === key ? 'default' : 'pointer',
                transition: 'all 150ms',
              }}
            >
              {meta.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cost Info */}
      {shipment.cost?.total && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '10px 0', borderTop: '1px solid var(--color-hairline)' }}>
          <span style={{ color: 'var(--color-muted)' }}>Shipping Cost</span>
          <span style={{ fontWeight: '700', color: '#16a34a' }}>${shipment.cost.total.toFixed(2)}</span>
        </div>
      )}

      {/* Route history */}
      {shipment.route?.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
            Route History ({shipment.route.length} points)
          </div>
          <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {shipment.route.slice(-5).reverse().map((pt, i) => (
              <div key={i} style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ opacity: 0.4 }}>{fmtTime(pt.timestamp)}</span>
                {pt.address || `${pt.latitude?.toFixed(4)}, ${pt.longitude?.toFixed(4)}`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Shipments Page ───────────────────────────────────────────────────────
const Shipments = () => {
  const { api } = useContext(InventoryContext);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchShipments = useCallback(async (showSpinner = true) => {
    if (!api) return;
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    try {
      const url = filter === 'ALL' ? '/shipments?limit=100' : `/shipments?status=${filter}&limit=100`;
      const res = await api.get(url);
      setShipments(res.shipments || res.data?.shipments || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, filter]);

  useEffect(() => { fetchShipments(); }, [fetchShipments]);

  // Auto-refresh every 30 s
  useEffect(() => {
    const t = setInterval(() => fetchShipments(false), 30000);
    return () => clearInterval(t);
  }, [fetchShipments]);

  const filtered = shipments.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.trackingNumber?.toLowerCase().includes(q)
      || s.carrier?.toLowerCase().includes(q)
      || s.originAddress?.city?.toLowerCase().includes(q)
      || s.destinationAddress?.city?.toLowerCase().includes(q);
  });

  const statusCounts = Object.fromEntries(
    Object.keys(STATUS_META).map(k => [k, shipments.filter(s => s.status === k).length])
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', minHeight: '100%' }}>
      {/* Spin keyframe */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .shipment-row:hover { background-color: var(--color-canvas-soft) !important; }
      `}</style>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Shipments</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginTop: '2px' }}>
            {shipments.length} total · live tracking · Dijkstra route optimization
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => fetchShipments(false)}
            className="btn-secondary"
            style={{ height: '36px', padding: '0 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary"
            style={{ height: '36px', padding: '0 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={13} /> New Shipment
          </button>
        </div>
      </div>

      {/* Status summary chips */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {ALL_STATUSES.map(s => {
          const meta = STATUS_META[s];
          const count = s === 'ALL' ? shipments.length : (statusCounts[s] || 0);
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => { setFilter(s); setSelected(null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '9999px', border: 'none',
                backgroundColor: active ? (meta?.color || 'var(--color-ink)') : 'var(--color-surface-soft)',
                color: active ? 'white' : 'var(--color-muted)',
                fontSize: '12px', fontWeight: '600',
                cursor: 'pointer', transition: 'all 150ms ease',
                boxShadow: active ? `0 2px 8px ${meta?.color || 'rgba(0,0,0,0.2)'}40` : 'none',
              }}
            >
              {s === 'ALL' ? 'All' : STATUS_META[s].label}
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: '18px', height: '18px', borderRadius: '9999px',
                backgroundColor: active ? 'rgba(255,255,255,0.25)' : 'var(--color-hairline)',
                fontSize: '10px', fontWeight: '700',
                color: active ? 'white' : 'var(--color-muted)',
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Main layout: table + side panel */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, alignItems: 'flex-start' }}>

        {/* ── LEFT: Shipments table ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by tracking number, carrier, city…"
              style={{ height: '38px', paddingLeft: '36px', fontSize: '13px' }}
            />
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding: '80px', textAlign: 'center', color: 'var(--color-muted)', fontSize: '14px' }}>
              <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: '10px', opacity: 0.4 }} />
              <div>Loading shipments…</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '80px', textAlign: 'center', color: 'var(--color-muted)' }}>
              <Package size={36} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '300', marginBottom: '6px' }}>No shipments</div>
              <div style={{ fontSize: '13px', marginBottom: '16px' }}>
                {search ? `No results for "${search}"` : filter !== 'ALL' ? `No shipments with status ${STATUS_META[filter]?.label}` : 'Create your first shipment'}
              </div>
              {!search && (
                <button className="btn-primary" onClick={() => setShowCreate(true)} style={{ height: '36px', padding: '0 20px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={13} /> New Shipment
                </button>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Tracking</th>
                    <th>Route</th>
                    <th>Carrier</th>
                    <th>Status</th>
                    <th>ETA</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => {
                    const isSelected = selected?._id === s._id;
                    return (
                      <tr
                        key={s._id}
                        className="shipment-row"
                        onClick={() => setSelected(isSelected ? null : s)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'var(--color-canvas-soft)' : undefined,
                          borderLeft: isSelected ? `3px solid ${STATUS_META[s.status]?.color || 'var(--color-primary)'}` : '3px solid transparent',
                          transition: 'all 100ms ease',
                        }}
                      >
                        <td>
                          <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--color-ink)', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                            {s.trackingNumber}
                          </div>
                          {s.currentLocation?.address && (
                            <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#16a34a', animation: 'pulse 2s infinite', display: 'inline-block' }} />
                              {s.currentLocation.address}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                            <span style={{ color: '#16a34a', fontWeight: '500' }}>{s.originAddress?.city || '—'}</span>
                            <ArrowRight size={10} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
                            <span style={{ color: '#dc2626', fontWeight: '500' }}>{s.destinationAddress?.city || '—'}</span>
                          </div>
                          {s.originAddress?.latitude ? (
                            <div style={{ fontSize: '10px', color: '#16a34a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Navigation size={9} /> GPS
                            </div>
                          ) : (
                            <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginTop: '2px' }}>No GPS</div>
                          )}
                        </td>
                        <td style={{ fontSize: '13px' }}>{s.carrier}</td>
                        <td><StatusBadge status={s.status} /></td>
                        <td style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                          {s.status === 'DELIVERED' ? (
                            <span style={{ color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle size={11} /> {fmt(s.actualDeliveryDate)}
                            </span>
                          ) : (
                            fmt(s.estimatedDeliveryDate)
                          )}
                        </td>
                        <td>
                          <ChevronRight size={14} style={{ color: 'var(--color-muted)', transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── RIGHT: Detail panel ── */}
        {selected && (
          <div style={{
            width: '400px',
            flexShrink: 0,
            backgroundColor: 'var(--color-surface-card)',
            border: '1px solid var(--color-hairline)',
            borderRadius: 'var(--rounded-xl)',
            padding: '20px',
            position: 'sticky',
            top: '84px',
            maxHeight: 'calc(100vh - 104px)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0',
          }}>
            <RouteOptimizerPanel
              shipment={selected}
              api={api}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateShipmentModal
          api={api}
          onCreated={() => {
            setShowCreate(false);
            fetchShipments();
          }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
};

export default Shipments;