"use client"

import { useState } from "react"
import trackPointsRaw from "@/data/track-points"

// Import the new TrackScene component
import { TrackScene } from "@/components/race-track-3d"

// Turn details data
const TURN_DETAILS = {
  1: {
    name: "Turn 1",
    type: "Medium-Speed Right",
    difficulty: "★★☆☆☆",
    tip: "Brake early and carry speed through the apex. Watch for understeer on exit.",
    idealLine: "Late apex for better exit speed onto the straight."
  },
  2: {
    name: "Turn 2",
    type: "Slow-Speed Left",
    difficulty: "★★★☆☆",
    tip: "Patience is key - don't rush the entry. Smooth throttle application on exit.",
    idealLine: "Clip the inside curb and use all available track width."
  },
  3: {
    name: "Turn 3",
    type: "High-Speed Right",
    difficulty: "★★★★☆",
    tip: "Trust the grip and maintain throttle. Small steering corrections only.",
    idealLine: "Wide entry, late apex to maximize speed through the corner."
  },
  4: {
    name: "Turn 4",
    type: "Medium-Speed Left",
    difficulty: "★★☆☆☆",
    tip: "Good opportunity for passing. Focus on exit speed for the following straight.",
    idealLine: "Early apex to set up for the next sequence."
  },
  5: {
    name: "Turn 5",
    type: "Technical Chicane",
    difficulty: "★★★★★",
    tip: "Break the corner into two parts. Be precise with braking points.",
    idealLine: "Sacrifice entry speed for better exit through the second part."
  },
  6: {
    name: "Turn 6",
    type: "Fast Right-Hander",
    difficulty: "★★★☆☆",
    tip: "High commitment corner. Use the banking to your advantage.",
    idealLine: "Use all the track on entry, clip the apex, full throttle on exit."
  },
  7: {
    name: "Turn 7",
    type: "Medium Left",
    difficulty: "★★☆☆☆",
    tip: "Deceptive corner - looks faster than it is. Respect the entry speed.",
    idealLine: "Traditional apex - enter wide, exit wide."
  },
  8: {
    name: "Turn 8",
    type: "Slow Hairpin",
    difficulty: "★★★★☆",
    tip: "Maximum attack on entry, patient on exit. Great passing opportunity.",
    idealLine: "Trail brake deep, rotate the car, power out early."
  },
  9: {
    name: "Turn 9",
    type: "Medium Right",
    difficulty: "★★☆☆☆",
    tip: "Blind apex - commit to your line. Good runoff available.",
    idealLine: "Standard racing line - wide entry, late apex."
  },
  10: {
    name: "Turn 10",
    type: "Fast Left-Hander",
    difficulty: "★★★☆☆",
    tip: "Use the elevation change. Maintain momentum through the corner.",
    idealLine: "Late apex to straighten the following straight."
  },
  11: {
    name: "Turn 11",
    type: "Technical Right",
    difficulty: "★★★★☆",
    tip: "Multi-apex corner requiring precision. Don't get greedy on entry.",
    idealLine: "Three distinct phases - brake, turn-in, accelerate."
  },
  12: {
    name: "Turn 12",
    type: "Slow Left",
    difficulty: "★★★☆☆",
    tip: "Classic setup for the next sequence. Smooth inputs are crucial.",
    idealLine: "Clip the apex curb and use all exit width."
  },
  13: {
    name: "Turn 13",
    type: "Medium-Speed Right",
    difficulty: "★★☆☆☆",
    tip: "Elevation changes affect grip. Be smooth with steering input.",
    idealLine: "Traditional approach - wide in, apex, wide out."
  },
  14: {
    name: "Turn 14",
    type: "Fast Chicane Entry",
    difficulty: "★★★★☆",
    tip: "Critical for lap time. Get this right and the lap is made.",
    idealLine: "Compromise line - balance entry and exit speed."
  },
  15: {
    name: "Turn 15",
    type: "High-Speed Left",
    difficulty: "★★★☆☆",
    tip: "Use all available track. High commitment required.",
    idealLine: "Late apex for maximum exit speed."
  },
  16: {
    name: "Turn 16",
    type: "Medium Right",
    difficulty: "★★☆☆☆",
    tip: "Setup corner for the final sequence. Clean execution pays dividends.",
    idealLine: "Standard racing line with good exit for final straight."
  },
  17: {
    name: "Turn 17",
    type: "Slow Right",
    difficulty: "★★★☆☆",
    tip: "Technical corner with banking. Use the elevation wisely.",
    idealLine: "Late apex to maximize speed onto the straight."
  },
  18: {
    name: "Turn 18",
    type: "Final Corner",
    difficulty: "★★★★☆",
    tip: "All about exit speed for the main straight. Don't leave anything on the table.",
    idealLine: "Slightly late apex for best drive onto the straight."
  }
}

export default function Home() {
  const [selectedTurn, setSelectedTurn] = useState<number | null>(null)
  const [showTurnDetails, setShowTurnDetails] = useState(false)

  const handleTrackClick = (position: [number, number, number]) => {
    console.log("Track clicked at position:", position)
    // Hide turn details if clicking elsewhere
    setShowTurnDetails(false)
    setSelectedTurn(null)
  }

  const closeTurnDetails = () => {
    setShowTurnDetails(false)
    setSelectedTurn(null)
  }

  return (
    <main className="min-h-screen bg-slate-900 relative">
      <TrackScene
        trackData={trackPointsRaw.map((vec: any) => ({
          x: vec.x,
          y: vec.y,
          z: vec.z,
          distance: 0,
          sector: 1,
        }))}
        theme="default"
        showTurnNumbers={true}
        interactive={true}
        onTrackClick={handleTrackClick}
        className="w-full h-screen"
      />

      {/* Turn Details Overlay */}
      {showTurnDetails && selectedTurn && TURN_DETAILS[selectedTurn] && (
        <div className="absolute top-4 right-4 w-80 bg-black/90 backdrop-blur-xl border border-white/20 rounded-lg p-6 text-white shadow-2xl z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-cyan-400">
              {TURN_DETAILS[selectedTurn].name}
            </h3>
            <button
              onClick={closeTurnDetails}
              className="text-white/60 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Type:</span>
              <span className="text-sm font-medium">{TURN_DETAILS[selectedTurn].type}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Difficulty:</span>
              <span className="text-sm font-medium text-yellow-400">
                {TURN_DETAILS[selectedTurn].difficulty}
              </span>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-green-400 mb-1">Racing Tip:</h4>
              <p className="text-sm text-gray-300 leading-relaxed">
                {TURN_DETAILS[selectedTurn].tip}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-blue-400 mb-1">Ideal Racing Line:</h4>
              <p className="text-sm text-gray-300 leading-relaxed">
                {TURN_DETAILS[selectedTurn].idealLine}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10">
            <p className="text-xs text-gray-500">
              Click anywhere else on the track to close this panel
            </p>
          </div>
        </div>
      )}
    </main>
  )
}
