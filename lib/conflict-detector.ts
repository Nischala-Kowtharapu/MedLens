import {
  PatientIntake,
  ExtractedLabResult,
  ClinicalInconsistency,
} from '@/types/medlens';

export interface CriticalLabAlert {
  id: string;
  resultId: string;
  testName: string;
  value: number | string;
  unit: string | null;
  referenceRange: { low?: number; high?: number; text?: string } | null;
  status: string;
  severity: 'high' | 'critical';
  clinicalRationale: string;
  sourceSnippet: string;
}

export interface MissingRangeAlert {
  id: string;
  resultId: string;
  testName: string;
  value: number | string;
  unit: string | null;
  sourceSnippet: string;
  explanation: string;
}

export interface ConflictDetectionReport {
  patientId: string;
  timestamp: string;
  allergyMedicationConflicts: ClinicalInconsistency[];
  criticalLabAlerts: CriticalLabAlert[];
  missingRangeAlerts: MissingRangeAlert[];
  allInconsistencies: ClinicalInconsistency[];
  summary: {
    totalAllergyConflicts: number;
    totalCriticalLabs: number;
    totalMissingRanges: number;
    requiresUrgentClinicianReview: boolean;
  };
}

/**
 * Clinical cross-reactivity and medication class definitions
 */
interface AllergyRule {
  allergenKeywords: string[];
  medicationKeywords: string[];
  drugClass: string;
  severity: 'high' | 'medium';
  guidance: string;
}

const CLINICAL_ALLERGY_RULES: AllergyRule[] = [
  {
    drugClass: 'Penicillin / Beta-Lactam Core',
    allergenKeywords: ['penicillin', 'pcn', 'amoxicillin', 'ampicillin', 'augmentin'],
    medicationKeywords: [
      'penicillin', 'amoxicillin', 'ampicillin', 'augmentin',
      'piperacillin', 'zosyn', 'nafcillin', 'oxacillin', 'dicloxacillin'
    ],
    severity: 'high',
    guidance: 'Patient has documented Penicillin hypersensitivity. Active or prescribed medication belongs to the aminopenicillin / beta-lactam family, creating immediate risk of IgE-mediated anaphylaxis or severe cutaneous adverse reactions. Clinician should discontinue and evaluate non-beta-lactam alternatives (e.g. Macrolides, Clindamycin).',
  },
  {
    drugClass: 'Cephalosporin Class',
    allergenKeywords: ['cephalosporin', 'keflex', 'cephalexin', 'rocephin', 'ceftriaxone'],
    medicationKeywords: ['cephalexin', 'keflex', 'ceftriaxone', 'rocephin', 'cefazolin', 'cefdinir', 'cefepime'],
    severity: 'high',
    guidance: 'Patient has reported cephalosporin allergy. Verify whether reaction was an isolated rash or severe immediate hypersensitivity before administering cephalosporins.',
  },
  {
    drugClass: 'ACE Inhibitor (Angioedema Risk)',
    allergenKeywords: ['ace inhibitor', 'acei', 'lisinopril', 'enalapril', 'ramipril', 'captopril', 'angioedema'],
    medicationKeywords: ['lisinopril', 'enalapril', 'ramipril', 'captopril', 'benazepril', 'fosinopril', 'quinapril', 'perindopril'],
    severity: 'high',
    guidance: 'Patient profile notes sensitivity or prior angioedema related to ACE inhibitors. Prescribing an ACE inhibitor carries severe risk of life-threatening laryngeal edema. Consider ARB (with caution) or alternative antihypertensive class.',
  },
  {
    drugClass: 'Aspirin / Non-Steroidal Anti-Inflammatory Drugs (NSAIDs)',
    allergenKeywords: ['aspirin', 'asa', 'nsaid', 'ibuprofen', 'naproxen', 'advil', 'motrin', 'aleve'],
    medicationKeywords: [
      'aspirin', 'asa', 'ibuprofen', 'advil', 'motrin', 'naproxen',
      'aleve', 'ketorolac', 'toradol', 'meloxicam', 'diclofenac', 'indomethacin', 'celecoxib'
    ],
    severity: 'high',
    guidance: 'Patient has documented Aspirin or NSAID sensitivity (or AERD triad). Administration can trigger bronchospasm, severe rhinorrhea, or anaphylactoid collapse. Prescribing physician must review antiplatelet/analgesic indication.',
  },
  {
    drugClass: 'Sulfonamides (Sulfa)',
    allergenKeywords: ['sulfa', 'sulfonamide', 'bactrim', 'septra'],
    medicationKeywords: ['sulfamethoxazole', 'bactrim', 'septra', 'sulfasalazine', 'sulfadiazine'],
    severity: 'high',
    guidance: 'Patient has documented sulfa hypersensitivity. Prescribed antimicrobial contains sulfonamide antimicrobial moieties with high risk of rash, Stevens-Johnson syndrome, or systemic toxicity.',
  },
  {
    drugClass: 'Opioid Analgesics',
    allergenKeywords: ['codeine', 'morphine', 'opioid', 'oxycodone'],
    medicationKeywords: ['codeine', 'morphine', 'oxycodone', 'percocet', 'hydrocodone', 'vicodin', 'hydromorphone', 'dilaudid', 'fentanyl'],
    severity: 'medium',
    guidance: 'Patient has reported opioid allergy. Clinician should clarify whether this reflects a true anaphylactic allergy versus non-allergic histamine release (pruritus, mild nausea).',
  },
  {
    drugClass: 'HMG-CoA Reductase Inhibitors (Statins)',
    allergenKeywords: ['statin', 'atorvastatin', 'simvastatin', 'myopathy', 'rhabdomyolysis'],
    medicationKeywords: ['atorvastatin', 'lipitor', 'simvastatin', 'zocor', 'rosuvastatin', 'crestor', 'pravastatin'],
    severity: 'medium',
    guidance: 'Patient profile records statin intolerance or myopathy. Evaluate baseline CPK and consider non-statin lipid-lowering regimens.',
  },
];

/**
 * 1. Detects Allergy vs. Active Medication Conflicts
 */
export function detectAllergyMedicationConflicts(
  patient: PatientIntake
): ClinicalInconsistency[] {
  const conflicts: ClinicalInconsistency[] = [];
  const allergies = patient.allergies || [];
  const medications = patient.currentMedications || [];

  for (const allergy of allergies) {
    const allergenNormalized = allergy.allergen.toLowerCase().trim();

    for (const rule of CLINICAL_ALLERGY_RULES) {
      const allergyMatches = rule.allergenKeywords.some(kw =>
        allergenNormalized.includes(kw.toLowerCase())
      );

      if (allergyMatches) {
        for (const med of medications) {
          const medNormalized = med.name.toLowerCase().trim();
          const medMatches = rule.medicationKeywords.some(kw =>
            medNormalized.includes(kw.toLowerCase())
          );

          if (medMatches) {
            conflicts.push({
              id: `conflict-allergy-${allergy.allergen}-${med.name}`.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              type: 'ALLERGY_MEDICATION_CONFLICT',
              description: `Severe allergy conflict detected: Patient has recorded allergy to "${allergy.allergen}" (${allergy.reaction || 'reaction unspecified'}), yet active medication regimen includes "${med.name} ${med.dosage || ''}".`,
              severity: rule.severity,
              involvedEntities: [allergy.allergen, med.name],
              clinicalGuidance: rule.guidance,
              status: 'ACTIVE',
            });
          }
        }
      }
    }
  }

  return conflicts;
}

/**
 * 2. Detects Critical Out-of-Range Lab Markers
 */
export function detectCriticalLabAlerts(
  labResults: ExtractedLabResult[]
): CriticalLabAlert[] {
  const alerts: CriticalLabAlert[] = [];

  for (const lab of labResults) {
    const nameLower = lab.testName.toLowerCase();
    const rawVal = typeof lab.value === 'number' ? lab.value : parseFloat(String(lab.value));
    const valString = String(lab.value).toLowerCase();

    // Check cardiac biomarkers (Troponin)
    if (nameLower.includes('troponin')) {
      if (valString.includes('pos') || (!isNaN(rawVal) && rawVal > 14 && lab.unit?.includes('ng/L')) || (!isNaN(rawVal) && rawVal > 0.04 && !lab.unit?.includes('ng/L'))) {
        alerts.push({
          id: `crit-${lab.id}`,
          resultId: lab.id,
          testName: lab.testName,
          value: lab.value,
          unit: lab.unit,
          referenceRange: lab.referenceRange,
          status: 'CRITICAL',
          severity: 'critical',
          clinicalRationale: 'Cardiac troponin level is markedly elevated relative to reference limits. May indicate acute myocardial injury or necrosis. Requires immediate clinical correlation.',
          sourceSnippet: lab.sourceSnippet,
        });
        continue;
      }
    }

    // Check Potassium
    if (nameLower.includes('potassium') && !isNaN(rawVal)) {
      if (rawVal > 5.2 || rawVal < 3.2) {
        alerts.push({
          id: `crit-${lab.id}`,
          resultId: lab.id,
          testName: lab.testName,
          value: lab.value,
          unit: lab.unit,
          referenceRange: lab.referenceRange,
          status: rawVal > 5.2 ? 'HIGH' : 'LOW',
          severity: rawVal > 5.8 || rawVal < 2.8 ? 'critical' : 'high',
          clinicalRationale: rawVal > 5.2
            ? `Serum Potassium (${rawVal} ${lab.unit || 'mmol/L'}) exceeds safe upper limits (hyperkalemia alert). Risk of cardiac conduction slowing or arrhythmias.`
            : `Serum Potassium (${rawVal} ${lab.unit || 'mmol/L'}) is below normal physiological threshold (hypokalemia alert).`,
          sourceSnippet: lab.sourceSnippet,
        });
        continue;
      }
    }

    // Check Creatinine
    if ((nameLower.includes('creatinine') || nameLower.includes('scr')) && !isNaN(rawVal)) {
      if (rawVal >= 1.8) {
        alerts.push({
          id: `crit-${lab.id}`,
          resultId: lab.id,
          testName: lab.testName,
          value: lab.value,
          unit: lab.unit,
          referenceRange: lab.referenceRange,
          status: 'HIGH',
          severity: rawVal >= 2.5 ? 'critical' : 'high',
          clinicalRationale: `Serum Creatinine (${rawVal} ${lab.unit || 'mg/dL'}) indicates marked reduction in glomerular clearance. Review concurrent nephrotoxic agents and dosage adjustments.`,
          sourceSnippet: lab.sourceSnippet,
        });
        continue;
      }
    }

    // Check Glucose (Severe hyperglycemia / hypoglycemia)
    if (nameLower.includes('glucose') && !isNaN(rawVal)) {
      if (rawVal >= 250 || rawVal < 60) {
        alerts.push({
          id: `crit-${lab.id}`,
          resultId: lab.id,
          testName: lab.testName,
          value: lab.value,
          unit: lab.unit,
          referenceRange: lab.referenceRange,
          status: rawVal >= 250 ? 'HIGH' : 'LOW',
          severity: rawVal >= 350 || rawVal < 50 ? 'critical' : 'high',
          clinicalRationale: rawVal >= 250
            ? `Fasting/Serum Glucose (${rawVal} ${lab.unit || 'mg/dL'}) is severely elevated.`
            : `Blood Glucose (${rawVal} ${lab.unit || 'mg/dL'}) is in the hypoglycemic range requiring prompt corrective carbohydrate or monitoring.`,
          sourceSnippet: lab.sourceSnippet,
        });
        continue;
      }
    }

    // Explicitly flagged critical by lab report
    if (lab.flaggedCritical) {
      alerts.push({
        id: `crit-${lab.id}`,
        resultId: lab.id,
        testName: lab.testName,
        value: lab.value,
        unit: lab.unit,
        referenceRange: lab.referenceRange,
        status: lab.status,
        severity: 'high',
        clinicalRationale: `Diagnostic report source explicitly flagged ${lab.testName} as a critical alert value.`,
        sourceSnippet: lab.sourceSnippet,
      });
    }
  }

  return alerts;
}

/**
 * 3. Detects Missing Reference Ranges (Strict Reference Range Guard Auditing)
 */
export function detectMissingReferenceRanges(
  labResults: ExtractedLabResult[]
): MissingRangeAlert[] {
  const alerts: MissingRangeAlert[] = [];

  for (const lab of labResults) {
    if (lab.referenceRange === null || lab.isRangeExplicitInSource === false) {
      alerts.push({
        id: `missing-range-${lab.id}`,
        resultId: lab.id,
        testName: lab.testName,
        value: lab.value,
        unit: lab.unit,
        sourceSnippet: lab.sourceSnippet,
        explanation: `Strict Reference Range Guard: Source report did not provide reference bounds for "${lab.testName}". MedLens strictly sets referenceRange to null and status to UNSPECIFIED to prevent interval hallucination.`,
      });
    }
  }

  return alerts;
}

/**
 * Comprehensive Conflict Detection Orchestrator
 */
export function detectAllConflicts(
  patient: PatientIntake,
  labResults: ExtractedLabResult[]
): ConflictDetectionReport {
  const allergyConflicts = detectAllergyMedicationConflicts(patient);
  const criticalLabAlerts = detectCriticalLabAlerts(labResults);
  const missingRangeAlerts = detectMissingReferenceRanges(labResults);

  const allInconsistencies: ClinicalInconsistency[] = [...allergyConflicts];

  // Convert critical alerts into inconsistency records
  for (const crit of criticalLabAlerts) {
    allInconsistencies.push({
      id: `inconsistency-crit-${crit.resultId}`,
      type: 'CONTRADICTORY_TESTS',
      description: `Critical diagnostic marker: ${crit.testName} (${crit.value} ${crit.unit || ''}). ${crit.clinicalRationale}`,
      severity: crit.severity === 'critical' ? 'high' : 'medium',
      involvedEntities: [crit.testName],
      clinicalGuidance: crit.clinicalRationale,
      status: 'ACTIVE',
    });
  }

  const hasUrgentIssue = allergyConflicts.some(c => c.severity === 'high') ||
    criticalLabAlerts.some(a => a.severity === 'critical');

  return {
    patientId: patient.id,
    timestamp: new Date().toISOString(),
    allergyMedicationConflicts: allergyConflicts,
    criticalLabAlerts,
    missingRangeAlerts,
    allInconsistencies,
    summary: {
      totalAllergyConflicts: allergyConflicts.length,
      totalCriticalLabs: criticalLabAlerts.length,
      totalMissingRanges: missingRangeAlerts.length,
      requiresUrgentClinicianReview: hasUrgentIssue,
    },
  };
}
