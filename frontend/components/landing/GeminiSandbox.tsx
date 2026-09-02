'use client'

import React, { useState, useEffect } from 'react'
import { Bot, Sparkles, Send, User } from 'lucide-react'

const SIMULATED_CHAT = [
  { role: 'user', text: "Can you analyze Machine 3's power factor from yesterday?" },
  { role: 'ai', text: "I've pulled the telemetry for Machine 3 (CNC DX-250) for yesterday. The power factor dropped to 0.72 between 14:00 and 16:30. This aligns with the heavy milling cycle. I recommend engaging the local capacitor bank during this specific schedule to avoid utility penalties." },
  { role: 'user', text: "What was the total reactive penalty cost for that period?" },
  { role: 'ai', text: "Based on your tariff rate of ₹8.50/kVAh, the excess reactive load (34 kVARh) over those 2.5 hours incurred an approximate penalty of ₹289. Extrapolated monthly, this single machine could cost you ₹7,225 in preventable PF penalties." }
]

export default function GeminiSandbox() {
  const [messages, setMessages] = useState<typeof SIMULATED_CHAT>([])
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    let timeoutIds: NodeJS.Timeout[] = []
    
    const runAnimation = () => {
      setMessages([])
      setIsTyping(false)
      
      // Step 1: User asks first question
      timeoutIds.push(setTimeout(() => {
        setMessages([SIMULATED_CHAT[0]])
        setIsTyping(true)
      }, 1000))

      // Step 2: AI answers first question
      timeoutIds.push(setTimeout(() => {
        setIsTyping(false)
        setMessages([SIMULATED_CHAT[0], SIMULATED_CHAT[1]])
      }, 3500))

      // Step 3: User asks second question
      timeoutIds.push(setTimeout(() => {
        setMessages([SIMULATED_CHAT[0], SIMULATED_CHAT[1], SIMULATED_CHAT[2]])
        setIsTyping(true)
      }, 6000))

      // Step 4: AI answers second question
      timeoutIds.push(setTimeout(() => {
        setIsTyping(false)
        setMessages([...SIMULATED_CHAT])
      }, 8500))
    }

    runAnimation()
    
    // Loop the animation every 15 seconds
    const loopId = setInterval(runAnimation, 15000)
    
    return () => {
      timeoutIds.forEach(clearTimeout)
      clearInterval(loopId)
    }
  }, [])

  return (
    <div className="w-full bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl max-w-4xl mx-auto h-[500px] flex flex-col">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-display">AI Chatbot</h3>
            <div className="text-[10px] text-white/50 uppercase tracking-widest font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-violet-400" /> Natural Language Telemetry
            </div>
          </div>
        </div>
        <div className="px-3 py-1 bg-white/[0.02] border border-white/10 rounded-full text-[10px] text-white/50 font-mono tracking-widest uppercase">
          Automated Demo
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-grow overflow-y-auto space-y-6 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            
            <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center border ${
              msg.role === 'user' 
                ? 'bg-white/5 border-white/10 text-white/70' 
                : 'bg-violet-500/20 border-violet-500/30 text-violet-400'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            
            <div className={`p-4 rounded-2xl max-w-[80%] text-sm leading-relaxed font-sans ${
              msg.role === 'user'
                ? 'bg-white/10 text-white rounded-tr-sm border border-white/10'
                : 'bg-white/[0.02] text-white/80 rounded-tl-sm border border-white/10 shadow-sm'
            }`}>
              {msg.text}
            </div>

          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center border bg-violet-500/20 border-violet-500/30 text-violet-400">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 rounded-tl-sm flex items-center gap-1.5 h-12">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400/50 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400/50 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400/50 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input Area (Fake) */}
      <div className="mt-6 pt-4 border-t border-white/10 shrink-0">
        <div className="relative">
          <input 
            type="text" 
            disabled
            placeholder="Ask anything about your telemetry data..." 
            className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 px-4 text-sm text-white/50 font-mono outline-none cursor-not-allowed"
          />
          <button disabled className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-white/30 cursor-not-allowed">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  )
}
