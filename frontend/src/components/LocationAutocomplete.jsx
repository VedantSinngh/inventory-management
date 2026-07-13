import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';

export default function LocationAutocomplete({ placeholder, value, onChange, onSelect }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchTomTom = async (searchText) => {
    if (!searchText || searchText.trim().length < 2) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const tomtomKey = import.meta.env.VITE_TOMTOM_KEY || 'N4g0niHg4iTxrHs25Lpivqt9GcM6bh3d';
      // Use fuzzy search for autocomplete
      const res = await fetch(`https://api.tomtom.com/search/2/search/${encodeURIComponent(searchText)}.json?key=${tomtomKey}&typeahead=true&limit=5`);
      const data = await res.json();
      
      if (data && data.results) {
        setResults(data.results.map(r => ({
          id: r.id,
          name: r.poi ? r.poi.name : (r.address.municipality || r.address.freeformAddress),
          address: r.address.freeformAddress,
          lat: r.position.lat,
          lng: r.position.lon,
          city: r.address.municipality || r.address.localName || '',
          state: r.address.countrySubdivision || '',
          country: r.address.country || ''
        })));
        setIsOpen(true);
      }
    } catch (e) {
      console.error('TomTom search error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (onChange) onChange(val);
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        searchTomTom(val);
      }, 400);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (item) => {
    setQuery(item.name || item.address);
    setIsOpen(false);
    if (onSelect) {
      onSelect({
        lat: item.lat,
        lng: item.lng,
        city: item.city || item.name,
        state: item.state,
        country: item.country
      });
    }
  };

  const clearInput = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    if (onChange) onChange('');
    if (onSelect) onSelect(null);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search size={14} style={{ position: 'absolute', left: '12px', color: 'var(--color-muted)', pointerEvents: 'none' }} />
        
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder={placeholder || 'Search city or address...'}
          style={{
            width: '100%',
            height: '38px',
            paddingLeft: '34px',
            paddingRight: query ? '34px' : '12px',
            fontSize: '13px',
            backgroundColor: 'var(--color-surface-card)',
            border: '1px solid var(--color-hairline-strong)',
            borderRadius: 'var(--rounded-md)',
            color: 'var(--color-ink)',
            outline: 'none',
            transition: 'all 150ms ease',
          }}
          onFocusCapture={(e) => {
            e.target.style.borderColor = 'var(--color-ink)';
            e.target.style.boxShadow = '0 0 0 2px rgba(12, 10, 9, 0.08)';
          }}
          onBlurCapture={(e) => {
            e.target.style.borderColor = 'var(--color-hairline-strong)';
            e.target.style.boxShadow = 'none';
          }}
        />

        {loading && (
          <Loader2 
            size={14} 
            style={{ 
              position: 'absolute', right: query ? '34px' : '12px', 
              color: 'var(--color-muted)', 
              animation: 'spin 1s linear infinite' 
            }} 
          />
        )}

        {query && !loading && (
          <button 
            onClick={clearInput}
            style={{
              position: 'absolute',
              right: '8px',
              padding: '4px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-soft)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          backgroundColor: 'var(--color-surface-card)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 'var(--rounded-md)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          zIndex: 9999,
          maxHeight: '220px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: '6px 0'
        }}>
          {results.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelect(item)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                transition: 'background-color 100ms ease',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-canvas-soft)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <MapPin size={16} style={{ color: 'var(--color-muted)', marginTop: '2px', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-ink)' }}>
                  {item.name}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                  {item.address}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
