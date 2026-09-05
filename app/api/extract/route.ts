import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { ExtractedLabResult, extractedLabResultSchema } from '@/types/medlens';
import {
  extractStrictReferenceRange,
  enforceStrictReferenceRange,
} from '@/lib/clinical-engine/strict-range-guard';
import { extractWithDeterministicEngine } from '@/lib/ai/provider';

export const runtime = 'nodejs';

interface ExtractionRequestBody {
  text: string;
  reportId?: string;
  provider?: 'openai' | 'gemini' | 'deterministic' | 'auto';
  apiKey?: string;
}

/**
 * POST /api/extract
 * Ingests raw OCR clinical document text and extracts laboratory metrics into ExtractedLabResult[].
 * Strict Invariant: Reference ranges are ONLY accepted if explicitly present in the source text.
 * Missing ranges are strictly set to null and tagged as UNSPECIFIED.
 */
export async function POST(req: NextRequest) {
  try {
    const body: ExtractionRequestBody = await req.json();
    const { text, reportId, provider = 'auto', apiKey } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Source document text is required for extraction.' },
        { status: 400 }
      );
    }

    const effectiveReportId = reportId || `rep-${Date.now()}`;
    const openaiKey = apiKey || process.env.OPENAI_API_KEY;
    const geminiKey = apiKey || process.env.GEMINI_API_KEY;

    let rawExtracted: ExtractedLabResult[] = [];
    let usedProvider: string = 'deterministic';

    // 1. Try OpenAI Structured Outputs if OpenAI key is available and requested/auto
    if ((provider === 'openai' || provider === 'auto') && openaiKey) {
      try {
        rawExtracted = await extractWithOpenAIStructuredOutputs(text, effectiveReportId, openaiKey);
        usedProvider = 'openai';
      } catch (err: any) {
        console.warn('OpenAI structured extraction failed, trying fallbacks:', err.message);
      }
    }

    // 2. Try Gemini Structured Outputs if Gemini key is available and not yet extracted
    if (rawExtracted.length === 0 && (provider === 'gemini' || provider === 'auto') && geminiKey) {
      try {
        rawExtracted = await extractWithGeminiStructuredOutputs(text, effectiveReportId, geminiKey);
        usedProvider = 'gemini';
      } catch (err: any) {
        console.warn('Gemini structured extraction failed, trying fallbacks:', err.message);
      }
    }

    // 3. Deterministic Local Clinical Parser Fallback (Always available, 0 config needed)
    if (rawExtracted.length === 0) {
      rawExtracted = extractWithDeterministicEngine(text, effectiveReportId);
      usedProvider = 'deterministic';
    }

    // 4. STRICT REFERENCE RANGE GUARD ENFORCEMENT LAYER
    // Invariant: In no circumstance may an LLM invent or extrapolate missing ranges.
    // If the snippet does not contain the range, it MUST be set to null and status set to UNSPECIFIED.
    const guardedResults: ExtractedLabResult[] = rawExtracted.map((item, idx) => {
      // Validate against the exact source snippet
      const guarded = enforceStrictReferenceRange(item);

      // Validate with runtime Zod schema
      const parseResult = extractedLabResultSchema.safeParse(guarded);
      if (!parseResult.success) {
        console.warn(`Zod schema warning on item ${idx}:`, parseResult.error);
        return guarded;
      }
      return parseResult.data as ExtractedLabResult;
    });

    const missingRangeCount = guardedResults.filter(r => r.referenceRange === null).length;
    const verifiedCount = guardedResults.filter(r => r.isVerified).length;

    return NextResponse.json({
      success: true,
      reportId: effectiveReportId,
      providerUsed: usedProvider,
      totalExtracted: guardedResults.length,
      missingRangesEnforced: missingRangeCount,
      verifiedCount,
      results: guardedResults,
    });
  } catch (error: any) {
    console.error('API /api/extract error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during extraction.' },
      { status: 500 }
    );
  }
}

/**
 * OpenAI Structured Outputs using JSON Schema / Function Calling
 */
async function extractWithOpenAIStructuredOutputs(
  rawText: string,
  reportId: string,
  apiKey: string
): Promise<ExtractedLabResult[]> {
  const openai = new OpenAI({ apiKey });

  const systemPrompt = `You are an expert clinical laboratory data extraction engine for MedLens.
Your task is to parse clinical document text into an array of laboratory results.

CRITICAL SAFETY INVARIANTS:
1. STRICT REFERENCE RANGE GUARD: Extract reference ranges ONLY when explicitly written in the source document snippet.
   If the document does NOT contain a reference interval for a test (e.g. Non-HDL, VLDL, eGFR), you MUST set "referenceRange": null.
   DO NOT INVENT, ESTIMATE, OR HALLUCINATE STANDARD LABORATORY RANGES.
2. VERBATIM PROVENANCE: Include the exact line from the OCR text in "sourceSnippet".
3. STATUS: If reference range is null, status must be "UNSPECIFIED" unless an explicit abnormal flag (e.g. "HIGH", "LOW") is printed in the source line.
4. NON-DIAGNOSTIC: Only extract observations. Do not diagnose conditions.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Extract all laboratory results from this clinical report into a JSON object containing a "results" array matching this format:
{
  "results": [
    {
      "testName": "Hemoglobin",
      "category": "Complete Blood Count",
      "value": 14.5,
      "unit": "g/dL",
      "referenceRange": { "low": 13.5, "high": 17.5, "text": "13.5 - 17.5" } or null,
      "status": "NORMAL" | "HIGH" | "LOW" | "ABNORMAL" | "UNSPECIFIED",
      "flaggedCritical": false,
      "confidenceScore": 0.98,
      "sourceSnippet": "Hemoglobin 14.5 g/dL 13.5 - 17.5 NORMAL",
      "isRangeExplicitInSource": true or false
    }
  ]
}

CLINICAL REPORT:
${rawText}`,
      },
    ],
    temperature: 0.1,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');

  const parsed = JSON.parse(content);
  const items = Array.isArray(parsed.results) ? parsed.results : [];

  return items.map((item: any, idx: number): ExtractedLabResult => ({
    id: `res-oai-${reportId}-${idx}`,
    reportId,
    testName: item.testName,
    category: item.category || 'General Laboratory',
    value: item.value,
    unit: item.unit || null,
    referenceRange: item.referenceRange || null,
    status: item.status || 'UNSPECIFIED',
    flaggedCritical: Boolean(item.flaggedCritical),
    confidenceScore: typeof item.confidenceScore === 'number' ? item.confidenceScore : 0.95,
    sourceSnippet: item.sourceSnippet || '',
    isVerified: false,
    sourceType: 'EXTRACTED_REPORT',
    isRangeExplicitInSource: Boolean(item.isRangeExplicitInSource && item.referenceRange),
  }));
}

/**
 * Gemini Structured Outputs
 */
async function extractWithGeminiStructuredOutputs(
  rawText: string,
  reportId: string,
  apiKey: string
): Promise<ExtractedLabResult[]> {
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Extract all laboratory results from this clinical document text into a JSON object with a "results" array.
STRICT INVARIANT: If reference range is missing in the document, set "referenceRange": null and status to "UNSPECIFIED". DO NOT hallucinate standard laboratory ranges. Include verbatim sourceSnippet.

CLINICAL TEXT:
${rawText}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
    },
  });

  const parsed = JSON.parse(response.text || '{"results": []}');
  const items = Array.isArray(parsed.results) ? parsed.results : [];

  return items.map((item: any, idx: number): ExtractedLabResult => ({
    id: `res-gemini-${reportId}-${idx}`,
    reportId,
    testName: item.testName,
    category: item.category || 'General Laboratory',
    value: item.value,
    unit: item.unit || null,
    referenceRange: item.referenceRange || null,
    status: item.status || 'UNSPECIFIED',
    flaggedCritical: Boolean(item.flaggedCritical),
    confidenceScore: typeof item.confidenceScore === 'number' ? item.confidenceScore : 0.92,
    sourceSnippet: item.sourceSnippet || '',
    isVerified: false,
    sourceType: 'EXTRACTED_REPORT',
    isRangeExplicitInSource: Boolean(item.isRangeExplicitInSource && item.referenceRange),
  }));
}
