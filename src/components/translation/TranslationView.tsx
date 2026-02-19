'use client';

import React, { useState, useCallback } from 'react';
import { Languages, Copy, Check, Loader2, ArrowRightLeft } from 'lucide-react';
import { SensitiveItem, ReplacementMapping } from '@/types';
import { detectSensitiveInfo } from '@/lib/guardrail';
import GuardrailModal from '@/components/guardrail/GuardrailModal';
import MapBackButton from '@/components/guardrail/MapBackButton';
import { useReplacementDisplay } from '@/hooks/useReplacementDisplay';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'it', name: 'Italian' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
  { code: 'id', name: 'Indonesian' },
  { code: 'uk', name: 'Ukrainian' },
];

const MAX_CHARS = 5000;

const SOURCE_AUTO = '';

export default function TranslationView() {
  const [sourceText, setSourceText] = useState('');
  const [domain, setDomain] = useState('');
  const [sourceLang, setSourceLang] = useState(SOURCE_AUTO);
  const [targetLang, setTargetLang] = useState('es');
  const [detectedLang, setDetectedLang] = useState('');
  const [translation, setTranslation] = useState('');
  const replacement = useReplacementDisplay();
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [guardrailData, setGuardrailData] = useState<{
    text: string;
    items: SensitiveItem[];
  } | null>(null);

  const callAPI = useCallback(
    async (text: string) => {
      setIsLoading(true);
      setTranslation('');
      try {
        const targetName = LANGUAGES.find((l) => l.code === targetLang)?.name ?? targetLang;
        const sourceName = sourceLang ? LANGUAGES.find((l) => l.code === sourceLang)?.name : undefined;
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            targetLanguage: targetName,
            sourceLanguage: sourceName,
            domain: domain.trim() || undefined,
          }),
        });
        const data = await res.json();
        setTranslation(data.translation || 'Translation failed.');
        if (data.detectedLanguage) setDetectedLang(data.detectedLanguage);
      } catch {
        setTranslation('An error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [targetLang, sourceLang, domain]
  );

  const handleTranslate = useCallback(() => {
    if (!sourceText.trim()) return;

    const detection = detectSensitiveInfo(sourceText);
    if (detection.hasSensitiveInfo) {
      setGuardrailData({ text: sourceText, items: detection.items });
    } else {
      callAPI(sourceText);
    }
  }, [sourceText, callAPI]);

  const handleGuardrailConfirm = useCallback(
    (processedText: string, mapping: ReplacementMapping) => {
      setGuardrailData(null);
      replacement.applyGuardrailMapping(mapping);
      callAPI(processedText);
    },
    [callAPI, replacement.applyGuardrailMapping]
  );

  const displayTranslation = replacement.getDisplayContent(translation);
  const hasMappablePlaceholders = replacement.hasMappablePlaceholders(translation);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(displayTranslation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [displayTranslation]);

  const handleSwap = useCallback(() => {
    if (sourceLang === SOURCE_AUTO) return;
    setTargetLang(sourceLang);
    setSourceLang(targetLang);
    if (translation) {
      setSourceText(translation);
      setTranslation('');
      setDetectedLang('');
    }
  }, [sourceLang, targetLang, translation]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Translation
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Translate text between languages with automatic source language detection.
          </p>
        </div>

        {/* Language selectors */}
        <div className="flex items-center gap-3 mb-4">
          <select
            value={sourceLang}
            onChange={(e) => {
              setSourceLang(e.target.value);
              if (!e.target.value) setDetectedLang('');
            }}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none cursor-pointer focus-ring"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <option value={SOURCE_AUTO}>
              {detectedLang ? `Auto-detect (${detectedLang})` : 'Auto-detect language'}
            </option>
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleSwap}
            disabled={sourceLang === SOURCE_AUTO}
            className="p-2.5 rounded-xl transition-colors focus-ring disabled:opacity-30"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            title="Swap languages"
          >
            <ArrowRightLeft size={16} />
          </button>

          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none cursor-pointer focus-ring"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Optional domain/industry for more precise translation */}
        <div className="mb-4">
          <label htmlFor="translation-domain" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Domain / industry / field <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>(optional)</span>
          </label>
          <input
            id="translation-domain"
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="e.g. medical, legal, technical, marketing"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors focus-ring"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Translation panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 items-stretch">
          {/* Source */}
          <div className="relative min-h-[240px]">
            <textarea
              value={sourceText}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) setSourceText(e.target.value);
              }}
              placeholder="Enter text to translate..."
              className="w-full h-full min-h-[240px] px-4 py-3 rounded-2xl text-sm outline-none resize-none transition-colors border border-[var(--border)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-20"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
              }}
            />
            <div className="absolute bottom-3 right-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {sourceText.length}/{MAX_CHARS}
            </div>
          </div>

          {/* Target */}
          <div className="relative min-h-[240px]">
            <div
              className="w-full h-full min-h-[240px] px-4 py-3 rounded-2xl text-sm box-border"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Translating...</span>
                </div>
              ) : translation ? (
                <div>
                  <p className="whitespace-pre-wrap leading-relaxed">{displayTranslation}</p>
                  {hasMappablePlaceholders && (
                    <div className="mt-3">
                      <MapBackButton
                        isRevealed={replacement.revealed}
                        onToggle={replacement.toggleRevealed}
                        style={{ color: 'var(--text-secondary)' }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <span style={{ color: 'var(--text-tertiary)' }}>Translation will appear here...</span>
              )}
            </div>
            {translation && !isLoading && (
              <button
                onClick={handleCopy}
                className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors focus-ring"
                style={{
                  background: copied ? 'var(--success-bg)' : 'var(--bg-primary)',
                  color: copied ? 'var(--success-text)' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
        </div>

        {/* Translate Button */}
        <button
          onClick={handleTranslate}
          disabled={!sourceText.trim() || isLoading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-150 focus-ring disabled:opacity-40"
          style={{ background: 'var(--accent)' }}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Translating...
            </>
          ) : (
            <>
              <Languages size={16} />
              Translate
            </>
          )}
        </button>
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
