'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Activity, ShieldAlert, Cpu, Sparkles } from 'lucide-react'

export default function LiveMeterSandbox() {
  const [voltage, setVoltage] = useState(415)
  const [current, setCurrent] = useState(450)
  const [powerFactor, setPowerFactor] = useState(0.78)
  const [isCapacitorOn, setIsCapacitorOn] = useState(false)

  // Auto PF Correction override
  useEffect(() => {
    if (isCapacitorOn) {
      setPowerFactor(0.98)
    }
  }, [isCapacitorOn])

  // Calculations
  const calculatedMetrics = useMemo(() => {
    const activePowerKW = (voltage * current * Math.sqrt(3) * powerFactor) / 1000
    const apparentPowerKVA = (voltage * current * Math.sqrt(3)) / 1000
    const reactivePowerKVAR = Math.sqrt(Math.max(0, apparentPowerKVA ** 2 - activePowerKW ** 2))

    return {
      kw: +activePowerKW.toFixed(1),
      kva: +apparentPowerKVA.toFixed(1),
      kvar: +reactivePowerKVAR.toFixed(1)
    }
  }, [voltage, current, powerFactor])

  // Oscilloscope wave path generators
  const wavePaths = useMemo(() => {
    const width = 300
    const height = 120
    const padding = 10
    const pointsCount = 60
    const midY = height / 2

    const vAmplitude = 40
    const iAmplitude = (current / 800) * 35 + 5
    const phi = Math.acos(powerFactor)

    let vPath = `M ${padding} ${midY}`
    let iPath = `M ${padding} ${midY}`

    for (let i = 0; i <= pointsCount; i++) {
      const x = padding + (i / pointsCount) * (width - 2 * padding)
      const theta = (i / pointsCount) * Math.PI * 4 // 2 full cycles

      const vY = midY - Math.sin(theta) * vAmplitude
      const iY = midY - Math.sin(theta - phi) * iAmplitude

      vPath += ` L ${x} ${vY}`
      iPath += ` L ${x} ${iY}`
    }

    return { vPath, iPath }
  }, [voltage, current, powerFactor])

  // Dial gauge metrics
  const getGaugeProps = (value: number, max: number) => {
    const radius = 40
    const strokeDash = 2 * Math.PI * radius
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))
    const offset = strokeDash - (percentage / 100) * strokeDash
    return {
      radius,
      strokeDash,
      offset
    }
  }

  const vGauge = getGaugeProps(voltage - 300, 200) // Focus 300-500V range
  const iGauge = getGaugeProps(current, 800)
  const kwGauge = getGaugeProps(calculatedMetrics.kw, 600)

  return (
    <div className="w-full bg-surface border border-border rounded-3xl p-6 md:p-8 shadow-xl">
      
      {/* Console Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <span className="px-3 py-1 bg-surface-2 border border-border text-teal-accent text-[0.7rem] uppercase tracking-[0.15em] font-mono rounded-full inline-flex items-center gap-1.5 mb-2">
            <Cpu className="w-3.5 h-3.5 text-teal-accent" /> Schneider PM8000 SCADA Emulator
          </span>
          <h3 className="text-xl font-bold font-display text-text-1">Telemetry Console Analyzer</h3>
          <p className="text-text-2 text-xs sm:text-sm mt-1 font-sans">
            Simulate grid parameters. Observe how phase displacement generates reactive load currents.
          </p>
        </div>

        {/* Dynamic Alarm */}
        {powerFactor < 0.85 && (
          <div className="flex items-center gap-3 bg-amber-accent/5 border border-amber-accent/20 text-amber-accent px-4 py-2.5 rounded-2xl text-xs font-mono shadow-sm">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-accent" />
            <div>
              <div className="font-bold">LOW POWER FACTOR ALERT</div>
              <div className="opacity-80 text-[10px]">Inductive loads causing line losses. Penalty risk active.</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Analog dials & oscilloscope */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Dial displays */}
          <div className="grid grid-cols-3 gap-4">
            
            {/* Voltage dial */}
            <div className="bg-surface-2 border border-border rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" className="stroke-border" strokeWidth="6" fill="transparent" />
                <circle 
                  cx="48" 
                  cy="48" 
                  r="40" 
                  className="stroke-teal-accent transition-all duration-300" 
                  strokeWidth="6" 
                  fill="transparent" 
                  strokeDasharray={vGauge.strokeDash}
                  strokeDashoffset={vGauge.offset}
                />
              </svg>
              <div className="absolute top-[35%] text-center">
                <div className="text-[10px] text-text-3 uppercase font-bold tracking-wider font-mono">Voltage</div>
                <div className="text-sm font-black text-text-1 font-mono mt-0.5">{voltage} V</div>
              </div>
            </div>

            {/* Current dial */}
            <div className="bg-surface-2 border border-border rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" className="stroke-border" strokeWidth="6" fill="transparent" />
                <circle 
                  cx="48" 
                  cy="48" 
                  r="40" 
                  className="stroke-teal-accent transition-all duration-300" 
                  strokeWidth="6" 
                  fill="transparent" 
                  strokeDasharray={iGauge.strokeDash}
                  strokeDashoffset={iGauge.offset}
                />
              </svg>
              <div className="absolute top-[35%] text-center">
                <div className="text-[10px] text-text-3 uppercase font-bold tracking-wider font-mono">Current</div>
                <div className="text-sm font-black text-text-1 font-mono mt-0.5">{current} A</div>
              </div>
            </div>

            {/* Active power dial */}
            <div className="bg-surface-2 border border-border rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" className="stroke-border" strokeWidth="6" fill="transparent" />
                <circle 
                  cx="48" 
                  cy="48" 
                  r="40" 
                  className="stroke-teal-accent transition-all duration-300" 
                  strokeWidth="6" 
                  fill="transparent" 
                  strokeDasharray={kwGauge.strokeDash}
                  strokeDashoffset={kwGauge.offset}
                />
              </svg>
              <div className="absolute top-[35%] text-center">
                <div className="text-[10px] text-text-3 uppercase font-bold tracking-wider font-mono">Power</div>
                <div className="text-sm font-black text-text-1 font-mono mt-0.5">{calculatedMetrics.kw} kW</div>
              </div>
            </div>

          </div>

          {/* Oscilloscope screen */}
          <div className="bg-surface-2 border border-border rounded-2xl p-5 relative">
            <div className="flex justify-between items-center mb-3 font-mono">
              <div className="text-xs font-bold text-text-2 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-teal-accent" /> Live Waveform Alignment Oscilloscope
              </div>
              
              <div className="flex gap-3 text-[10px] font-mono">
                <span className="flex items-center gap-1 text-teal-accent font-semibold">
                  <span className="w-2.5 h-0.5 bg-teal-accent inline-block" /> Voltage (V)
                </span>
                <span className="flex items-center gap-1 text-amber-accent font-semibold">
                  <span className="w-2.5 h-0.5 bg-amber-accent inline-block" /> Current (I)
                </span>
              </div>
            </div>

            <div className="w-full flex items-center justify-center bg-bg border border-border rounded-xl p-2 overflow-hidden h-[130px] shadow-inner">
              <svg className="w-full h-full" viewBox="0 0 300 120">
                <line x1="0" y1="60" x2="300" y2="60" stroke="#1E2D38" strokeWidth="1.5" strokeDasharray="4,4" />
                <path d={wavePaths.vPath} fill="none" stroke="#2DD4BF" strokeWidth="2" className="opacity-90" />
                <path d={wavePaths.iPath} fill="none" stroke="#F59E0B" strokeWidth="2" className="opacity-90" />
              </svg>
            </div>
            
            <div className="text-[10px] text-text-3 mt-2 text-center font-mono">
              {powerFactor === 1 
                ? 'Unity Power Factor (1.00): Voltage and Current phases are fully synchronized.'
                : `Power Factor (${powerFactor}): Current phase is shifted lagging by ${(Math.acos(powerFactor) * (180 / Math.PI)).toFixed(0)}°.`}
            </div>
          </div>

        </div>

        {/* Right: Controls & output vector stats */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          
          <div className="bg-surface-2 border border-border rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-bold text-text-3 uppercase tracking-widest pb-2 border-b border-border font-mono">Simulator Knobs</h4>
            
            {/* Voltage Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-text-2">Line-to-Line Voltage</span>
                <span className="text-teal-accent font-bold">{voltage} V</span>
              </div>
              <input 
                type="range" 
                min="380" 
                max="480" 
                value={voltage} 
                onChange={(e) => setVoltage(Number(e.target.value))}
                className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-teal-accent"
              />
            </div>

            {/* Current Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-text-2">Circuit Current Load</span>
                <span className="text-teal-accent font-bold">{current} A</span>
              </div>
              <input 
                type="range" 
                min="50" 
                max="800" 
                value={current} 
                onChange={(e) => setCurrent(Number(e.target.value))}
                className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-teal-accent"
              />
            </div>

            {/* Power Factor Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-text-2">Line Power Factor (Lagging)</span>
                <span className={`font-bold ${powerFactor < 0.85 ? 'text-amber-accent animate-pulse font-bold' : 'text-teal-accent'}`}>{powerFactor}</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="1.0" 
                step="0.01"
                disabled={isCapacitorOn}
                value={powerFactor} 
                onChange={(e) => setPowerFactor(Number(e.target.value))}
                className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-teal-accent disabled:opacity-30"
              />
            </div>
          </div>

          {/* Telemetry output numbers */}
          <div className="bg-surface-2 border border-border rounded-2xl p-5 flex flex-col justify-between flex-grow">
            
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-text-3 uppercase tracking-widest font-mono">Calculated Power Vectors</h4>
              
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="bg-surface p-3 rounded-xl border border-border">
                  <div className="text-[10px] text-text-3 font-bold uppercase">Apparent (kVA)</div>
                  <div className="text-base font-bold text-text-1 mt-1">{calculatedMetrics.kva}</div>
                </div>

                <div className="bg-surface p-3 rounded-xl border border-border">
                  <div className="text-[10px] text-text-3 font-bold uppercase flex items-center justify-between">
                    <span>Reactive (kVAR)</span>
                    {calculatedMetrics.kvar > 100 && <ShieldAlert className="w-3.5 h-3.5 text-amber-accent animate-pulse" />}
                  </div>
                  <div className="text-base font-bold text-text-1 mt-1">{calculatedMetrics.kvar}</div>
                </div>
              </div>
            </div>

            {/* Capacitor Bank correction */}
            <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-sans">
              <div className="text-xs text-text-2">
                <div className="font-extrabold text-text-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-accent" /> APFC Capacitor Stage Correction
                </div>
                <p className="text-[10px] text-text-2 mt-0.5 leading-relaxed">
                  Engages local capacitor steps to inject compensating capacitive kVAR and pull PF to 0.98.
                </p>
              </div>

              <button
                onClick={() => setIsCapacitorOn(!isCapacitorOn)}
                className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all flex-shrink-0 cursor-pointer shadow-sm font-mono ${
                  isCapacitorOn 
                    ? 'bg-teal-accent text-bg border-teal-accent hover:bg-teal-accent/80' 
                    : 'bg-surface text-text-2 border-border hover:border-text-3 hover:bg-surface-2'
                }`}
              >
                {isCapacitorOn ? 'Capacitor: ENGAGED' : 'Capacitor: OFF'}
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
