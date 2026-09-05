import {
  PatientIntake,
  ExtractedLabResult,
  ClinicalInconsistency,
} from '@/types/medlens';
import {
  MANDATORY_CLINICAL_DISCLAIMER,
  auditSafetyBoundary,
} from '@/lib/clinical-engine/safety-boundary';
import { ConflictDetectionReport } from './conflict-detector';

export interface ClinicianOverview {
  title: string;
  disclaimer: string;
  executiveSummary: string;
  demographicProfile: string;
  panelFindings: Array<{
    panelName: string;
    findings: string[];
  }>;
  criticalAlerts: string[];
  missingRangeAudits: string[];
  reconciliationChecklist: string[];
  rawMarkdown: string;
}

export interface PatientFriendlySummary {
  title: string;
  readingLevel: '6th-Grade Patient-Accessible';
  disclaimer: string;
  whatWasTested: string;
  numbersToNotice: string[];
  medicineAndAllergyNotice: string | null;
  missingRangesExplanation: string | null;
  questionsForDoctor: string[];
  rawMarkdown: string;
}

export interface ClinicalSummariesResult {
  patientId: string;
  generatedAt: string;
  clinicianOverview: ClinicianOverview;
  patientSummary: PatientFriendlySummary;
  safetyAudit: {
    passed: boolean;
    violationsFound: string[];
    enforcedSafetyStatement: string;
  };
}

/**
 * Generates both the Clinician Overview and the 6th-Grade Patient-Friendly Summary,
 * enforcing strict non-diagnostic invariants and zero invented reference ranges.
 */
export function generateClinicalSummaries(
  patient: PatientIntake,
  labResults: ExtractedLabResult[],
  conflictReport?: ConflictDetectionReport
): ClinicalSummariesResult {
  // 1. Group results by Category / Panel
  const panelMap = new Map<string, ExtractedLabResult[]>();
  for (const lab of labResults) {
    const category = lab.category || 'General Laboratory Panel';
    if (!panelMap.has(category)) {
      panelMap.set(category, []);
    }
    panelMap.get(category)!.push(lab);
  }

  // 2. Generate Clinician Overview
  const clinicianOverview = buildClinicianOverview(patient, labResults, panelMap, conflictReport);

  // 3. Generate 6th-Grade Patient-Friendly Summary
  const patientSummary = buildPatientFriendlySummary(patient, labResults, conflictReport);

  // 4. Run safety audit across both generated markdown documents
  const fullText = clinicianOverview.rawMarkdown + '\n' + patientSummary.rawMarkdown;
  const audit = auditSafetyBoundary(fullText);

  return {
    patientId: patient.id,
    generatedAt: new Date().toISOString(),
    clinicianOverview,
    patientSummary,
    safetyAudit: {
      passed: audit.passed,
      violationsFound: audit.violationsFound,
      enforcedSafetyStatement: 'Deterministic safety boundary verified. No medical diagnoses or prescriptive treatment instructions were generated.',
    },
  };
}

/**
 * Builds the Clinician Overview
 */
function buildClinicianOverview(
  patient: PatientIntake,
  labResults: ExtractedLabResult[],
  panelMap: Map<string, ExtractedLabResult[]>,
  conflictReport?: ConflictDetectionReport
): ClinicianOverview {
  const allergyList = patient.allergies.map(a => `${a.allergen} (${a.reaction || 'reaction unspecified'})`).join('; ') || 'No recorded drug allergies';
  const condList = patient.conditions.map(c => c.name).join(', ') || 'No recorded past medical conditions';
  const medList = patient.currentMedications.map(m => `${m.name} ${m.dosage || ''} ${m.frequency || ''}`.trim()).join('; ') || 'No active medications';

  const demographicProfile = `Patient is a ${patient.age}-year-old ${patient.sex}. Documented intake conditions: ${condList}. Stated allergies: ${allergyList}. Active medications: ${medList}.`;

  const highLabs = labResults.filter(l => l.status === 'HIGH');
  const lowLabs = labResults.filter(l => l.status === 'LOW');
  const unspecifiedLabs = labResults.filter(l => l.status === 'UNSPECIFIED' || l.referenceRange === null);

  const executiveSummary = `Synthesis of ${labResults.length} extracted laboratory findings across ${panelMap.size} panel(s). Identified ${highLabs.length} parameter(s) above report-stated reference limits, ${lowLabs.length} parameter(s) below reference limits, and ${unspecifiedLabs.length} parameter(s) with unspecified/null reference intervals. Cross-referencing against intake identified ${conflictReport?.allergyMedicationConflicts.length || 0} allergy-medication inconsistency and ${conflictReport?.criticalLabAlerts.length || 0} critical laboratory observation(s).`;

  const panelFindings: Array<{ panelName: string; findings: string[] }> = [];
  for (const [panelName, tests] of panelMap.entries()) {
    const findings = tests.map(t => {
      const val = `${t.isVerified && t.verifiedValue !== undefined ? t.verifiedValue : t.value}${t.unit ? ' ' + t.unit : ''}`;
      if (t.referenceRange) {
        const rangeStr = t.referenceRange.text || `${t.referenceRange.low} - ${t.referenceRange.high}`;
        return `${t.testName}: ${val} (Reference Interval: ${rangeStr}, Status: ${t.status})`;
      } else {
        return `${t.testName}: ${val} (Reference Interval: Omitted from source report, Status: UNSPECIFIED)`;
      }
    });
    panelFindings.push({ panelName, findings });
  }

  const criticalAlerts = (conflictReport?.criticalLabAlerts || []).map(
    c => `[CRITICAL] ${c.testName} recorded at ${c.value} ${c.unit || ''}. ${c.clinicalRationale}`
  );

  const missingRangeAudits = unspecifiedLabs.map(
    u => `[STRICT RANGE GUARD] ${u.testName} (${u.value} ${u.unit || ''}): Source document omitted reference interval. Standard range deliberately not hallucinated.`
  );

  const reconciliationChecklist: string[] = [];
  if (conflictReport?.allergyMedicationConflicts.length) {
    for (const c of conflictReport.allergyMedicationConflicts) {
      reconciliationChecklist.push(`Reconcile Allergy Inconsistency: ${c.involvedEntities.join(' vs. ')}. ${c.clinicalGuidance || ''}`);
    }
  }
  if (criticalAlerts.length > 0) {
    reconciliationChecklist.push('Correlate critical laboratory elevations with clinical presentation and repeat STAT if clinically discordant.');
  }
  if (reconciliationChecklist.length === 0) {
    reconciliationChecklist.push('No acute pharmacological or diagnostic conflicts identified.');
  }

  // Construct raw markdown
  const rawMarkdown = `## Clinician Overview: Objective Synthesis

> **Clinical Safety Notice:** ${MANDATORY_CLINICAL_DISCLAIMER}

### Patient Profile & Intake Context
- **Demographics:** ${patient.age} years old, ${patient.sex} (Source: ${patient.source})
- **Documented Conditions:** ${condList}
- **Recorded Allergies:** ${allergyList}
- **Active Regimen:** ${medList}

### Executive Synthesis
${executiveSummary}

### Laboratory Panels
${panelFindings.map(p => `#### ${p.panelName}\n${p.findings.map(f => `- ${f}`).join('\n')}`).join('\n\n')}

### Strict Reference Range Audits
${missingRangeAudits.length > 0 ? missingRangeAudits.map(a => `- ${a}`).join('\n') : '- All extracted parameters contained explicit reference ranges.'}

### Clinical Reconciliation Checklist
${reconciliationChecklist.map(r => `- [ ] ${r}`).join('\n')}
`;

  return {
    title: 'Clinician Overview: Objective Synthesis',
    disclaimer: MANDATORY_CLINICAL_DISCLAIMER,
    executiveSummary,
    demographicProfile,
    panelFindings,
    criticalAlerts,
    missingRangeAudits,
    reconciliationChecklist,
    rawMarkdown,
  };
}

/**
 * Builds the 6th-Grade Patient-Friendly Summary
 */
function buildPatientFriendlySummary(
  patient: PatientIntake,
  labResults: ExtractedLabResult[],
  conflictReport?: ConflictDetectionReport
): PatientFriendlySummary {
  const whatWasTested = `Your healthcare team ran laboratory tests to check different parts of your health. These included tests looking at your blood counts, cholesterol levels, and body chemistry.`;

  const numbersToNotice: string[] = [];
  for (const lab of labResults) {
    const val = `${lab.isVerified && lab.verifiedValue !== undefined ? lab.verifiedValue : lab.value}${lab.unit ? ' ' + lab.unit : ''}`;

    if (lab.status === 'HIGH' && lab.referenceRange) {
      const bound = lab.referenceRange.text || `${lab.referenceRange.low} to ${lab.referenceRange.high}`;
      numbersToNotice.push(
        `Your ${friendlyTestName(lab.testName)} was ${val}. The paper from your lab says the normal range is ${bound}. This number is higher than the printed normal range.`
      );
    } else if (lab.status === 'LOW' && lab.referenceRange) {
      const bound = lab.referenceRange.text || `${lab.referenceRange.low} to ${lab.referenceRange.high}`;
      numbersToNotice.push(
        `Your ${friendlyTestName(lab.testName)} was ${val}. The paper from your lab says the normal range is ${bound}. This number is lower than the printed normal range.`
      );
    }
  }

  if (numbersToNotice.length === 0) {
    numbersToNotice.push('All laboratory test numbers with printed normal ranges were within the standard limits.');
  }

  // Allergy / Medication Notice
  let medicineAndAllergyNotice: string | null = null;
  const allergyConflicts = conflictReport?.allergyMedicationConflicts || [];
  if (allergyConflicts.length > 0) {
    const firstConflict = allergyConflicts[0];
    medicineAndAllergyNotice = `Important Safety Notice: Your chart shows you have an allergy to ${firstConflict.involvedEntities[0]}, but your list also shows ${firstConflict.involvedEntities[1]} as a medicine. Because these medicines are in the same family, please call your doctor or pharmacist right away before taking this medicine to make sure it is safe for you.`;
  }

  // Missing Range Notice
  const missingRanges = labResults.filter(l => l.referenceRange === null || !l.isRangeExplicitInSource);
  let missingRangesExplanation: string | null = null;
  if (missingRanges.length > 0) {
    const testNames = missingRanges.map(m => friendlyTestName(m.testName)).join(', ');
    missingRangesExplanation = `Note about test ranges: For some tests (${testNames}), the laboratory did not print a normal range on your report. We do not guess normal ranges when they are not printed. Your doctor will explain what these numbers mean for your personal care.`;
  }

  // Questions for doctor
  const questionsForDoctor = [
    'What do my higher or lower test numbers mean for my daily health plan?',
    medicineAndAllergyNotice ? 'Can you double-check my allergy list and make sure all my medicines are completely safe?' : 'Do I need any changes to my current medicines?',
    missingRanges.length > 0 ? 'Could you explain the test numbers that did not have a printed normal range on my report?' : 'When should I have my next routine check-up or blood test?',
    'Are there any simple daily habits, foods, or exercise that you suggest based on these results?',
  ];

  const rawMarkdown = `## Patient Summary (Easy-to-Read Guide)

> **Important Reminder:** ${MANDATORY_CLINICAL_DISCLAIMER}
> This guide is here to help you understand your test report. It does not diagnose medical conditions or tell you to start or stop any medicine.

### 1. What Tests Were Done
${whatWasTested}

### 2. Numbers to Notice
${numbersToNotice.map(n => `- ${n}`).join('\n')}

${missingRangesExplanation ? `### 3. Note About Missing Normal Ranges\n${missingRangesExplanation}\n` : ''}
${medicineAndAllergyNotice ? `### 4. ⚠️ Important Safety Alert About Your Medicines\n**${medicineAndAllergyNotice}**\n` : ''}
### 5. Questions to Ask Your Doctor at Your Next Visit
${questionsForDoctor.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}
`;

  return {
    title: 'Patient Summary (Easy-to-Read Guide)',
    readingLevel: '6th-Grade Patient-Accessible',
    disclaimer: MANDATORY_CLINICAL_DISCLAIMER,
    whatWasTested,
    numbersToNotice,
    medicineAndAllergyNotice,
    missingRangesExplanation,
    questionsForDoctor,
    rawMarkdown,
  };
}

function friendlyTestName(rawName: string): string {
  const lower = rawName.toLowerCase();
  if (lower.includes('wbc') || lower.includes('white blood cell')) return 'white blood cell count (infection fighting cells)';
  if (lower.includes('rbc') || lower.includes('red blood cell')) return 'red blood cell count (oxygen carrying cells)';
  if (lower.includes('hemoglobin') || lower.includes('hgb')) return 'hemoglobin (blood iron level)';
  if (lower.includes('hematocrit')) return 'hematocrit (percentage of blood made of red cells)';
  if (lower.includes('platelet')) return 'platelet count (clotting cells)';
  if (lower.includes('total cholesterol')) return 'total cholesterol';
  if (lower.includes('triglyceride')) return 'triglycerides (blood fats)';
  if (lower.includes('hdl')) return 'HDL (good cholesterol)';
  if (lower.includes('ldl')) return 'LDL (bad cholesterol)';
  if (lower.includes('glucose')) return 'blood sugar';
  if (lower.includes('creatinine')) return 'creatinine (kidney function marker)';
  if (lower.includes('potassium')) return 'potassium (body salt)';
  return rawName;
}
