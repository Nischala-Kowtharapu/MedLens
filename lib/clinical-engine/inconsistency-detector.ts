import {
  PatientIntake,
  ExtractedLabResult,
  ClinicalInconsistency,
  ClinicalDocument,
} from '@/types/clinical';

/**
 * Clinical Inconsistency & Conflict Detection Engine
 * 
 * Identifies 3 critical categories:
 * 1. ALLERGY_MEDICATION_CONFLICT
 * 2. CONTRADICTORY_TESTS
 * 3. TEMPORAL_ANOMALY
 */

// Drug class allergy cross-reactivity definitions
interface DrugClassMapping {
  allergenKeywords: string[];
  medicationKeywords: string[];
  className: string;
  severity: 'high' | 'medium' | 'low';
  clinicalGuidance: string;
}

const KNOWN_DRUG_CONFLICT_RULES: DrugClassMapping[] = [
  {
    className: 'ACE Inhibitor',
    allergenKeywords: ['ace inhibitor', 'acei', 'lisinopril', 'enalapril', 'ramipril', 'captopril', 'angioedema'],
    medicationKeywords: ['lisinopril', 'enalapril', 'ramipril', 'captopril', 'benazepril', 'fosinopril', 'quinapril'],
    severity: 'high',
    clinicalGuidance: 'Patient has documented ACE-inhibitor / angioedema sensitivity. Prescribing an ACE inhibitor carries severe risk of recurrent angioedema or airway compromise. Clinician should clarify whether an ARB or alternative antihypertensive was intended.',
  },
  {
    className: 'Penicillin / Beta-Lactam',
    allergenKeywords: ['penicillin', 'pcn', 'amoxicillin', 'ampicillin', 'augmentin'],
    medicationKeywords: ['penicillin', 'amoxicillin', 'ampicillin', 'augmentin', 'piperacillin', 'zosyn', 'nafcillin', 'oxacillin'],
    severity: 'high',
    clinicalGuidance: 'Active or ordered medication belongs to the penicillin class, conflicting with stated penicillin allergy. Clarify allergy reaction severity (e.g. hives vs anaphylaxis) and evaluate non-beta-lactam alternatives.',
  },
  {
    className: 'Aspirin / NSAIDs',
    allergenKeywords: ['aspirin', 'asa', 'nsaid', 'ibuprofen', 'naproxen'],
    medicationKeywords: ['aspirin', 'asa', 'ibuprofen', 'advil', 'motrin', 'naproxen', 'aleve', 'ketorolac', 'toradol', 'meloxicam', 'diclofenac', 'indomethacin'],
    severity: 'high',
    clinicalGuidance: 'Patient has documented Aspirin or NSAID sensitivity. Prescribed anti-inflammatory/antiplatelet agent may trigger bronchospasm, urticaria, or anaphylactoid response. Consult prescriber.',
  },
  {
    className: 'Sulfonamide (Sulfa)',
    allergenKeywords: ['sulfa', 'sulfonamide', 'bactrim', 'septra'],
    medicationKeywords: ['sulfamethoxazole', 'bactrim', 'septra', 'sulfasalazine', 'sulfadiazine'],
    severity: 'high',
    clinicalGuidance: 'Patient has documented sulfa allergy. Prescribed medication contains sulfonamide moieties with high hypersensitivity risk.',
  },
  {
    className: 'Opioid Hypersensitivity',
    allergenKeywords: ['codeine', 'morphine', 'opioid', 'oxycodone'],
    medicationKeywords: ['codeine', 'morphine', 'oxycodone', 'percocet', 'hydrocodone', 'vicodin', 'hydromorphone', 'dilaudid'],
    severity: 'medium',
    clinicalGuidance: 'Patient has reported opioid allergy. Verify whether reaction represents true IgE-mediated anaphylaxis versus common histamine-release side effect (nausea, pruritus).',
  },
  {
    className: 'Statin Intolerance / Myopathy',
    allergenKeywords: ['statin', 'atorvastatin', 'simvastatin', 'myopathy', 'rhabdomyolysis'],
    medicationKeywords: ['atorvastatin', 'lipitor', 'simvastatin', 'zocor', 'rosuvastatin', 'crestor', 'pravastatin'],
    severity: 'medium',
    clinicalGuidance: 'Patient profile notes statin intolerance or allergy. Verify tolerance history and consider alternative lipid-lowering therapies (e.g., Ezetimibe, PCSK9 inhibitors).',
  },
];

export function detectAllergyMedicationConflicts(
  intake: PatientIntake
): ClinicalInconsistency[] {
  const conflicts: ClinicalInconsistency[] = [];

  const allergies = intake.allergies || [];
  const medications = intake.currentMedications || [];

  for (const allergy of allergies) {
    const allergenLower = (allergy.allergen || '').toLowerCase().trim();

    for (const rule of KNOWN_DRUG_CONFLICT_RULES) {
      const allergyMatchesRule = rule.allergenKeywords.some(kw =>
        allergenLower.includes(kw.toLowerCase())
      );

      if (allergyMatchesRule) {
        for (const med of medications) {
          const medNameLower = (med.name || '').toLowerCase().trim();
          const medMatchesRule = rule.medicationKeywords.some(kw =>
            medNameLower.includes(kw.toLowerCase())
          );

          if (medMatchesRule) {
            conflicts.push({
              id: `conflict-allergy-${allergy.allergen}-${med.name}`.toLowerCase().replace(/\s+/g, '-'),
              type: 'ALLERGY_MEDICATION_CONFLICT',
              description: `Severe conflict detected: Patient has recorded allergy to "${allergy.allergen}" (${allergy.reaction || 'reaction unspecified'}), yet medication list includes "${med.name}" (${rule.className} class).`,
              severity: rule.severity,
              involvedEntities: [allergy.allergen, med.name],
              clinicalGuidance: rule.clinicalGuidance,
              detectedAt: new Date().toISOString(),
              status: 'ACTIVE',
            });
          }
        }
      }
    }
  }

  return conflicts;
}

export function detectContradictoryTests(
  labResults: ExtractedLabResult[]
): ClinicalInconsistency[] {
  const conflicts: ClinicalInconsistency[] = [];
  const groupedByName: Record<string, ExtractedLabResult[]> = {};

  // Group tests by normalized name
  for (const result of labResults) {
    const normName = normalizeTestName(result.testName);
    if (!groupedByName[normName]) {
      groupedByName[normName] = [];
    }
    groupedByName[normName].push(result);
  }

  // Check for divergent results for the same test across reports
  for (const [testName, results] of Object.entries(groupedByName)) {
    if (results.length > 1) {
      const numericResults = results.filter(
        r => typeof r.value === 'number' || !isNaN(parseFloat(String(r.value)))
      );

      // Check numeric variance (e.g. Troponin POC negative/0 vs Core Lab 145, or Glucose 62 vs 198)
      if (numericResults.length >= 2) {
        const val1 = typeof numericResults[0].value === 'number' ? numericResults[0].value : parseFloat(String(numericResults[0].value));
        const val2 = typeof numericResults[1].value === 'number' ? numericResults[1].value : parseFloat(String(numericResults[1].value));
        const status1 = numericResults[0].status;
        const status2 = numericResults[1].status;

        // Opposing clinical classifications (e.g. NORMAL vs HIGH, or NORMAL vs CRITICAL)
        if (
          (status1 === 'NORMAL' && (status2 === 'HIGH' || status2 === 'LOW' || numericResults[1].flaggedCritical)) ||
          (status2 === 'NORMAL' && (status1 === 'HIGH' || status1 === 'LOW' || numericResults[0].flaggedCritical))
        ) {
          conflicts.push({
            id: `conflict-discordant-${testName}`.toLowerCase().replace(/\s+/g, '-'),
            type: 'CONTRADICTORY_TESTS',
            description: `Discordant test results identified for ${results[0].testName}: One report states ${val1} ${results[0].unit || ''} (Status: ${status1}) while another report states ${val2} ${results[1].unit || ''} (Status: ${status2}).`,
            severity: numericResults[0].flaggedCritical || numericResults[1].flaggedCritical ? 'high' : 'medium',
            involvedEntities: [
              `${results[0].testName} (${val1} ${results[0].unit || ''}) [${results[0].reportId}]`,
              `${results[1].testName} (${val2} ${results[1].unit || ''}) [${results[1].reportId}]`,
            ],
            clinicalGuidance: 'Discordant lab measurements may result from different assay methodologies (e.g., Point-of-Care strip vs high-sensitivity core lab analyzer), specimen hemolyzation, or rapid clinical evolution. Verify sample collection timing and source methodology.',
            detectedAt: new Date().toISOString(),
            status: 'ACTIVE',
          });
        }
      }
    }
  }

  // Cross-test contradictions (e.g., Fasting Blood Glucose vs HbA1c discordance or POC vs Core Lab Troponin)
  const troponinPOC = labResults.find(r => /troponin.*(?:poc|rapid|qual)/i.test(r.testName));
  const troponinCore = labResults.find(r => /troponin.*(?:hs|core|i|t|quantitative)/i.test(r.testName));
  if (troponinPOC && troponinCore) {
    const pocVal = String(troponinPOC.value).toLowerCase();
    const coreVal = typeof troponinCore.value === 'number' ? troponinCore.value : parseFloat(String(troponinCore.value));
    if ((pocVal.includes('neg') || pocVal === '0') && coreVal > 0.04) {
      conflicts.push({
        id: 'conflict-troponin-poc-core-discordance',
        type: 'CONTRADICTORY_TESTS',
        description: `Acute Cardiac Biomarker Discordance: Rapid bedside/POC troponin was recorded as Negative, whereas high-sensitivity serum troponin is elevated at ${coreVal} ${troponinCore.unit || 'ng/L'}.`,
        severity: 'high',
        involvedEntities: [troponinPOC.testName, troponinCore.testName],
        clinicalGuidance: 'Bedside qualitative troponin has significantly lower sensitivity than core laboratory high-sensitivity assays. Clinician should rely on high-sensitivity laboratory measurement and clinical presentation.',
        detectedAt: new Date().toISOString(),
        status: 'ACTIVE',
      });
    }
  }

  return conflicts;
}

export function detectTemporalAnomalies(
  intake: PatientIntake,
  documents: ClinicalDocument[]
): ClinicalInconsistency[] {
  const anomalies: ClinicalInconsistency[] = [];

  // Check medication prescribed date vs symptom duration
  const medications = intake.currentMedications || [];
  const symptoms = intake.symptoms || [];

  for (const med of medications) {
    if (med.prescribedDate) {
      const medDate = new Date(med.prescribedDate);

      // Compare against symptom onset if symptom specifies duration
      for (const symptom of symptoms) {
        if (symptom.duration && symptom.duration.toLowerCase().includes('day')) {
          const days = parseInt(symptom.duration.replace(/[^\d]/g, ''), 10);
          if (!isNaN(days) && days < 14) {
            const approximateOnset = new Date();
            approximateOnset.setDate(approximateOnset.getDate() - days);

            // If medication was prescribed months prior for what is claimed to be acute 2-day symptom
            const diffMonths = (approximateOnset.getTime() - medDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
            if (diffMonths > 3) {
              anomalies.push({
                id: `temporal-${med.name}-${symptom.description}`.toLowerCase().replace(/\s+/g, '-'),
                type: 'TEMPORAL_ANOMALY',
                description: `Timeline divergence: Medication "${med.name}" was prescribed on ${med.prescribedDate} (>3 months ago), but symptom "${symptom.description}" is recorded with acute duration of only "${symptom.duration}".`,
                severity: 'medium',
                involvedEntities: [med.name, symptom.description],
                clinicalGuidance: 'Check whether medication was prescribed for an earlier episode or whether the symptom is a chronic recurrence rather than a primary acute onset.',
                detectedAt: new Date().toISOString(),
                status: 'ACTIVE',
              });
            }
          }
        }
      }
    }
  }

  // Check document chronology
  if (documents.length > 1) {
    for (let i = 0; i < documents.length - 1; i++) {
      const d1 = new Date(documents[i].date);
      const d2 = new Date(documents[i + 1].date);
      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) continue;

      // Check if earlier document references future events
      if (documents[i].rawText.includes(documents[i + 1].date) && d1 < d2) {
        anomalies.push({
          id: `temporal-doc-ref-${documents[i].id}`,
          type: 'TEMPORAL_ANOMALY',
          description: `Document "${documents[i].title}" (dated ${documents[i].date}) contains text references to a future date (${documents[i + 1].date}).`,
          severity: 'low',
          involvedEntities: [documents[i].title, documents[i + 1].title],
          clinicalGuidance: 'Verify document intake timestamps and transcription dates.',
          detectedAt: new Date().toISOString(),
          status: 'ACTIVE',
        });
      }
    }
  }

  return anomalies;
}

export function runFullInconsistencyDetection(
  intake: PatientIntake,
  labResults: ExtractedLabResult[],
  documents: ClinicalDocument[]
): ClinicalInconsistency[] {
  const conflicts = [
    ...detectAllergyMedicationConflicts(intake),
    ...detectContradictoryTests(labResults),
    ...detectTemporalAnomalies(intake, documents),
  ];

  // Deduplicate by ID
  const seen = new Set<string>();
  return conflicts.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

function normalizeTestName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(serum|plasma|blood|total|level|fasting)/g, '')
    .trim();
}
