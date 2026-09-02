'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { Send, Sparkles, Zap, TrendingUp, Activity, BarChart3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

/**
 * IEMAS - AI Chat Component (Gemini-style)
 * 
 * Full-page conversational AI interface inspired by Google Gemini.
 * - Centered welcome screen with gradient greeting and suggestion chips
 * - Transitions to a scrollable chat view once the first message is sent
 * - Floating input bar pinned to the bottom
 * - Smooth animations on every interaction
 */

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIQueryResponse {
  query: string;
  query_type: string;
  response: string;
  data_used: any;
  timestamp: string;
}

const SUGGESTIONS = [
  { icon: Zap, label: 'Current power consumption', query: 'What is the current power consumption?' },
  { icon: TrendingUp, label: 'Power trend last 7 days', query: 'Show me the power trend for the last 7 days' },
  { icon: Activity, label: 'Highest consuming meter', query: 'Which meter had the highest consumption?' },
  { icon: BarChart3, label: 'Energy usage summary', query: 'Give me a summary of energy usage across all meters' },
];

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasMessages = messages.length > 0;

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();

    const query = overrideQuery || inputValue.trim();
    if (!query || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response: AIQueryResponse = await api.post('/api/ai/query', {
        query: userMessage.content,
      });

      clearTimeout(timeoutId);

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('AI query error:', err);

      let errorMessage = 'Failed to get AI response. Please try again.';
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. The AI is taking too long to respond.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);

      const errorAssistantMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorAssistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle textarea auto-resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  };

  // Handle Enter key to submit (Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg relative">
      {/* ───────── Welcome Screen (hidden once chat starts) ───────── */}
      {!hasMessages && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32 animate-[fadeIn_0.5s_ease-out]">
          {/* Gradient greeting */}
          <div className="mb-2">
            <Sparkles className="w-10 h-10 text-violet-accent mx-auto mb-4 opacity-80" />
          </div>
          <h1
            className="text-4xl md:text-5xl font-display font-bold text-center mb-3 bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(135deg, #7C3AED 0%, #0D9488 50%, #D97706 100%)',
            }}
          >
            Hello, how can I help?
          </h1>
          <p className="text-text-3 text-base md:text-lg text-center max-w-md mb-10">
            Ask anything about your energy meters, consumption patterns, or system analytics.
          </p>

          {/* Suggestion chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSubmit(undefined, s.query)}
                className="group flex items-center gap-3 px-5 py-4 bg-surface border border-border rounded-md text-left
                           hover:border-violet-accent/40 hover:shadow-md hover:shadow-violet-accent/5
                           transition-all duration-200 cursor-pointer"
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-md bg-surface-2 text-text-3 group-hover:text-violet-accent transition-colors">
                  <s.icon className="w-[18px] h-[18px]" />
                </span>
                <span className="text-sm text-text-2 group-hover:text-text-1 transition-colors font-medium leading-snug">
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ───────── Chat Messages ───────── */}
      {hasMessages && (
        <div className="flex-1 overflow-y-auto px-4 md:px-0 pt-6 pb-36">
          <div className="max-w-2xl mx-auto space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className="animate-[fadeSlideUp_0.3s_ease-out]"
              >
                {message.role === 'user' ? (
                  /* ── User bubble ── */
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-violet-accent text-white px-5 py-3 rounded-md rounded-br-lg ">
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                  </div>
                ) : (
                  /* ── Assistant bubble ── */
                  <div className="flex gap-3 items-start">
                    <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-violet-accent/20 to-teal-accent/20 mt-0.5">
                      <Sparkles className="w-4 h-4 text-violet-accent" />
                    </span>
                    <div className="flex-1 bg-surface border border-border rounded-md rounded-tl-lg px-5 py-4 ">
                      <div className="prose prose-sm max-w-none text-[15px] text-text-1 leading-relaxed prose-headings:text-text-1 prose-strong:text-text-1 prose-strong:font-semibold prose-p:my-2 prose-ul:my-2 prose-li:my-1">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      <span className="block text-xs text-text-3 mt-2">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 items-start animate-[fadeSlideUp_0.3s_ease-out]">
                <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-violet-accent/20 to-teal-accent/20">
                  <Sparkles className="w-4 h-4 text-violet-accent animate-pulse" />
                </span>
                <div className="bg-surface border border-border rounded-md rounded-tl-lg px-5 py-4 ">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-violet-accent/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-violet-accent/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-violet-accent/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-sm text-text-3 ml-2">Thinking…</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* ───────── Error banner ───────── */}
      {error && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-28 w-full max-w-2xl px-4 z-20">
          <div className="bg-red-accent/10 border border-red-accent/20 text-red-accent text-sm rounded-md px-4 py-3 shadow-lg">
            <span className="font-semibold">Error:</span> {error}
          </div>
        </div>
      )}

      {/* ───────── Floating Input Bar ───────── */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 pt-3 bg-gradient-to-t from-bg via-bg/95 to-transparent z-10">
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto flex items-end gap-2 bg-surface border border-border rounded-[28px] shadow-lg shadow-black/5 px-4 py-2 focus-within:border-violet-accent/50 focus-within:shadow-violet-accent/10 transition-all duration-200"
        >
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about energy consumption, meters, trends…"
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-transparent text-text-1 text-[15px] placeholder:text-text-3 resize-none outline-none py-2 max-h-32 disabled:opacity-50 disabled:cursor-not-allowed"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-violet-accent text-white
                       hover:bg-violet-accent/90 disabled:bg-surface-2 disabled:text-text-3
                       transition-all duration-200 flex-shrink-0 cursor-pointer disabled:cursor-not-allowed"
          >
            <Send className="w-[18px] h-[18px]" />
          </button>
        </form>
        <p className="text-center text-xs text-text-3 mt-2 opacity-60">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>

    </div>
  );
}
