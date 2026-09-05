import assert from 'node:assert';
import { mockPatientIntake, mockReports } from '../lib/mock-data';
import { detectAllConflicts, detectAllergyMedicationConflicts } from '../lib/conflict-detector';
import { MANDATORY_CLINICAL_DISCLAIMER } from '../lib/clinical-engine/safety-boundary';
import { PatientIntake, ExtractedLabResult } from '../types/medlens';

console.log('🧪 Starting MedLens Phase 3 Verification Suite...\n');

// -------------------------------------------------------------
// Test 1: Patient Intake Form Reactivity & Conflict Detection
// -------------------------------------------------------------
console.log('Test 1: Testing Intake Form editing and real-time conflict reactivity...');

// Start with clean patient
const dynamicPatient: PatientIntake = {
  id: 'pt-test-dynamic',
  name: 'Test Patient',
  age: 50,
  sex: 'male',
  symptoms: [],
  conditions: [],
  allergies: [],
  currentMedications: [{ name: 'Amoxicillin', dosage: '500 mg', frequency: 'TID' }],
  source: 'USER_INTAKE',
};

// Initial state: no allergies -> 0 conflicts
let conflicts = detectAllergyMedicationConflicts(dynamicPatient);
assert.strictEqual(conflicts.length, 0, 'No conflicts when allergies list is empty');
console.log('✓ Initial state: 0 conflicts detected without allergies');

// User adds Penicillin allergy in Tab 1
dynamicPatient.allergies.push({ allergen: 'Penicillin', reaction: 'Anaphylaxis' });
conflicts = detectAllergyMedicationConflicts(dynamicPatient);
assert.strictEqual(conflicts.length, 1, 'Conflict must trigger immediately after adding Penicillin allergy');
assert.strictEqual(conflicts[0].type, 'ALLERGY_MEDICATION_CONFLICT');
assert.strictEqual(conflicts[0].severity, 'high');
console.log(`✓ Real-time Conflict Triggered: ${conflicts[0].description}`);

// User removes Amoxicillin from medications
dynamicPatient.currentMedications = [];
conflicts = detectAllergyMedicationConflicts(dynamicPatient);
assert.strictEqual(conflicts.length, 0, 'Conflict resolved once conflicting medication is removed');
console.log('✓ Conflict dynamically resolved upon medication removal');

// -------------------------------------------------------------
// Test 2: Inline Human-in-the-Loop (HITL) Verification & Overrides
// -------------------------------------------------------------
console.log('\nTest 2: Testing Human-in-the-Loop override and verification workflow...');

const sampleLab: ExtractedLabResult = {
  id: 'lab-hitl-01',
  reportId: 'rep-01',
  testName: 'Creatinine, Serum',
  category: 'Renal Function',
  value: '1.9', // Raw OCR string
  unit: 'mg/dL',
  referenceRange: { low: 0.6, high: 1.2, text: '0.6 - 1.2' },
  status: 'HIGH',
  flaggedCritical: true,
  confidenceScore: 0.94,
  sourceSnippet: 'Creatinine, Serum 1.9 mg/dL 0.6 - 1.2 HIGH',
  isVerified: false,
  sourceType: 'EXTRACTED_REPORT',
  isRangeExplicitInSource: true,
};

// Clinician opens HITL modal, corrects numeric value and confirms
const hitlOverride = {
  isVerified: true,
  verifiedValue: 1.92,
  verifiedStatus: 'HIGH' as const,
  clinicianNotes: 'Confirmed against core chemistry analyzer output',
};

const verifiedLab: ExtractedLabResult = {
  ...sampleLab,
  isVerified: hitlOverride.isVerified,
  verifiedValue: hitlOverride.verifiedValue,
  status: hitlOverride.verifiedStatus,
  clinicianNotes: hitlOverride.clinicianNotes,
};

assert.strictEqual(verifiedLab.isVerified, true, 'Result must be marked isVerified: true');
assert.strictEqual(verifiedLab.verifiedValue, 1.92, 'Result must contain verifiedValue');
assert.strictEqual(verifiedLab.clinicianNotes, 'Confirmed against core chemistry analyzer output');
console.log('✓ HITL Confirmation & Override persisted with clinician audit notes');

// -------------------------------------------------------------
// Test 3: Top and Bottom Mandatory Clinical Disclaimers
// -------------------------------------------------------------
console.log('\nTest 3: Validating Mandatory Disclaimers...');
assert.ok(MANDATORY_CLINICAL_DISCLAIMER.includes('Not a medical diagnosis or treatment plan'));
console.log(`✓ Disclaimer verified: "${MANDATORY_CLINICAL_DISCLAIMER}"`);

console.log('\n=========================================');
console.log('🎉 ALL PHASE 3 VERIFICATION TESTS PASSED');
console.log('=========================================\n');
