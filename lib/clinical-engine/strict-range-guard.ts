import { ExtractedLabResult, LabStatus } from '@/types/medlens';

/**
 * Strict Reference Range Guard
 * 
 * Strict Invariant:
 * Reference ranges MUST ONLY be extracted when explicitly present in the source document.
 * If a reference range is missing or not explicitly written in the source text/OCR snippet,
 * it MUST be set to null and status set to 'UNSPECIFIED' (unless an explicit status like HIGH/LOW
 * is stated directly in the source report).
 * 
 * Under NO CIRCUMSTANCES may MedLens hallucinate or substitute standard clinical reference intervals!
 */

export interface RangeExtractionResult {
  range: {
    low?: number;
    high?: number;
    text?: string;
  } | null;
  isExplicitInSource: boolean;
  status: LabStatus;
}

// Regex patterns for explicitly stated reference intervals in clinical documents
// Examples: "Ref: 0.7 - 1.3", "Range: 3.5 - 5.0", "(135 - 145)", "Ref Interval: < 100", "Normal: Negative"
const EXPLICIT_RANGE_PATTERNS = [
  /(?:ref(?:erence)?\s*(?:range|interval)?|range|normal)\s*[:=]?\s*([<>]?\s*[-+]?\d*\.?\d+)\s*(?:-|–|to)\s*([-+]?\d*\.?\d+)/i,
  /(?:ref(?:erence)?\s*(?:range|interval)?|range|normal)\s*[:=]?\s*([<>]=?\s*[-+]?\d*\.?\d+)/i,
  /\(\s*(?:ref(?:erence)?|normal)?\s*[:=]?\s*([<>]?\s*[-+]?\d*\.?\d+)\s*(?:-|–|to)\s*([-+]?\d*\.?\d+)\s*\)/i,
  /\[\s*([<>]?\s*[-+]?\d*\.?\d+)\s*(?:-|–|to)\s*([-+]?\d*\.?\d+)\s*\]/i,
  /(?:ref(?:erence)?|normal)\s*[:=]?\s*(negative|positive|non-reactive|reactive|normal|undetected|detected)/i,
  /\b(\d*\.?\d+)\s*(?:-|–)\s*(\d*\.?\d+)\b/,
];

/**
 * Evaluates whether a raw document snippet contains an explicit reference interval.
 */
export function extractStrictReferenceRange(
  sourceSnippet: string,
  numericValue?: number
): RangeExtractionResult {
  if (!sourceSnippet || typeof sourceSnippet !== 'string') {
    return { range: null, isExplicitInSource: false, status: 'UNSPECIFIED' };
  }

  // 1. Check for numeric range (e.g. "0.7 - 1.3" or "3.5 - 5.0")
  for (const pattern of EXPLICIT_RANGE_PATTERNS) {
    const match = sourceSnippet.match(pattern);
    if (match) {
      // Two-sided range: "0.7 - 1.3"
      if (match[1] && match[2]) {
        const low = parseFloat(match[1]);
        const high = parseFloat(match[2]);
        if (!isNaN(low) && !isNaN(high)) {
          const status = determineStatusFromRange(numericValue, low, high);
          return {
            range: {
              low,
              high,
              text: `${low} - ${high}`,
            },
            isExplicitInSource: true,
            status,
          };
        }
      }

      // One-sided threshold: "< 100" or "> 60"
      if (match[1] && !match[2]) {
        const text = match[1].trim();
        const isLess = text.startsWith('<');
        const isGreater = text.startsWith('>');
        const boundNum = parseFloat(text.replace(/[^\d.-]/g, ''));

        if (!isNaN(boundNum)) {
          let status: LabStatus = 'UNSPECIFIED';
          if (numericValue !== undefined && !isNaN(numericValue)) {
            if (isLess) {
              status = numericValue <= boundNum ? 'NORMAL' : 'HIGH';
            } else if (isGreater) {
              status = numericValue >= boundNum ? 'NORMAL' : 'LOW';
            }
          }
          return {
            range: {
              low: isGreater ? boundNum : undefined,
              high: isLess ? boundNum : undefined,
              text,
            },
            isExplicitInSource: true,
            status,
          };
        }

        // Qualitative text match (e.g., "Negative")
        return {
          range: { text },
          isExplicitInSource: true,
          status: text.toLowerCase() === 'negative' || text.toLowerCase() === 'non-reactive' ? 'NORMAL' : 'ABNORMAL',
        };
      }
    }
  }

  // If no explicit interval pattern matched in the source snippet:
  // INVARIANT ENFORCED: Strict null, no invented ranges!
  return {
    range: null,
    isExplicitInSource: false,
    status: 'UNSPECIFIED',
  };
}

/**
 * Derives status purely based on source-provided bounds.
 */
function determineStatusFromRange(
  val: number | undefined,
  low: number,
  high: number
): LabStatus {
  if (val === undefined || isNaN(val)) return 'UNSPECIFIED';
  if (val < low) return 'LOW';
  if (val > high) return 'HIGH';
  return 'NORMAL';
}

/**
 * Validates an extracted lab result against strict range rules.
 * If an LLM or parser invented a range without explicit source text backing it,
 * this function nullifies the range and resets status to UNSPECIFIED.
 */
export function enforceStrictReferenceRange(result: ExtractedLabResult): ExtractedLabResult {
  const snippet = result.sourceSnippet || '';
  const rangeInfo = extractStrictReferenceRange(
    snippet,
    typeof result.value === 'number' ? result.value : parseFloat(String(result.value))
  );

  // If source does not contain an explicit range, strictly enforce null
  if (!rangeInfo.isExplicitInSource) {
    return {
      ...result,
      referenceRange: null,
      isRangeExplicitInSource: false,
      status: result.status === 'HIGH' || result.status === 'LOW'
        ? (snippet.toUpperCase().includes('HIGH') ? 'HIGH' : snippet.toUpperCase().includes('LOW') ? 'LOW' : 'UNSPECIFIED')
        : 'UNSPECIFIED',
    };
  }

  return {
    ...result,
    referenceRange: rangeInfo.range,
    isRangeExplicitInSource: true,
    status: result.status !== 'UNSPECIFIED' ? result.status : rangeInfo.status,
  };
}
