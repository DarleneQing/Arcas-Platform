import { SensitiveItem, SensitiveInfoType, GuardrailResult, ReplacementMapping } from '@/types';

interface DetectionPattern {
  type: SensitiveInfoType;
  label: string;
  pattern: RegExp;
  prefix: string;
}

const DETECTION_PATTERNS: DetectionPattern[] = [
  // Email first (high precision, avoid overlapping with other tokens)
  {
    type: 'email',
    label: 'Email Address',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    prefix: 'EMAIL',
  },
  {
    type: 'credit_card',
    label: 'Credit Card Number',
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    prefix: 'CREDIT_CARD',
  },
  {
    type: 'ssn',
    label: 'Social Security Number',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    prefix: 'SSN',
  },
  {
    type: 'api_key',
    label: 'API Key',
    pattern: /\b(?:sk|api|key|token|secret)[-_][a-zA-Z0-9]{16,}\b/gi,
    prefix: 'API_KEY',
  },
  {
    type: 'password',
    label: 'Password / Credential',
    pattern: /(?:password|passwd|pwd|secret|credential)[\s]*[:=][\s]*\S+/gi,
    prefix: 'PASSWORD',
  },
  // International phone: +country (1–3 digits) then groups of 2–4 digits with spaces/dots/dashes
  {
    type: 'phone',
    label: 'Phone Number',
    pattern: /\+\d{1,3}[\s.-]?(?:\d[\s.-]?){8,14}\d\b|(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    prefix: 'PHONE',
  },
  // European-style: "Bahnhofstrasse 12, 8001 Zurich, Switzerland" (street name + number + postal + city)
  {
    type: 'address',
    label: 'Physical Address',
    pattern: /\b[A-Za-zäöüßÄÖÜ][A-Za-zäöüßÄÖÜ\w]*(?:strasse|straße|platz|weg|gasse|street|road|avenue)\s+\d{1,5},\s*\d{4,6}\s+[A-Za-zäöüßÄÖÜ][A-Za-zäöüßÄÖÜ\s]*(?:,\s*[A-Za-zäöüßÄÖÜ\s]+)?/gi,
    prefix: 'ADDRESS',
  },
  // US-style: "123 Main Street, City, ST 12345"
  {
    type: 'address',
    label: 'Physical Address',
    pattern: /\b\d{1,5}\s+[A-Z][a-zA-ZäöüßÄÖÜ]*(?:\s+[A-Za-zäöüßÄÖÜ]+)*\s+(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Dr(?:ive)?|Rd|Road|Ln|Lane|Way|Ct|Court|Pl(?:ace)?|Cir(?:cle)?)\.?(?:\s*,?\s*[A-Z][a-zA-Z\s]*,?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)?/g,
    prefix: 'ADDRESS',
  },
  // Number first: "12, 8001 City, Country"
  {
    type: 'address',
    label: 'Physical Address',
    pattern: /\b\d{1,5}\s+[A-Za-zäöüßÄÖÜ][A-Za-zäöüßÄÖÜ\s]*,\s*\d{4,6}\s+[A-Za-zäöüßÄÖÜ][A-Za-zäöüßÄÖÜ\s]*(?:,\s*[A-Za-zäöüßÄÖÜ\s]+)?/g,
    prefix: 'ADDRESS',
  },
  // Personal name: "First Last" (2+ capitalized words, optional umlauts) or "Title First Last"
  {
    type: 'name',
    label: 'Personal Name',
    pattern: /\b(?:Mr|Mrs|Ms|Miss|Dr|Prof)\.?\s+[A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)+\b/g,
    prefix: 'NAME',
  },
  {
    type: 'name',
    label: 'Personal Name',
    pattern: /\b[A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)+\b(?=\s*[,.]?\s*(?:born|lives|works|can be reached|logs in|was|is|has|her|his)\b)/g,
    prefix: 'NAME',
  },
  // Username: after "username " — must contain digit, underscore, dot, or hyphen to avoid "and"/"daily" etc.
  {
    type: 'username',
    label: 'Username',
    pattern: /(?<=username\s+)[a-zA-Z0-9]*[\d_.-][a-zA-Z0-9_.-]{1,30}\b/gi,
    prefix: 'USERNAME',
  },
  // Username: token before " from"/" using" (e.g. "jmueller96 from") — same rule
  {
    type: 'username',
    label: 'Username',
    pattern: /\b[a-zA-Z0-9]*[\d_.-][a-zA-Z0-9_.-]{1,30}\b(?=\s+(?:from|to|@|logs|using)\s)/gi,
    prefix: 'USERNAME',
  },
  // Username: "using the username X" — same rule
  {
    type: 'username',
    label: 'Username',
    pattern: /(?<=using\s+the\s+username\s+)[a-zA-Z0-9]*[\d_.-][a-zA-Z0-9_.-]{1,29}\b/gi,
    prefix: 'USERNAME',
  },
  // IPv4 address
  {
    type: 'ip_address',
    label: 'IP Address',
    pattern: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|1?\d\d?)\b/g,
    prefix: 'IP_ADDRESS',
  },
  // Date of birth: "14 March 1996", "March 14, 1996", "14.03.1996", "1996-03-14"
  {
    type: 'date_of_birth',
    label: 'Date of Birth',
    pattern: /\b(?:born\s+on\s+)?\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
    prefix: 'DOB',
  },
  {
    type: 'date_of_birth',
    label: 'Date of Birth',
    pattern: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/g,
    prefix: 'DOB',
  },
  {
    type: 'date_of_birth',
    label: 'Date of Birth',
    pattern: /\b\d{4}-\d{2}-\d{2}\b/g,
    prefix: 'DOB',
  },
  {
    type: 'date_of_birth',
    label: 'Date of Birth',
    pattern: /\b\d{1,2}[./]\d{1,2}[./]\d{4}\b/g,
    prefix: 'DOB',
  },
  // Bank / financial reference
  {
    type: 'bank_reference',
    label: 'Bank / Account Reference',
    pattern: /\b(?:bank\s+account|account\s+at\s+(?:a\s+)?(?:Swiss|local|their)\s+bank)\b/gi,
    prefix: 'BANK_REF',
  },
  // Medical / health reference
  {
    type: 'medical_reference',
    label: 'Medical / Health Reference',
    pattern: /\b(?:health\s+insurance\s+records?|medical\s+(?:visits?|records?|history)|patient\s+information)\b/gi,
    prefix: 'MEDICAL_REF',
  },
];

function rangesOverlap(
  a: [number, number],
  b: [number, number]
): boolean {
  return a[0] < b[1] && b[0] < a[1];
}

/** Common words that must never be flagged as usernames (avoids over-catch). */
const USERNAME_BLOCKLIST = new Set([
  'and', 'the', 'her', 'his', 'from', 'to', 'for', 'are', 'can', 'has', 'had', 'not', 'you', 'your',
  'daily', 'weekly', 'monthly', 'yearly', 'only', 'just', 'with', 'using', 'logs', 'log', 'into',
  'out', 'all', 'any', 'new', 'old', 'own', 'see', 'way', 'how', 'who', 'what', 'when', 'where',
  'may', 'will', 'would', 'could', 'should', 'about', 'after', 'before', 'between', 'under',
]);

function looksLikeUsername(token: string): boolean {
  if (USERNAME_BLOCKLIST.has(token.toLowerCase())) return false;
  return true;
}

export function detectSensitiveInfo(text: string): GuardrailResult {
  const counters: Record<string, number> = {};
  const items: SensitiveItem[] = [];
  const usedRanges: Array<[number, number]> = [];

  function getPlaceholder(prefix: string): string {
    counters[prefix] = (counters[prefix] || 0) + 1;
    return `[${prefix}_${counters[prefix]}]`;
  }

  for (const pattern of DETECTION_PATTERNS) {
    const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const range: [number, number] = [start, end];

      const overlapping = usedRanges.some((r) => rangesOverlap(range, r));
      if (overlapping) continue;

      if (pattern.type === 'ssn') {
        const digits = match[0].replace(/\D/g, '');
        if (digits.length !== 9) continue;
      }

      if (pattern.type === 'phone') {
        const digits = match[0].replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 15) continue;
      }

      if (pattern.type === 'username' && !looksLikeUsername(match[0])) continue;

      const replacement = getPlaceholder(pattern.prefix);
      items.push({
        id: `${pattern.type}-${start}-${end}`,
        type: pattern.type,
        label: pattern.label,
        original: match[0],
        replacement,
        startIndex: start,
        endIndex: end,
        ignored: false,
      });
      usedRanges.push(range);
    }
  }

  items.sort((a, b) => a.startIndex - b.startIndex);

  return {
    hasSensitiveInfo: items.length > 0,
    items,
    anonymizedText: applyReplacements(text, items),
  };
}

export function applyReplacements(
  text: string,
  items: SensitiveItem[]
): string {
  const active = [...items]
    .filter((item) => !item.ignored)
    .sort((a, b) => b.startIndex - a.startIndex);

  let result = text;
  for (const item of active) {
    result =
      result.substring(0, item.startIndex) +
      item.replacement +
      result.substring(item.endIndex);
  }
  return result;
}

export function buildReplacementMapping(
  items: SensitiveItem[]
): ReplacementMapping {
  const mapping: ReplacementMapping = {};
  for (const item of items) {
    if (!item.ignored) {
      mapping[item.replacement] = item.original;
    }
  }
  return mapping;
}

export function restoreOriginals(
  text: string,
  mapping: ReplacementMapping
): string {
  let result = text;
  for (const [placeholder, original] of Object.entries(mapping)) {
    result = result.replaceAll(placeholder, original);
  }
  return result;
}

/** True if text contains at least one placeholder that exists in the mapping. */
export function hasMappablePlaceholders(
  text: string,
  mapping: ReplacementMapping
): boolean {
  if (!text || Object.keys(mapping).length === 0) return false;
  return Object.keys(mapping).some((ph) => text.includes(ph));
}
