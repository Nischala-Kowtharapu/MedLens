import { MedicalReport, ExtractedLabResult } from '@/types/medlens';
import { extractWithDeterministicEngine } from '@/lib/ai/provider';
import { enforceStrictReferenceRange } from '@/lib/clinical-engine/strict-range-guard';
import { redactPHI } from '@/lib/phi-guard';
import { LongitudinalBiomarkerSeries } from '@/types/audit';

export interface QueuedDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  rawText: string;
  reportDate: string;
  facility: string;
  status: 'PENDING' | 'EXTRACTING' | 'COMPLETED' | 'ERROR';
  extractedResults: ExtractedLabResult[];
  phiRedactionCount: number;
  errorMessage?: string;
}

export interface DuplicateTestCandidate {
  testName: string;
  date: string;
  existingResult: ExtractedLabResult;
  incomingResult: ExtractedLabResult;
}

/**
 * 1. Multi-Document Batch Ingestion Pipeline
 * Processes an array of queued clinical documents, optionally scrubs PHI,
 * and executes strict extraction across all files in parallel.
 */
export async function processDocumentBatch(
  documents: Array<{
    name: string;
    rawText: string;
    reportDate?: string;
    facility?: string;
  }>,
  options: { redactClientPHI?: boolean } = {}
): Promise<MedicalReport[]> {
  const processedReports: MedicalReport[] = [];

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const reportId = `rep-batch-${Date.now()}-${i}`;
    const reportDate = doc.reportDate || new Date().toISOString().split('T')[0];
    const facility = doc.facility || 'Clinical Laboratory Services';

    // 1. Client-Side PHI Redaction
    let effectiveText = doc.rawText;
    if (options.redactClientPHI) {
      const phiResult = redactPHI(doc.rawText, true);
      effectiveText = phiResult.redactedText;
    }

    // 2. Extract findings
    const rawResults = extractWithDeterministicEngine(effectiveText, reportId);

    // 3. Apply Strict Reference Range Guard
    const guardedResults = rawResults.map(r => enforceStrictReferenceRange(r));

    processedReports.push({
      id: reportId,
      title: doc.name.replace(/\.[^/.]+$/, ''),
      patientId: 'patient-active',
      reportDate,
      facility,
      reportType: 'LAB_PANEL',
      rawOcrText: effectiveText,
      extractedResults: guardedResults,
      status: 'PROCESSED',
    });
  }

  return processedReports;
}

/**
 * 2. Duplicate Detection Engine
 * Identifies tests extracted on the same clinical date across multiple documents.
 */
export function findDuplicateTests(
  existingReports: MedicalReport[],
  incomingResults: ExtractedLabResult[],
  incomingDate: string
): DuplicateTestCandidate[] {
  const duplicates: DuplicateTestCandidate[] = [];

  // Group existing results by date and normalized test name
  const existingMap = new Map<string, ExtractedLabResult>();

  for (const report of existingReports) {
    if (report.reportDate === incomingDate) {
      for (const lab of report.extractedResults) {
        const key = `${normalizeName(lab.testName)}@${incomingDate}`;
        existingMap.set(key, lab);
      }
    }
  }

  for (const incoming of incomingResults) {
    const key = `${normalizeName(incoming.testName)}@${incomingDate}`;
    const match = existingMap.get(key);
    if (match) {
      duplicates.push({
        testName: incoming.testName,
        date: incomingDate,
        existingResult: match,
        incomingResult: incoming,
      });
    }
  }

  return duplicates;
}

/**
 * 3. Merge & Deduplicate Engine
 * Resolves duplicates according to chosen actions:
 * - 'KEEP_LATEST': Replaces existing finding with incoming
 * - 'KEEP_EXISTING': Ignores incoming duplicate
 * - 'KEEP_BOTH': Retains both with a distinct draw annotation (e.g. Draw #2)
 */
export function mergeReportResults(
  existingResults: ExtractedLabResult[],
  incomingResults: ExtractedLabResult[],
  resolutions: Record<string, 'KEEP_LATEST' | 'KEEP_EXISTING' | 'KEEP_BOTH'>
): ExtractedLabResult[] {
  const merged: ExtractedLabResult[] = [...existingResults];

  for (const incoming of incomingResults) {
    const action = resolutions[incoming.testName] || 'KEEP_LATEST';

    if (action === 'KEEP_LATEST') {
      const idx = merged.findIndex(e => normalizeName(e.testName) === normalizeName(incoming.testName));
      if (idx !== -1) {
        merged[idx] = incoming;
      } else {
        merged.push(incoming);
      }
    } else if (action === 'KEEP_BOTH') {
      const copy = {
        ...incoming,
        id: `${incoming.id}-repeat-draw`,
        testName: `${incoming.testName} (Repeat Draw)`,
      };
      merged.push(copy);
    }
    // If KEEP_EXISTING, incoming is discarded
  }

  return merged;
}

/**
 * 4. Unified Longitudinal Series Builder
 * Builds chronologically sorted trajectories for markers across sequential dates.
 */
export function buildLongitudinalSeries(reports: MedicalReport[]): LongitudinalBiomarkerSeries[] {
  // Sort reports chronologically
  const sortedReports = [...reports].sort(
    (a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime()
  );

  const seriesMap = new Map<string, LongitudinalBiomarkerSeries>();

  for (const rep of sortedReports) {
    for (const lab of rep.extractedResults) {
      const numVal = typeof lab.value === 'number' ? lab.value : parseFloat(String(lab.value));
      if (isNaN(numVal)) continue;

      const norm = normalizeName(lab.testName);
      if (!seriesMap.has(norm)) {
        seriesMap.set(norm, {
          testName: lab.testName,
          unit: lab.unit || '',
          category: lab.category || 'General',
          dataPoints: [],
          delta: 0,
          percentChange: 0,
          direction: 'STABLE',
        });
      }

      const s = seriesMap.get(norm)!;
      s.dataPoints.push({
        date: rep.reportDate,
        value: numVal,
        status: lab.status,
        reportTitle: rep.title,
        isVerified: lab.isVerified,
      });
    }
  }

  // Calculate deltas for series with 2+ visits
  const result: LongitudinalBiomarkerSeries[] = [];
  for (const s of seriesMap.values()) {
    if (s.dataPoints.length >= 2) {
      const first = s.dataPoints[0].value;
      const last = s.dataPoints[s.dataPoints.length - 1].value;
      s.delta = parseFloat((last - first).toFixed(2));
      s.percentChange = first !== 0 ? parseFloat((((last - first) / first) * 100).toFixed(1)) : 0;
      s.direction = s.delta > 0.05 ? 'UP' : s.delta < -0.05 ? 'DOWN' : 'STABLE';
      result.push(s);
    }
  }

  return result;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}
