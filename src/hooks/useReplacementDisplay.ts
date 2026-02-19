'use client';

import { useState, useCallback, useMemo } from 'react';
import { ReplacementMapping } from '@/types';
import { hasMappablePlaceholders as hasMappable, restoreOriginals } from '@/lib/guardrail';

export interface UseReplacementDisplayReturn {
  replacementMapping: ReplacementMapping;
  setReplacementMapping: (mapping: ReplacementMapping) => void;
  revealed: boolean;
  setRevealed: (value: boolean) => void;
  toggleRevealed: () => void;
  /** Call when user confirms guardrail (sets mapping and resets revealed). */
  applyGuardrailMapping: (mapping: ReplacementMapping) => void;
  /** Call when clearing output (e.g. mode switch) to reset mapping and revealed. */
  reset: () => void;
  getDisplayContent: (content: string) => string;
  hasMappablePlaceholders: (content: string) => boolean;
}

export function useReplacementDisplay(): UseReplacementDisplayReturn {
  const [replacementMapping, setReplacementMapping] = useState<ReplacementMapping>({});
  const [revealed, setRevealed] = useState(false);

  const applyGuardrailMapping = useCallback((mapping: ReplacementMapping) => {
    setReplacementMapping(mapping);
    setRevealed(false);
  }, []);

  const reset = useCallback(() => {
    setReplacementMapping({});
    setRevealed(false);
  }, []);

  const toggleRevealed = useCallback(() => {
    setRevealed((r) => !r);
  }, []);

  const getDisplayContent = useCallback(
    (content: string): string => {
      const contentHasMappable = hasMappable(content, replacementMapping);
      if (contentHasMappable && revealed) {
        return restoreOriginals(content, replacementMapping);
      }
      return content;
    },
    [replacementMapping, revealed]
  );

  const hasMappablePlaceholders = useCallback(
    (content: string): boolean => hasMappable(content, replacementMapping),
    [replacementMapping]
  );

  return useMemo(
    () => ({
      replacementMapping,
      setReplacementMapping,
      revealed,
      setRevealed,
      toggleRevealed,
      applyGuardrailMapping,
      reset,
      getDisplayContent,
      hasMappablePlaceholders,
    }),
    [
      replacementMapping,
      revealed,
      toggleRevealed,
      applyGuardrailMapping,
      reset,
      getDisplayContent,
      hasMappablePlaceholders,
    ]
  );
}
