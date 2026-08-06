'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Cpu, Settings, Server, Database, Bot, Check, ArrowRight } from 'lucide-react'

interface StackItem {
  id: string
  title: string
  subtitle: string
  description: string
  icon: React.ComponentType<any>
  bulletPoints: string[]
  illustration: React.ReactNode
}

export default function StackScrollWalkthrough() {
  const [activeStep, setActiveStep] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const stepRefs = useRef<HTMLDivElement[]>([])

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return
      
      const containerRect = containerRef.current.getBoundingClientRect()
      const viewportMid = window.innerHeight / 2
      let closestStep = 0
      let minDistance = Infinity

      stepRefs.current.forEach((ref, index) => {
        if (!ref) return
        const rect = ref.getBoundingClientRect()
        const elementMid = rect.top + rect.height / 2
        const distance = Math.abs(elementMid - viewportMid)
        
        if (distance < minDistance) {
          minDistance = distance
          closestStep = index
        }
      })

      setActiveStep(closestStep)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const stackItems: StackItem[] = [
    {
      id: 'esp32',
      title: 'ESP32 Edge Gateway',
      subtitle: 'Layer 01 - Local Telemetry Polling',
      description: 'The hardware interface deployed at the factory floor. It acts as the local Modbus master node, directly wired to physical Schneider energy meter serial lines.',
      icon: Cpu,
      bulletPoints: [
        'Polls Modbus registers every 5-10 seconds over serial RS485 line driver boards.',
        'Buffers telemetry locally in non-volatile flash storage if network drop occurs.',
        'Encrypts telemetry payload strings and dispatches them over HTTPS.'
      ],
      illustration: (
        <svg className="w-full h-full text-text-3" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="30" y="30" width="140" height="140" rx="20" fill="var(--surface)" stroke="var(--border)" strokeWidth="2.5" />
          <rect x="50" y="55" width="100" height="90" rx="10" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1.5" />
          
          <rect x="20" y="50" width="10" height="8" rx="2" fill="var(--text-3)" />
          <rect x="20" y="70" width="10" height="8" rx="2" fill="var(--text-3)" />
          <rect x="20" y="90" width="10" height="8" rx="2" fill="var(--text-3)" />
          <rect x="20" y="110" width="10" height="8" rx="2" fill="var(--text-3)" />
          <rect x="20" y="130" width="10" height="8" rx="2" fill="var(--text-3)" />
          
          <rect x="170" y="50" width="10" height="8" rx="2" fill="var(--text-3)" />
          <rect x="170" y="70" width="10" height="8" rx="2" fill="var(--text-3)" />
          <rect x="170" y="90" width="10" height="8" rx="2" fill="var(--text-3)" />
          <rect x="170" y="110" width="10" height="8" rx="2" fill="var(--text-3)" />
          <rect x="170" y="130" width="10" height="8" rx="2" fill="var(--text-3)" />

          <rect x="75" y="80" width="50" height="40" rx="6" fill="var(--bg)" stroke="var(--border)" />
          <circle cx="100" cy="100" r="10" fill="var(--teal)" className="animate-pulse" />
          
          <path d="M 100 120 L 100 160 C 100 170, 70 170, 70 190" stroke="var(--border)" strokeWidth="2" strokeDasharray="4 4" />
        </svg>
      )
    },
    {
      id: 'modbus',
      title: 'Modbus Protocol Frame',
      subtitle: 'Layer 02 - Industrial Networking Bus',
      description: 'The standard industrial fieldbus protocol used by Schneider PM8000 and PM1200 series meters to communicate electrical parameters.',
      icon: Settings,
      bulletPoints: [
        'Reads voltage, current, active power, and PF directly from input register coordinates.',
        'Utilizes cyclic redundancy check (CRC-16) to prevent electrical noise payload corruptions.',
        'Buses multiple meters on a single RS485 daisy-chain wire run.'
      ],
      illustration: (
        <svg className="w-full h-full text-text-3" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="25" y="45" width="150" height="110" rx="16" fill="var(--surface)" stroke="var(--border)" strokeWidth="2.5" />
          
          <rect x="40" y="65" width="35" height="30" rx="6" fill="var(--teal)" />
          <text x="57" y="83" fill="var(--bg)" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="var(--font-jetbrains-mono)">ID</text>
          
          <rect x="80" y="65" width="80" height="30" rx="6" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1.5" />
          <text x="120" y="83" fill="var(--text-2)" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="var(--font-jetbrains-mono)">REG: 3020</text>
          
          <rect x="40" y="105" width="60" height="30" rx="6" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1.5" />
          <text x="70" y="123" fill="var(--text-2)" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="var(--font-jetbrains-mono)">LEN: 4B</text>

          <rect x="105" y="105" width="55" height="30" rx="6" fill="var(--border)" stroke="var(--border)" />
          <text x="132" y="123" fill="var(--text-3)" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="var(--font-jetbrains-mono)">CRC</text>
        </svg>
      )
    },
    {
      id: 'fastapi',
      title: 'FastAPI Telemetry Ingest',
      subtitle: 'Layer 03 - Ingestion & Streaming REST API',
      description: 'A high-performance Python application server. It processes incoming JSON packets from local edge gateways and handles authorization keys.',
      icon: Server,
      bulletPoints: [
        'Maintains WebSocket connections to push live telemetry straight to the user dashboard.',
        'Runs rapid JSON validation schemas via Pydantic structures in less than 5ms.',
        'Triggers threshold checks: instantly dispatches alerts if voltage spikes or PF drops.'
      ],
      illustration: (
        <svg className="w-full h-full text-text-3" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="30" y="35" width="140" height="35" rx="8" fill="var(--surface)" stroke="var(--border)" strokeWidth="2.5" />
          <circle cx="45" cy="52" r="4" fill="var(--teal)" />
          <line x1="60" y1="52" x2="150" y2="52" stroke="var(--border)" strokeWidth="3" />

          <rect x="30" y="80" width="140" height="35" rx="8" fill="var(--surface)" stroke="var(--teal)" strokeWidth="2" />
          <circle cx="45" cy="97" r="4" fill="var(--teal)" className="animate-pulse" />
          <line x1="60" y1="97" x2="120" y2="97" stroke="var(--border)" strokeWidth="3" />
          <circle cx="150" cy="97" r="3" fill="var(--text-3)" />
          <circle cx="160" cy="97" r="3" fill="var(--text-3)" />

          <rect x="30" y="125" width="140" height="35" rx="8" fill="var(--surface)" stroke="var(--border)" strokeWidth="2.5" />
          <circle cx="45" cy="142" r="4" fill="var(--teal)" />
          <line x1="60" y1="142" x2="150" y2="142" stroke="var(--border)" strokeWidth="3" />
        </svg>
      )
    },
    {
      id: 'postgres',
      title: 'PostgreSQL Time-Series Store',
      subtitle: 'Layer 04 - Optimized Storage Engine',
      description: 'The persistence layer housing meter registries and telemetry history tables. It uses partitioned indices on timestamps to support fast analytics queries.',
      icon: Database,
      bulletPoints: [
        'Stores raw voltage, current, harmonics, and active power logs for long-term audit.',
        'Optimized partition tables segment telemetry datasets monthly for rapid queries.',
        'Integrates cleanly with database triggers to manage historical consumption calculations.'
      ],
      illustration: (
        <svg className="w-full h-full text-text-3" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 50 50 C 50 35, 150 35, 150 50 L 150 150 C 150 165, 50 165, 50 150 Z" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
          
          <ellipse cx="100" cy="50" rx="50" ry="15" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="2" />
          
          <path d="M 50 83 C 50 98, 150 98, 150 83" stroke="var(--border)" strokeWidth="2" />
          <path d="M 50 116 C 50 131, 150 131, 150 116" stroke="var(--teal)" strokeWidth="2" />

          <rect x="70" y="125" width="60" height="15" rx="4" fill="var(--teal)" />
          <text x="100" y="136" fill="var(--bg)" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="var(--font-jetbrains-mono)">TIME INDEX</text>
        </svg>
      )
    },
    {
      id: 'gemini',
      title: 'Gemini AI Diagnostic Engine',
      subtitle: 'Layer 05 - Cognitive Analytics Insight',
      description: 'The artificial intelligence intelligence core. It reviews historical logs from Schneider sub-meters to output diagnostics recommendations.',
      icon: Bot,
      bulletPoints: [
        'Detects hidden power factor anomalies and motor efficiency drops automatically.',
        'Forecasts peak demand risk periods based on diurnal weather and operational scheduling.',
        'Compiles detailed energy saving logs and returns them as natural language action sheets.'
      ],
      illustration: (
        <svg className="w-full h-full text-text-3" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="30" fill="var(--surface)" stroke="var(--amber)" strokeWidth="2.5" />
          <path d="M 85 90 C 85 70, 115 70, 115 90 Z" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1.5" />
          
          <circle cx="100" cy="100" r="10" fill="var(--amber)" className="animate-pulse" />
          
          <circle cx="45" cy="55" r="8" fill="var(--surface-2)" stroke="var(--border)" />
          <line x1="53" y1="61" x2="80" y2="83" stroke="var(--border)" strokeWidth="1.5" />
          
          <circle cx="155" cy="55" r="8" fill="var(--surface-2)" stroke="var(--border)" />
          <line x1="147" y1="61" x2="120" y2="83" stroke="var(--border)" strokeWidth="1.5" />

          <circle cx="45" cy="145" r="8" fill="var(--surface-2)" stroke="var(--border)" />
          <line x1="53" y1="139" x2="80" y2="117" stroke="var(--border)" strokeWidth="1.5" />

          <circle cx="155" cy="145" r="8" fill="var(--surface-2)" stroke="var(--border)" />
          <line x1="147" y1="139" x2="120" y2="117" stroke="var(--border)" strokeWidth="1.5" />
        </svg>
      )
    }
  ]

  return (
    <div ref={containerRef} className="relative w-full max-w-7xl mx-auto px-6 py-20 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Sticky Visual Panel (Left Side, 5 Cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-32 flex flex-col items-center justify-center bg-surface border border-border rounded-3xl p-8 shadow-xl h-[380px] w-full">
          <div className="absolute top-4 left-6 text-[10px] font-bold text-text-3 uppercase tracking-widest font-mono">
            Pipeline Topology
          </div>
          
          <div className="w-48 h-48 flex items-center justify-center">
            {stackItems[activeStep].illustration}
          </div>

          <div className="text-center mt-6">
            <h4 className="text-xs font-bold text-text-3 uppercase tracking-wider font-mono">
              {stackItems[activeStep].subtitle}
            </h4>
            <h3 className="text-lg font-bold font-display text-text-1 mt-1">
              {stackItems[activeStep].title}
            </h3>
          </div>
        </div>

        {/* Scrollable Text Descriptions (Right Side, 7 Cols) */}
        <div className="lg:col-span-7 space-y-24 py-10">
          {stackItems.map((item, index) => {
            const Icon = item.icon
            const isActive = activeStep === index

            return (
              <div
                key={item.id}
                ref={(el) => {
                  stepRefs.current[index] = el as HTMLDivElement
                }}
                className={`transition-all duration-300 p-6 rounded-3xl border ${
                  isActive 
                    ? 'border-border bg-surface-2/40 shadow-md' 
                    : 'border-transparent bg-transparent opacity-40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                    isActive ? 'bg-teal-accent border-teal-accent text-surface' : 'bg-surface-2 border-border text-text-2'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-teal-accent font-bold font-mono tracking-[0.15em] uppercase">
                      {item.subtitle}
                    </span>
                    <h3 className="text-lg font-bold font-display text-text-1 mt-0.5">
                      {item.title}
                    </h3>
                  </div>
                </div>

                <p className="text-text-2 text-xs sm:text-sm mt-4 leading-relaxed font-sans">
                  {item.description}
                </p>

                <ul className="mt-5 space-y-2.5">
                  {item.bulletPoints.map((pt, ptIdx) => (
                    <li key={ptIdx} className="flex gap-2.5 items-start text-xs text-text-2 leading-relaxed font-sans">
                      <Check className="w-4 h-4 text-teal-accent flex-shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>

                {isActive && (
                  <div className="mt-6 flex items-center gap-1.5 text-[10px] font-mono text-teal-accent uppercase font-bold tracking-wider">
                    <span>Active Telemetry pipeline streaming</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-accent animate-ping inline-block" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
