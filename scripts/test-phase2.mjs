import assert from 'node:assert';
import { mockPatientIntake, mockReports, mockLipidResults, rawOcrLipidFixture, rawOcrCbcFixture } from '../lib/mock-data.js';
import { detectAllConflicts, detectAllergyMedicationConflicts, detectCriticalLabAlerts, detectMissingReferenceRanges } from '../lib/conflict-detector.js';
import { generateClinicalSummaries } from '../lib/summarizer.js';
import { extractWithDeterministicEngine } from '../lib/ai/provider.js';
import { enforceStrictReferenceRange } from '../lib/clinical-engine/strict-range-guard.js';

console.log('🧪 Starting MedLens Phase 2 Verification Suite...\n');

// -------------------------------------------------------------
// Test 1: Strict Reference Range Validation & Extraction Engine
// -------------------------------------------------------------
console.log('Test 1: Testing extraction and strict reference range guard...');

// Extract CBC
const extractedCbc = extractWithDeterministicEngine(rawOcrCbcFixture, 'rep-cbc-test');
assert.ok(extractedCbc.length >= 5, 'Should extract at least 5 CBC parameters');
const wbc = extractedCbc.find(r => r.testName.includes('White Blood Cell'));
assert.ok(wbc, 'WBC must be extracted');
assert.ok(wbc.referenceRange, 'WBC must have explicit reference range from source');
console.log(`✓ WBC extracted with explicit range: ${wbc.referenceRange.low} - ${wbc.referenceRange.high}`);

// Extract Lipid Panel with missing reference ranges
const extractedLipid = extractWithDeterministicEngine(rawOcrLipidFixture, 'rep-lipid-test');
assert.ok(extractedLipid.length >= 4, 'Should extract lipid panel parameters');

const nonHdl = extractedLipid.find(r => r.testName.includes('Non-HDL'));
const vldl = extractedLipid.find(r => r.testName.includes('VLDL'));

assert.ok(nonHdl, 'Non-HDL Cholesterol must be present');
const guardedNonHdl = enforceStrictReferenceRange(nonHdl);
assert.strictEqual(guardedNonHdl.referenceRange, null, 'Non-HDL reference range must be strictly null (Strict Range Guard)');
assert.strictEqual(guardedNonHdl.status, 'UNSPECIFIED', 'Non-HDL status must be UNSPECIFIED');

assert.ok(vldl, 'VLDL Cholesterol must be present');
const guardedVldl = enforceStrictReferenceRange(vldl);
assert.strictEqual(guardedVldl.referenceRange, null, 'VLDL reference range must be strictly null (Strict Range Guard)');
assert.strictEqual(guardedVldl.status, 'UNSPECIFIED', 'VLDL status must be UNSPECIFIED');

console.log('✓ Strict Reference Range Guard verified: missing ranges tagged as null and status UNSPECIFIED, zero hallucinated intervals.');

// -------------------------------------------------------------
// Test 2: Clinical Conflict Detector
// -------------------------------------------------------------
console.log('\nTest 2: Testing Clinical Conflict Detector...');

// A. Allergy vs Medication Conflict
const allergyConflicts = detectAllergyMedicationConflicts(mockPatientIntake);
assert.strictEqual(allergyConflicts.length, 1, 'Should detect 1 allergy conflict for David Miller');
assert.strictEqual(allergyConflicts[0].type, 'ALLERGY_MEDICATION_CONFLICT');
assert.strictEqual(allergyConflicts[0].severity, 'high');
assert.ok(allergyConflicts[0].involvedEntities.includes('Penicillin'), 'Should involve Penicillin');
assert.ok(allergyConflicts[0].involvedEntities.includes('Amoxicillin'), 'Should involve Amoxicillin');
console.log(`✓ Allergy Conflict Detected: ${allergyConflicts[0].description.substring(0, 80)}...`);

// B. Missing Reference Range Detection
const allMockLabs = mockReports.flatMap(r => r.extractedResults);
const missingRanges = detectMissingReferenceRanges(allMockLabs);
assert.strictEqual(missingRanges.length, 2, 'Should detect 2 missing ranges in lipid panel');
console.log(`✓ Missing Reference Ranges Flagged: ${missingRanges.map(m => m.testName).join(', ')}`);

// C. Critical Lab Alerts
const testLabsWithCritical = [
  ...allMockLabs,
  {
    id: 'crit-trop-test',
    reportId: 'rep-test',
    testName: 'High-Sensitivity Troponin I',
    category: 'Cardiac',
    value: 124.5,
    unit: 'ng/L',
    referenceRange: { high: 14.0, text: '< 14.0' },
    status: 'HIGH' as const,
    flaggedCritical: true,
    confidenceScore: 0.99,
    sourceSnippet: 'High-Sensitivity Troponin I 124.5 ng/L < 14.0 CRITICAL',
    isVerified: false,
    sourceType: 'EXTRACTED_REPORT' as const,
    isRangeExplicitInSource: true,
  },
  {
    id: 'crit-k-test',
    reportId: 'rep-test',
    testName: 'Potassium, Serum',
    category: 'Metabolic',
    value: 5.6,
    unit: 'mmol/L',
    referenceRange: { low: 3.5, high: 5.1, text: '3.5 - 5.1' },
    status: 'HIGH' as const,
    flaggedCritical: false,
    confidenceScore: 0.98,
    sourceSnippet: 'Potassium 5.6 mmol/L 3.5 - 5.1 HIGH',
    isVerified: false,
    sourceType: 'EXTRACTED_REPORT' as const,
    isRangeExplicitInSource: true,
  }
];

const criticalAlerts = detectCriticalLabAlerts(testLabsWithCritical);
assert.ok(criticalAlerts.length >= 2, 'Should flag critical Troponin and Potassium');
console.log(`✓ Critical Labs Detected: ${criticalAlerts.map(c => `${c.testName} (${c.value})`).join(', ')}`);

const fullReport = detectAllConflicts(mockPatientIntake, testLabsWithCritical);
assert.strictEqual(fullReport.summary.totalAllergyConflicts, 1);
assert.strictEqual(fullReport.summary.requiresUrgentClinicianReview, true);
console.log('✓ Full Conflict Detection Report generated successfully');

// -------------------------------------------------------------
// Test 3: Clinical Summarizer (Clinician Overview + 6th-Grade Patient Summary)
// -------------------------------------------------------------
console.log('\nTest 3: Testing Clinical Summarizer...');
const summaries = generateClinicalSummaries(mockPatientIntake, allMockLabs, fullReport);

// Validate Clinician Overview
assert.ok(summaries.clinicianOverview, 'Clinician overview must exist');
assert.ok(summaries.clinicianOverview.disclaimer.includes('Not a medical diagnosis'), 'Must include disclaimer');
assert.ok(summaries.clinicianOverview.panelFindings.length > 0, 'Must include panel findings');
assert.ok(summaries.clinicianOverview.reconciliationChecklist.length > 0, 'Must include reconciliation checklist');
console.log('✓ Clinician Overview generated with structured panels and reconciliation checklist');

// Validate 6th-Grade Patient Summary
assert.ok(summaries.patientSummary, 'Patient summary must exist');
assert.strictEqual(summaries.patientSummary.readingLevel, '6th-Grade Patient-Accessible');
assert.ok(summaries.patientSummary.disclaimer.includes('Not a medical diagnosis'), 'Must include disclaimer');
assert.ok(summaries.patientSummary.numbersToNotice.length > 0, 'Must include numbers to notice');
assert.ok(summaries.patientSummary.medicineAndAllergyNotice, 'Must include allergy safety warning');
assert.ok(summaries.patientSummary.medicineAndAllergyNotice.includes('Amoxicillin'), 'Must warn about Amoxicillin');
assert.ok(summaries.patientSummary.questionsForDoctor.length > 0, 'Must provide questions for doctor');
console.log('✓ 6th-Grade Patient Summary generated with simple language, allergy notice, and questions for doctor');

// Validate Non-Diagnostic Safety Boundary
assert.strictEqual(summaries.safetyAudit.passed, true, 'Safety audit must pass without diagnostic declarations');
console.log('✓ Safety Boundary Audit PASSED: Zero medical diagnoses or treatment prescriptions detected');

console.log('\n=========================================');
console.log('🎉 ALL PHASE 2 VERIFICATION TESTS PASSED');
console.log('=========================================\n');
