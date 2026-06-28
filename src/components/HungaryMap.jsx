import React, { useEffect, useRef } from 'react';

// Leaflet CSS injection
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

const STATUS_COLORS = {
  active:        '#f59e0b',
  investigation: '#ef4444',
  closed:        '#10b981',
  appeal:        '#8b5cf6',
};

const CATEGORY_ICONS = {
  'korrupció':    '🔴',
  'pénzügyi':     '🔵',
  'közbeszerzés': '🟣',
};

export default function HungaryMap({ cases, onCaseSelect, darkMode }) {
  const mapRef    = useRef(null);
  const leafletRef = useRef(null);
  const markersRef = useRef([]);

  // Inject Leaflet CSS once
  useEffect(() => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel  = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
  }, []);

  // Init map
  useEffect(() => {
    if (leafletRef.current || !mapRef.current) return;

    import('leaflet').then(L => {
      const map = L.map(mapRef.current, {
        center: [47.16, 19.5],
        zoom: 7,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // Tile layer – CartoDB dark or light
      const tileUrl = darkMode
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

      L.tileLayer(tileUrl, {
        attribution: '© <a href="https://www.openstreetmap.org/">OSM</a> © <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      leafletRef.current = { map, L };
      addMarkers(cases, L, map, onCaseSelect);
    });

    return () => {
      if (leafletRef.current) {
        leafletRef.current.map.remove();
        leafletRef.current = null;
      }
    };
  }, []);

  // Update markers when cases change
  useEffect(() => {
    if (!leafletRef.current) return;
    const { map, L } = leafletRef.current;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = addMarkers(cases, L, map, onCaseSelect);
  }, [cases, onCaseSelect]);

  // Update tile layer on dark mode toggle
  useEffect(() => {
    if (!leafletRef.current) return;
    const { map, L } = leafletRef.current;
    map.eachLayer(layer => {
      if (layer._url) map.removeLayer(layer);
    });
    const tileUrl = darkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    L.tileLayer(tileUrl, {
      attribution: '© OSM © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
  }, [darkMode]);

  return (
    <div
      ref={mapRef}
      style={{ height: '480px', width: '100%', borderRadius: '12px', zIndex: 0 }}
    />
  );
}

function addMarkers(cases, L, map, onCaseSelect) {
  const added = [];

  // Group by coordinates (cases in same city)
  const groups = {};
  cases.forEach(c => {
    if (!c.coordinates) return;
    const key = c.coordinates.join(',');
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });

  Object.entries(groups).forEach(([key, group]) => {
    const [lat, lng] = key.split(',').map(Number);
    const maxAmount = Math.max(...group.map(c => c.amount_huf || 0));
    const radius = Math.max(14, Math.min(40, maxAmount > 0 ? Math.sqrt(maxAmount / 1e8) : 14));

    // Circle marker – color by most severe status
    const statusPriority = { investigation: 0, active: 1, appeal: 2, closed: 3 };
    const dominant = group.sort((a, b) =>
      (statusPriority[a.status] ?? 9) - (statusPriority[b.status] ?? 9)
    )[0];

    const circle = L.circleMarker([lat, lng], {
      radius,
      fillColor:   STATUS_COLORS[dominant.status] || '#6b7280',
      color:       '#fff',
      weight:      2,
      opacity:     1,
      fillOpacity: 0.85,
    }).addTo(map);

    // Popup
    const popupHtml = group.map(c => `
      <div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #e5e7eb">
        <b style="font-size:13px">${CATEGORY_ICONS[c.category] || '⚫'} ${c.title}</b><br/>
        <span style="font-size:11px;color:#6b7280">${c.region} · ${c.date} · ${c.source}</span><br/>
        <span style="font-size:12px;font-weight:600;color:${STATUS_COLORS[c.status]}">
          ${getStatusLabel(c.status)}
        </span>
        <span style="font-size:12px;margin-left:8px">
          💰 ${c.amount_huf != null ? `${(c.amount_huf / 1e9).toFixed(1)} Mrd HUF` : 'Összeg ismeretlen'}
        </span>
      </div>
    `).join('');

    circle.bindPopup(`
      <div style="min-width:240px;max-width:300px;font-family:sans-serif">
        <b style="font-size:14px">📍 ${dominant.region}</b>
        <span style="font-size:11px;color:#6b7280;margin-left:6px">${group.length} ügy</span>
        <hr style="margin:6px 0"/>
        ${popupHtml}
      </div>
    `, { maxWidth: 320 });

    circle.on('click', () => {
      if (onCaseSelect) onCaseSelect(group[0]);
    });

    added.push(circle);
  });

  return added;
}

function getStatusLabel(status) {
  return { active: 'Aktív', investigation: 'Nyomozás', closed: 'Lezárult', appeal: 'Fellebbezés' }[status] || status;
}
