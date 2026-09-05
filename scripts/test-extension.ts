import { patientIntakeSchema, PatientIntake } from '../types/medlens';
import { auditEventSchema, AuditEvent } from '../types/audit';
import { detectAllConflicts } from '../lib/conflict-detector';
import { PRESET_ACUTE_CONFLICT, PRESET_LONGITUDINAL, PRESET_MISSING_RANGES, BASELINE_PRESET } from '../lib/demo-presets';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

async function runExtensionVerification() {
  console.log('===============================================================');
  console.log('MEDLENS NON-DESTRUCTIVE EXTENSION VERIFICATION SUITE');
  console.log('===============================================================\n');

  // Test 1: Custom Patient Schema Validation
  console.log('--- TEST 1: Custom Patient Validation via patientIntakeSchema ---');
  const customPatientJane: PatientIntake = {
    id: 'pt-custom-jane-doe',
    name: 'Jane Doe',
    mrn: 'MRN-39201',
    age: 34,
    sex: 'female',
    symptoms: [
      { description: 'Dysuria and pelvic discomfort', duration: '3 days', severity: 'moderate' },
    ],
    conditions: [
      { name: 'Recurrent UTI' },
    ],
    allergies: [
      { allergen: 'Sulfa / Sulfonamides', reaction: 'Severe urticaria and facial angioedema' },
    ],
    currentMedications: [
      { name: 'Bactrim DS (Trimethoprim/Sulfamethoxazole)', dosage: '800/160 mg', frequency: 'twice daily' },
    ],
    source: 'USER_INTAKE',
  };

  const parseResult = patientIntakeSchema.safeParse(customPatientJane);
  assert(parseResult.success === true, 'Custom patient Jane Doe conforms to patientIntakeSchema');

  // Test 2: Dynamic Conflict Detection with Custom Patient
  console.log('\n--- TEST 2: Dynamic Allergy Conflict on Custom Patient (Sulfa vs. Bactrim) ---');
  const conflicts = detectAllConflicts(customPatientJane, []);
  assert(conflicts.allergyMedicationConflicts.length > 0, 'High-severity allergy conflict dynamically triggered');
  const sulfaConflict = conflicts.allergyMedicationConflicts[0];
  assert(
    sulfaConflict.description.toLowerCase().includes('sulfa') ||
    sulfaConflict.description.toLowerCase().includes('sulfonamide') ||
    sulfaConflict.description.toLowerCase().includes('bactrim'),
    `Conflict correctly mentions Sulfa / Bactrim cross-reaction: "${sulfaConflict.description}"`
  );
  assert(sulfaConflict.severity === 'high', 'Severity correctly marked as high');

  // Test 3: New Audit Event Type PATIENT_RECORD_CREATED
  console.log('\n--- TEST 3: PATIENT_RECORD_CREATED Audit Event Validation ---');
  const customAuditEvent: AuditEvent = {
    id: 'audit-patient-creation-001',
    timestamp: new Date().toISOString(),
    eventType: 'PATIENT_RECORD_CREATED',
    actor: 'CLINICIAN',
    targetEntityId: customPatientJane.id,
    summary: `Registered new custom patient intake: ${customPatientJane.name} (${customPatientJane.age} yrs). Documented 1 allergy, 1 active med.`,
  };

  const auditParse = auditEventSchema.safeParse(customAuditEvent);
  assert(auditParse.success === true, 'PATIENT_RECORD_CREATED event conforms to auditEventSchema');

  // Test 4: Verify Non-Destructive Invariant on Pre-existing Presets
  console.log('\n--- TEST 4: Pre-existing Demo Presets Remain Intact & Unchanged ---');
  assert(PRESET_ACUTE_CONFLICT.patient.name === 'David Miller', 'David Miller preset intact');
  assert(PRESET_LONGITUDINAL.patient.name === 'Sarah Jenkins', 'Sarah Jenkins preset intact');
  assert(PRESET_LONGITUDINAL.reports.length === 3, 'Sarah Jenkins 3-visit longitudinal encounters intact');
  assert(PRESET_MISSING_RANGES.patient.name === 'Elena Rostova', 'Elena Rostova preset intact');
  assert(BASELINE_PRESET.patient.id === 'pt-david-miller-01', 'Baseline preset intact');

  console.log('\n===============================================================');
  console.log('🎉 ALL NON-DESTRUCTIVE EXTENSION TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================\n');
}

runExtensionVerification().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
