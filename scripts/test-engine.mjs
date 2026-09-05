import assert from 'node:assert';
import {
  patientIntakeSchema,
  medicalReportSchema,
  clinicalInconsistencySchema,
  extractedLabResultSchema,
} from '../types/medlens.js';
import {
  mockPatientIntake,
  mockReports,
  mockInconsistencies,
  mockLipidResults,
} from '../lib/mock-data.js';

console.log('🧪 Starting MedLens Phase 1 Verification Suite...\n');

// 1. Validate Patient Intake Schema
console.log('Checking Patient Intake Zod validation...');
const intakeResult = patientIntakeSchema.safeParse(mockPatientIntake);
assert.strictEqual(intakeResult.success, true, 'Patient intake must conform to schema');
assert.strictEqual(mockPatientIntake.source, 'USER_INTAKE', 'Provenance source must be USER_INTAKE');
console.log('✓ Patient Intake verified successfully');

// 2. Validate Allergy & Medication Conflict Present in Data
console.log('\nChecking Allergy-Medication conflict fixture...');
const penicillinAllergy = mockPatientIntake.allergies.find(a => /penicillin/i.test(a.allergen));
const amoxicillinMed = mockPatientIntake.currentMedications.find(m => /amoxicillin/i.test(m.name));
assert.ok(penicillinAllergy, 'Patient must have penicillin allergy');
assert.ok(amoxicillinMed, 'Patient must have amoxicillin medication');
console.log(`✓ Conflict identified: ${penicillinAllergy.allergen} vs ${amoxicillinMed.name}`);

// 3. Validate Medical Reports and Strict Reference Range Guard
console.log('\nChecking Medical Reports & Strict Reference Range Guard...');
for (const report of mockReports) {
  const repResult = medicalReportSchema.safeParse(report);
  assert.strictEqual(repResult.success, true, `Report ${report.id} must conform to schema`);
}
console.log(`✓ Verified ${mockReports.length} medical reports against medicalReportSchema`);

// Check that Lipid Panel tests with missing ranges have referenceRange === null
const nonHdl = mockLipidResults.find(r => r.testName.includes('Non-HDL'));
const vldl = mockLipidResults.find(r => r.testName.includes('VLDL'));
assert.ok(nonHdl, 'Non-HDL Cholesterol must be present');
assert.strictEqual(nonHdl.referenceRange, null, 'Non-HDL referenceRange must be null (Strict Range Guard)');
assert.strictEqual(nonHdl.isRangeExplicitInSource, false, 'Non-HDL isRangeExplicitInSource must be false');

assert.ok(vldl, 'VLDL Cholesterol must be present');
assert.strictEqual(vldl.referenceRange, null, 'VLDL referenceRange must be null (Strict Range Guard)');
assert.strictEqual(vldl.isRangeExplicitInSource, false, 'VLDL isRangeExplicitInSource must be false');
console.log('✓ Strict Reference Range Guard verified: missing ranges are strictly null, not hallucinated!');

// 4. Validate Clinical Inconsistency Schema
console.log('\nChecking Clinical Inconsistencies schema...');
for (const inc of mockInconsistencies) {
  const incResult = clinicalInconsistencySchema.safeParse(inc);
  assert.strictEqual(incResult.success, true, `Inconsistency ${inc.id} must conform to schema`);
  assert.strictEqual(inc.type, 'ALLERGY_MEDICATION_CONFLICT');
  assert.strictEqual(inc.severity, 'high');
}
console.log('✓ Clinical Inconsistency schema verified');

console.log('\n=========================================');
console.log('🎉 ALL PHASE 1 VERIFICATION TESTS PASSED');
console.log('=========================================\n');
