import {
  PatientIntake,
  ExtractedLabResult,
  ClinicalInconsistency,
  MedicalReport,
} from '@/types/medlens';

/**
 * Mock Patient Intake Profile
 * Features an explicit Penicillin allergy and an active prescription for Amoxicillin
 * to trigger the deterministic ALLERGY_MEDICATION_CONFLICT detection engine.
 */
export const mockPatientIntake: PatientIntake = {
  id: 'pt-david-miller-01',
  age: 54,
  sex: 'male',
  symptoms: [
    {
      description: 'Persistent mild dry cough and slight chest tightness',
      duration: '2 weeks',
      severity: 'mild',
    },
    {
      description: 'Generalized fatigue following exertion',
      duration: '1 month',
      severity: 'moderate',
    },
  ],
  conditions: [
    {
      name: 'Essential Hypertension',
      diagnosedDate: '2021-06-14',
    },
    {
      name: 'Hypercholesterolemia',
      diagnosedDate: '2022-09-03',
    },
  ],
  allergies: [
    {
      allergen: 'Penicillin',
      reaction: 'Severe urticaria, periorbital edema, and acute wheezing (childhood reaction)',
    },
  ],
  currentMedications: [
    {
      name: 'Amoxicillin',
      dosage: '875 mg',
      frequency: 'twice daily (prescribed for dental abscess prophylaxis)',
    },
    {
      name: 'Lisinopril',
      dosage: '10 mg',
      frequency: 'once daily each morning',
    },
    {
      name: 'Atorvastatin',
      dosage: '20 mg',
      frequency: 'once daily at bedtime',
    },
  ],
  source: 'USER_INTAKE',
};

/**
 * Realistic Raw OCR Text Fixture 1: Complete Blood Count (CBC)
 * All parameters contain explicitly stated reference intervals.
 */
export const rawOcrCbcFixture = `======================================================================
METRO HEALTH DIAGNOSTIC CLINICAL PATHOLOGY
100 MEDICAL CENTER BLVD, SUITE 400
PATIENT: MILLER, DAVID | MRN: ML-54201 | DOB: 1972-04-18 | SEX: M
ORDERING PHYSICIAN: DR. H. REYNOLDS, MD | CLINIC: INTERNAL MEDICINE
SPECIMEN ID: SPEC-2026-CBC-0881 | COLLECTED: 2026-08-20 08:15 AM
ACCESSION: ACC-99201 | STATUS: FINAL REPORT
======================================================================
COMPLETE BLOOD COUNT (CBC) WITH DIFFERENTIAL
----------------------------------------------------------------------
TEST NAME                     RESULT   UNIT     REFERENCE INTERVAL   STATUS
----------------------------------------------------------------------
White Blood Cell (WBC)        7.2      K/uL     4.5 - 11.0           NORMAL
Red Blood Cell (RBC)          4.80     M/uL     4.30 - 5.90          NORMAL
Hemoglobin                    14.5     g/dL     13.5 - 17.5          NORMAL
Hematocrit                    43.2     %        38.8 - 50.0          NORMAL
Mean Corpuscular Vol (MCV)    90.0     fL       80.0 - 100.0         NORMAL
Mean Corpuscular Hgb (MCH)    30.2     pg       27.0 - 33.0          NORMAL
MCH Concentration (MCHC)      33.6     g/dL     32.0 - 36.0          NORMAL
Red Cell Distrib Width (RDW)  12.8     %        11.5 - 14.5          NORMAL
Platelet Count                245      K/uL     150 - 450            NORMAL
Mean Platelet Volume (MPV)    9.4      fL       7.5 - 11.5           NORMAL
----------------------------------------------------------------------
COMMENTS: Automated differential reviewed. Morphology normal.
ELECTRONIC SIGNATURE: E. CHANG, MD, PATHOLOGIST
======================================================================`;

/**
 * Realistic Raw OCR Text Fixture 2: Comprehensive Lipid Panel
 * Features deliberate reference range omissions on Non-HDL and VLDL Cholesterol
 * to rigorously evaluate the Strict Reference Range Guard.
 */
export const rawOcrLipidFixture = `======================================================================
METRO HEALTH SPECIALTY CLINICAL LABORATORIES
PATIENT: MILLER, DAVID | MRN: ML-54201 | DOB: 1972-04-18 | SEX: M
ORDERING PHYSICIAN: DR. H. REYNOLDS, MD | CLINIC: PREVENTIVE CARDIOLOGY
COLLECTED: 2026-08-22 07:30 AM (12-HOUR FASTING SPECIMEN)
ACCESSION: ACC-99415 | STATUS: FINAL REPORT
======================================================================
STANDARD LIPID PROFILE & ATHEROSCLEROTIC RISK PANEL
----------------------------------------------------------------------
TEST NAME                     RESULT   UNIT     REFERENCE INTERVAL   STATUS
----------------------------------------------------------------------
Cholesterol, Total            224      mg/dL    < 200                HIGH
Triglycerides                 185      mg/dL    < 150                HIGH
HDL Cholesterol               42       mg/dL    > 40                 NORMAL
LDL Cholesterol (Calc)        145      mg/dL    < 100                HIGH
Non-HDL Cholesterol           182      mg/dL                         
VLDL Cholesterol              37       mg/dL                         
----------------------------------------------------------------------
CLINICAL NOTE: Non-HDL and VLDL Cholesterol calculated via Friedewald
equation. Reference intervals are omitted by laboratory protocol for 
cardiovascular risk stratification pending clinical risk score assessment.
ELECTRONIC SIGNATURE: R. GUPTA, MD, CLINICAL BIOCHEMIST
======================================================================`;

/**
 * Pre-parsed Structured Mock Lab Results for CBC (Report 1)
 */
export const mockCbcResults: ExtractedLabResult[] = [
  {
    id: 'res-cbc-wbc',
    reportId: 'rep-cbc-01',
    testName: 'White Blood Cell (WBC)',
    category: 'Complete Blood Count',
    value: 7.2,
    unit: 'K/uL',
    referenceRange: { low: 4.5, high: 11.0, text: '4.5 - 11.0' },
    status: 'NORMAL',
    flaggedCritical: false,
    confidenceScore: 0.99,
    sourceSnippet: 'White Blood Cell (WBC)        7.2      K/uL     4.5 - 11.0           NORMAL',
    isVerified: true,
    verifiedValue: 7.2,
    isRangeExplicitInSource: true,
    lineNumber: 13,
    sourceType: 'EXTRACTED_REPORT',
  },
  {
    id: 'res-cbc-rbc',
    reportId: 'rep-cbc-01',
    testName: 'Red Blood Cell (RBC)',
    category: 'Complete Blood Count',
    value: 4.80,
    unit: 'M/uL',
    referenceRange: { low: 4.30, high: 5.90, text: '4.30 - 5.90' },
    status: 'NORMAL',
    flaggedCritical: false,
    confidenceScore: 0.98,
    sourceSnippet: 'Red Blood Cell (RBC)          4.80     M/uL     4.30 - 5.90          NORMAL',
    isVerified: true,
    verifiedValue: 4.80,
    isRangeExplicitInSource: true,
    lineNumber: 14,
    sourceType: 'EXTRACTED_REPORT',
  },
  {
    id: 'res-cbc-hgb',
    reportId: 'rep-cbc-01',
    testName: 'Hemoglobin',
    category: 'Complete Blood Count',
    value: 14.5,
    unit: 'g/dL',
    referenceRange: { low: 13.5, high: 17.5, text: '13.5 - 17.5' },
    status: 'NORMAL',
    flaggedCritical: false,
    confidenceScore: 0.99,
    sourceSnippet: 'Hemoglobin                    14.5     g/dL     13.5 - 17.5          NORMAL',
    isVerified: true,
    verifiedValue: 14.5,
    isRangeExplicitInSource: true,
    lineNumber: 15,
    sourceType: 'EXTRACTED_REPORT',
  },
  {
    id: 'res-cbc-hct',
    reportId: 'rep-cbc-01',
    testName: 'Hematocrit',
    category: 'Complete Blood Count',
    value: 43.2,
    unit: '%',
    referenceRange: { low: 38.8, high: 50.0, text: '38.8 - 50.0' },
    status: 'NORMAL',
    flaggedCritical: false,
    confidenceScore: 0.97,
    sourceSnippet: 'Hematocrit                    43.2     %        38.8 - 50.0          NORMAL',
    isVerified: false,
    isRangeExplicitInSource: true,
    lineNumber: 16,
    sourceType: 'EXTRACTED_REPORT',
  },
  {
    id: 'res-cbc-plt',
    reportId: 'rep-cbc-01',
    testName: 'Platelet Count',
    category: 'Complete Blood Count',
    value: 245,
    unit: 'K/uL',
    referenceRange: { low: 150, high: 450, text: '150 - 450' },
    status: 'NORMAL',
    flaggedCritical: false,
    confidenceScore: 0.98,
    sourceSnippet: 'Platelet Count                245      K/uL     150 - 450            NORMAL',
    isVerified: false,
    isRangeExplicitInSource: true,
    lineNumber: 21,
    sourceType: 'EXTRACTED_REPORT',
  },
];

/**
 * Pre-parsed Structured Mock Lab Results for Lipid Profile (Report 2)
 * Note: Non-HDL and VLDL have referenceRange: null to enforce Strict Range Guard!
 */
export const mockLipidResults: ExtractedLabResult[] = [
  {
    id: 'res-lip-chol',
    reportId: 'rep-lipid-02',
    testName: 'Cholesterol, Total',
    category: 'Lipid Panel',
    value: 224,
    unit: 'mg/dL',
    referenceRange: { high: 200, text: '< 200' },
    status: 'HIGH',
    flaggedCritical: false,
    confidenceScore: 0.98,
    sourceSnippet: 'Cholesterol, Total            224      mg/dL    < 200                HIGH',
    isVerified: false,
    isRangeExplicitInSource: true,
    lineNumber: 11,
    sourceType: 'EXTRACTED_REPORT',
  },
  {
    id: 'res-lip-trig',
    reportId: 'rep-lipid-02',
    testName: 'Triglycerides',
    category: 'Lipid Panel',
    value: 185,
    unit: 'mg/dL',
    referenceRange: { high: 150, text: '< 150' },
    status: 'HIGH',
    flaggedCritical: false,
    confidenceScore: 0.97,
    sourceSnippet: 'Triglycerides                 185      mg/dL    < 150                HIGH',
    isVerified: false,
    isRangeExplicitInSource: true,
    lineNumber: 12,
    sourceType: 'EXTRACTED_REPORT',
  },
  {
    id: 'res-lip-hdl',
    reportId: 'rep-lipid-02',
    testName: 'HDL Cholesterol',
    category: 'Lipid Panel',
    value: 42,
    unit: 'mg/dL',
    referenceRange: { low: 40, text: '> 40' },
    status: 'NORMAL',
    flaggedCritical: false,
    confidenceScore: 0.96,
    sourceSnippet: 'HDL Cholesterol               42       mg/dL    > 40                 NORMAL',
    isVerified: false,
    isRangeExplicitInSource: true,
    lineNumber: 13,
    sourceType: 'EXTRACTED_REPORT',
  },
  {
    id: 'res-lip-ldl',
    reportId: 'rep-lipid-02',
    testName: 'LDL Cholesterol (Calc)',
    category: 'Lipid Panel',
    value: 145,
    unit: 'mg/dL',
    referenceRange: { high: 100, text: '< 100' },
    status: 'HIGH',
    flaggedCritical: false,
    confidenceScore: 0.98,
    sourceSnippet: 'LDL Cholesterol (Calc)        145      mg/dL    < 100                HIGH',
    isVerified: false,
    isRangeExplicitInSource: true,
    lineNumber: 14,
    sourceType: 'EXTRACTED_REPORT',
  },
  {
    // STRICT REFERENCE RANGE GUARD TEST ITEM 1:
    // Missing in source OCR text; strict invariant dictates null reference range!
    id: 'res-lip-nonhdl',
    reportId: 'rep-lipid-02',
    testName: 'Non-HDL Cholesterol',
    category: 'Lipid Panel',
    value: 182,
    unit: 'mg/dL',
    referenceRange: null,
    status: 'UNSPECIFIED',
    flaggedCritical: false,
    confidenceScore: 0.94,
    sourceSnippet: 'Non-HDL Cholesterol           182      mg/dL',
    isVerified: false,
    isRangeExplicitInSource: false,
    lineNumber: 15,
    sourceType: 'EXTRACTED_REPORT',
  },
  {
    // STRICT REFERENCE RANGE GUARD TEST ITEM 2:
    id: 'res-lip-vldl',
    reportId: 'rep-lipid-02',
    testName: 'VLDL Cholesterol',
    category: 'Lipid Panel',
    value: 37,
    unit: 'mg/dL',
    referenceRange: null,
    status: 'UNSPECIFIED',
    flaggedCritical: false,
    confidenceScore: 0.92,
    sourceSnippet: 'VLDL Cholesterol              37       mg/dL',
    isVerified: false,
    isRangeExplicitInSource: false,
    lineNumber: 16,
    sourceType: 'EXTRACTED_REPORT',
  },
];

/**
 * Pre-parsed Structured Medical Reports
 */
export const mockReports: MedicalReport[] = [
  {
    id: 'rep-cbc-01',
    title: 'Complete Blood Count (CBC) with Differential',
    patientId: 'pt-david-miller-01',
    reportDate: '2026-08-20',
    facility: 'Metro Health Diagnostic Pathology',
    reportType: 'LAB_PANEL',
    rawOcrText: rawOcrCbcFixture,
    extractedResults: mockCbcResults,
    status: 'PROCESSED',
  },
  {
    id: 'rep-lipid-02',
    title: 'Standard Lipid Profile & Risk Stratification',
    patientId: 'pt-david-miller-01',
    reportDate: '2026-08-22',
    facility: 'Metro Health Specialty Laboratories',
    reportType: 'LAB_PANEL',
    rawOcrText: rawOcrLipidFixture,
    extractedResults: mockLipidResults,
    status: 'PENDING_REVIEW',
  },
];

/**
 * Mock Clinical Inconsistencies Pre-evaluated for David Miller
 * Highlights the high-severity Penicillin allergy vs. Amoxicillin medication conflict.
 */
export const mockInconsistencies: ClinicalInconsistency[] = [
  {
    id: 'conflict-allergy-penicillin-amoxicillin',
    type: 'ALLERGY_MEDICATION_CONFLICT',
    description: 'High-severity allergy conflict: Patient profile lists documented Penicillin allergy (Reaction: Severe urticaria, periorbital edema, and acute wheezing), yet current active medications include Amoxicillin 875 mg PO BID (a beta-lactam aminopenicillin).',
    severity: 'high',
    involvedEntities: ['Penicillin', 'Amoxicillin'],
    clinicalGuidance: 'Amoxicillin is an amino-derivative of the penicillin core and carries near 100% cross-allergenicity. Administration poses immediate risk of severe hypersensitivity/anaphylaxis. Prescribing provider must be notified to discontinue Amoxicillin and evaluate non-beta-lactam alternatives (e.g., Clindamycin, Azithromycin).',
    status: 'ACTIVE',
  },
];
