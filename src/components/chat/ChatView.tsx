'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Loader2,
  User,
  Bot,
  AlertCircle,
  RefreshCw,
  Paperclip,
  Image as ImageIcon,
  Copy,
  Check,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, SensitiveItem, ReplacementMapping } from '@/types';
import { useConversations } from '@/contexts/ConversationContext';
import { detectSensitiveInfo, restoreOriginals, hasMappablePlaceholders } from '@/lib/guardrail';
import { generateId } from '@/lib/storage';
import GuardrailModal from '@/components/guardrail/GuardrailModal';
import MapBackButton from '@/components/guardrail/MapBackButton';

export default function ChatView() {
  const {
    currentConversation,
    addMessage,
    updateReplacementMapping,
    createNewConversation,
  } = useConversations();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [guardrailData, setGuardrailData] = useState<{
    text: string;
    items: SensitiveItem[];
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /** Message IDs for which the user chose to "map back" placeholders to original values. */
  const [revealedMessageIds, setRevealedMessageIds] = useState<Set<string>>(new Set());

  const messages = currentConversation?.messages ?? [];
  const replacementMappings = currentConversation?.replacementMappings ?? {};

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when switching conversations
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentConversation?.id]);

  // Listen for prefill events from Prompt Library
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setInput(customEvent.detail);
        inputRef.current?.focus();
      }
    };
    window.addEventListener('arcas-prefill-chat', handler);
    return () => window.removeEventListener('arcas-prefill-chat', handler);
  }, []);

  /** True if this assistant message contains placeholders we can map back. */
  const messageHasMappablePlaceholders = useCallback(
    (msg: Message): boolean =>
      msg.role === 'assistant' && hasMappablePlaceholders(msg.content, replacementMappings),
    [replacementMappings]
  );

  const toggleRevealMapped = useCallback((messageId: string) => {
    setRevealedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }, []);

  /**
   * Return displayable text for a message:
   * - User messages: show the original (un-anonymized) text when available.
   * - AI messages: by default show placeholders; only restore originals when the user
   *   clicks "Map back" for that message (revealedMessageIds).
   */
  const getDisplayContent = useCallback(
    (msg: Message): string => {
      if (msg.role === 'user') {
        return msg.originalContent || msg.content;
      }
      const hasMappable = messageHasMappablePlaceholders(msg);
      const isRevealed = revealedMessageIds.has(msg.id);
      if (hasMappable && isRevealed && Object.keys(replacementMappings).length > 0) {
        return restoreOriginals(msg.content, replacementMappings);
      }
      return msg.content;
    },
    [replacementMappings, revealedMessageIds, messageHasMappablePlaceholders]
  );

  /**
   * Core flow:
   * 1. Add the user message to the conversation (anonymized content for history).
   * 2. Call the API with the full anonymized chat history.
   * 3. Handle API response or error, add the resulting message.
   *
   * @param anonymizedText  Text after guardrail replacements (sent to API)
   * @param mapping         Placeholder -> original value map
   * @param originalText    What the user actually typed (shown in chat)
   */
  const sendToAPI = useCallback(
    async (anonymizedText: string, mapping: ReplacementMapping, originalText: string) => {
      if (!anonymizedText.trim()) return;

      // -- 1. Add user message --
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: anonymizedText,
        timestamp: Date.now(),
        originalContent: Object.keys(mapping).length > 0 ? originalText : undefined,
      };
      addMessage(userMessage);

      if (Object.keys(mapping).length > 0) {
        updateReplacementMapping(mapping);
      }

      setInput('');
      setIsLoading(true);

      try {
        // -- 2. Build anonymized history & call API --
        const history = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        history.push({ role: 'user', content: anonymizedText });

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history }),
        });

        // -- 3. Process response --
        const data = await res.json();

        if (!res.ok) {
          const errorMsg = data?.error?.message || getHttpFallbackMessage(res.status);
          addMessage({
            id: generateId(),
            role: 'assistant',
            content: errorMsg,
            timestamp: Date.now(),
            isError: true,
          });
          return;
        }

        if (!data.response) {
          addMessage({
            id: generateId(),
            role: 'assistant',
            content: 'Received an empty response from the model. Please try again.',
            timestamp: Date.now(),
            isError: true,
          });
          return;
        }

        // Store the raw AI response (placeholders intact) — restoration happens at render time.
        addMessage({
          id: generateId(),
          role: 'assistant',
          content: data.response,
          timestamp: Date.now(),
        });
      } catch (error: unknown) {
        addMessage({
          id: generateId(),
          role: 'assistant',
          content: classifyFetchError(error),
          timestamp: Date.now(),
          isError: true,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [messages, addMessage, updateReplacementMapping]
  );

  /**
   * Entry point when the user presses Send.
   * Runs the guardrail check first; if sensitive info is found the modal opens,
   * otherwise sends directly.
   */
  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;

    const result = detectSensitiveInfo(input);
    if (result.hasSensitiveInfo) {
      setGuardrailData({ text: input, items: result.items });
    } else {
      sendToAPI(input, {}, input);
    }
  }, [input, isLoading, sendToAPI]);

  /**
   * Called when the user confirms replacements (or sends as-is) from the guardrail modal.
   */
  const handleGuardrailConfirm = useCallback(
    (processedText: string, mapping: ReplacementMapping) => {
      const originalText = guardrailData?.text || processedText;
      setGuardrailData(null);
      sendToAPI(processedText, mapping, originalText);
    },
    [sendToAPI, guardrailData]
  );

  /**
   * "Try Again" on an error: repopulate the input with the preceding user message
   * so the user can review / edit before re-sending through the full flow.
   */
  const handleRetry = useCallback(
    (errorMessageId: string) => {
      const errorIndex = messages.findIndex((m) => m.id === errorMessageId);
      if (errorIndex <= 0) return;

      for (let i = errorIndex - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          setInput(messages[i].originalContent || messages[i].content);
          inputRef.current?.focus();
          break;
        }
      }
    },
    [messages]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#101922] relative overflow-hidden">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101922]/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">General Chat</h2>
          {currentConversation && currentConversation.title !== 'New Conversation' && (
            <>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="text-sm text-slate-500 truncate max-w-xs">
                {currentConversation.title}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => createNewConversation()}
            className="text-sm font-medium text-brand-700 dark:text-primary px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            New Session
          </button>
        </div>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-8">
        {messages.length === 0 ? (
          <EmptyState
            onSuggestionClick={(text) => {
              setInput(text);
              inputRef.current?.focus();
            }}
          />
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.isError ? (
                  <ErrorBubble
                    message={msg}
                    onRetry={() => handleRetry(msg.id)}
                    isLoading={isLoading}
                  />
                ) : msg.role === 'assistant' ? (
                  <AssistantBubble
                    content={getDisplayContent(msg)}
                    messageId={msg.id}
                    hasMappablePlaceholders={messageHasMappablePlaceholders(msg)}
                    isRevealed={revealedMessageIds.has(msg.id)}
                    onToggleMapBack={() => toggleRevealMapped(msg.id)}
                  />
                ) : (
                  <UserBubble content={getDisplayContent(msg)} />
                )}
              </div>
            ))}

            {isLoading && <ThinkingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <footer className="p-6 pt-2 bg-gradient-to-t from-white via-white to-transparent dark:from-[#101922] dark:via-[#101922] dark:to-transparent shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:ring-opacity-20 focus-within:border-[var(--accent)] transition-all">
            {/* Toolbar */}
            <div className="flex items-center px-4 py-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="Attach file"
                >
                  <Paperclip size={18} />
                </button>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="Attach image"
                >
                  <ImageIcon size={18} />
                </button>
              </div>
            </div>

            {/* Textarea */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here..."
              className="w-full bg-transparent border-none focus:ring-0 p-6 min-h-[120px] resize-none text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none text-sm leading-relaxed"
              disabled={isLoading}
            />

            {/* Footer */}
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-xs text-slate-400">
                Press Enter to send, Shift+Enter for new line
              </span>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-brand-700 hover:bg-brand-800 dark:bg-primary dark:hover:bg-primary/80 text-white px-6 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-brand-700/20 dark:shadow-primary/20 disabled:opacity-40 disabled:shadow-none text-sm"
              >
                <span>{isLoading ? 'Sending...' : 'Send'}</span>
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-widest">
            AI can make mistakes. All data is securely processed where possible.
          </p>
        </div>
      </footer>

      {/* Guardrail Modal */}
      {guardrailData && (
        <GuardrailModal
          originalText={guardrailData.text}
          items={guardrailData.items}
          onConfirm={handleGuardrailConfirm}
          onCancel={() => setGuardrailData(null)}
        />
      )}
    </div>
  );
}

/* ====================================================================
   Sub-components
   ==================================================================== */

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore clipboard errors
      }
    },
    [text]
  );

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy'}
      className={`p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-ring ${className ?? ''}`}
      aria-label={copied ? 'Copied' : 'Copy message'}
    >
      {copied ? <Check size={14} className="text-green-600 dark:text-green-400" /> : <Copy size={14} />}
    </button>
  );
}

function EmptyState({}: { onSuggestionClick: (text: string) => void }) {
  return (
    <div className="flex items-start justify-center h-full pt-16">
      <div className="flex gap-6 max-w-2xl">
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
          <Bot size={20} className="text-brand-700 dark:text-primary" />
        </div>
        <div className="space-y-4">
          <div className="leading-relaxed">
            <p className="mb-4 text-base text-slate-800 dark:text-slate-200">
              Hello! I&apos;m your secure AI assistant. How can I help you today?
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              I&apos;ve initialized the{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                Privacy Guardrail System
              </strong>
              . You can safely discuss project details, and I will ensure sensitive
              identifiers like names, emails, and financial figures are handled with
              strict privacy protocols.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="group/user flex gap-4 flex-row-reverse">
      <div className="w-10 h-10 rounded-full bg-brand-700 dark:bg-primary flex items-center justify-center shrink-0">
        <User size={18} className="text-white" />
      </div>
      <div className="max-w-[80%] flex flex-col items-end gap-1.5">
        <div className="bg-brand-700 dark:bg-primary p-2.5 rounded-2xl border border-brand-700/20 dark:border-primary/20 shadow-sm">
          <p className="text-white leading-relaxed text-sm whitespace-pre-wrap">
            {content}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <CopyButton text={content} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

function AssistantBubble({
  content,
  messageId,
  hasMappablePlaceholders,
  isRevealed,
  onToggleMapBack,
}: {
  content: string;
  messageId: string;
  hasMappablePlaceholders: boolean;
  isRevealed: boolean;
  onToggleMapBack: () => void;
}) {
  return (
    <div className="group/assistant flex gap-4">
      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
        <Bot size={18} className="text-brand-700 dark:text-primary" />
      </div>
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        <div className="text-slate-800 dark:text-slate-200 leading-relaxed text-sm prose-custom">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {hasMappablePlaceholders && (
            <MapBackButton isRevealed={isRevealed} onToggle={onToggleMapBack} />
          )}
          <CopyButton text={content} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

function ErrorBubble({
  message,
  onRetry,
  isLoading,
}: {
  message: Message;
  onRetry: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="group/error flex gap-4">
      <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0 border border-red-200 dark:border-red-800/30">
        <AlertCircle size={18} className="text-red-600 dark:text-red-400" />
      </div>
      <div className="flex-1 relative">
        <div className="absolute top-0 right-0 opacity-60 group-hover/error:opacity-100 transition-opacity z-10">
          <CopyButton text={message.content} />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium border border-red-100 dark:border-red-800/30 mb-3">
          <AlertCircle size={12} />
          <span>Error occurred</span>
        </div>
        <p className="text-sm text-red-800 dark:text-red-300 leading-relaxed mb-3">
          {message.content}
        </p>
        <button
          onClick={onRetry}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors focus-ring disabled:opacity-50 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <RefreshCw size={12} />
          Try Again
        </button>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
        <Bot size={18} className="text-brand-700 dark:text-primary" />
      </div>
      <div className="flex items-center gap-3 py-2">
        <Loader2 size={16} className="animate-spin text-primary" />
        <span className="text-sm text-slate-500 dark:text-slate-400">Thinking...</span>
      </div>
    </div>
  );
}

/* ====================================================================
   Helpers
   ==================================================================== */

/** Provide a user-friendly message for network / fetch errors. */
function classifyFetchError(error: unknown): string {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  if (error instanceof SyntaxError) {
    return 'Received an invalid response from the server. Please try again.';
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'The request was cancelled. Please try again.';
  }
  return 'An unexpected error occurred. Please try again.';
}

/** Fallback message when the API returns an error without a body. */
function getHttpFallbackMessage(status: number): string {
  switch (status) {
    case 400:
      return 'The request was invalid. Please try rephrasing your message.';
    case 401:
      return 'Authentication failed. Please check your API key configuration.';
    case 403:
      return 'Access denied. Please verify your API key has the right permissions.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'The server encountered an error. Please try again later.';
    case 503:
      return 'The service is temporarily unavailable. Please try again later.';
    default:
      return `Something went wrong (HTTP ${status}). Please try again.`;
  }
}
