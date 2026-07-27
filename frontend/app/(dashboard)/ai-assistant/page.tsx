import AIChat from '@/components/AIChat';

/**
 * IEMAS - AI Assistant Page
 * 
 * Gemini-style natural language query interface for energy monitoring.
 * Features a centered welcome screen with suggestion chips that transitions
 * into a conversational chat view.
 */

export default function AIAssistantPage() {
  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden">
      <AIChat />
    </div>
  );
}
