'use client'

import React, { useState, useEffect } from 'react'
import { Zap, Factory, Server, Fan, Sun, Settings, Radio, Power, Eye, ShieldAlert } from 'lucide-react'

type NodeKey = 'main' | 'prodA' | 'prodB' | 'dataCenter' | 'hvac' | 'solar'

interface NodeDetails {
  name: string
  icon: React.ComponentType<any>
  color: string
  glowColor: string
  basePower: number // Base power in kW
  unit: string
  description: string
}

const nodesConfig: Record<NodeKey, NodeDetails> = {
  main: {
    name: 'Main Incomer (Schneider PM8000)',
    icon: Zap,
    color: 'text-teal-accent border-border bg-surface-2',
    glowColor: 'rgba(45, 212, 191, 0.2)',
    basePower: 0,
    unit: 'kW',
    description: 'Primary utility grid feed monitored by a Schneider PM8000 smart meter. Measures raw line quality and power factor.'
  },
  prodA: {
    name: 'Production Line A (Heavy Machining)',
    icon: Factory,
    color: 'text-teal-accent border-border bg-surface-2',
    glowColor: 'rgba(45, 212, 191, 0.1)',
    basePower: 250,
    unit: 'kW',
    description: 'CNC high-torque motor spindles and grinders. Drives heavy inductive current loads.'
  },
  prodB: {
    name: 'Production Line B (Robotic Assembly)',
    icon: Factory,
    color: 'text-teal-accent border-border bg-surface-2',
    glowColor: 'rgba(45, 212, 191, 0.1)',
    basePower: 120,
    unit: 'kW',
    description: 'Precision automated assembly arms and product conveyors. Highly dynamic and intermittent load patterns.'
  },
  dataCenter: {
    name: 'Enterprise Data Center',
    icon: Server,
    color: 'text-teal-accent border-border bg-surface-2',
    glowColor: 'rgba(45, 212, 191, 0.1)',
    basePower: 180,
    unit: 'kW',
    description: 'Continuous operational baseline including server racks, network hardware, and active cooling.'
  },
  hvac: {
    name: 'HVAC & Facility Ventilation',
    icon: Fan,
    color: 'text-teal-accent border-border bg-surface-2',
    glowColor: 'rgba(45, 212, 191, 0.1)',
    basePower: 90,
    unit: 'kW',
    description: 'Dual chiller units and mechanical ventilation. Consumption follows diurnal ambient temperature changes.'
  },
  solar: {
    name: 'Rooftop Solar Array',
    icon: Sun,
    color: 'text-amber-accent border-border bg-surface-2',
    glowColor: 'rgba(245, 158, 11, 0.1)',
    basePower: -100, // Negative because it generates energy
    unit: 'kW',
    description: 'Clean energy generation. Reduces net grid power consumption and peaks during midday periods.'
  }
}

export default function EnergyFlowVisualizer() {
  const [selectedNode, setSelectedNode] = useState<NodeKey>('main')
  const [loadLevels, setLoadLevels] = useState<Record<NodeKey, number>>({
    main: 100,
    prodA: 70,
    prodB: 45,
    dataCenter: 80,
    hvac: 50,
    solar: 60
  })
  const [toggles, setToggles] = useState<Record<NodeKey, boolean>>({
    main: true,
    prodA: true,
    prodB: true,
    dataCenter: true,
    hvac: true,
    solar: true
  })

  // Simulated metrics
  const [currentValues, setCurrentValues] = useState({
    voltage: 414.8,
    gridFrequency: 50.01
  })

  // Add random micro-fluctuations to voltage & frequency
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentValues({
        voltage: +(415 + (Math.random() - 0.5) * 1.2).toFixed(1),
        gridFrequency: +(50 + (Math.random() - 0.5) * 0.04).toFixed(2)
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Calculate powers based on load levels and toggles
  const getPower = (key: NodeKey): number => {
    if (!toggles[key]) return 0
    const level = loadLevels[key] / 100
    return Math.round(nodesConfig[key].basePower * level)
  }

  const pProdA = getPower('prodA')
  const pProdB = getPower('prodB')
  const pDataCenter = getPower('dataCenter')
  const pHvac = getPower('hvac')
  const pSolar = getPower('solar') // Generator: negative

  const totalLoads = pProdA + pProdB + pDataCenter + pHvac
  const netMainPower = Math.max(0, totalLoads + pSolar)

  const getPF = (key: NodeKey): number => {
    if (key === 'prodA') return 0.76
    if (key === 'prodB') return 0.88
    if (key === 'dataCenter') return 0.99
    if (key === 'hvac') return 0.82
    if (key === 'solar') return 1.00
    // Main PF is weighted average
    const totalKW = totalLoads
    if (totalKW === 0) return 1.0
    const weightedPF = 
      (pProdA * 0.76 + pProdB * 0.88 + pDataCenter * 0.99 + pHvac * 0.82) / totalKW
    return +Math.min(0.99, Math.max(0.7, weightedPF)).toFixed(2)
  }

  const currentPF = getPF(selectedNode === 'main' ? 'main' : selectedNode)
  const nodePower = selectedNode === 'main' ? netMainPower : getPower(selectedNode)
  
  const getAmps = (powerKW: number, pf: number) => {
    if (powerKW === 0) return 0
    const powerWatts = Math.abs(powerKW) * 1000
    const amps = powerWatts / (currentValues.voltage * Math.sqrt(3) * pf)
    return +amps.toFixed(1)
  }

  const nodeAmps = getAmps(nodePower, currentPF)

  const handleSliderChange = (key: NodeKey, val: number) => {
    setLoadLevels(prev => ({ ...prev, [key]: val }))
  }

  const handleToggle = (key: NodeKey) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const getFlowSpeed = (key: NodeKey) => {
    if (!toggles[key] || loadLevels[key] === 0) return '0s'
    const speed = 12 - (loadLevels[key] / 100) * 10
    return `${speed.toFixed(1)}s`
  }

  return (
    <div className="w-full bg-surface border border-border rounded-3xl overflow-hidden p-6 md:p-8 shadow-2xl">
      
      {/* Header Info */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <span className="px-3 py-1 bg-surface-2 border border-border text-teal-accent text-[0.7rem] uppercase tracking-[0.15em] font-mono rounded-full inline-flex items-center gap-1.5 mb-2">
            <Radio className="w-3.5 h-3.5 text-teal-accent animate-pulse" /> Live Telemetry Flow Map
          </span>
          <h3 className="text-xl font-bold font-display text-text-1">Operational Energy Schematic</h3>
          <p className="text-text-2 text-xs sm:text-sm mt-1">
            Toggle breakers, slide operational levels, and observe utility load fluctuations calculated dynamically.
          </p>
        </div>
        
        {/* Overall system metric pills */}
        <div className="grid grid-cols-3 gap-3 w-full lg:w-auto bg-surface-2 p-3.5 border border-border rounded-2xl">
          <div className="text-center px-4 border-r border-border">
            <div className="text-[9px] text-text-3 uppercase font-bold tracking-wider font-mono">Net Incomer</div>
            <div className="text-base font-bold text-teal-accent mt-0.5 font-mono">{netMainPower} kW</div>
          </div>
          <div className="text-center px-4 border-r border-border">
            <div className="text-[9px] text-text-3 uppercase font-bold tracking-wider font-mono">Solar Gen</div>
            <div className="text-base font-bold text-amber-accent mt-0.5 font-mono">{Math.abs(pSolar)} kW</div>
          </div>
          <div className="text-center px-4">
            <div className="text-[9px] text-text-3 uppercase font-bold tracking-wider font-mono">Facility PF</div>
            <div className="text-base font-bold text-text-1 mt-0.5 font-mono">{getPF('main')}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* SVG Flow Map */}
        <div className="lg:col-span-8 bg-bg border border-border rounded-2xl p-4 flex flex-col justify-between min-h-[400px] relative overflow-hidden">
          
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1E2D38_1px,transparent_1px),linear-gradient(to_bottom,#1E2D38_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-20 pointer-events-none" />

          {/* Core SVG Structure */}
          <div className="relative w-full h-[320px] flex items-center justify-center">
            
            <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              {/* Main to Prod A (Teal) */}
              <path d="M 120 160 C 200 160, 200 48, 320 48" fill="none" stroke="#1E2D38" strokeWidth="2" />
              <path 
                d="M 120 160 C 200 160, 200 48, 320 48" 
                fill="none" 
                stroke="#2DD4BF" 
                strokeWidth="2.5" 
                strokeDasharray="6, 8"
                style={{ 
                  animation: `flow-right ${getFlowSpeed('prodA')} linear infinite`,
                  opacity: toggles['prodA'] ? 0.9 : 0 
                }} 
              />

              {/* Main to Prod B (Teal) */}
              <path d="M 120 160 C 200 160, 200 122, 320 122" fill="none" stroke="#1E2D38" strokeWidth="2" />
              <path 
                d="M 120 160 C 200 160, 200 122, 320 122" 
                fill="none" 
                stroke="#2DD4BF" 
                strokeWidth="2.5" 
                strokeDasharray="6, 8"
                style={{ 
                  animation: `flow-right ${getFlowSpeed('prodB')} linear infinite`,
                  opacity: toggles['prodB'] ? 0.9 : 0 
                }} 
              />

              {/* Main to Solar (Amber: reverse flow) */}
              <path d="M 120 160 C 200 160, 200 272, 320 272" fill="none" stroke="#1E2D38" strokeWidth="2" />
              <path 
                d="M 120 160 C 200 160, 200 272, 320 272" 
                fill="none" 
                stroke="#F59E0B" 
                strokeWidth="2.5" 
                strokeDasharray="6, 8"
                style={{ 
                  animation: `flow-left ${getFlowSpeed('solar')} linear infinite`,
                  opacity: toggles['solar'] ? 0.9 : 0 
                }} 
              />

              {/* Main to Data Center (Teal) */}
              <path d="M 380 122 C 450 122, 450 80, 560 80" fill="none" stroke="#1E2D38" strokeWidth="2" />
              <path 
                d="M 380 122 C 450 122, 450 80, 560 80" 
                fill="none" 
                stroke="#2DD4BF" 
                strokeWidth="2.5" 
                strokeDasharray="6, 8"
                style={{ 
                  animation: `flow-right ${getFlowSpeed('dataCenter')} linear infinite`,
                  opacity: (toggles['dataCenter'] && toggles['prodB']) ? 0.9 : 0 
                }} 
              />

              {/* Main to HVAC (Teal) */}
              <path d="M 380 122 C 450 122, 450 240, 560 240" fill="none" stroke="#1E2D38" strokeWidth="2" />
              <path 
                d="M 380 122 C 450 122, 450 240, 560 240" 
                fill="none" 
                stroke="#2DD4BF" 
                strokeWidth="2.5" 
                strokeDasharray="6, 8"
                style={{ 
                  animation: `flow-right ${getFlowSpeed('hvac')} linear infinite`,
                  opacity: (toggles['hvac'] && toggles['prodB']) ? 0.9 : 0 
                }} 
              />
            </svg>

            {/* Overlaid Nodes */}
            {/* 1. Main Incomer */}
            <button
              onClick={() => setSelectedNode('main')}
              className={`absolute left-[5%] top-[37%] flex flex-col items-center justify-center p-3 rounded-2xl border transition-all z-10 select-none cursor-pointer ${
                selectedNode === 'main' 
                  ? 'border-teal-accent bg-surface-2 scale-105 shadow-lg shadow-teal-accent/5' 
                  : 'border-border bg-surface hover:border-text-3 shadow-sm'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-teal-accent/10 text-teal-accent flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-text-1 mt-1.5">Main Incomer</span>
              <span className="text-[10px] text-teal-accent font-mono mt-0.5 font-bold">
                {netMainPower} kW
              </span>
            </button>

            {/* 2. Prod A */}
            <button
              onClick={() => setSelectedNode('prodA')}
              className={`absolute left-[40%] top-[5%] flex flex-col items-center justify-center p-3 rounded-2xl border transition-all z-10 select-none cursor-pointer ${
                !toggles['prodA'] ? 'opacity-45' : ''
              } ${
                selectedNode === 'prodA' 
                  ? 'border-teal-accent bg-surface-2 scale-105 shadow-lg shadow-teal-accent/5' 
                  : 'border-border bg-surface hover:border-text-3 shadow-sm'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-teal-accent/10 text-teal-accent flex items-center justify-center">
                <Factory className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-text-1 mt-1.5">Production A</span>
              <span className="text-[10px] text-teal-accent font-mono mt-0.5 font-bold">
                {pProdA} kW
              </span>
            </button>

            {/* 3. Prod B */}
            <button
              onClick={() => setSelectedNode('prodB')}
              className={`absolute left-[40%] top-[29%] flex flex-col items-center justify-center p-3 rounded-2xl border transition-all z-10 select-none cursor-pointer ${
                !toggles['prodB'] ? 'opacity-45' : ''
              } ${
                selectedNode === 'prodB' 
                  ? 'border-teal-accent bg-surface-2 scale-105 shadow-lg shadow-teal-accent/5' 
                  : 'border-border bg-surface hover:border-text-3 shadow-sm'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-teal-accent/10 text-teal-accent flex items-center justify-center">
                <Factory className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-text-1 mt-1.5">Production B</span>
              <span className="text-[10px] text-teal-accent font-mono mt-0.5 font-bold">
                {pProdB} kW
              </span>
            </button>

            {/* 4. Solar */}
            <button
              onClick={() => setSelectedNode('solar')}
              className={`absolute left-[40%] top-[72%] flex flex-col items-center justify-center p-3 rounded-2xl border transition-all z-10 select-none cursor-pointer ${
                !toggles['solar'] ? 'opacity-45' : ''
              } ${
                selectedNode === 'solar' 
                  ? 'border-amber-accent bg-surface-2 scale-105 shadow-lg shadow-amber-accent/5' 
                  : 'border-border bg-surface hover:border-text-3 shadow-sm'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-accent/10 text-amber-accent flex items-center justify-center">
                <Sun className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-text-1 mt-1.5">Solar PV</span>
              <span className="text-[10px] text-amber-accent font-mono mt-0.5 font-bold">
                {Math.abs(pSolar)} kW
              </span>
            </button>

            {/* 5. Data Center */}
            <button
              onClick={() => setSelectedNode('dataCenter')}
              className={`absolute left-[78%] top-[14%] flex flex-col items-center justify-center p-3 rounded-2xl border transition-all z-10 select-none cursor-pointer ${
                !toggles['dataCenter'] ? 'opacity-45' : ''
              } ${
                selectedNode === 'dataCenter' 
                  ? 'border-teal-accent bg-surface-2 scale-105 shadow-lg shadow-teal-accent/5' 
                  : 'border-border bg-surface hover:border-text-3 shadow-sm'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-teal-accent/10 text-teal-accent flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-text-1 mt-1.5">Data Center</span>
              <span className="text-[10px] text-teal-accent font-mono mt-0.5 font-bold">
                {pDataCenter} kW
              </span>
            </button>

            {/* 6. HVAC */}
            <button
              onClick={() => setSelectedNode('hvac')}
              className={`absolute left-[78%] top-[60%] flex flex-col items-center justify-center p-3 rounded-2xl border transition-all z-10 select-none cursor-pointer ${
                !toggles['hvac'] ? 'opacity-45' : ''
              } ${
                selectedNode === 'hvac' 
                  ? 'border-teal-accent bg-surface-2 scale-105 shadow-lg shadow-teal-accent/5' 
                  : 'border-border bg-surface hover:border-text-3 shadow-sm'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-teal-accent/10 text-teal-accent flex items-center justify-center">
                <Fan className="w-5 h-5" style={{ animation: toggles['hvac'] ? 'spin 2.5s linear infinite' : 'none' }} />
              </div>
              <span className="text-xs font-bold text-text-1 mt-1.5">HVAC Chiller</span>
              <span className="text-[10px] text-teal-accent font-mono mt-0.5 font-bold">
                {pHvac} kW
              </span>
            </button>

          </div>

          {/* Legend */}
          <div className="flex gap-3 flex-wrap items-center mt-4 pt-4 border-t border-border text-xs text-text-3 font-mono">
            <span className="font-bold uppercase tracking-wider text-text-2">FLOW LEGEND:</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-accent inline-block" /> Active Telemetry Node</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-accent inline-block" /> Active Generation Node</span>
          </div>

        </div>

        {/* Right Side: Control Console */}
        <div className="lg:col-span-4 flex flex-col bg-surface-2 border border-border rounded-2xl p-5 justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-4 pb-4 border-b border-border">
              <div>
                <h4 className="text-[10px] font-bold text-text-3 uppercase tracking-widest font-mono">Channel Monitor</h4>
                <div className="text-base font-extrabold text-text-1 mt-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-accent animate-pulse" />
                  {nodesConfig[selectedNode].name}
                </div>
              </div>
              
              {/* Power Toggle */}
              {selectedNode !== 'main' && (
                <button
                  onClick={() => handleToggle(selectedNode)}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    toggles[selectedNode] 
                      ? 'bg-teal-accent/10 text-teal-accent border border-teal-accent/20' 
                      : 'bg-red-accent/10 text-red-accent border border-red-accent/20'
                  }`}
                  title={toggles[selectedNode] ? "Trip Circuit Breaker" : "Close Breaker Circuit"}
                >
                  <Power className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-text-2 text-xs leading-relaxed mb-6 font-sans">
              {nodesConfig[selectedNode].description}
            </p>

            {/* Active Telemetry Values */}
            <div className="space-y-4 mb-6">
              <h5 className="text-[10px] font-bold text-text-3 uppercase tracking-wider font-mono">Live Readings</h5>
              
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="bg-surface p-3 rounded-xl border border-border">
                  <div className="text-[10px] text-text-3 font-bold uppercase">Load Power</div>
                  <div className="text-base font-bold text-text-1 mt-0.5">
                    {nodePower} kW
                  </div>
                </div>

                <div className="bg-surface p-3 rounded-xl border border-border">
                  <div className="text-[10px] text-text-3 font-bold uppercase">Current</div>
                  <div className="text-base font-bold text-text-1 mt-0.5">
                    {nodeAmps} A
                  </div>
                </div>

                <div className="bg-surface p-3 rounded-xl border border-border">
                  <div className="text-[10px] text-text-3 font-bold uppercase">Voltage</div>
                  <div className="text-base font-bold text-text-1 mt-0.5">
                    {currentValues.voltage} V
                  </div>
                </div>

                <div className="bg-surface p-3 rounded-xl border border-border">
                  <div className="text-[10px] text-text-3 font-bold uppercase">Power Factor</div>
                  <div className={`text-base font-bold mt-0.5 ${currentPF < 0.85 ? 'text-amber-accent animate-pulse font-bold' : 'text-teal-accent'}`}>
                    {currentPF}
                  </div>
                </div>
              </div>

              {selectedNode === 'main' && (
                <div className="bg-surface p-3 rounded-xl border border-border flex justify-between items-center text-xs font-mono">
                  <span className="text-text-3 font-bold uppercase tracking-wider text-[10px]">Bus Frequency</span>
                  <span className="text-teal-accent font-extrabold">{currentValues.gridFrequency} Hz</span>
                </div>
              )}
            </div>

            {/* Sliders */}
            {selectedNode !== 'main' && (
              <div className="space-y-3 bg-surface p-4 rounded-xl border border-border">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-text-3 font-bold uppercase tracking-wider text-[10px]">
                    {selectedNode === 'solar' ? 'Generation Yield' : 'Demand Load'}
                  </span>
                  <span className="font-bold text-teal-accent bg-surface-2 px-2 py-0.5 rounded border border-border">
                    {loadLevels[selectedNode]}%
                  </span>
                </div>
                
                <input
                  type="range"
                  min="0"
                  max="100"
                  disabled={!toggles[selectedNode]}
                  value={loadLevels[selectedNode]}
                  onChange={(e) => handleSliderChange(selectedNode, Number(e.target.value))}
                  className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-teal-accent disabled:opacity-30"
                />

                <div className="flex justify-between text-[9px] text-text-3 font-mono">
                  <span>0% (IDLE)</span>
                  <span>100% (MAX)</span>
                </div>
              </div>
            )}

            {selectedNode === 'main' && (
              <div className="bg-surface border border-border p-4 rounded-xl text-xs space-y-2 text-text-2 font-mono">
                <div className="font-bold text-teal-accent flex items-center gap-1">
                  <Settings className="w-3.5 h-3.5 text-teal-accent" /> Facility Incomer Mode
                </div>
                <p className="leading-relaxed text-[11px] text-text-2 font-sans">
                  This meter measures the composite balance. Adjust the specific sub-feed loads in the flow diagram to test how reactive power and grid demand fluctuate in real-time.
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-border text-[10px] text-text-3 flex items-center gap-1.5 justify-center font-mono uppercase">
            <Eye className="w-3.5 h-3.5 text-teal-accent" /> Live system view active
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes flow-right {
          to {
            stroke-dashoffset: -100;
          }
        }
        @keyframes flow-left {
          to {
            stroke-dashoffset: 100;
          }
        }
      `}</style>
    </div>
  )
}
