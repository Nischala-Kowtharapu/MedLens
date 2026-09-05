import { PatientRecord, LongitudinalMarker } from '@/types/clinical';
import { runFullInconsistencyDetection } from '@/lib/clinical-engine/inconsistency-detector';
import { generateNonDiagnosticSynthesis } from '@/lib/clinical-engine/synthesis';

export const SAMPLE_PATIENTS: PatientRecord[] = [
  // Scenario 1: Sarah Jenkins - CKD & ACEi Allergy Conflict + Missing Range on eGFR
  {
    patient: {
      id: 'patient-sarah-jenkins',
      name: 'Sarah Jenkins',
      mrn: 'ML-89241',
      age: 62,
      sex: 'female',
      symptoms: [
        { id: 'sym-1', description: 'Fatigue and generalized lethargy', duration: '3 weeks', severity: 'moderate' },
        { id: 'sym-2', description: 'Bilateral lower extremity pitting edema', duration: '2 weeks', severity: 'moderate' },
        { id: 'sym-3', description: 'Foamy urine on urination', duration: '1 month', severity: 'mild' },
      ],
      conditions: [
        { id: 'cond-1', name: 'Type 2 Diabetes Mellitus', diagnosedDate: '2016-04-12', notes: 'Managed with Metformin' },
        { id: 'cond-2', name: 'Essential Hypertension', diagnosedDate: '2018-09-20' },
        { id: 'cond-3', name: 'Prior ACE Inhibitor Angioedema', diagnosedDate: '2021-03-15', notes: 'Severe lip and facial swelling following Enalapril trial' },
      ],
      allergies: [
        {
          id: 'all-1',
          allergen: 'Lisinopril / ACE Inhibitors',
          reaction: 'Severe angioedema with lip, tongue swelling and airway threat',
          severity: 'anaphylaxis',
        },
      ],
      currentMedications: [
        {
          id: 'med-1',
          name: 'Lisinopril',
          dosage: '20 mg',
          frequency: 'once daily',
          prescribedDate: '2026-08-29',
          status: 'active',
        },
        {
          id: 'med-2',
          name: 'Metformin HCl',
          dosage: '1000 mg',
          frequency: 'twice daily with meals',
          prescribedDate: '2022-01-10',
          status: 'active',
        },
        {
          id: 'med-3',
          name: 'Atorvastatin',
          dosage: '20 mg',
          frequency: 'at bedtime',
          prescribedDate: '2020-05-18',
          status: 'active',
        },
      ],
      source: 'USER_INTAKE',
    },
    documents: [
      {
        id: 'doc-cmp-mercy-lab',
        patientId: 'patient-sarah-jenkins',
        title: 'Comprehensive Metabolic Panel (CMP) — Mercy Health Core Lab',
        documentType: 'LAB_REPORT',
        date: '2026-08-28',
        facility: 'Mercy Health Regional Pathology',
        rawText: `===============================================================
MERCY HEALTH REGIONAL CLINICAL LABORATORY
Patient: JENKINS, SARAH | MRN: ML-89241 | DOB: 1964-02-14 | Sex: F
Specimen ID: LAB-2026-9912 | Collected: 2026-08-28 07:45 AM
Ordering Provider: Dr. A. Vance, MD | Clinic: Cardiorenal Health
---------------------------------------------------------------
TEST NAME                 RESULT    UNIT        REFERENCE INTERVAL  FLAG
---------------------------------------------------------------
Sodium                    138       mmol/L      135 - 145           
Potassium                 5.4       mmol/L      3.5 - 5.1           HIGH
Chloride                  102       mmol/L      96 - 106            
Carbon Dioxide (CO2)      21        mmol/L      22 - 29             LOW
Blood Urea Nitrogen (BUN) 32        mg/dL       7 - 20              HIGH
Creatinine, Serum         1.9       mg/dL       0.6 - 1.2           HIGH
Glucose, Fasting          168       mg/dL       70 - 99             HIGH
Calcium, Total            9.1       mg/dL       8.5 - 10.2          
eGFR (CKD-EPI)            32        mL/min/1.73m2                   
Total Protein             6.8       g/dL        6.0 - 8.3           
Albumin                   3.4       g/dL        3.5 - 5.2           LOW
Bilirubin, Total          0.7       mg/dL       0.2 - 1.2           
Alkaline Phosphatase      72        U/L         44 - 121            
AST (SGOT)                24        U/L         10 - 40             
ALT (SGPT)                26        U/L         7 - 56              
---------------------------------------------------------------
Lab Note: eGFR calculation performed via CKD-EPI equation. Reference range is omitted per laboratory reporting policy for demographic stratification.
Electronic Sign-off: K. Patel, MD, Medical Director
===============================================================`,
        lines: [
          { lineNumber: 1, text: 'MERCY HEALTH REGIONAL CLINICAL LABORATORY' },
          { lineNumber: 2, text: 'Patient: JENKINS, SARAH | MRN: ML-89241 | DOB: 1964-02-14 | Sex: F' },
          { lineNumber: 3, text: 'Specimen ID: LAB-2026-9912 | Collected: 2026-08-28 07:45 AM' },
          { lineNumber: 4, text: 'Ordering Provider: Dr. A. Vance, MD | Clinic: Cardiorenal Health' },
          { lineNumber: 5, text: '---------------------------------------------------------------' },
          { lineNumber: 6, text: 'TEST NAME                 RESULT    UNIT        REFERENCE INTERVAL  FLAG' },
          { lineNumber: 7, text: '---------------------------------------------------------------' },
          { lineNumber: 8, text: 'Sodium                    138       mmol/L      135 - 145           ' },
          { lineNumber: 9, text: 'Potassium                 5.4       mmol/L      3.5 - 5.1           HIGH' },
          { lineNumber: 10, text: 'Chloride                  102       mmol/L      96 - 106            ' },
          { lineNumber: 11, text: 'Carbon Dioxide (CO2)      21        mmol/L      22 - 29             LOW' },
          { lineNumber: 12, text: 'Blood Urea Nitrogen (BUN) 32        mg/dL       7 - 20              HIGH' },
          { lineNumber: 13, text: 'Creatinine, Serum         1.9       mg/dL       0.6 - 1.2           HIGH' },
          { lineNumber: 14, text: 'Glucose, Fasting          168       mg/dL       70 - 99             HIGH' },
          { lineNumber: 15, text: 'Calcium, Total            9.1       mg/dL       8.5 - 10.2          ' },
          { lineNumber: 16, text: 'eGFR (CKD-EPI)            32        mL/min/1.73m2                   ' },
          { lineNumber: 17, text: 'Total Protein             6.8       g/dL        6.0 - 8.3           ' },
          { lineNumber: 18, text: 'Albumin                   3.4       g/dL        3.5 - 5.2           LOW' },
          { lineNumber: 19, text: 'Bilirubin, Total          0.7       mg/dL       0.2 - 1.2           ' },
          { lineNumber: 20, text: 'Alkaline Phosphatase      72        U/L         44 - 121            ' },
          { lineNumber: 21, text: 'AST (SGOT)                24        U/L         10 - 40             ' },
          { lineNumber: 22, text: 'ALT (SGPT)                26        U/L         7 - 56              ' },
          { lineNumber: 23, text: '---------------------------------------------------------------' },
          { lineNumber: 24, text: 'Lab Note: eGFR calculation performed via CKD-EPI equation. Reference range is omitted per laboratory reporting policy for demographic stratification.' },
          { lineNumber: 25, text: 'Electronic Sign-off: K. Patel, MD, Medical Director' },
        ],
        extractedResults: [
          {
            id: 'res-sj-potassium',
            reportId: 'doc-cmp-mercy-lab',
            testName: 'Potassium',
            category: 'Metabolic Panel',
            value: 5.4,
            unit: 'mmol/L',
            referenceRange: { low: 3.5, high: 5.1, text: '3.5 - 5.1' },
            status: 'HIGH',
            flaggedCritical: false,
            confidenceScore: 0.98,
            sourceSnippet: 'Potassium                 5.4       mmol/L      3.5 - 5.1           HIGH',
            isVerified: true,
            verifiedValue: 5.4,
            sourceType: 'EXTRACTED_REPORT',
            lineNumber: 9,
            isRangeExplicitInSource: true,
          },
          {
            id: 'res-sj-creatinine',
            reportId: 'doc-cmp-mercy-lab',
            testName: 'Creatinine, Serum',
            category: 'Renal Function',
            value: 1.9,
            unit: 'mg/dL',
            referenceRange: { low: 0.6, high: 1.2, text: '0.6 - 1.2' },
            status: 'HIGH',
            flaggedCritical: true,
            confidenceScore: 0.99,
            sourceSnippet: 'Creatinine, Serum         1.9       mg/dL       0.6 - 1.2           HIGH',
            isVerified: true,
            verifiedValue: 1.9,
            sourceType: 'EXTRACTED_REPORT',
            lineNumber: 13,
            isRangeExplicitInSource: true,
          },
          {
            id: 'res-sj-bun',
            reportId: 'doc-cmp-mercy-lab',
            testName: 'Blood Urea Nitrogen (BUN)',
            category: 'Renal Function',
            value: 32,
            unit: 'mg/dL',
            referenceRange: { low: 7, high: 20, text: '7 - 20' },
            status: 'HIGH',
            flaggedCritical: false,
            confidenceScore: 0.96,
            sourceSnippet: 'Blood Urea Nitrogen (BUN) 32        mg/dL       7 - 20              HIGH',
            isVerified: false,
            sourceType: 'EXTRACTED_REPORT',
            lineNumber: 12,
            isRangeExplicitInSource: true,
          },
          {
            id: 'res-sj-glucose',
            reportId: 'doc-cmp-mercy-lab',
            testName: 'Glucose, Fasting',
            category: 'Metabolic Panel',
            value: 168,
            unit: 'mg/dL',
            referenceRange: { low: 70, high: 99, text: '70 - 99' },
            status: 'HIGH',
            flaggedCritical: false,
            confidenceScore: 0.97,
            sourceSnippet: 'Glucose, Fasting          168       mg/dL       70 - 99             HIGH',
            isVerified: false,
            sourceType: 'EXTRACTED_REPORT',
            lineNumber: 14,
            isRangeExplicitInSource: true,
          },
          {
            // CRITICAL TEST FOR STRICT REFERENCE RANGE GUARD:
            // Notice reference range is null because it was omitted in source line 16!
            id: 'res-sj-egfr',
            reportId: 'doc-cmp-mercy-lab',
            testName: 'eGFR (CKD-EPI)',
            category: 'Renal Function',
            value: 32,
            unit: 'mL/min/1.73m2',
            referenceRange: null,
            status: 'UNSPECIFIED',
            flaggedCritical: false,
            confidenceScore: 0.92,
            sourceSnippet: 'eGFR (CKD-EPI)            32        mL/min/1.73m2',
            isVerified: false,
            sourceType: 'EXTRACTED_REPORT',
            lineNumber: 16,
            isRangeExplicitInSource: false,
          },
          {
            id: 'res-sj-albumin',
            reportId: 'doc-cmp-mercy-lab',
            testName: 'Albumin',
            category: 'Metabolic Panel',
            value: 3.4,
            unit: 'g/dL',
            referenceRange: { low: 3.5, high: 5.2, text: '3.5 - 5.2' },
            status: 'LOW',
            flaggedCritical: false,
            confidenceScore: 0.95,
            sourceSnippet: 'Albumin                   3.4       g/dL        3.5 - 5.2           LOW',
            isVerified: false,
            sourceType: 'EXTRACTED_REPORT',
            lineNumber: 18,
            isRangeExplicitInSource: true,
          },
        ],
        uploadedAt: '2026-08-28T10:30:00.000Z',
      },
      {
        id: 'doc-note-clinic-prescription',
        patientId: 'patient-sarah-jenkins',
        title: 'Cardiorenal Clinic Progress Note & Electronic Prescription',
        documentType: 'CLINICAL_NOTE',
        date: '2026-08-29',
        facility: 'Metropolitan Renal & Vascular Institute',
        rawText: `CLINICAL PROGRESS NOTE
Patient: Sarah Jenkins (DOB: 1964-02-14) | Encounter Date: 2026-08-29
Attending Physician: Dr. E. Sterling, MD
Chief Complaint: Follow-up of elevated blood pressure and worsening lower extremity edema.
Subjective: Patient notes bilateral ankle swelling increasing over past two weeks. Denies chest pain or shortness of breath.
Objective: BP 154/92 mmHg, HR 76 bpm. 2+ pitting pretibial edema bilaterally.
Laboratory Review: Serum Creatinine noted today at 1.9 mg/dL (up from prior baseline 1.1 mg/dL recorded 6 months ago). Serum K+ 5.4 mmol/L.
Plan & Orders:
1. Renew prescription: Lisinopril 20 mg oral daily for renal protective blood pressure management.
2. Continue Metformin 1000 mg BID with meals.
3. Restrict dietary sodium to < 2000 mg/day.
4. Repeat renal panel in 2 weeks.`,
        lines: [
          { lineNumber: 1, text: 'CLINICAL PROGRESS NOTE' },
          { lineNumber: 2, text: 'Patient: Sarah Jenkins (DOB: 1964-02-14) | Encounter Date: 2026-08-29' },
          { lineNumber: 3, text: 'Attending Physician: Dr. E. Sterling, MD' },
          { lineNumber: 4, text: 'Chief Complaint: Follow-up of elevated blood pressure and worsening lower extremity edema.' },
          { lineNumber: 5, text: 'Subjective: Patient notes bilateral ankle swelling increasing over past two weeks.' },
          { lineNumber: 6, text: 'Objective: BP 154/92 mmHg, HR 76 bpm. 2+ pitting pretibial edema bilaterally.' },
          { lineNumber: 7, text: 'Laboratory Review: Serum Creatinine noted today at 1.9 mg/dL (prior 1.1 mg/dL 6 months ago).' },
          { lineNumber: 8, text: 'Plan & Orders:' },
          { lineNumber: 9, text: '1. Renew prescription: Lisinopril 20 mg oral daily for renal protective blood pressure management.' },
          { lineNumber: 10, text: '2. Continue Metformin 1000 mg BID with meals.' },
          { lineNumber: 11, text: '3. Restrict dietary sodium to < 2000 mg/day.' },
          { lineNumber: 12, text: '4. Repeat renal panel in 2 weeks.' },
        ],
        extractedResults: [],
        uploadedAt: '2026-08-29T15:00:00.000Z',
      },
    ],
    inconsistencies: [], // populated below
  },

  // Scenario 2: Marcus Vance - Acute Troponin Discordance & Aspirin Allergy Conflict
  {
    patient: {
      id: 'patient-marcus-vance',
      name: 'Marcus Vance',
      mrn: 'ML-40192',
      age: 45,
      sex: 'male',
      symptoms: [
        { id: 'sym-mv-1', description: 'Substernal crushing chest tightness radiating to left shoulder', duration: '2 hours', severity: 'severe' },
        { id: 'sym-mv-2', description: 'Profuse diaphoresis and nausea', duration: '1 hour', severity: 'severe' },
      ],
      conditions: [
        { id: 'cond-mv-1', name: 'Hyperlipidemia', diagnosedDate: '2019-11-04' },
        { id: 'cond-mv-2', name: 'Aspirin-Exacerbated Respiratory Disease (AERD)', diagnosedDate: '2020-02-12' },
      ],
      allergies: [
        {
          id: 'all-mv-1',
          allergen: 'Aspirin / NSAIDs',
          reaction: 'Severe bronchospasm, facial urticaria, and respiratory distress within 30 minutes of ingestion',
          severity: 'severe',
        },
      ],
      currentMedications: [
        {
          id: 'med-mv-1',
          name: 'Aspirin (chewable)',
          dosage: '325 mg',
          frequency: 'STAT dose given in triage',
          prescribedDate: '2026-09-02',
          status: 'active',
        },
        {
          id: 'med-mv-2',
          name: 'Atorvastatin',
          dosage: '80 mg',
          frequency: 'once daily',
          prescribedDate: '2026-09-02',
          status: 'active',
        },
      ],
      source: 'USER_INTAKE',
    },
    documents: [
      {
        id: 'doc-mv-poc',
        patientId: 'patient-marcus-vance',
        title: 'Emergency Department Rapid Bedside Point-of-Care Biomarker Panel',
        documentType: 'LAB_REPORT',
        date: '2026-09-02',
        facility: 'St. Jude Emergency Center Triage',
        rawText: `ST. JUDE EMERGENCY MEDICINE — BEDSIDE POINT-OF-CARE TESTING
Patient: VANCE, MARCUS | MRN: ML-40192 | Time of Test: 2026-09-02 14:15
Assay: Abbot i-STAT Bedside Rapid Cartridge
---------------------------------------------------------------
TEST                          RESULT      UNIT      REFERENCE INTERVAL
---------------------------------------------------------------
Troponin I (Rapid Bedside)    Negative    -         Negative
CK-MB (POC)                   1.8         ng/mL     0.0 - 5.0
Blood Glucose (Fingerstick)   104         mg/dL     70 - 110
---------------------------------------------------------------
Operator: Nurse T. Rodriguez, RN
Note: Qualitative rapid lateral flow assay. Core lab confirmation pending.`,
        lines: [
          { lineNumber: 1, text: 'ST. JUDE EMERGENCY MEDICINE — BEDSIDE POINT-OF-CARE TESTING' },
          { lineNumber: 2, text: 'Patient: VANCE, MARCUS | MRN: ML-40192 | Time of Test: 2026-09-02 14:15' },
          { lineNumber: 3, text: 'Assay: Abbot i-STAT Bedside Rapid Cartridge' },
          { lineNumber: 4, text: '---------------------------------------------------------------' },
          { lineNumber: 5, text: 'Troponin I (Rapid Bedside)    Negative    -         Negative' },
          { lineNumber: 6, text: 'CK-MB (POC)                   1.8         ng/mL     0.0 - 5.0' },
          { lineNumber: 7, text: 'Blood Glucose (Fingerstick)   104         mg/dL     70 - 110' },
          { lineNumber: 8, text: '---------------------------------------------------------------' },
        ],
        extractedResults: [
          {
            id: 'res-mv-poc-trop',
            reportId: 'doc-mv-poc',
            testName: 'Troponin I (Rapid Bedside)',
            category: 'Cardiac Biomarkers',
            value: 'Negative',
            unit: null,
            referenceRange: { text: 'Negative' },
            status: 'NORMAL',
            flaggedCritical: false,
            confidenceScore: 0.94,
            sourceSnippet: 'Troponin I (Rapid Bedside)    Negative    -         Negative',
            isVerified: true,
            verifiedValue: 'Negative',
            sourceType: 'EXTRACTED_REPORT',
            lineNumber: 5,
            isRangeExplicitInSource: true,
          },
        ],
        uploadedAt: '2026-09-02T14:20:00.000Z',
      },
      {
        id: 'doc-mv-corelab',
        patientId: 'patient-marcus-vance',
        title: 'Central Laboratory STAT High-Sensitivity Cardiac Panel',
        documentType: 'LAB_REPORT',
        date: '2026-09-02',
        facility: 'St. Jude Central Pathology Laboratory',
        rawText: `CENTRAL PATHOLOGY LABORATORY — STAT CARDIAC PANEL
Patient: VANCE, MARCUS | MRN: ML-40192 | Drawn: 2026-09-02 14:40
Analyzer: Roche cobas e801 High-Sensitivity Electrochemoluminescence
---------------------------------------------------------------
TEST NAME                         RESULT    UNIT    REFERENCE INTERVAL  FLAG
---------------------------------------------------------------
High-Sensitivity Troponin I (hs)  148.5     ng/L    < 14.0              CRITICAL HIGH
Creatine Kinase Total             210       U/L     30 - 200            HIGH
Myoglobin                         95        ng/mL   28 - 72             HIGH
---------------------------------------------------------------
Verification: Dr. H. Zimmerman, MD | Core Lab Director`,
        lines: [
          { lineNumber: 1, text: 'CENTRAL PATHOLOGY LABORATORY — STAT CARDIAC PANEL' },
          { lineNumber: 2, text: 'Patient: VANCE, MARCUS | MRN: ML-40192 | Drawn: 2026-09-02 14:40' },
          { lineNumber: 3, text: 'Analyzer: Roche cobas e801 High-Sensitivity Electrochemoluminescence' },
          { lineNumber: 4, text: '---------------------------------------------------------------' },
          { lineNumber: 5, text: 'High-Sensitivity Troponin I (hs)  148.5     ng/L    < 14.0              CRITICAL HIGH' },
          { lineNumber: 6, text: 'Creatine Kinase Total             210       U/L     30 - 200            HIGH' },
          { lineNumber: 7, text: 'Myoglobin                         95        ng/mL   28 - 72             HIGH' },
          { lineNumber: 8, text: '---------------------------------------------------------------' },
        ],
        extractedResults: [
          {
            id: 'res-mv-core-trop',
            reportId: 'doc-mv-corelab',
            testName: 'High-Sensitivity Troponin I (hs)',
            category: 'Cardiac Biomarkers',
            value: 148.5,
            unit: 'ng/L',
            referenceRange: { high: 14.0, text: '< 14.0' },
            status: 'HIGH',
            flaggedCritical: true,
            confidenceScore: 0.99,
            sourceSnippet: 'High-Sensitivity Troponin I (hs)  148.5     ng/L    < 14.0              CRITICAL HIGH',
            isVerified: false,
            sourceType: 'EXTRACTED_REPORT',
            lineNumber: 5,
            isRangeExplicitInSource: true,
          },
          {
            id: 'res-mv-core-ck',
            reportId: 'doc-mv-corelab',
            testName: 'Creatine Kinase Total',
            category: 'Cardiac Biomarkers',
            value: 210,
            unit: 'U/L',
            referenceRange: { low: 30, high: 200, text: '30 - 200' },
            status: 'HIGH',
            flaggedCritical: false,
            confidenceScore: 0.96,
            sourceSnippet: 'Creatine Kinase Total             210       U/L     30 - 200            HIGH',
            isVerified: false,
            sourceType: 'EXTRACTED_REPORT',
            lineNumber: 6,
            isRangeExplicitInSource: true,
          },
        ],
        uploadedAt: '2026-09-02T15:05:00.000Z',
      },
    ],
    inconsistencies: [],
  },

  // Scenario 3: Elena Rostova - Endocrine & Hematology with Strict Range Guard Missing Intervals
  {
    patient: {
      id: 'patient-elena-rostova',
      name: 'Elena Rostova',
      mrn: 'ML-11083',
      age: 29,
      sex: 'female',
      symptoms: [
        { id: 'sym-er-1', description: 'Chronic severe exhaustion and poor exercise tolerance', duration: '6 months', severity: 'moderate' },
        { id: 'sym-er-2', description: 'Cold intolerance and brittle nails', duration: '4 months', severity: 'mild' },
        { id: 'sym-er-3', description: 'Heart palpitations at rest', duration: '1 month', severity: 'moderate' },
      ],
      conditions: [
        { id: 'cond-er-1', name: 'History of Heavy Menstrual Bleeding (Menorrhagia)', diagnosedDate: '2023-08-10' },
      ],
      allergies: [
        {
          id: 'all-er-1',
          allergen: 'Penicillin',
          reaction: 'Hives and facial swelling in childhood',
          severity: 'moderate',
        },
      ],
      currentMedications: [
        {
          id: 'med-er-1',
          name: 'Ferrous Sulfate',
          dosage: '325 mg',
          frequency: 'once daily with orange juice',
          prescribedDate: '2026-07-01',
          status: 'active',
        },
      ],
      source: 'USER_INTAKE',
    },
    documents: [
      {
        id: 'doc-er-quest',
        patientId: 'patient-elena-rostova',
        title: 'Endocrine & Hematology Outpatient Diagnostic Panel — Quest Diagnostics',
        documentType: 'LAB_REPORT',
        date: '2026-08-15',
        facility: 'Quest Diagnostics Regional Clinical Center',
        rawText: `QUEST DIAGNOSTICS LABORATORY REPORT
Patient: ROSTOVA, ELENA | MRN: ML-11083 | DOB: 1997-06-22 | Sex: F
Specimen: Serum & Whole Blood | Collected: 2026-08-15 08:30 AM
---------------------------------------------------------------
TEST NAME                 RESULT    UNIT        REFERENCE INTERVAL  FLAG
---------------------------------------------------------------
Thyroid Stimulating (TSH) 0.12      uIU/mL      0.45 - 4.50         LOW
Free T4 (Thyroxine)       1.8       ng/dL       0.8 - 1.8           
Hemoglobin                10.8      g/dL        12.0 - 15.5         LOW
Hematocrit                33.2      %           37.0 - 48.0         LOW
Ferritin, Serum           8         ng/mL       15 - 150            LOW
Iron, Total               38        ug/dL       50 - 170            LOW
Total Iron Binding (TIBC) 440       ug/dL       250 - 425           HIGH
Vitamin D, 25-Hydroxy     16        ng/mL                           
---------------------------------------------------------------
Notice: Reference interval for Vitamin D is omitted pending seasonal regional assay recalibration.
Reviewed by: S. Lin, MD, Quest Diagnostics Clinical Pathologist`,
        lines: [
          { lineNumber: 1, text: 'QUEST DIAGNOSTICS LABORATORY REPORT' },
          { lineNumber: 2, text: 'Patient: ROSTOVA, ELENA | MRN: ML-11083 | DOB: 1997-06-22 | Sex: F' },
          { lineNumber: 3, text: '---------------------------------------------------------------' },
          { lineNumber: 4, text: 'TEST NAME                 RESULT    UNIT        REFERENCE INTERVAL  FLAG' },
          { lineNumber: 5, text: '---------------------------------------------------------------' },
          { lineNumber: 6, text: 'Thyroid Stimulating (TSH) 0.12      uIU/mL      0.45 - 4.50         LOW' },
          { lineNumber: 7, text: 'Free T4 (Thyroxine)       1.8       ng/dL       0.8 - 1.8           ' },
          { lineNumber: 8, text: 'Hemoglobin                10.8      g/dL        12.0 - 15.5         LOW' },
          { lineNumber: 9, text: 'Hematocrit                33.2      %           37.0 - 48.0         LOW' },
          { lineNumber: 10, text: 'Ferritin, Serum           8         ng/mL       15 - 150            LOW' },
          { lineNumber: 11, text: 'Iron, Total               38        ug/dL       50 - 170            LOW' },
          { lineNumber: 12, text: 'Total Iron Binding (TIBC) 440       ug/dL       250 - 425           HIGH' },
          { lineNumber: 13, text: 'Vitamin D, 25-Hydroxy     16        ng/mL                           ' },
          { lineNumber: 14, text: '---------------------------------------------------------------' },
          { lineNumber: 15, text: 'Notice: Reference interval for Vitamin D is omitted pending seasonal regional assay recalibration.' },
        ],
        extractedResults: [
          {
            id: 'res-er-tsh',
            reportId: 'doc-er-quest',
            testName: 'Thyroid Stimulating Hormone (TSH)',
            category: 'Endocrine Panel',
            value: 0.12,
            unit: 'uIU/mL',
            referenceRange: { low: 0.45, high: 4.50, text: '0.45 - 4.50' },
            status: 'LOW',
            flaggedCritical: false,
            confidenceScore: 0.98,
            sourceSnippet: 'Thyroid Stimulating (TSH) 0.12      uIU/mL      0.45 - 4.50         LOW',
            isVerified: true,
            verifiedValue: 0.12,
            sourceType: 'EXTRACTED_REPORT',
            lineNumber: 6,
            isRangeExplicitInSource: true,
          },
          {
            id: 'res-er-hb',
            reportId: 'doc-er-quest',
            testName: 'Hemoglobin',
            category: 'Hematology',
            value: 10.8,
            unit: 'g/dL',
            referenceRange: { low: 12.0, high: 15.5, text: '12.0 - 15.5' },
            status: 'LOW',
            flaggedCritical: false,
            confidenceScore: 0.99,
            sourceSnippet: 'Hemoglobin                10.8      g/dL        12.0 - 15.5         LOW',
            isVerified: true,
            verifiedValue: 10.8,
            sourceType: 'EXTRACTED_REPORT',
            lineNumber: 8,
            isRangeExplicitInSource: true,
          },
          {
            id: 'res-er-ferritin',
            reportId: 'doc-er-quest',
            testName: 'Ferritin, Serum',
            category: 'Hematology',
            value: 8,
            unit: 'ng/mL',
            referenceRange: { low: 15, high: 150, text: '15 - 150' },
            status: 'LOW',
            flaggedCritical: false,
            confidenceScore: 0.97,
            sourceSnippet: 'Ferritin, Serum           8         ng/mL       15 - 150            LOW',
            isVerified: false,
            sourceType: 'EXTRACTED_REPORT',
            lineNumber: 10,
            isRangeExplicitInSource: true,
          },
          {
            // STRICT RANGE GUARD TEST: Vitamin D has NO reference range in the report
            id: 'res-er-vitd',
            reportId: 'doc-er-quest',
            testName: 'Vitamin D, 25-Hydroxy',
            category: 'Endocrine Panel',
            value: 16,
            unit: 'ng/mL',
            referenceRange: null,
            status: 'UNSPECIFIED',
            flaggedCritical: false,
            confidenceScore: 0.91,
            sourceSnippet: 'Vitamin D, 25-Hydroxy     16        ng/mL',
            isVerified: false,
            sourceType: 'EXTRACTED_REPORT',
            lineNumber: 13,
            isRangeExplicitInSource: false,
          },
        ],
        uploadedAt: '2026-08-15T11:00:00.000Z',
      },
    ],
    inconsistencies: [],
  },
];

// Initialize detected inconsistencies and non-diagnostic synthesis for each patient
for (const p of SAMPLE_PATIENTS) {
  const allLabs = p.documents.flatMap(d => d.extractedResults);
  p.inconsistencies = runFullInconsistencyDetection(p.patient, allLabs, p.documents);
  p.synthesis = generateNonDiagnosticSynthesis(p.patient, allLabs, p.inconsistencies);
}

// Longitudinal Marker Trends across time for Sarah Jenkins
export const SARAH_LONGITUDINAL_MARKERS: LongitudinalMarker[] = [
  {
    testName: 'Creatinine, Serum',
    unit: 'mg/dL',
    category: 'Renal Function',
    dataPoints: [
      {
        date: '2026-02-15',
        timestamp: new Date('2026-02-15').getTime(),
        value: 1.1,
        unit: 'mg/dL',
        status: 'NORMAL',
        reportId: 'hist-1',
        sourceDocument: 'Annual Preventive Wellness Lab',
        referenceLow: 0.6,
        referenceHigh: 1.2,
      },
      {
        date: '2026-05-20',
        timestamp: new Date('2026-05-20').getTime(),
        value: 1.4,
        unit: 'mg/dL',
        status: 'HIGH',
        reportId: 'hist-2',
        sourceDocument: 'Endocrine Follow-up Lab',
        referenceLow: 0.6,
        referenceHigh: 1.2,
      },
      {
        date: '2026-08-28',
        timestamp: new Date('2026-08-28').getTime(),
        value: 1.9,
        unit: 'mg/dL',
        status: 'HIGH',
        reportId: 'doc-cmp-mercy-lab',
        sourceDocument: 'Comprehensive Metabolic Panel (CMP)',
        referenceLow: 0.6,
        referenceHigh: 1.2,
      },
    ],
  },
  {
    testName: 'Potassium, Serum',
    unit: 'mmol/L',
    category: 'Electrolytes',
    dataPoints: [
      {
        date: '2026-02-15',
        timestamp: new Date('2026-02-15').getTime(),
        value: 4.2,
        unit: 'mmol/L',
        status: 'NORMAL',
        reportId: 'hist-1',
        sourceDocument: 'Annual Preventive Wellness Lab',
        referenceLow: 3.5,
        referenceHigh: 5.1,
      },
      {
        date: '2026-05-20',
        timestamp: new Date('2026-05-20').getTime(),
        value: 4.8,
        unit: 'mmol/L',
        status: 'NORMAL',
        reportId: 'hist-2',
        sourceDocument: 'Endocrine Follow-up Lab',
        referenceLow: 3.5,
        referenceHigh: 5.1,
      },
      {
        date: '2026-08-28',
        timestamp: new Date('2026-08-28').getTime(),
        value: 5.4,
        unit: 'mmol/L',
        status: 'HIGH',
        reportId: 'doc-cmp-mercy-lab',
        sourceDocument: 'Comprehensive Metabolic Panel (CMP)',
        referenceLow: 3.5,
        referenceHigh: 5.1,
      },
    ],
  },
  {
    testName: 'Fasting Blood Glucose',
    unit: 'mg/dL',
    category: 'Glycemic Control',
    dataPoints: [
      {
        date: '2026-02-15',
        timestamp: new Date('2026-02-15').getTime(),
        value: 138,
        unit: 'mg/dL',
        status: 'HIGH',
        reportId: 'hist-1',
        sourceDocument: 'Annual Preventive Wellness Lab',
        referenceLow: 70,
        referenceHigh: 99,
      },
      {
        date: '2026-05-20',
        timestamp: new Date('2026-05-20').getTime(),
        value: 152,
        unit: 'mg/dL',
        status: 'HIGH',
        reportId: 'hist-2',
        sourceDocument: 'Endocrine Follow-up Lab',
        referenceLow: 70,
        referenceHigh: 99,
      },
      {
        date: '2026-08-28',
        timestamp: new Date('2026-08-28').getTime(),
        value: 168,
        unit: 'mg/dL',
        status: 'HIGH',
        reportId: 'doc-cmp-mercy-lab',
        sourceDocument: 'Comprehensive Metabolic Panel (CMP)',
        referenceLow: 70,
        referenceHigh: 99,
      },
    ],
  },
];
