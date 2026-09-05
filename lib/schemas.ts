import { z } from 'zod';

export const symptomSeveritySchema = z.enum(['mild', 'moderate', 'severe']);

export const symptomSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Symptom description is required'),
  duration: z.string().optional(),
  severity: symptomSeveritySchema.optional(),
});

export const medicalConditionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Condition name is required'),
  diagnosedDate: z.string().optional(),
  notes: z.string().optional(),
});

export const allergySchema = z.object({
  id: z.string().optional(),
  allergen: z.string().min(1, 'Allergen name is required'),
  reaction: z.string().optional(),
  severity: z.enum(['mild', 'moderate', 'severe', 'anaphylaxis']).optional(),
});

export const medicationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  prescribedDate: z.string().optional(),
  status: z.enum(['active', 'discontinued', 'on-demand']).optional(),
});

export const patientIntakeSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  mrn: z.string().optional(),
  age: z.number().int().positive('Age must be a positive integer'),
  sex: z.enum(['male', 'female', 'other']),
  symptoms: z.array(symptomSchema),
  conditions: z.array(medicalConditionSchema),
  allergies: z.array(allergySchema),
  currentMedications: z.array(medicationSchema),
  source: z.literal('USER_INTAKE'),
});

export const referenceRangeSchema = z.object({
  low: z.number().optional(),
  high: z.number().optional(),
  text: z.string().optional(),
}).nullable();

export const labStatusSchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'ABNORMAL', 'UNSPECIFIED']);

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
  sourceType: z.enum(['USER_INTAKE', 'EXTRACTED_REPORT', 'SYNTHESIZED_SUMMARY']).default('EXTRACTED_REPORT'),
  lineNumber: z.number().optional(),
  verifiedBy: z.string().optional(),
  verifiedAt: z.string().optional(),
  clinicianNotes: z.string().optional(),
  isRangeExplicitInSource: z.boolean().default(false),
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
  detectedAt: z.string().optional(),
  status: z.enum(['ACTIVE', 'RESOLVED', 'ACKNOWLEDGED']).optional(),
  resolutionNote: z.string().optional(),
});
