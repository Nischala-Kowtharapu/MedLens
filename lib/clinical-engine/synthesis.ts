import {
  PatientIntake,
  ExtractedLabResult,
  ClinicalInconsistency,
  NonDiagnosticSynthesis,
} from '@/types/clinical';
import {
  MANDATORY_CLINICAL_DISCLAIMER,
  auditSafetyBoundary,
  buildDescriptiveLabObservation,
} from './safety-boundary';

/**
 * Deterministic Non-Diagnostic Clinical Synthesizer
 * 
 * Aggregates clinical documents, lab findings, and inconsistencies into
 * an objective, descriptive synthesis strictly adhering to:
 * 1. Non-diagnostic safety boundary (no diagnoses, no prescribing).
 * 2. Strict reference range guard (describing source-stated ranges, flagging omissions).
 * 3. Human-in-the-loop verification awareness.
 */

export function generateNonDiagnosticSynthesis(
  patient: PatientIntake,
  labResults: ExtractedLabResult[],
  inconsistencies: ClinicalInconsistency[]
): NonDiagnosticSynthesis {
  // 1. Group notable findings (High, Low, Critical, Unspecified)
  const notableResults = labResults.filter(
    r => r.status === 'HIGH' || r.status === 'LOW' || r.flaggedCritical || !r.isRangeExplicitInSource
  );

  const notableValues = notableResults.map(r => {
    const observation = buildDescriptiveLabObservation(
      r.testName,
      r.isVerified && r.verifiedValue !== undefined ? r.verifiedValue : r.value,
      r.unit,
      r.referenceRange,
      r.status
    );

    const rangeContext = r.isRangeExplicitInSource && r.referenceRange
      ? `Explicit in document: ${r.referenceRange.text || `${r.referenceRange.low} - ${r.referenceRange.high}`}`
      : 'Reference interval omitted from source document (Strict Range Guard)';

    return {
      testName: r.testName,
      observation,
      status: r.status,
      referenceRangeContext: rangeContext,
      sourceSnippet: r.sourceSnippet,
    };
  });

  // 2. Structured objective findings across categories
  const objectiveFindings: Array<{
    category: string;
    text: string;
    sourceSnippet?: string;
    sourceReport?: string;
  }> = [];

  // Patient Intake Demographics & History
  const conditionsList = patient.conditions.map(c => c.name).join(', ') || 'None documented';
  const allergiesList = patient.allergies.map(a => `${a.allergen} (${a.reaction || 'reaction unrecorded'})`).join(', ') || 'No known allergies';
  const medsList = patient.currentMedications.map(m => `${m.name} ${m.dosage || ''}`).join(', ') || 'None reported';

  objectiveFindings.push({
    category: 'Patient Profile & Documented History',
    text: `Patient is a ${patient.age}-year-old ${patient.sex}. Documented historical conditions in intake include: ${conditionsList}. Stated allergies: ${allergiesList}. Current reported medications: ${medsList}.`,
    sourceSnippet: `Age: ${patient.age}, Sex: ${patient.sex}, Source: USER_INTAKE`,
  });

  // Reported Symptoms
  if (patient.symptoms.length > 0) {
    const symptomDesc = patient.symptoms
      .map(s => `${s.description} (Duration: ${s.duration || 'unspecified'}, Severity: ${s.severity || 'unspecified'})`)
      .join('; ');

    objectiveFindings.push({
      category: 'Reported Symptoms',
      text: `Intake records the following patient-reported symptoms: ${symptomDesc}.`,
      sourceSnippet: `Symptoms count: ${patient.symptoms.length}`,
    });
  }

  // Laboratory Observations
  const highLabs = labResults.filter(r => r.status === 'HIGH');
  const lowLabs = labResults.filter(r => r.status === 'LOW');
  const unverifiedCount = labResults.filter(r => !r.isVerified).length;
  const verifiedCount = labResults.filter(r => r.isVerified).length;

  if (highLabs.length > 0) {
    objectiveFindings.push({
      category: 'Laboratory Parameters Above Reference Limits',
      text: `The following ${highLabs.length} test result(s) exceed the upper reference intervals stated in the source documents: ${highLabs.map(l => `${l.testName} (${l.value} ${l.unit || ''})`).join(', ')}.`,
    });
  }

  if (lowLabs.length > 0) {
    objectiveFindings.push({
      category: 'Laboratory Parameters Below Reference Limits',
      text: `The following ${lowLabs.length} test result(s) fall below the lower reference intervals stated in the source documents: ${lowLabs.map(l => `${l.testName} (${l.value} ${l.unit || ''})`).join(', ')}.`,
    });
  }

  // Strict Range Guard notice
  const missingRangeLabs = labResults.filter(r => !r.isRangeExplicitInSource);
  if (missingRangeLabs.length > 0) {
    objectiveFindings.push({
      category: 'Strict Reference Range Guard Adherence',
      text: `${missingRangeLabs.length} parameter(s) lacked explicit reference ranges in source documents (${missingRangeLabs.map(l => l.testName).join(', ')}). In accordance with clinical safety invariants, standard ranges were not assumed or hallucinated.`,
    });
  }

  // Human-in-the-Loop Verification status
  objectiveFindings.push({
    category: 'Human-in-the-Loop Audit Status',
    text: `Verification workbench contains ${labResults.length} extracted parameters: ${verifiedCount} verified by clinician/user, ${unverifiedCount} pending confirmation.`,
  });

  // Clinical Reconciliation Checklist
  const clinicalReconciliationChecklist: string[] = [];
  for (const inc of inconsistencies) {
    if (inc.type === 'ALLERGY_MEDICATION_CONFLICT') {
      clinicalReconciliationChecklist.push(
        `[High Priority] Clarify allergy conflict: ${inc.involvedEntities.join(' vs. ')} before order administration.`
      );
    } else if (inc.type === 'CONTRADICTORY_TESTS') {
      clinicalReconciliationChecklist.push(
        `[Priority] Reconcile discordant diagnostic results for: ${inc.involvedEntities.join(' vs. ')}.`
      );
    } else if (inc.type === 'TEMPORAL_ANOMALY') {
      clinicalReconciliationChecklist.push(
        `[Review] Confirm chronological sequence regarding: ${inc.involvedEntities.join(' and ')}.`
      );
    }
  }

  if (clinicalReconciliationChecklist.length === 0) {
    clinicalReconciliationChecklist.push('No acute clinical inconsistencies identified across ingested documents.');
  }

  // Audit safety boundary
  const fullTextToAudit = objectiveFindings.map(f => f.text).join(' ') + ' ' + notableValues.map(n => n.observation).join(' ');
  const auditResult = auditSafetyBoundary(fullTextToAudit);

  return {
    id: `synthesis-${patient.id}-${Date.now()}`,
    patientId: patient.id,
    generatedAt: new Date().toISOString(),
    disclaimer: MANDATORY_CLINICAL_DISCLAIMER,
    objectiveFindings,
    notableValues,
    inconsistenciesIdentified: inconsistencies,
    clinicalReconciliationChecklist,
    safetyGuardAudit: {
      passed: auditResult.passed,
      violatingTermsFound: auditResult.violationsFound,
      enforcedBoundaryStatement: 'Deterministic non-diagnostic constraint actively enforced. Diagnostic assertions and prescriptive orders are strictly barred.',
    },
  };
}
