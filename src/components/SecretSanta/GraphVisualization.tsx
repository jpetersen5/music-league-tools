import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import type { Pairing, Participant } from '@/types'
import { detectCycles } from '@/utils/secretSanta'
import resetIcon from '/reset.svg'
import './GraphVisualization.scss'

interface GraphVisualizationProps {
  pairings: Pairing[]
  participants: Participant[]
}

interface Node {
  x: number
  y: number
  label: string
  cycleIndex: number
}

interface CycleGroup {
  cycleIndex: number
  nodes: Node[]
  centerX: number
  centerY: number
  radius: number
}

export const GraphVisualization = ({ pairings, participants }: GraphVisualizationProps) => {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  const { nodes, edges, cycles } = useMemo(() => {
    if (participants.length === 0) {
      return { nodes: [], edges: [], cycles: [] }
    }

    const width = 600
    const height = 600

    const detectedCycles = detectCycles(pairings, participants)

    const cycleGroups: CycleGroup[] = []
    const numCycles = detectedCycles.length

    // Arrange cycles in a grid layout (square root for balanced rows/cols)
    const cols = Math.ceil(Math.sqrt(numCycles))
    const rows = Math.ceil(numCycles / cols)
    const cellWidth = width / cols
    const cellHeight = height / rows

    detectedCycles.forEach((cycle, cycleIndex) => {
      const row = Math.floor(cycleIndex / cols)
      const col = cycleIndex % cols

      const cellCenterX = (col + 0.5) * cellWidth
      const cellCenterY = (row + 0.5) * cellHeight

      // Scale radius by cycle size (more participants = larger circle)
      const maxRadius = Math.min(cellWidth, cellHeight) / 2 - 80
      const radius = Math.min(maxRadius, 40 + cycle.length * 15)

      cycleGroups.push({
        cycleIndex,
        nodes: [],
        centerX: cellCenterX,
        centerY: cellCenterY,
        radius,
      })
    })

    const nodeMap = new Map<string, Node>()

    detectedCycles.forEach((cycle, cycleIndex) => {
      const group = cycleGroups[cycleIndex]!

      cycle.forEach((participantIndex, positionInCycle) => {
        const participant = participants[participantIndex]!
        const angle = (positionInCycle / cycle.length) * 2 * Math.PI - Math.PI / 2

        const node: Node = {
          x: group.centerX + group.radius * Math.cos(angle),
          y: group.centerY + group.radius * Math.sin(angle),
          label: participant,
          cycleIndex,
        }

        nodeMap.set(participant, node)
        group.nodes.push(node)
      })
    })

    const edgeList = pairings.map(pairing => {
      const from = nodeMap.get(pairing.from)
      const to = nodeMap.get(pairing.to)
      return { from, to, pairing }
    })

    return {
      nodes: Array.from(nodeMap.values()),
      edges: edgeList.filter(e => e.from && e.to),
      cycles: cycleGroups,
    }
  }, [pairings, participants])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.button !== 0) return // Only left mouse button
      setIsDragging(true)
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y })
    },
    [transform.x, transform.y]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isDragging) return

      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }))
    },
    [isDragging, dragStart]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0]!
        setIsDragging(true)
        setDragStart({ x: touch.clientX - transform.x, y: touch.clientY - transform.y })
      }
    },
    [transform.x, transform.y]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (e.touches.length === 1 && isDragging) {
        const touch = e.touches[0]!
        setTransform(prev => ({
          ...prev,
          x: touch.clientX - dragStart.x,
          y: touch.clientY - dragStart.y,
        }))
      }
    },
    [isDragging, dragStart]
  )

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleReset = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 })
  }, [])

  // Attach wheel event listener with passive: false to prevent page scroll
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault()

      const rect = svg.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Calculate point in SVG space before zoom
      const pointX = (mouseX - transform.x) / transform.scale
      const pointY = (mouseY - transform.y) / transform.scale

      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.max(0.1, Math.min(5, transform.scale * delta))

      // Zoom towards mouse cursor (keep point under mouse stationary)
      const newX = mouseX - pointX * newScale
      const newY = mouseY - pointY * newScale

      setTransform({
        x: newX,
        y: newY,
        scale: newScale,
      })
    }

    svg.addEventListener('wheel', wheelHandler, { passive: false })
    return () => svg.removeEventListener('wheel', wheelHandler)
  }, [transform])

  if (participants.length === 0) {
    return (
      <div className="graph-visualization graph-visualization--empty">
        <p>Generate pairings to see the visualization</p>
      </div>
    )
  }

  const cycleColors = [
    '#6366f1', // Primary
    '#ec4899', // Pink
    '#10b981', // Green
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#14b8a6', // Teal
  ]

  return (
    <div className="graph-visualization">
      <div className="graph-visualization__header">
        <h3>Graph Visualization</h3>
        <div className="graph-visualization__controls">
          {cycles.length > 0 && (
            <span className="graph-visualization__info">
              {cycles.length} cycle{cycles.length !== 1 ? 's' : ''} detected
            </span>
          )}
          <button
            className="graph-visualization__reset-btn"
            onClick={handleReset}
            type="button"
            title="Reset zoom and pan"
            aria-label="Reset View"
          >
            <img src={resetIcon} alt="Reset" />
          </button>
        </div>
      </div>
      <svg
        ref={svgRef}
        className="graph-visualization__svg"
        viewBox="0 0 600 600"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <defs>
          {cycleColors.map((color, i) => (
            <marker
              key={`arrowhead-${i}`}
              id={`arrowhead-${i}`}
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon points="0 0, 10 3, 0 6" fill={color} />
            </marker>
          ))}
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {cycles.map((cycle, i) => {
            const color = cycleColors[i % cycleColors.length]!
            return (
              <g key={`cycle-bg-${i}`}>
                <circle
                  cx={cycle.centerX}
                  cy={cycle.centerY}
                  r={cycle.radius + 45}
                  className="graph-visualization__cycle-bg"
                  fill={`${color}10`}
                  stroke={color}
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  opacity="0.3"
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={cycle.centerX}
                  y={cycle.centerY - cycle.radius - 50}
                  className="graph-visualization__cycle-label"
                  textAnchor="middle"
                  fill={color}
                  fontSize={18}
                  fontWeight="600"
                >
                  Cycle {i + 1} ({cycle.nodes.length} participants)
                </text>
              </g>
            )
          })}

          {edges.map((edge, i) => {
            if (!edge.from || !edge.to) return null

            const color = cycleColors[edge.from.cycleIndex % cycleColors.length]!

            const dx = edge.to.x - edge.from.x
            const dy = edge.to.y - edge.from.y
            const length = Math.sqrt(dx * dx + dy * dy)
            const nodeRadius = 30 / transform.scale

            const startX = edge.from.x + (dx / length) * nodeRadius
            const startY = edge.from.y + (dy / length) * nodeRadius

            const endX = edge.to.x - (dx / length) * nodeRadius
            const endY = edge.to.y - (dy / length) * nodeRadius

            return (
              <g key={`edge-${i}`}>
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  className="graph-visualization__edge"
                  stroke={color}
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  markerEnd={`url(#arrowhead-${edge.from.cycleIndex % cycleColors.length})`}
                />
              </g>
            )
          })}

          {nodes.map((node, i) => {
            const color = cycleColors[node.cycleIndex % cycleColors.length]!
            return (
              <g key={`node-${i}`} className="graph-visualization__node">
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={30 / transform.scale}
                  className="graph-visualization__node-circle"
                  stroke={color}
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={node.x}
                  y={node.y}
                  className="graph-visualization__node-text"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={14 / transform.scale}
                >
                  {node.label.length > 10 ? `${node.label.substring(0, 8)}...` : node.label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
