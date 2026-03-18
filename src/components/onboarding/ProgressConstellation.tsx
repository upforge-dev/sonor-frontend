/**
 * ProgressConstellation — Network diagram that grows as things connect.
 *
 * Renders an SVG constellation with "Sonor" at the center and connected
 * services/modules orbiting around it. Nodes animate in and draw connection
 * lines when connected. Disconnected nodes appear as dim outlines.
 *
 * Usage:
 *   <ProgressConstellation
 *     nodes={[
 *       { id: 'google', label: 'Google', connected: true },
 *       { id: 'site-kit', label: 'Site Kit', connected: false },
 *     ]}
 *   />
 */

import { useMemo } from 'react'

export interface ConstellationNode {
  id: string
  label: string
  connected: boolean
}

interface ProgressConstellationProps {
  nodes: ConstellationNode[]
  /** Center label (default "Sonor") */
  center?: string
  /** Width of the SVG (default 400) */
  width?: number
  /** Height of the SVG (default 300) */
  height?: number
}

// Icon paths for known services (simplified outlines)
const NODE_ICONS: Record<string, string> = {
  google: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.69 0 3.22.63 4.39 1.67l-1.77 1.77A4.94 4.94 0 0012 7c-2.76 0-5 2.24-5 5s2.24 5 5 5c2.24 0 4.13-1.47 4.77-3.5H12V11h7c.11.57.17 1.16.17 1.78 0 4.42-3.58 8-8 8C6.48 20.78 2.73 17.03 2.73 12S6.48 3.22 12 3.22z',
  facebook: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z',
  netlify: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  analytics: 'M18 20V10M12 20V4M6 20v-6',
  'site-kit': 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  seo: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  crm: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  reputation: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  shopify: 'M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z',
  linkedin: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z',
}

export default function ProgressConstellation({
  nodes,
  center = 'Sonor',
  width = 400,
  height = 300,
}: ProgressConstellationProps) {
  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) * 0.35

  // Position nodes in a circle around center
  const positioned = useMemo(() => {
    return nodes.map((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2
      return {
        ...node,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        delay: i * 0.15,
      }
    })
  }, [nodes, cx, cy, radius])

  const connectedCount = nodes.filter(n => n.connected).length

  return (
    <div className="constellation-container">
      <style>{`
        .constellation-container {
          max-width: ${width}px;
          width: 100%;
        }

        .constellation-svg {
          width: 100%;
          height: auto;
        }

        /* Connection lines */
        .constellation-line {
          stroke: rgba(57, 191, 176, 0.3);
          stroke-width: 1;
          fill: none;
          stroke-dasharray: 200;
          stroke-dashoffset: 200;
        }

        .constellation-line.connected {
          animation: constellationDraw 0.8s ease-out forwards;
        }

        .constellation-line.disconnected {
          stroke: rgba(255, 255, 255, 0.04);
          stroke-dasharray: 4 4;
          stroke-dashoffset: 0;
        }

        /* Center node */
        .constellation-center {
          opacity: 0;
          animation: constellationNodeIn 0.5s ease-out 0.1s forwards;
        }

        /* Outer nodes */
        .constellation-node {
          opacity: 0;
        }

        .constellation-node.visible {
          animation: constellationNodeIn 0.4s ease-out forwards;
        }

        .constellation-node-circle-connected {
          fill: rgba(57, 191, 176, 0.12);
          stroke: rgba(57, 191, 176, 0.5);
          stroke-width: 1.5;
        }

        .constellation-node-circle-disconnected {
          fill: rgba(255, 255, 255, 0.02);
          stroke: rgba(255, 255, 255, 0.08);
          stroke-width: 1;
          stroke-dasharray: 3 3;
        }

        .constellation-label {
          font-size: 9px;
          fill: rgba(255, 255, 255, 0.5);
          text-anchor: middle;
          font-weight: 500;
        }

        .constellation-label-connected {
          fill: rgba(255, 255, 255, 0.8);
        }

        .constellation-center-label {
          font-size: 11px;
          fill: #39bfb0;
          text-anchor: middle;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        /* Center glow */
        .constellation-center-glow {
          animation: constellationPulse 3s ease-in-out infinite;
        }

        /* Connection counter */
        .constellation-counter {
          font-size: 10px;
          fill: rgba(255, 255, 255, 0.3);
          text-anchor: middle;
        }

        @keyframes constellationDraw {
          to { stroke-dashoffset: 0; }
        }

        @keyframes constellationNodeIn {
          from { opacity: 0; transform: scale(0.7); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes constellationPulse {
          0%, 100% { opacity: 0.3; r: 24; }
          50% { opacity: 0.6; r: 28; }
        }
      `}</style>

      <svg
        className="constellation-svg"
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="centerGlow">
            <stop offset="0%" stopColor="rgba(57, 191, 176, 0.3)" />
            <stop offset="100%" stopColor="rgba(57, 191, 176, 0)" />
          </radialGradient>
        </defs>

        {/* Connection lines */}
        {positioned.map(node => (
          <line
            key={`line-${node.id}`}
            x1={cx}
            y1={cy}
            x2={node.x}
            y2={node.y}
            className={`constellation-line ${node.connected ? 'connected' : 'disconnected'}`}
            style={node.connected ? { animationDelay: `${node.delay + 0.3}s` } : undefined}
          />
        ))}

        {/* Center glow */}
        <circle
          cx={cx}
          cy={cy}
          r={26}
          fill="url(#centerGlow)"
          className="constellation-center-glow"
        />

        {/* Center node */}
        <g className="constellation-center">
          <circle
            cx={cx}
            cy={cy}
            r={22}
            fill="rgba(57, 191, 176, 0.1)"
            stroke="rgba(57, 191, 176, 0.4)"
            strokeWidth={2}
          />
          <text x={cx} y={cy + 1} className="constellation-center-label">
            {center}
          </text>
          <text x={cx} y={cy + 14} className="constellation-counter">
            {connectedCount}/{nodes.length}
          </text>
        </g>

        {/* Outer nodes */}
        {positioned.map(node => {
          const iconPath = NODE_ICONS[node.id]
          return (
            <g
              key={node.id}
              className={`constellation-node visible`}
              style={{ animationDelay: `${node.delay + 0.4}s` }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={18}
                className={
                  node.connected
                    ? 'constellation-node-circle-connected'
                    : 'constellation-node-circle-disconnected'
                }
              />
              {/* Icon */}
              {iconPath && (
                <g
                  transform={`translate(${node.x - 8}, ${node.y - 8}) scale(0.67)`}
                  opacity={node.connected ? 0.8 : 0.2}
                >
                  <path
                    d={iconPath}
                    fill="none"
                    stroke={node.connected ? '#39bfb0' : 'rgba(255,255,255,0.3)'}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              )}
              {/* Label */}
              <text
                x={node.x}
                y={node.y + 28}
                className={`constellation-label ${node.connected ? 'constellation-label-connected' : ''}`}
              >
                {node.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
