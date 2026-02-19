'use client';

import React, { useState, useCallback } from 'react';
import { ShieldAlert, ArrowRight, X, Check, Eye } from 'lucide-react';
import { SensitiveItem, ReplacementMapping } from '@/types';
import { applyReplacements, buildReplacementMapping } from '@/lib/guardrail';

interface GuardrailModalProps {
  originalText: string;
  items: SensitiveItem[];
  onConfirm: (processedText: string, mapping: ReplacementMapping) => void;
  onCancel: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  email: '#3B82F6',
  phone: '#8B5CF6',
  credit_card: '#EF4444',
  ssn: '#DC2626',
  name: '#F59E0B',
  address: '#10B981',
  api_key: '#EC4899',
  password: '#EF4444',
  username: '#6366F1',
  ip_address: '#0EA5E9',
  date_of_birth: '#F97316',
  bank_reference: '#059669',
  medical_reference: '#BE185D',
};

export default function GuardrailModal({
  originalText,
  items: initialItems,
  onConfirm,
  onCancel,
}: GuardrailModalProps) {
  const [items, setItems] = useState<SensitiveItem[]>(initialItems);

  const toggleItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ignored: !item.ignored } : item
      )
    );
  }, []);

  const handleReplaceAllAndSend = useCallback(() => {
    const processed = applyReplacements(originalText, items);
    const mapping = buildReplacementMapping(items);
    onConfirm(processed, mapping);
  }, [originalText, items, onConfirm]);

  const handleSendWithoutChanges = useCallback(() => {
    onConfirm(originalText, {});
  }, [originalText, onConfirm]);

  const activeCount = items.filter((i) => !i.ignored).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-6 py-4"
          style={{ background: 'var(--warning-bg)', borderBottom: '1px solid var(--warning-border)' }}
        >
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full"
            style={{ background: 'var(--warning-border)', color: '#FFFFFF' }}
          >
            <ShieldAlert size={20} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold" style={{ color: 'var(--warning-text)' }}>
              Sensitive Information Detected
            </h2>
            <p className="text-sm mt-0.5 opacity-80" style={{ color: 'var(--warning-text)' }}>
              We found information that might be private. Review below.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg transition-colors hover:opacity-70 focus-ring"
            style={{ color: 'var(--warning-text)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="px-6 py-4 max-h-80 overflow-y-auto space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-xl transition-all duration-150"
              style={{
                background: item.ignored ? 'transparent' : 'var(--bg-secondary)',
                border: `1px solid ${item.ignored ? 'var(--border)' : 'var(--border)'}`,
                opacity: item.ignored ? 0.5 : 1,
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ background: TYPE_COLORS[item.type] || '#6B7280' }}
                  >
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <code
                    className="px-2 py-0.5 rounded text-xs font-mono break-all"
                    style={{
                      background: item.ignored ? 'transparent' : '#FEE2E2',
                      color: '#991B1B',
                      textDecoration: item.ignored ? 'none' : 'none',
                    }}
                  >
                    {item.original}
                  </code>
                  {!item.ignored && (
                    <>
                      <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} className="shrink-0" />
                      <code
                        className="px-2 py-0.5 rounded text-xs font-mono"
                        style={{ background: '#DCFCE7', color: '#166534' }}
                      >
                        {item.replacement}
                      </code>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => toggleItem(item.id)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-ring"
                style={{
                  background: item.ignored ? 'var(--accent-light)' : 'transparent',
                  color: item.ignored ? 'var(--accent)' : 'var(--text-tertiary)',
                  border: '1px solid var(--border)',
                }}
              >
                {item.ignored ? (
                  <>
                    <Eye size={13} />
                    Ignored
                  </>
                ) : (
                  <>
                    <Check size={13} />
                    Replace
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3 px-6 py-4"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
        >
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {activeCount} of {items.length} items will be replaced
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-ring"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              Cancel
            </button>
            {activeCount < items.length && (
              <button
                onClick={handleSendWithoutChanges}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-ring"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
              >
                Send As-Is
              </button>
            )}
            <button
              onClick={handleReplaceAllAndSend}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors focus-ring"
              style={{ background: 'var(--accent)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
            >
              {activeCount > 0 ? 'Replace & Send' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
