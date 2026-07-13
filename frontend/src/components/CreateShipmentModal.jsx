import React, { useState, useEffect } from 'react';
import { X, MapPin, Truck, AlertTriangle, Loader2 } from 'lucide-react';
import LeafletMap from './LeafletMap';
import LocationAutocomplete from './LocationAutocomplete';

const CARRIERS = ['FedEx', 'UPS', 'DHL', 'USPS', 'BlueDart', 'Delhivery'];

export default function CreateShipmentModal({ api, onCreated, onClose }) {
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
  }, [api]);

  // When both coords set, fetch TomTom route preview
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
    const tomtomKey = import.meta.env.VITE_TOMTOM_KEY || 'N4g0niHg4iTxrHs25Lpivqt9GcM6bh3d';
    if (pickMode === 'origin') {
      setOrigin(prev => ({ ...prev, lat, lng }));
      setForm(f => ({ ...f, originCity: `${lat.toFixed(4)}, ${lng.toFixed(4)}` }));
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

  const handleSubmit = async () => {
    if (!form.orderId) { setError('Please select an order to fulfill.'); return; }
    if (!form.destCity && !destination?.lat) { setError('Destination location is required.'); return; }
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

  const renderPickButton = (label) => {
    const isActive = pickMode === label.toLowerCase();
    return (
      <button
        type="button"
        onClick={() => setPickMode(isActive ? null : label.toLowerCase())}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 12px', borderRadius: '6px',
          backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-surface)',
          border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--color-hairline-strong)'}`,
          color: isActive ? '#fff' : 'var(--color-muted)',
          fontSize: '12px', fontWeight: '500', cursor: 'pointer',
          transition: 'all 150ms ease',
          boxShadow: isActive ? '0 4px 12px rgba(37,99,235,0.2)' : '0 1px 2px rgba(0,0,0,0.02)'
        }}
      >
        <MapPin size={12} />
        {isActive ? 'Click map to place' : 'Pick on map'}
      </button>
    );
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(12, 10, 9, 0.4)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: '24px',
      animation: 'fadeIn 200ms ease-out forwards',
    }}>
      <style>
        {`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes scaleUp { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          .modal-content { animation: scaleUp 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          .fancy-select {
            width: 100%; height: 42px; padding: 0 14px; font-size: 14px;
            background-color: var(--color-surface-soft);
            border: 1px solid var(--color-hairline-strong);
            border-radius: 8px; color: var(--color-ink); outline: none;
            transition: all 150ms ease; box-shadow: 0 1px 2px rgba(0,0,0,0.02) inset;
            appearance: none; background-image: url('data:image/svg+xml;utf8,<svg fill="none" stroke="%239ca3af" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 9l6 6 6-6"></path></svg>');
            background-repeat: no-repeat; background-position: right 14px center; background-size: 14px;
          }
          .fancy-select:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(37,99,235,0.1), 0 1px 2px rgba(0,0,0,0.02) inset; background-color: var(--color-surface); }
          .fancy-input {
            width: 100%; height: 42px; padding: 0 14px; font-size: 14px;
            background-color: var(--color-surface-soft); border: 1px solid var(--color-hairline-strong);
            border-radius: 8px; color: var(--color-ink); outline: none;
            transition: all 150ms ease; box-shadow: 0 1px 2px rgba(0,0,0,0.02) inset;
          }
          .fancy-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(37,99,235,0.1), 0 1px 2px rgba(0,0,0,0.02) inset; background-color: var(--color-surface); }
          .label-text { font-size: 11px; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px; display: block; }
        `}
      </style>
      
      <div className="modal-content" style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: '16px',
        border: '1px solid var(--color-hairline)',
        width: '100%', maxWidth: '1024px',
        maxHeight: '90vh',
        boxShadow: '0 32px 80px rgba(0,0,0,0.15), 0 2px 10px rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 32px 20px', borderBottom: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--color-surface-soft)', border: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={20} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '500', color: 'var(--color-ink)', margin: '0 0 2px 0' }}>New Shipment</h2>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: 0 }}>Create a new dispatch and optimize routing with live TomTom traffic.</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-muted)', padding: '8px', borderRadius: '8px', display: 'flex', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', transition: 'background-color 150ms' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <X size={20} />
          </button>
        </div>

        {/* Body Container */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* Left Column: Form Inputs */}
          <div style={{ flex: '1 1 45%', padding: '32px', overflowY: 'auto', borderRight: '1px solid var(--color-hairline)' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* Order & Carrier Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label className="label-text">Order *</label>
                  <select className="fancy-select" value={form.orderId} onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))}>
                    <option value="">{loadingOrders ? 'Loading orders…' : 'Select an order'}</option>
                    {orders.map(o => (
                      <option key={o._id} value={o._id}>
                        #{o._id?.slice(-6)?.toUpperCase()} • {o.type || 'Order'} • ₹{o.totalAmount?.toLocaleString() || 0}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-text">Carrier</label>
                  <select className="fancy-select" value={form.carrier} onChange={e => setForm(f => ({ ...f, carrier: e.target.value }))}>
                    {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <hr style={{ border: 0, borderTop: '1px solid var(--color-hairline)' }} />

              {/* Origin Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="label-text" style={{ margin: 0 }}>Origin Point</label>
                  {renderPickButton('Origin')}
                </div>
                <LocationAutocomplete
                  placeholder="Search warehouse, city or address..."
                  value={form.originCity}
                  onChange={v => setForm(f => ({ ...f, originCity: v }))}
                  onSelect={(item) => {
                    if (item) {
                      setOrigin({ lat: item.lat, lng: item.lng, city: item.city });
                      setForm(f => ({ ...f, originCity: item.city || item.name, originState: item.state, originCountry: item.country }));
                    }
                  }}
                />
              </div>

              {/* Destination Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="label-text" style={{ margin: 0 }}>Destination Point *</label>
                  {renderPickButton('Destination')}
                </div>
                <LocationAutocomplete
                  placeholder="Search delivery city or address..."
                  value={form.destCity}
                  onChange={v => setForm(f => ({ ...f, destCity: v }))}
                  onSelect={(item) => {
                    if (item) {
                      setDestination({ lat: item.lat, lng: item.lng, city: item.city });
                      setForm(f => ({ ...f, destCity: item.city || item.name, destState: item.state, destCountry: item.country }));
                    }
                  }}
                />
              </div>

              {/* Weight Section */}
              <div>
                <label className="label-text">Total Weight (kg)</label>
                <input
                  type="number"
                  className="fancy-input"
                  value={form.weight}
                  onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                  placeholder="e.g. 150.5"
                  style={{ width: '50%' }}
                />
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: 'rgba(220,38,38,0.06)', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626', fontSize: '13px', fontWeight: '500' }}>
                  <AlertTriangle size={16} /> {error}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Map Integration */}
          <div style={{ flex: '1 1 55%', backgroundColor: 'var(--color-surface-soft)', padding: '16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-hairline)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', position: 'relative' }}>
              <LeafletMap
                origin={origin}
                destination={destination}
                routeCoords={routePreview}
                pickMode={pickMode}
                onPick={handleMapPick}
                height="100%"
              />
              {/* Premium overlay for TomTom attribute */}
              <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 400, backgroundColor: 'var(--color-surface)', padding: '6px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '600', color: 'var(--color-muted)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid var(--color-hairline)' }}>
                Powered by TomTom
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-surface)' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
            Ensure exact locations are verified before dispatch.
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{ height: '40px', padding: '0 20px', fontSize: '14px', fontWeight: '500', color: 'var(--color-ink)', backgroundColor: 'transparent', border: '1px solid var(--color-hairline-strong)', borderRadius: '8px', cursor: 'pointer', transition: 'all 150ms' }}
              onMouseOver={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; e.currentTarget.style.borderColor = 'var(--color-muted)'; }}
              onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'var(--color-hairline-strong)'; }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={creating}
              style={{ height: '40px', padding: '0 24px', fontSize: '14px', fontWeight: '500', color: '#fff', backgroundColor: 'var(--color-primary)', border: 'none', borderRadius: '8px', cursor: creating ? 'wait' : 'pointer', transition: 'all 150ms', opacity: creating ? 0.8 : 1, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}
              onMouseOver={e => { if(!creating) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {creating ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : 'Create Shipment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
