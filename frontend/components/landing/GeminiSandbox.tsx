'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Sparkles, Send, Bot, User, BarChart2, ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

interface Message {
  id: string
  sender: 'user' | 'gemini'
  text: string
  status?: 'typing' | 'done'
  chartData?: Array<any>
  bulletPoints?: Array<string>
  recommendations?: Array<{ title: string; action: string; level: 'critical' | 'warning' | 'info' }>
}

const PRESET_PROMPTS = [
  {
    label: 'Analyze Power Factor Anomalies',
    prompt: 'Check for Power Factor anomalies across all active meters. Highlight areas of concern.'
  },
  {
    label: 'Predict Peak Demand Risks',
    prompt: 'Run peak demand forecasting based on the current load profile. When do we risk exceeding our 600 kW threshold?'
  },
  {
    label: 'Diagnostics: Production Line A',
    prompt: 'Verify energy health metrics for Production Line A and provide optimization recommendations.'
  }
]

const RESPONSES: Record<string, Omit<Message, 'id' | 'sender'>> = {
  'pf-anomaly': {
    text: 'Power Factor (PF) diagnostic run completed. I have identified an uncompensated inductive load anomaly on Production Line A.',
    bulletPoints: [
      'Production Line A drops to 0.72 PF during startup sequences (10:00 - 12:00 daily).',
      'This induces high reactive current, driving total system-wide PF down to 0.82.',
      'Estimated monthly penalty charges on utility bill: $1,420.'
    ],
    chartData: [
      { time: '08:00', pf: 0.92 },
      { time: '10:00', pf: 0.72 },
      { time: '12:00', pf: 0.74 },
      { time: '14:00', pf: 0.90 },
      { time: '16:00', pf: 0.91 }
    ],
    recommendations: [
      { 
        title: 'Upgrade Capacitor Step-Size', 
        action: 'Install additional 50 kVAR capacitor stages to Automatic Power Factor Correction (APFC) bank on DB-Prod-A.',
        level: 'critical'
      },
      { 
        title: 'Peak Shift Heavy Machining', 
        action: 'Stagger the startup times of CNC grinding units between 09:30 and 10:30 to flatten inductive inrush.',
        level: 'info'
      }
    ]
  },
  'peak-demand': {
    text: 'Baseline load forecasting algorithm applied. The facility runs a high risk of breaching the contracted 600 kW demand limit during midday shift overlaps.',
    bulletPoints: [
      'Peak load occurs between 13:00 - 15:00, averaging 580 kW and peaking at 615 kW.',
      'Breaching 600 kW incurs dynamic demand charges (up to 3x standard tariff rate).',
      'Data Center baseline remains constant at 180 kW, leaving little flexibility there.'
    ],
    chartData: [
      { time: '08:00', load: 380 },
      { time: '10:00', load: 450 },
      { time: '12:00', load: 510 },
      { time: '14:00', load: 615 },
      { time: '16:00', load: 420 }
    ],
    recommendations: [
      { 
        title: 'Load-Shedding Rule for HVAC', 
        action: 'Set automatic temporary setpoint offset (+2°C) on HVAC units from 13:30 to 14:30.',
        level: 'warning'
      },
      { 
        title: 'Enable Battery Energy Storage Discharge', 
        action: 'Trigger 80 kW discharge cycle from BESS battery bank during peak hours.',
        level: 'info'
      }
    ]
  },
  'prod-a-diag': {
    text: 'Health diagnostic complete for Production Line A (Schneider PM8000 sub-meter logs analyzed). All current, voltage, and harmonics are within acceptable operating windows, but motor efficiency is lagging.',
    bulletPoints: [
      'Active energy usage: 22,400 kWh over past 30 days.',
      'Active harmonics distortion (THD-I) is at 6.8%, within IEC standards but slightly elevated.',
      'Volts balance between phases is optimal (unbalance < 1.2%).'
    ],
    chartData: [
      { time: 'PhA', thd: 6.8 },
      { time: 'PhB', thd: 6.2 },
      { time: 'PhC', thd: 6.5 }
    ],
    recommendations: [
      { 
        title: 'Inspect Line Reactor filters', 
        action: 'Verify condition of passive harmonic filters on the Variable Frequency Drives (VFDs).',
        level: 'warning'
      }
    ]
  }
}

export default function GeminiSandbox() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'gemini',
      text: 'Hello! I am your Gemini AI Energy Analyst. I monitor Schneider sub-meters and Modbus logs to find power quality anomalies and help you avoid peak utility penalties. Choose a diagnostics task below to try it out!'
    }
  ])
  const [inputVal, setInputVal] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const triggerGeminiReply = (promptKey: 'pf-anomaly' | 'peak-demand' | 'prod-a-diag') => {
    setIsTyping(true)

    setTimeout(() => {
      setIsTyping(false)
      const data = RESPONSES[promptKey]
      const responseMsg: Message = {
        id: `response-${Date.now()}`,
        sender: 'gemini',
        text: data.text,
        bulletPoints: data.bulletPoints,
        chartData: data.chartData,
        recommendations: data.recommendations
      }
      setMessages(prev => [...prev, responseMsg])
    }, 2000)
  }

  const handleSend = (text: string) => {
    if (!text.trim() || isTyping) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text
    }
    
    setMessages(prev => [...prev, userMsg])
    setInputVal('')

    const lowercaseText = text.toLowerCase()
    let matchedKey: 'pf-anomaly' | 'peak-demand' | 'prod-a-diag' = 'pf-anomaly'

    if (lowercaseText.includes('peak') || lowercaseText.includes('demand') || lowercaseText.includes('forecast')) {
      matchedKey = 'peak-demand'
    } else if (lowercaseText.includes('prod') || lowercaseText.includes('production') || lowercaseText.includes('harmonics')) {
      matchedKey = 'prod-a-diag'
    }

    triggerGeminiReply(matchedKey)
  }

  const handlePresetClick = (label: string, promptText: string) => {
    if (isTyping) return
    const key = label.toLowerCase().includes('anomaly') 
      ? 'pf-anomaly' 
      : label.toLowerCase().includes('peak') 
      ? 'peak-demand' 
      : 'prod-a-diag'

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: promptText
    }
    setMessages(prev => [...prev, userMsg])
    triggerGeminiReply(key)
  }

  return (
    <div className="w-full bg-surface border border-border rounded-3xl overflow-hidden flex flex-col h-[550px] shadow-xl">
      
      {/* Panel Header */}
      <div className="bg-surface-2 p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-accent/10 flex items-center justify-center text-amber-accent">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-bold font-display text-text-1 flex items-center gap-1.5">
              Gemini AI Energy Analyst
              <span className="w-1.5 h-1.5 rounded-full bg-amber-accent animate-ping" />
            </div>
            <p className="text-[10px] text-text-3 font-bold uppercase tracking-wider font-mono">NLP Analytics Sandbox</p>
          </div>
        </div>
        
        <div className="text-[10px] bg-surface border border-border text-text-2 px-2.5 py-1 rounded-lg font-mono">
          Model: GEMINI-PRO-FLASH
        </div>
      </div>

      {/* Message Feed Area */}
      <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-bg/50">
        
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex gap-3 max-w-[85%] ${
              msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${
              msg.sender === 'user' 
                ? 'bg-amber-accent/10 border-amber-accent/20 text-amber-accent' 
                : 'bg-surface-2 border-border text-text-2'
            }`}>
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div className={`p-4 rounded-2xl text-xs leading-relaxed border ${
              msg.sender === 'user' 
                ? 'bg-surface border-border text-text-1 rounded-tr-none' 
                : 'bg-surface-2 border-border text-text-2 rounded-tl-none'
            }`}>
              <p className="font-sans text-text-1 leading-relaxed">{msg.text}</p>

              {/* Custom Bullet points */}
              {msg.bulletPoints && (
                <ul className="mt-3 space-y-1.5 list-disc pl-5 text-[11px] text-text-2">
                  {msg.bulletPoints.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              )}

              {/* Chart container */}
              {msg.chartData && (
                <div className="mt-4 bg-bg border border-border rounded-xl p-2.5 h-[150px] w-full">
                  <div className="text-[9px] text-text-3 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 font-mono">
                    <BarChart2 className="w-3.5 h-3.5 text-amber-accent" /> Diagnostic metrics trace
                  </div>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={msg.chartData} margin={{ left: -25, top: 5, right: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E2D38" vertical={false} />
                      <XAxis dataKey="time" stroke="#4A5A6B" fontSize={9} tickLine={false} />
                      <YAxis stroke="#4A5A6B" fontSize={9} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0F1519', borderColor: '#1E2D38', fontSize: '10px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar 
                        dataKey={msg.chartData[0].pf !== undefined ? 'pf' : msg.chartData[0].load !== undefined ? 'load' : 'thd'} 
                        fill={msg.chartData[0].pf !== undefined ? '#2DD4BF' : msg.chartData[0].load !== undefined ? '#2563eb' : '#db2777'} 
                        radius={[2, 2, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Recommendations Cards */}
              {msg.recommendations && (
                <div className="mt-4 space-y-2 font-sans">
                  <div className="text-[9px] text-text-3 font-bold uppercase tracking-wider font-mono">AI Recommendations</div>
                  {msg.recommendations.map((rec, i) => (
                    <div key={i} className={`p-3 rounded-xl border flex gap-2.5 items-start ${
                      rec.level === 'critical' 
                        ? 'bg-red-accent/10 border-red-accent/20 text-red-400' 
                        : rec.level === 'warning' 
                        ? 'bg-amber-accent/10 border-amber-accent/20 text-amber-accent' 
                        : 'bg-surface border-border text-text-1'
                    }`}>
                      {rec.level === 'critical' ? (
                        <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-accent mt-0.5" />
                      ) : rec.level === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-accent mt-0.5" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 flex-shrink-0 text-teal-accent mt-0.5" />
                      )}
                      <div>
                        <div className="text-xs font-bold">{rec.title}</div>
                        <div className="text-[11px] opacity-90 mt-0.5 leading-relaxed">{rec.action}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        ))}

        {/* Typing Loader */}
        {isTyping && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="w-8 h-8 rounded-lg bg-surface border border-border text-text-2 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 animate-bounce text-amber-accent" />
            </div>
            <div className="p-3 bg-surface-2 text-text-3 border border-border rounded-2xl rounded-tl-none flex items-center gap-1.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-accent animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-accent animate-bounce" style={{ animationDelay: '0.2s' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-accent animate-bounce" style={{ animationDelay: '0.4s' }} />
              <span className="ml-1 text-[10px] font-mono font-semibold">Gemini is running heuristics...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Shortcuts */}
      <div className="p-3 bg-surface-2 border-t border-border space-y-2">
        <div className="text-[9px] text-text-3 font-bold uppercase tracking-wider font-mono">Demo query shortcuts</div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_PROMPTS.map((p) => (
            <button
              key={p.label}
              disabled={isTyping}
              onClick={() => handlePresetClick(p.label, p.prompt)}
              className="px-3 py-1.5 text-xs text-amber-accent bg-surface hover:bg-surface-2 border border-border rounded-xl cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed font-mono"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form 
        onSubmit={(e) => {
          e.preventDefault()
          handleSend(inputVal)
        }}
        className="p-3 bg-surface-2 border-t border-border flex gap-2 items-center"
      >
        <input 
          type="text" 
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          disabled={isTyping}
          placeholder="Ask Gemini to run diagnostics on Schneider sub-meter channels..." 
          className="flex-grow bg-surface border border-border rounded-2xl px-4 py-2.5 text-xs text-text-1 placeholder-text-3 focus:outline-none focus:border-amber-accent disabled:opacity-50 font-sans"
        />
        <button
          type="submit"
          disabled={!inputVal.trim() || isTyping}
          className="w-10 h-10 rounded-xl bg-amber-accent hover:bg-amber-accent/80 text-bg flex items-center justify-center cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  )
}
