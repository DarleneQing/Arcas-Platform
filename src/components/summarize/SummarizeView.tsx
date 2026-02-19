'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  FileText,
  Upload,
  ClipboardPaste,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  X,
  File,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SummaryLength, SummarizeInputMethod, SensitiveItem, ReplacementMapping } from '@/types';
import { detectSensitiveInfo } from '@/lib/guardrail';
import GuardrailModal from '@/components/guardrail/GuardrailModal';
import MapBackButton from '@/components/guardrail/MapBackButton';
import { useReplacementDisplay } from '@/hooks/useReplacementDisplay';

const SUMMARY_LENGTHS: { value: SummaryLength; label: string; desc: string }[] = [
  { value: 'short', label: 'Short', desc: '2-3 sentences' },
  { value: 'medium', label: 'Medium', desc: '1 paragraph' },
  { value: 'long', label: 'Long', desc: 'Multiple paragraphs' },
];

const MAX_CHARS = 50000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = '.txt,.pdf,.docx';

export default function SummarizeView() {
  const [inputMethod, setInputMethod] = useState<SummarizeInputMethod>('paste');
  const [text, setText] = useState('');
  const [summaryLength, setSummaryLength] = useState<SummaryLength>('medium');
  const [summary, setSummary] = useState('');
  const replacement = useReplacementDisplay();
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [extractingText, setExtractingText] = useState(false);
  const [guardrailData, setGuardrailData] = useState<{
    text: string;
    items: SensitiveItem[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromFile = useCallback(async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'txt') {
      return await file.text();
    }

    if (ext === 'pdf' || ext === 'docx') {
      // Send to server for text extraction
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data.text;
    }

    throw new Error('Unsupported file type');
  }, []);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setFileError('');
      setFileName('');
      setText('');

      if (file.size > MAX_FILE_SIZE) {
        setFileError('File is too large. Maximum size is 10MB.');
        return;
      }

      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['txt', 'pdf', 'docx'].includes(ext || '')) {
        setFileError('Unsupported file type. Please use .txt, .pdf, or .docx');
        return;
      }

      setFileName(file.name);
      setExtractingText(true);

      try {
        const extractedText = await extractTextFromFile(file);
        if (extractedText.length > MAX_CHARS) {
          setText(extractedText.slice(0, MAX_CHARS));
          setFileError(`Text was truncated to ${MAX_CHARS.toLocaleString()} characters.`);
        } else {
          setText(extractedText);
        }
      } catch (err) {
        setFileError('Failed to extract text from file. Please try a different file.');
        setFileName('');
      } finally {
        setExtractingText(false);
      }
    },
    [extractTextFromFile]
  );

  const callAPI = useCallback(
    async (inputText: string) => {
      setIsLoading(true);
      setSummary('');
      try {
        const res = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: inputText, length: summaryLength }),
        });
        const data = await res.json();
        setSummary(data.summary || 'Failed to generate summary.');
      } catch {
        setSummary('An error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [summaryLength]
  );

  const handleSummarize = useCallback(() => {
    if (!text.trim()) return;

    const detection = detectSensitiveInfo(text);
    if (detection.hasSensitiveInfo) {
      setGuardrailData({ text, items: detection.items });
    } else {
      callAPI(text);
    }
  }, [text, callAPI]);

  const handleGuardrailConfirm = useCallback(
    (processedText: string, mapping: ReplacementMapping) => {
      setGuardrailData(null);
      replacement.applyGuardrailMapping(mapping);
      callAPI(processedText);
    },
    [callAPI, replacement.applyGuardrailMapping]
  );

  const displaySummary = replacement.getDisplayContent(summary);
  const hasMappablePlaceholders = replacement.hasMappablePlaceholders(summary);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(displaySummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [displaySummary]);

  const handleRegenerate = useCallback(() => {
    if (text.trim()) callAPI(text);
  }, [text, callAPI]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Summarize
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Get concise summaries of text or documents.
          </p>
        </div>

        {/* Input Method Toggle */}
        <div
          className="inline-flex rounded-xl p-1 mb-6"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          {([
            { id: 'paste' as const, label: 'Paste Text', icon: ClipboardPaste },
            { id: 'upload' as const, label: 'Upload Document', icon: Upload },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setInputMethod(id);
                setText('');
                setFileName('');
                setFileError('');
                setSummary('');
                replacement.reset();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 focus-ring"
              style={{
                background: inputMethod === id ? 'var(--bg-primary)' : 'transparent',
                color: inputMethod === id ? 'var(--accent)' : 'var(--text-secondary)',
                boxShadow: inputMethod === id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Input Area */}
        {inputMethod === 'paste' ? (
          <div className="relative mb-6">
            <textarea
              value={text}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) setText(e.target.value);
              }}
              placeholder="Paste the text you'd like to summarize..."
              rows={12}
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none transition-colors border border-[var(--border)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-20"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
              }}
            />
            <div className="absolute bottom-3 right-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {text.length.toLocaleString()}/{MAX_CHARS.toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileUpload}
              className="hidden"
            />
            {!fileName ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-3 py-12 rounded-2xl transition-colors cursor-pointer"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '2px dashed var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <Upload size={32} style={{ color: 'var(--text-tertiary)' }} />
                <div className="text-center">
                  <p className="text-sm font-medium">Click to upload a document</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    Supports .txt, .pdf, .docx (max 10MB)
                  </p>
                </div>
              </button>
            ) : (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              >
                <File size={20} style={{ color: 'var(--accent)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {fileName}
                  </p>
                  {extractingText && (
                    <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                      <Loader2 size={10} className="animate-spin" /> Extracting text...
                    </p>
                  )}
                  {text && !extractingText && (
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {text.length.toLocaleString()} characters extracted
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setFileName('');
                    setText('');
                    setFileError('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="p-1 rounded-lg transition-colors focus-ring"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {fileError && (
              <p className="text-xs mt-2" style={{ color: 'var(--error-text)' }}>
                {fileError}
              </p>
            )}
          </div>
        )}

        {/* Summary Length */}
        <div className="mb-6">
          <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Summary Length
          </label>
          <div className="flex gap-2">
            {SUMMARY_LENGTHS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSummaryLength(opt.value)}
                className="flex-1 px-4 py-3 rounded-xl text-center transition-all duration-150 focus-ring"
                style={{
                  background: summaryLength === opt.value ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: summaryLength === opt.value ? '#FFFFFF' : 'var(--text-secondary)',
                  border: `1px solid ${summaryLength === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs mt-0.5 opacity-70">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Summarize Button */}
        <button
          onClick={handleSummarize}
          disabled={!text.trim() || isLoading || extractingText}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-150 focus-ring disabled:opacity-40"
          style={{ background: 'var(--accent)' }}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Summarizing...
            </>
          ) : (
            <>
              <FileText size={16} />
              Summarize
            </>
          )}
        </button>

        {/* Summary Output */}
        {summary && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                Summary
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRegenerate}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus-ring"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <RefreshCw size={13} />
                  Regenerate
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus-ring"
                  style={{
                    background: copied ? 'var(--success-bg)' : 'var(--bg-secondary)',
                    color: copied ? 'var(--success-text)' : 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div
              className="rounded-2xl p-6 text-sm leading-relaxed prose-custom"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{displaySummary}</ReactMarkdown>
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
          </div>
        )}
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
