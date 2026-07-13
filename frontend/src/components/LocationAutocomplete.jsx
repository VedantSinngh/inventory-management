import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';

// Helper to highlight matching text
function HighlightMatch({ text = '', query = '' }) {
  if (!query) return <span>{text}</span>;
  
  const regex = new RegExp(`(${query})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? <strong key={i} style={{ color: 'var(--color-ink)' }}>{part}</strong> : <span key={i}>{part}</span>
      )}
    </span>
  );
}

export default function LocationAutocomplete({ placeholder, value, onChange, onSelect }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const listRef = useRef(null);

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

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeElement = listRef.current.children[activeIndex];
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  const searchTomTom = async (searchText) => {
    if (!searchText || searchText.trim().length < 2) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const tomtomKey = import.meta.env.VITE_TOMTOM_KEY || 'N4g0niHg4iTxrHs25Lpivqt9GcM6bh3d';
      const res = await fetch(`https://api.tomtom.com/search/2/search/${encodeURIComponent(searchText)}.json?key=${tomtomKey}&typeahead=true&limit=6`);
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
        setActiveIndex(-1);
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
      }, 350);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (item) => {
    setQuery(item.name || item.address);
    setIsOpen(false);
    setActiveIndex(-1);
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

  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'ArrowDown' && results.length > 0) setIsOpen(true);
      return;
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          handleSelect(results[activeIndex]);
        } else if (results.length > 0 && activeIndex === -1) {
          // Default to first if none selected
          handleSelect(results[0]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search size={15} style={{ position: 'absolute', left: '14px', color: 'var(--color-muted)', pointerEvents: 'none', transition: 'color 150ms' }} id="search-icon" />
        
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { 
            if (results.length > 0) setIsOpen(true); 
            const icon = wrapperRef.current?.querySelector('#search-icon');
            if(icon) icon.style.color = 'var(--color-ink)';
          }}
          placeholder={placeholder || 'Search city or address...'}
          style={{
            width: '100%',
            height: '42px',
            paddingLeft: '38px',
            paddingRight: query ? '38px' : '14px',
            fontSize: '14px',
            fontFamily: 'var(--font-sans)',
            backgroundColor: 'var(--color-surface-soft)',
            border: '1px solid var(--color-hairline-strong)',
            borderRadius: '8px',
            color: 'var(--color-ink)',
            outline: 'none',
            transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02) inset'
          }}
          onFocusCapture={(e) => {
            e.target.style.borderColor = 'var(--color-primary)';
            e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1), 0 1px 2px rgba(0,0,0,0.02) inset';
            e.target.style.backgroundColor = 'var(--color-surface)';
          }}
          onBlurCapture={(e) => {
            e.target.style.borderColor = 'var(--color-hairline-strong)';
            e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02) inset';
            e.target.style.backgroundColor = 'var(--color-surface-soft)';
            const icon = wrapperRef.current?.querySelector('#search-icon');
            if(icon) icon.style.color = 'var(--color-muted)';
          }}
        />

        {loading && (
          <Loader2 
            size={15} 
            style={{ 
              position: 'absolute', right: query ? '36px' : '14px', 
              color: 'var(--color-primary)', 
              animation: 'spin 1s linear infinite' 
            }} 
          />
        )}

        {query && !loading && (
          <button 
            onClick={clearInput}
            style={{
              position: 'absolute',
              right: '10px',
              padding: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'all 150ms ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-ink)'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-muted)'; }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div 
          ref={listRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-hairline-strong)',
            borderRadius: '10px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0,0,0,0.04)',
            zIndex: 9999,
            maxHeight: '260px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            padding: '6px'
          }}
        >
          {results.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setActiveIndex(index)}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  borderRadius: '6px',
                  backgroundColor: isActive ? 'var(--color-surface-hover)' : 'transparent',
                  transition: 'background-color 100ms ease',
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '28px', height: '28px', borderRadius: '6px',
                  backgroundColor: isActive ? 'var(--color-surface)' : 'var(--color-surface-soft)',
                  border: '1px solid var(--color-hairline)',
                  flexShrink: 0
                }}>
                  <MapPin size={14} style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-muted)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <HighlightMatch text={item.name} query={query} />
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--color-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <HighlightMatch text={item.address} query={query} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
