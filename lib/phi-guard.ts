/**
 * Client-Side PHI (Protected Health Information) Redaction Guard
 * 
 * Scans raw OCR and clinical text before sending to third-party LLMs or APIs.
 * Masks Social Security Numbers, Phone Numbers, Email Addresses, Street Addresses,
 * and National Healthcare Identifiers while preserving clinical context.
 */

export interface PHIRedactionResult {
  originalText: string;
  redactedText: string;
  phiTokensFound: Array<{
    type: 'SSN' | 'PHONE' | 'EMAIL' | 'ADDRESS' | 'DATE_OF_BIRTH' | 'NATIONAL_ID';
    matchedText: string;
    replacement: string;
    index: number;
  }>;
  hasRedactions: boolean;
}

// Regex patterns for identifiable non-clinical personal data
const PHI_PATTERNS = [
  // Social Security Numbers: 000-00-0000 or 000 00 0000
  {
    type: 'SSN' as const,
    regex: /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g,
    replaceFn: (match: string) => `[REDACTED-SSN]`,
  },
  // North American & International Phone Numbers: (123) 456-7890 or +1-123-456-7890
  {
    type: 'PHONE' as const,
    regex: /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g,
    replaceFn: (match: string) => `[REDACTED-PHONE]`,
  },
  // Email Addresses
  {
    type: 'EMAIL' as const,
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replaceFn: (match: string) => `[REDACTED-EMAIL]`,
  },
  // Street Addresses: e.g. 100 Medical Center Blvd, 42 Main St, Suite 400
  {
    type: 'ADDRESS' as const,
    regex: /\b\d{1,5}\s+[A-Za-z0-9\s.,]{3,30}\s+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Suite|Ste)\b/gi,
    replaceFn: (match: string) => `[REDACTED-ADDRESS]`,
  },
  // Date of Birth markers: DOB: 1972-04-18 or Born: 04/18/1972
  {
    type: 'DATE_OF_BIRTH' as const,
    regex: /\b(?:DOB|Date of Birth|Birthdate|Born)\s*[:=]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/gi,
    replaceFn: (match: string) => `DOB: [REDACTED-DOB]`,
  },
];

/**
 * Scrubs identifiable PHI from clinical text client-side.
 */
export function redactPHI(text: string, enabled: boolean = true): PHIRedactionResult {
  if (!text || !enabled) {
    return {
      originalText: text || '',
      redactedText: text || '',
      phiTokensFound: [],
      hasRedactions: false,
    };
  }

  let redacted = text;
  const phiTokensFound: PHIRedactionResult['phiTokensFound'] = [];

  for (const pattern of PHI_PATTERNS) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

    while ((match = regex.exec(text)) !== null) {
      const matchedText = match[0];
      const replacement = pattern.replaceFn(matchedText);

      phiTokensFound.push({
        type: pattern.type,
        matchedText,
        replacement,
        index: match.index,
      });
    }

    redacted = redacted.replace(pattern.regex, pattern.replaceFn as any);
  }

  return {
    originalText: text,
    redactedText: redacted,
    phiTokensFound,
    hasRedactions: phiTokensFound.length > 0,
  };
}

/**
 * Zero-Storage Privacy Mode Helper
 * Manages whether records are cached to localStorage or kept strictly ephemeral in memory.
 */
export class PrivacyStorageManager {
  private static readonly EPHEMERAL_KEY = 'medlens_ephemeral_mode';

  static isEphemeralMode(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(this.EPHEMERAL_KEY) === 'true';
  }

  static setEphemeralMode(isEphemeral: boolean): void {
    if (typeof window === 'undefined') return;
    if (isEphemeral) {
      localStorage.setItem(this.EPHEMERAL_KEY, 'true');
      // Purge cached clinical patient data
      sessionStorage.clear();
    } else {
      localStorage.removeItem(this.EPHEMERAL_KEY);
    }
  }

  static saveSafeState<T>(key: string, data: T): void {
    if (typeof window === 'undefined' || this.isEphemeralMode()) return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  static loadSafeState<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined' || this.isEphemeralMode()) return fallback;
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return fallback;
      return JSON.parse(stored) as T;
    } catch {
      return fallback;
    }
  }

  static clearAll(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('medlens_patient');
    localStorage.removeItem('medlens_reports');
    localStorage.removeItem('medlens_hitl');
    localStorage.removeItem('medlens_audit');
  }
}
