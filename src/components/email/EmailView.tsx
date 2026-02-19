'use client';

import React, { useState, useCallback } from 'react';
import { Wand2, Sparkles, Copy, Check, Loader2, ArrowLeftRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { EmailMode, EmailTone, EmailEnhancement, SensitiveItem, ReplacementMapping } from '@/types';
import { detectSensitiveInfo } from '@/lib/guardrail';
import GuardrailModal from '@/components/guardrail/GuardrailModal';
import MapBackButton from '@/components/guardrail/MapBackButton';
import { useReplacementDisplay } from '@/hooks/useReplacementDisplay';

const TONES: { value: EmailTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'persuasive', label: 'Persuasive' },
];

const ENHANCEMENTS: { value: EmailEnhancement; label: string }[] = [
  { value: 'clarity', label: 'Clarity' },
  { value: 'conciseness', label: 'Conciseness' },
  { value: 'grammar_check', label: 'Grammar check' },
  { value: 'persuasiveness', label: 'Persuasiveness' },
];

export default function EmailView() {
  const [mode, setMode] = useState<EmailMode>('write');
  const [tone, setTone] = useState<EmailTone>('professional');
  const [enhancements, setEnhancements] = useState<EmailEnhancement[]>([]);

  // Write mode fields
  const [body, setBody] = useState('');

  // Polish mode fields
  const [polishInput, setPolishInput] = useState('');

  // Shared state
  const [result, setResult] = useState('');
  const replacement = useReplacementDisplay();
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [guardrailData, setGuardrailData] = useState<{
    text: string;
    items: SensitiveItem[];
    action: 'generate' | 'polish';
  } | null>(null);

  const getInputText = useCallback(() => {
    if (mode === 'write') return body;
    return polishInput;
  }, [mode, body, polishInput]);

  const callAPI = useCallback(
    async (text: string) => {
      setIsLoading(true);
      setResult('');
      try {
        const res = await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, content: text, tone, to: '', subject: '', enhancements }),
        });
        const data = await res.json();
        setResult(data.result || 'Failed to generate email.');
      } catch {
        setResult('An error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [mode, tone, enhancements]
  );

  const handleAction = useCallback(() => {
    const text = getInputText();
    if (!text.trim()) return;

    const detection = detectSensitiveInfo(text);
    if (detection.hasSensitiveInfo) {
      setGuardrailData({
        text,
        items: detection.items,
        action: mode === 'write' ? 'generate' : 'polish',
      });
    } else {
      callAPI(text);
    }
  }, [getInputText, mode, callAPI]);

  const handleGuardrailConfirm = useCallback(
    (processedText: string, mapping: ReplacementMapping) => {
      setGuardrailData(null);
      replacement.applyGuardrailMapping(mapping);
      callAPI(processedText);
    },
    [callAPI, replacement.applyGuardrailMapping]
  );

  const displayResult = replacement.getDisplayContent(result);
  const hasMappablePlaceholders = replacement.hasMappablePlaceholders(result);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(displayResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [displayResult]);

  const isInputValid = mode === 'write' ? body.trim().length > 0 : polishInput.trim().length > 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="w-full px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Email Assistant
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Write new emails or polish existing ones with AI assistance.
          </p>
        </div>

        {/* Mode Toggle */}
        <div
          className="inline-flex rounded-xl p-1 mb-6"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          {(['write', 'polish'] as EmailMode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setResult('');
                replacement.reset();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 focus-ring"
              style={{
                background: mode === m ? 'var(--bg-primary)' : 'transparent',
                color: mode === m ? 'var(--accent)' : 'var(--text-secondary)',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {m === 'write' ? <Wand2 size={15} /> : <Sparkles size={15} />}
              {m === 'write' ? 'Write Email' : 'Polish Email'}
            </button>
          ))}
        </div>

        {/* Tone Selector */}
        <div className="mb-5">
          <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Tone
          </label>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTone(t.value)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 focus-ring"
                style={{
                  background: tone === t.value ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: tone === t.value ? '#FFFFFF' : 'var(--text-secondary)',
                  border: `1px solid ${tone === t.value ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Enhancement (Polish mode only) */}
        {mode === 'polish' && (
          <div className="mb-5">
            <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Enhancement
            </label>
            <div className="flex flex-wrap gap-2">
              {ENHANCEMENTS.map((e) => {
                const isSelected = enhancements.includes(e.value);
                return (
                  <button
                    key={e.value}
                    onClick={() => {
                      setEnhancements((prev) =>
                        isSelected ? prev.filter((x) => x !== e.value) : [...prev, e.value]
                      );
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 focus-ring"
                    style={{
                      background: isSelected ? 'var(--accent)' : 'var(--bg-secondary)',
                      color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    {e.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Two columns: instruction (left) | result (right) - content areas use same height */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 lg:items-start">
          {/* Left: Instruction area (fixed height) + button in separate div */}
          <div className="flex-1 min-w-0 lg:max-w-[50%] flex flex-col">
            {/* Instruction / input area only - same height as result box on the right */}
            {mode === 'write' ? (
              <div className="flex flex-col mb-4">
                <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  Instruction
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Describe your email: What should this email achieve? Who is it for? What key points should be included?"
                  className="w-full min-h-[240px] px-4 py-3 rounded-xl text-sm outline-none resize-none transition-colors border border-[var(--border)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-20"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col mb-4">
                <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  Paste your email
                </label>
                <textarea
                  value={polishInput}
                  onChange={(e) => setPolishInput(e.target.value)}
                  placeholder="Paste the email you'd like to improve..."
                  className="w-full min-h-[240px] px-4 py-3 rounded-xl text-sm outline-none resize-none transition-colors focus-ring"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            )}

            {/* Generate / Polish button in its own div, outside instruction */}
            <div className="shrink-0">
              <button
                onClick={handleAction}
                disabled={!isInputValid || isLoading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-150 focus-ring disabled:opacity-40"
                style={{ background: 'var(--accent)' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {mode === 'write' ? 'Generating...' : 'Polishing...'}
                  </>
                ) : (
                  <>
                    {mode === 'write' ? <Wand2 size={16} /> : <Sparkles size={16} />}
                    {mode === 'write' ? 'Generate Email' : 'Polish Email'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Result (always visible) - same height as instruction area */}
          <div className="flex-1 min-w-0 lg:min-w-[320px] flex flex-col">
            <div className="flex items-center justify-between mb-1.5 shrink-0">
              <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                {mode === 'write' ? 'Generated Email' : 'Polished Email'}
              </h3>
              {result && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-ring"
                  style={{
                    background: copied ? 'var(--success-bg)' : 'var(--bg-secondary)',
                    color: copied ? 'var(--success-text)' : 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
            <div
              className="rounded-2xl p-6 text-sm leading-relaxed prose-custom min-h-[240px]"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{mode === 'write' ? 'Generating email...' : 'Polishing email...'}</span>
                </div>
              ) : result ? (
                <>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayResult}</ReactMarkdown>
                  {hasMappablePlaceholders && (
                    <div className="mt-3">
                      <MapBackButton
                        isRevealed={replacement.revealed}
                        onToggle={replacement.toggleRevealed}
                        style={{ color: 'var(--text-secondary)' }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  Your generated or polished email will appear here.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

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
