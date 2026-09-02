'use client'

import React from 'react'
import { Cpu, Network, Server, Zap, ArrowRight, Wifi } from 'lucide-react'

export default function LiveMeterSandbox() {
  return (
    <div className="w-full bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-3xl p-6 md:p-10 shadow-xl relative overflow-hidden">
      
      {/* Background Grid for Diagram Feel */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 mb-12 text-center">
        <span className="px-3 py-1 bg-white/[0.02] backdrop-blur-2xl border border-white/10 text-teal-accent text-[0.7rem] uppercase tracking-[0.15em] font-mono rounded-full inline-flex items-center gap-1.5 mb-3">
          <Cpu className="w-3.5 h-3.5 text-teal-accent" /> Hardware Architecture
        </span>
        <h3 className="text-xl font-bold font-display text-white">Current Setup Schematic</h3>
        <p className="text-white/70 text-xs sm:text-sm mt-2 font-sans max-w-lg mx-auto">
          The exact hardware pipeline powering the IEMAS dashboard. Data flows from the physical grid through serial converters to the cloud in real-time.
        </p>
      </div>

      {/* Diagram Container */}
      <div className="w-full overflow-x-auto overflow-y-hidden pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <div className="relative z-10 flex flex-row items-center justify-between min-w-[750px] w-full max-w-5xl mx-auto gap-4 pb-4">
        
        {/* Node 1: Schneider Meter */}
        <div className="flex flex-col items-center w-40 text-center shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-[#0A0A0A] border border-white/20 flex items-center justify-center text-teal-accent mb-4 shadow-[0_0_15px_rgba(45,212,191,0.15)] relative z-10">
            <Zap className="w-8 h-8" />
          </div>
          <div className="text-sm font-bold text-white font-mono">Schneider EM6433H</div>
          <div className="text-[10px] text-white/50 uppercase tracking-widest mt-1">Energy Meter</div>
        </div>

        {/* Link 1: RS485 */}
        <div className="flex-grow flex flex-col items-center justify-center h-full relative px-2">
          <div className="w-full h-[2px] overflow-hidden relative">
            <svg className="w-full h-full" preserveAspectRatio="none">
              <line x1="0" y1="1" x2="100%" y2="1" stroke="#1E2D38" strokeWidth="2" />
              <line 
                x1="0" y1="1" x2="100%" y2="1" 
                stroke="#2DD4BF" 
                strokeWidth="2" 
                strokeDasharray="40, 1000"
                style={{
                  animation: 'flowLightRight 10s linear infinite',
                  filter: 'drop-shadow(0 0 4px rgba(45, 212, 191, 0.8))'
                }}
              />
            </svg>
          </div>
          <div className="absolute top-[-20px] bg-white/[0.03] backdrop-blur-2xl px-2 text-[10px] text-white/50 font-mono tracking-widest flex items-center gap-1">
            RS-485 (A/B)
          </div>
        </div>

        {/* Node 2: MAX485 to TTL */}
        <div className="flex flex-col items-center w-40 text-center shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-[0_0_15px_rgba(99,102,241,0.15)] relative z-10">
            <Network className="w-8 h-8" />
          </div>
          <div className="text-sm font-bold text-white font-mono">MAX485 to TTL</div>
          <div className="text-[10px] text-white/50 uppercase tracking-widest mt-1">Manual Converter</div>
        </div>

        {/* Link 2: UART */}
        <div className="flex-grow flex flex-col items-center justify-center h-full relative px-2">
          <div className="w-full h-[2px] overflow-hidden relative">
            <svg className="w-full h-full" preserveAspectRatio="none">
              <line x1="0" y1="1" x2="100%" y2="1" stroke="#1E2D38" strokeWidth="2" />
              <line 
                x1="0" y1="1" x2="100%" y2="1" 
                stroke="#6366F1" 
                strokeWidth="2" 
                strokeDasharray="40, 1000"
                style={{
                  animation: 'flowLightRight 10s linear infinite',
                  filter: 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.8))'
                }}
              />
            </svg>
          </div>
          <div className="absolute top-[-20px] bg-white/[0.03] backdrop-blur-2xl px-2 text-[10px] text-white/50 font-mono tracking-widest flex items-center gap-1">
            UART (RX/TX)
          </div>
        </div>

        {/* Node 3: ESP32 */}
        <div className="flex flex-col items-center w-40 text-center shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-[#0A0A0A] border border-white/20 flex items-center justify-center text-amber-accent mb-4 shadow-[0_0_15px_rgba(245,158,11,0.15)] relative z-10">
            <Cpu className="w-8 h-8" />
          </div>
          <div className="text-sm font-bold text-white font-mono">ESP32 Devkit V1</div>
          <div className="text-[10px] text-white/50 uppercase tracking-widest mt-1">Microcontroller</div>
        </div>

        {/* Link 3: WiFi */}
        <div className="flex-grow flex flex-col items-center justify-center h-full relative px-2">
          <div className="w-full h-[2px] overflow-hidden relative">
            <svg className="w-full h-full" preserveAspectRatio="none">
              <line x1="0" y1="1" x2="100%" y2="1" stroke="#1E2D38" strokeWidth="2" />
              <line 
                x1="0" y1="1" x2="100%" y2="1" 
                stroke="#F59E0B" 
                strokeWidth="2" 
                strokeDasharray="40, 1000"
                style={{
                  animation: 'flowLightRight 10s linear infinite',
                  filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.8))'
                }}
              />
            </svg>
          </div>
          <div className="absolute top-[-20px] bg-white/[0.03] backdrop-blur-2xl px-2 text-[10px] text-white/50 font-mono tracking-widest flex items-center gap-1">
            <Wifi className="w-3 h-3 text-white/50" /> Wi-Fi
          </div>
        </div>

        {/* Node 4: Backend */}
        <div className="flex flex-col items-center w-40 text-center shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.15)] relative z-10">
            <Server className="w-8 h-8" />
          </div>
          <div className="text-sm font-bold text-white font-mono">IEMAS Cloud</div>
          <div className="text-[10px] text-white/50 uppercase tracking-widest mt-1">FastAPI + Supabase</div>
        </div>

        </div>
      </div>
    </div>
  )
}
