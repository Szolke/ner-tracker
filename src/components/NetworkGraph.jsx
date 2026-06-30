import React, { useEffect, useRef, useState, useCallback } from 'react';

const STATUS_COLORS = { active:'#f59e0b', investigation:'#ef4444', closed:'#10b981', appeal:'#8b5cf6' };
const CONN_COLORS   = { business_connection:'#3b82f6', political_ally:'#f59e0b' };

function useForceLayout(nodes, edges, width, height) {
  const [positions, setPositions] = useState({});
  const frameRef = useRef(null);
  const posRef   = useRef({});
  const velRef   = useRef({});

  useEffect(() => {
    if (!nodes.length) return;
    // Init positions in a circle
    const cx = width / 2, cy = height / 2, r = Math.min(width, height) * 0.35;
    const init = {};
    const vel  = {};
    nodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      init[n.id] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
      vel[n.id]  = { vx: 0, vy: 0 };
    });
    posRef.current = init;
    velRef.current = vel;

    let tick = 0;
    const simulate = () => {
      const pos = posRef.current;
      const v   = velRef.current;
      const k   = 80;   // spring length
      const rep = 3500; // repulsion
      const damp = 0.82;

      // Repulsion between all pairs
      nodes.forEach(a => {
        nodes.forEach(b => {
          if (a.id === b.id) return;
          const dx = pos[a.id].x - pos[b.id].x;
          const dy = pos[a.id].y - pos[b.id].y;
          const d  = Math.max(1, Math.sqrt(dx*dx + dy*dy));
          const f  = rep / (d * d);
          v[a.id].vx += (dx / d) * f;
          v[a.id].vy += (dy / d) * f;
        });
      });

      // Spring attraction along edges
      edges.forEach(e => {
        const a = pos[e.from], b = pos[e.to];
        if (!a || !b) return;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d  = Math.max(1, Math.sqrt(dx*dx + dy*dy));
        const f  = (d - k) * 0.05;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        v[e.from].vx += fx; v[e.from].vy += fy;
        v[e.to].vx   -= fx; v[e.to].vy   -= fy;
      });

      // Gravity toward center
      nodes.forEach(n => {
        v[n.id].vx += (cx - pos[n.id].x) * 0.003;
        v[n.id].vy += (cy - pos[n.id].y) * 0.003;
      });

      // Integrate + dampen + clamp
      nodes.forEach(n => {
        v[n.id].vx *= damp; v[n.id].vy *= damp;
        pos[n.id].x = Math.max(50, Math.min(width - 50,  pos[n.id].x + v[n.id].vx));
        pos[n.id].y = Math.max(50, Math.min(height - 50, pos[n.id].y + v[n.id].vy));
      });

      tick++;
      setPositions({ ...pos });
      if (tick < 120) frameRef.current = requestAnimationFrame(simulate);
    };

    frameRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [nodes.map(n=>n.id).join(','), width, height]);

  return positions;
}

export default function NetworkGraph({ data, darkMode, onCaseSelect, selectedNodeId, onSelectNode }) {
  const containerRef = useRef(null);
  const [size, setSize]           = useState({ w: 700, h: 480 });
  const [hoveredNode, setHovered] = useState(null);
  // A kiválasztott személy a szülő (Dashboard) is birtokolhatja (selectedNodeId/onSelectNode
  // prop), hogy a CaseDetail modal nyitása/zárása ne törölje a kijelölést — ugyanaz a minta,
  // mint a ChoroplethMap-nál. Ha a szülő nem ad vezérlést, helyi state-tel működik tovább.
  const [localSelectedId, setLocalSelectedId] = useState(null);
  const isControlled = selectedNodeId !== undefined && typeof onSelectNode === 'function';
  const selectedId = isControlled ? selectedNodeId : localSelectedId;
  const setSelectedId = isControlled ? onSelectNode : setLocalSelectedId;

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      setSize({ w: width, h: Math.max(400, Math.min(540, width * 0.65)) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const nodes = React.useMemo(() => {
    if (!data) return [];
    const seen = new Set();
    return data.cases.flatMap(c => c.involved_persons).filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id); return true;
    }).map(p => ({
      ...p,
      caseCount: data.cases.filter(c => c.involved_persons.some(x => x.id === p.id)).length,
      status: data.cases.find(c => c.involved_persons.some(x => x.id === p.id))?.status || 'active',
    }));
  }, [data]);

  const edges = React.useMemo(() => data?.connections || [], [data]);

  const positions = useForceLayout(nodes, edges, size.w, size.h);

  const nodeRadius = n => Math.max(14, Math.min(28, 12 + n.caseCount * 5));

  const selectedNode = React.useMemo(() => nodes.find(n => n.id === selectedId) || null, [nodes, selectedId]);
  const activeNode = selectedNode || hoveredNode;
  const relatedIds = React.useMemo(() => {
    if (!activeNode) return new Set();
    const ids = new Set([activeNode.id]);
    edges.forEach(e => {
      if (e.from === activeNode.id) ids.add(e.to);
      if (e.to   === activeNode.id) ids.add(e.from);
    });
    return ids;
  }, [activeNode, edges]);

  if (!data || !nodes.length) return (
    <div className="flex items-center justify-center h-40 opacity-40 flex-col gap-2">
      <span className="text-3xl">🕸️</span>
      <p>Nincs elegendő kapcsolati adat</p>
      <p className="text-xs">A scraper automatikusan tölt be személyeket a cikkekből</p>
    </div>
  );

  return (
    <div ref={containerRef} className="w-full">
      <svg width={size.w} height={size.h} className="overflow-visible">
        {/* Defs */}
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={darkMode ? '#6b7280' : '#9ca3af'} />
          </marker>
          {nodes.map(n => (
            <radialGradient key={`g-${n.id}`} id={`grad-${n.id}`} cx="35%" cy="35%">
              <stop offset="0%" stopColor="white" stopOpacity="0.3" />
              <stop offset="100%" stopColor={STATUS_COLORS[n.status] || '#6b7280'} stopOpacity="1" />
            </radialGradient>
          ))}
        </defs>

        {/* Edges */}
        {edges.map((e, i) => {
          const a = positions[e.from], b = positions[e.to];
          if (!a || !b) return null;
          const isActive = activeNode && (e.from === activeNode.id || e.to === activeNode.id);
          const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.15;
          const my = (a.y + b.y) / 2 - (b.x - a.x) * 0.15;
          return (
            <g key={i}>
              <path
                d={`M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`}
                fill="none"
                stroke={CONN_COLORS[e.type] || '#6b7280'}
                strokeWidth={isActive ? 2.5 : 1}
                strokeOpacity={activeNode ? (isActive ? 0.9 : 0.12) : 0.35}
                strokeDasharray={e.type === 'political_ally' ? '5,4' : 'none'}
                markerEnd="url(#arrow)"
              />
              {isActive && (
                <text x={mx} y={my - 5} textAnchor="middle"
                  fontSize="9" fill={darkMode ? '#d1d5db' : '#6b7280'} opacity="0.85">
                  {e.type === 'business_connection' ? '🤝 üzleti' : '🏛️ politikai'}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map(n => {
          const pos = positions[n.id];
          if (!pos) return null;
          const r       = nodeRadius(n);
          const isActive  = activeNode?.id === n.id;
          const isRelated = relatedIds.has(n.id);
          const opacity   = activeNode ? (isRelated ? 1 : 0.2) : 1;
          return (
            <g key={n.id} style={{ cursor: 'pointer' }} opacity={opacity}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setSelectedId(selectedId === n.id ? null : n.id)}>
              {/* Pulse ring on active */}
              {isActive && (
                <circle cx={pos.x} cy={pos.y} r={r + 8}
                  fill="none" stroke={STATUS_COLORS[n.status]} strokeWidth="2" opacity="0.4" />
              )}
              {/* Shadow */}
              <circle cx={pos.x + 2} cy={pos.y + 2} r={r}
                fill="black" opacity="0.15" />
              {/* Main circle */}
              <circle cx={pos.x} cy={pos.y} r={r}
                fill={`url(#grad-${n.id})`}
                stroke={isActive ? 'white' : STATUS_COLORS[n.status]}
                strokeWidth={isActive ? 2.5 : 1.5} />
              {/* Case count badge */}
              {n.caseCount > 1 && (
                <circle cx={pos.x + r * 0.65} cy={pos.y - r * 0.65} r={8}
                  fill="#ef4444" stroke="white" strokeWidth="1.5" />
              )}
              {n.caseCount > 1 && (
                <text x={pos.x + r * 0.65} y={pos.y - r * 0.65 + 3.5}
                  textAnchor="middle" fontSize="8" fontWeight="bold" fill="white">
                  {n.caseCount}
                </text>
              )}
              {/* Name label */}
              <text x={pos.x} y={pos.y + r + 13}
                textAnchor="middle" fontSize="10" fontWeight="600"
                fill={darkMode ? '#e5e7eb' : '#1f2937'}>
                {n.name.split(' ')[0]}
              </text>
              <text x={pos.x} y={pos.y + r + 24}
                textAnchor="middle" fontSize="9"
                fill={darkMode ? '#9ca3af' : '#6b7280'}>
                {n.name.split(' ').slice(1).join(' ')}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Detail card */}
      {selectedNode && (() => {
        const relCases = data.cases.filter(c => c.involved_persons.some(p => p.id === selectedNode.id));
        const conns    = edges.filter(e => e.from === selectedNode.id || e.to === selectedNode.id);
        return (
          <div className={`mt-4 p-4 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-bold text-lg">{selectedNode.name}</p>
                <p className="text-sm opacity-60">{selectedNode.position}</p>
              </div>
              <button onClick={() => setSelectedId(null)} aria-label="Bezárás" className="opacity-40 hover:opacity-100 text-xl">×</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold opacity-50 mb-2">ÉRINTETT ÜGYEK ({relCases.length})</p>
                <div className="space-y-1.5">
                  {relCases.map(c => (
                    <div key={c.id} onClick={() => onCaseSelect && onCaseSelect(c)}
                      className={`px-3 py-2 rounded-lg text-sm transition ${onCaseSelect ? 'cursor-pointer hover:ring-1 hover:ring-blue-400' : ''} ${darkMode ? 'bg-gray-600' : 'bg-white border border-gray-200'}`}>
                      <p className="font-semibold leading-snug">{c.title}</p>
                      <p className="text-xs opacity-50 mt-0.5">{c.region} · {c.amount_huf != null ? `${(c.amount_huf/1e9).toFixed(1)} Mrd HUF` : 'Összeg ismeretlen'}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold opacity-50 mb-2">KAPCSOLATOK ({conns.length})</p>
                <div className="space-y-1.5">
                  {conns.length === 0 && <p className="text-sm opacity-40">Nincs rögzített kapcsolat</p>}
                  {conns.map((conn, i) => {
                    const otherId = conn.from === selectedNode.id ? conn.to : conn.from;
                    const other   = data.cases.flatMap(c => c.involved_persons).find(p => p.id === otherId);
                    return (
                      <div key={i} onClick={() => other && setSelectedId(other.id)}
                        className={`px-3 py-2 rounded-lg text-sm transition ${other ? 'cursor-pointer hover:ring-1 hover:ring-blue-400' : ''} ${darkMode ? 'bg-gray-600' : 'bg-white border border-gray-200'}`}>
                        <p className="font-semibold">{other?.name || otherId}</p>
                        <p className="text-xs opacity-50">{conn.type === 'business_connection' ? '🤝 Üzleti' : '🏛️ Politikai'} · {conn.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-xs opacity-60">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-400 inline-block"/>üzleti kapcsolat</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-yellow-400 inline-block border-dashed border-t"/>politikai szövetség</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-red-500 inline-block opacity-70"/>badge = ügyek száma</span>
        <span className="opacity-50">· körméret ∝ érintettség · kattints a részletekért</span>
      </div>
    </div>
  );
}
