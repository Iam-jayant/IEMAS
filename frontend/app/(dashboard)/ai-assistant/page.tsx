import AIChat from '@/components/AIChat';

/**
 * IEMAS - AI Assistant Page
 * 
 * Natural language query interface for energy monitoring system.
 * Users can ask questions about meter data, trends, and analytics.
 */

export default function AIAssistantPage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="h-full max-w-4xl mx-auto">
        <AIChat />
      </div>
    </div>
  );
}
