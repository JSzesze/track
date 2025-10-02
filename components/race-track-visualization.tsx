"use client"
import { useRef } from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, ChevronLeft, ChevronRight, Menu, Download } from "lucide-react"
import type { RaceTrack3DHandle } from "@/components/race-track-3d"
import type * as THREE from "three"
import trackPointsRaw from "@/data/track-points"
import RaceTrack3D from "@/components/race-track-3d"

export interface TrackPoint {
  x: number
  y: number
  z: number
  distance?: number
  sector?: number
}

export interface AlternateRoute {
  id: string
  name: string
  startPoint: [number, number, number]
  endPoint: [number, number, number]
  controlPoints?: Array<[number, number, number]>
  segments?: Array<"straight" | "curve">
}

export const START_FINISH_POSITION: [number, number, number] = [57.18308639526367, 5.896078109741211, 103.21224975585938]

const ALTERNATE_ROUTES: AlternateRoute[] = [
  {
    id: "chicane-bypass-1",
    name: "Chicane Bypass 1",
    startPoint: [82.92379760742188, 3.5464000701904297, 89.04920196533203],
    endPoint: [119.6622314453125, 5.533458232879639, 51.2724723815918],
  },
  {
    id: "bypass-2",
    name: "Bypass 2",
    startPoint: [25.89914894104004, 4.653048515319824, 51.47089767456055],
    endPoint: [-3.2729299068450928, 7.436878204345703, 6.140280246734619],
    controlPoints: [[20.71, 6.24, 26.91]],
  },
  {
    id: "bypass-3",
    name: "Bypass 3",
    startPoint: [-92.90492607156808, 8.56801287340983, -25.419719834933602],
    endPoint: [-92.87239837646484, 8.51159954071045, 26.01],
    controlPoints: [
      [-77.8, 8.5, 7.1], // End of diagonal straight section
      [-77.8, 8.5, 18.5], // End of vertical straight section (same X as previous)
      [-80.5, 8.5, 23.0], // First curve control point
      [-85.0, 8.5, 25.0], // Second curve control point
      [-90.0, 8.5, 26.0], // Third curve control point (approaching end)
    ],
    segments: ["straight", "straight", "curve", "curve", "curve", "curve"],
  },
  {
    id: "bypass-4",
    name: "Bypass 4",
    startPoint: [-46.350154876708984, 8.94191837310791, 102.31945037841797],
    endPoint: [-92.53350067138672, 8.6860933303833, 45.53825759887695],
    controlPoints: [
      [-86.39, 8.86, 97.12], // Y interpolated: 8.94 - (8.94 - 8.69) * 1/3
      [-91.63, 8.77, 65.69996274180852], // Y interpolated: 8.94 - (8.94 - 8.69) * 2/3
    ],
  },
]

const TURN_CALLOUTS = [
  { position: [178.0207977294922, 8.954895734786987, 94.28092956542969] as [number, number, number], label: "T1" },
  { position: [180.0103302001953, 8.674322605133057, 11.850353240966797] as [number, number, number], label: "T2" },
  { position: [117.51516723632812, 11.130828857421875, 60.75695037841797] as [number, number, number], label: "T3" },
  { position: [163.26605224609375, 8.613812685012817, 43.413082122802734] as [number, number, number], label: "T4" },
  { position: [123.90059661865234, 9.104000091552734, 86.26699829101562] as [number, number, number], label: "T5" },
  { position: [32.524986267089844, 8.46538519859314, 81.4964370727539] as [number, number, number], label: "T6" },
  { position: [26.847400665283203, 9.560400009155273, 52.37919998168945] as [number, number, number], label: "T7" },
  { position: [-8.776745796203613, 12.088362693786621, 38.8324089050293] as [number, number, number], label: "T8" },
  { position: [-2.608907461166382, 12.130964756011963, 19.58861541748047] as [number, number, number], label: "T9" },
  { position: [-14.03291130065918, 12.442146301269531, -3.543109655380249] as [number, number, number], label: "T10" },
  { position: [-37.10651397705078, 14.077892303466797, 81.46376037597656] as [number, number, number], label: "T11" },
  { position: [-48.01011276245117, 12.387964725494385, -21.545366287231445] as [number, number, number], label: "T12" },
  { position: [-59.513790130615234, 13.232219696044922, -46.048828125] as [number, number, number], label: "T13" },
  { position: [-52.066287994384766, 13.795202255249023, -74.36454772949219] as [number, number, number], label: "T14" },
  { position: [-80.21865853972386, 13.582037244217593, -81.83136385524084] as [number, number, number], label: "T15" },
  { position: [-89.78832244873047, 13.730594635009766, 55.48883819580078] as [number, number, number], label: "T16" },
  { position: [-74.608, 13.9, 66.844] as [number, number, number], label: "T17" },
  { position: [-66.46492767333984, 14.277263641357422, 97.03485107421875] as [number, number, number], label: "T18" },
]

export default function RaceTrackVisualization() {
  const [trackData, setTrackData] = useState<TrackPoint[] | null>(null)
  const [gradientColor, setGradientColor] = useState<string>("#991b1b")
  const [lineColor, setLineColor] = useState<string>("#ef4444")
  const [backgroundColor, setBackgroundColor] = useState<string>("#000000")
  const [elevationMultiplier, setElevationMultiplier] = useState<number>(2)
  const [smoothingLevel, setSmoothingLevel] = useState<number>(2)
  const [groundOffset, setGroundOffset] = useState<number>(3)
  const [trackWidth, setTrackWidth] = useState<number>(3)
  const [useRibbon, setUseRibbon] = useState<boolean>(false)
  const [showCallouts, setShowCallouts] = useState<boolean>(true)
  const [calloutSize, setCalloutSize] = useState<number>(20)
  const [calloutDistance, setCalloutDistance] = useState<number>(30)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false)
  const [alternateRoutes, setAlternateRoutes] = useState<AlternateRoute[]>(ALTERNATE_ROUTES)
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [newPointX, setNewPointX] = useState<string>("0")
  const [newPointY, setNewPointY] = useState<string>("0")
  const [newPointZ, setNewPointZ] = useState<string>("0")
  const [isClickToPlaceMode, setIsClickToPlaceMode] = useState<boolean>(false)
  const [showControlPoints, setShowControlPoints] = useState<boolean>(false)
  const [visibleRoutes, setVisibleRoutes] = useState<Set<string>>(new Set(ALTERNATE_ROUTES.map((route) => route.id)))

  const track3DRef = useRef<RaceTrack3DHandle>(null)

  useEffect(() => {
    loadPreprocessedTrack()
  }, [])

  const loadPreprocessedTrack = () => {
    const points: TrackPoint[] = trackPointsRaw.map((vec: THREE.Vector3, index: number) => ({
      x: vec.x,
      y: vec.y,
      z: vec.z,
      distance: index * 10,
      sector: Math.floor((index / trackPointsRaw.length) * 3) + 1,
    }))

    setTrackData(points)
  }

  const handleExportPNG = () => {
    if (track3DRef.current) {
      track3DRef.current.exportPNG()
    }
  }

  const addControlPoint = (routeId: string) => {
    setAlternateRoutes((routes) =>
      routes.map((route) => {
        if (route.id === routeId) {
          const controlPoints = route.controlPoints || []
          const newPoint: [number, number, number] = [
            Number.parseFloat(newPointX) || 0,
            Number.parseFloat(newPointY) || 0,
            Number.parseFloat(newPointZ) || 0,
          ]
          return { ...route, controlPoints: [...controlPoints, newPoint] }
        }
        return route
      }),
    )
  }

  const handleSceneClick = (position: [number, number, number]) => {
    if (isClickToPlaceMode && selectedRouteId) {
      setAlternateRoutes((routes) =>
        routes.map((route) => {
          if (route.id === selectedRouteId) {
            const controlPoints = route.controlPoints || []
            return { ...route, controlPoints: [...controlPoints, position] }
          }
          return route
        }),
      )
      // Optionally disable click-to-place mode after adding a point
      // setIsClickToPlaceMode(false)
    }
  }

  const updateControlPoint = (routeId: string, pointIndex: number, coordinate: 0 | 1 | 2, value: number) => {
    setAlternateRoutes((routes) =>
      routes.map((route) => {
        if (route.id === routeId && route.controlPoints) {
          const newControlPoints = [...route.controlPoints]
          const point = [...newControlPoints[pointIndex]] as [number, number, number]
          point[coordinate] = value
          newControlPoints[pointIndex] = point
          return { ...route, controlPoints: newControlPoints }
        }
        return route
      }),
    )
  }

  const deleteControlPoint = (routeId: string, pointIndex: number) => {
    setAlternateRoutes((routes) =>
      routes.map((route) => {
        if (route.id === routeId && route.controlPoints) {
          const newControlPoints = route.controlPoints.filter((_, i) => i !== pointIndex)
          return { ...route, controlPoints: newControlPoints.length > 0 ? newControlPoints : undefined }
        }
        return route
      }),
    )
  }


  const toggleRouteVisibility = (routeId: string) => {
    setVisibleRoutes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(routeId)) {
        newSet.delete(routeId)
      } else {
        newSet.add(routeId)
      }
      return newSet
    })
  }

  const visibleAlternateRoutes = alternateRoutes.filter((route) => visibleRoutes.has(route.id))

  return (
    <div className="w-full h-screen flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div
          className={`
            fixed inset-0 z-50
            w-80
            bg-black/70 backdrop-blur-xl
            border-r border-white/10
            overflow-y-auto
            transition-transform duration-300 ease-in-out
            ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
            ${isSidebarCollapsed ? "lg:-translate-x-full" : "lg:translate-x-0"}
          `}
        >
          <div className="hidden lg:flex justify-end p-2 border-b border-white/10">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => setIsSidebarCollapsed(true)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>

          <div className="lg:hidden flex justify-end p-4">
            <Button variant="ghost" size="icon" className="text-white" onClick={() => setIsMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-4 space-y-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-lg text-white">Appearance</CardTitle>
                <CardDescription className="text-sm text-white/70">Customize track colors and settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="background-color" className="text-sm font-medium text-white">
                    Background Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="background-color"
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-12 h-10 rounded border border-white/20 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm rounded border border-white/20 bg-white/10 text-white placeholder:text-white/50"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="gradient-color" className="text-sm font-medium text-white">
                    Gradient Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="gradient-color"
                      type="color"
                      value={gradientColor}
                      onChange={(e) => setGradientColor(e.target.value)}
                      className="w-12 h-10 rounded border border-white/20 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={gradientColor}
                      onChange={(e) => setGradientColor(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm rounded border border-white/20 bg-white/10 text-white placeholder:text-white/50"
                      placeholder="#991b1b"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="line-color" className="text-sm font-medium text-white">
                    Track Line Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="line-color"
                      type="color"
                      value={lineColor}
                      onChange={(e) => setLineColor(e.target.value)}
                      className="w-12 h-10 rounded border border-white/20 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={lineColor}
                      onChange={(e) => setLineColor(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm rounded border border-white/20 bg-white/10 text-white placeholder:text-white/50"
                      placeholder="#ef4444"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="elevation-multiplier" className="text-sm font-medium text-white">
                    Elevation Scale: {elevationMultiplier}x
                  </label>
                  <input
                    id="elevation-multiplier"
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={elevationMultiplier}
                    onChange={(e) => setElevationMultiplier(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-white/60">
                    <span>1x</span>
                    <span>50x</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="smoothing-level" className="text-sm font-medium text-white">
                    Point Smoothing: {smoothingLevel === 0 ? "Off" : smoothingLevel}
                  </label>
                  <input
                    id="smoothing-level"
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={smoothingLevel}
                    onChange={(e) => setSmoothingLevel(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-white/60">
                    <span>Off</span>
                    <span>Max</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="ground-offset" className="text-sm font-medium text-white">
                    Ground Offset: {groundOffset}
                  </label>
                  <input
                    id="ground-offset"
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={groundOffset}
                    onChange={(e) => setGroundOffset(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-white/60">
                    <span>0</span>
                    <span>50</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="track-width" className="text-sm font-medium text-white">
                    Track Width: {trackWidth}
                  </label>
                  <input
                    id="track-width"
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={trackWidth}
                    onChange={(e) => setTrackWidth(Number(e.target.value))}
                    className="w-full"
                    disabled={!useRibbon}
                  />
                  <div className="flex justify-between text-xs text-white/60">
                    <span>1</span>
                    <span>10</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <label htmlFor="use-ribbon" className="text-sm font-medium text-white">
                      Track Surface Type
                    </label>
                    <button
                      id="use-ribbon"
                      onClick={() => setUseRibbon(!useRibbon)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        useRibbon ? "bg-primary" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          useRibbon ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-white/60">{useRibbon ? "Flat ribbon surface" : "Simple line geometry"}</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <label htmlFor="show-callouts" className="text-sm font-medium text-white">
                      Show Turn Numbers
                    </label>
                    <button
                      id="show-callouts"
                      onClick={() => setShowCallouts(!showCallouts)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        showCallouts ? "bg-primary" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          showCallouts ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-white/60">Display turn markers (T1-T18)</p>
                </div>

                {showCallouts && (
                  <>
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <label htmlFor="callout-size" className="text-sm font-medium text-white">
                        Callout Size: {calloutSize}
                      </label>
                      <input
                        id="callout-size"
                        type="range"
                        min="10"
                        max="40"
                        step="1"
                        value={calloutSize}
                        onChange={(e) => setCalloutSize(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-white/60">
                        <span>10</span>
                        <span>40</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="callout-distance" className="text-sm font-medium text-white">
                        Distance Scale: {calloutDistance}
                      </label>
                      <input
                        id="callout-distance"
                        type="range"
                        min="1"
                        max="30"
                        step="1"
                        value={calloutDistance}
                        onChange={(e) => setCalloutDistance(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-white/60">
                        <span>Close</span>
                        <span>Far</span>
                      </div>
                      <p className="text-xs text-white/50">Lower values make callouts larger</p>
                    </div>
                  </>
                )}

                <div className="pt-2 space-y-2">
                  <p className="text-xs text-white/60">Quick presets:</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setGradientColor("#991b1b")
                        setLineColor("#ef4444")
                        setBackgroundColor("#000000")
                      }}
                      className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      Red
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setGradientColor("#ffffff")
                        setLineColor("#84cc16")
                        setBackgroundColor("#000000")
                      }}
                      className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      Lime
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setGradientColor("#ffffff")
                        setLineColor("#ec4899")
                        setBackgroundColor("#000000")
                      }}
                      className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      Pink
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-lg text-white">Alternate Routes</CardTitle>
                <CardDescription className="text-sm text-white/70">Manage bypass routes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <label htmlFor="show-control-points" className="text-sm font-medium text-white">
                      Show Control Points
                    </label>
                    <button
                      id="show-control-points"
                      onClick={() => setShowControlPoints(!showControlPoints)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        showControlPoints ? "bg-primary" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          showControlPoints ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-white/60">Display start, end, and control point markers</p>
                </div>

                {alternateRoutes.map((route) => (
                  <div key={route.id} className="space-y-2 p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => toggleRouteVisibility(route.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                          visibleRoutes.has(route.id) ? "bg-primary" : "bg-white/20"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            visibleRoutes.has(route.id) ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => setSelectedRouteId(selectedRouteId === route.id ? null : route.id)}
                        className="text-sm font-medium text-white hover:text-white/80 flex-1 text-left"
                      >
                        {route.name}
                      </button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => logRouteCoordinates(route.id)}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs"
                      >
                        Log
                      </Button>
                    </div>

                    {selectedRouteId === route.id && (
                      <div className="space-y-3 pt-2 border-t border-white/10">
                        <div className="space-y-2 p-2 rounded bg-white/5 border border-white/10">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-white">Click to Place</span>
                            <button
                              onClick={() => setIsClickToPlaceMode(!isClickToPlaceMode)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                isClickToPlaceMode ? "bg-primary" : "bg-white/20"
                              }`}
                            >
                              <span
                                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                  isClickToPlaceMode ? "translate-x-5" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>
                          <p className="text-xs text-white/50">
                            {isClickToPlaceMode ? "Click on the 3D scene to add points" : "Manual coordinate entry"}
                          </p>
                        </div>

                        <div className="space-y-2 p-2 rounded bg-white/5 border border-white/10">
                          <span className="text-xs font-medium text-white">New Point Position</span>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-xs text-white/60">X</label>
                              <input
                                type="number"
                                value={newPointX}
                                onChange={(e) => setNewPointX(e.target.value)}
                                className="w-full px-2 py-1 text-xs rounded border border-white/20 bg-white/10 text-white"
                                step="0.1"
                                placeholder="0"
                                disabled={isClickToPlaceMode}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-white/60">Y</label>
                              <input
                                type="number"
                                value={newPointY}
                                onChange={(e) => setNewPointY(e.target.value)}
                                className="w-full px-2 py-1 text-xs rounded border border-white/20 bg-white/10 text-white"
                                step="0.1"
                                placeholder="0"
                                disabled={isClickToPlaceMode}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-white/60">Z</label>
                              <input
                                type="number"
                                value={newPointZ}
                                onChange={(e) => setNewPointZ(e.target.value)}
                                className="w-full px-2 py-1 text-xs rounded border border-white/20 bg-white/10 text-white"
                                step="0.1"
                                placeholder="0"
                                disabled={isClickToPlaceMode}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/70">
                            Control Points: {route.controlPoints?.length || 0}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addControlPoint(route.id)}
                            className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs"
                            disabled={isClickToPlaceMode}
                          >
                            Add Point
                          </Button>
                        </div>

                        {route.controlPoints?.map((point, index) => (
                          <div key={index} className="space-y-2 p-2 rounded bg-white/5 border border-white/10">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-white">Point {index + 1}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteControlPoint(route.id, index)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-6 px-2 text-xs"
                              >
                                Delete
                              </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-xs text-white/60">X</label>
                                <input
                                  type="number"
                                  value={point[0].toFixed(2)}
                                  onChange={(e) =>
                                    updateControlPoint(route.id, index, 0, Number.parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full px-2 py-1 text-xs rounded border border-white/20 bg-white/10 text-white"
                                  step="0.1"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-white/60">Y</label>
                                <input
                                  type="number"
                                  value={point[1].toFixed(2)}
                                  onChange={(e) =>
                                    updateControlPoint(route.id, index, 1, Number.parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full px-2 py-1 text-xs rounded border border-white/20 bg-white/10 text-white"
                                  step="0.1"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-white/60">Z</label>
                                <input
                                  type="number"
                                  value={point[2].toFixed(2)}
                                  onChange={(e) =>
                                    updateControlPoint(route.id, index, 2, Number.parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full px-2 py-1 text-xs rounded border border-white/20 bg-white/10 text-white"
                                  step="0.1"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
        )}

        <div
          className={`flex-1 relative min-h-0 transition-all duration-300 ${isSidebarCollapsed ? "lg:ml-0" : "lg:ml-80"}`}
        >
          {isSidebarCollapsed && (
            <Button
              variant="outline"
              size="icon"
              className="hidden lg:flex absolute top-4 left-4 z-20 bg-black/70 backdrop-blur-xl border-white/20 text-white shadow-lg hover:bg-white/10"
              onClick={() => setIsSidebarCollapsed(false)}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            className="lg:hidden absolute top-4 left-4 z-10 bg-black/70 backdrop-blur-xl border-white/20 text-white shadow-lg"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Button
            onClick={handleExportPNG}
            className="absolute top-4 right-4 z-10 shadow-lg"
            size="icon"
            disabled={!trackData}
            title="Download as PNG"
          >
            <Download className="h-4 w-4" />
          </Button>

          {trackData && (
            <RaceTrack3D
              ref={track3DRef}
              trackData={trackData}
              gradientColor={gradientColor}
              lineColor={lineColor}
              backgroundColor={backgroundColor}
              elevationMultiplier={elevationMultiplier}
              smoothingLevel={smoothingLevel}
              groundOffset={groundOffset}
              trackWidth={trackWidth}
              useRibbon={useRibbon}
              showCallouts={showCallouts}
              callouts={TURN_CALLOUTS}
              calloutSize={calloutSize}
              calloutDistance={calloutDistance}
              startFinishPosition={START_FINISH_POSITION}
              alternateRoutes={visibleAlternateRoutes}
              onSceneClick={handleSceneClick}
              isClickToPlaceMode={isClickToPlaceMode}
              showControlPoints={showControlPoints}
            />
          )}
        </div>
      </div>
    </div>
  )
}
