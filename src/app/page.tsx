'use client';

import React, { useState, useCallback } from 'react';
import { TabType } from '@/types';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ConversationProvider } from '@/contexts/ConversationContext';
import Sidebar from '@/components/Sidebar';
import ChatView from '@/components/chat/ChatView';
import EmailView from '@/components/email/EmailView';
import TranslationView from '@/components/translation/TranslationView';
import SummarizeView from '@/components/summarize/SummarizeView';
import PromptLibrary from '@/components/prompts/PromptLibrary';

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatPrefill, setChatPrefill] = useState('');

  const handleUsePrompt = useCallback((text: string) => {
    setChatPrefill(text);
    setActiveTab('chat');
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatViewWithPrefill prefill={chatPrefill} onPrefillUsed={() => setChatPrefill('')} />;
      case 'email':
        return <EmailView />;
      case 'translation':
        return <TranslationView />;
      case 'summarize':
        return <SummarizeView />;
      case 'prompts':
        return <PromptLibrary onUsePrompt={handleUsePrompt} />;
      default:
        return <ChatView />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="flex-1 min-w-0 h-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        {renderTabContent()}
      </main>
    </div>
  );
}

/**
 * Wrapper around ChatView that handles prompt prefilling.
 */
function ChatViewWithPrefill({
  prefill,
  onPrefillUsed,
}: {
  prefill: string;
  onPrefillUsed: () => void;
}) {
  React.useEffect(() => {
    if (prefill) {
      // Dispatch a custom event that ChatView can listen to
      window.dispatchEvent(
        new CustomEvent('arcas-prefill-chat', { detail: prefill })
      );
      onPrefillUsed();
    }
  }, [prefill, onPrefillUsed]);

  return <ChatView />;
}

export default function Home() {
  return (
    <ThemeProvider>
      <ConversationProvider>
        <AppContent />
      </ConversationProvider>
    </ThemeProvider>
  );
}
