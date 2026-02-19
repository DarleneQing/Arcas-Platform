import { Conversation, Prompt, ReplacementMapping } from '@/types';

const KEYS = {
  CONVERSATIONS: 'arcas_conversations',
  CURRENT_ID: 'arcas_current_conversation_id',
  PROMPTS: 'arcas_custom_prompts',
  THEME: 'arcas_theme',
  MAPPINGS: 'arcas_replacement_mappings',
} as const;

function get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('localStorage write failed:', err);
  }
}

/* ---------- Conversations ---------- */

export function getConversations(): Conversation[] {
  return get<Conversation[]>(KEYS.CONVERSATIONS, []);
}

export function saveConversations(conversations: Conversation[]): void {
  set(KEYS.CONVERSATIONS, conversations);
}

export function getCurrentConversationId(): string | null {
  return get<string | null>(KEYS.CURRENT_ID, null);
}

export function saveCurrentConversationId(id: string | null): void {
  set(KEYS.CURRENT_ID, id);
}

/* ---------- Custom Prompts ---------- */

export function getCustomPrompts(): Prompt[] {
  return get<Prompt[]>(KEYS.PROMPTS, []);
}

export function saveCustomPrompts(prompts: Prompt[]): void {
  set(KEYS.PROMPTS, prompts);
}

/* ---------- Theme ---------- */

export function getTheme(): 'light' | 'dark' {
  return get<'light' | 'dark'>(KEYS.THEME, 'light');
}

export function saveTheme(theme: 'light' | 'dark'): void {
  set(KEYS.THEME, theme);
}

/* ---------- Replacement Mappings ---------- */

export function getReplacementMappings(): Record<string, ReplacementMapping> {
  return get<Record<string, ReplacementMapping>>(KEYS.MAPPINGS, {});
}

export function saveReplacementMapping(
  conversationId: string,
  mapping: ReplacementMapping
): void {
  const all = getReplacementMappings();
  all[conversationId] = { ...all[conversationId], ...mapping };
  set(KEYS.MAPPINGS, all);
}

/* ---------- Utility ---------- */

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}
