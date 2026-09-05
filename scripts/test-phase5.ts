import { redactPHI, PrivacyStorageManager } from '../lib/phi-guard';
import {
  processDocumentBatch,
  findDuplicateTests,
  mergeReportResults,
  buildLongitudinalSeries,
} from '../lib/document-pipeline';
import { auditEventSchema, AuditEvent } from '../types/audit';
import { PRESET_LONGITUDINAL, PRESET_ACUTE_CONFLICT, PRESET_MISSING_RANGES, BASELINE_PRESET } from '../lib/demo-presets';
import { ExtractedLabResult, MedicalReport } from '../types/medlens';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

async function runPhase5Tests() {
  console.log('===============================================================');
  console.log('MEDLENS PHASE 5 AUTOMATED TEST SUITE: PRODUCTION HARDENING');
  console.log('===============================================================\n');

  // Test 1: Client-side PHI Scrubbing Guard
  console.log('--- TEST 1: Client-side PHI Scrubbing Guard ---');
  const samplePiiText = `
PATIENT: John Doe | DOB: 1980-05-12 | SSN: 123-45-6789
Phone: (555) 234-5678 | Email: john.doe@clinicalhealth.org
Address: 450 Medical Center Blvd, Suite 200, Metro City
Test: Serum Potassium 4.5 mmol/L (3.5 - 5.1)
  `;

  const phiResult = redactPHI(samplePiiText, true);
  assert(phiResult.hasRedactions === true, 'PHI guard identifies PII tokens in text');
  assert(!phiResult.redactedText.includes('123-45-6789'), 'SSN is scrubbed from text');
  assert(!phiResult.redactedText.includes('john.doe@clinicalhealth.org'), 'Email is scrubbed from text');
  assert(!phiResult.redactedText.includes('(555) 234-5678'), 'Phone number is scrubbed from text');
  assert(!phiResult.redactedText.includes('450 Medical Center Blvd'), 'Address is scrubbed from text');
  assert(phiResult.redactedText.includes('Serum Potassium 4.5 mmol/L'), 'Clinical findings and measurements remain intact');

  // Test 2: Multi-Document Batch Processing & Range Guard
  console.log('\n--- TEST 2: Multi-Document Batch Ingestion Pipeline ---');
  const batchDocs = [
    {
      name: 'Panel_A.txt',
      rawText: 'White Blood Cell (WBC) 7.2 K/uL (4.5 - 11.0)\nHemoglobin 14.5 g/dL (13.5 - 17.5)',
      reportDate: '2026-06-15',
    },
    {
      name: 'Panel_B.txt',
      rawText: 'Cholesterol, Total 224 mg/dL (< 200)\nNon-HDL Cholesterol 182 mg/dL',
      reportDate: '2026-06-15',
    },
  ];

  const processedReports = await processDocumentBatch(batchDocs, { redactClientPHI: true });
  assert(processedReports.length === 2, 'Batch processor returns 2 reports');
  
  // Verify Strict Range Guard in batch
  const nonHdl = processedReports[1].extractedResults.find(r => r.testName.toLowerCase().includes('non-hdl'));
  assert(nonHdl !== undefined, 'Non-HDL finding extracted');
  assert(nonHdl?.referenceRange === null, 'Non-HDL reference range strictly null (missing in source)');
  assert(nonHdl?.status === 'UNSPECIFIED', 'Non-HDL tagged UNSPECIFIED');

  // Test 3: Duplicate Test Detection on Same Date
  console.log('\n--- TEST 3: Duplicate Detection Engine on Same Clinical Date ---');
  const existingReports: MedicalReport[] = [
    {
      id: 'rep-existing',
      title: 'Baseline CBC',
      patientId: 'pt-1',
      reportDate: '2026-06-15',
      facility: 'Lab A',
      reportType: 'LAB_PANEL',
      status: 'PROCESSED',
      rawOcrText: '',
      extractedResults: [
        {
          id: 'lab-ex-hgb',
          reportId: 'rep-existing',
          testName: 'Hemoglobin',
          value: 14.0,
          unit: 'g/dL',
          referenceRange: { low: 13.5, high: 17.5, text: '13.5 - 17.5' },
          status: 'NORMAL',
          flaggedCritical: false,
          confidenceScore: 0.99,
          sourceSnippet: 'Hemoglobin 14.0 g/dL',
          isVerified: false,
          isRangeExplicitInSource: true,
          sourceType: 'EXTRACTED_REPORT',
        },
      ],
    },
  ];

  const incomingResults: ExtractedLabResult[] = [
    {
      id: 'lab-inc-hgb',
      reportId: 'rep-incoming',
      testName: 'Hemoglobin',
      value: 14.8,
      unit: 'g/dL',
      referenceRange: { low: 13.5, high: 17.5, text: '13.5 - 17.5' },
      status: 'NORMAL',
      flaggedCritical: false,
      confidenceScore: 0.99,
      sourceSnippet: 'Hemoglobin 14.8 g/dL',
      isVerified: false,
      isRangeExplicitInSource: true,
      sourceType: 'EXTRACTED_REPORT',
    },
  ];

  const duplicates = findDuplicateTests(existingReports, incomingResults, '2026-06-15');
  assert(duplicates.length === 1, 'Duplicate Hemoglobin on 2026-06-15 accurately flagged');
  assert(duplicates[0].existingResult.value === 14.0, 'Duplicate candidate retains existing value');
  assert(duplicates[0].incomingResult.value === 14.8, 'Duplicate candidate captures incoming value');

  // Test 4: Merge Engine Resolutions
  console.log('\n--- TEST 4: Merge & Deduplication Engine Actions ---');
  const keepLatest = mergeReportResults(existingReports[0].extractedResults, incomingResults, {
    'Hemoglobin': 'KEEP_LATEST',
  });
  assert(keepLatest.length === 1 && keepLatest[0].value === 14.8, 'KEEP_LATEST overwrites with incoming result (14.8)');

  const keepExisting = mergeReportResults(existingReports[0].extractedResults, incomingResults, {
    'Hemoglobin': 'KEEP_EXISTING',
  });
  assert(keepExisting.length === 1 && keepExisting[0].value === 14.0, 'KEEP_EXISTING preserves original result (14.0)');

  const keepBoth = mergeReportResults(existingReports[0].extractedResults, incomingResults, {
    'Hemoglobin': 'KEEP_BOTH',
  });
  assert(keepBoth.length === 2, 'KEEP_BOTH preserves both entries as separate draws');
  assert(keepBoth.some(l => l.testName.includes('Repeat Draw')), 'Repeat draw annotation attached');

  // Test 5: Longitudinal Series Builder
  console.log('\n--- TEST 5: Longitudinal Biomarker Series Builder ---');
  const series = buildLongitudinalSeries(PRESET_LONGITUDINAL.reports);
  assert(series.length > 0, 'Longitudinal series built from 3 sequential encounters');
  
  const creatSeries = series.find(s => s.testName.toLowerCase().includes('creatinine'));
  assert(creatSeries !== undefined, 'Creatinine series found');
  assert(creatSeries?.dataPoints.length === 3, 'Creatinine series has 3 data points across visits');
  assert(creatSeries?.delta === 0.8, `Creatinine delta calculated correctly: +0.8 mg/dL (got ${creatSeries?.delta})`);
  assert(creatSeries?.direction === 'UP', 'Creatinine trajectory correctly marked as UP');

  // Test 6: Audit Event Schema Validation
  console.log('\n--- TEST 6: Audit Event Schema Validation ---');
  const testEvent: AuditEvent = {
    id: 'audit-test-99',
    timestamp: new Date().toISOString(),
    eventType: 'VALUE_MODIFIED_BY_USER',
    actor: 'CLINICIAN',
    testName: 'Potassium',
    summary: 'Clinician updated potassium value from 5.4 to 5.1 mmol/L.',
    payloadDiff: {
      previousValue: 5.4,
      updatedValue: 5.1,
      previousStatus: 'HIGH',
      updatedStatus: 'NORMAL',
      rationale: 'Re-verified with core lab hemolyzed sample correction',
    },
  };

  const parseResult = auditEventSchema.safeParse(testEvent);
  assert(parseResult.success === true, 'Audit event conforms to strict Zod auditEventSchema');

  console.log('\n===============================================================');
  console.log('🎉 ALL PHASE 5 AUTOMATED TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================\n');
}

runPhase5Tests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
