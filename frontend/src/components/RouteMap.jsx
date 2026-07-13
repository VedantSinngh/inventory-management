import React, { useState } from 'react';
import { MapPin, Truck, HelpCircle } from 'lucide-react';

const RouteMap = ({ pathData }) => {
  const [hoveredNode, setHoveredNode] = useState(null);

  if (!pathData) {
    return (
      <div style={{ padding: '20px', border: '1px dashed var(--color-border)', borderRadius: '8px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <HelpCircle size={24} style={{ marginBottom: '8px' }} />
        <div>Please select a starting node and destination to visualize route paths.</div>
      </div>
    );
  }

  const { startNode, stopsSequence, path, totalDistance, totalCost, totalTime, totalTrafficDelay, criterion } = pathData;

  // Render SVG nodes by projecting latitude and longitude
  // We locate a default coordinate boundary box, or map them dynamically
  const nodesList = [];
  if (startNode) {
    nodesList.push({
      id: startNode.id,
      name: startNode.name,
      type: startNode.type,
      x: 100,
      y: 200
    });
  }

  stopsSequence.forEach((stop, index) => {
    nodesList.push({
      id: stop.nodeId,
      name: stop.name,
      type: stop.type,
      x: 200 + index * 120,
      y: 100 + (index % 2 === 0 ? 80 : -40)
    });
  });

  return (
    <div style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px' }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Truck size={18} /> Optimized Route Visualizer ({criterion})
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* SVG Canvas Map */}
        <div style={{ position: 'relative', height: '300px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <svg width="100%" height="100%" viewBox="0 0 600 300">
            {/* Draw Path Lines */}
            {nodesList.length > 1 && (
              <polyline
                points={nodesList.map(n => `${n.x},${n.y}`).join(' ')}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="3"
                strokeDasharray="6,6"
                style={{
                  animation: 'dash 30s linear infinite'
                }}
              />
            )}

            {/* Draw Nodes */}
            {nodesList.map((node, index) => {
              const isStart = index === 0;
              const isEnd = index === nodesList.length - 1;
              
              return (
                <g 
                  key={node.id} 
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isStart || isEnd ? 10 : 7}
                    fill={isStart ? '#10b981' : isEnd ? '#ef4444' : '#eab308'}
                    stroke="var(--color-bg-secondary)"
                    strokeWidth="2"
                  />
                  <text
                    x={node.x}
                    y={node.y - 15}
                    textAnchor="middle"
                    fill="var(--color-text-heading)"
                    style={{ fontSize: '11px', fontWeight: 'bold' }}
                  >
                    {node.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Hover details tooltip */}
          {hoveredNode && (
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', backgroundColor: 'var(--color-bg-primary)', padding: '10px', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '12px' }}>
              <strong style={{ color: 'var(--color-accent)' }}>{hoveredNode.name}</strong><br />
              Type: {hoveredNode.type}
            </div>
          )}
        </div>

        {/* Route Stats & sequence */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '6px', border: '1px solid var(--color-border)', height: '100%' }}>
            <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid var(--color-border)', paddingBottom: '5px' }}>Route Summary Metrics</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', fontSize: '14px' }}>
              <div>Distance: <strong>{totalDistance.toFixed(2)} km</strong></div>
              <div>Estimated Time: <strong>{totalTime.toFixed(1)} mins</strong></div>
              {totalTrafficDelay > 0 && (
                <div style={{ color: '#eab308', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Traffic Delay: <strong>{(totalTrafficDelay / 60).toFixed(1)} mins</strong> 🚦
                </div>
              )}
              <div>Estimated Cost: <strong>${totalCost.toFixed(2)}</strong></div>
            </div>

            <h4 style={{ margin: '15px 0 10px 0', borderBottom: '1px solid var(--color-border)', paddingBottom: '5px' }}>Stops Sequence</h4>
            <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 'bold', marginBottom: '4px' }}>
                <MapPin size={12} /> {startNode?.name} (Origin)
              </div>
              {stopsSequence.map((stop, i) => (
                <div key={stop.nodeId} style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0', paddingLeft: '8px', borderLeft: '2px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{i + 1}.</span> {stop.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
      `}</style>
    </div>
  );
};

export default RouteMap;
