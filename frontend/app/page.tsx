/**
 * IEMAS Frontend - Precision Industrial Portfolio Website
 * Lemken India Agro Pvt. Ltd. Internship Project - Dark-First Theme
 */
'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { 
  TrendingUp, 
  Shield, 
  Activity, 
  Settings, 
  Zap, 
  Cpu, 
  Bot, 
  Calculator, 
  Network, 
  ArrowRight,
  Sparkles,
  Server,
  Database,
  Gauge,
  CheckCircle,
  Bell,
  Mail,
  Smartphone,
  Info,
  Menu,
  X,
  FileText
} from 'lucide-react'

// Custom SVG components to bypass missing lucide-react exports
const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
)

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
)

// Sub-components
import EnergyFlowVisualizer from '@/components/landing/EnergyFlowVisualizer'
import LiveMeterSandbox from '@/components/landing/LiveMeterSandbox'
import GeminiSandbox from '@/components/landing/GeminiSandbox'
import SavingsCalculator from '@/components/landing/SavingsCalculator'
import StackScrollWalkthrough from '@/components/landing/StackScrollWalkthrough'

// CountUp Animations
function CountUp({ value, duration = 800, suffix = "" }: { value: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const end = value
    if (start === end) return

    const steps = 40
    const stepTime = duration / steps
    let currentStep = 0

    const timer = setInterval(() => {
      currentStep++
      const progress = currentStep / steps
      const easedProgress = progress * (2 - progress) // easeOutQuad
      setCount(Math.round(end * easedProgress))
      
      if (currentStep >= steps) {
        clearInterval(timer)
        setCount(end)
      }
    }, stepTime)

    return () => clearInterval(timer)
  }, [value, duration])

  return <span className="font-mono">{count}{suffix}</span>
}

function CountUpDecimal({ value, decimals = 1, duration = 800, suffix = "" }: { value: number; decimals?: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const end = value
    const steps = 40
    const stepTime = duration / steps
    let currentStep = 0

    const timer = setInterval(() => {
      currentStep++
      const progress = currentStep / steps
      const easedProgress = progress * (2 - progress)
      setCount(end * easedProgress)
      
      if (currentStep >= steps) {
        clearInterval(timer)
        setCount(end)
      }
    }, stepTime)

    return () => clearInterval(timer)
  }, [value, duration])

  return <span className="font-mono">{count.toFixed(decimals)}{suffix}</span>
}

// Fade-In on scroll utility
function FadeIn({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true)
        observer.unobserve(entry.target)
      }
    }, { threshold: 0.05 })
    
    if (ref.current) {
      observer.observe(ref.current)
    }
    
    return () => observer.disconnect()
  }, [])

  return (
    <div 
      ref={ref}
      className={`transition-all duration-700 ease-out transform ${
        isIntersecting ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      }`}
    >
      {children}
    </div>
  )
}

type ActiveSection = 'flow' | 'meter' | 'ai' | 'roi'

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveSection>('flow')
  const [menuOpen, setMenuOpen] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <main className="min-h-screen text-text-2 flex flex-col font-sans selection:bg-teal-accent/20 selection:text-teal-accent" style={{ backgroundColor: '#FAF9F6' }}>
      
      {/* 1. NAV Section */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        hasScrolled ? 'bg-surface/80 backdrop-blur-md border-b border-border py-4' : 'bg-transparent py-6'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          {/* Logo with pulsing dot */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-accent"></span>
            </span>
            <span className="font-display font-bold text-lg text-text-1 tracking-tight">IEMAS</span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-wider font-mono">
            <button 
              onClick={() => document.getElementById('problem')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-teal-accent transition-colors cursor-pointer text-text-2 font-semibold"
            >
              Context
            </button>
            <button 
              onClick={() => document.getElementById('pipeline')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-teal-accent transition-colors cursor-pointer text-text-2 font-semibold"
            >
              How It Works
            </button>
            <button 
              onClick={() => document.getElementById('playground')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-teal-accent transition-colors cursor-pointer text-text-2 font-semibold"
            >
              Console
            </button>
            <button 
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-teal-accent transition-colors cursor-pointer text-text-2 font-semibold"
            >
              Features
            </button>
            <button 
              onClick={() => document.getElementById('stack')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-teal-accent transition-colors cursor-pointer text-text-2 font-semibold"
            >
              Tech Stack
            </button>
            <button 
              onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-teal-accent transition-colors cursor-pointer text-text-2 font-semibold"
            >
              About
            </button>
          </nav>

          {/* GitHub CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-border hover:border-teal-accent text-text-1 font-mono text-xs rounded-lg transition-all hover:bg-teal-accent/5 flex items-center gap-1.5"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </div>

          {/* Mobile menu trigger */}
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-text-1 hover:text-teal-accent transition-colors cursor-pointer"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu panel */}
        {menuOpen && (
          <div className="md:hidden bg-surface border-b border-border absolute top-full left-0 right-0 p-6 flex flex-col gap-4 font-mono text-sm uppercase tracking-wider">
            <button 
              onClick={() => {
                setMenuOpen(false)
                document.getElementById('problem')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="text-left py-2 hover:text-teal-accent transition-colors"
            >
              Context
            </button>
            <button 
              onClick={() => {
                setMenuOpen(false)
                document.getElementById('pipeline')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="text-left py-2 hover:text-teal-accent transition-colors"
            >
              How It Works
            </button>
            <button 
              onClick={() => {
                setMenuOpen(false)
                document.getElementById('playground')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="text-left py-2 hover:text-teal-accent transition-colors"
            >
              Console
            </button>
            <button 
              onClick={() => {
                setMenuOpen(false)
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="text-left py-2 hover:text-teal-accent transition-colors"
            >
              Features
            </button>
            <button 
              onClick={() => {
                setMenuOpen(false)
                document.getElementById('stack')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="text-left py-2 hover:text-teal-accent transition-colors"
            >
              Tech Stack
            </button>
            <button 
              onClick={() => {
                setMenuOpen(false)
                document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="text-left py-2 hover:text-teal-accent transition-colors"
            >
              About
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 border-t border-border mt-2 hover:text-teal-accent transition-colors flex items-center gap-2"
            >
              <GithubIcon className="w-4 h-4" />
              <span>GitHub</span>
            </a>
          </div>
        )}
      </header>

      {/* 2. HERO Section */}
      <section className="relative min-h-screen flex flex-col justify-center items-center pt-24 pb-16 overflow-hidden border-b border-border text-center">
        {/* CSS Faint Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1E2D38_1px,transparent_1px),linear-gradient(to_bottom,#1E2D38_1px,transparent_1px)] bg-[size:40px_40px] opacity-[0.06] pointer-events-none" />
        
        {/* Radial subtle glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(45,212,191,0.05)_0%,transparent_70%)] pointer-events-none" />

        <div className="w-full max-w-7xl mx-auto px-6 relative z-10 space-y-8 flex flex-col items-center justify-center">
          
          <div className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.15em] font-mono text-teal-accent select-none">
            <Zap className="w-3.5 h-3.5 text-teal-accent" />
            <span>Industrial IoT · Lemken India Internship Project</span>
          </div>

          {/* Heading */}
          <h1 className="text-center font-display font-bold tracking-tight text-text-1 max-w-5xl mx-auto leading-[1.08] text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl">
            <span className="text-teal-accent">Every watt.</span><br />
            <span className="whitespace-nowrap">Logged, visualized, understood.</span>
          </h1>

          {/* Subheading */}
          <p className="text-sm sm:text-base text-text-2 max-w-2xl mx-auto leading-relaxed font-sans">
            IEMAS connects to Schneider RS-485 energy meters across CNC machines and PMCC panels — pulling live consumption data into a single dashboard with historical trends and an AI query layer.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/meters"
              className="w-full sm:w-auto px-6 py-3 bg-teal-accent hover:bg-teal-accent/90 text-bg rounded-full font-bold text-xs uppercase tracking-wider font-mono transition-all shadow-sm hover:shadow flex items-center justify-center gap-1.5 cursor-pointer"
            >
              See Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3 border border-teal-accent/30 hover:border-teal-accent text-teal-accent rounded-full font-bold text-xs uppercase tracking-wider font-mono transition-all hover:bg-teal-accent/5 flex items-center justify-center gap-1.5"
            >
              Read Docs
            </a>
          </div>

          {/* Dynamic counter stats panel */}
          <div className="pt-10 max-w-3xl mx-auto w-full">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="bg-surface border border-border p-5 rounded-3xl text-center shadow-sm hover:border-teal-accent/40 transition-all duration-300">
                <div className="text-xl font-bold text-text-1 font-mono">
                  <CountUp value={338} suffix=" kW" />
                </div>
                <div className="text-[10px] uppercase tracking-wider text-text-3 font-bold mt-1.5 font-mono">Live Plant Load</div>
              </div>

              <div className="bg-surface border border-border p-5 rounded-3xl text-center shadow-sm hover:border-teal-accent/40 transition-all duration-300">
                <div className="text-xl font-bold text-text-1 font-mono">
                  <CountUpDecimal value={415.2} decimals={1} suffix=" V" />
                </div>
                <div className="text-[10px] uppercase tracking-wider text-text-3 font-bold mt-1.5 font-mono">Line Voltage</div>
              </div>

              <div className="bg-surface border border-border p-5 rounded-3xl text-center shadow-sm hover:border-teal-accent/40 transition-all duration-300">
                <div className="text-xl font-bold text-text-1 font-mono">
                  <CountUpDecimal value={0.86} decimals={2} />
                </div>
                <div className="text-[10px] uppercase tracking-wider text-text-3 font-bold mt-1.5 font-mono">Power Factor</div>
              </div>

              <div className="bg-surface border border-border p-5 rounded-3xl text-center shadow-sm hover:border-teal-accent/40 transition-all duration-300">
                <div className="text-xl font-bold text-text-1 font-mono">
                  <CountUp value={12} suffix=" Meters" />
                </div>
                <div className="text-[10px] uppercase tracking-wider text-text-3 font-bold mt-1.5 font-mono">Connected</div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 3. PROBLEM / CONTEXT (two-column) */}
      <section id="problem" className="py-20 max-w-7xl mx-auto px-6 border-b border-border">
        <FadeIn>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Context description */}
            <div className="lg:col-span-6 space-y-4">
              <span className="text-[0.7rem] uppercase tracking-[0.15em] font-mono text-teal-accent font-bold">
                The Problem
              </span>
              <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">
                Meters everywhere. Data nowhere.
              </h2>
              <div className="text-text-2 text-xs sm:text-sm leading-relaxed space-y-4 font-sans">
                <p>
                  Industrial plants host a variety of machinery, from heavy CNC machining stations to facility PMCC distribution boxes. While individual units were equipped with sub-meters, they remained isolated silos.
                </p>
                <p>
                  Zero centralized data logging meant engineers had to run continuous manual checks, writing down readings by hand. Power factor drops, harmonics surges, and peak demand risks went entirely undetected until transformer fuses tripped or utility penalizations arrived.
                </p>
              </div>
            </div>

            {/* Right before-state terminal representation */}
            <div className="lg:col-span-6">
              <div className="bg-surface-2 border border-amber-accent/20 rounded-3xl p-5 shadow-lg relative overflow-hidden font-mono text-[11px] leading-relaxed text-amber-accent max-w-md mx-auto">
                <div className="absolute top-3 left-4 flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/20 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/20 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2dd4bf]/20 inline-block" />
                </div>
                <div className="text-text-3 text-[10px] text-right uppercase tracking-wider mb-6">Before IEMAS System log</div>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-text-3">[08:14]</span> <span className="font-bold">Machine 3</span> — checked manually. ~42 kWh noted.
                  </div>
                  <div>
                    <span className="text-text-3">[11:30]</span> <span className="font-bold">PMCC Panel B</span> — reading unavailable. Engineer busy.
                  </div>
                  <div>
                    <span className="text-text-3">[16:45]</span> <span className="font-bold">Grid Incomer</span> — PF dropped to 0.74 lagging. No warning triggered.
                  </div>
                  <div className="text-red-accent font-bold pt-2 border-t border-border/40">
                    [EOD]   Data sheet missing metrics. Peak consumption report incomplete.
                  </div>
                </div>
              </div>
            </div>

          </div>
        </FadeIn>
      </section>

      {/* 4. HOW IT WORKS (horizontal numbered steps) */}
      <section id="pipeline" className="py-20 max-w-7xl mx-auto px-6 border-b border-border">
        <FadeIn>
          <div className="text-center mb-16 space-y-2">
            <span className="text-[0.7rem] uppercase tracking-[0.15em] font-mono text-teal-accent font-bold">
              Data Pipeline
            </span>
            <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">
              Modbus Ingestion Schema
            </h2>
          </div>

          {/* Stepper container */}
          <div className="relative">
            {/* Connecting horizontal line */}
            <div className="hidden md:block absolute top-6 left-[12%] right-[12%] h-[1.5px] bg-border z-0" />
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 relative z-10">
              
              {/* Step 1 */}
              <div className="text-center space-y-4 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-teal-accent shadow-sm z-10">
                  <Network className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-teal-accent font-bold font-mono tracking-wider">01 · RS-485 BUS</div>
                  <p className="text-text-2 text-xs leading-relaxed max-w-xs font-sans">
                    Schneider meters wired on Modbus RTU bus, polled every 10 seconds.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="text-center space-y-4 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-teal-accent shadow-sm z-10">
                  <Cpu className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-teal-accent font-bold font-mono tracking-wider">02 · GATEWAY</div>
                  <p className="text-text-2 text-xs leading-relaxed max-w-xs font-sans">
                    RS-485 serial to Ethernet Modbus converter bridges field registers to server.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="text-center space-y-4 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-teal-accent shadow-sm z-10">
                  <Database className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-teal-accent font-bold font-mono tracking-wider">03 · DATA ENGINE</div>
                  <p className="text-text-2 text-xs leading-relaxed max-w-xs font-sans">
                    Python service validates schemas, stamps timestamps, and stores register reads.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="text-center space-y-4 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-teal-accent shadow-sm z-10">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-teal-accent font-bold font-mono tracking-wider">04 · DASHBOARD + AI</div>
                  <p className="text-text-2 text-xs leading-relaxed max-w-xs font-sans">
                    Web UI visualizes active vectors; Gemini chatbot coordinates audits queries.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </FadeIn>
      </section>

      {/* Interactive Playground Console */}
      <section id="playground" className="py-20 border-b border-border bg-bg/50">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center mb-10 space-y-2">
            <span className="text-[0.7rem] uppercase tracking-[0.15em] font-mono text-teal-accent font-bold">
              Console Sandbox
            </span>
            <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">
              Live Systems Simulator
            </h2>
            <p className="text-text-2 text-xs sm:text-sm max-w-xl mx-auto">
              Simulate actual grid conditions and run analytics workflows. Click any tab below:
            </p>
          </div>

          {/* Tab Switcher - Fully Rounded Pills */}
          <div className="flex justify-center mb-10">
            <div className="flex bg-surface p-1 border border-border rounded-full max-w-2xl w-full grid grid-cols-2 md:grid-cols-4 gap-1 shadow-sm">
              
              <button
                onClick={() => setActiveTab('flow')}
                className={`py-3 px-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer font-mono ${
                  activeTab === 'flow' 
                    ? 'bg-teal-accent text-bg shadow-sm' 
                    : 'text-text-2 hover:text-text-1 hover:bg-surface-2/60'
                }`}
              >
                <Network className="w-4 h-4" />
                <span>Flow Map</span>
              </button>

              <button
                onClick={() => setActiveTab('meter')}
                className={`py-3 px-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer font-mono ${
                  activeTab === 'meter' 
                    ? 'bg-teal-accent text-bg shadow-sm' 
                    : 'text-text-2 hover:text-text-1 hover:bg-surface-2/60'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>SCADA</span>
              </button>

              <button
                onClick={() => setActiveTab('ai')}
                className={`py-3 px-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer font-mono ${
                  activeTab === 'ai' 
                    ? 'bg-teal-accent text-bg shadow-sm' 
                    : 'text-text-2 hover:text-text-1 hover:bg-surface-2/60'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>Gemini AI</span>
              </button>

              <button
                onClick={() => setActiveTab('roi')}
                className={`py-3 px-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer font-mono ${
                  activeTab === 'roi' 
                    ? 'bg-teal-accent text-bg shadow-sm' 
                    : 'text-text-2 hover:text-text-1 hover:bg-surface-2/60'
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span>Savings</span>
              </button>

            </div>
          </div>

          {/* Active Tab Screen */}
          <div className="transition-all duration-300">
            {activeTab === 'flow' && <EnergyFlowVisualizer />}
            {activeTab === 'meter' && <LiveMeterSandbox />}
            {activeTab === 'ai' && <GeminiSandbox />}
            {activeTab === 'roi' && <SavingsCalculator />}
          </div>

        </div>
      </section>

      {/* Sticky Scroll Stack Walkthrough */}
      <section className="border-b border-border">
        <StackScrollWalkthrough />
      </section>

      {/* 5. FEATURES (3-column card grid) */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-6 border-b border-border">
        <FadeIn>
          <div className="text-center mb-16 space-y-2">
            <span className="text-[0.7rem] uppercase tracking-[0.15em] font-mono text-teal-accent font-bold">
              Features
            </span>
            <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">
              Built for precision engineering.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="bg-surface border border-border p-6 rounded-3xl hover:border-teal-accent/30 transition-all group shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-surface-2 border border-border text-teal-accent flex items-center justify-center mb-4">
                <Zap className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-sm font-bold text-text-1 font-mono">Live Monitoring</h3>
              <p className="text-text-2 text-xs mt-2 leading-relaxed font-sans">
                Real-time active power (kW), voltage level, phase currents, and lagging power factor logs tracked per machine.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-surface border border-border p-6 rounded-3xl hover:border-teal-accent/30 transition-all group shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-surface-2 border border-border text-teal-accent flex items-center justify-center mb-4">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-sm font-bold text-text-1 font-mono">Historical Trends</h3>
              <p className="text-text-2 text-xs mt-2 leading-relaxed font-sans">
                Hourly, daily, and monthly charts tracking aggregate values with single-click CSV export options.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-surface border border-border p-6 rounded-3xl hover:border-teal-accent/30 transition-all group shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-surface-2 border border-border text-teal-accent flex items-center justify-center mb-4">
                <Network className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-sm font-bold text-text-1 font-mono">Plant-Wide View</h3>
              <p className="text-text-2 text-xs mt-2 leading-relaxed font-sans">
                A single rolled-up SCADA map tracking load imbalances and distribution transformers capacity.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-surface border border-border p-6 rounded-3xl hover:border-teal-accent/30 transition-all group shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-surface-2 border border-border text-teal-accent flex items-center justify-center mb-4">
                <Shield className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-sm font-bold text-text-1 font-mono">Role-Based Auth</h3>
              <p className="text-text-2 text-xs mt-2 leading-relaxed font-sans">
                Secure credentials layers partitioning administrator configs from standard viewer access tiers.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-surface border border-border p-6 rounded-3xl hover:border-teal-accent/30 transition-all group shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-surface-2 border border-border text-teal-accent flex items-center justify-center mb-4">
                <Bot className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-sm font-bold text-text-1 font-mono">AI Query Layer</h3>
              <p className="text-text-2 text-xs mt-2 leading-relaxed font-sans">
                Ask diagnostics questions like "What was Machine 4's harmonics distortion yesterday?" in plain English.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-surface border border-border p-6 rounded-3xl hover:border-teal-accent/30 transition-all group shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-surface-2 border border-border text-teal-accent flex items-center justify-center mb-4">
                <Bell className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-sm font-bold text-text-1 font-mono">Anomaly Alerts</h3>
              <p className="text-text-2 text-xs mt-2 leading-relaxed font-sans">
                Detects current surges or low power factor states instantly and dispatches alarms to edge workers.
              </p>
            </div>

          </div>
        </FadeIn>
      </section>

      {/* 6. TECH STACK (dark band, full-width) */}
      <section id="stack" className="py-20 bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-12 space-y-2">
              <span className="text-[0.7rem] uppercase tracking-[0.15em] font-mono text-teal-accent font-bold">
                Built With
              </span>
              <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">
                The stack behind the meter.
              </h2>
            </div>

            <div className="space-y-8 max-w-4xl mx-auto font-mono text-xs">
              
              {/* Row 1: Hardware */}
              <div className="space-y-3">
                <div className="text-[10px] text-text-3 font-bold uppercase tracking-wider">Hardware Layer</div>
                <div className="flex flex-wrap gap-2.5">
                  {['Schneider EM6436H', 'RS-485 Serial Bus', 'Modbus RTU Master', 'Ethernet Gateway', 'ESP32 Nodes'].map((tech) => (
                    <span 
                      key={tech}
                      className="px-4 py-2 bg-surface-2 border border-border text-amber-accent rounded-full font-bold shadow-sm"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Row 2: Software */}
              <div className="space-y-3">
                <div className="text-[10px] text-text-3 font-bold uppercase tracking-wider">Software Layer</div>
                <div className="flex flex-wrap gap-2.5">
                  {['Python FastAPI', 'Node.js Core', 'PostgreSQL Timeseries', 'Next.js App Router', 'Recharts UI', 'Gemini AI API'].map((tech) => (
                    <span 
                      key={tech}
                      className="px-4 py-2 bg-surface-2 border border-border text-teal-accent rounded-full font-bold shadow-sm"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </FadeIn>
        </div>
      </section>

      {/* 7. ABOUT ME (violet accent section) */}
      <section id="about" className="py-20 bg-surface-2 border-b border-border relative">
        {/* Left vertical violet border highlight */}
        <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-violet-accent" />
        
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              
              <div className="lg:col-span-4 space-y-3">
                <span className="text-[0.7rem] uppercase tracking-[0.15em] font-mono text-violet-accent font-bold">
                  The Builder
                </span>
                <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">
                  Hi, I&apos;m Jayant.
                </h2>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="text-text-2 text-xs sm:text-sm leading-relaxed space-y-4 font-sans max-w-2xl">
                  <p>
                    I&apos;m a pre-final year Mechanical Engineering student at GH Raisoni College of Engineering, Nagpur — with a Computer Science minor and a habit of building software at hackathons. IEMAS started as a technical brief during my internship at Lemken India Agro Pvt. Ltd. and became a deployed IoT platform.
                  </p>
                  <p>
                    I&apos;ve participated in 12+ hackathons, won ETH Mumbai, and built cross-functional tools spanning full-stack AI, Web3 protocols, and industrial IoT. This project sits directly at the crossroads of physical energy systems and digital architectures — exactly where I aim to innovate.
                  </p>
                </div>

                {/* Violet ghost pill buttons */}
                <div className="flex flex-wrap gap-2.5 font-mono text-[11px] font-bold">
                  <a 
                    href="https://iamjayant.xyz" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-4 py-2 border border-violet-accent/30 hover:border-violet-accent text-violet-accent rounded-full transition-all hover:bg-violet-accent/5"
                  >
                    iamjayant.xyz
                  </a>
                  <a 
                    href="https://github.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-4 py-2 border border-violet-accent/30 hover:border-violet-accent text-violet-accent rounded-full transition-all hover:bg-violet-accent/5 flex items-center gap-1"
                  >
                    <GithubIcon className="w-3 h-3" /> GitHub
                  </a>
                  <a 
                    href="https://linkedin.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-4 py-2 border border-violet-accent/30 hover:border-violet-accent text-violet-accent rounded-full transition-all hover:bg-violet-accent/5 flex items-center gap-1"
                  >
                    <LinkedinIcon className="w-3 h-3" /> LinkedIn
                  </a>
                </div>
              </div>

            </div>
          </FadeIn>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="bg-bg border-t border-border pt-16 pb-12 mt-auto">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-10">
          
          {/* Left info column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white">
                <Activity className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg text-text-1 tracking-tight">IEMAS</span>
            </div>
            <p className="text-xs text-text-2 leading-relaxed max-w-sm font-sans">
              Built during internship at Lemken Indian Agro Pvt. Ltd. Deploys local Modbus structures to poll Schneider meters, rendering telemetry on a dashboard with chatbot AI audit tools.
            </p>
            <div className="text-[10px] text-text-3 font-mono">
              &copy; 2026 Jayant. Developed in Nagpur, India.
            </div>
          </div>

          {/* Right Links column */}
          <div className="flex md:justify-end gap-16">
            <div className="space-y-3 font-mono text-xs">
              <h4 className="text-[10px] font-bold text-text-3 uppercase tracking-widest">Project</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#playground" className="hover:text-teal-accent text-text-2 transition-colors">
                    Live Demo
                  </a>
                </li>
                <li>
                  <Link href="/meters" className="hover:text-teal-accent text-text-2 transition-colors">
                    Dashboard Logs
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-3 font-mono text-xs">
              <h4 className="text-[10px] font-bold text-text-3 uppercase tracking-widest">Contact</h4>
              <ul className="space-y-2">
                <li>
                  <a href="mailto:contact@iamjayant.xyz" className="hover:text-teal-accent text-text-2 transition-colors">
                    Email
                  </a>
                </li>
                <li>
                  <a href="https://linkedin.com" className="hover:text-teal-accent text-text-2 transition-colors">
                    LinkedIn
                  </a>
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Status bar closing note footer bottom */}
        <div className="max-w-7xl mx-auto px-6 mt-16 pt-6 border-t border-border/60">
          <div className="flex justify-between items-center text-[10px] text-text-3 font-mono uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-accent inline-block animate-pulse" />
              <span>338 kW Monitored</span>
            </span>
            <span>12 Meters Connected</span>
            <span>0 Manual Readings since deployment</span>
          </div>
        </div>
      </footer>

    </main>
  )
}
