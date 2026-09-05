export type Sex = 'male' | 'female' | 'other';

export type SymptomSeverity = 'mild' | 'moderate' | 'severe';

export interface Symptom {
  id?: string;
  description: string;
  duration?: string;
  severity?: SymptomSeverity;
}

export interface MedicalCondition {
  id?: string;
  name: string;
  diagnosedDate?: string;
  notes?: string;
}

export interface Allergy {
  id?: string;
  allergen: string;
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'anaphylaxis';
}

export interface Medication {
  id?: string;
  name: string;
  dosage?: string;
  frequency?: string;
  prescribedDate?: string;
  status?: 'active' | 'discontinued' | 'on-demand';
}

// Patient Profile & Intake matching the exact schema
export interface PatientIntake {
  id: string;
  name?: string;
  mrn?: string;
  age: number;
  sex: Sex;
  symptoms: Symptom[];
  conditions: MedicalCondition[];
  allergies: Allergy[];
  currentMedications: Medication[];
  source: 'USER_INTAKE';
}

export interface ReferenceRange {
  low?: number;
  high?: number;
  text?: string; // e.g., "< 100", "Negative", "Normal: 0.7 - 1.3"
  isExplicitInSource: boolean; // Flag to enforce Strict Reference Range Guard
}

export type LabStatus = 'LOW' | 'NORMAL' | 'HIGH' | 'ABNORMAL' | 'UNSPECIFIED';

export type SourceType = 'USER_INTAKE' | 'EXTRACTED_REPORT' | 'SYNTHESIZED_SUMMARY';

// Extracted Lab / Diagnostic Value matching exact schema
export interface ExtractedLabResult {
  id: string;
  reportId: string;
  testName: string;
  category?: string; // e.g., "Complete Blood Count", "Metabolic Panel", "Cardiac Biomarkers"
  value: number | string;
  unit: string | null;
  referenceRange: {
    low?: number;
    high?: number;
    text?: string;
  } | null;
  status: LabStatus;
  flaggedCritical: boolean;
  confidenceScore: number; // 0.0 to 1.0
  sourceSnippet: string;  // Direct text snippet from OCR
  isVerified: boolean;
  verifiedValue?: string | number;
  
  // Provenance & HITL Audit fields
  sourceType: SourceType;
  lineNumber?: number;
  charOffset?: number;
  verifiedBy?: string;
  verifiedAt?: string;
  clinicianNotes?: string;
  isRangeExplicitInSource: boolean;
}

// Clinical Conflict / Inconsistency matching exact schema
export interface ClinicalInconsistency {
  id: string;
  type: 'ALLERGY_MEDICATION_CONFLICT' | 'CONTRADICTORY_TESTS' | 'TEMPORAL_ANOMALY';
  description: string;
  severity: 'low' | 'medium' | 'high';
  involvedEntities: string[];
  clinicalGuidance?: string; // Non-diagnostic clarification guidance for provider
  detectedAt?: string;
  status?: 'ACTIVE' | 'RESOLVED' | 'ACKNOWLEDGED';
  resolutionNote?: string;
}

// Clinical Document Ingest Model
export interface ClinicalDocument {
  id: string;
  patientId: string;
  title: string;
  documentType: 'LAB_REPORT' | 'DISCHARGE_SUMMARY' | 'INTAKE_FORM' | 'CLINICAL_NOTE';
  date: string;
  facility: string;
  rawText: string;
  lines: Array<{ lineNumber: number; text: string }>;
  extractedResults: ExtractedLabResult[];
  uploadedAt: string;
}

// Longitudinal Marker Point for Trajectory Tracking
export interface LongitudinalDataPoint {
  date: string;
  timestamp: number;
  value: number;
  unit: string;
  status: LabStatus;
  reportId: string;
  sourceDocument: string;
  referenceLow?: number;
  referenceHigh?: number;
}

export interface LongitudinalMarker {
  testName: string;
  unit: string;
  category: string;
  dataPoints: LongitudinalDataPoint[];
}

// Deterministic Non-Diagnostic Synthesis
export interface NonDiagnosticSynthesis {
  id: string;
  patientId: string;
  generatedAt: string;
  disclaimer: string;
  objectiveFindings: Array<{
    category: string;
    text: string;
    sourceSnippet?: string;
    sourceReport?: string;
  }>;
  notableValues: Array<{
    testName: string;
    observation: string; // e.g. "Values reported at 1.9 mg/dL which is above the laboratory-stated upper limit of 1.2 mg/dL"
    status: LabStatus;
    referenceRangeContext: string;
    sourceSnippet: string;
  }>;
  inconsistenciesIdentified: ClinicalInconsistency[];
  clinicalReconciliationChecklist: string[];
  safetyGuardAudit: {
    passed: boolean;
    violatingTermsFound: string[];
    enforcedBoundaryStatement: string;
  };
}

// Full Patient Record Workspace
export interface PatientRecord {
  patient: PatientIntake;
  documents: ClinicalDocument[];
  inconsistencies: ClinicalInconsistency[];
  synthesis?: NonDiagnosticSynthesis;
}
