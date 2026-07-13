/**
 * LeafletMap — real interactive map using Leaflet (CDN loaded).
 * Props:
 *   origin      {lat, lng, label}  – green pin
 *   destination {lat, lng, label}  – red pin
 *   routeCoords [{lat, lng}]       – blue polyline
 *   liveLocation {lat, lng}        – animated truck dot
 *   dijkstraPath [{from,to,...}]   – raw Dijkstra path segments
 *   dijkstraNodes Map              – id→node for labels
 *   pickMode     'origin'|'destination'|null
 *   onPick       (lat, lng) => void
 *   height       string (default '420px')
 */

import React, { useEffect, useRef, useState } from 'react';

// Dynamically load Leaflet CSS + JS from CDN once
let leafletLoaded = false;
let leafletLoadPromise = null;

function loadLeaflet() {
  if (leafletLoaded) return Promise.resolve(window.L);
  if (leafletLoadPromise) return leafletLoadPromise;

  leafletLoadPromise = new Promise((resolve) => {
    // CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      leafletLoaded = true;
      resolve(window.L);
    };
    document.head.appendChild(script);
  });
  return leafletLoadPromise;
}

// Custom SVG icon factory
function makeIcon(color, size = 28) {
  return {
    className: '',
    html: `<svg width="${size}" height="${size * 1.4}" viewBox="0 0 28 39" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 25 14 25S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="${color}" opacity="0.95"/>
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
    </svg>`,
    iconSize: [size, size * 1.4],
    iconAnchor: [size / 2, size * 1.4],
    popupAnchor: [0, -size * 1.4],
  };
}

function makeTruckIcon() {
  return {
    className: '',
    html: `<div style="
      width:32px;height:32px;
      background:linear-gradient(135deg,#2563eb,#1d4ed8);
      border-radius:50%;
      border:3px solid white;
      box-shadow:0 2px 8px rgba(37,99,235,0.5);
      display:flex;align-items:center;justify-content:center;
      font-size:14px;
    ">🚚</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  };
}

const LeafletMap = ({
  origin,
  destination,
  routeCoords = [],
  liveLocation,
  dijkstraPath = [],
  dijkstraNodes,
  pickMode,
  onPick,
  height = '420px',
}) => {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markersRef = useRef({});
  const polylinesRef = useRef([]);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Loading map…');

  // Initialise map once
  useEffect(() => {
    loadLeaflet().then((L) => {
      if (mapRef.current) return; // already init
      if (!containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [20.5937, 78.9629], // India centroid default
        zoom: 5,
        zoomControl: true,
      });

      const tomtomKey = import.meta.env.VITE_TOMTOM_KEY || 'N4g0niHg4iTxrHs25Lpivqt9GcM6bh3d';
      
      // Base map
      L.tileLayer(`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${tomtomKey}`, {
        attribution: '© TomTom',
        maxZoom: 19,
      }).addTo(map);

      // Traffic overlay
      L.tileLayer(`https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${tomtomKey}`, {
        maxZoom: 19,
        opacity: 0.8
      }).addTo(map);

      mapRef.current = map;
      setReady(true);
      setStatus('');

      // Click handler for coordinate picking
      map.on('click', (e) => {
        if (onPick) {
          onPick(parseFloat(e.latlng.lat.toFixed(6)), parseFloat(e.latlng.lng.toFixed(6)));
        }
      });
    }).catch(() => {
      setStatus('Map unavailable — check your internet connection.');
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Show cursor crosshair when picking
  useEffect(() => {
    if (!mapRef.current) return;
    const container = mapRef.current.getContainer();
    if (pickMode) {
      container.style.cursor = 'crosshair';
    } else {
      container.style.cursor = '';
    }
  }, [pickMode, ready]);

  // Update markers and route whenever data changes
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L = window.L;
    const map = mapRef.current;

    // Clear existing markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    // Clear polylines
    polylinesRef.current.forEach(p => p.remove());
    polylinesRef.current = [];

    const bounds = [];

    // Origin marker
    if (origin?.lat && origin?.lng) {
      const icon = L.divIcon(makeIcon('#16a34a'));
      const m = L.marker([origin.lat, origin.lng], { icon })
        .addTo(map)
        .bindPopup(`<b>Origin</b><br/>${origin.label || `${origin.lat}, ${origin.lng}`}`);
      markersRef.current.origin = m;
      bounds.push([origin.lat, origin.lng]);
    }

    // Destination marker
    if (destination?.lat && destination?.lng) {
      const icon = L.divIcon(makeIcon('#dc2626'));
      const m = L.marker([destination.lat, destination.lng], { icon })
        .addTo(map)
        .bindPopup(`<b>Destination</b><br/>${destination.label || `${destination.lat}, ${destination.lng}`}`);
      markersRef.current.destination = m;
      bounds.push([destination.lat, destination.lng]);
    }

    // Live truck location
    if (liveLocation?.lat && liveLocation?.lng) {
      const icon = L.divIcon(makeTruckIcon());
      const m = L.marker([liveLocation.lat, liveLocation.lng], { icon })
        .addTo(map)
        .bindPopup(`<b>Current Location</b><br/>${liveLocation.lat.toFixed(4)}, ${liveLocation.lng.toFixed(4)}`);
      markersRef.current.live = m;
      bounds.push([liveLocation.lat, liveLocation.lng]);
    }

    // OSRM route polyline (blue dashed)
    if (routeCoords.length >= 2) {
      const pl = L.polyline(routeCoords.map(c => [c.lat, c.lng]), {
        color: '#2563eb',
        weight: 4,
        opacity: 0.85,
        dashArray: '8 6',
      }).addTo(map);
      polylinesRef.current.push(pl);
      routeCoords.forEach(c => bounds.push([c.lat, c.lng]));
    }

    // Dijkstra path segments (amber)
    if (dijkstraPath.length > 0 && dijkstraNodes) {
      const coords = [];
      // Build coordinate list from path
      if (dijkstraPath[0]) {
        const startNode = dijkstraNodes.get ? dijkstraNodes.get(dijkstraPath[0].from) : dijkstraNodes[dijkstraPath[0].from];
        if (startNode?.latitude && startNode?.longitude) {
          coords.push([startNode.latitude, startNode.longitude]);
        }
      }
      dijkstraPath.forEach(seg => {
        const node = dijkstraNodes.get ? dijkstraNodes.get(seg.to) : dijkstraNodes[seg.to];
        if (node?.latitude && node?.longitude) {
          coords.push([node.latitude, node.longitude]);
          bounds.push([node.latitude, node.longitude]);
        }
      });
      if (coords.length >= 2) {
        const pl = L.polyline(coords, {
          color: '#d97706',
          weight: 3,
          opacity: 0.9,
          dashArray: '4 4',
        }).addTo(map);
        polylinesRef.current.push(pl);
      }
    }

    // Fit map to all markers/routes
    if (bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 12);
    }
  }, [ready, origin, destination, liveLocation, routeCoords, dijkstraPath, dijkstraNodes]);

  return (
    <div style={{ position: 'relative', height, borderRadius: 'var(--rounded-lg)', overflow: 'hidden', border: '1px solid var(--color-hairline)' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Pick mode overlay badge */}
      {pickMode && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          backgroundColor: pickMode === 'origin' ? '#16a34a' : '#dc2626',
          color: 'white',
          padding: '6px 16px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: '600',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
        }}>
          Click map to set {pickMode}
        </div>
      )}

      {/* Loading overlay */}
      {status && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'var(--color-surface-soft)',
          fontSize: '14px', color: 'var(--color-muted)',
          zIndex: 999,
        }}>
          {status}
        </div>
      )}
    </div>
  );
};

export default LeafletMap;
