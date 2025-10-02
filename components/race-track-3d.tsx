/**
 * Race Track 3D Visualization Components
 *
 * This module provides reusable 3D race track visualization components for web applications.
 *
 * @example
 * ```tsx
 * import { TrackScene } from '@/components/race-track-3d'
 * import trackData from '@/data/track-points'
 *
 * function RaceTrackPage() {
 *   const handleTurnClick = (turnNumber: number, position: [number, number, number]) => {
 *     console.log(`Clicked turn ${turnNumber} at position:`, position)
 *   }
 *
 *   return (
 *     <div className="w-full h-screen">
 *       <TrackScene
 *         trackData={trackData}
 *         theme="neon"
 *         showTurnNumbers={true}
 *         interactive={true}
 *         onTurnClick={handleTurnClick}
 *       />
 *     </div>
 *   )
 * }
 * ```
 */

"use client"
import React, { useRef, useMemo, forwardRef, useImperativeHandle, useState, Suspense } from "react"
import type { TrackPoint, AlternateRoute } from "./race-track-visualization"
import { START_FINISH_POSITION } from "./race-track-visualization"

// Import Three.js components normally
import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { OrbitControls, Environment, Html } from "@react-three/drei"
import * as THREE from "three"

// Reusable Track Scene Component Props
export interface TrackSceneProps {
  // Core track data
  trackData: TrackPoint[]

  // Visual customization
  theme?: 'default' | 'neon' | 'classic' | 'modern'
  primaryColor?: string
  secondaryColor?: string
  backgroundColor?: string

  // Track appearance
  elevationMultiplier?: number
  trackWidth?: number
  showTurnNumbers?: boolean
  calloutDistance?: number

  // Interactive features
  interactive?: boolean
  onTrackClick?: (position: [number, number, number]) => void
  onTurnClick?: (turnNumber: number, position: [number, number, number]) => void

  // Layout
  className?: string
  style?: React.CSSProperties

  // Advanced customization
  customCallouts?: Array<{ position: [number, number, number]; label: string }>
  alternateRoutes?: AlternateRoute[]
  startFinishLine?: [number, number, number]
}

// Internal component props (for the actual 3D scene)
interface RaceTrack3DProps {
  trackData: TrackPoint[]
  gradientColor?: string
  lineColor?: string
  backgroundColor?: string
  elevationMultiplier?: number
  smoothingLevel?: number
  groundOffset?: number
  trackWidth?: number
  useRibbon?: boolean
  showCallouts?: boolean
  callouts?: Array<{ position: [number, number, number]; label: string }>
  calloutSize?: number
  calloutDistance?: number
  startFinishPosition?: [number, number, number]
  alternateRoutes?: AlternateRoute[]
  onSceneClick?: (position: [number, number, number]) => void
  isClickToPlaceMode?: boolean
  showControlPoints?: boolean
  // HUD props
  selectedTurn?: number | null
  onSelectTurn?: (turnIndex: number | null) => void
  hudPosition?: [number, number, number] | null
  onSetHudPosition?: (position: [number, number, number] | null) => void
  showTrackInfo?: boolean
  onToggleTrackInfo?: (show: boolean) => void
  onTurnClick?: (position: [number, number, number]) => void
  turnCallouts?: Array<{ position: [number, number, number]; label: string }>
  selectedTurnIndex?: number | null
}

// Theme presets for quick styling
const THEMES = {
  default: {
    gradientColor: "#991b1b",
    lineColor: "#ef4444",
    backgroundColor: "#000000",
  },
  neon: {
    gradientColor: "#00ffff",
    lineColor: "#39ff14",
    backgroundColor: "#1a0033",
  },
  classic: {
    gradientColor: "#ffffff",
    lineColor: "#8b5a2b",
    backgroundColor: "#2d5a27",
  },
  modern: {
    gradientColor: "#6366f1",
    lineColor: "#ec4899",
    backgroundColor: "#0f172a",
  },
} as const

// Turn data with racing details (speeds in mph, max 65 mph)
const TURN_DETAILS = [
  { name: "Turn 1", type: "Medium-speed right-hander", speed: "55-65 mph", gear: "4th", notes: "Brake early, trail brake through entry" },
  { name: "Turn 2", type: "Slow hairpin left", speed: "25-35 mph", gear: "2nd", notes: "Late apex, smooth throttle application" },
  { name: "Turn 3", type: "Fast chicane entry", speed: "55-65 mph", gear: "5th", notes: "Straight-line speed is crucial" },
  { name: "Turn 4", type: "Technical right-left combo", speed: "45-55 mph", gear: "3rd", notes: "Weight transfer management key" },
  { name: "Turn 5", type: "Uphill left-hander", speed: "55-65 mph", gear: "4th", notes: "Elevation changes affect grip" },
  { name: "Turn 6", type: "Blind crest into right", speed: "55-65 mph", gear: "5th", notes: "Commit to line before crest" },
  { name: "Turn 7", type: "Downhill left carousel", speed: "55-65 mph", gear: "4th", notes: "Use banking to carry speed" },
  { name: "Turn 8", type: "Technical S-bend", speed: "40-50 mph", gear: "3rd", notes: "Smooth inputs, avoid sawing wheel" },
  { name: "Turn 9", type: "Fast right kink", speed: "55-65 mph", gear: "5th", notes: "Minimal steering input needed" },
  { name: "Turn 10", type: "Medium left-hander", speed: "55-65 mph", gear: "4th", notes: "Good passing opportunity" },
  { name: "Turn 11", type: "Slow right-hander", speed: "35-45 mph", gear: "3rd", notes: "Late braking zone, patient exit" },
  { name: "Turn 12", type: "Fast left sweep", speed: "55-65 mph", gear: "5th", notes: "Use all the track on exit" },
  { name: "Turn 13", type: "Technical right-left", speed: "50-60 mph", gear: "3rd", notes: "Rhythm and flow important" },
  { name: "Turn 14", type: "Medium downhill left", speed: "55-65 mph", gear: "4th", notes: "Elevation helps rotation" },
  { name: "Turn 15", type: "Fast right-hander", speed: "55-65 mph", gear: "5th", notes: "Late apex for better exit" },
  { name: "Turn 16", type: "Uphill chicane", speed: "45-55 mph", gear: "3rd", notes: "Build speed gradually" },
  { name: "Turn 17", type: "Final corner complex", speed: "55-65 mph", gear: "4th", notes: "Sets up for main straight" },
  { name: "Turn 18", type: "Fast left kink", speed: "55-65 mph", gear: "5th", notes: "Full throttle commitment" },
] as const

// Main reusable Track Scene Component
export const TrackScene = forwardRef<HTMLDivElement, TrackSceneProps>(
  (
    {
      trackData,
      theme = 'default',
      primaryColor,
      secondaryColor,
      backgroundColor,
      elevationMultiplier = 2,
      trackWidth = 3,
      showTurnNumbers = true,
      calloutDistance = 20,
      interactive = true,
      onTrackClick,
      onTurnClick,
      className = "",
      style = {},
      customCallouts,
      alternateRoutes,
      startFinishLine,
      ...props
    },
    ref
  ) => {
    // Apply theme or custom colors
    const themeColors = THEMES[theme]
    const gradientColor = primaryColor || themeColors.gradientColor
    const lineColor = secondaryColor || themeColors.lineColor
    const bgColor = backgroundColor || themeColors.backgroundColor

    // Use the original turn callouts positions (these were manually positioned correctly)
    const turnCallouts = useMemo(() => {
      if (!showTurnNumbers) return []

      // Original turn callouts with correct positions
      const ORIGINAL_TURN_CALLOUTS = [
        { position: [178.0207977294922, 8.954895734786987, 94.28092956542969], label: "T1" },
        { position: [180.0103302001953, 8.674322605133057, 11.850353240966797], label: "T2" },
        { position: [117.51516723632812, 11.130828857421875, 60.75695037841797], label: "T3" },
        { position: [163.26605224609375, 8.613812685012817, 43.413082122802734], label: "T4" },
        { position: [123.90059661865234, 9.104000091552734, 86.26699829101562], label: "T5" },
        { position: [32.524986267089844, 8.46538519859314, 81.4964370727539], label: "T6" },
        { position: [26.847400665283203, 9.560400009155273, 52.37919998168945], label: "T7" },
        { position: [-8.776745796203613, 12.088362693786621, 38.8324089050293], label: "T8" },
        { position: [-2.608907461166382, 12.130964756011963, 19.58861541748047], label: "T9" },
        { position: [-14.03291130065918, 12.442146301269531, -3.543109655380249], label: "T10" },
        { position: [-37.10651397705078, 14.077892303466797, 81.46376037597656], label: "T11" },
        { position: [-48.01011276245117, 12.387964725494385, -21.545366287231445], label: "T12" },
        { position: [-59.513790130615234, 13.232219696044922, -46.048828125], label: "T13" },
        { position: [-52.066287994384766, 13.795202255249023, -74.36454772949219], label: "T14" },
        { position: [-80.21865853972386, 13.582037244217593, -81.83136385524084], label: "T15" },
        { position: [-89.78832244873047, 13.730594635009766, 55.48883819580078], label: "T16" },
        { position: [-74.608, 13.9, 66.844], label: "T17" },
        { position: [-66.46492767333984, 14.277263641357422, 97.03485107421875], label: "T18" },
      ]

      // Adjust Y positions based on elevation multiplier (but keep relative positioning)
      return ORIGINAL_TURN_CALLOUTS.map(callout => ({
        position: [
          callout.position[0],
          callout.position[1] * (elevationMultiplier / 2) + 8, // Scale Y and position higher above track
          callout.position[2]
        ] as [number, number, number],
        label: callout.label,
      }))
    }, [showTurnNumbers, elevationMultiplier])

    // Use the hardcoded start/finish position
    const startFinishPosition: [number, number, number] = START_FINISH_POSITION

    // Add start/finish line to callouts for clicking
    const startFinishCallout = useMemo(() => ({
      position: startFinishPosition,
      label: "Start / Finish"
    }), [startFinishPosition])

    // Combine custom callouts with turn callouts and start/finish
    const allCallouts = useMemo(() => {
      const callouts = [...turnCallouts, startFinishCallout]
      if (customCallouts) {
        callouts.push(...customCallouts)
      }
      return callouts
    }, [turnCallouts, startFinishCallout, customCallouts])

    // State for HUD display
    const [selectedTurn, setSelectedTurn] = useState<number | null>(null)
    const [hudPosition, setHudPosition] = useState<[number, number, number] | null>(null)
    const [showTrackInfo, setShowTrackInfo] = useState<boolean>(false)

    // Handle turn clicks - show HUD instead of calling external callback
    const handleTurnClick = (position: [number, number, number]) => {
      const turnIndex = turnCallouts.findIndex(
        (callout) =>
          Math.abs(callout.position[0] - position[0]) < 5 &&
          Math.abs(callout.position[1] - position[1]) < 5 &&
          Math.abs(callout.position[2] - position[2]) < 5
      )

      if (turnIndex >= 0) {
        setSelectedTurn(turnIndex)
        setHudPosition(position)
      }
    }

    // Handle track clicks
    const handleSceneClick = (position: [number, number, number]) => {
      if (onTrackClick) {
        onTrackClick(position)
      }
      if (onTurnClick) {
        handleTurnClick(position)
      }
    }

    return (
      <div
        ref={ref}
        className={`w-full h-full ${className}`}
        style={{
          minHeight: '400px',
          position: 'relative',
          ...style,
        }}
        {...props}
      >
        <RaceTrack3D
          trackData={trackData}
          gradientColor={gradientColor}
          lineColor={lineColor}
          backgroundColor={bgColor}
          elevationMultiplier={elevationMultiplier}
          trackWidth={trackWidth}
          showCallouts={allCallouts.length > 0}
          callouts={allCallouts}
          calloutSize={50}
          calloutDistance={calloutDistance}
          startFinishPosition={startFinishPosition}
          alternateRoutes={alternateRoutes}
          onSceneClick={interactive ? handleSceneClick : undefined}
          useRibbon={false}
          selectedTurn={selectedTurn}
          onSelectTurn={setSelectedTurn}
          hudPosition={hudPosition}
          onSetHudPosition={setHudPosition}
          showTrackInfo={showTrackInfo}
          onToggleTrackInfo={setShowTrackInfo}
          onTurnClick={handleTurnClick}
          turnCallouts={turnCallouts}
          selectedTurnIndex={selectedTurn}
        />
      </div>
    )
  }
)

TrackScene.displayName = "TrackScene"


interface RaceTrack3DHandle {
  exportPNG: () => void
  zoomToPosition: (position: [number, number, number]) => void
}

function smoothPoints(points: TrackPoint[], level: number): TrackPoint[] {
  if (level === 0 || points.length < 3) return points

  const windowSize = Math.min(level * 2 + 1, points.length)
  const smoothed: TrackPoint[] = []

  for (let i = 0; i < points.length; i++) {
    let sumX = 0,
      sumY = 0,
      sumZ = 0
    let count = 0

    const halfWindow = Math.floor(windowSize / 2)

    for (let j = -halfWindow; j <= halfWindow; j++) {
      const index = (i + j + points.length) % points.length
      const point = points[index]
      if (point && typeof point.x === "number" && typeof point.y === "number" && typeof point.z === "number") {
        sumX += point.x
        sumY += point.y
        sumZ += point.z
        count++
      }
    }

    if (count > 0) {
      smoothed.push({
        x: sumX / count,
        y: sumY / count,
        z: sumZ / count,
        distance: points[i]?.distance,
        sector: points[i]?.sector,
      })
    }
  }

  return smoothed.length > 0 ? smoothed : points
}

function Callouts({
  callouts,
  calloutSize,
  calloutDistance,
  onCalloutClick,
  selectedTurnIndex,
}: {
  callouts: Array<{ position: [number, number, number]; label: string }>
  calloutSize: number
  calloutDistance: number
  onCalloutClick?: (position: [number, number, number]) => void
  selectedTurnIndex?: number | null
}) {
  const textSizeClass = useMemo(() => {
    if (calloutSize <= 15) return "text-base"
    if (calloutSize <= 20) return "text-2xl"
    if (calloutSize <= 25) return "text-4xl"
    if (calloutSize <= 30) return "text-6xl"
    if (calloutSize <= 35) return "text-7xl"
    return "text-8xl"
  }, [calloutSize])

  const paddingClass = useMemo(() => {
    if (calloutSize <= 15) return "px-3 py-1.5"
    if (calloutSize <= 20) return "px-6 py-3"
    if (calloutSize <= 25) return "px-8 py-4"
    if (calloutSize <= 30) return "px-10 py-5"
    if (calloutSize <= 35) return "px-12 py-6"
    return "px-14 py-7"
  }, [calloutSize])

  const borderClass = useMemo(() => {
    if (calloutSize <= 15) return "border-2"
    if (calloutSize <= 25) return "border-4"
    if (calloutSize <= 35) return "border-6"
    return "border-8"
  }, [calloutSize])

  return (
    <>
      {callouts.map((callout, index) => {
        const isSelected = selectedTurnIndex === index

        return (
          <Html key={index} position={callout.position} center distanceFactor={calloutDistance}>
            <div
              className={`
                ${isSelected
                  ? 'bg-blue-500/80 animate-pulse shadow-blue-500/50'
                  : 'bg-black/70 hover:bg-black/90'
                }
                backdrop-blur-xl text-white ${paddingClass} rounded-full font-bold ${textSizeClass} shadow-2xl ${borderClass} border-white/10 whitespace-nowrap cursor-pointer transition-all duration-300
                ${isSelected ? 'animate-bounce scale-110' : 'scale-100'}
              `}
              onClick={() => onCalloutClick?.(callout.position)}
            >
              {callout.label}
            </div>
          </Html>
        )
      })}
    </>
  )
}

function StartFinishLine({
  position,
  trackWidth,
  trackData,
  elevationMultiplier,
  smoothingLevel,
  groundOffset,
}: {
  position: [number, number, number]
  trackWidth: number
  trackData: TrackPoint[]
  elevationMultiplier: number
  smoothingLevel: number
  groundOffset: number
}) {
  // Calculate track statistics
  const trackStats = useMemo(() => {
    if (trackData.length < 2) return { length: 0, elevation: 0, turns: 0 }

    let totalLength = 0
    let minElevation = Infinity
    let maxElevation = -Infinity

    for (let i = 1; i < trackData.length; i++) {
      const prev = trackData[i - 1]
      const curr = trackData[i]
      const distance = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) +
        Math.pow(curr.y - prev.y, 2) +
        Math.pow(curr.z - prev.z, 2)
      )
      totalLength += distance

      minElevation = Math.min(minElevation, curr.y)
      maxElevation = Math.max(maxElevation, curr.y)
    }

    // Close the loop for the last segment
    if (trackData.length > 2) {
      const first = trackData[0]
      const last = trackData[trackData.length - 1]
      const distance = Math.sqrt(
        Math.pow(first.x - last.x, 2) +
        Math.pow(first.y - last.y, 2) +
        Math.pow(first.z - last.z, 2)
      )
      totalLength += distance
    }

    return {
      length: Math.round(totalLength * 10) / 10, // Round to 1 decimal
      elevation: Math.round((maxElevation - minElevation) * 10) / 10,
      turns: 18 // We know there are 18 turns from our turn data
    }
  }, [trackData])

  // Create the line geometry for clicking
  const lineGeometry = useMemo(() => {
    let processedPoints = trackData
    if (smoothingLevel > 0) {
      processedPoints = smoothPoints(trackData, smoothingLevel)
    }

    const minY = Math.min(...processedPoints.map((p) => p.y))
    const yOffset = minY * elevationMultiplier - groundOffset

    let closestIndex = 0
    let minDistance = Number.POSITIVE_INFINITY

    processedPoints.forEach((point, index) => {
      const adjustedY = point.y * elevationMultiplier - yOffset
      const dist = Math.sqrt(
        Math.pow(point.x - position[0], 2) + Math.pow(adjustedY - position[1], 2) + Math.pow(point.z - position[2], 2),
      )
      if (dist < minDistance) {
        minDistance = dist
        closestIndex = index
      }
    })

    const prevIndex = (closestIndex - 1 + processedPoints.length) % processedPoints.length
    const nextIndex = (closestIndex + 1) % processedPoints.length

    const prevPoint = processedPoints[prevIndex]
    const nextPoint = processedPoints[nextIndex]

    const direction = new THREE.Vector3(nextPoint.x - prevPoint.x, 0, nextPoint.z - prevPoint.z).normalize()

    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize()

    const lineWidth = trackWidth * 1.5
    const halfWidth = lineWidth * 0.5

    const leftPoint = new THREE.Vector3(
      position[0] + perpendicular.x * halfWidth,
      position[1],
      position[2] + perpendicular.z * halfWidth,
    )

    const rightPoint = new THREE.Vector3(
      position[0] - perpendicular.x * halfWidth,
      position[1],
      position[2] - perpendicular.z * halfWidth,
    )

    const geometry = new THREE.BufferGeometry().setFromPoints([leftPoint, rightPoint])
    return geometry
  }, [position, trackWidth, trackData, elevationMultiplier, smoothingLevel, groundOffset])

  return (
    <>
      {/* The clickable line */}
      <line geometry={lineGeometry}>
        <lineBasicMaterial color="#ffffff" linewidth={5} />
      </line>

      {/* Track info panel */}
      <Html position={position} center distanceFactor={20}>
        <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-lg p-4 shadow-2xl min-w-[250px]">
          <div className="text-center mb-3">
            <h3 className="text-lg font-bold text-white mb-1">Track Information</h3>
            <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Length:</span>
              <span className="text-white font-medium">{trackStats.length}m</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-300">Elevation:</span>
              <span className="text-white font-medium">{trackStats.elevation}m</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-300">Turns:</span>
              <span className="text-white font-medium">{trackStats.turns}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-300">Track Width:</span>
              <span className="text-white font-medium">{Math.round(trackWidth * 100)}cm</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="text-xs text-gray-400 text-center">
              Click turn numbers for details
            </div>
          </div>
        </div>
      </Html>
    </>
  )
}

function AlternateRouteTrack({
  route,
  trackWidth,
  lineColor,
  gradientColor,
  useRibbon,
  onRouteClick,
  isClickable,
  showControlPoints = false,
}: {
  route: AlternateRoute
  trackWidth: number
  lineColor: string
  gradientColor: string
  useRibbon: boolean
  onRouteClick?: (position: [number, number, number]) => void
  isClickable?: boolean
  showControlPoints?: boolean
}) {
  const { planeGeometry, trackRibbonGeometry, lineGeometry, clickTubeGeometry, curvePath } = useMemo(() => {
    const startPoint = new THREE.Vector3(...route.startPoint)
    const endPoint = new THREE.Vector3(...route.endPoint)

    const path = new THREE.CurvePath<THREE.Vector3>()

    const allPoints: THREE.Vector3[] = [startPoint]
    if (route.controlPoints && route.controlPoints.length > 0) {
      route.controlPoints.forEach((cp) => {
        allPoints.push(new THREE.Vector3(...cp))
      })
    }
    allPoints.push(endPoint)

    if (route.segments && route.segments.length > 0) {
      console.log("[v0] Creating route with segments:", route.segments)
      console.log(
        "[v0] All points:",
        allPoints.map((p) => [p.x, p.y, p.z]),
      )

      let currentIndex = 0

      for (let segmentIdx = 0; segmentIdx < route.segments.length; segmentIdx++) {
        const segmentType = route.segments[segmentIdx]

        if (segmentType === "straight") {
          // Straight segment connects current point to next point
          const p1 = allPoints[currentIndex]
          const p2 = allPoints[currentIndex + 1]
          console.log("[v0] Adding straight segment from", [p1.x, p1.y, p1.z], "to", [p2.x, p2.y, p2.z])
          path.add(new THREE.LineCurve3(p1, p2))
          currentIndex++
        } else if (segmentType === "curve") {
          // Curved segment uses all remaining points
          const curvePoints = allPoints.slice(currentIndex)
          console.log(
            "[v0] Adding curved segment with points:",
            curvePoints.map((p) => [p.x, p.y, p.z]),
          )
          // Use centripetal catmull-rom with zero tension for tighter curves
          path.add(new THREE.CatmullRomCurve3(curvePoints, false, "centripetal", 0))
          break // Curve uses all remaining points, so we're done
        }
      }
    } else {
      // Fallback to original smooth curve behavior
      const curve = new THREE.CatmullRomCurve3(allPoints, false)
      path.add(curve)
    }

    const numSegments = Math.max(100, allPoints.length * 20)
    const segmentPoints = path.getPoints(numSegments)

    console.log("[v0] Generated", segmentPoints.length, "points along path")

    const gradientRGB = new THREE.Color(gradientColor)
    const groundLevel = 0

    const planeVertices: number[] = []
    const planeIndices: number[] = []
    const planeNormals: number[] = []
    const planeColors: number[] = []

    for (let i = 0; i <= numSegments; i++) {
      const point = segmentPoints[i]

      planeVertices.push(point.x, point.y, point.z)
      planeNormals.push(0, 0, 1)
      planeColors.push(gradientRGB.r, gradientRGB.g, gradientRGB.b, 1)

      planeVertices.push(point.x, groundLevel, point.z)
      planeNormals.push(0, 0, 1)
      planeColors.push(gradientRGB.r, gradientRGB.g, gradientRGB.b, 0)

      if (i < numSegments) {
        const baseIndex = i * 2
        const nextBase = baseIndex + 2

        planeIndices.push(baseIndex, nextBase, baseIndex + 1)
        planeIndices.push(baseIndex + 1, nextBase, nextBase + 1)
      }
    }

    const planeGeom = new THREE.BufferGeometry()
    planeGeom.setAttribute("position", new THREE.Float32BufferAttribute(planeVertices, 3))
    planeGeom.setAttribute("normal", new THREE.Float32BufferAttribute(planeNormals, 3))
    planeGeom.setAttribute("color", new THREE.Float32BufferAttribute(planeColors, 4))
    planeGeom.setIndex(planeIndices)
    planeGeom.computeVertexNormals()

    const ribbonVertices: number[] = []
    const ribbonIndices: number[] = []
    const ribbonNormals: number[] = []
    const halfWidth = trackWidth * 0.5

    for (let i = 0; i < segmentPoints.length; i++) {
      const point = segmentPoints[i]
      const nextIndex = (i + 1) % segmentPoints.length
      const nextPoint = segmentPoints[Math.min(nextIndex, segmentPoints.length - 1)]

      const direction = new THREE.Vector3().subVectors(nextPoint, point).normalize()
      const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize()

      const leftPoint = new THREE.Vector3().addVectors(point, perpendicular.clone().multiplyScalar(halfWidth))
      const rightPoint = new THREE.Vector3().addVectors(point, perpendicular.clone().multiplyScalar(-halfWidth))

      ribbonVertices.push(leftPoint.x, leftPoint.y, leftPoint.z)
      ribbonVertices.push(rightPoint.x, rightPoint.y, rightPoint.z)

      ribbonNormals.push(0, 1, 0)
      ribbonNormals.push(0, 1, 0)

      if (i < segmentPoints.length - 1) {
        const baseIndex = i * 2
        const nextBase = baseIndex + 2

        ribbonIndices.push(baseIndex, nextBase, baseIndex + 1)
        ribbonIndices.push(baseIndex + 1, nextBase, nextBase + 1)
      }
    }

    const ribbonGeom = new THREE.BufferGeometry()
    ribbonGeom.setAttribute("position", new THREE.Float32BufferAttribute(ribbonVertices, 3))
    ribbonGeom.setAttribute("normal", new THREE.Float32BufferAttribute(ribbonNormals, 3))
    ribbonGeom.setIndex(ribbonIndices)

    return {
      planeGeometry: planeGeom,
      trackRibbonGeometry: ribbonGeom,
      lineGeometry: new THREE.BufferGeometry().setFromPoints(segmentPoints),
      clickTubeGeometry: new THREE.TubeGeometry(path, numSegments, trackWidth * 0.5, 8, false),
      curvePath: path,
    }
  }, [route, trackWidth, gradientColor])

  const handleClick = (event: any) => {
    if (isClickable && onRouteClick) {
      event.stopPropagation()
      const point = event.point
      console.log("[v0] Route clicked at:", [point.x, point.y, point.z])
      onRouteClick([point.x, point.y, point.z])
    }
  }

  return (
    <>
      <mesh geometry={planeGeometry} receiveShadow>
        <meshBasicMaterial vertexColors transparent side={THREE.DoubleSide} />
      </mesh>

      {useRibbon ? (
        <mesh
          geometry={trackRibbonGeometry}
          onClick={handleClick}
          onPointerOver={(e) => isClickable && (e.stopPropagation(), (document.body.style.cursor = "pointer"))}
          onPointerOut={(e) => isClickable && (e.stopPropagation(), (document.body.style.cursor = "default"))}
        >
          <meshBasicMaterial color={lineColor} side={THREE.DoubleSide} />
        </mesh>
      ) : (
        <>
          <line geometry={lineGeometry}>
            <lineBasicMaterial color={lineColor} />
          </line>
          {isClickable && (
            <mesh
              geometry={clickTubeGeometry}
              onClick={handleClick}
              onPointerOver={(e) => (e.stopPropagation(), (document.body.style.cursor = "pointer"))}
              onPointerOut={(e) => (e.stopPropagation(), (document.body.style.cursor = "default"))}
            >
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
          )}
        </>
      )}

      {showControlPoints && (
        <>
          {route.controlPoints &&
            route.controlPoints.map((point, index) => (
              <mesh key={index} position={point}>
                <sphereGeometry args={[trackWidth * 0.4, 16, 16]} />
                <meshBasicMaterial color="#ffff00" />
              </mesh>
            ))}
          <mesh position={route.startPoint}>
            <sphereGeometry args={[trackWidth * 0.5, 16, 16]} />
            <meshBasicMaterial color="#00ff00" />
          </mesh>
          <mesh position={route.endPoint}>
            <sphereGeometry args={[trackWidth * 0.5, 16, 16]} />
            <meshBasicMaterial color="#ff0000" />
          </mesh>
        </>
      )}
    </>
  )
}

const TrackMesh = forwardRef<
  THREE.Mesh | THREE.Line,
  {
    trackData: TrackPoint[]
    gradientColor: string
    lineColor: string
    elevationMultiplier: number
    smoothingLevel: number
    groundOffset: number
    trackWidth: number
    useRibbon: boolean
  }
>(function TrackMesh(
  {
    trackData,
    gradientColor = "#ffffff",
    lineColor = "#06b6d4",
    elevationMultiplier = 10,
    smoothingLevel = 0,
    groundOffset = 10,
    trackWidth = 3,
    useRibbon = true,
  },
  ref,
) {
  const meshRef = useRef<THREE.Mesh>(null)
  const lineRef = useRef<THREE.Line>(null)

  useImperativeHandle(ref, () => (useRibbon ? meshRef.current! : lineRef.current!), [useRibbon])

  // Mobile performance optimization
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  const { planeGeometry, curve } = useMemo(() => {
    const validPoints = trackData.filter((p) => {
      return p.x !== undefined && p.y !== undefined && p.z !== undefined && !isNaN(p.x) && !isNaN(p.y) && !isNaN(p.z)
    })

    if (validPoints.length < 2) {
      console.error("[v0] Not enough valid points to create track")
      const fallbackCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0, 10)])
      const fallbackGeometry = new THREE.BufferGeometry()
      return { planeGeometry: fallbackGeometry, curve: fallbackCurve }
    }

    let processedPoints = validPoints
    if (smoothingLevel > 0) {
      processedPoints = smoothPoints(validPoints, smoothingLevel)
    }

    const minY = Math.min(...processedPoints.map((p) => p.y))
    const yOffset = minY * elevationMultiplier - groundOffset

    const points = processedPoints.map((p) => new THREE.Vector3(p.x, p.y * elevationMultiplier - yOffset, p.z))
    const trackCurve = new THREE.CatmullRomCurve3(points, true)

    // Reduce segments for mobile performance
    const numSegments = typeof window !== 'undefined' && window.innerWidth < 768 ? validPoints.length * 2 : validPoints.length * 4
    const groundLevel = 0

    const vertices: number[] = []
    const indices: number[] = []
    const normals: number[] = []
    const colors: number[] = []

    const curvePoints = trackCurve.getPoints(numSegments)

    const gradientRGB = new THREE.Color(gradientColor)

    for (let i = 0; i < curvePoints.length; i++) {
      const point = curvePoints[i]

      vertices.push(point.x, point.y, point.z)
      normals.push(0, 0, 1)
      colors.push(gradientRGB.r, gradientRGB.g, gradientRGB.b, 1)

      vertices.push(point.x, groundLevel, point.z)
      normals.push(0, 0, 1)
      colors.push(gradientRGB.r, gradientRGB.g, gradientRGB.b, 0)

      if (i < curvePoints.length - 1) {
        const baseIndex = i * 2
        const nextBase = baseIndex + 2

        indices.push(baseIndex, nextBase, baseIndex + 1)
        indices.push(baseIndex + 1, nextBase, nextBase + 1)
      }
    }

    const lastIndex = (curvePoints.length - 1) * 2
    indices.push(lastIndex, 0, lastIndex + 1)
    indices.push(lastIndex + 1, 0, 1)

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3))
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    return { planeGeometry: geometry, curve: trackCurve }
  }, [trackData, gradientColor, elevationMultiplier, smoothingLevel, groundOffset])

  const trackRibbonGeometry = useMemo(() => {
    // Reduce segments for mobile performance
    const numSegments = typeof window !== 'undefined' && window.innerWidth < 768 ? trackData.length * 2 : trackData.length * 4
    const curvePoints = curve.getPoints(numSegments)
    const halfWidth = trackWidth * 0.5

    const vertices: number[] = []
    const indices: number[] = []
    const normals: number[] = []

    for (let i = 0; i < curvePoints.length; i++) {
      const point = curvePoints[i]
      const nextIndex = (i + 1) % curvePoints.length
      const nextPoint = curvePoints[nextIndex]

      const direction = new THREE.Vector3().subVectors(nextPoint, point).normalize()
      const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize()

      const leftPoint = new THREE.Vector3().addVectors(point, perpendicular.clone().multiplyScalar(halfWidth))
      const rightPoint = new THREE.Vector3().addVectors(point, perpendicular.clone().multiplyScalar(-halfWidth))

      vertices.push(leftPoint.x, leftPoint.y, leftPoint.z)
      vertices.push(rightPoint.x, rightPoint.y, rightPoint.z)

      normals.push(0, 1, 0)
      normals.push(0, 1, 0)

      if (i < curvePoints.length - 1) {
        const baseIndex = i * 2
        const nextBase = baseIndex + 2

        indices.push(baseIndex, nextBase, baseIndex + 1)
        indices.push(baseIndex + 1, nextBase, nextBase + 1)
      }
    }

    const lastIndex = (curvePoints.length - 1) * 2
    indices.push(lastIndex, 0, lastIndex + 1)
    indices.push(lastIndex + 1, 0, 1)

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3))
    geometry.setIndex(indices)

    return geometry
  }, [curve, trackData.length, trackWidth])

  return (
    <>
      <mesh geometry={planeGeometry} receiveShadow>
        <meshBasicMaterial vertexColors transparent side={THREE.DoubleSide} />
      </mesh>

      {useRibbon ? (
        <mesh ref={meshRef} geometry={trackRibbonGeometry}>
          <meshBasicMaterial color={lineColor} side={THREE.DoubleSide} />
        </mesh>
      ) : (
        <line ref={lineRef} geometry={new THREE.BufferGeometry().setFromPoints(curve.getPoints(isMobile ? trackData.length * 2 : trackData.length * 4))}>
          <lineBasicMaterial color={lineColor} />
        </line>
      )}
    </>
  )
})

// Frosted glass HUD component for turn details (DOM overlay)
function TurnDetailsHUD({
  turnIndex,
  position,
  onClose
}: {
  turnIndex: number
  position?: [number, number, number]
  onClose: () => void
}) {
  const turnDetail = TURN_DETAILS[turnIndex]

  // If position is provided, render as 3D HTML element
  if (position) {
    return (
      <Html position={position} center distanceFactor={15}>
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-2xl min-w-[300px] max-w-[400px]">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-white">{turnDetail.name}</h2>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors text-xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-sm text-white/70 mb-1">Corner Type</div>
              <div className="text-white font-medium">{turnDetail.type}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-sm text-white/70 mb-1">Speed Range</div>
                <div className="text-white font-medium">{turnDetail.speed}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-sm text-white/70 mb-1">Recommended Gear</div>
                <div className="text-white font-medium">{turnDetail.gear}</div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-3">
              <div className="text-sm text-blue-300 mb-2 font-medium">Racing Notes</div>
              <div className="text-white/90 text-sm leading-relaxed">{turnDetail.notes}</div>
            </div>
          </div>
        </div>
      </Html>
    )
  }

  // Otherwise render as fixed DOM overlay
  return (
        <div className="fixed top-4 left-4 bg-black/80 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-2xl min-w-[300px] max-w-[400px] z-[999999999]">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-2xl font-bold text-white">{turnDetail.name}</h2>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white transition-colors text-xl"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-sm text-white/70 mb-1">Corner Type</div>
          <div className="text-white font-medium">{turnDetail.type}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-sm text-white/70 mb-1">Speed Range</div>
            <div className="text-white font-medium">{turnDetail.speed}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-sm text-white/70 mb-1">Recommended Gear</div>
            <div className="text-white font-medium">{turnDetail.gear}</div>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-3">
          <div className="text-sm text-blue-300 mb-2 font-medium">Racing Notes</div>
          <div className="text-white/90 text-sm leading-relaxed">{turnDetail.notes}</div>
        </div>
      </div>
    </div>
  )
}

function CameraController({ onReady }: { onReady?: (api: any) => void }) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const animationRef = useRef<{
    active: boolean
    startTime: number
    duration: number
    startCameraPos: THREE.Vector3
    targetCameraPos: THREE.Vector3
    startTarget: THREE.Vector3
    targetTarget: THREE.Vector3
  } | null>(null)

  useFrame(() => {
    if (!animationRef.current || !animationRef.current.active || !controlsRef.current) return

    const elapsed = Date.now() - animationRef.current.startTime
    const progress = Math.min(elapsed / animationRef.current.duration, 1)

    // Ease in-out function
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2

    // Interpolate camera position
    camera.position.lerpVectors(animationRef.current.startCameraPos, animationRef.current.targetCameraPos, eased)

    // Interpolate controls target
    controlsRef.current.target.lerpVectors(animationRef.current.startTarget, animationRef.current.targetTarget, eased)
    controlsRef.current.update()

    if (progress >= 1) {
      animationRef.current.active = false
    }
  })

  // Expose animation API through onReady callback
  onReady?.({
    animateToPosition: (targetPosition: [number, number, number], distance = 50, enableRotation = false) => {
      console.log("[v0] animateToPosition called with:", targetPosition, distance, enableRotation)

      if (!camera || !camera.position) {
        console.error("[v0] Camera not available")
        return
      }

      if (!controlsRef.current || !controlsRef.current.target) {
        console.error("[v0] Controls not available")
        return
      }

      console.log("[v0] Starting animation")

      const currentTarget = controlsRef.current.target.clone()
      const newTarget = new THREE.Vector3(...targetPosition)

      // Calculate camera position at a nice viewing angle
      const offset = new THREE.Vector3(distance * 0.7, distance * 0.5, distance * 0.7)
      const newCameraPosition = new THREE.Vector3().addVectors(newTarget, offset)

      // If rotation is enabled, add orbital movement
      let targetCameraPos = newCameraPosition
      if (enableRotation) {
        // Create a more cinematic camera movement with rotation
        const radius = distance
        const height = distance * 0.6
        const angle = Math.PI * 0.3 // 108 degrees for a nice side view

        targetCameraPos = new THREE.Vector3(
          newTarget.x + Math.cos(angle) * radius,
          newTarget.y + height,
          newTarget.z + Math.sin(angle) * radius
        )
      }

      animationRef.current = {
        active: true,
        startTime: Date.now(),
        duration: enableRotation ? 2000 : 1000, // Longer duration for rotation
        startCameraPos: camera.position.clone(),
        targetCameraPos: targetCameraPos,
        startTarget: currentTarget,
        targetTarget: newTarget,
      }
    },
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={30}
      maxDistance={500}
      maxPolarAngle={Math.PI / 2.1}
    />
  )
}

const RaceTrack3D = forwardRef<RaceTrack3DHandle, RaceTrack3DProps>(function RaceTrack3D(
  {
    trackData,
    gradientColor = "#ffffff",
    lineColor = "#06b6d4",
    backgroundColor = "#000000",
    elevationMultiplier = 10,
    smoothingLevel = 0,
    groundOffset = 10,
    trackWidth = 3,
    useRibbon = true,
    showCallouts = false,
    callouts = [],
    calloutSize = 20,
    calloutDistance = 10,
    startFinishPosition,
    alternateRoutes = [],
    selectedTurn,
    onSelectTurn,
    hudPosition,
    onSetHudPosition,
    showTrackInfo,
    onToggleTrackInfo,
    onTurnClick,
    turnCallouts = [],
    selectedTurnIndex,
    onSceneClick,
    isClickToPlaceMode = false,
    showControlPoints = false,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationApiRef = useRef<any>(null)

  useImperativeHandle(ref, () => ({
    exportPNG: () => {
      const canvas = document.querySelector("canvas")
      if (canvas) {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = `track-3d-${Date.now()}.png`
            link.click()
            URL.revokeObjectURL(url)
          }
        }, "image/png")
      }
    },
    zoomToPosition: (position: [number, number, number]) => {
      console.log("[v0] zoomToPosition called from ref")
      if (animationApiRef.current && animationApiRef.current.animateToPosition) {
        console.log("[v0] Calling animateToPosition")
        animationApiRef.current.animateToPosition(position, trackBounds.size * 0.3)
      } else {
        console.error("[v0] Animation API not ready")
      }
    },
  }))

  const trackBounds = useMemo(() => {
    if (trackData.length === 0) return { center: [0, 0, 0], size: 100 }

    let minX = Number.POSITIVE_INFINITY,
      maxX = Number.NEGATIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY,
      maxY = Number.NEGATIVE_INFINITY
    let minZ = Number.POSITIVE_INFINITY,
      maxZ = Number.NEGATIVE_INFINITY

    trackData.forEach((p) => {
      if (p.x !== undefined && !isNaN(p.x)) {
        minX = Math.min(minX, p.x)
        maxX = Math.max(maxX, p.x)
      }
      if (p.y !== undefined && !isNaN(p.y)) {
        minY = Math.min(minY, p.y)
        maxY = Math.max(maxY, p.y)
      }
      if (p.z !== undefined && !isNaN(p.z)) {
        minZ = Math.min(minZ, p.z)
        maxZ = Math.max(maxZ, p.z)
      }
    })

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const centerZ = (minZ + maxZ) / 2
    const size = Math.max(maxX - minX, maxZ - minZ)

    return { center: [centerX, centerY, centerZ], size }
  }, [trackData])

  const cameraPosition: [number, number, number] = [
    trackBounds.center[0] + trackBounds.size * 0.8,
    trackBounds.size * 0.6,
    trackBounds.center[2] + trackBounds.size * 0.8,
  ]

  const handleCalloutClick = (position: [number, number, number]) => {
    console.log("[v0] Callout clicked:", position)

    // Animate camera to the clicked position (for all callouts)
    if (animationApiRef.current && animationApiRef.current.animateToPosition) {
      console.log("[v0] Calling animateToPosition")

      // Check if this is a turn callout (not start/finish)
      const isTurn = turnCallouts.some(
        (callout) =>
          Math.abs(callout.position[0] - position[0]) < 5 &&
          Math.abs(callout.position[1] - position[1]) < 5 &&
          Math.abs(callout.position[2] - position[2]) < 5
      )

      // Enable rotation for turn callouts, but not for start/finish
      animationApiRef.current.animateToPosition(position, trackBounds.size * 0.3, isTurn)
    } else {
      console.error("[v0] Animation API not available")
    }

    // Check if this is the start/finish line
    const isStartFinish = Math.abs(startFinishPosition[0] - position[0]) < 5 &&
                         Math.abs(startFinishPosition[1] - position[1]) < 5 &&
                         Math.abs(startFinishPosition[2] - position[2]) < 5

    if (isStartFinish) {
      console.log("[v0] Start/finish line clicked, showing track info")
      onToggleTrackInfo?.(true)
      onSelectTurn?.(null) // Hide turn details if showing
      onSetHudPosition?.(null)
    } else {
      // Check if this is a turn callout and show HUD
      const turnIndex = turnCallouts.findIndex(
        (callout) =>
          Math.abs(callout.position[0] - position[0]) < 5 &&
          Math.abs(callout.position[1] - position[1]) < 5 &&
          Math.abs(callout.position[2] - position[2]) < 5
      )

      if (turnIndex >= 0) {
        console.log("[v0] Turn callout clicked, calling turn handler")
        onSelectTurn?.(turnIndex)
        onSetHudPosition?.(position)
        onToggleTrackInfo?.(false) // Hide track info if showing turn details
      }
    }
  }

  return (
    <div className="w-full h-full relative" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <Suspense fallback={<div className="w-full h-full bg-black flex items-center justify-center text-white">Loading 3D Scene...</div>}>
        <Canvas
          camera={{ position: cameraPosition, fov: 50 }}
          gl={{
            antialias: false,
            preserveDrawingBuffer: true,
            powerPreference: "high-performance",
            stencil: false,
            depth: true
          }}
          shadows={false}
          style={{ cursor: isClickToPlaceMode ? "crosshair" : "default" }}
          dpr={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 1.5) : 1}
        >
        <color attach="background" args={[backgroundColor]} />

        <ambientLight intensity={0.6} />
        <directionalLight position={[100, 100, 50]} intensity={1.0} />
        <directionalLight position={[-50, 50, -50]} intensity={0.4} />
        <hemisphereLight args={["#ffffff", "#b0b0b0", 0.6]} />


        <CameraController
          onReady={(api) => {
            console.log("[v0] CameraController ready")
            animationApiRef.current = api
          }}
        />

        <TrackMesh
          trackData={trackData}
          gradientColor={gradientColor}
          lineColor={lineColor}
          elevationMultiplier={elevationMultiplier}
          smoothingLevel={smoothingLevel}
          groundOffset={groundOffset}
          trackWidth={trackWidth}
          useRibbon={useRibbon}
        />

        {alternateRoutes.map((route) => (
          <AlternateRouteTrack
            key={route.id}
            route={route}
            trackWidth={trackWidth}
            lineColor={lineColor}
            gradientColor={gradientColor}
            useRibbon={useRibbon}
            onRouteClick={onSceneClick}
            isClickable={isClickToPlaceMode}
            showControlPoints={showControlPoints}
          />
        ))}

        {showCallouts && callouts.length > 0 && (
          <Callouts
            callouts={callouts}
            calloutSize={calloutSize}
            calloutDistance={calloutDistance}
            onCalloutClick={handleCalloutClick}
            selectedTurnIndex={selectedTurn}
          />
        )}

        </Canvas>
      </Suspense>

      {selectedTurn !== null && (
        <TurnDetailsHUD
          turnIndex={selectedTurn}
          position={null}
          onClose={() => {
            onSelectTurn?.(null)
            onSetHudPosition?.(null)
          }}
        />
      )}

      {showTrackInfo && (
        <div className="fixed top-4 right-4 bg-black/80 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-2xl min-w-[300px] max-w-[400px] z-[999999999]">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-white">Track Information</h2>
            <button
              onClick={() => onToggleTrackInfo?.(false)}
              className="text-white/70 hover:text-white transition-colors text-xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-sm text-white/70 mb-1">Track Overview</div>
              <div className="text-white font-medium">Complete race track with 18 corners</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-sm text-white/70 mb-1">Total Length</div>
                <div className="text-white font-medium">{Math.round(trackData.length * 0.05)}m</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-sm text-white/70 mb-1">Elevation</div>
                <div className="text-white font-medium">{Math.round((Math.max(...trackData.map(p => p.y)) - Math.min(...trackData.map(p => p.y))) * 10) / 10}m</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-sm text-white/70 mb-1">Corners</div>
                <div className="text-white font-medium">18</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-sm text-white/70 mb-1">Track Width</div>
                <div className="text-white font-medium">{Math.round(trackWidth * 100)}cm</div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-3">
              <div className="text-sm text-blue-300 mb-2 font-medium">Track Features</div>
              <div className="text-white/90 text-sm leading-relaxed">
                High-speed straights connected by technical corners requiring precise racing lines and gear management.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default RaceTrack3D
export type { RaceTrack3DHandle, TrackSceneProps }
