import { PatientIntake, MedicalReport, ExtractedLabResult, LabStatus } from '@/types/medlens';
import { AuditEvent } from '@/types/audit';
import {
  mockPatientIntake,
  mockReports,
  rawOcrCbcFixture,
  rawOcrLipidFixture,
} from '@/lib/mock-data';

export interface PresetData {
  presetId: 'preset-conflict' | 'preset-missing-range' | 'preset-longitudinal' | 'baseline';
  patient: PatientIntake;
  reports: MedicalReport[];
  hitlOverrides: Record<string, {
    isVerified: boolean;
    verifiedValue?: string | number;
    verifiedStatus?: LabStatus;
    clinicianNotes?: string;
  }>;
  auditEvents: AuditEvent[];
  description: string;
}

// Baseline Initial Audit Events
export const initialAuditEvents: AuditEvent[] = [
  {
    id: 'audit-001',
    timestamp: '2026-08-20T08:30:00.000Z',
    eventType: 'DOCUMENT_UPLOADED',
    actor: 'CLINICIAN',
    testName: 'Complete Blood Count (CBC)',
    summary: 'Clinical lab report uploaded from Metro Health Diagnostic Pathology.',
  },
  {
    id: 'audit-002',
    timestamp: '2026-08-20T08:31:12.000Z',
    eventType: 'AI_EXTRACTION_COMPLETED',
    actor: 'AI_SYSTEM',
    summary: 'Extracted 5 biomarkers with Strict Reference Range Guard validation.',
  },
  {
    id: 'audit-003',
    timestamp: '2026-08-20T08:45:00.000Z',
    eventType: 'RANGE_VERIFIED',
    actor: 'CLINICIAN',
    testName: 'White Blood Cell (WBC)',
    summary: 'Clinician confirmed WBC 7.2 K/uL against primary lab source line 13.',
  },
  {
    id: 'audit-004',
    timestamp: '2026-08-20T08:45:20.000Z',
    eventType: 'RANGE_VERIFIED',
    actor: 'CLINICIAN',
    testName: 'Hemoglobin',
    summary: 'Clinician verified Hemoglobin 14.5 g/dL against primary lab source line 15.',
  },
];

// Preset 1: Acute Conflict & Critical Out-of-Range (David Miller with Critical Anemia/Thrombocytopenia + Amoxicillin Conflict)
export const PRESET_ACUTE_CONFLICT: PresetData = {
  presetId: 'preset-conflict',
  description: 'Acute allergy conflict (Penicillin vs Amoxicillin) with critical lab findings (Hemoglobin 7.2 g/dL, Platelets 48 K/uL).',
  patient: {
    id: 'pt-david-miller-01',
    name: 'David Miller',
    age: 54,
    sex: 'male',
    symptoms: [
      { description: 'Acute dizziness and severe fatigue upon standing', duration: '2 days', severity: 'severe' },
      { description: 'Spontaneous petechiae and mucosal gum bleeding', duration: '24 hours', severity: 'severe' },
      { description: 'Mild wheezing following first dose of antibiotic', duration: '6 hours', severity: 'moderate' },
    ],
    conditions: [
      { name: 'Essential Hypertension', diagnosedDate: '2021-06-14' },
      { name: 'Hypercholesterolemia', diagnosedDate: '2022-09-03' },
    ],
    allergies: [
      {
        allergen: 'Penicillin',
        reaction: 'Severe urticaria, periorbital angioedema, and wheezing (childhood reaction)',
      },
    ],
    currentMedications: [
      {
        name: 'Amoxicillin',
        dosage: '875 mg',
        frequency: 'twice daily (prescribed for dental abscess)',
      },
      {
        name: 'Lisinopril',
        dosage: '10 mg',
        frequency: 'once daily',
      },
      {
        name: 'Atorvastatin',
        dosage: '20 mg',
        frequency: 'once daily',
      },
    ],
    source: 'USER_INTAKE',
  },
  reports: [
    {
      id: 'rep-crit-cbc',
      title: 'STAT Critical Blood Count & Differential',
      patientId: 'pt-david-miller-01',
      reportDate: '2026-09-03',
      facility: 'Emergency Clinical Pathology Core',
      reportType: 'LAB_PANEL',
      status: 'PROCESSED',
      rawOcrText: `EMERGENCY CLINICAL PATHOLOGY CORE — STAT CBC
PATIENT: MILLER, DAVID | MRN: ML-54201 | TIME: 2026-09-03 11:20 AM
----------------------------------------------------------------------
TEST NAME                     RESULT   UNIT     REFERENCE INTERVAL   STATUS
----------------------------------------------------------------------
White Blood Cell (WBC)        18.5     K/uL     4.5 - 11.0           HIGH
Hemoglobin                    7.2      g/dL     13.5 - 17.5          CRITICAL LOW
Hematocrit                    22.4     %        38.8 - 50.0          CRITICAL LOW
Platelet Count                48       K/uL     150 - 450            CRITICAL LOW
Mean Corpuscular Vol (MCV)    82.0     fL       80.0 - 100.0         NORMAL
----------------------------------------------------------------------
VERIFICATION NOTE: Critical values called to attending physician Dr. Reynolds.`,
      extractedResults: [
        {
          id: 'res-crit-wbc',
          reportId: 'rep-crit-cbc',
          testName: 'White Blood Cell (WBC)',
          category: 'Complete Blood Count',
          value: 18.5,
          unit: 'K/uL',
          referenceRange: { low: 4.5, high: 11.0, text: '4.5 - 11.0' },
          status: 'HIGH',
          flaggedCritical: false,
          confidenceScore: 0.99,
          sourceSnippet: 'White Blood Cell (WBC)        18.5     K/uL     4.5 - 11.0           HIGH',
          isVerified: true,
          verifiedValue: 18.5,
          isRangeExplicitInSource: true,
          lineNumber: 6,
          sourceType: 'EXTRACTED_REPORT',
        },
        {
          id: 'res-crit-hgb',
          reportId: 'rep-crit-cbc',
          testName: 'Hemoglobin',
          category: 'Complete Blood Count',
          value: 7.2,
          unit: 'g/dL',
          referenceRange: { low: 13.5, high: 17.5, text: '13.5 - 17.5' },
          status: 'LOW',
          flaggedCritical: true,
          confidenceScore: 0.99,
          sourceSnippet: 'Hemoglobin                    7.2      g/dL     13.5 - 17.5          CRITICAL LOW',
          isVerified: true,
          verifiedValue: 7.2,
          isRangeExplicitInSource: true,
          lineNumber: 7,
          sourceType: 'EXTRACTED_REPORT',
        },
        {
          id: 'res-crit-plt',
          reportId: 'rep-crit-cbc',
          testName: 'Platelet Count',
          category: 'Complete Blood Count',
          value: 48,
          unit: 'K/uL',
          referenceRange: { low: 150, high: 450, text: '150 - 450' },
          status: 'LOW',
          flaggedCritical: true,
          confidenceScore: 0.98,
          sourceSnippet: 'Platelet Count                48       K/uL     150 - 450            CRITICAL LOW',
          isVerified: true,
          verifiedValue: 48,
          isRangeExplicitInSource: true,
          lineNumber: 9,
          sourceType: 'EXTRACTED_REPORT',
        },
      ],
    },
    mockReports[1], // Lipid Panel
  ],
  hitlOverrides: {
    'res-crit-hgb': { isVerified: true, verifiedValue: 7.2, verifiedStatus: 'LOW', clinicianNotes: 'Urgent red cell draw verified; critical alert triggered.' },
    'res-crit-plt': { isVerified: true, verifiedValue: 48, verifiedStatus: 'LOW', clinicianNotes: 'Thrombocytopenia confirmed by peripheral smear review.' },
  },
  auditEvents: [
    ...initialAuditEvents,
    {
      id: 'audit-crit-01',
      timestamp: '2026-09-03T11:25:00.000Z',
      eventType: 'DOCUMENT_UPLOADED',
      actor: 'CLINICIAN',
      testName: 'STAT Critical Blood Count',
      summary: 'Uploaded STAT Emergency Blood Count Panel.',
    },
    {
      id: 'audit-crit-02',
      timestamp: '2026-09-03T11:25:30.000Z',
      eventType: 'AI_EXTRACTION_COMPLETED',
      actor: 'AI_SYSTEM',
      summary: 'Critical findings identified: Hemoglobin 7.2 g/dL and Platelets 48 K/uL.',
    },
    {
      id: 'audit-crit-03',
      timestamp: '2026-09-03T11:26:15.000Z',
      eventType: 'CONFLICT_RESOLVED',
      actor: 'CLINICIAN',
      summary: 'Attending flagged high-severity Penicillin allergy conflict against Amoxicillin prescription.',
    },
  ],
};

// Preset 2: Missing Reference Ranges & High Incompleteness (Strict Range Null Guard)
export const PRESET_MISSING_RANGES: PresetData = {
  presetId: 'preset-missing-range',
  description: 'Demonstrates Strict Reference Range Guard: tests without explicit ranges in source (Non-HDL, VLDL, Vitamin D) strictly retain null reference ranges and UNSPECIFIED status.',
  patient: {
    id: 'pt-elena-rostova-02',
    name: 'Elena Rostova',
    age: 29,
    sex: 'female',
    symptoms: [
      { description: 'Mild chronic fatigue and seasonal joint stiffness', duration: '3 months', severity: 'mild' },
    ],
    conditions: [
      { name: 'Preventive Endocrine and Metabolic Evaluation' },
    ],
    allergies: [],
    currentMedications: [
      { name: 'Vitamin D3 Supplement', dosage: '2000 IU', frequency: 'daily' },
      { name: 'Omega-3 Fish Oil', dosage: '1000 mg', frequency: 'daily' },
    ],
    source: 'USER_INTAKE',
  },
  reports: [
    {
      id: 'rep-missing-range-specialty',
      title: 'Specialty Endocrine & Atherogenic Lipid Risk Panel',
      patientId: 'pt-elena-rostova-02',
      reportDate: '2026-08-25',
      facility: 'Advanced Diagnostic Reference Laboratory',
      reportType: 'LAB_PANEL',
      status: 'PROCESSED',
      rawOcrText: `ADVANCED DIAGNOSTIC REFERENCE LABORATORY
PATIENT: ROSTOVA, ELENA | MRN: ML-11083 | DATE: 2026-08-25
----------------------------------------------------------------------
TEST NAME                     RESULT   UNIT     REFERENCE INTERVAL   STATUS
----------------------------------------------------------------------
Cholesterol, Total            224      mg/dL    < 200                HIGH
Triglycerides                 185      mg/dL    < 150                HIGH
HDL Cholesterol               42       mg/dL    > 40                 NORMAL
LDL Cholesterol (Calc)        145      mg/dL    < 100                HIGH
Non-HDL Cholesterol           182      mg/dL                         
VLDL Cholesterol              37       mg/dL                         
Vitamin D, 25-Hydroxy         16       ng/mL                         
----------------------------------------------------------------------
POLICY NOTE: Reference intervals for Non-HDL, VLDL, and Vitamin D are omitted 
pending seasonal assay standardization. Clinicians must apply demographic guidelines.`,
      extractedResults: [
        {
          id: 'res-mr-chol',
          reportId: 'rep-missing-range-specialty',
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
          lineNumber: 6,
          sourceType: 'EXTRACTED_REPORT',
        },
        {
          id: 'res-mr-trig',
          reportId: 'rep-missing-range-specialty',
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
          lineNumber: 7,
          sourceType: 'EXTRACTED_REPORT',
        },
        {
          id: 'res-mr-nonhdl',
          reportId: 'rep-missing-range-specialty',
          testName: 'Non-HDL Cholesterol',
          category: 'Lipid Panel',
          value: 182,
          unit: 'mg/dL',
          referenceRange: null, // STRICT GUARD
          status: 'UNSPECIFIED',
          flaggedCritical: false,
          confidenceScore: 0.95,
          sourceSnippet: 'Non-HDL Cholesterol           182      mg/dL',
          isVerified: false,
          isRangeExplicitInSource: false,
          lineNumber: 10,
          sourceType: 'EXTRACTED_REPORT',
        },
        {
          id: 'res-mr-vldl',
          reportId: 'rep-missing-range-specialty',
          testName: 'VLDL Cholesterol',
          category: 'Lipid Panel',
          value: 37,
          unit: 'mg/dL',
          referenceRange: null, // STRICT GUARD
          status: 'UNSPECIFIED',
          flaggedCritical: false,
          confidenceScore: 0.94,
          sourceSnippet: 'VLDL Cholesterol              37       mg/dL',
          isVerified: false,
          isRangeExplicitInSource: false,
          lineNumber: 11,
          sourceType: 'EXTRACTED_REPORT',
        },
        {
          id: 'res-mr-vitd',
          reportId: 'rep-missing-range-specialty',
          testName: 'Vitamin D, 25-Hydroxy',
          category: 'Endocrine Panel',
          value: 16,
          unit: 'ng/mL',
          referenceRange: null, // STRICT GUARD
          status: 'UNSPECIFIED',
          flaggedCritical: false,
          confidenceScore: 0.93,
          sourceSnippet: 'Vitamin D, 25-Hydroxy         16       ng/mL',
          isVerified: false,
          isRangeExplicitInSource: false,
          lineNumber: 12,
          sourceType: 'EXTRACTED_REPORT',
        },
      ],
    },
  ],
  hitlOverrides: {},
  auditEvents: [
    ...initialAuditEvents,
    {
      id: 'audit-mr-01',
      timestamp: '2026-08-25T09:00:00.000Z',
      eventType: 'DOCUMENT_UPLOADED',
      actor: 'CLINICIAN',
      summary: 'Uploaded Specialty Atherogenic Lipid Risk Panel.',
    },
    {
      id: 'audit-mr-02',
      timestamp: '2026-08-25T09:00:45.000Z',
      eventType: 'AI_EXTRACTION_COMPLETED',
      actor: 'AI_SYSTEM',
      summary: 'Strict Range Guard enforced: 3 missing ranges set to null with UNSPECIFIED status.',
    },
  ],
};

// Preset 3: Longitudinal Chronic Management (Sarah Jenkins across 3 encounters)
export const PRESET_LONGITUDINAL: PresetData = {
  presetId: 'preset-longitudinal',
  description: 'Longitudinal chronic kidney disease & glycemic progression tracking across 3 visits over 6 months with delta calculations and sparklines.',
  patient: {
    id: 'patient-sarah-jenkins',
    name: 'Sarah Jenkins',
    age: 62,
    sex: 'female',
    symptoms: [
      { description: 'Worsening fatigue and generalized lethargy', duration: '3 weeks', severity: 'moderate' },
      { description: 'Bilateral lower extremity pitting edema', duration: '2 weeks', severity: 'moderate' },
    ],
    conditions: [
      { name: 'Type 2 Diabetes Mellitus', diagnosedDate: '2016-04-12' },
      { name: 'Essential Hypertension', diagnosedDate: '2018-09-20' },
      { name: 'Chronic Kidney Disease (Stage 3)', diagnosedDate: '2026-05-20' },
    ],
    allergies: [
      {
        allergen: 'Lisinopril / ACE Inhibitors',
        reaction: 'Severe angioedema with lip and airway swelling',
      },
    ],
    currentMedications: [
      { name: 'Lisinopril', dosage: '20 mg', frequency: 'once daily' },
      { name: 'Metformin HCl', dosage: '1000 mg', frequency: 'twice daily' },
      { name: 'Atorvastatin', dosage: '20 mg', frequency: 'once daily' },
    ],
    source: 'USER_INTAKE',
  },
  reports: [
    {
      id: 'rep-sj-visit-1',
      title: 'Visit 1: Annual Preventive Wellness Lab',
      patientId: 'patient-sarah-jenkins',
      reportDate: '2026-02-15',
      facility: 'Mercy Ambulatory Clinic',
      reportType: 'LAB_PANEL',
      status: 'PROCESSED',
      rawOcrText: `MERCY AMBULATORY CLINIC — ANNUAL LAB PANEL
PATIENT: JENKINS, SARAH | DATE: 2026-02-15
Serum Creatinine: 1.1 mg/dL (0.6 - 1.2) NORMAL
Potassium: 4.2 mmol/L (3.5 - 5.1) NORMAL
Fasting Glucose: 138 mg/dL (70 - 99) HIGH
Hemoglobin A1c: 6.8 % (4.0 - 5.6) HIGH`,
      extractedResults: [
        {
          id: 'res-sj-v1-creat',
          reportId: 'rep-sj-visit-1',
          testName: 'Creatinine, Serum',
          category: 'Renal Function',
          value: 1.1,
          unit: 'mg/dL',
          referenceRange: { low: 0.6, high: 1.2, text: '0.6 - 1.2' },
          status: 'NORMAL',
          flaggedCritical: false,
          confidenceScore: 0.98,
          sourceSnippet: 'Serum Creatinine: 1.1 mg/dL (0.6 - 1.2) NORMAL',
          isVerified: true,
          verifiedValue: 1.1,
          isRangeExplicitInSource: true,
          lineNumber: 3,
          sourceType: 'EXTRACTED_REPORT',
        },
        {
          id: 'res-sj-v1-k',
          reportId: 'rep-sj-visit-1',
          testName: 'Potassium',
          category: 'Metabolic Panel',
          value: 4.2,
          unit: 'mmol/L',
          referenceRange: { low: 3.5, high: 5.1, text: '3.5 - 5.1' },
          status: 'NORMAL',
          flaggedCritical: false,
          confidenceScore: 0.98,
          sourceSnippet: 'Potassium: 4.2 mmol/L (3.5 - 5.1) NORMAL',
          isVerified: true,
          verifiedValue: 4.2,
          isRangeExplicitInSource: true,
          lineNumber: 4,
          sourceType: 'EXTRACTED_REPORT',
        },
        {
          id: 'res-sj-v1-glu',
          reportId: 'rep-sj-visit-1',
          testName: 'Fasting Glucose',
          category: 'Metabolic Panel',
          value: 138,
          unit: 'mg/dL',
          referenceRange: { low: 70, high: 99, text: '70 - 99' },
          status: 'HIGH',
          flaggedCritical: false,
          confidenceScore: 0.97,
          sourceSnippet: 'Fasting Glucose: 138 mg/dL (70 - 99) HIGH',
          isVerified: true,
          verifiedValue: 138,
          isRangeExplicitInSource: true,
          lineNumber: 5,
          sourceType: 'EXTRACTED_REPORT',
        },
        {
          id: 'res-sj-v1-a1c',
          reportId: 'rep-sj-visit-1',
          testName: 'Hemoglobin A1c',
          category: 'Endocrine Panel',
          value: 6.8,
          unit: '%',
          referenceRange: { low: 4.0, high: 5.6, text: '4.0 - 5.6' },
          status: 'HIGH',
          flaggedCritical: false,
          confidenceScore: 0.99,
          sourceSnippet: 'Hemoglobin A1c: 6.8 % (4.0 - 5.6) HIGH',
          isVerified: true,
          verifiedValue: 6.8,
          isRangeExplicitInSource: true,
          lineNumber: 6,
          sourceType: 'EXTRACTED_REPORT',
        },
      ],
    },
    {
      id: 'rep-sj-visit-2',
      title: 'Visit 2: Endocrine & Renal Mid-Year Review',
      patientId: 'patient-sarah-jenkins',
      reportDate: '2026-05-20',
      facility: 'Mercy Ambulatory Clinic',
      reportType: 'LAB_PANEL',
      status: 'PROCESSED',
      rawOcrText: `MERCY AMBULATORY CLINIC — MID-YEAR REVIEW
PATIENT: JENKINS, SARAH | DATE: 2026-05-20
Serum Creatinine: 1.4 mg/dL (0.6 - 1.2) HIGH
Potassium: 4.8 mmol/L (3.5 - 5.1) NORMAL
Fasting Glucose: 152 mg/dL (70 - 99) HIGH
Hemoglobin A1c: 7.4 % (4.0 - 5.6) HIGH`,
      extractedResults: [
        {
          id: 'res-sj-v2-creat',
          reportId: 'rep-sj-visit-2',
          testName: 'Creatinine, Serum',
          category: 'Renal Function',
          value: 1.4,
          unit: 'mg/dL',
          referenceRange: { low: 0.6, high: 1.2, text: '0.6 - 1.2' },
          status: 'HIGH',
          flaggedCritical: false,
          confidenceScore: 0.98,
          sourceSnippet: 'Serum Creatinine: 1.4 mg/dL (0.6 - 1.2) HIGH',
          isVerified: true,
          verifiedValue: 1.4,
          isRangeExplicitInSource: true,
          lineNumber: 3,
          sourceType: 'EXTRACTED_REPORT',
        },
        {
          id: 'res-sj-v2-k',
          reportId: 'rep-sj-visit-2',
          testName: 'Potassium',
          category: 'Metabolic Panel',
          value: 4.8,
          unit: 'mmol/L',
          referenceRange: { low: 3.5, high: 5.1, text: '3.5 - 5.1' },
          status: 'NORMAL',
          flaggedCritical: false,
          confidenceScore: 0.98,
          sourceSnippet: 'Potassium: 4.8 mmol/L (3.5 - 5.1) NORMAL',
          isVerified: true,
          verifiedValue: 4.8,
          isRangeExplicitInSource: true,
          lineNumber: 4,
          sourceType: 'EXTRACTED_REPORT',
        },
        {
          id: 'res-sj-v2-glu',
          reportId: 'rep-sj-visit-2',
          testName: 'Fasting Glucose',
          category: 'Metabolic Panel',
          value: 152,
          unit: 'mg/dL',
          referenceRange: { low: 70, high: 99, text: '70 - 99' },
          status: 'HIGH',
          flaggedCritical: false,
          confidenceScore: 0.97,
          sourceSnippet: 'Fasting Glucose: 152 mg/dL (70 - 99) HIGH',
          isVerified: true,
          verifiedValue: 152,
          isRangeExplicitInSource: true,
          lineNumber: 5,
          sourceType: 'EXTRACTED_REPORT',
        },
        {
          id: 'res-sj-v2-a1c',
          reportId: 'rep-sj-visit-2',
          testName: 'Hemoglobin A1c',
          category: 'Endocrine Panel',
          value: 7.4,
          unit: '%',
          referenceRange: { low: 4.0, high: 5.6, text: '4.0 - 5.6' },
          status: 'HIGH',
          flaggedCritical: false,
          confidenceScore: 0.99,
          sourceSnippet: 'Hemoglobin A1c: 7.4 % (4.0 - 5.6) HIGH',
          isVerified: true,
          verifiedValue: 7.4,
          isRangeExplicitInSource: true,
          lineNumber: 6,
          sourceType: 'EXTRACTED_REPORT',
        },
      ],
    },
    {
      id: 'rep-sj-visit-3',
      title: 'Visit 3: Comprehensive Metabolic Panel (CMP)',
      patientId: 'patient-sarah-jenkins',
      reportDate: '2026-08-28',
      facility: 'Mercy Health Core Lab',
      reportType: 'LAB_PANEL',
      status: 'PROCESSED',
      rawOcrText: `MERCY HEALTH CORE LAB — COMPREHENSIVE METABOLIC PANEL
PATIENT: JENKINS, SARAH | DATE: 2026-08-28
Serum Creatinine: 1.9 mg/dL (0.6 - 1.2) HIGH
Potassium: 5.4 mmol/L (3.5 - 5.1) HIGH
Fasting Glucose: 168 mg/dL (70 - 99) HIGH
Hemoglobin A1c: 8.6 % (4.0 - 5.6) HIGH
eGFR (CKD-EPI): 32 mL/min/1.73m2`,
      extractedResults: [
        {
          id: 'res-sj-v3-creat',
          reportId: 'rep-sj-visit-3',
          testName: 'Creatinine, Serum',
          category: 'Renal Function',
          value: 1.9,
          unit: 'mg/dL',
          referenceRange: { low: 0.6, high: 1.2, text: '0.6 - 1.2' },
          status: 'HIGH',
          flaggedCritical: true,
          confidenceScore: 0.99,
          sourceSnippet: 'Serum Creatinine: 1.9 mg/dL (0.6 - 1.2) HIGH',
          isVerified: true,
          verifiedValue: 1.9,
          isRangeExplicitInSource: true,
          lineNumber: 3,
          sourceType: 'EXTRACTED_REPORT',
        },
        {
          id: 'res-sj-v3-k',
          reportId: 'rep-sj-visit-3',
          testName: 'Potassium',
          category: 'Metabolic Panel',
          value: 5.4,
          unit: 'mmol/L',
          referenceRange: { low: 3.5, high: 5.1, text: '3.5 - 5.1' },
          status: 'HIGH',
          flaggedCritical: false,
          confidenceScore: 0.98,
          sourceSnippet: 'Potassium: 5.4 mmol/L (3.5 - 5.1) HIGH',
          isVerified: true,
          verifiedValue: 5.4,
          isRangeExplicitInSource: true,
          lineNumber: 4,
          sourceType: 'EXTRACTED_REPORT',
        },
        {
          id: 'res-sj-v3-glu',
          reportId: 'rep-sj-visit-3',
          testName: 'Fasting Glucose',
          category: 'Metabolic Panel',
          value: 168,
          unit: 'mg/dL',
          referenceRange: { low: 70, high: 99, text: '70 - 99' },
          status: 'HIGH',
          flaggedCritical: false,
          confidenceScore: 0.97,
          sourceSnippet: 'Fasting Glucose: 168 mg/dL (70 - 99) HIGH',
          isVerified: false,
          isRangeExplicitInSource: true,
          lineNumber: 5,
          sourceType: 'EXTRACTED_REPORT',
        },
        {
          id: 'res-sj-v3-a1c',
          reportId: 'rep-sj-visit-3',
          testName: 'Hemoglobin A1c',
          category: 'Endocrine Panel',
          value: 8.6,
          unit: '%',
          referenceRange: { low: 4.0, high: 5.6, text: '4.0 - 5.6' },
          status: 'HIGH',
          flaggedCritical: false,
          confidenceScore: 0.99,
          sourceSnippet: 'Hemoglobin A1c: 8.6 % (4.0 - 5.6) HIGH',
          isVerified: false,
          isRangeExplicitInSource: true,
          lineNumber: 6,
          sourceType: 'EXTRACTED_REPORT',
        },
        {
          id: 'res-sj-v3-egfr',
          reportId: 'rep-sj-visit-3',
          testName: 'eGFR (CKD-EPI)',
          category: 'Renal Function',
          value: 32,
          unit: 'mL/min/1.73m2',
          referenceRange: null, // STRICT GUARD OMISSION
          status: 'UNSPECIFIED',
          flaggedCritical: false,
          confidenceScore: 0.92,
          sourceSnippet: 'eGFR (CKD-EPI): 32 mL/min/1.73m2',
          isVerified: false,
          isRangeExplicitInSource: false,
          lineNumber: 7,
          sourceType: 'EXTRACTED_REPORT',
        },
      ],
    },
  ],
  hitlOverrides: {
    'res-sj-v1-creat': { isVerified: true, verifiedValue: 1.1 },
    'res-sj-v2-creat': { isVerified: true, verifiedValue: 1.4 },
    'res-sj-v3-creat': { isVerified: true, verifiedValue: 1.9 },
  },
  auditEvents: [
    ...initialAuditEvents,
    {
      id: 'audit-long-01',
      timestamp: '2026-08-28T10:00:00.000Z',
      eventType: 'DOCUMENT_UPLOADED',
      actor: 'CLINICIAN',
      summary: 'Ingested 3 sequential longitudinal laboratory panels across 2026.',
    },
    {
      id: 'audit-long-02',
      timestamp: '2026-08-28T10:01:00.000Z',
      eventType: 'AI_EXTRACTION_COMPLETED',
      actor: 'AI_SYSTEM',
      summary: 'Aggregated longitudinal trajectories: Creatinine (+0.8 mg/dL) and HbA1c (+1.8%).',
    },
  ],
};

export const BASELINE_PRESET: PresetData = {
  presetId: 'baseline',
  description: 'Clean default state (David Miller CBC & Lipid Panel).',
  patient: mockPatientIntake,
  reports: mockReports,
  hitlOverrides: {
    'res-cbc-wbc': { isVerified: true, verifiedValue: 7.2 },
    'res-cbc-rbc': { isVerified: true, verifiedValue: 4.80 },
    'res-cbc-hgb': { isVerified: true, verifiedValue: 14.5 },
  },
  auditEvents: initialAuditEvents,
};

export function getPresetData(presetId: PresetData['presetId']): PresetData {
  switch (presetId) {
    case 'preset-conflict':
      return PRESET_ACUTE_CONFLICT;
    case 'preset-missing-range':
      return PRESET_MISSING_RANGES;
    case 'preset-longitudinal':
      return PRESET_LONGITUDINAL;
    case 'baseline':
    default:
      return BASELINE_PRESET;
  }
}
