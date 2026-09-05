import { z } from 'zod';

// ==========================================
// 1. Zod Runtime Schemas
// ==========================================

export const symptomSeveritySchema = z.enum(['mild', 'moderate', 'severe']);

export const symptomItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  duration: z.string().optional(),
  severity: symptomSeveritySchema.optional(),
});

export const conditionItemSchema = z.object({
  name: z.string().min(1, 'Condition name is required'),
  diagnosedDate: z.string().optional(),
});

export const allergyItemSchema = z.object({
  allergen: z.string().min(1, 'Allergen name is required'),
  reaction: z.string().optional(),
});

export const medicationItemSchema = z.object({
  name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
});

export const patientIntakeSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  mrn: z.string().optional(),
  age: z.number().int().nonnegative('Age must be non-negative'),
  sex: z.enum(['male', 'female', 'other']),
  symptoms: z.array(symptomItemSchema),
  conditions: z.array(conditionItemSchema),
  allergies: z.array(allergyItemSchema),
  currentMedications: z.array(medicationItemSchema),
  source: z.literal('USER_INTAKE'),
});

export const referenceRangeSchema = z.object({
  low: z.number().optional(),
  high: z.number().optional(),
  text: z.string().optional(),
}).nullable();

export const labStatusSchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'ABNORMAL', 'UNSPECIFIED']);
export type LabStatus = z.infer<typeof labStatusSchema>;
export type SourceType = 'USER_INTAKE' | 'EXTRACTED_REPORT' | 'SYNTHESIZED_SUMMARY';

export const extractedLabResultSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  testName: z.string().min(1, 'Test name is required'),
  category: z.string().optional(),
  value: z.union([z.number(), z.string()]),
  unit: z.string().nullable(),
  referenceRange: referenceRangeSchema,
  status: labStatusSchema,
  flaggedCritical: z.boolean(),
  confidenceScore: z.number().min(0).max(1),
  sourceSnippet: z.string(),
  isVerified: z.boolean(),
  verifiedValue: z.union([z.string(), z.number()]).optional(),
  // Supplementary safety & provenance metadata
  isRangeExplicitInSource: z.boolean().optional(),
  lineNumber: z.number().optional(),
  sourceType: z.enum(['USER_INTAKE', 'EXTRACTED_REPORT', 'SYNTHESIZED_SUMMARY']).optional(),
  clinicianNotes: z.string().optional(),
});

export const clinicalInconsistencyTypeSchema = z.enum([
  'ALLERGY_MEDICATION_CONFLICT',
  'CONTRADICTORY_TESTS',
  'TEMPORAL_ANOMALY',
]);

export const clinicalInconsistencySchema = z.object({
  id: z.string(),
  type: clinicalInconsistencyTypeSchema,
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  involvedEntities: z.array(z.string()),
  clinicalGuidance: z.string().optional(),
  status: z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED']).optional(),
});

export const medicalReportSchema = z.object({
  id: z.string(),
  title: z.string(),
  patientId: z.string(),
  reportDate: z.string(),
  facility: z.string(),
  reportType: z.enum(['LAB_PANEL', 'CLINICAL_NOTE', 'DISCHARGE_SUMMARY']),
  rawOcrText: z.string(),
  extractedResults: z.array(extractedLabResultSchema),
  status: z.enum(['PROCESSED', 'PENDING_REVIEW', 'FLAGGED']),
});

// ==========================================
// 2. Exact TypeScript Domain Interfaces
// ==========================================

export interface PatientIntake {
  id: string;
  name?: string;
  mrn?: string;
  age: number;
  sex: 'male' | 'female' | 'other';
  symptoms: Array<{
    description: string;
    duration?: string;
    severity?: 'mild' | 'moderate' | 'severe';
  }>;
  conditions: Array<{
    name: string;
    diagnosedDate?: string;
  }>;
  allergies: Array<{
    allergen: string;
    reaction?: string;
  }>;
  currentMedications: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
  }>;
  source: 'USER_INTAKE';
}

export interface ExtractedLabResult {
  id: string;
  reportId: string;
  testName: string;
  category?: string; // e.g., "Complete Blood Count", "Metabolic Panel", "Lipid Panel"
  value: number | string;
  unit: string | null;
  referenceRange: {
    low?: number;
    high?: number;
    text?: string; // e.g., "< 100", "Negative"
  } | null;
  status: 'LOW' | 'NORMAL' | 'HIGH' | 'ABNORMAL' | 'UNSPECIFIED';
  flaggedCritical: boolean;
  confidenceScore: number; // 0.0 to 1.0
  sourceSnippet: string;  // Direct text snippet from OCR
  isVerified: boolean;
  verifiedValue?: string | number;
  
  // Provenance & strict range guard fields
  isRangeExplicitInSource?: boolean;
  lineNumber?: number;
  sourceType?: 'USER_INTAKE' | 'EXTRACTED_REPORT' | 'SYNTHESIZED_SUMMARY';
  clinicianNotes?: string;
}

export interface ClinicalInconsistency {
  id: string;
  type: 'ALLERGY_MEDICATION_CONFLICT' | 'CONTRADICTORY_TESTS' | 'TEMPORAL_ANOMALY';
  description: string;
  severity: 'low' | 'medium' | 'high';
  involvedEntities: string[];
  clinicalGuidance?: string;
  status?: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
}

export interface MedicalReport {
  id: string;
  title: string;
  patientId: string;
  reportDate: string;
  facility: string;
  reportType: 'LAB_PANEL' | 'CLINICAL_NOTE' | 'DISCHARGE_SUMMARY';
  rawOcrText: string;
  extractedResults: ExtractedLabResult[];
  status: 'PROCESSED' | 'PENDING_REVIEW' | 'FLAGGED';
}

export interface MedLensWorkspaceState {
  patient: PatientIntake;
  reports: MedicalReport[];
  inconsistencies: ClinicalInconsistency[];
  activeReportId: string;
  selectedResultId: string | null;
  activeTab: 'workbench' | 'conflicts' | 'synthesis' | 'documents';
}
