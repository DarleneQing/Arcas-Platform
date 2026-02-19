export type TabType = 'chat' | 'email' | 'translation' | 'summarize' | 'prompts';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  originalContent?: string;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  replacementMappings: ReplacementMapping;
}

export interface SensitiveItem {
  id: string;
  type: SensitiveInfoType;
  label: string;
  original: string;
  replacement: string;
  startIndex: number;
  endIndex: number;
  ignored: boolean;
}

export type SensitiveInfoType =
  | 'email'
  | 'phone'
  | 'credit_card'
  | 'ssn'
  | 'name'
  | 'address'
  | 'api_key'
  | 'password'
  | 'username'
  | 'ip_address'
  | 'date_of_birth'
  | 'bank_reference'
  | 'medical_reference';

export interface ReplacementMapping {
  [placeholder: string]: string;
}

export interface GuardrailResult {
  hasSensitiveInfo: boolean;
  items: SensitiveItem[];
  anonymizedText: string;
}

export interface Prompt {
  id: string;
  title: string;
  description: string;
  text: string;
  category: PromptCategory;
  isCustom: boolean;
  liked: boolean;
  likeCount: number;
  tags: string[];
  createdAt: number;
}

export type PromptCategory = 'writing' | 'productivity' | 'learning' | 'creative';
export type EmailMode = 'write' | 'polish';
export type EmailTone = 'professional' | 'friendly' | 'formal' | 'casual' | 'persuasive';
export type EmailEnhancement = 'clarity' | 'conciseness' | 'grammar_check' | 'persuasiveness';
export type SummaryLength = 'short' | 'medium' | 'long';
export type SummaryType = 'general' | 'key-points' | 'executive';
export type SummarizeInputMethod = 'paste' | 'upload';
